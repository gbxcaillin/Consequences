# Consequences — Art Generation Brief

Reference for generating final artwork. Character portraits are done;
this brief covers the remaining assets, chiefly the ten scene backdrops.

## Global specs — scene backdrops

- Phone portrait 9:16 — generate at 1080x1920 or larger
- No characters, no text: dialogue portraits and story panels overlay the art
- Keep the upper third simple (sky / wall / canopy) — dialogue boxes sit there;
  put the important detail in the middle and lower frame
- The game applies a darkening gradient (light at top, strong at bottom) for
  text readability — avoid art so dark it crushes to black
- One consistent painterly storybook-fantasy style across all ten, matching
  the painted character portraits

## Scene backdrops (game/assets/scenes/)

### thornfield-village.png — Prologue + title screen
A quiet farming village at dawn. Sky in a vertical gradient from deep plum
through dusk-rose to amber, a pale gold sun just cresting the horizon. Low
mauve hills behind green fields. Three thatched cottages with warmly lit
windows and thin chimney smoke, a dirt path running up the center toward the
horizon, a wooden fence half-mended, a couple of round trees.
Mood: peaceful, hopeful — the last ordinary morning.

### aldrics-tower.png — Chapter 1
A lone wizard's tower on empty grey moors. Overcast slate-blue sky, rolling
hills of dark heather with small purple blooms, a pair of distant birds. The
tower: tall, dark weathered stone, conical roof, a single window glowing teal
partway up, a faint spark of light at the peak. Ancient standing stones
leaning in the foreground. Mood: lonely, windswept, secretive.

### wayrest-inn.png — Chapter 2
A crossroads coaching inn at night. Deep indigo starry sky. Timber-and-
plaster inn with a steep gabled roof, windows glowing warm amber, a hanging
painted sign, lantern light spilling from the fanlight over the door. A
three-armed wooden signpost at the crossroads. Scattered torchlight in the
yard suggesting a gathered crowd (silhouettes only, or none).
Mood: warm light against cold dark; tension under hospitality.

### greymarch.png — Chapter 3
Borderland farmland in hazy late-afternoon light. Washed-out pale sky, a
distant dark treeline. Golden wheat fields with visible furrow rows. At the
far field edge, three rust-brown hide tents with a thin line of cook-fire
smoke. A rough wooden fence with posts and a rail crossing the foreground.
Mood: uneasy stillness — a fear that hasn't decided what it is yet.

### mount-ashenmere.png — Chapter 4
A cold high mountain. Pale blue-grey alpine sky with drifting snow flecks; a
far ridge line. One massive central peak, dark slate rock with a jagged
snowcap, dominating the frame. On its lower slope, a small carved doorway
glowing gold — the sealed vault. A dark rocky ridge across the foreground.
Optionally a tiny winged silhouette circling high.
Mood: ancient, sacred, forbidding.

### high-court.png — Chapter 5
The royal throne room, interior. Warm grey stone walls, tall arched windows
pouring in honeyed light. Long crimson banners with small gold sigils hanging
floor-length. Massive flanking columns. At center, a golden throne on a
stepped dais, a deep red carpet running from the foreground up to it.
Mood: magnificent, staged, faintly oppressive — beeswax and cold gold.

### river-meridian.png — Chapter 6
A river border crossing at dusk. Sky from deep indigo down to burnt amber at
the horizon. A long stone bridge with arched spans, reflections in dark
water. A queue of covered wagons crossing, each with a small hanging lantern.
On the near bank, a crossing town of lamplit inns; a single small cook-fire
with a soup kettle near the water. Far on the opposite horizon, a faint dust
haze — an army a day away. Mood: bittersweet urgency; refuge in motion.

### vellbrook.png — Chapter 7
An occupied republic town square at dusk. Mauve-rose fading sky. Brick row
houses with steep roofs and a few lit windows. A central clocktower with a
pale painted clock face and a crimson banner with a gold emblem newly hung on
it. In the square: a lone iron brazier burning "for effect," cobblestones,
optionally rows of bowed silhouettes and a line of spears at the edges — or
empty, which is eerier. Mood: intact but conquered; a held breath.

### willowmere.png — Chapter 8
A halfling village on a fresh morning. Soft green-blue sky. Rounded green
hills with circular doors set into them — one warm yellow, one brick-red,
brass knobs — and small round windows glowing gently. Chimney smoke from
grassy rooftops. Foreground herb and flower gardens in pinks, yellows and
whites, a pale winding path, a low hedgerow, washing lines between chimneys.
Mood: cozy, generous, worth protecting.

### moonlit-glade.png — Chapter 9
A sacred forest clearing at night. Deep indigo sky dense with stars, one
large silver moon with a soft halo. Towering dark tree silhouettes framing
both sides and arching overhead. At center, a clearing of silver-lit grass —
a pool of moonlight brightest at the middle, as if awaiting something.
Drifting fireflies as warm gold specks.
Mood: absolute stillness, holy — the end of the story, waiting.

## Other assets

- **Portraits** (assets/portraits/*.webp) — complete; painted busts supplied.
- **Pixel sprites** (assets/sprites/*.png, 16x16) — chapter figures on
  scene-opening beats; optional once painted backgrounds land.
- **App icon** (assets/icons/) — currently the pixel hero. Suggested real
  piece: Tam's crooked wooden sun charm on dark parchment; must read at 48px.

## Journey map + traveler (chapter transition screen)

### map/journey-map.png — transition backdrop and MAP overlay
Phone portrait 9:16 (1080x1920+). Hand-painted journey map on aged
parchment: sepia base, muted golds/sage/slate, weathered vignette edges.
A single continuous pale-cream road winds bottom-left to top in S-curves
through ten small painted vignette landmarks, in journey order: thatched
village, wizard's tower on moors, crossroads inn, wheat fields with tents,
snow-capped mountain with tiny gold doorway, walled royal city, stone
bridge over a river, riverside clocktower town, round-doored halfling
hills, moonlit birch grove (top). Road never touches the edges; NO text or
labels (the game overlays lettering); top sixth kept quiet for the title
card; faded-ink compass rose and small parchment flourishes welcome.

### map/traveler-walk.png — hooded figure walk cycle
One horizontal strip, exactly 8 equal square cells: side-view walk cycle
facing right, same scale and baseline in every frame, transparent
background, no shadow, no motion blur. Small storybook figure: worn brown
hooded cloak (face hidden), travel pack with tiny gold wooden-sun charm,
walking staff, dusty boots. Bold simple shapes readable at 48-64px tall.
Frames: contact, down, passing, up, then the mirrored half-stride.
Fallback: a single mid-stride figure to the same spec (the engine can
bob-and-sway a static figure).

Engine plan once art arrives: trace the road into waypoints per chapter
segment; transition screen = map + figure walking the segment + chapter
title fade, tap to skip; MAP overlay reuses the same art with
reached/unreached markers.

### scenes/opening-sky.webp — opening crawl backdrop
Phone portrait 9:16 (1080x1920+). A deep night sky over the world of the
game: near-black indigo at the top graduating to a faint horizon glow at
the bottom, scattered small stars, and the Ashenmere light crossing the
sky as a soft diagonal streak of pale green, comet-like, the painting's
single focal event. At the very bottom edge only, low black silhouettes
of thatched rooftops, a fence line, and one thin line of chimney smoke:
Thornfield asleep under the omen. No text, no moon, no clouds heavier
than wisps; the upper three quarters stay dark and quiet because gold
scrolling text plays over it. Painterly storybook-fantasy style matching
the scene backdrops. Drop-in file: game/assets/scenes/opening-sky.webp
(the engine already looks for it; its built-in starfield is the fallback).
