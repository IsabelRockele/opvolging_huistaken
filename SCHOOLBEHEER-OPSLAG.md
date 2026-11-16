# Veilige klasopslag en automatische updates

Afwezigheden worden met een driewegsvergelijking op de actuele servergegevens
toegepast. `registratieVersie` wordt binnen dezelfde transactie verhoogd door
`metRegistratieVersie()`. Ook klaswissels gebruiken deze functie.

De live Firestore-regel `veiligeKlasRegistratie()` vereist die verhoging bij
wijzigingen aan refter, activiteiten (inclusief GWP), refterbevestigingen,
reftervrije dagen en verwerking. Een oude pagina die alleen een volledige
klaslijst terugschrijft wordt hierdoor geweigerd, ook nadat die pagina de nieuwe
revisie heeft ingelezen. Andere bestaande toegangsvoorwaarden blijven gelden.
Er is geen migratie of herstel van klasgegevens nodig.

Bij iedere volgende publicatie van Schoolbeheer:

1. Verhoog `versie` in `schoolbeheer-versie.json` én de versie die
   `schoolbeheer.html` aan `startVersieControle` meegeeft (oplopend geheel getal).
2. Verhoog de queryversie van gewijzigde geïmporteerde modules.
3. Publiceer websitebestanden samen. Controleer het manifest en de HTML live.

De pagina controleert iedere 30 seconden en bij terugkeer naar het venster.
Automatisch verversen gebeurt alleen zonder lopende opslag, onbewaarde
klaswijzigingen, ingevulde onafgewerkte formulieren of open dialoog. Bij een
netwerkfout blijft de pagina open. Browservensters die van vóór deze functie
dateren moeten eenmalig vernieuwd worden; de databasebeveiliging geldt ook
voor die vensters.

Regelwijzigingen altijd baseren op de op dat moment actieve Firebase-regels,
niet op een mogelijk verouderde lokale kopie. `tools/schoolbeheer-versieregels.cjs`
past alleen de bestaande klas-updatevoorwaarde aan.
`tools/test-schoolbeheer-versieregels.cjs` gebruikt de Firebase Rules test-API
met fictieve verzoeken en mocks; er worden geen leerlinggegevens geschreven.
De werkbestanden en testresultaten staan lokaal in `tmp/versiebeveiliging/`.
