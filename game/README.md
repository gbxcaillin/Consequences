# Consequences — playable build

A story-driven phone game of inverted morality: the heroic-feeling path
quietly corrupts you; the questioning path quietly saves the world.

**Play it live: <https://gbxcaillin.github.io/Consequences/>**

Deploys automatically via GitHub Actions
(`.github/workflows/deploy-pages.yml`) on every push that touches
`game/`. It's installable as a home-screen app (PWA) and works offline
after the first visit.

## Run it locally

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
| `js/engine.js` | The content-agnostic engine: title → narrative → choice → consequence → ending, plus the Chronicle screen. |
| `js/storage.js` | Persistence: versioned save blob, run history, save-code export/import, v1 migration. |
| `css/style.css` | Night-toned UI matching the design doc. |
| `assets/scenes/` | 72×128 pixel backdrops, one per location (from `../game-design/pixel-art/scenes-1x/`). |
| `assets/sprites/` | 16×16 character sprites (from `../game-design/pixel-art/1x/`). |

## Design-mode

Set `DESIGN_MODE = true` at the top of `js/engine.js` to surface the
hidden Corruption/Virtue score changes after each choice. Ship builds keep
it `false` — the player must never see the real scoring.

## Saving

Four layers, no backend:

1. **Auto-save** — the current run is written to localStorage on every
   state change and offered as "Continue" on the title screen.
2. **Chronicle** — completed runs are recorded permanently (ending
   reached, choices made, hidden scores). The Chronicle screen shows
   which of the three endings you've discovered.
3. **Save codes** — the whole save exports as a copyable code
   (`CSQ1.` + base64 JSON) from the Chronicle screen; paste it on
   another device to restore. No accounts, no server.
4. **The app itself** — the service worker caches the full game, so once
   visited it plays offline and installs to the home screen.

The blob is versioned (`consequences-v2`); `js/storage.js` migrates the
old v1 key automatically, falls back to in-memory storage in private
browsing, and requests `navigator.storage.persist()` so browsers don't
evict the save under storage pressure. localStorage over IndexedDB is
deliberate: the save is ~2KB of JSON, far below any quota, and
synchronous access keeps the engine simple.

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
