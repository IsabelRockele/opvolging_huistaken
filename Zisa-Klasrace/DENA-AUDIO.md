# Dena-audio voor de klasrace — zonder Blaze

De website speelt uitsluitend vooraf gemaakte MP3-bestanden met **nl-BE-DenaNeural** af. Azure Speech **zisa-vlaamse-stem** blijft in **northeurope** op **Free F0**. Alleen het lokale makerhulpmiddel praat met Azure. Er is geen nieuwe server, Cloudflare-account of Firebase-abonnementswijziging nodig.

## Eenmalig audio maken

1. Open in Azure je bestaande resource `zisa-vlaamse-stem` en vervolgens **Keys and Endpoint / Sleutels en eindpunt**. Kopieer een sleutel. Wijzig de prijscategorie niet.
2. Dubbelklik op [maker/Genereer-Dena.cmd](maker/Genereer-Dena.cmd). Python 3.10 of nieuwer moet geïnstalleerd zijn.
3. Er opent op Windows een **apart sleutelvenster**. Klik in het invoervak, plak de sleutel met Ctrl+V en klik op OK. Je ziet bolletjes verschijnen. De sleutel wordt alleen in het werkgeheugen van dit proces gebruikt en niet opgeslagen. Deel de sleutel niet in een chat en plak hem niet in een bronbestand of opdrachtregel.
4. Laat het venster open tot de generatie klaar is. Het hulpmiddel meldt hoeveel bestanden al bestaan en hoeveel nog nodig zijn. De eerste bibliotheek telt momenteel 330 unieke uitspraken en duurt ongeveer twintig minuten plus downloadtijd. Latere beurten maken alleen ontbrekende, gewijzigde of beschadigde bestanden.
5. Bouw en publiceer de bestanden zoals hieronder beschreven. Audio staat pas online na publicatie.

Alleen tellen, zonder sleutel of Azure-aanvraag:

```powershell
cd C:\GitHub\opvolging_huistaken\Zisa-Klasrace
python maker/generate-dena.py --plan
```

Voor een kleine eerste controle kun je `--limit 3` gebruiken. Onderbreken met Ctrl+C is veilig: reeds gemaakte bestanden blijven behouden en opnieuw starten gaat verder.

## Waar mag de sleutel staan?

Het sleutelvenster bewaart **geen sleutelbestand**. Wil je zelf een lokaal sleutelbestand gebruiken, bewaar dat buiten alle Git-mappen en gepubliceerde mappen, bijvoorbeeld `%LOCALAPPDATA%\Zisa\azure-speech-key.txt`, en geef het pad mee met `--key-file`. De inhoud is dan een lokaal geheim in leesbare vorm: deel of synchroniseer dat bestand niet. Het hulpmiddel weigert een sleutelbestand in een Git-map of in deze website. Er worden nooit sleutels in het audio-overzicht, JSON-export, QR-code, browser of logbestand gezet.

## Nieuwe woorden én audio publiceren

1. Bewerk de bibliotheek met `maker/Zisa-Bibliotheekbeheer.html` en vervang `lib/word-library.json` door de bewaarde bibliotheek. Lidwoorden worden opgebouwd uit `article` en `answer`, zodat bijvoorbeeld **het huis** wordt uitgesproken. Werkwoordzinnen met `sentence` worden overgeslagen.
2. Start `maker/Genereer-Dena.cmd` opnieuw. Een gewijzigde uitspraak krijgt een andere bestandsnaam. Ongewijzigde audio wordt gecontroleerd en hergebruikt.
3. Controleer en bouw vanuit `Zisa-Klasrace`:

```powershell
python maker/generate-dena.py --verify
npm.cmd run check
npm.cmd test
npm.cmd run build
```

4. Publiceer samen via de bestaande GitHub Pages-werkwijze:
   - `Zisa-Klasrace/lib/word-library.json`;
   - de bronbestanden `Zisa-Klasrace/public/audio/dena/manifest.json` en alle bijbehorende `.mp3`-bestanden;
   - de **hele opnieuw gebouwde map `klasrace/`**, inclusief nieuwe bestanden en verwijderde oude bundels.
5. Wacht op de geslaagde websitepublicatie en vernieuw de klasrace. Open een dictee, controleer de geselecteerde mix en maak een nieuwe QR als je de mix hebt gewijzigd. Bestaande QR-links gebruiken dezelfde bewaarde woorden; ongewijzigde audio wordt automatisch gevonden.

Het hulpmiddel verwijdert oude audio of vermeldingen niet: bestaande oefen-QR's kunnen die nog gebruiken. Bouw de website altijd **na** het genereren: het audio-overzicht wordt in de websitebundel opgenomen en de MP3's worden meegekopieerd.

Een leerkracht kan eigen woorden blijven bewaren en afdrukken. Zonder gepubliceerde Dena-audio verschijnt een melding; de tool gebruikt nooit een toestelstem als vervanging. Om als maker zo'n extra dicteelijst te ondersteunen, bewaar die lijst en voer uit:

```powershell
python maker/generate-dena.py --extra "C:\pad\naar\bewaard-dictee.json"
```

Bouw en publiceer daarna opnieuw. Het extra woord hoeft niet in de gedeelde bibliotheek te staan om audio te hebben.

## F0 en hergebruik

- Nieuwe aanvragen liggen minimaal 3,5 seconden uit elkaar, minder dan de F0-grens van 20 per minuut.
- Het lokale veiligheidsbudget is 450.000 tekens per UTC-kalendermaand, inclusief conservatief meegetelde SSML. De F0-toelage voor neural speech is 500.000 tekens per maand.
- Verbruik en een tijdelijke uitvoerblokkering staan in `%LOCALAPPDATA%\Zisa\Dena`, zonder sleutel. Start de generatie op één makercomputer en gebruik dezelfde verbruiksmap. Gebruik van deze Azure-resource door andere programma's/computers valt buiten dit lokale overzicht.
- Bij Azure-limieten wordt gewacht en hoogstens tweemaal opnieuw geprobeerd. Daarna stopt de generatie met uitleg. De bestaande audio blijft intact.
- Luisteren op de website doet **geen Azure-aanvraag** en verbruikt geen Speech-tekens. De browser downloadt geselecteerde MP3's vooraf en hergebruikt ze bij herbeluisteren en foutenoefening.

## Bediening en iPad/Safari

- Op het klasbord laadt het huidige woord zonder het uit te spreken. Alleen de luidsprekerknop speelt het af. De leerkracht bepaalt wanneer het volgende woord aan bod komt.
- Zelfstandig oefenen laadt eerst de geselecteerde audio. Een tik op Start of Volgend woord speelt de eerste uitspraak af; daarna zijn maximaal drie extra luisterbeurten mogelijk. In de foutenoefening begint de teller opnieuw per woord.
- `play()` wordt direct vanuit de tik gestart met een al gedownload MP3-bestand. Een geblokkeerde afspeelpoging telt niet mee; er verschijnt een melding met het verzoek opnieuw te tikken. Er is geen automatische spraakvervanging.
- Werkwoordoefeningen tonen de zin en infinitief zonder stem. De bestaande mix, export, QR-inhoud en foutenoefening blijven behouden.

Controleer vóór klasgebruik met een echte iPad/Safari en het smartboard: eerste tik, drie herhalingen, vierde herhaling geblokkeerd, volgend woord, foutenoefening, werkwoord zonder geluid, volume en een ontbrekend audiobestand. Een Windows-browsercontrole kan een fysieke Safari-test niet vervangen. Zonder jouw lokaal ingevulde sleutel kan de echte Dena-uitspraak nog niet gecontroleerd worden.

## Bronnen

- [Azure F0-limieten](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits)
- [Azure Speech-prijzen en maandtoelage](https://azure.microsoft.com/en-us/pricing/details/speech/)
- [Azure REST-spraak en MP3-uitvoer](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech)
- [Apple: HTML-media afspelen](https://developer.apple.com/documentation/webkitjs/htmlmediaelement/1630114-play)

## Uitgevoerde controle bij deze aanpassing

TypeScript-controle en websitebouw slagen. De lokale tests controleren onder meer lidwoorden, werkwoordfiltering, gewijzigde bestanden, sleutelbestanden buiten Git, F0-pauzes, maandbudget en mislukte afspeelpogingen. In de browser is met een afzonderlijke synthetische testtoon gecontroleerd: eerste uitspraak, precies drie extra beurten, blokkering daarna, foutcorrectie, werkwoord zonder luidspreker en een nieuwe luisterteller in de foutenoefening. Die testtoon is niet onderdeel van de website of het audio-overzicht. Echte Dena-audio en een fysieke iPad/Safari moeten na generatie nog gecontroleerd worden.
