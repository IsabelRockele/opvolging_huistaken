from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

source = Path(r"C:\GitHub\opvolging_huistaken\afbeeldingen\schoollogo.png")
output = Path(r"C:\Users\isabe\.codex\visualizations\2026\08\16\01a00a9e-77d2-7fa2-b75b-036aba7798b0\schooltools-boomicoon.png")
icon_outputs = {
    192: Path(r"C:\GitHub\opvolging_huistaken\icon-192x192.png"),
    512: Path(r"C:\GitHub\opvolging_huistaken\icon-512x512.png"),
}

image = Image.open(source).convert("RGB")
image.thumbnail((640, 640), Image.Resampling.LANCZOS)
w, h = image.size
pixels = image.load()
mask = bytearray(w * h)
for y in range(h):
    for x in range(w):
        r, g, b = pixels[x, y]
        if g > 65 and g > r * 1.25 and g > b * 1.15:
            mask[y * w + x] = 1

seen = bytearray(w * h)
largest = []
for start in range(w * h):
    if not mask[start] or seen[start]:
        continue
    seen[start] = 1
    queue = deque([start])
    component = []
    while queue:
        pos = queue.popleft()
        component.append(pos)
        x, y = pos % w, pos // w
        for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h:
                nxt = ny * w + nx
                if mask[nxt] and not seen[nxt]:
                    seen[nxt] = 1
                    queue.append(nxt)
    if len(component) > len(largest):
        largest = component

tree = Image.new("RGBA", (w, h), (0, 0, 0, 0))
tree_pixels = tree.load()
for pos in largest:
    x, y = pos % w, pos // w
    tree_pixels[x, y] = (24, 118, 51, 255)
bbox = tree.getbbox()
tree = tree.crop(bbox)

for size, icon_output in icon_outputs.items():
    icon = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    scaled_tree = tree.copy()
    inset = round(size * 0.13)
    scaled_tree.thumbnail((size - 2 * inset, size - 2 * inset), Image.Resampling.LANCZOS)
    icon.alpha_composite(
        scaled_tree,
        ((size - scaled_tree.width) // 2, (size - scaled_tree.height) // 2),
    )
    icon.convert("RGB").save(icon_output, optimize=True)

canvas = Image.new("RGB", (700, 620), (225, 235, 239))
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((190, 55, 510, 375), radius=44, fill="white")
tree.thumbnail((245, 245), Image.Resampling.LANCZOS)
canvas.paste(tree, (350 - tree.width // 2, 215 - tree.height // 2), tree)

font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 48)
small = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", 25)
label = "Schooltools"
box = draw.textbbox((0, 0), label, font=font)
draw.text(((700 - (box[2]-box[0]))/2, 405), label, font=font, fill=(28,39,44))
draw.rounded_rectangle((210, 500, 268, 558), radius=12, fill="white")
mini = tree.copy()
mini.thumbnail((46, 46), Image.Resampling.LANCZOS)
canvas.paste(mini, (239-mini.width//2, 529-mini.height//2), mini)
draw.text((288, 514), "Voorbeeld op klein taakbalkformaat", font=small, fill=(28,39,44))
canvas.save(output)
