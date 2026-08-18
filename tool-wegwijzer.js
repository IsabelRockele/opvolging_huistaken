(function () {
  "use strict";

  const pagina = location.pathname.split("/").pop().toLowerCase();
  const uitleg = {
    "zorgoverleg.html": {
      titel: "Zo werk je hier",
      kort: "Kies klas en maand, vul per leerling in en bewaar vóór je verdergaat.",
      stappen: [
        "Kies bovenaan het juiste schooljaar, de klas en de maand.",
        "Open een leerling en vul alleen de onderdelen in die je nodig hebt.",
        "Klik op Opslaan of Opslaan + volgende leerling. Pas daarna staat de wijziging veilig in de centrale opslag.",
        "Een leerling ontbreekt? Voeg die toe via Klaslijsten → Nieuwe leerling en open dit scherm opnieuw.",
        "Met PDF / afdrukken maak je een overzicht; daarmee verander je de bewaarde gegevens niet."
      ]
    },
    "groeigroepen.html": {
      titel: "Zo werk je hier",
      kort: "Maak een groeigroep, kies leerlingen en werk daarna per tabblad.",
      stappen: [
        "Maak links een groeigroep of open een bestaande groep.",
        "Voeg leerlingen toe via Leerlingen. De namen komen uit de centrale klaslijsten.",
        "Werk per tabblad aan doelen, logboek, puntenboek of rapport; wacht na een wijziging op de bewaarmelding.",
        "Verwijderen wist de gekozen groeigroep. De tool vraagt daarom eerst bevestiging.",
        "Een leerling ontbreekt? Voeg die eerst toe via Klaslijsten → Nieuwe leerling."
      ]
    },
    "voorbladen.html": {
      titel: "Zo maak je voorbladen",
      kort: "Kies één leerling of de hele klas en download daarna het gewenste Word-bestand.",
      stappen: [
        "Controleer schooljaar en klas.",
        "Vink één of meer kinderen aan; Hele klas selecteert iedereen.",
        "Kies Rapportvoorbladen of Toonmapvoorbladen downloaden.",
        "Open het bestand in Word en druk af op 100% / ware grootte.",
        "Hier wordt niets bij leerlingen gewijzigd of verwijderd."
      ]
    },
    "intelligent-puntenboek.html": {
      titel: "Zo werk je met dit puntenboek",
      kort: "Je puntenboek wordt automatisch en alleen op dit toestel bewaard.",
      stappen: [
        "Maak een vak, toets of onderdeel aan en vul daarna de resultaten in.",
        "Wijzigingen worden automatisch op dit toestel bewaard; er is geen aparte bewaarknop.",
        "Gebruik hetzelfde toestel en browserprofiel om deze gegevens terug te zien.",
        "Verwijder alleen een onderdeel wanneer je zeker bent: lokale gegevens zijn niet centraal gekoppeld aan de klaslijst."
      ]
    },
    "klasagenda.html": {
      titel: "Kies hier de juiste agenda",
      kort: "Open de agenda van je graad; invullen en afdrukken gebeurt in het volgende scherm.",
      stappen: [
        "Kies Eerste, Tweede of Derde graad.",
        "Klik op Openen om naar de juiste agenda te gaan.",
        "In het volgende scherm vul je de week in en maak je de afdruk.",
        "Op dit keuzescherm wordt nog niets bewaard of verwijderd."
      ]
    },
    "klasagendav2.html": {
      titel: "Kies hier de juiste agenda",
      kort: "Open de agenda van je graad; daar kun je ze invullen en in het archief bewaren.",
      stappen: [
        "Kies Eerste of Tweede graad en klik op Openen.",
        "Vul de agenda in het volgende scherm in.",
        "Daar kun je ze in het archief bewaren, zodat bevoegde collega’s ze later kunnen raadplegen.",
        "Derde graad is in deze nieuwe versie nog niet beschikbaar."
      ]
    },
    "bestellingen.html": {
      titel: "Zo werk je met bestellingen",
      kort: "Kies eerst het juiste onderdeel; wijzigingen worden automatisch centraal bewaard.",
      stappen: [
        "Controleer klas en schooljaar en open alleen het onderdeel dat je nodig hebt.",
        "Vul aantallen, voorraad of aankopen in. De gegevens worden automatisch centraal bewaard.",
        "Gebruik Afdrukken voor een papieren overzicht en Back-up downloaden voor een extra veiligheidskopie.",
        "Let op bij Back-up terugzetten: die vervangt de huidige gedeelde gegevens en vraagt daarom extra controle.",
        "Verwijderen staat telkens bij het betrokken artikel of onderdeel."
      ]
    },
    "huiswerkklas.html": {
      titel: "Zo vul je de huiswerkklas in",
      kort: "Kies maand en datum en vink aan; iedere wijziging wordt automatisch bewaard.",
      stappen: [
        "Controleer schooljaar, maand en datum.",
        "Vink de aanwezige leerlingen aan of pas een eerder vinkje aan.",
        "Wacht tot Bewaard verschijnt vóór je de maand wisselt. De knop Bewaren kun je ook gebruiken om meteen te bevestigen.",
        "Een leerling ontbreekt? Voeg die toe via Klaslijsten → Nieuwe leerling."
      ]
    },
    "schooloverzicht.html": {
      titel: "Zo gebruik je het schooloverzicht",
      kort: "Kies links een klas of zoek een naam; dit scherm is alleen een overzicht.",
      stappen: [
        "Gebruik zoeken om snel een klas of onderdeel te vinden.",
        "Open een klas om de gegevens te bekijken waarvoor je toegang hebt.",
        "Je wijzigt of verwijdert hier geen leerlinggegevens.",
        "Ontbreekt een naam? Pas de centrale klaslijst aan via Klaslijsten."
      ]
    }
  };

  const cfg = uitleg[pagina];
  if (!cfg || document.querySelector(".tool-wegwijzer")) return;

  const style = document.createElement("style");
  style.textContent = `.tool-wegwijzer{box-sizing:border-box;grid-column:1/-1;width:100%;margin:0 0 16px;padding:12px 15px;border:1px solid #c8ddd0;border-left:5px solid #3b7b54;border-radius:12px;background:#f4faf6;color:#173424;font-family:Arial,sans-serif;line-height:1.4}.tool-wegwijzer__rij{display:flex;gap:12px;align-items:center;justify-content:space-between}.tool-wegwijzer__tekst{min-width:0}.tool-wegwijzer strong{font-size:15px}.tool-wegwijzer p{margin:2px 0 0;font-size:13px}.tool-wegwijzer details{margin-top:8px;border-top:1px solid #d7e7dc;padding-top:8px}.tool-wegwijzer summary{cursor:pointer;font-weight:700;font-size:13px;color:#265b3a}.tool-wegwijzer ol{margin:8px 0 2px;padding-left:22px;font-size:13px}.tool-wegwijzer li+li{margin-top:5px}@media(max-width:700px){.tool-wegwijzer__rij{display:block}}@media print{.tool-wegwijzer{display:none!important}}`;
  document.head.appendChild(style);

  const blok = document.createElement("section");
  blok.className = "tool-wegwijzer no-print";
  blok.setAttribute("aria-label", "Korte uitleg voor deze tool");
  blok.innerHTML = `<div class="tool-wegwijzer__rij"><div class="tool-wegwijzer__tekst"><strong>${cfg.titel}</strong><p>${cfg.kort}</p></div></div><details><summary>Stappen, bewaren en verwijderen</summary><ol>${cfg.stappen.map(s => `<li>${s}</li>`).join("")}</ol></details>`;

  const main = document.querySelector("main");
  if (main) main.insertAdjacentElement("afterbegin", blok);
})();
