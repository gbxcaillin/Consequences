#!/usr/bin/env python3
"""Generate pixel art scene backdrops for each location in Consequences.

Scenes are drawn procedurally at 72x128 (phone portrait) with layered
bands, silhouettes, and light dithering, then exported at 1x and 6x plus
a labeled contact sheet. Tune a scene by editing its function and
re-running.
"""
from PIL import Image, ImageDraw, ImageFont
import os
import random

W, H = 72, 128
SCALE = 6
rng = random.Random(7)


def new_img():
    return Image.new('RGB', (W, H), (0, 0, 0))


def rect(px, x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(H, y1 + 1)):
        for x in range(max(0, x0), min(W, x1 + 1)):
            px[x, y] = c


def vgrad(px, stops):
    """stops: list of (y, color); fills rows y0..last interpolating between stops."""
    for (y0, c0), (y1, c1) in zip(stops, stops[1:]):
        span = max(1, y1 - y0)
        for y in range(y0, min(H, y1)):
            t = (y - y0) / span
            c = tuple(round(a + (b - a) * t) for a, b in zip(c0, c1))
            for x in range(W):
                px[x, y] = c


def dither_row(px, y, c, step=2, offset=0):
    for x in range(offset % step, W, step):
        if 0 <= y < H:
            px[x, y] = c


def disc(px, cx, cy, r, c):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 <= x < W and 0 <= y < H and (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                px[x, y] = c


def cottage(px, x, base, w, body, roof, glow):
    h = w // 2 + 1
    rect(px, x, base - h, x + w - 1, base, body)
    rh = w // 2 + 1
    for i in range(rh):                              # gable roof, apex up
        y = base - h - 1 - i
        rect(px, x - 1 + i, y, x + w - i, y, roof)
    rect(px, x + w // 2 - 1, base - h // 2 - 1, x + w // 2, base - h // 2, glow)


def smoke(px, x, y, sky_blend, n=7):
    for i in range(n):
        sx = x + rng.choice((-1, 0, 0, 1))
        sy = y - i * 2
        if 0 <= sx < W and 0 <= sy < H:
            px[sx, sy] = sky_blend


def tree(px, x, base, trunk, canopy, size=5):
    rect(px, x, base - 2, x, base, trunk)
    disc(px, x, base - 2 - size // 2, size // 2 + 1, canopy)


# ---------------------------------------------------------------- scenes

def thornfield_village():
    """Prologue — dawn over a quiet village, sun rising, hearth smoke."""
    img = new_img()
    px = img.load()
    vgrad(px, [(0, (52, 40, 70)), (28, (120, 70, 88)), (52, (200, 126, 84)),
               (72, (240, 198, 136)), (80, (246, 216, 160))])
    disc(px, 36, 78, 9, (250, 234, 184))
    dither_row(px, 68, (246, 216, 160), 2)
    dither_row(px, 70, (250, 234, 184), 2, 1)
    # distant hills
    hill = (98, 66, 84)
    for x in range(W):
        h = 6 + round(3 * abs(((x * 7) % 24) - 12) / 12)
        rect(px, x, 80 - h + 4, x, 84, hill)
    # fields
    rect(px, 0, 84, W - 1, 108, (70, 82, 52))
    rect(px, 0, 108, W - 1, 127, (52, 62, 40))
    for y in range(88, 126, 4):
        dither_row(px, y, (60, 72, 46), 3, y)
    # path
    for y in range(96, H):
        wdt = 2 + (y - 96) // 5
        rect(px, 36 - wdt, y, 36 + wdt, y, (128, 110, 76))
    # cottages with lit windows and smoke
    for cx, base, wdt in ((6, 100, 13), (46, 96, 11), (58, 104, 13)):
        cottage(px, cx, base, wdt, (46, 38, 36), (30, 26, 28), (250, 200, 120))
        smoke(px, cx + wdt // 2, base - wdt - 2, (216, 178, 152))
    tree(px, 26, 94, (40, 34, 30), (48, 58, 38), 5)
    tree(px, 68, 92, (40, 34, 30), (48, 58, 38), 4)
    return img


def aldrics_tower():
    """Chapter 1 — a lone tower on the grey moors, one window glowing."""
    img = new_img()
    px = img.load()
    vgrad(px, [(0, (58, 66, 84)), (40, (86, 96, 112)), (80, (116, 124, 134)),
               (90, (128, 134, 140))])
    # birds
    for bx, by in ((14, 30), (22, 26)):
        px[bx, by] = px[bx + 2, by] = (40, 44, 54)
        px[bx + 1, by - 1] = (40, 44, 54)
    # rolling moors
    moor = (64, 62, 78)
    for x in range(W):
        h = 8 + round(5 * abs(((x * 5) % 36) - 18) / 18)
        rect(px, x, 90 - h + 6, x, 96, moor)
    rect(px, 0, 96, W - 1, 112, (52, 54, 60))
    rect(px, 0, 112, W - 1, 127, (42, 46, 50))
    for y in range(98, 126, 3):
        dither_row(px, y, (58, 60, 68), 3, y)
    # heather patches
    for _ in range(30):
        hx, hy = rng.randrange(W), rng.randrange(100, 126)
        px[hx, hy] = (96, 72, 104)
    # the tower
    tx = 42
    rect(px, tx, 38, tx + 11, 92, (58, 54, 62))
    rect(px, tx, 38, tx + 1, 92, (44, 42, 50))          # shaded edge
    for i in range(8):                                   # conical roof
        rect(px, tx - 1 + i, 38 - i * 2, tx + 12 - i, 39 - i * 2, (36, 34, 44))
    px[tx + 5, 21] = (150, 200, 190)                     # orb spark at the peak
    rect(px, tx + 4, 52, tx + 6, 56, (150, 220, 205))    # glowing window
    px[tx + 3, 54] = px[tx + 7, 54] = (96, 140, 132)     # glow spill
    rect(px, tx + 4, 74, tx + 6, 78, (30, 28, 36))       # dark window
    rect(px, tx + 4, 86, tx + 7, 92, (28, 26, 34))       # door
    # standing stones
    for sx, sy in ((10, 108), (16, 110), (60, 116)):
        rect(px, sx, sy - 4, sx + 1, sy, (74, 74, 82))
    return img


def greymarch():
    """Chapter 2 — wheat fields, a fence line, orc tents and a cook-fire."""
    img = new_img()
    px = img.load()
    vgrad(px, [(0, (150, 160, 156)), (34, (186, 186, 164)), (56, (214, 206, 174)),
               (62, (220, 210, 178))])
    # distant treeline
    for x in range(W):
        h = 3 + ((x * 3) % 5)
        rect(px, x, 62 - h, x, 62, (88, 98, 76))
    # tents on the far field edge
    for tx, tw in ((6, 15), (27, 12), (45, 15)):
        th = tw // 2 + 1
        for i in range(th):
            y = 62 - th + 1 + i
            inset = th - 1 - i
            rect(px, tx + inset, y, tx + tw - 1 - inset, y, (128, 80, 54))
        rect(px, tx + tw // 2 - 1, 59, tx + tw // 2, 62, (52, 36, 28))
        px[tx + tw // 2, 62 - th] = (74, 48, 34)     # pole tip
    # cook-fire and smoke
    rect(px, 63, 60, 64, 61, (240, 140, 50))
    px[63, 59] = (250, 190, 80)
    smoke(px, 63, 56, (170, 172, 160), 10)
    # wheat
    rect(px, 0, 63, W - 1, 100, (198, 164, 90))
    for y in range(64, 100, 3):
        dither_row(px, y, (174, 140, 72), 2, y)
    # fence
    rail_y = 101
    rect(px, 0, rail_y, W - 1, rail_y, (94, 68, 44))
    for fx in range(2, W, 9):
        rect(px, fx, rail_y - 4, fx + 1, rail_y + 3, (78, 56, 38))
    # foreground grass with furrows
    rect(px, 0, 104, W - 1, 127, (110, 118, 68))
    for y in range(107, 126, 4):
        dither_row(px, y, (92, 100, 58), 2, y)
    return img


def mount_ashenmere():
    """Chapter 3 — the warden's peak, a sealed gold vault, a circling shape."""
    img = new_img()
    px = img.load()
    vgrad(px, [(0, (108, 126, 148)), (40, (150, 164, 180)), (80, (192, 200, 208)),
               (90, (200, 208, 214))])
    # snow specks
    for _ in range(24):
        px[rng.randrange(W), rng.randrange(0, 60)] = (228, 234, 240)
    # circling dragon silhouette
    for dx, dy in ((48, 26), (49, 25), (50, 26), (51, 25), (52, 26)):
        px[dx, dy] = (34, 38, 48)
    # far ridge
    for x in range(W):
        h = 10 + round(8 * abs(((x * 6) % 40) - 20) / 20)
        rect(px, x, 90 - h, x, 90, (120, 130, 146))
    # the mountain
    apex_x, apex_y, base_y = 34, 18, 104
    for y in range(apex_y, base_y + 1):
        half = round((y - apex_y) * 0.62) + 1
        rect(px, apex_x - half, y, apex_x + half, y, (74, 80, 96))
        if y < 42:                                       # jagged snow cap
            cap = half if y < 34 else max(0, half - (y - 34) * 2)
            if cap:
                rect(px, apex_x - cap, y, apex_x + cap, y, (232, 236, 242))
    # vault door on the slope
    rect(px, 30, 82, 38, 94, (56, 60, 74))
    rect(px, 32, 84, 36, 94, (212, 175, 85))
    rect(px, 33, 86, 35, 87, (240, 220, 150))
    px[31, 88] = px[37, 88] = (150, 132, 84)             # glow spill
    # foreground ridge
    for x in range(W):
        h = 6 + round(4 * abs(((x * 9) % 30) - 15) / 15)
        rect(px, x, 128 - h - 14, x, 127, (44, 48, 60))
    return img


def high_court():
    """Chapter 4 — the throne room: banners, columns, a golden throne."""
    img = new_img()
    px = img.load()
    rect(px, 0, 0, W - 1, 95, (84, 72, 78))              # back wall
    for y in range(0, 95, 4):
        dither_row(px, y, (76, 66, 72), 4, y)
    # arched windows
    for wx in (14, 33, 52):
        rect(px, wx, 14, wx + 5, 34, (232, 210, 168))
        rect(px, wx + 1, 11, wx + 4, 13, (232, 210, 168))
        px[wx + 2, 10] = px[wx + 3, 10] = (232, 210, 168)
        rect(px, wx + 2, 14, wx + 3, 34, (214, 188, 146))
    # hanging banners
    for bx in (6, 25, 44, 63):
        rect(px, bx, 4, bx + 4, 30, (140, 44, 44))
        rect(px, bx + 1, 26, bx + 3, 30, (110, 34, 36))
        px[bx + 2, 12] = px[bx + 2, 16] = (212, 175, 85)
        px[bx + 1, 14] = px[bx + 3, 14] = (212, 175, 85)
    # columns
    for cx in (0, 66):
        rect(px, cx, 0, cx + 5, 108, (104, 92, 96))
        rect(px, cx + 1, 0, cx + 1, 108, (122, 110, 112))
        rect(px, cx - 1, 96, cx + 6, 100, (114, 102, 104))
    # floor
    rect(px, 6, 96, 65, 127, (60, 48, 54))
    for y in range(98, 127, 4):
        dither_row(px, y, (52, 42, 48), 3, y)
    # dais and carpet
    rect(px, 22, 88, 49, 95, (74, 62, 66))
    rect(px, 26, 92, 45, 95, (86, 72, 74))
    for y in range(96, H):
        wdt = 6 + (y - 96) // 3
        rect(px, 36 - wdt, y, 35 + wdt, y, (140, 44, 44))
        if y % 3 == 0:
            dither_row(px, y, (120, 38, 40), 4, y)
    # the throne
    rect(px, 31, 68, 40, 88, (212, 175, 85))
    rect(px, 33, 72, 38, 84, (160, 128, 58))
    px[31, 66] = px[40, 66] = (240, 220, 150)
    rect(px, 31, 66, 31, 68, (240, 220, 150))
    rect(px, 40, 66, 40, 68, (240, 220, 150))
    return img


def willowmere():
    """Chapter 5 — round doors in green hills, gardens, morning light."""
    img = new_img()
    px = img.load()
    vgrad(px, [(0, (148, 190, 188)), (36, (184, 214, 200)), (64, (212, 230, 208)),
               (72, (218, 234, 212))])
    # the hill homes
    disc(px, 18, 92, 26, (96, 142, 80))
    disc(px, 56, 96, 28, (108, 154, 88))
    rect(px, 0, 92, W - 1, 106, (100, 146, 84))
    # round doors with knobs
    disc(px, 18, 88, 6, (66, 96, 58))
    disc(px, 18, 88, 5, (198, 152, 62))
    px[21, 88] = (60, 44, 26)
    disc(px, 56, 92, 6, (70, 100, 60))
    disc(px, 56, 92, 5, (152, 92, 92))
    px[59, 92] = (60, 40, 40)
    # round windows
    disc(px, 7, 84, 2, (244, 232, 190))
    disc(px, 30, 82, 2, (244, 232, 190))
    disc(px, 45, 86, 2, (244, 232, 190))
    disc(px, 68, 88, 2, (244, 232, 190))
    # chimney smoke
    smoke(px, 12, 72, (206, 220, 204), 6)
    smoke(px, 62, 74, (206, 220, 204), 6)
    # gardens
    rect(px, 0, 106, W - 1, 127, (78, 118, 64))
    for y in range(108, 126, 3):
        dither_row(px, y, (68, 106, 56), 3, y)
    flower_colors = ((222, 122, 142), (232, 202, 92), (182, 162, 222), (242, 242, 242))
    for _ in range(34):
        px[rng.randrange(W), rng.randrange(107, 127)] = rng.choice(flower_colors)
    # winding path
    for y in range(106, H):
        cx = 36 + round(6 * ((y - 106) % 14) / 14 - 3)
        wdt = 2 + (y - 106) // 8
        rect(px, cx - wdt, y, cx + wdt, y, (188, 168, 128))
    # hedgerow
    for hx in range(0, W, 7):
        disc(px, hx, 106, 2, (56, 88, 48))
    return img


def moonlit_glade():
    """Chapter 6 — the last unicorn's clearing: moon, silver pool, fireflies."""
    img = new_img()
    px = img.load()
    vgrad(px, [(0, (24, 26, 56)), (44, (36, 42, 78)), (80, (48, 56, 94)),
               (90, (54, 62, 100))])
    for _ in range(26):
        px[rng.randrange(W), rng.randrange(0, 70)] = (200, 206, 228)
    # moon with glow ring
    disc(px, 52, 22, 9, (120, 130, 170))
    disc(px, 52, 22, 7, (236, 238, 244))
    px[49, 20] = px[54, 24] = (214, 218, 230)            # craters
    # silver-lit clearing
    rect(px, 0, 90, W - 1, 127, (58, 68, 100))
    for y in range(0, 20):
        half = 26 - y
        yy = 100 + y
        if yy < H and half > 0:
            rect(px, 36 - half, yy, 36 + half, yy, (88, 100, 138))
    for y in range(104, 122, 2):
        dither_row(px, y, (108, 120, 156), 3, y)
    # framing trees
    for tx, tb, s in ((4, 96, 9), (12, 100, 7), (64, 98, 9), (58, 104, 6)):
        rect(px, tx, tb - 14, tx + 1, tb, (18, 20, 38))
        disc(px, tx, tb - 16, s, (22, 26, 48))
    disc(px, 2, 60, 10, (22, 26, 48))
    disc(px, 70, 64, 11, (22, 26, 48))
    # fireflies
    for _ in range(9):
        px[rng.randrange(8, 64), rng.randrange(84, 118)] = (240, 226, 150)
    return img


SCENES = {
    'thornfield-village': ('Prologue — The Summons', thornfield_village),
    'aldrics-tower': ('Ch. 1 — The Mentor’s Gift', aldrics_tower),
    'greymarch': ('Ch. 2 — The Borderlands', greymarch),
    'mount-ashenmere': ('Ch. 3 — The Dragon’s Vigil', mount_ashenmere),
    'high-court': ('Ch. 4 — The Crown’s Command', high_court),
    'willowmere': ('Ch. 5 — The Halfling Accusation', willowmere),
    'moonlit-glade': ('Ch. 6 — The Unicorn’s Offering', moonlit_glade),
}


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    for sub in ('scenes-1x', 'scenes-6x'):
        os.makedirs(os.path.join(base, sub), exist_ok=True)

    rendered = {}
    for name, (chapter, fn) in SCENES.items():
        img = fn()
        img.save(os.path.join(base, 'scenes-1x', f'{name}.png'))
        big = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
        big.save(os.path.join(base, 'scenes-6x', f'{name}.png'))
        rendered[name] = (chapter, img.resize((W * 3, H * 3), Image.NEAREST))

    cols, cell_w, cell_h, pad = 4, 236, 440, 20
    rows = (len(rendered) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell_w + pad * 2, rows * cell_h + pad * 2), (30, 26, 23))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, (name, (chapter, img)) in enumerate(rendered.items()):
        cx = pad + (i % cols) * cell_w
        cy = pad + (i // cols) * cell_h
        sheet.paste(img, (cx + (cell_w - W * 3) // 2, cy + 8))
        for j, line in enumerate((name.replace('-', ' '), chapter.replace('—', '-').replace('’', "'"))):
            tw = draw.textlength(line, font=font)
            draw.text((cx + (cell_w - tw) / 2, cy + 8 + H * 3 + 10 + j * 13),
                      line, fill=(200, 190, 170), font=font)
    sheet.save(os.path.join(base, 'scenes-contact-sheet.png'))
    print(f"Generated {len(rendered)} scenes + contact sheet")


if __name__ == '__main__':
    main()
