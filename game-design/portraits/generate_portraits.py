#!/usr/bin/env python3
"""Generate illustrated SVG dialogue portraits for Consequences.

Not pixel art: smooth vector busts (upper body, visual-novel framing)
built from a shared parametric template — skin gradients, layered hair,
rim light — so the whole cast reads as one illustration style.
Humans come from the template; Vhaleth and the unicorn are bespoke.

Output: ../../game/assets/portraits/<id>.svg (and a local copy).
"""
import os

W, H = 300, 360


def gradients(skin, hair, cloth):
    return f"""
  <defs>
    <radialGradient id="gSkin" cx="45%" cy="38%" r="75%">
      <stop offset="0%" stop-color="{skin[0]}"/>
      <stop offset="78%" stop-color="{skin[1]}"/>
      <stop offset="100%" stop-color="{skin[2]}"/>
    </radialGradient>
    <linearGradient id="gHair" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="{hair[0]}"/>
      <stop offset="100%" stop-color="{hair[1]}"/>
    </linearGradient>
    <linearGradient id="gCloth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{cloth[0]}"/>
      <stop offset="100%" stop-color="{cloth[1]}"/>
    </linearGradient>
    <linearGradient id="gRim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#ffe9b8" stop-opacity="0.35"/>
    </linearGradient>
  </defs>"""


def torso(collar):
    return f"""
  <path d="M 44 360 C 48 292 84 258 118 248 L 150 262 L 182 248 C 216 258 252 292 256 360 Z" fill="url(#gCloth)"/>
  {collar}
  <path d="M 44 360 C 48 292 84 258 118 248 L 150 262 L 182 248 C 216 258 252 292 256 360 Z" fill="url(#gRim)"/>"""


def neck(shadow='#00000022'):
    return f"""
  <path d="M 128 196 L 128 252 C 128 262 172 262 172 252 L 172 196 Z" fill="url(#gSkin)"/>
  <path d="M 128 196 L 128 216 C 140 226 160 226 172 216 L 172 196 Z" fill="{shadow}"/>"""


def head(jaw=1.0):
    w = 62 * jaw
    return f"""
  <path d="M {150 - w} 148 C {150 - w} 96 {150 - w * 0.72} 66 150 66 C {150 + w * 0.72} 66 {150 + w} 96 {150 + w} 148 C {150 + w} 182 {150 + w * 0.62} 212 150 214 C {150 - w * 0.62} 212 {150 - w} 182 {150 - w} 148 Z" fill="url(#gSkin)"/>
  <ellipse cx="{150 - w - 2}" cy="150" rx="9" ry="14" fill="url(#gSkin)"/>
  <ellipse cx="{150 + w + 2}" cy="150" rx="9" ry="14" fill="url(#gSkin)"/>"""


def eyes(iris, tired=False, age=0):
    lid = '<path d="M 106 143 Q 121 136 136 143" stroke="#3a2c22" stroke-width="2.4" fill="none" stroke-linecap="round"/>' \
          '<path d="M 164 143 Q 179 136 194 143" stroke="#3a2c22" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    bags = ''
    if tired or age > 1:
        bags = '<path d="M 112 160 Q 121 164 132 161" stroke="#00000022" stroke-width="2" fill="none"/>' \
               '<path d="M 168 161 Q 179 164 188 160" stroke="#00000022" stroke-width="2" fill="none"/>'
    return f"""
  <g>
    <path d="M 108 148 Q 121 141 134 148 Q 121 157 108 148 Z" fill="#fdf8f0"/>
    <path d="M 166 148 Q 179 141 192 148 Q 179 157 166 148 Z" fill="#fdf8f0"/>
    <circle cx="121" cy="148" r="6.2" fill="{iris}"/>
    <circle cx="179" cy="148" r="6.2" fill="{iris}"/>
    <circle cx="121" cy="148" r="2.6" fill="#1c140e"/>
    <circle cx="179" cy="148" r="2.6" fill="#1c140e"/>
    <circle cx="123.5" cy="145.5" r="1.6" fill="#ffffff" opacity="0.9"/>
    <circle cx="181.5" cy="145.5" r="1.6" fill="#ffffff" opacity="0.9"/>
    {lid}{bags}
  </g>"""


def brows(color, angry=False, soft=False):
    if angry:
        l = 'M 105 132 Q 120 128 136 134'; r = 'M 164 134 Q 180 128 195 132'
    elif soft:
        l = 'M 106 131 Q 121 126 136 130'; r = 'M 164 130 Q 179 126 194 131'
    else:
        l = 'M 106 130 Q 121 125 136 130'; r = 'M 164 130 Q 179 125 194 130'
    return f'<path d="{l}" stroke="{color}" stroke-width="4.6" fill="none" stroke-linecap="round"/>' \
           f'<path d="{r}" stroke="{color}" stroke-width="4.6" fill="none" stroke-linecap="round"/>'


def nose_mouth(mouth='neutral', lip='#8a5a48'):
    mouths = {
        'neutral': 'M 138 196 Q 150 200 162 196',
        'smile':   'M 136 194 Q 150 203 164 194',
        'grim':    'M 138 198 Q 150 196 162 198',
        'open':    'M 140 194 Q 150 202 160 194 Q 150 198 140 194',
    }
    return f"""
  <path d="M 150 158 Q 146 172 143 178 Q 149 182 155 179" stroke="#00000026" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="{mouths[mouth]}" stroke="{lip}" stroke-width="3.4" fill="none" stroke-linecap="round"/>"""


def age_lines(level):
    if level == 0:
        return ''
    out = ['<path d="M 118 182 Q 114 190 116 197" stroke="#00000018" stroke-width="2" fill="none"/>',
           '<path d="M 182 182 Q 186 190 184 197" stroke="#00000018" stroke-width="2" fill="none"/>']
    if level > 1:
        out += ['<path d="M 112 118 Q 150 112 188 118" stroke="#00000015" stroke-width="2" fill="none"/>',
                '<path d="M 116 108 Q 150 102 184 108" stroke="#00000012" stroke-width="2" fill="none"/>']
    return ''.join(out)


def rim():
    return '<path d="M 196 92 C 212 112 216 150 208 186" stroke="#ffe9b8" stroke-width="5" fill="none" opacity="0.35" stroke-linecap="round"/>'


def wrap(body, skin, hair, cloth):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
            + gradients(skin, hair, cloth) + body + '</svg>')


SKIN_FAIR = ('#f5d9bd', '#e8bd98', '#d19a72')
SKIN_TAN = ('#eec49c', '#d8a276', '#b97f52')
SKIN_ORC = ('#b8cc8f', '#94ad68', '#6d8547')
SKIN_ORC2 = ('#a8bd82', '#84a05c', '#5f7a42')

PORTRAITS = {}

# ---------------------------------------------------------------- Wren
PORTRAITS['wren'] = wrap(f"""
  <path d="M 92 210 C 74 150 84 84 150 74 C 216 84 226 150 208 210 C 214 158 206 120 150 116 C 94 120 86 158 92 210 Z" fill="url(#gHair)"/>
  {torso('<path d="M 118 248 L 150 262 L 182 248 L 176 268 L 150 278 L 124 268 Z" fill="#8a8478"/>')}
  {neck()}
  {head(0.94)}
  {eyes('#5c4a33')}
  {brows('#3d2f22')}
  {nose_mouth('neutral')}
  <path d="M 88 148 C 84 96 104 70 150 68 C 196 70 216 96 212 148 C 210 112 192 92 150 92 C 108 92 90 112 88 148 Z" fill="url(#gHair)"/>
  <path d="M 96 100 Q 116 78 148 76" stroke="#6b5844" stroke-width="4" fill="none" opacity="0.6"/>
  <path d="M 210 150 C 216 178 212 206 200 224 L 192 216 C 202 198 206 176 202 152 Z" fill="url(#gHair)"/>
  <rect x="196" y="286" width="34" height="44" rx="4" fill="#b8a888" transform="rotate(-12 213 308)"/>
  <line x1="202" y1="296" x2="224" y2="292" stroke="#6b5844" stroke-width="2"/>
  <line x1="203" y1="304" x2="225" y2="300" stroke="#6b5844" stroke-width="2"/>
  <line x1="204" y1="312" x2="226" y2="308" stroke="#6b5844" stroke-width="2"/>
  {rim()}""", SKIN_FAIR, ('#4a3a2a', '#2e2318'), ('#5c564c', '#403c34'))

# ---------------------------------------------------------------- Tam
PORTRAITS['tam'] = wrap(f"""
  {torso('<path d="M 118 248 L 150 262 L 182 248 L 178 264 L 150 274 L 122 264 Z" fill="#7a5c3a"/>')}
  {neck()}
  {head(0.9)}
  {eyes('#6b4a2a')}
  {brows('#5a4028', soft=True)}
  {nose_mouth('smile')}
  <path d="M 90 138 C 86 88 108 62 150 60 C 192 62 214 88 210 138 C 200 104 188 96 178 100 C 186 88 176 82 164 88 C 168 78 152 74 142 84 C 140 74 122 78 122 90 C 108 86 100 96 108 106 C 96 106 90 120 90 138 Z" fill="url(#gHair)"/>
  <circle cx="150" cy="322" r="17" fill="#c9a35c"/>
  <path d="M 150 308 L 154 316 L 163 313 L 158 321 L 166 326 L 156 327 L 158 336 L 150 330 L 142 336 L 144 327 L 134 326 L 142 321 L 137 313 L 146 316 Z" fill="#e8cd8a"/>
  {rim()}""", SKIN_TAN, ('#8a5c30', '#5f3d1c'), ('#6d8557', '#4c5f3c'))

# ---------------------------------------------------------------- Hedda
PORTRAITS['hedda'] = wrap(f"""
  {torso('<path d="M 108 252 L 150 268 L 192 252 L 192 360 L 108 360 Z" fill="#e2d6bd"/><path d="M 118 248 L 150 262 L 182 248 L 178 262 L 150 272 L 122 262 Z" fill="#b3907a"/>')}
  {neck()}
  {head(1.0)}
  {eyes('#5a6a4a', tired=True, age=2)}
  {brows('#7a6a52')}
  {nose_mouth('grim')}
  {age_lines(2)}
  <path d="M 84 150 C 78 84 108 56 150 54 C 192 56 222 84 216 150 L 208 150 C 212 100 190 74 150 72 C 110 74 88 100 92 150 Z" fill="#a34d2e"/>
  <path d="M 86 152 C 80 90 110 58 150 56 C 190 58 220 90 214 152 C 218 170 214 186 206 196 L 200 188 C 206 176 208 162 206 148 C 208 104 186 76 150 74 C 114 76 92 104 94 148 C 92 162 94 176 100 188 L 94 196 C 86 186 82 170 86 152 Z" fill="#b85a38"/>
  {rim()}""", ('#eecdae', '#dcab86', '#bd8660'), ('#b85a38', '#8f4226'), ('#6d7a94', '#4c5870'))

# ---------------------------------------------------------------- Aldric
PORTRAITS['aldric'] = wrap(f"""
  {torso('<path d="M 118 248 L 150 262 L 182 248 L 180 266 L 150 276 L 120 266 Z" fill="#6b6a78"/>')}
  {neck()}
  {head(0.96)}
  {eyes('#7a8a9a', tired=True, age=2)}
  {brows('#c9c2b4')}
  {age_lines(2)}
  <path d="M 108 176 C 104 224 116 268 150 276 C 184 268 196 224 192 176 C 186 200 170 208 150 208 C 130 208 114 200 108 176 Z" fill="#d8d2c4"/>
  <path d="M 138 196 Q 150 200 162 196 Q 156 206 150 206 Q 144 206 138 196 Z" fill="#b8b2a4"/>
  <path d="M 150 158 Q 146 172 143 178 Q 149 182 155 179" stroke="#00000026" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M 84 130 L 150 40 L 216 130 C 208 116 196 108 150 106 C 104 108 92 116 84 130 Z" fill="url(#gHair)"/>
  <path d="M 84 130 C 100 118 200 118 216 130 L 212 140 C 196 128 104 128 88 140 Z" fill="#4c4858"/>
  <circle cx="150" cy="52" r="5" fill="#96c8be" opacity="0.9"/>
  {rim()}""", ('#eed6bd', '#dcb896', '#bd9370'), ('#5c5868', '#403c4c'), ('#7a7688', '#585466'))

# ---------------------------------------------------------------- Brakka
PORTRAITS['brakka'] = wrap(f"""
  {torso('<path d="M 118 248 L 150 262 L 182 248 L 178 266 L 150 276 L 122 266 Z" fill="#8a6844"/>')}
  {neck('#00000030')}
  {head(1.05)}
  {eyes('#c9973d')}
  {brows('#3d4a2a')}
  {nose_mouth('smile', lip='#5f7a42')}
  <path d="M 132 202 L 136 188 L 143 200 Z" fill="#efe8d8"/>
  <path d="M 168 202 L 164 188 L 157 200 Z" fill="#efe8d8"/>
  <path d="M 78 160 C 70 80 108 44 150 42 C 192 44 230 80 222 160 L 212 156 C 216 96 190 64 150 62 C 110 64 84 96 88 156 Z" fill="#7a5c3a"/>
  <path d="M 78 160 C 70 80 108 44 150 42 C 192 44 230 80 222 160 C 224 176 220 190 212 200 L 204 190 C 212 178 214 166 212 154 C 216 94 190 62 150 60 C 110 62 84 94 88 154 C 86 166 88 178 96 190 L 88 200 C 80 190 76 176 78 160 Z" fill="#8a6844"/>
  <circle cx="106" cy="166" r="4" fill="#c9a35c"/>
  {rim()}""", SKIN_ORC, ('#5a4a34', '#3d3222'), ('#5f5240', '#443a2c'))

# ---------------------------------------------------------------- Grukha
PORTRAITS['grukha'] = wrap(f"""
  {torso('<path d="M 108 252 L 150 266 L 192 252 L 196 360 L 104 360 Z" fill="#9a6844"/>')}
  {neck('#00000030')}
  {head(1.02)}
  {eyes('#b98a3d', age=2)}
  {brows('#c9c2b4')}
  {nose_mouth('grim', lip='#5f7a42')}
  {age_lines(2)}
  <path d="M 130 204 L 135 186 L 143 202 Z" fill="#efe8d8"/>
  <path d="M 170 204 L 165 186 L 157 202 Z" fill="#efe8d8"/>
  <path d="M 118 74 C 118 56 182 56 182 74 L 176 92 C 168 80 132 80 124 92 Z" fill="#c9c2b4"/>
  <rect x="140" y="44" width="20" height="26" rx="8" fill="#c9c2b4"/>
  <circle cx="98" cy="158" r="6" fill="#c9a35c"/>
  <circle cx="202" cy="158" r="6" fill="#c9a35c"/>
  <path d="M 88 120 Q 150 96 212 120 L 208 132 Q 150 110 92 132 Z" fill="#c9c2b4" opacity="0.85"/>
  {rim()}""", SKIN_ORC2, ('#c9c2b4', '#9a9488'), ('#8a5636', '#66412a'))

# ---------------------------------------------------------------- King Aldren
PORTRAITS['king-aldren'] = wrap(f"""
  {torso('<path d="M 108 250 L 150 264 L 192 250 L 198 268 L 150 284 L 102 268 Z" fill="#e8e2d4"/><circle cx="150" cy="292" r="8" fill="#d4af37"/>')}
  {neck()}
  {head(1.0)}
  {eyes('#4a5a7a', age=1)}
  {brows('#6a5a42', angry=True)}
  {age_lines(1)}
  <path d="M 106 176 C 104 214 118 244 150 250 C 182 244 196 214 194 176 C 186 198 170 206 150 206 C 130 206 114 198 106 176 Z" fill="#b0a894"/>
  <path d="M 138 196 Q 150 200 162 196 Q 156 204 150 204 Q 144 204 138 196 Z" fill="#948c78"/>
  <path d="M 150 158 Q 146 172 143 178 Q 149 182 155 179" stroke="#00000026" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M 90 132 C 88 96 112 72 150 70 C 188 72 212 96 210 132 L 202 130 C 202 102 182 84 150 82 C 118 84 98 102 98 130 Z" fill="#8a7a5c"/>
  <path d="M 92 108 L 100 74 L 118 96 L 134 62 L 150 92 L 166 62 L 182 96 L 200 74 L 208 108 C 190 96 110 96 92 108 Z" fill="#d4af37"/>
  <circle cx="150" cy="76" r="5" fill="#b83030"/>
  {rim()}""", ('#eed2b3', '#dcb28c', '#bd8d66'), ('#8a7a5c', '#665a40'), ('#8f2f2f', '#6b2222'))

# ---------------------------------------------------------------- Odile
PORTRAITS['odile'] = wrap(f"""
  {torso('<path d="M 118 248 L 150 262 L 182 248 L 180 264 L 150 274 L 120 264 Z" fill="#e8e2d4"/><path d="M 116 262 Q 150 296 184 262" stroke="#c9a35c" stroke-width="7" fill="none"/><circle cx="150" cy="296" r="9" fill="#c9a35c"/>')}
  {neck()}
  {head(0.97)}
  {eyes('#5a6a7a', age=2)}
  {brows('#b0a894')}
  {nose_mouth('neutral')}
  {age_lines(2)}
  <path d="M 92 150 C 88 92 112 66 150 64 C 188 66 212 92 208 150 L 200 148 C 202 104 182 82 150 80 C 118 82 98 104 100 148 Z" fill="#c2baa8"/>
  <ellipse cx="150" cy="58" rx="26" ry="16" fill="#c2baa8"/>
  <ellipse cx="150" cy="54" rx="14" ry="9" fill="#d4ccba"/>
  {rim()}""", ('#eecdb0', '#d8ab88', '#b98862'), ('#c2baa8', '#948c7a'), ('#3f6a74', '#2c4c54'))

# ---------------------------------------------------------------- Marigold
PORTRAITS['marigold'] = wrap(f"""
  {torso('<path d="M 108 252 L 150 268 L 192 252 L 194 360 L 106 360 Z" fill="#e8ddc4"/>')}
  {neck()}
  {head(1.08)}
  {eyes('#5f7a42', age=2)}
  {brows('#d8d2c4', soft=True)}
  {nose_mouth('smile')}
  {age_lines(2)}
  <circle cx="116" cy="186" r="10" fill="#e8a0a0" opacity="0.5"/>
  <circle cx="184" cy="186" r="10" fill="#e8a0a0" opacity="0.5"/>
  <path d="M 86 140 C 84 84 112 60 150 58 C 188 60 216 84 214 140 C 212 166 206 186 196 198 L 190 190 C 200 172 204 152 202 132 C 200 94 178 76 150 74 C 122 76 100 94 98 132 C 96 152 100 172 110 190 L 104 198 C 94 186 88 166 86 140 Z" fill="#d8d2c4"/>
  <circle cx="103" cy="130" r="7" fill="#e8b04c"/>
  <circle cx="103" cy="130" r="3" fill="#8a5a2a"/>
  {rim()}""", ('#f2d6ba', '#e2b894', '#c2946e'), ('#d8d2c4', '#aaa494'), ('#7a9a5c', '#587442'))

# ---------------------------------------------------------------- Priestess
PORTRAITS['priestess'] = wrap(f"""
  {torso('<path d="M 118 248 L 150 262 L 182 248 L 184 270 L 150 282 L 116 270 Z" fill="#f2ede0"/><path d="M 146 276 L 154 276 L 154 306 L 146 306 Z M 138 288 L 162 288 L 162 294 L 138 294 Z" fill="#c9a35c"/>')}
  {neck()}
  {head(0.92)}
  {eyes('#8a9ab0', tired=True)}
  {brows('#8a7a5c')}
  {nose_mouth('grim')}
  <path d="M 80 160 C 72 76 112 46 150 44 C 188 46 228 76 220 160 C 222 200 214 240 200 262 L 192 254 C 204 232 212 196 210 158 C 216 88 184 60 150 58 C 116 60 84 88 90 158 C 88 196 96 232 108 254 L 100 262 C 86 240 78 200 80 160 Z" fill="#f2ede0"/>
  <path d="M 90 148 C 86 92 114 68 150 66 C 186 68 214 92 210 148 L 202 144 C 204 100 182 80 150 78 C 118 80 96 100 98 144 Z" fill="#f2ede0"/>
  <path d="M 96 132 C 100 100 122 84 150 82 C 178 84 200 100 204 132 L 197 130 C 192 104 174 92 150 90 C 126 92 108 104 103 130 Z" fill="#e0d8c4"/>
  {rim()}""", ('#f2dcc4', '#e4c0a0', '#c69a76'), ('#e0d8c4', '#b8b0a0'), ('#d8d0be', '#b0a890'))

# ---------------------------------------------------------------- Herald
PORTRAITS['herald'] = wrap(f"""
  {torso('<path d="M 108 250 L 150 264 L 192 250 L 196 268 L 150 282 L 104 268 Z" fill="#c9a35c"/><path d="M 128 268 L 150 276 L 172 268 L 172 320 L 128 320 Z" fill="#b83030"/><path d="M 143 284 L 157 284 L 157 298 L 143 298 Z" fill="#e8cd8a"/>')}
  {neck()}
  {head(0.95)}
  {eyes('#6b5a3a')}
  {brows('#6a5230')}
  {nose_mouth('neutral')}
  <path d="M 92 136 C 90 90 114 68 150 66 C 186 68 210 90 208 136 C 206 118 196 104 178 98 C 186 110 180 118 168 114 C 172 102 158 96 148 102 C 146 92 128 96 130 108 C 118 104 110 112 116 122 C 102 122 94 128 92 136 Z" fill="url(#gHair)"/>
  {rim()}""", ('#eed2b3', '#ddb28e', '#bd8d68'), ('#a07840', '#78582c'), ('#8f8a7a', '#6b665a'))

# ---------------------------------------------------------------- Vhaleth (bespoke)
PORTRAITS['vhaleth'] = wrap(f"""
  <path d="M 60 360 C 62 300 76 250 108 220 C 140 192 190 180 232 196 L 226 226 C 190 214 152 222 128 244 C 100 270 88 312 88 360 Z" fill="url(#gCloth)"/>
  <path d="M 232 196 C 260 176 268 148 262 122 L 238 134 C 242 152 236 168 222 180 Z" fill="#3d5c50"/>
  <path d="M 226 128 C 200 96 160 88 128 104 C 96 120 84 152 96 180 C 108 206 140 216 172 208 C 186 205 200 198 210 188 L 236 178 C 244 162 240 142 226 128 Z" fill="url(#gHair)"/>
  <path d="M 96 180 C 84 152 96 120 128 104 L 122 96 L 96 122 L 104 128 C 88 148 84 168 96 180 Z" fill="#3d5c50"/>
  <path d="M 128 104 C 118 88 100 80 82 82 L 96 104 C 106 100 118 100 128 104 Z" fill="#e8e0cc"/>
  <path d="M 156 92 C 152 74 138 62 120 60 L 130 84 C 140 84 150 87 156 92 Z" fill="#e8e0cc"/>
  <path d="M 96 178 C 120 196 156 200 184 190 L 180 204 C 152 212 120 206 100 190 Z" fill="#5a8272"/>
  <ellipse cx="170" cy="150" rx="17" ry="13" fill="#f0c060"/>
  <path d="M 170 138 L 173 150 L 170 162 L 167 150 Z" fill="#1c140e"/>
  <circle cx="176" cy="144" r="2.4" fill="#ffffff" opacity="0.9"/>
  <path d="M 150 128 Q 170 122 188 130" stroke="#2c443a" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M 104 160 L 92 166 M 108 172 L 96 180 M 116 148 L 104 152" stroke="#3d5c50" stroke-width="3" stroke-linecap="round"/>
  <path d="M 60 360 C 62 316 70 280 86 252 L 106 262 C 92 288 86 322 86 360 Z" fill="#c2ccb0" opacity="0.5"/>
  <path d="M 226 226 C 240 212 250 194 254 176" stroke="#ffe9b8" stroke-width="5" fill="none" opacity="0.3" stroke-linecap="round"/>""",
  ('#5a8272', '#4a6e60', '#3d5c50'), ('#4a6e60', '#35524a'), ('#3d5c50', '#2c443a'))

# ---------------------------------------------------------------- Unicorn (bespoke)
PORTRAITS['unicorn'] = wrap(f"""
  <path d="M 76 360 C 78 302 96 258 132 234 C 164 214 204 210 236 224 L 230 254 C 200 242 166 246 142 264 C 112 286 96 322 96 360 Z" fill="url(#gCloth)"/>
  <path d="M 214 232 C 236 208 244 178 238 150 L 216 162 C 220 182 214 202 200 218 Z" fill="#b8bcd0"/>
  <path d="M 210 156 C 196 112 160 92 124 102 C 92 112 76 144 84 176 C 92 208 122 224 156 218 C 178 214 198 200 210 180 Z" fill="url(#gHair)"/>
  <path d="M 124 102 L 62 34 L 118 88 Z" fill="#e2c26a"/>
  <path d="M 124 102 L 62 34 L 100 96 Z" fill="#f0d88a"/>
  <path d="M 84 176 C 76 144 92 112 124 102 L 116 92 C 82 106 66 142 76 178 Z" fill="#b8bcd0"/>
  <path d="M 210 156 C 216 176 214 196 204 212 L 188 200 C 198 188 202 172 198 156 Z" fill="#d8dae8"/>
  <ellipse cx="158" cy="152" rx="12" ry="14" fill="#6a5aa0"/>
  <ellipse cx="158" cy="150" rx="5" ry="7" fill="#1c142e"/>
  <circle cx="161" cy="146" r="2.2" fill="#ffffff" opacity="0.95"/>
  <path d="M 196 196 C 204 200 210 206 212 214 L 198 212 C 196 206 194 200 190 198 Z" fill="#b8bcd0"/>
  <path d="M 138 116 C 120 96 112 74 116 52 L 134 72 C 130 88 132 104 140 114 Z" fill="#c9cce0"/>
  <path d="M 156 112 C 142 94 138 72 144 52 L 158 74 C 154 88 152 100 158 110 Z" fill="#d8dae8"/>
  <circle cx="118" cy="128" r="2" fill="#ffffff" opacity="0.8"/>
  <circle cx="98" cy="152" r="1.6" fill="#ffffff" opacity="0.7"/>
  <circle cx="128" cy="192" r="1.8" fill="#ffffff" opacity="0.75"/>
  <path d="M 230 254 C 240 240 246 222 248 204" stroke="#ffffff" stroke-width="5" fill="none" opacity="0.4" stroke-linecap="round"/>""",
  ('#f0f0f8', '#e0e2ee', '#c8cade'), ('#f0f0f8', '#d8dae8'), ('#e6e8f2', '#c8cade'))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    game_dir = os.path.normpath(os.path.join(here, '..', '..', 'game', 'assets', 'portraits'))
    os.makedirs(game_dir, exist_ok=True)
    os.makedirs(os.path.join(here, 'svg'), exist_ok=True)
    for name, svg in PORTRAITS.items():
        for d in (game_dir, os.path.join(here, 'svg')):
            with open(os.path.join(d, f'{name}.svg'), 'w') as f:
                f.write(svg)
    print(f'Generated {len(PORTRAITS)} portraits -> {game_dir}')


if __name__ == '__main__':
    main()
