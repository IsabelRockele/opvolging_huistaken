(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const actions = ['download', 'svgDownload', 'afdrukken'];
  let current = null;

  function reset() {
    current = null;
    actions.forEach(id => { el(id).disabled = true; });
    el('kaart').hidden = true;
    el('leeg').hidden = false;
    el('melding').textContent = '';
    el('link').removeAttribute('aria-invalid');
  }
  function message(text, error = false) {
    el('melding').textContent = text;
    el('melding').className = error ? 'fout' : '';
  }
  el('link').addEventListener('input', reset);
  el('titel').addEventListener('input', () => {
    el('kaartTitel').textContent = el('titel').value.trim();
  });
  el('qrForm').addEventListener('submit', event => {
    event.preventDefault();
    reset();
    let url;
    try {
      let value = el('link').value.trim();
      if (!value || /\s/.test(value)) throw new Error();
      if (!/^[a-z][a-z\d+.-]*:/i.test(value)) value = 'https://' + value;
      url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    } catch (_) {
      message('Vul een geldige website-link in, bijvoorbeeld https://www.voorbeeld.be/oefening.', true);
      el('link').setAttribute('aria-invalid', 'true');
      el('link').focus();
      return;
    }
    if (typeof window.qrcode !== 'function') {
      message('De QR-maker kon niet geladen worden. Vernieuw de pagina en probeer opnieuw.', true);
      return;
    }
    try {
      const qr = window.qrcode(0, 'M');
      // URL serialization percent-encodes Unicode paths and international domain names.
      const destination = url.href;
      qr.addData(destination);
      qr.make();
      const cells = qr.getModuleCount();
      const scale = Math.max(6, Math.ceil(1000 / (cells + 8)));
      const canvas = el('qrCanvas');
      canvas.width = canvas.height = (cells + 8) * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
          if (qr.isDark(row, col)) ctx.fillRect((col + 4) * scale, (row + 4) * scale, scale, scale);
        }
      }
      current = qr;
      el('kaartTitel').textContent = el('titel').value.trim();
      el('bestemming').textContent = destination;
      el('kaart').hidden = false;
      el('leeg').hidden = true;
      actions.forEach(id => { el(id).disabled = false; });
      message('Je QR-code is klaar. Download hem om te bewaren.');
    } catch (_) {
      message('Deze link is te lang voor een QR-code. Gebruik een kortere, rechtstreekse link naar de pagina.', true);
    }
  });
  function download(href, extension) {
    const a = document.createElement('a');
    const name = el('titel').value.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 70) || 'qr-code';
    a.href = href;
    a.download = name + '.' + extension;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  el('download').addEventListener('click', () => {
    if (current) download(el('qrCanvas').toDataURL('image/png'), 'png');
  });
  el('svgDownload').addEventListener('click', () => {
    if (!current) return;
    const svg = current.createSvgTag({ cellSize: 8, margin: 32, scalable: true });
    const href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    download(href, 'svg');
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  });
  el('afdrukken').addEventListener('click', () => { if (current) window.print(); });
})();
