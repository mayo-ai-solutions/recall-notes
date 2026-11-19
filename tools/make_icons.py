"""Render the Recall (Ember) icons from the logo mark. Run: python3 tools/make_icons.py
Uses Chromium (Playwright) to rasterize the SVG, so there are no extra image libraries.
Outputs: icons/apple-touch-icon.png (180), icon-192.png, icon-512.png, icon-maskable-512.png,
icons/favicon.svg, icons/favicon-32.png, icons/logo.svg"""
import os
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "icons")
CHARCOAL, AMBER = "#15171C", "#F5A524"

BUBBLE = "M10 6h44a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H34L22 58V46H10a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z"
SPARK = "M32 14l3.5 8.5L44 26l-8.5 3.5L32 38l-3.5-8.5L20 26l8.5-3.5z"

def mark(scale, bg=True):
    """Full-bleed square (charcoal) with the mark centered. The mark's own box is 4..60 x 6..58, centre (32, 32)."""
    s = scale
    inner = f'<g transform="translate(32 32) scale({s}) translate(-32 -32)"><path d="{BUBBLE}" fill="{AMBER}"/><path d="{SPARK}" fill="{CHARCOAL}"/></g>'
    rect = f'<rect width="64" height="64" fill="{CHARCOAL}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{rect}{inner}</svg>'

LOGO_SVG = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Recall"><path d="{BUBBLE}" fill="{AMBER}"/><path d="{SPARK}" fill="{CHARCOAL}"/></svg>'
FAVICON_SVG = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="{CHARCOAL}"/><g transform="translate(32 32) scale(.78) translate(-32 -32)"><path d="{BUBBLE}" fill="{AMBER}"/><path d="{SPARK}" fill="{CHARCOAL}"/></g></svg>'

JOBS = [  # file, pixel size, svg
    ("apple-touch-icon.png", 180, mark(0.78)),   # iOS rounds the corners itself, so full bleed
    ("icon-192.png", 192, mark(0.78)),
    ("icon-512.png", 512, mark(0.78)),
    ("icon-maskable-512.png", 512, mark(0.62)),  # mark stays inside the 80% maskable safe zone
    ("favicon-32.png", 32, FAVICON_SVG),
]

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "logo.svg"), "w") as f: f.write(LOGO_SVG)
with open(os.path.join(OUT, "favicon.svg"), "w") as f: f.write(FAVICON_SVG)

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, px, svg in JOBS:
        page = b.new_page(viewport={"width": px, "height": px})
        page.set_content(f'<html><body style="margin:0;background:transparent">{svg.replace("<svg ", f"<svg width=%d height=%d " % (px, px), 1)}</body></html>')
        page.screenshot(path=os.path.join(OUT, name), omit_background=True, clip={"x": 0, "y": 0, "width": px, "height": px})
        page.close()
        print("wrote", name, px)
    b.close()
