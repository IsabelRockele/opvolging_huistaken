import importlib.util
import io
import json
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest
from unittest.mock import patch
import urllib.error

spec = importlib.util.spec_from_file_location('dena', Path(__file__).with_name('generate-dena.py'))
dena = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dena)


class GeneratorTests(unittest.TestCase):
    @unittest.skipUnless(dena.os.name == 'nt', 'Windows dialog')
    def test_windows_key_dialog_handles_paste_cancel_and_control_v(self):
        with patch.object(dena, 'windows_key_dialog', return_value=' local-test-key '):
            self.assertEqual(dena.read_key(), 'local-test-key')
        with patch.object(dena, 'windows_key_dialog', return_value=None):
            with self.assertRaisesRegex(ValueError, 'geannuleerd'):
                dena.read_key()
        with patch.object(dena, 'windows_key_dialog', return_value='\x16'):
            with self.assertRaisesRegex(ValueError, 'Geen geldige'):
                dena.read_key()

    def test_old_empty_lock_file_does_not_block_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'generation.lock'
            path.touch()
            with dena.generation_lock(path):
                pass
            with dena.generation_lock(path):
                pass

    def test_second_generator_is_blocked_while_first_is_open(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'generation.lock'
            with dena.generation_lock(path):
                with self.assertRaises(ValueError):
                    with dena.generation_lock(path):
                        self.fail('Concurrent generator must not start')

    def test_abrupt_exit_releases_lock(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'generation.lock'
            code = "import runpy,sys,os; from pathlib import Path; m=runpy.run_path(sys.argv[1]); lock=m['generation_lock'](Path(sys.argv[2])); lock.__enter__(); os._exit(0)"
            subprocess.run([sys.executable, '-c', code, str(Path(dena.__file__)), str(path)], check=True)
            with dena.generation_lock(path):
                pass

    def test_articles_verbs_and_new_words(self):
        self.assertEqual(dena.spoken({'article': 'het', 'answer': 'huis', 'spoken': 'huis'}), 'het huis')
        self.assertEqual(dena.spoken({'spoken': '  de   nieuwe uitvinding '}), 'de nieuwe uitvinding')
        self.assertIsNone(dena.spoken({'sentence': 'Ik ___ naar huis.', 'spoken': 'lopen'}))
        self.assertEqual(dena.filename('de maan'), dena.filename('de maan'))
        self.assertNotEqual(dena.filename('de maan'), dena.filename('het maanlicht'))
        self.assertIn('nl-BE-DenaNeural', dena.ssml('de kat'))
        self.assertIn('&lt;woord&gt; &amp; test', dena.ssml('<woord> & test'))

    def test_resume_detects_modified_or_damaged_audio_and_keeps_old_words(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            text = 'de maan'
            name = dena.filename(text)
            audio = b'ID3' + b'0' * 300
            (output / name).write_bytes(audio)
            manifest = {**dena.CONFIG, 'files': {text: {'file': name, 'sha256': dena.hashlib.sha256(audio).hexdigest()}}}
            self.assertTrue(dena.reusable(text, manifest, output))
            self.assertFalse(dena.reusable('het nieuwe woord', manifest, output))
            (output / name).write_bytes(b'corrupt')
            self.assertFalse(dena.reusable(text, manifest, output))
            dena.atomic_json(output / 'manifest.json', manifest)
            self.assertIn(text, dena.load_manifest(output)['files'])

    def test_key_must_stay_outside_git_and_website(self):
        with self.assertRaises(ValueError):
            dena.outside_git(dena.ROOT / 'public' / 'azure-key.txt')
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp) / 'repo'
            (repo / '.git').mkdir(parents=True)
            with self.assertRaises(ValueError):
                dena.outside_git(repo / 'key.txt')
            self.assertEqual(dena.outside_git(Path(tmp) / 'local-key.txt'), Path(tmp).resolve() / 'local-key.txt')

    def test_f0_spacing_budget_and_month_reset(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'usage.json'
            stamp = 1790000000.0
            dena.reserve_usage(path, 300, clock=lambda: stamp)
            delays = []
            dena.reserve_usage(path, 300, clock=lambda: stamp, sleep=delays.append)
            self.assertEqual(delays, [3.5])
            state = json.loads(path.read_text())
            self.assertEqual(state['characters'], 600)
            with self.assertRaises(ValueError):
                dena.reserve_usage(path, dena.MONTH_BUDGET, clock=lambda: stamp + 10)
            dena.reserve_usage(path, 100, clock=lambda: stamp + 86400 * 40)
            self.assertEqual(json.loads(path.read_text())['characters'], 100)

    def test_fixed_voice_region_and_no_key_in_output(self):
        class Response(io.BytesIO):
            headers = {'Content-Type': 'audio/mpeg'}
        requests = []
        def opener(req, timeout):
            requests.append(req)
            return Response(b'ID3' + b'0' * 200)
        with patch.object(dena, 'reserve_usage'):
            data = dena.synthesize('de kat', 'LOCAL-TEST-SECRET', Path('unused'), opener=opener)
        self.assertTrue(data.startswith(b'ID3'))
        self.assertIn('northeurope.tts.speech.microsoft.com', requests[0].full_url)
        self.assertIn(b'nl-BE-DenaNeural', requests[0].data)
        self.assertNotIn(b'LOCAL-TEST-SECRET', requests[0].data)

    def test_azure_failure_does_not_expose_response_or_key(self):
        def denied(req, timeout):
            raise urllib.error.HTTPError(req.full_url, 403, 'LOCAL-TEST-SECRET', {}, None)
        with patch.object(dena, 'reserve_usage'):
            with self.assertRaises(ValueError) as error:
                dena.synthesize('de kat', 'LOCAL-TEST-SECRET', Path('unused'), opener=denied)
        self.assertNotIn('LOCAL-TEST-SECRET', str(error.exception))

    def test_429_retries_are_bounded(self):
        def limited(req, timeout):
            raise urllib.error.HTTPError(req.full_url, 429, '', {'Retry-After': '1'}, None)
        delays = []
        with patch.object(dena, 'reserve_usage') as reserve:
            with self.assertRaises(ValueError):
                dena.synthesize('de kat', 'LOCAL-TEST-SECRET', Path('unused'), opener=limited, sleep=delays.append)
        self.assertEqual(reserve.call_count, 3)
        self.assertEqual(delays, [61, 61])


if __name__ == '__main__':
    unittest.main()
