# Consequences — playable scaffold

A story-driven phone game of inverted morality: the heroic-feeling path
quietly corrupts you; the questioning path quietly saves the world.

## Run it

The engine loads `data/game-data.json` over HTTP, so serve the folder
rather than opening `index.html` directly:

```sh
cd game
python3 -m http.server 8000
# open http://localhost:8000
```

It's laid out mobile-first (430px column); open devtools device mode or a
phone on the same network for the intended feel.

## Structure

| Path | Purpose |
| --- | --- |
| `data/game-data.json` | All narrative content: chapters, choices, hidden scoring, echoes, companion lines, endings. Copied from `../game-design/game-data.json` — edit there, then re-copy, so the design doc and the game never drift. |
| `js/engine.js` | The content-agnostic engine: title → narrative → choice → consequence → ending, save/restore via localStorage. |
| `css/style.css` | Night-toned UI matching the design doc. |
| `assets/scenes/` | 72×128 pixel backdrops, one per location (from `../game-design/pixel-art/scenes-1x/`). |
| `assets/sprites/` | 16×16 character sprites (from `../game-design/pixel-art/1x/`). |

## Design-mode

Set `DESIGN_MODE = true` at the top of `js/engine.js` to surface the
hidden Corruption/Virtue score changes after each choice. Ship builds keep
it `false` — the player must never see the real scoring.

## Content model

- **Choices** — each chapter has a `lightChoice` (feels heroic, adds hidden
  Corruption) and a `darkChoice` (feels questionable, adds hidden Virtue).
  Both add visible Heroism so every choice feels like progress.
- **Echoes** — conditional lines shown after a consequence when an earlier
  choice matches (`{chapter, choice}`) or a hidden stat crosses a threshold
  (`{stat, gte}`). This is the second-order branching: the story remembers.
- **Companion** — Wren the scribe reacts to every choice with one line;
  she's the quiet truth-teller of the run.
- **Endings** — picked by hidden score (Corruption ≥ 80 → The Dark Lord,
  Virtue ≥ 80 → The True Hero, else The Crossroads), each with
  `reflections` filtered by your specific choices.
