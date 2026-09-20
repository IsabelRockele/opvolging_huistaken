#!/usr/bin/env python3
"""Generate static Dena MP3 files. No third-party Python packages or server required."""
import argparse
from contextlib import contextmanager
import getpass
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public' / 'audio' / 'dena'
CONFIG = dict(version=1, voice='nl-BE-DenaNeural', region='northeurope',
              format='audio-24khz-48kbitrate-mono-mp3', rate='-15%')
ENDPOINT = 'https://northeurope.tts.speech.microsoft.com/cognitiveservices/v1'
MONTH_BUDGET = 450_000  # Conservative margin below F0; complete SSML counted too.
STATE_DIR = Path(os.environ.get('LOCALAPPDATA', str(Path.home() / '.local' / 'share'))) / 'Zisa' / 'Dena'


def normalize(text):
    return ' '.join(unicodedata.normalize('NFC', text).split())


def spoken(entry):
    if entry.get('sentence'):
        return None
    text = f"{entry['article']} {entry['answer']}" if entry.get('article') else entry.get('spoken', '')
    text = normalize(text)
    if not text or len(text) > 600 or any(ord(c) < 32 for c in text):
        raise ValueError('Een bibliotheekwoord heeft geen geldige uitspraaktekst (maximaal 600 tekens).')
    return text


def ssml(text):
    return (f'<speak version="1.0" xml:lang="nl-BE"><voice name="{CONFIG["voice"]}">'
            f'<prosody rate="{CONFIG["rate"]}">{escape(text)}</prosody></voice></speak>')


def filename(text):
    value = json.dumps(CONFIG, sort_keys=True) + '\n' + ssml(text)
    return hashlib.sha256(value.encode('utf-8')).hexdigest() + '.mp3'


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(path)


def entries_from(path):
    data = json.loads(path.read_text(encoding='utf-8-sig'))
    if data.get('format') == 'zisa-bibliotheek':
        return [entry for group in data['groups'] for entry in group['entries']]
    if data.get('format') == 'zisa-dictee' and data.get('version') == 2:
        return data['entries']
    raise ValueError('Gebruik een Zisa-bibliotheek of een bewaarde dicteelijst (versie 2).')


def load_manifest(output=OUTPUT):
    path = output / 'manifest.json'
    if not path.exists():
        return {**CONFIG, 'files': {}}
    data = json.loads(path.read_text(encoding='utf-8'))
    if any(data.get(key) != value for key, value in CONFIG.items()):
        raise ValueError('Het audio-overzicht gebruikt een andere stem of instelling. Meng geen verschillende stemmen.')
    return data


def reusable(text, manifest, output=OUTPUT):
    record = manifest['files'].get(text, {})
    name = filename(text)
    if record.get('file') != name:
        return False
    path = output / name
    return path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == record.get('sha256')


def outside_git(path):
    path = path.expanduser().resolve()
    if path == ROOT or ROOT in path.parents or any((parent / '.git').exists() for parent in [path.parent, *path.parents]):
        raise ValueError('Bewaar de sleutel en het lokale verbruiksoverzicht buiten elke Git-map en buiten de website.')
    return path


def windows_key_dialog():
    import tkinter as tk
    from tkinter import simpledialog
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    try:
        return simpledialog.askstring(
            'Zisa — Azure-sleutel voor Dena',
            'Klik in het vak en plak je Azure-sleutel met Ctrl+V.\n'
            'Je ziet bolletjes verschijnen. Klik daarna op OK.\n\n'
            'De sleutel wordt alleen voor deze generatie gebruikt\n'
            'en niet opgeslagen.',
            show='*', parent=root)
    finally:
        root.destroy()


def read_key(key_file=None):
    if key_file:
        key = outside_git(key_file).read_text(encoding='utf-8').strip()
    elif os.name == 'nt':
        print('Er opent een apart sleutelvenster. Plak daar met Ctrl+V en klik op OK.')
        try:
            value = windows_key_dialog()
        except Exception:
            raise ValueError('Het sleutelvenster kon niet openen. Controleer je Python-installatie met Tkinter.') from None
        if value is None:
            raise ValueError('Sleutelinvoer geannuleerd. Er is niets naar Azure verstuurd.')
        key = value.strip()
    else:
        # Never accept a key as a command-line argument or write it to disk.
        if not sys.stdin.isatty():
            raise ValueError('Open dit hulpmiddel zelf in een terminal: de sleutel wordt verborgen gevraagd. Plak hem niet in de chat.')
        print('Plak de sleutel EEN KEER en druk Enter. Je ziet geen tekens of bolletjes; dat is normaal.')
        key = getpass.getpass('Azure-sleutel (verborgen invoer; wordt niet bewaard): ').strip()
    if not key or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in key):
        raise ValueError('Geen geldige Azure-sleutel ingevuld.')
    return key


@contextmanager
def generation_lock(path):
    # The operating system releases this lock even when the terminal is closed.
    # Keep the file itself: unlinking it would allow two processes to lock different files.
    handle = path.open('a+b')
    acquired = False
    try:
        handle.seek(0, os.SEEK_END)
        if handle.tell() == 0:
            handle.write(b'0')
            handle.flush()
        handle.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            acquired = True
        except OSError:
            raise ValueError('Er staat al een Dena-generatie open. Gebruik dat venster of sluit het eerst en probeer opnieuw.') from None
        yield
    finally:
        if acquired:
            handle.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()


def reserve_usage(state_path, characters, clock=time.time, sleep=time.sleep):
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    stamp = clock()
    delay = max(0, state.get('lastRequest', 0) + 3.5 - stamp)
    if delay:
        sleep(delay)
    stamp = clock()
    month = datetime.fromtimestamp(stamp, timezone.utc).strftime('%Y-%m')
    used = state.get('characters', 0) if state.get('month') == month else 0
    if used + characters > MONTH_BUDGET:
        raise ValueError('Het lokale F0-veiligheidsbudget van 450.000 tekens is bereikt. Bestaande audio blijft bruikbaar; probeer volgende maand opnieuw.')
    atomic_json(state_path, dict(month=month, characters=used + characters, lastRequest=stamp))


def synthesize(text, key, state_path, opener=urllib.request.urlopen, sleep=time.sleep):
    body = ssml(text).encode('utf-8')
    for attempt in range(3):
        reserve_usage(state_path, len(body))  # Deliberately conservative for Unicode too.
        request = urllib.request.Request(ENDPOINT, data=body, method='POST', headers={
            'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': CONFIG['format'], 'User-Agent': 'ZisaDenaMaker'})
        try:
            with opener(request, timeout=30) as response:
                audio = response.read(700001)
                if not response.headers.get('Content-Type', '').startswith('audio/') or not (100 <= len(audio) <= 700000):
                    raise ValueError('Azure gaf geen geldig audiobestand. Er is niets gepubliceerd.')
                if not (audio.startswith(b'ID3') or (audio[0] == 255 and audio[1] & 224 == 224)):
                    raise ValueError('Azure gaf geen herkenbaar MP3-bestand.')
                return audio
        except urllib.error.HTTPError as error:
            error.close()
            if error.code == 429 and attempt < 2:
                try:
                    delay = min(300, max(61, float(error.headers.get('Retry-After', '61'))))
                except ValueError:
                    delay = 61
                print('Azure F0 vraagt een pauze. We proberen daarna opnieuw.')
                sleep(delay)
                continue
            if error.code in (401, 403):
                raise ValueError('Azure weigert de sleutel. Controleer de sleutel van zisa-vlaamse-stem in northeurope.') from None
            if error.code == 429:
                raise ValueError('Azure F0 is nu niet beschikbaar of de limiet is bereikt. Stop en probeer later opnieuw.') from None
            raise ValueError(f'Azure antwoordde met status {error.code}. Probeer later opnieuw.') from None
        except (urllib.error.URLError, TimeoutError):
            raise ValueError('Azure is niet bereikbaar. Reeds gemaakte audio is bewaard; probeer later opnieuw.') from None


def main():
    parser = argparse.ArgumentParser(description='Maak ontbrekende Dena-audio voor de klasrace, zonder Blaze of extra server.')
    parser.add_argument('--library', type=Path, default=ROOT / 'lib' / 'word-library.json')
    parser.add_argument('--extra', type=Path, action='append', default=[], help='Ook woorden uit deze bewaarde dicteelijst genereren.')
    parser.add_argument('--plan', action='store_true', help='Alleen tellen; geen sleutel of Azure-aanvragen.')
    parser.add_argument('--verify', action='store_true', help='Controleer of alle benodigde audio aanwezig en intact is.')
    parser.add_argument('--limit', type=int, help='Maak maximaal dit aantal nieuwe bestanden in deze beurt.')
    parser.add_argument('--key-file', type=Path, help='Optioneel lokaal sleutelbestand BUITEN elke Git-map; de inhoud wordt nooit getoond.')
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit moet minstens 1 zijn.')
    entries = [entry for path in [args.library, *args.extra] for entry in entries_from(path)]
    words = sorted({text for entry in entries if (text := spoken(entry)) is not None})
    manifest = load_manifest()
    missing = [text for text in words if not reusable(text, manifest)]
    print(f'{len(words)} unieke uitspraken; {sum(bool(e.get("sentence")) for e in entries)} werkwoordoefeningen overgeslagen.')
    print(f'{len(words) - len(missing)} audiobestanden herbruikbaar; {len(missing)} ontbreken of zijn gewijzigd.')
    if args.verify:
        return 1 if missing else 0
    if args.plan or not missing:
        return 0
    todo = missing[:args.limit] if args.limit else missing
    print(f'Deze beurt: {len(todo)} bestanden, ongeveer {max(1, round(len(todo) * 3.5 / 60))} minuten plus downloadtijd. Azure blijft F0.')
    state_dir = outside_git(STATE_DIR)
    state_dir.mkdir(parents=True, exist_ok=True)
    lock_path = state_dir / 'generation.lock'
    with generation_lock(lock_path):
        key = read_key(args.key_file)
        print('Sleutel ontvangen. De audio wordt nu aangemaakt; even geduld bij het eerste woord.')
        OUTPUT.mkdir(parents=True, exist_ok=True)
        for i, text in enumerate(todo, 1):
            audio = synthesize(text, key, state_dir / 'usage.json')
            name = filename(text)
            temp = OUTPUT / (name + '.tmp')
            temp.write_bytes(audio)
            temp.replace(OUTPUT / name)
            manifest['files'][text] = dict(file=name, sha256=hashlib.sha256(audio).hexdigest())
            atomic_json(OUTPUT / 'manifest.json', manifest)
            print(f'{i}/{len(todo)} klaar: {text}')
        print('Audio bewaard. Bouw en publiceer nu de website volgens DENA-AUDIO.md.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        # Never print HTTP request objects, headers, the key, or Azure response bodies.
        print(f'Gestopt: {error}', file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print('\nGestopt. Reeds gemaakte audio blijft bewaard; opnieuw starten gaat verder.', file=sys.stderr)
        sys.exit(130)
