#!/usr/bin/env python3
"""Generate the pixel art sprite set for Consequences.

Each sprite is a 16x16 character grid. '.' is transparent; every other
character maps to a palette color. Rows shorter than 16 are padded with
transparency, so grids stay easy to edit by hand.

Outputs:
  1x/<name>.png     true-size sprites (for engines/editors)
  8x/<name>.png     128px versions (for previews/docs)
  contact-sheet.png labeled overview of the full set
"""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 16
SCALE = 8

# Shared palette — muted earth tones with gold/verdigris accents,
# matching the parchment-and-fern look of the design doc.
P = {
    'f': (232, 184, 138),  # skin
    'e': (42, 33, 26),     # eyes / dark detail
    'h': (106, 74, 52),    # brown hair
    't': (59, 90, 122),    # steel-blue tunic
    'b': (74, 58, 40),     # belt / leather
    'l': (85, 82, 74),     # trousers grey
    'o': (58, 42, 26),     # boots
    'g': (212, 175, 85),   # gold
    'F': (212, 175, 85),   # banner flag (gold)
    'p': (232, 214, 160),  # pale glow
    'w': (238, 232, 214),  # white / beard / cream
    'W': (238, 232, 214),  # white trim
    'a': (100, 108, 130),  # wizard hat slate-blue
    'r': (122, 118, 110),  # grey robe
    's': (120, 96, 70),    # wooden staff
    'O': (150, 200, 190),  # staff orb
    'G': (106, 138, 74),   # orc green skin
    'k': (168, 168, 168),  # grey hair
    'T': (238, 232, 214),  # tusks
    'm': (150, 82, 52),    # rust shawl
    'c': (212, 175, 85),   # crown gold
    'R': (146, 46, 46),    # royal red
    'v': (90, 140, 70),    # halfling vest green
    'S': (226, 220, 200),  # skull bone
    'n': (120, 110, 96),   # skull nose shadow
    'D': (74, 122, 106),   # dragon verdigris
    'B': (198, 206, 178),  # dragon belly
    'V': (54, 90, 80),     # dragon wing (dark)
    'H': (226, 220, 200),  # horn bone
    'A': (222, 158, 60),   # amber eye
    'U': (240, 240, 235),  # unicorn white
    'M': (176, 180, 200),  # unicorn mane silver
    'L': (90, 140, 70),    # leaf green
    'd': (94, 72, 50),     # soil
    'C': (110, 96, 80),    # claws
    'i': (146, 46, 46),    # blade grip red-brown
    'x': (200, 208, 216),  # steel blade
}

SPRITES = {
    # The player character — plain, earnest, unremarkable on purpose.
    'hero': [
        "......hhhh",
        ".....hhhhhh",
        "....hhhhhhhh",
        "....hffffffh",
        "....hfeffefh",
        "....hffffffh",
        ".....ffffff",
        "......ffff",
        "....tttttttt",
        "...tttttttttt",
        "...fttttttttf",
        "...f.tttttt.f",
        "....bbbbbbbb",
        "....lll..lll",
        "....lll..lll",
        "...ooo....ooo",
    ],
    # The royal herald with the prophecy banner.
    'herald': [
        "pFFFF",
        "pFFFF",
        "pFF",
        "p....hhhh",
        "p...hhhhhh",
        "p...hffffh",
        "p...hfeefh",
        "p....ffff",
        "p...gggggg",
        "p..gggggggg",
        "p..fggggggf",
        "p...gggggg",
        "p...gbbbbg",
        "p...ll..ll",
        "p...ll..ll",
        "p..ooo..ooo",
    ],
    # Aldric the mentor — hat, white beard, staff with orb.
    'aldric': [
        ".......aa",
        "......aaaa",
        ".....aaaaaa...O",
        "....aaaaaaaa..s",
        "...aaaaaaaaaa.s",
        "....ffffff....s",
        "....feffef....s",
        "....wwwwww....s",
        "...wwwwwwww...s",
        "...rwwwwwwr...s",
        "..rrrwwwwrrr..s",
        "..rrrrwwrrrr..s",
        "..rrrrrrrrrr..s",
        "..rrrrrrrrrr..s",
        "..rrrrrrrrrr..s",
        "..rrrrrrrrrr..s",
    ],
    # The Blade of Dawning — beautiful, glowing, and a trap.
    'blade-of-dawning': [
        ".......xx",
        ".......xx",
        "....p..xx",
        ".......xx..p",
        ".......xx",
        "..p....xx",
        ".......xx....p",
        ".......xx",
        ".......xx",
        ".......xx",
        "....gggggggg",
        ".......ii",
        ".......ii",
        ".......ii",
        "......gggg",
        "......gggg",
    ],
    # Grukha, the orc elder — grey topknot, tusks, rust shawl.
    'grukha': [
        ".......kk",
        "......kkkk",
        ".....GGGGGG",
        "....GGGGGGGG",
        "....GAGGGGAG",
        "....GGGGGGGG",
        "....GTGeeGTG",
        ".....GGGGGG",
        "....mmmmmmmm",
        "...mmmmmmmmmm",
        "...GmmmmmmmmG",
        "...G.mmmmmm.G",
        "....mmmmmmmm",
        "....lll..lll",
        "....lll..lll",
        "...ooo....ooo",
    ],
    # King Aldren — crown, grey beard, red robe with ermine trim.
    'king-aldren': [
        "....c.c..c.c",
        "....cccccccc",
        "....ffffffff",
        "....feffffef",
        "....ffffffff",
        ".....wwwwww",
        "...RRRRRRRRRR",
        "..RRRRWWWWRRRR",
        "..RRRRWWWWRRRR",
        "..fRRRWWWWRRRf",
        "...RRRWWWWRRR",
        "...RRRWWWWRRR",
        "...RRRRRRRRRR",
        "...RRRRRRRRRR",
        "...RRRRRRRRRR",
        "..RRRRRRRRRRRR",
    ],
    # A halfling of Willowmere — small, curly-haired, barefoot.
    'halfling': [
        "",
        "",
        "",
        "",
        "......hhhh",
        ".....hhhhhh",
        ".....hffffh",
        ".....feffef",
        "......ffff",
        ".....vwwwwv",
        "....vwwwwwwv",
        "...fvwwwwwwvf",
        "....vvvvvvvv",
        ".....ll..ll",
        ".....ll..ll",
        "....fff..fff",
    ],
    # The dragon warden — one raised wing, pale belly, amber eye.
    'dragon': [
        "..H.......VV",
        "..HH.....VVVV",
        "...H....VVVVV",
        ".DDDD...VVVVVV",
        "DDADDD..VVVVVV",
        "DDDDDDD..VVVVV",
        ".TDDDDDD.VVVV",
        "...DDDDDDDDDD",
        "..DBBBDDDDDDDD",
        "..DBBBBDDDDDDDD",
        "..DBBBBDDDDDDDDD",
        "...BBBDDDDDDD",
        "...DDDDDDDDD",
        "...DDD...DDD",
        "...CCC...CCC",
        "",
    ],
    # The last unicorn — full body, silver mane and tail, gold horn.
    'unicorn': [
        "..............g",
        ".............g",
        "...........MUU",
        "..........UUUUU",
        "..........UeUU",
        ".........MUUUU",
        "........MUUUU",
        ".......MUUUU",
        "..UUUUUUUUUU",
        ".UUUUUUUUUUUU",
        "MUUUUUUUUUUUU",
        "MMUUUUUUUUUUU",
        ".M.UU....UU.UU",
        "...UU....UU.UU",
        "...UU....UU.UU",
        "...ee....ee.ee",
    ],
    # Hedda of Greymarch — headscarf, apron, and a soup ladle.
    'hedda': [
        "......mmmm",
        ".....mmmmmm",
        "....mmmmmmmm",
        "....mffffffm",
        "....mfeffefm",
        "....mffffffm",
        ".....ffffff",
        "....tttttttt",
        "...ttwwwwtt.s",
        "...fttwwwwttfs",
        "...f.twwwwt.fs",
        "....ttwwwwtt.x",
        "....tttttttt",
        "....tttttttt",
        "...tttttttttt",
        "....oo....oo",
    ],
    # Hidden-score icon: corruption.
    'icon-corruption': [
        "",
        "",
        "....SSSSSSSS",
        "..SSSSSSSSSSSS",
        "..SSSSSSSSSSSS",
        ".SSSSSSSSSSSSSS",
        ".SSeeeSSSSeeeSS",
        ".SSeeeSSSSeeeSS",
        ".SSSSSSnnSSSSSS",
        "..SSSSSSSSSSSS",
        "..SSSSSSSSSSSS",
        "...SSSSSSSSSS",
        "...S.SS.SS.S",
        "...SSSSSSSSSS",
        "",
        "",
    ],
    # Hidden-score icon: virtue — a living sprig.
    'icon-virtue': [
        "",
        "",
        ".......L",
        "..LLL..L..LLL",
        ".LLLLL.L.LLLLL",
        "..LLL..L..LLL",
        ".......L",
        ".......L",
        "......LL",
        "......L",
        "......L",
        "",
        "....dddddddd",
        "...dddddddddd",
        "",
        "",
    ],
}


def render(name, grid):
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    px = img.load()
    assert len(grid) <= SIZE, f"{name}: too many rows ({len(grid)})"
    for y, row in enumerate(grid):
        assert len(row) <= SIZE, f"{name} row {y}: too wide ({len(row)}): {row!r}"
        for x, ch in enumerate(row):
            if ch != '.' and ch != ' ':
                assert ch in P, f"{name} row {y}: unknown color {ch!r}"
                px[x, y] = P[ch] + (255,)
    return img


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    for sub in ('1x', '8x'):
        os.makedirs(os.path.join(base, sub), exist_ok=True)

    sprites = {}
    for name, grid in SPRITES.items():
        img = render(name, grid)
        img.save(os.path.join(base, '1x', f'{name}.png'))
        big = img.resize((SIZE * SCALE, SIZE * SCALE), Image.NEAREST)
        big.save(os.path.join(base, '8x', f'{name}.png'))
        sprites[name] = big

    # Contact sheet: 4 columns, labeled cells on a dark ground.
    cols = 4
    rows = (len(sprites) + cols - 1) // cols
    cell_w, cell_h = 170, 190
    pad = 20
    sheet = Image.new('RGB', (cols * cell_w + pad * 2, rows * cell_h + pad * 2), (30, 26, 23))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    for i, (name, big) in enumerate(sprites.items()):
        cx = pad + (i % cols) * cell_w
        cy = pad + (i // cols) * cell_h
        sheet.paste(big, (cx + (cell_w - SIZE * SCALE) // 2, cy + 14), big)
        label = name.replace('-', ' ')
        tw = draw.textlength(label, font=font)
        draw.text((cx + (cell_w - tw) / 2, cy + 14 + SIZE * SCALE + 14),
                  label, fill=(200, 190, 170), font=font)
    sheet.save(os.path.join(base, 'contact-sheet.png'))
    print(f"Generated {len(sprites)} sprites + contact sheet")


if __name__ == '__main__':
    main()
