// Voorlopig alleen informatie: geen Firebase Functions of wachtwoordwijzigingen.
export function initAccountbeheer(app, auth) {
  if (document.getElementById('accountHerstelKnop')) return;
  const banner = document.querySelector('.banner-account');
  if (!banner) return;
  const button = document.createElement('button');
  button.id = 'accountHerstelKnop';
  button.type = 'button';
  button.className = 'knop-banner';
  button.textContent = 'Wachtwoord herstellen';
  button.onclick = () => alert('Wachtwoord herstellen is nog niet actief. Hiervoor moet eerst Firebase Blaze worden ingeschakeld en de herstelfunctie gepubliceerd en getest worden.\n\nEr wordt nu geen wachtwoord gewijzigd.');
  banner.append(button);
  auth.onAuthStateChanged(user => {
    if (!user) button.remove();
  });
}
