"""Generate Recall's PNG icons with Pillow: a rounded yellow-orange note glyph on a soft gradient."""
from PIL import Image, ImageDraw, ImageFilter
import os
OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def render(size, glyph_scale):
    S = size * 4  # supersample for smooth edges
    img = Image.new("RGB", (S, S))
    top, bot = (255, 248, 228), (255, 222, 186)  # soft warm gradient
    px = img.load()
    for y in range(S):
        for x in range(S):
            px[x, y] = lerp(top, bot, (0.65 * y + 0.35 * x) / S)
    g = int(S * glyph_scale); x0 = (S - g) // 2; y0 = (S - g) // 2 + int(S * 0.01)
    r = int(g * 0.2)
    # shadow
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([x0, y0 + int(g * .05), x0 + g, y0 + g + int(g * .05)], r, fill=(190, 110, 20, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(S * 0.025)); img.paste(sh, (0, 0), sh)
    # note body: vertical yellow -> orange gradient, rounded
    body = Image.new("RGB", (g, g)); bp = body.load()
    for y in range(g):
        c = lerp((255, 214, 10), (255, 159, 10), y / g)
        for x in range(g): bp[x, y] = c
    mask = Image.new("L", (g, g), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, g - 1, g - 1], r, fill=255)
    img.paste(body, (x0, y0), mask)
    # ruled lines
    d = ImageDraw.Draw(img); lw = max(4, int(g * 0.065)); pad = int(g * 0.22)
    for i, frac in enumerate((0.36, 0.53, 0.70)):
        y = y0 + int(g * frac); x1 = x0 + g - pad - (int(g * 0.18) if i == 2 else 0)
        d.rounded_rectangle([x0 + pad, y - lw // 2, x1, y + lw // 2], lw // 2, fill=(255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)

render(180, 0.62).save(os.path.join(OUT, "apple-touch-icon.png"))
render(192, 0.62).save(os.path.join(OUT, "icon-192.png"))
render(512, 0.62).save(os.path.join(OUT, "icon-512.png"))
render(512, 0.48).save(os.path.join(OUT, "icon-maskable-512.png"))  # glyph inside the 80% safe zone
print("icons written")
