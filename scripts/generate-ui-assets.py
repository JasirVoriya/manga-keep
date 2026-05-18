"""Generate original chibi-style PNG assets for the mobile UI."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "mobile" / "assets" / "ui"


def ellipse(draw: ImageDraw.ImageDraw, box, fill, outline=None, width=1):
    draw.ellipse(box, fill=fill, outline=outline, width=width)


def rounded(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def star_points(cx: float, cy: float, outer: float, inner: float, count: int = 5):
    points = []
    for idx in range(count * 2):
        radius = outer if idx % 2 == 0 else inner
        angle = -math.pi / 2 + idx * math.pi / count
        points.append((cx + math.cos(angle) * radius, cy + math.sin(angle) * radius))
    return points


def save_trimmed(image: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def draw_collector_mascot(path: Path):
    scale = 3
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Sticker backing.
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    ellipse(sd, (160, 146, 872, 900), (92, 47, 22, 42))
    shadow = shadow.filter(ImageFilter.GaussianBlur(22))
    canvas.alpha_composite(shadow)
    ellipse(draw, (152, 128, 862, 876), (255, 246, 225, 242), (216, 155, 114, 210), 10)

    # Hair silhouette.
    ellipse(draw, (248, 118, 784, 604), (99, 49, 31, 255))
    draw.pieslice((186, 184, 518, 620), 98, 282, fill=(112, 55, 34, 255))
    draw.pieslice((486, 154, 858, 638), -96, 96, fill=(112, 55, 34, 255))
    for x, y, r in [(360, 152, 92), (486, 116, 116), (610, 156, 96), (710, 230, 72)]:
        ellipse(draw, (x - r, y - r, x + r, y + r), (126, 65, 38, 255))

    # Face.
    ellipse(draw, (292, 228, 736, 650), (255, 220, 185, 255), (92, 47, 22, 190), 5)
    draw.pieslice((226, 156, 780, 498), 180, 360, fill=(120, 58, 34, 255))
    draw.polygon([(262, 270), (424, 218), (336, 384)], fill=(132, 68, 38, 255))
    draw.polygon([(452, 198), (690, 240), (560, 372)], fill=(132, 68, 38, 255))

    # Eyes and glasses.
    ellipse(draw, (360, 392, 448, 500), (58, 45, 42, 255))
    ellipse(draw, (584, 392, 672, 500), (58, 45, 42, 255))
    ellipse(draw, (388, 414, 420, 446), (255, 255, 255, 245))
    ellipse(draw, (612, 414, 644, 446), (255, 255, 255, 245))
    ellipse(draw, (330, 360, 478, 510), (255, 255, 255, 42), (159, 18, 57, 255), 8)
    ellipse(draw, (554, 360, 702, 510), (255, 255, 255, 42), (159, 18, 57, 255), 8)
    draw.line((478, 436, 554, 436), fill=(159, 18, 57, 255), width=7)

    # Cheeks and mouth.
    ellipse(draw, (294, 492, 374, 546), (249, 168, 168, 130))
    ellipse(draw, (656, 492, 736, 546), (249, 168, 168, 130))
    draw.arc((468, 494, 568, 566), 10, 170, fill=(159, 18, 57, 255), width=7)

    # Body.
    rounded(draw, (342, 632, 686, 876), 72, (231, 72, 94, 255), (92, 47, 22, 180), 5)
    rounded(draw, (384, 622, 644, 820), 52, (255, 250, 240, 255), None)
    draw.polygon([(428, 662), (514, 752), (596, 662), (560, 842), (468, 842)], fill=(249, 115, 22, 255))
    rounded(draw, (312, 686, 430, 858), 48, (154, 52, 18, 255))
    rounded(draw, (598, 686, 716, 858), 48, (154, 52, 18, 255))
    ellipse(draw, (292, 820, 390, 910), (255, 220, 185, 255))
    ellipse(draw, (640, 820, 738, 910), (255, 220, 185, 255))

    # Comic book.
    rounded(draw, (520, 660, 786, 854), 28, (255, 247, 237, 255), (92, 47, 22, 180), 6)
    draw.line((650, 666, 650, 846), fill=(216, 155, 114, 180), width=5)
    rounded(draw, (548, 702, 628, 778), 12, (225, 29, 72, 255))
    draw.line((672, 704, 748, 704), fill=(124, 45, 18, 180), width=6)
    draw.line((672, 732, 744, 732), fill=(249, 115, 22, 180), width=6)
    draw.line((672, 760, 732, 760), fill=(124, 45, 18, 160), width=6)

    # Decorative stars.
    draw.polygon(star_points(214, 212, 42, 16), fill=(245, 158, 11, 255))
    draw.polygon(star_points(806, 324, 34, 13), fill=(249, 115, 22, 235))
    draw.polygon(star_points(242, 742, 28, 11), fill=(225, 29, 72, 220))

    save_trimmed(canvas.resize((512, 512), Image.Resampling.LANCZOS), path)


def draw_reader_chibi(path: Path):
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    rounded(sd, (180, 180, 858, 872), 160, (92, 47, 22, 36))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    canvas.alpha_composite(shadow)
    rounded(draw, (168, 154, 858, 850), 156, (255, 246, 225, 242), (216, 155, 114, 210), 10)

    # Hair and face.
    ellipse(draw, (304, 118, 752, 548), (224, 116, 130, 255))
    draw.pieslice((188, 260, 506, 738), 88, 270, fill=(224, 116, 130, 255))
    draw.pieslice((556, 240, 870, 748), -90, 92, fill=(224, 116, 130, 255))
    ellipse(draw, (334, 210, 718, 594), (255, 224, 196, 255), (92, 47, 22, 180), 5)
    for x in [392, 458, 524, 590, 654]:
        draw.line((x, 160, x - 38, 304), fill=(87, 52, 46, 210), width=8)

    ellipse(draw, (418, 382, 468, 448), (48, 38, 37, 255))
    ellipse(draw, (586, 382, 636, 448), (48, 38, 37, 255))
    ellipse(draw, (432, 392, 448, 410), (255, 255, 255, 245))
    ellipse(draw, (600, 392, 616, 410), (255, 255, 255, 245))
    ellipse(draw, (354, 462, 426, 512), (249, 168, 168, 130))
    ellipse(draw, (632, 462, 704, 512), (249, 168, 168, 130))
    draw.arc((486, 460, 568, 520), 20, 160, fill=(159, 18, 57, 255), width=7)

    # Body and legs.
    rounded(draw, (338, 596, 706, 850), 90, (249, 168, 168, 255), (92, 47, 22, 160), 5)
    rounded(draw, (318, 790, 504, 908), 56, (59, 29, 18, 255))
    rounded(draw, (530, 790, 734, 908), 56, (59, 29, 18, 255))

    # Open book.
    draw.polygon([(244, 586), (502, 530), (518, 760), (254, 824)], fill=(109, 170, 190, 255), outline=(59, 29, 18, 220))
    draw.polygon([(520, 530), (790, 586), (780, 826), (514, 760)], fill=(91, 151, 176, 255), outline=(59, 29, 18, 220))
    draw.line((512, 536, 514, 764), fill=(255, 250, 240, 230), width=8)
    for y in [620, 654, 688]:
        draw.line((292, y, 456, y - 34), fill=(255, 250, 240, 170), width=8)
        draw.line((574, y - 34, 732, y), fill=(255, 250, 240, 170), width=8)

    # Hands.
    ellipse(draw, (254, 704, 344, 796), (255, 224, 196, 255))
    ellipse(draw, (706, 704, 796, 796), (255, 224, 196, 255))

    draw.polygon(star_points(260, 284, 36, 14), fill=(245, 158, 11, 255))
    draw.polygon(star_points(786, 246, 32, 12), fill=(225, 29, 72, 225))

    save_trimmed(canvas.resize((512, 512), Image.Resampling.LANCZOS), path)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    draw_collector_mascot(OUT_DIR / "ai-chibi-collector.png")
    draw_reader_chibi(OUT_DIR / "ai-chibi-reader.png")
    print(f"Generated assets in {OUT_DIR}")


if __name__ == "__main__":
    main()
