# Oude zelfstandige versie (niet in gebruik)

De schoolversie gebruikt Firebase. Zie LEESMIJ.md.

# Zisa Klasrace — zelfstandig pakket

Dit is het complete spel voor een eigen website, zonder ChatGPT-account of ChatGPT-hosting. Het wordt als afzonderlijke webapp gehost. Voeg in zisa_spelletjesmaker een tegel toe die de uiteindelijke URL opent. Open in een nieuw tabblad; gebruik geen iframe, zodat volledig scherm, geluid en het iPad-toetsenbord goed bereikbaar blijven.

## Wat Isabel gebruikt

- Start het spel via de tegel.
- Voor een dictee: kies groepen/woorden (maximaal 500 in de voorraad) en het aantal opdrachten (1–40). Het spel maakt een evenwichtige mix; bij te weinig woorden gebruikt het alle gekozen woorden.
- 'Andere mix maken' maakt een nieuwe selectie. Afdrukken, zelfstandig oefenen, de oefen-QR en het klasspel gebruiken dezelfde voorbereide selectie.
- 'Woordenlijst bewaren' bewaart de voorraad, het aantal én de exacte mix. Open dat JSON-bestand om later verder te gaan.
- 'Maak oefen-QR voor iPads' bewaart de oefenreeks online voor 30 dagen. Bewaar de QR-afbeelding of kopieer de link. De dag nadien scannen kinderen dezelfde QR. Ze starten ieder apart en hebben geen leerlingaccount nodig. Voortgang wordt niet centraal bijgehouden; herladen begint opnieuw.
- Bij zelfstandig oefenen: eerste uitspraak bij Start/Volgend woord, plus maximaal 3 herhalingen per woord. Als de stem niet start, telt dit niet als luisterbeurt. Bij de herhaalronde krijgen moeilijke woorden opnieuw hun luisterbeurten.
- Werkwoorden: zin + infinitief + tijd, zonder stem.
- Klasrace: de leerkracht klikt op 'Lees woord … voor'. De spelling van het woord verschijnt niet op het bord. 'Volgend woord' komt vrij zodra iedereen heeft afgerond. 'Stop het spel' beëindigt de ronde ook als niet iedereen klaar is.
- De microfoon is niet nodig. Geef op de iPad een hoofdtelefoon, zet het volume hoorbaar en test de Nederlandse stem voor de eerste les.

## Stem: huidige beperking

Het spel gebruikt de Nederlandse spraakstem van het toestel. Het kiest een Belgische Nederlandse stem indien beschikbaar. Azure Dena is nog niet gekoppeld; er zit geen Azure-sleutel of vaste Dena-audio in dit pakket. De uitspraak kan dus per toestel verschillen. Controleer vooraf de stem op het echte smartboard en de iPads. Voor een overal gelijke Dena-stem moeten audiobestanden of een beveiligde spraakdienst nog worden toegevoegd.

## Installatie voor Codex / je technische helper

Deze versie gebruikt React + Vite voor de pagina en een zelfstandige Cloudflare Worker met D1 voor klasraces en oefenlinks. Geen Firebase nodig. Een ZIP lokaal openen of enkel de statische bestanden op GitHub Pages zetten ondersteunt de gedeelde klasrace niet.

1. Pak de map `Zisa-Klasrace` uit. Installeer Node.js 22.13 of nieuwer en pnpm 11.
2. Voer `pnpm install` uit.
3. Meld aan bij je eigen Cloudflare-account met `pnpm exec wrangler login`.
4. Maak een eigen database met `pnpm exec wrangler d1 create zisa-klasrace`.
5. Vervang in `wrangler.json` de placeholder `database_id` door de ID uit die opdracht. Behoud de binding `DB`.
6. Voer `pnpm run db:remote` uit om de meegeleverde SQL-migraties toe te passen.
7. Voer `pnpm run deploy` uit. Dit bouwt de pagina en publiceert de Worker met de afbeeldingen en andere bestanden. De opdracht geeft de eigen live-URL terug.
8. Voeg in zisa_spelletjesmaker een tegel 'Zisa Klasrace' toe met die URL als bestemming. Desgewenst koppel je daarna een eigen subdomein aan de Worker.

Lokaal testen: `pnpm run build`, daarna `pnpm run db:local` en `pnpm run dev`. Open het adres dat Wrangler toont. Dit is voor lokaal testen; de iPad-QR moet van de online versie komen.

Dit compacte pakket bevat alle broncode en afbeeldingen. De dubbele, vooraf gebouwde map `dist` is weggelaten. Maak die met `pnpm run build` vóór het lokaal starten; `pnpm run deploy` bouwt automatisch. `worker.ts` verzorgt uitsluitend `/api/race` en `/api/practice`; overige aanvragen gaan naar de pagina/afbeeldingen.

De demo-races en QR-links van de eerdere testsite gaan NIET mee naar je eigen database. Maak na het publiceren op je eigen adres nieuwe QR-codes. Houd het adres daarna stabiel; een QR bevat dat adres.

## Alleen de maker breidt de bibliotheek uit

In `maker/Zisa-Bibliotheekbeheer.html` staat het aparte beheerbestand. Open dit lokaal, voeg woorden/groepen toe en bewaar de bibliotheek als JSON. Vervang `lib/word-library.json` door dat bestand, bouw en publiceer opnieuw. De map `maker` wordt niet aangeboden aan bezoekers; alleen `dist` wordt als website gepubliceerd.

Kopers kunnen kiezen uit groepen en eigen dicteelijsten bewaren, maar kunnen de gedeelde bibliotheek niet wijzigen. De vaste woordenbibliotheek is een bronbestand, geen Firebase-database.

## Koppeling met kopers

Dit pakket bevat het spel en de spelcodes, maar geen webshop- of abonnementscontrole. Laat jouw bestaande zisa_spelletjesmaker de tegel aanbieden volgens de huidige toegangsrechten. Als ook rechtstreeks openen van het spel alleen voor kopers moet kunnen, moet je technische helper de bestaande toegangscontrole aan de leerkrachtfuncties koppelen. Leerlinglinks moeten bereikbaar blijven zonder een kopersaccount.

## Controle

De bron is gecontroleerd op TypeScript-fouten; de losse frontend en Worker-bundel zijn gebouwd. De oefen-QR, klasdeelname en dicteebediening zijn in een browser getest. Geluid op een fysieke iPad en publicatie op jouw eigen Cloudflare-account moeten nog worden gecontroleerd.

Technische documentatie:
- https://developers.cloudflare.com/workers/static-assets/binding/
- https://developers.cloudflare.com/d1/reference/migrations/
