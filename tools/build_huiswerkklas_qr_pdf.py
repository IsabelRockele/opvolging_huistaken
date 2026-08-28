from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "qr-huiswerkklas.pdf"
URL = "https://isabelrockele.github.io/opvolging_huistaken/huiswerkklas.html"


def centered(c, text, y, font="Helvetica", size=11, color=HexColor("#2c1f0e")):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString((A4[0] - stringWidth(text, font, size)) / 2, y, text)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4)
    width, height = A4
    brown, green, pale, ink, muted = (HexColor(x) for x in ("#6b5d52", "#356d4c", "#eef7f1", "#2c1f0e", "#756855"))

    c.setFillColor(brown)
    c.rect(0, height - 105, width, 105, fill=1, stroke=0)
    centered(c, "HUISWERKKLAS", height - 57, "Helvetica-Bold", 26, white)
    centered(c, "GO! Basisschool De Linde", height - 79, "Helvetica", 12, white)

    centered(c, "Scan de QR-code om aanwezigheden en begeleiders in te vullen", height - 145, "Helvetica-Bold", 13, ink)

    widget = qr.QrCodeWidget(URL)
    bounds = widget.getBounds()
    qr_size = 230
    scale = qr_size / (bounds[2] - bounds[0])
    drawing = Drawing(qr_size, qr_size, transform=[scale, 0, 0, scale, 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, c, (width - qr_size) / 2, height - 405)

    centered(c, "1. Scan  2. Log in  3. Kies de datum  4. Vink aan en bewaar", height - 435, "Helvetica-Bold", 12, green)

    c.setFillColor(pale)
    c.roundRect(55, 175, width - 110, 135, 12, fill=1, stroke=0)
    c.setFillColor(ink)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(75, 282, "Zet de huiswerkklas als icoontje op je gsm")
    c.setFont("Helvetica", 11)
    lines = [
        "Android: open in Chrome en kies 'Installeren als snelkoppeling'",
        "of 'Toevoegen aan startscherm'. De benaming verschilt per toestel.",
        "iPhone: open in Safari, tik op de deelknop en kies 'Zet op beginscherm'.",
        "Daarna gebruik je altijd hetzelfde icoontje. Een nieuwe QR is niet nodig."
    ]
    for index, line in enumerate(lines):
        c.drawString(75, 258 - index * 21, line)

    centered(c, URL, 135, "Helvetica", 8, muted)
    centered(c, "Deze QR-code blijft ook in volgende schooljaren geldig.", 108, "Helvetica-Bold", 10, green)
    centered(c, "Gebruik uitsluitend je eigen schoolaccount.", 86, "Helvetica", 9, muted)
    c.save()


if __name__ == "__main__":
    build()
