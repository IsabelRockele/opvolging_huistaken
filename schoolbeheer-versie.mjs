// No forced reload while there is pending storage or unfinished form input.
export function maakVersieControle({versie, leesVersie, magVernieuwen, vernieuw, meld}) {
  let bezig = false, nieuw = null, vernieuwd = false;
  return async function controleer() {
    if (bezig || vernieuwd) return;
    bezig = true;
    try {
      const gevonden = await leesVersie();
      if (Number.isSafeInteger(gevonden) && gevonden > versie) nieuw = gevonden;
      if (!nieuw) return;
      if (!magVernieuwen()) { meld(true); return; }
      vernieuwd = true;
      meld(false);
      vernieuw(nieuw);
    } catch {
      // Offline / transient deployment errors never discard local input.
    } finally { bezig = false; }
  };
}

export function startVersieControle({versie, heeftWijzigingen}) {
  const document = window.document;
  const formulierVuil = () => !!document.querySelector('[data-versie-onbewaard]');
  // Values entered in forms that have not yet been submitted must also survive.
  document.addEventListener('input', event => {
    const el = event.target;
    if (el.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit])')) {
      el.dataset.versieOnbewaard = 'true';
    }
  }, true);
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.matches('#content select') && el.isConnected) el.dataset.versieOnbewaard = 'true';
  }, true);
  let melding;
  const controleer = maakVersieControle({
    versie,
    leesVersie: async () => {
      const url = new URL('./schoolbeheer-versie.json', window.location.href);
      url.searchParams.set('controle', Date.now());
      const response = await fetch(url, {cache:'no-store'});
      if (!response.ok) throw Error('Versie niet beschikbaar');
      return (await response.json()).versie;
    },
    magVernieuwen: () => !heeftWijzigingen() && !formulierVuil() &&
      !document.querySelector('dialog[open]') && !document.hidden,
    vernieuw: versie => {
      const url = new URL(window.location.href);
      url.searchParams.set('versie', versie);
      window.location.replace(url.href);
    },
    meld: wacht => {
      if (!melding) {
        melding = document.createElement('div');
        melding.setAttribute('role', 'status');
        melding.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:99999;padding:16px;border:2px solid #26723c;border-radius:12px;background:#f0fff3;color:#173d25;box-shadow:0 4px 20px #0002';
        document.body.append(melding);
      }
      melding.textContent = wacht
        ? 'Er is een nieuwe versie. Bewaar eerst je wijzigingen en rond je formulier af. De pagina vernieuwt daarna automatisch; er wordt niets weggegooid.'
        : 'Je gegevens zijn bewaard. De nieuwe versie wordt geopend…';
    }
  });
  window.addEventListener('focus', controleer);
  window.addEventListener('online', controleer);
  document.addEventListener('visibilitychange', controleer);
  window.setInterval(controleer, 30000);
  controleer();
  return controleer;
}
