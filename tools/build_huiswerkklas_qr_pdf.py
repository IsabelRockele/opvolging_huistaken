from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
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
    green, pale, ink, muted, line = (HexColor(x) for x in ("#356d4c", "#f5faf7", "#192a41", "#667085", "#b8c8bf"))

    # Een korte accentlijn binnen de veilige afdrukmarge vervangt het vroegere
    # grote donkere kleurvlak en kan niet door een printerrand worden afgesneden.
    c.setFillColor(green)
    c.roundRect(72, height - 32, width - 144, 4, 2, fill=1, stroke=0)
    centered(c, "HUISWERKKLAS", height - 68, "Helvetica-Bold", 25, ink)
    centered(c, "GO! Basisschool De Linde", height - 90, "Helvetica", 11, green)
    c.setStrokeColor(line)
    c.setLineWidth(0.8)
    c.line(72, height - 108, width - 72, height - 108)

    centered(c, "Scan om aanwezigheden en begeleiders in te vullen", height - 138, "Helvetica-Bold", 13, ink)

    widget = qr.QrCodeWidget(URL)
    bounds = widget.getBounds()
    qr_size = 220
    scale = qr_size / (bounds[2] - bounds[0])
    drawing = Drawing(qr_size, qr_size, transform=[scale, 0, 0, scale, 0, 0])
    drawing.add(widget)
    qr_x, qr_y = (width - qr_size) / 2, height - 385
    c.setStrokeColor(line)
    c.setLineWidth(1)
    c.roundRect(qr_x - 14, qr_y - 14, qr_size + 28, qr_size + 28, 10, fill=0, stroke=1)
    renderPDF.draw(drawing, c, qr_x, qr_y)

    centered(c, "1. Scan   2. Log in   3. Kies de datum   4. Vink aan en bewaar", height - 420, "Helvetica-Bold", 11, green)

    c.setFillColor(pale)
    c.setStrokeColor(line)
    c.setLineWidth(0.8)
    c.roundRect(60, 170, width - 120, 130, 10, fill=1, stroke=1)
    c.setFillColor(ink)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(80, 276, "Zet de huiswerkklas als icoontje op je gsm")
    c.setFont("Helvetica", 10)
    lines = [
        "Android: open in Chrome en kies 'Installeren als snelkoppeling'",
        "of 'Toevoegen aan startscherm'. De benaming verschilt per toestel.",
        "iPhone: open in Safari, tik op de deelknop en kies 'Zet op beginscherm'.",
        "Daarna gebruik je altijd hetzelfde icoontje. Een nieuwe QR is niet nodig."
    ]
    for index, line in enumerate(lines):
        c.drawString(80, 252 - index * 20, line)

    centered(c, "Deze QR-code blijft ook in volgende schooljaren geldig.", 135, "Helvetica-Bold", 10, green)
    centered(c, "Gebruik uitsluitend je eigen schoolaccount.", 113, "Helvetica", 9, muted)
    centered(c, URL, 87, "Helvetica", 7.5, muted)
    c.save()


if __name__ == "__main__":
    build()
