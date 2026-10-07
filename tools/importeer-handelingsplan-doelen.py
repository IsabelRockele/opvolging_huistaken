"""Lees GO!-doelensets zonder de werkboeken of bestaande doelenbibliotheken te wijzigen."""
import argparse
import hashlib
import json
from pathlib import Path
import openpyxl

AGES = ["2,5-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10", "10-11", "11-12"]
LEVELS = ["onderwerp", "subthema", "rubriek", "subrubriek"]


def text(value):
    return "" if value is None else str(value).strip()


def read_book(path):
    book = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = book.active
    rows = sheet.iter_rows(values_only=True)
    header = next(rows)
    assert list(header[:3]) == ["TYPE", "GO! NR.", "INHOUD"], path.name
    assert list(header[13:22]) == AGES, path.name
    context = dict.fromkeys(LEVELS, "")
    goals, current, group = [], None, "MIA"
    for row_number, row in enumerate(rows, 2):
        kind, code, body = (text(v) for v in row[:3])
        if kind in LEVELS:
            context[kind] = body
            for level in LEVELS[LEVELS.index(kind) + 1:]:
                context[level] = ""
            current = None
        elif kind == "doelzin":
            if not code or not body:
                raise ValueError(f"Onvolledig doel in {path.name}, rij {row_number}")
            current = {"id": f"{sheet.title}:{code}", "vakgebied": sheet.title,
                       "nummer": code, "tekst": body, **context,
                       "leeftijden": [age for age, flag in zip(AGES, row[13:22]) if flag is True],
                       "items": [], "toelichting": [], "bron": path.name, "rij": row_number}
            goals.append(current)
            group = "MIA"
        elif current and kind == "MIA - titel":
            group = body.rstrip(": ") or "MIA"
        elif current and kind in ("MIA - aanklikbaar", "te hanteren begrippen") and body:
            current["items"].append({"groep": "Te hanteren begrippen" if kind == "te hanteren begrippen" else group, "tekst": body})
        elif current and kind in ("MIA - niet aanklikbaar", "asterisk", "voorbeelden - titel", "voorbeelden - bullet") and body:
            current["toelichting"].append(body)
    book.close()
    return goals


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("bron", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    goals, sources = [], []
    for path in sorted(args.bron.glob("*.xlsx")):
        parsed = read_book(path)
        goals.extend(parsed)
        sources.append({"bestand": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "aantal": len(parsed)})
        print(f"{path.name}: {len(parsed)} doelen")
    assert goals and len({g["id"] for g in goals}) == len(goals), "Ontbrekende of dubbele doelcodes"
    content = json.dumps({"versie": "GO-doelensets-2026-10-07", "leeftijden": AGES, "bronnen": sources, "doelen": goals}, ensure_ascii=False, separators=(",", ":"))
    (root / "handelingsplan-doelen.json").write_text(content + "\n", encoding="utf-8")
    print(f"Totaal: {len(goals)} unieke doelen; bronbestanden ongewijzigd.")


if __name__ == "__main__":
    main()
