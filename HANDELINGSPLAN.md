# Individuele handelingsplannen

Deze uitbreiding is gescheiden van de bestaande zorgoverleggen, groeiplannen,
overgangsbesprekingen en klasoverdrachten. In de twee bestaande schermen zijn
alleen verwijzingen toegevoegd. Ze openen een nieuw tabblad, zodat lopende
invoer in een overleg of leerlingfiche blijft staan.

## Gebruik

- Zorgoverleg: kies het kind en klik op **Handelingsplan**. Raadpleeg de plannen
  of maak een nieuw plan.
- Overgangsbespreking: dezelfde knop staat in de leesfiche en de bewerkfiche.
  Een nieuwe fiche moet eerst bewaard en centraal gekoppeld zijn.
- Kies een GO!-doel met vakgebied, onderwerp, subthema, rubriek, subrubriek en
  leeftijdsgroep. Zoek ook op doelcode of tekst. MIA en begrippen kunnen het
  gekozen doel verfijnen. Toelichtingen en voorbeelden blijven leesbaar.
- Vul het concrete kinddoel, beginsituatie, succescriterium, aanpak,
  materiaal, frequentie, taakverdeling en ouderafspraken in.
- Voeg evaluaties toe met uitgevoerde aanpak, observatie, effect, doelbereik,
  besluit en oudergesprek. Elke opslag bewaart een volledige onveranderlijke
  versie; eerdere aanpak wordt niet uit de historiek verwijderd.
- Een bewaard leerplandoel blijft vast aan het plan hangen. Start een nieuw
  plan wanneer je aan een ander doel begint.
- Met **Eerdere aanpak toevoegen** kun je ervaringen uit vorige leerjaren
  achteraf invoeren: schooljaar, klas, eventuele periode, toenmalig doel,
  aanpak, effect, resultaat, ouderafspraken en informatiebron. Voeg één of
  meer notities aan het plan toe en klik vervolgens op **Handelingsplan bewaren**.
  Ook jaren vóór de start van deze toepassing zijn mogelijk. Deze notities
  verschijnen per toenmalig schooljaar en klas, met de huidige invoerdatum en
  auteur afzonderlijk vermeld. De oude klaslijsten en dossiers blijven intact.
  Een oude ervaring wordt niet als de laatste actuele evaluatie voorgesteld.

## Leerlingidentiteit en schooljaar

**Bewaren als PDF** downloadt het geopende plan met leerplandoel, aanpak,
ouderafspraken, eerdere aanpak per klas en alle bewaarde versies/evaluaties.
Lange teksten lopen door naar volgende pagina's. Niet-bewaarde invoer krijgt
het label CONCEPT. De PDF-knop wijzigt niets in de online opslag. De afzonderlijke
knop Afdrukken blijft beschikbaar.

Firestore controleert de aangemelde gebruiker, schoolrol, klaskoppeling en
centrale leerling. Codes uit URL's verlenen geen toegang op zichzelf.
Toegang is voor de gekoppelde klasleerkracht en de bestaande schoolbrede
zorgrollen, directie en beheerder. Secretariaat krijgt geen zorginhoud.

De centrale jaarovergang bewaart `previousStudentId`, zowel voor doorschuiven
als zittenblijven. Klaswissels behouden de code of verwijzen via
`sourceStudentId`. De uitbreiding volgt deze expliciete verwijzingen en
houdt eigen koppelingen bij. Ze koppelt **nooit op naam**. Een ontbrekende,
dubbele of tegenstrijdige koppeling blokkeert veilig en vraagt controle door
een beheerder. Bestaande gebroken koppelingen worden niet automatisch hersteld.

Een overgangsfiche gebruikt `schoolbeheerId`. Ook als de fichecode verandert
of nog naar de vorige centrale code verwijst, kan de toepassing het kind via de
centrale jaarovergang herkennen. Bij een overdracht moet het kind in de
centrale klaslijst van het gekozen schooljaar staan voordat hier plannen
worden geopend. Gebruik na activering de overgangspagina van dat schooljaar.

Het lopende schooljaar begint op 1 september, in tijdzone Europe/Brussels.
Het gekozen schooljaar uit het bronscherm wordt gerespecteerd. Vorige en
toekomstige jaren zijn alleen-lezen. In het lopende jaar kan een actieve
inschrijving een bestaand plan verderzetten, met behoud van de oude versies.
Een tussentijdse klaswissel of wijziging van rechten wordt ook binnen de
bewaartransactie opnieuw gecontroleerd.

## Afzonderlijke opslag en activering (huidig Spark-abonnement)

De uitbreiding gebruikt rechtstreeks Firestore met aanvullende toegangsregels.
Er zijn geen Cloud Functions, betaalde triggers of abonnementswijzigingen nodig.
De bestaande regels blijven letterlijk behouden; het nieuwe blok staat tussen
`BEGIN HANDELINGSPLAN` en `END HANDELINGSPLAN` in `firestore.rules`.

Nieuwe gegevens staan uitsluitend in:

- `handelingsplannen/{dossier}/plannen/{plan}`: actuele versie;
- `handelingsplannen/{dossier}/plannen/{plan}/historiek/{bewaaractie}`: onveranderlijke versies;
- `handelingsplanCodes/{centrale-leerlingcode}`: vaste dossierkoppeling zonder naam/zorginhoud;
- `handelingsplanToegang/{uid}/leerlingen/{dossier}`: gevalideerde verwijzing naar de huidige inschrijving.

Elke lees- en schrijfactie wordt door Firestore getoetst aan de schoolrol en,
voor klasleerkrachten, de actuele klaslijst en klaskoppeling. De toegang vervalt
bij een klaswissel, einde inschrijving of gewijzigd schooljaar. De leerlingcode
wordt altijd gecontroleerd op de opgegeven positie in de centrale klaslijst.
De bestaande rechten om centrale klaslijsten te beheren blijven behouden.

De actuele planversie en de bijbehorende historiek worden samen in één transactie
bewaard. Versienummers voorkomen gelijktijdig overschrijven; de bewaaractiecode
voorkomt dubbele opslag na een onduidelijk netwerkantwoord. Verwijderen van plannen
en veranderen/verwijderen van oude versies is niet toegestaan. De cataloguskeuze
en invoervelden worden daarnaast in de toepassing gevalideerd. Geen leerlinginhoud
wordt in lokale browseropslag bewaard.

`schoolbeheer.html` neemt bij toekomstige jaarovergangen (ook zittenblijven) en
klaswissels met een nieuwe leerlingcode één extra veld `handelingsplanId` mee.
Dat bewaart de dossieridentiteit, ook als oudere klaslijsten later worden opgeruimd.
Bestaande leerlinggegevens worden hiervoor niet gemigreerd of herschreven.
De overige klasoverdrachtlogica blijft gelijk.

Activeer eerst uitsluitend de gecombineerde Firestore-regels:

```powershell
firebase deploy --only firestore:rules --config firebase.handelingsplan-regels.json --project huiswerkapp-a311e
```

Publiceer daarna de nieuwe webbestanden en de drie beperkte wijzigingen aan
bestaande schermen via de bestaande websitepublicatie. De regelsdeploy wijzigt
geen bestaande documenten en deployt geen andere Firebase-diensten.

Een klasleerkracht opent de leerling via de huidige klas om het volledige dossier
te lezen, inclusief vorige schooljaren. Schoolbrede rollen kunnen ook rechtstreeks
archiefcontexten raadplegen. Oude en toekomstige schooljaren blijven alleen-lezen.

## Doelensets en controle

De tien aangeleverde Excelbestanden leveren 3189 unieke doelen. De JSON bevat
bronbestand, rij, bronhash en een catalogusversie. Een plan bewaart een kopie
van het gekozen doel zodat een latere bibliotheekupdate de betekenis van oude
plannen niet verandert. De bestaande doelenbestanden voor groeiplannen blijven
ongewijzigd. Herimporteren kan met `tools/importeer-handelingsplan-doelen.py`.

```powershell
node tools/test-handelingsplan-pdf.mjs
node tools/test-handelingsplan-regels.mjs
node --experimental-vm-modules tools/test-handelingsplan.mjs
node tools/test-klaswissel.mjs
node tools/test-klaswissel-transactie.mjs
```

De regeltests gebruiken een lokale Firestore-emulator op poort 8185 en uitsluitend
fictieve leerlingen. Installeer testafhankelijkheden met `npm install --prefix
tmp/handelingsplan-tests @firebase/rules-unit-testing firebase` en start de emulator
met `firebase emulators:start --only firestore --config firebase.handelingsplan-regels.json --project demo-handelingsplan`.

`handelingsplan.html?demo=1` gebruikt uitsluitend fictieve gegevens in geheugen
en importeert geen Firebase-client. Na vernieuwen verdwijnt de demonstratie-invoer.
