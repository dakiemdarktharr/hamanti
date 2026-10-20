"""Create vector production assets from the Canva UI direction.

The h is the actual Syne ExtraBold glyph, outlined from the bundled font.
The star's unequal points are redrawn from the approved Canva exploration.
Run manually with Python + fontTools; production builds use the saved SVGs.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import re

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "ui"
OUT.mkdir(parents=True, exist_ok=True)
font = TTFont(ROOT / "node_modules/@fontsource-variable/syne/files/syne-latin-wght-normal.woff2")
font = instantiateVariableFont(font, {"wght": 800})
glyphs = font.getGlyphSet()
glyph = glyphs[font.getBestCmap()[ord("h")]]
bounds = BoundsPen(glyphs)
glyph.draw(bounds)
x0, y0, x1, y1 = bounds.bounds
pen = SVGPathPen(glyphs)
glyph.draw(pen)
scale = 46 / (y1 - y0)
star = "M29 1 27 22 41 19 32 27 38 31 27 31 30 43 20 32 8 38 14 29 1 20 19 23 16 15 23 21Z"
logo = f'<g fill="#222a20"><path transform="translate({8-x0*scale:.4f} 58) scale({scale:.6f} {-scale:.6f})" d="{pen.getCommands()}"/><path transform="translate(25 0) scale(.71)" d="{star}"/></g>'
def svg(body, viewbox="0 0 64 64"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">{body}</svg>\n'

(OUT / "logo.svg").write_text(svg(logo), encoding="utf8")
(OUT / "imperfect-star.svg").write_text(svg(f'<path fill="#222a20" d="{star}"/>', "0 0 44 44"), encoding="utf8")
(ROOT / "favicon.svg").write_text(svg('<path fill="#e9ebe2" d="M0 0h64v64H0z"/>' + logo), encoding="utf8")
arrow = '<path d="M3 12h18m-6-7 7 7-7 7" fill="none" stroke="#222a20" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"/>'
(OUT / "canva-arrow.svg").write_text(svg(arrow, "0 0 26 24"), encoding="utf8")
(OUT / "search.svg").write_text(svg('<g fill="none" stroke="#222a20" stroke-width="1.5"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></g>', "0 0 24 24"), encoding="utf8")
for state, background, ink in [
    ("default", "#f4f0e5", "#222a20"),
    ("hover", "#222a20", "#f4f0e5"),
    ("pressed", "#6c7e5a", "#f4f0e5"),
    ("focus", "#f4f0e5", "#222a20"),
]:
    focus = '<rect x="1" y="1" width="238" height="70" fill="none" stroke="#aa6951" stroke-width="2"/>' if state == "focus" else ""
    body = f'{focus}<rect x="5" y="5" width="230" height="62" fill="{background}" stroke="#222a20"/><text x="24" y="42" font-family="Manrope, sans-serif" font-size="15" fill="{ink}">Explore</text><g transform="translate(193 24)">{arrow.replace("#222a20", ink)}</g>'
    (OUT / f"button-{state}.svg").write_text(svg(body, "0 0 240 72"), encoding="utf8")

for filename in ["index.html", "sources.html"]:
    path = ROOT / filename
    html = path.read_text(encoding="utf8")
    html = re.sub(r'(<a class="wordmark"[^>]*>).*?(</a>)',
                  lambda m: m[1] + svg(logo).replace("<svg ", '<svg class="wordmark-mark" aria-hidden="true" ') + m[2],
                  html, count=1, flags=re.DOTALL)
    html = html.replace("./ui/canva-arrow.png", "./ui/canva-arrow.svg")
    path.write_text(html, encoding="utf8")
print("Saved outlined Syne logo, imperfect star, arrow, search, and four button SVGs.")
