#!/usr/bin/env python3
"""Generate the Lifelog raster favicons from the header TimelineGlyph.

The glyph (horizontal timeline, two ticks, centre ring) mirrors
src/components/site-chrome.tsx's TimelineGlyph, redrawn at icon weight so it
stays legible at 16 px. Colours come from design-tokens.json (light theme):
paper #F6F3EC background, ink #161513 strokes, archive pine #1D4E46 ring.

Outputs (the SVG master is src/app/icon.svg, maintained by hand to match):
  src/app/favicon.ico      16/32/48 multi-size
  src/app/apple-icon.png   180x180
  public/icon-32.png       32x32
  public/icon-16.png       16x16

Run: python3 scripts/generate-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

WEB = Path(__file__).resolve().parent.parent
S = 16  # supersample factor: draw at 1024, downscale with LANCZOS
PAPER = (246, 243, 236)      # #F6F3EC
INK = (22, 21, 19)           # #161513
PINE = (29, 78, 70)          # #1D4E46
W = 72                       # stroke width at 1024 scale (4.5 at 64 scale)
RING_W = 58                  # ring stroke (3.6 at 64 scale) — thinner so the hole stays open


def master() -> Image.Image:
    img = Image.new("RGB", (64 * S, 64 * S), PAPER)
    d = ImageDraw.Draw(img)

    def line(x1, y1, x2, y2, color):
        d.line([x1 * S, y1 * S, x2 * S, y2 * S], fill=color, width=W)

    line(7, 32, 57, 32, INK)          # timeline
    line(15, 26, 15, 38, INK)         # left tick
    line(49, 26, 49, 38, INK)         # right tick
    d.ellipse([24 * S, 24 * S, 40 * S, 40 * S], outline=PINE, width=RING_W)  # ring
    return img


def save_png(img: Image.Image, path: Path, size: int) -> None:
    img.resize((size, size), Image.LANCZOS).save(path)
    print("wrote", path.relative_to(WEB), size)


def main() -> None:
    img = master()
    save_png(img, WEB / "src/app/apple-icon.png", 180)
    save_png(img, WEB / "public/icon-32.png", 32)
    save_png(img, WEB / "public/icon-16.png", 16)
    ico = WEB / "src/app/favicon.ico"
    img.save(ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote", ico.relative_to(WEB), "16/32/48")


if __name__ == "__main__":
    main()
