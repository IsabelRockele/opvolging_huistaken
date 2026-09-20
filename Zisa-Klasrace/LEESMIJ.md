# Zisa-klasrace in het schoolportaal

Zisa-klasrace vervangt de zichtbare tegel van TafelExpeditie. De map `tafelexpeditie` blijft intact. Het spel staat onder `klasrace/` binnen dezelfde website en gebruikt Firebase-project `huiswerkapp-a311e`. Een aparte website, Cloudflare-database of Cloud Functions is niet nodig.

## In de klas

1. Meld je aan in het schoolportaal en open Zisa-klasrace.
2. Kies je klas uit de gekoppelde klaslijsten van de huiswerkapp.
3. Kies de oefeningen en zet de race klaar.
4. Laat kinderen de nieuwe QR-code op het bord scannen en hun eigen naam kiezen.
5. Controleer de wachtlijst. Klik per kind op Toelaten of Weigeren.
6. Start zodra alle aanmeldingen behandeld zijn. Maximaal 32 kinderen kunnen meespelen.

Elke nieuwe race heeft een eigen code en eigen deelnemers. Andere leerkrachten kunnen tegelijk een eigen race starten. Alleen de eigenaar kan toelaten, verwijderen, starten, stoppen of het volgende dicteewoord openen. Toegelaten leerlingen kunnen alleen hun eigen voortgang aanpassen. Leerlingen hoeven zelf geen account of wachtwoord te maken: Firebase gebruikt een anonieme toestelidentiteit.

Bij dezelfde voornaam gebruiken kinderen ook hun klasnummer. Na herladen wordt dezelfde deelname hervat op hetzelfde toestel en in dezelfde browser. Gebruik voor verschillende kinderen aparte toestellen/browserprofielen. Een gedeeld toestel wisselen kan via een nieuwe race; tijdens een lopende race hoort het toestel bij dezelfde deelnemer.

Een racecode is 24 uur bruikbaar. Maak elke les een nieuwe race. Een oefen-QR voor zelfstandig spelling oefenen blijft 30 dagen bruikbaar. Dit is geen centrale langetermijnopvolging zoals TafelExpeditie.

Een kind dat wegvalt kan je via Deelnemers beheren verwijderen, zodat een dictee verder kan. Het bord werkt de stand rechtstreeks bij wanneer er iets verandert. Gebruik internet op het bord en op de leerlingtoestellen.

## Bron en publicatie

- `Zisa-Klasrace/`: bewerkbare bron.
- `klasrace/`: gebouwde website, mee publiceren via de bestaande GitHub Pages-site.
- `firestore-klasrace.rules.snippet`: afzonderlijke toegangsregels voor het spel.
- `firestore.rules`: volledige regels, inclusief het spel.
- `firebase.klasrace.json`: gerichte publicatie van databaseregels.

Bouwen vanuit `Zisa-Klasrace`: `npm ci`, `npm run check`, `npm run build`. Node 22.13 of nieuwer. De bouw vult alleen de uitvoermap `../klasrace` opnieuw.

De eerdere bestanden `worker.ts`, `wrangler.json`, `app/api`, `lib/database.ts` en `drizzle` zijn alleen de oorspronkelijke Cloudflare-versie en worden niet gebruikt door de schoolversie. De oude uitleg staat in LEGACY-CLOUDFLARE.md.

De test in `tests/firebase-game.test.mjs` is een echte online integratietest. Ze draait alleen met `KLASRACE_LIVE_TEST=1`, maakt eigen tijdelijke accounts en spelgegevens en verwijdert die daarna. Ze gebruikt de al aangemelde Firebase-beheerder van de ontwikkelcomputer. Zonder die vlag wordt de online test overgeslagen.

## Nog controleren op school

Test de QR-code, de schermvullende stand en het geluid eenmaal met het echte smartboard en twee iPads. De dicteestem gebruikt uitsluitend vooraf gegenereerde Azure Dena-MP3's bij de website. Genereer de audio lokaal en publiceer ze samen met de website; zie DENA-AUDIO.md. Er is geen Blaze of extra server nodig. Gebruik een hoofdtelefoon bij zelfstandig dictee. De leerlingresultaten zijn bedoeld voor oefenen, niet als beveiligde toetsafname.

## Klaslijsten en schooljaar

De tool leest de klaslijsten van het actieve schooljaar in de huiswerkapp. Leerlingen worden met dezelfde sorteersleutel als de klasnummerlijst gerangschikt op achternaam en roepnaam. De naamkeuze toont klasnummer en voornaam in drie kolommen, van boven naar beneden en daarna de volgende kolom. Achternamen worden niet meegestuurd naar leerlinglinks.

Elke nieuwe race of oefen-QR krijgt een momentopname van de huidige klaslijst. Maak na wijzigingen aan de klaslijst een nieuwe QR-code. De schooljaargrens volgt de huiswerkapp (1 augustus); oude klaslinks verlopen uiterlijk op die grens. Nieuwe links gebruiken automatisch de nieuwe klaslijst. Bestaande links schuiven nooit door naar nieuwe leerlingen.

De naamkeuze bij zelfstandig dictee is gekoppeld; de resultaten worden nog niet centraal opgeslagen. Een naam kiezen is geen controle van de identiteit.

## Vaste Dena-audio

Zie [DENA-AUDIO.md](DENA-AUDIO.md) voor het lokale makerhulpmiddel, veilig gebruik van de Azure-sleutel, F0-limieten en publicatie van nieuwe woorden en hun audio. Woorden zonder gepubliceerde audio krijgen een expliciete melding; er is geen vervangende toestelstem.
