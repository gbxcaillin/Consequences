/* Consequences — narrative engine.
 *
 * All content lives in data/game-data.json; this file only knows how to
 * play it: title → (narrative → choice → consequence)* → ending, plus the
 * Chronicle (endings gallery + save transfer). Persistence is GameStore
 * (js/storage.js). Set DESIGN_MODE to true to surface the hidden
 * Corruption/Virtue scoring while testing.
 */

const DESIGN_MODE = false;
const RUN_PHASES = ['narrative', 'choice', 'consequence'];

let DATA = null;
let state = null;
let eraseArmed = false;   // Chronicle "erase" needs a second tap
let importNote = null;    // feedback line for save-code import
let book = null;          // { run, page, back } while reading the Seer's account
let journal = null;       // { run, back } while reading Wren's journal

const app = document.getElementById('app');

function freshState() {
  return {
    chapterIndex: 0,
    phase: 'title',        // title | chronicle | narrative | choice | consequence | ending
    lastChoice: null,
    corruption: 0,
    virtue: 0,
    heroism: 0,
    choices: {},           // chapterId -> 'light' | 'dark'
    showMap: false,
    beat: 0,               // index into the current chapter's narrative beats
    dataVersion: DATA ? DATA.version : null,
  };
}

function persistState() {
  if (RUN_PHASES.includes(state.phase)) GameStore.setCurrent(state);
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function chapter() {
  return DATA.chapters[state.chapterIndex];
}

function chapterLabel(ch) {
  const i = DATA.chapters.indexOf(ch);
  return i === 0 ? 'Prologue' : 'Chapter ' + i;
}

function conditionMet(cond) {
  if (cond.always) return true;
  if (cond.chapter) return state.choices[cond.chapter] === cond.choice;
  if (cond.stat) return (state[cond.stat] || 0) >= cond.gte;
  return false;
}

const CAST_NAMES = {
  'wren': 'Wren', 'tam': 'Tam', 'hedda': 'Hedda', 'aldric': 'Aldric',
  'brakka': 'Brakka', 'grukha': 'Grukha', 'vhaleth': 'Vhaleth',
  'king-aldren': 'King Aldren', 'odile': 'Odile', 'marigold': 'Marigold',
  'priestess': 'The Priestess', 'herald': 'The Herald', 'unicorn': 'The Unicorn',
};

/* Visual-novel presentation: an illustrated bust beside the text whenever
 * a beat or aftermath page belongs to a character. */
function dialogueHTML(speaker, text) {
  const name = CAST_NAMES[speaker] || speaker;
  return `
    <div class="dialogue">
      <div class="d-panel">
        <span class="d-name">${esc(name)}</span>
        <p class="d-text">${esc(text)}</p>
      </div>
      <img class="d-portrait" src="assets/portraits/${speaker}.webp" alt="${esc(name)}">
    </div>`;
}

function proseOrDialogue(entry) {
  return entry.speaker
    ? dialogueHTML(entry.speaker, entry.text)
    : `<p>${esc(entry.text)}</p>`;
}

/* A chapter's narrative is one string or a list of beats; a beat may carry
 * an `if` so scenes bend around earlier choices and hidden stats. */
function chapterBeats(ch) {
  const raw = Array.isArray(ch.narrative) ? ch.narrative : [ch.narrative];
  return raw
    .map(b => (typeof b === 'string' ? { text: b } : b))
    .filter(b => !b.if || conditionMet(b.if));
}

function activeEchoes(ch, choiceType) {
  return (ch.echoes || []).filter(e => e.after === choiceType && conditionMet(e.if));
}

function pickEnding() {
  // A pole ending requires both the threshold and clear dominance —
  // a genuinely split run lands at the Crossroads even with big totals.
  const c = state.corruption, v = state.virtue;
  if (c >= 80 && c > v + 20) return DATA.endings.find(e => e.id === 'dark-lord');
  if (v >= 80 && v > c + 20) return DATA.endings.find(e => e.id === 'true-hero');
  return DATA.endings.find(e => e.id === 'crossroads');
}

function endingBody(ending) {
  const bodies = {
    'dark-lord': 'You stand in a throne room of blazing gold, armies kneeling at your feet. Every choice felt righteous in the moment. But look at what you’ve built: a kingdom of ashes ruled by a tyrant the prophecy designed. You are the great evil. You always were.',
    'true-hero': 'You stand in a forest clearing. No crown. No army. No legend. The prophecy crumbled the moment you refused to follow it. You didn’t save the world with a sword. You saved it by asking “why?”',
    'crossroads': 'You stand at a literal crossroads. Some of your choices were brave, others were blind. The world is neither saved nor ruined — just complicated, like you. In the distance, both paths shimmer. Neither is yours. Not yet.',
  };
  return bodies[ending.id];
}

/* ---------------------------------------------------------------- render */

function sceneStyle(ch) {
  const scene = ch ? ch.scene : DATA.chapters[0].scene;
  return `style="background-image:url('assets/scenes/${scene}.webp')"`;
}

/* Momentum: walk one road long enough and the other closes. Past `pull`
 * the opposing choice carries a warning; past `lock` — the point of no
 * return — the story takes your hands and the choice is gone. Deliberate
 * alternators keep both roads open, so the Crossroads stays a chosen
 * ending rather than a default. */
function momentumStage(side) {
  const m = DATA.momentum;
  if (!m) return 'free';
  const diff = state.corruption - state.virtue;
  // the dark (questioning) option is blocked by corruption momentum;
  // the light (heroic) option by virtue momentum
  const against = side === 'dark' ? diff : -diff;
  if (against >= m.lock) return 'locked';
  if (against >= m.pull) return 'pulled';
  return 'free';
}

function choiceButtonHTML(ch, side) {
  const choice = side === 'light' ? ch.lightChoice : ch.darkChoice;
  const stage = momentumStage(side);
  if (stage === 'free') {
    return `<button class="choice-${side}" data-act="choose" data-choice="${side}">${esc(choice.text)}</button>`;
  }
  const force = side === 'dark' ? 'corruption' : 'virtue';
  const note = (stage === 'locked' && choice.lockNote)
    ? choice.lockNote
    : DATA.momentum.notes[force][stage === 'locked' ? 'lock' : 'pull'];
  if (stage === 'locked') {
    return `<button class="choice-${side} locked" disabled>${esc(choice.text)}<span class="lock-note">${esc(note)}</span></button>`;
  }
  return `<button class="choice-${side} pulled" data-act="choose" data-choice="${side}">${esc(choice.text)}<span class="lock-note">${esc(note)}</span></button>`;
}

function hudHTML(ch) {
  const pct = Math.min(100, (state.heroism / DATA.scoring.visible.maxPossible) * 100);
  return `
    <div class="hud">
      <div>
        <div class="location">${esc(ch.location)}</div>
        <div class="chapter">${chapterLabel(ch)} — ${esc(ch.title)}</div>
      </div>
      <div class="hud-controls">
        <button class="icon-btn" data-act="map" aria-label="Journey map">MAP</button>
        <button class="icon-btn" data-act="journal-open" aria-label="Wren&rsquo;s journal">WREN</button>
        <button class="icon-btn" data-act="sound" aria-label="Toggle sound">${AudioFX.muted ? '&#215;&#9834;' : '&#9834;'}</button>
      </div>
    </div>
    <div class="heroism">
      <span class="hlabel">Heroism</span>
      <div class="track"><div class="fill" style="width:${pct}%"></div></div>
    </div>`;
}

function mapOverlayHTML() {
  const items = DATA.chapters.map((ch, i) => {
    const done = state.choices[ch.id] !== undefined;
    const current = i === state.chapterIndex;
    const cls = current ? 'current' : (done ? 'done' : 'locked');
    const title = (done || current) ? esc(ch.title) : '· · ·';
    const place = (done || current) ? esc(ch.location) : 'Unknown';
    return `
      <li class="${cls}">
        <span class="node"></span>
        <span class="map-title">${title}</span>
        <span class="map-place">${place}</span>
      </li>`;
  }).join('');
  return `
    <div class="map-overlay">
      <div class="map-head">Your Journey</div>
      <ul class="map-list">${items}</ul>
      <div class="actions"><button class="continue" data-act="map">Return</button></div>
    </div>`;
}

/* Chapters this run actually played — chronicle entries from older
 * versions of the story may not contain every current chapter. */
function playedChapters(run) {
  return DATA.chapters.filter(ch => run.choices[ch.id]);
}

function bookHTML() {
  const run = book.run;
  const played = playedChapters(run);
  const total = played.length + 2;   // cover + played chapters + verdict
  const page = book.page;
  let inner;
  if (page === 0) {
    inner = `
      <div class="book-cover">
        <div class="book-title">The Book of<br>Consequences</div>
        <div class="book-byline">as witnessed by ${esc(DATA.seer.name)}</div>
        <p class="book-body">${esc(DATA.seer.intro)}</p>
      </div>`;
  } else if (page <= played.length) {
    const ch = played[page - 1];
    const type = run.choices[ch.id];
    const choice = type === 'light' ? ch.lightChoice : ch.darkChoice;
    const isLight = type === 'light';
    inner = `
      <div class="book-chapter-head">
        <div class="book-chapter-label">${chapterLabel(ch)}</div>
        <div class="book-chapter-title">${esc(ch.title)}</div>
        <div class="book-chapter-place">${esc(ch.location)}</div>
      </div>
      <p class="book-body">${esc(choice.revealed || (Array.isArray(choice.consequence)
        ? choice.consequence.map(p => (typeof p === 'string' ? p : p.text)).join(' ')
        : choice.consequence))}</p>
      <div class="seer-truth">
        <span class="seer-label">The Seer sees:</span>
        ${esc(choice.seerTruth)}
      </div>
      <div class="ledger ${isLight ? 'corrupt' : 'virtue'}">
        The ledger: ${isLight ? 'Corruption +' + (choice.corruption || 0) : 'Virtue +' + (choice.virtue || 0)}
      </div>`;
  } else {
    const ending = DATA.endings.find(e => e.id === run.ending);
    inner = `
      <div class="book-chapter-head">
        <div class="book-chapter-label">The Seer&rsquo;s Verdict</div>
        <div class="book-chapter-title">${esc(ending.name)}</div>
      </div>
      <div class="book-tally">
        <span class="corrupt">Corruption ${run.corruption}</span>
        <span class="virtue">Virtue ${run.virtue}</span>
        <span>&ldquo;Heroism&rdquo; you were shown: ${run.heroism}</span>
      </div>
      <p class="book-body">${esc(DATA.seer.verdicts[run.ending])}</p>`;
  }
  return `
    <div class="book-page">
      <button class="book-close-x" data-act="book-close" aria-label="Close the book">&times;</button>
      ${inner}
      <div class="book-footer">
        <button class="book-nav" data-act="book-prev" ${page === 0 ? 'disabled' : ''}>&larr;</button>
        <span class="book-pageno">${page + 1} / ${total}</span>
        ${page < total - 1
          ? '<button class="book-nav" data-act="book-next">&rarr;</button>'
          : '<button class="book-nav" data-act="book-close">Close</button>'}
      </div>
    </div>`;
}

function journalHTML() {
  const run = journal.run;
  const entries = [];
  let n = 0;
  for (const ch of DATA.chapters) {
    const type = run.choices[ch.id];
    if (!type) continue;
    n += 1;
    const line = DATA.companion.lines[ch.id] && DATA.companion.lines[ch.id][type];
    if (!line) continue;
    entries.push(`
      <div class="journal-entry">
        <div class="je-head">Entry ${n} &mdash; ${esc(ch.location)}</div>
        <p class="je-text">${esc(line)}</p>
      </div>`);
  }
  if (run.ending && DATA.companion.closing && DATA.companion.closing[run.ending]) {
    entries.push(`
      <div class="journal-entry closing">
        <div class="je-head">Final entry</div>
        <p class="je-text">${esc(DATA.companion.closing[run.ending])}</p>
      </div>`);
  }
  const body = entries.length
    ? entries.join('')
    : `<p class="je-empty">${esc(DATA.companion.emptyNote)}</p>`;
  return `
    <div class="journal-page">
      <button class="book-close-x" data-act="journal-close" aria-label="Close the journal">&times;</button>
      <div class="journal-head">Wren&rsquo;s Journal</div>
      <div class="journal-flyleaf">${esc(DATA.companion.flyleaf)}</div>
      ${body}
      <div class="book-footer" style="border-top-color:rgba(221,213,198,0.15)">
        <span></span>
        <button class="book-nav journal-nav" data-act="journal-close">Close</button>
      </div>
    </div>`;
}

function howtoHTML() {
  const items = [
    ['Read, then choose', 'Each chapter ends in a single decision between two paths. Neither is labeled right or wrong. Choose what you believe — the story continues either way.'],
    ['Choices are permanent', 'There is no undo. The world remembers what you did, and so do the people in it. Later chapters echo earlier decisions. You may always page back and re-read a scene before you decide &mdash; but a decision, once made, stands.'],
    ['Your legend grows', 'The Heroism bar shows how the kingdom sees you. Whether the kingdom sees clearly is another matter.'],
    ['On the road', 'MAP shows your progress through the land. WREN opens your companion&rsquo;s journal — a scribe who writes down what you do, as you do it. The note icon silences the realm.'],
    ['The road remembers', 'Choices have momentum. Walk one path long enough and the other begins to close &mdash; and there is a point past which you cannot turn around.'],
    ['The ending is yours', 'There are three endings. Finish a journey to learn which one your choices earned, and to read the Seer&rsquo;s unvarnished account of what you actually did.'],
    ['Carry it with you', 'Progress saves automatically on this device. The Chronicle keeps every completed journey, and a save code carries it all to another device.'],
  ].map(([head, text]) => `
    <div class="ht-item">
      <div class="ht-head">${head}</div>
      <p class="ht-text">${text}</p>
    </div>`).join('');
  return `
    <div class="map-head">How to Play</div>
    ${items}
    <p class="ht-warning">One warning, traveler: how a choice feels and what a choice does are not always the same thing.</p>
    <div class="actions"><button class="continue" data-act="to-title">Return</button></div>`;
}

function chronicleHTML() {
  const discovered = GameStore.endingsDiscovered();
  const runs = GameStore.chronicle.length;
  const cards = DATA.endings.map(e => {
    const found = discovered.includes(e.id);
    const times = GameStore.timesReached(e.id);
    return `
      <div class="ending-card ${found ? 'found ' + e.id : ''}">
        <div class="ec-name">${found ? esc(e.name) : '???'}</div>
        <div class="ec-meta">${found ? (times === 1 ? 'reached once' : 'reached ' + times + ' times') : 'undiscovered'}</div>
      </div>`;
  }).join('');
  return `
    <div class="map-head">The Chronicle</div>
    <p class="chron-sub">${runs === 0 ? 'No journeys completed yet. Wren’s pages are waiting.'
      : runs + (runs === 1 ? ' journey' : ' journeys') + ' recorded &middot; ' + discovered.length + ' of ' + DATA.endings.length + ' endings discovered'}</p>
    <div class="ending-cards">${cards}</div>
    ${GameStore.chronicle.length ? `
    <div class="past-journeys">
      <div class="st-head">Past journeys</div>
      ${GameStore.chronicle.slice(-12).reverse().map((run) => {
        const idx = GameStore.chronicle.lastIndexOf(run);
        const ending = DATA.endings.find(e => e.id === run.ending);
        const when = new Date(run.finishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        return `
        <div class="journey-row">
          <div>
            <div class="jr-ending ${run.ending}">${ending ? esc(ending.name) : esc(run.ending)}</div>
            <div class="jr-date">${esc(when)}</div>
          </div>
          <div class="hud-controls">
            <button class="icon-btn" data-act="read-run" data-idx="${idx}">Seer</button>
            <button class="icon-btn" data-act="read-journal" data-idx="${idx}">Wren</button>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}
    <div class="save-transfer">
      <div class="st-head">Carry your save</div>
      <p class="st-note">Copy a save code to move your Chronicle to another device, or paste one below.</p>
      <div class="st-row">
        <button class="continue" data-act="export">Copy save code</button>
      </div>
      <textarea id="importBox" class="st-box" rows="2" placeholder="Paste a save code here&hellip;" aria-label="Save code"></textarea>
      <div class="st-row">
        <button class="continue" data-act="import">Load save code</button>
        <button class="continue danger" data-act="erase">${eraseArmed ? 'Tap again to erase everything' : 'Erase Chronicle'}</button>
      </div>
      ${importNote ? `<p class="st-feedback">${esc(importNote)}</p>` : ''}
    </div>
    <div class="actions"><button class="continue" data-act="to-title">Return</button></div>`;
}

function errorScreen() {
  return `
    <div class="scene-bg dim"></div>
    <div class="screen title-screen">
      <h1 style="font-size:26px">The thread of the story snapped</h1>
      <div class="sub">Something went wrong. Your Chronicle is safe.</div>
      <div class="actions">
        <button class="continue" data-act="recover">Return to the Title</button>
      </div>
    </div>`;
}

function themeForNow() {
  if (!DATA) return 'title';
  if (['title', 'chronicle', 'howto'].includes(state.phase)) return 'title';
  if (state.phase === 'ending') return pickEnding().id;
  if (state.phase === 'book' && book) {
    const played = playedChapters(book.run);
    const ch = played[Math.max(0, Math.min(book.page - 1, played.length - 1))];
    return ch ? ch.scene : 'title';
  }
  if (state.phase === 'journal') return 'title';
  const ch = chapter();
  return ch ? ch.scene : 'title';
}

function render() {
  try {
    renderInner();
    try { MusicEngine.play(themeForNow()); } catch (e) { /* music is optional */ }
  } catch (err) {
    try { console.error(err); } catch (e) { /* nothing */ }
    app.innerHTML = errorScreen();
  }
}

function renderInner() {
  const ch = chapter();
  if (state.phase === 'title') {
    const resumable = !!GameStore.current;
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(null)}></div>
      <div class="screen title-screen">
        <h1>Consequences</h1>
        <div class="sub">A fantasy of inverted morality</div>
        <div class="actions">
          ${resumable ? '<button class="continue" data-act="resume">Continue</button>' : ''}
          <button class="continue" data-act="begin">${resumable ? 'New Journey' : 'Begin'}</button>
          <button class="continue" data-act="howto">How to Play</button>
          <button class="continue" data-act="chronicle">Chronicle</button>
        </div>
      </div>`;
  } else if (state.phase === 'chronicle') {
    app.innerHTML = `
      <div class="scene-bg dim" ${sceneStyle(null)}></div>
      <div class="screen chronicle-screen">${chronicleHTML()}</div>`;
  } else if (state.phase === 'howto') {
    app.innerHTML = `
      <div class="scene-bg dim" ${sceneStyle(null)}></div>
      <div class="screen chronicle-screen">${howtoHTML()}</div>`;
  } else if (state.phase === 'book') {
    const played = playedChapters(book.run);
    const bookScene = played.length
      ? played[Math.max(0, Math.min(book.page - 1, played.length - 1))]
      : null;
    app.innerHTML = `
      <div class="scene-bg dim" ${sceneStyle(bookScene)}></div>
      <div class="screen book-screen">${bookHTML()}</div>`;
  } else if (state.phase === 'journal') {
    app.innerHTML = `
      <div class="scene-bg dim" ${sceneStyle(null)}></div>
      <div class="screen book-screen">${journalHTML()}</div>`;
  } else if (state.phase === 'narrative') {
    const beats = chapterBeats(ch);
    const i = Math.min(state.beat || 0, beats.length - 1);
    const dots = beats.length > 1
      ? `<div class="beat-dots">${beats.map((_, d) =>
          `<span class="beat-dot${d === i ? ' on' : ''}"></span>`).join('')}</div>`
      : '';
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(ch)}></div>
      <div class="screen">
        ${hudHTML(ch)}
        <div class="narrative">${proseOrDialogue(beats[i])}</div>
        ${dots}
        <div class="actions actions-row">
          ${i > 0 ? '<button class="continue btn-back" data-act="beat-back" aria-label="Back to the previous page">&larr;</button>' : ''}
          <button class="continue grow" data-act="choices">Continue</button>
        </div>
        ${state.showMap ? mapOverlayHTML() : ''}
      </div>`;
  } else if (state.phase === 'choice') {
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(ch)}></div>
      <div class="screen">
        ${hudHTML(ch)}
        <div class="narrative"></div>
        <button class="reread-link" data-act="reread">&larr; Re-read the scene</button>
        <div class="prompt">What do you do?</div>
        <div class="actions">
          ${choiceButtonHTML(ch, 'light')}
          ${choiceButtonHTML(ch, 'dark')}
        </div>
        ${state.showMap ? mapOverlayHTML() : ''}
      </div>`;
  } else if (state.phase === 'consequence') {
    const type = state.lastChoice;
    const choice = type === 'light' ? ch.lightChoice : ch.darkChoice;
    const pages = (Array.isArray(choice.consequence) ? choice.consequence : [choice.consequence])
      .map(p => (typeof p === 'string' ? { text: p } : p));
    const pi = Math.min(state.beat || 0, pages.length - 1);
    const lastPage = pi === pages.length - 1;
    const dots = pages.length > 1
      ? `<div class="beat-dots">${pages.map((_, d) =>
          `<span class="beat-dot${d === pi ? ' on' : ''}"></span>`).join('')}</div>`
      : '';
    const echoes = lastPage ? activeEchoes(ch, type)
      .map(e => `<div class="echo">${esc(e.text)}</div>`).join('') : '';
    const isPrologue = state.chapterIndex === 0;
    const wrenLine = DATA.companion.lines[ch.id] ? DATA.companion.lines[ch.id][type] : null;
    const wren = (lastPage && wrenLine) ? `
      <div class="wren">
        <img class="wren-portrait" src="assets/portraits/wren.webp" alt="Wren">
        <div>
          ${isPrologue ? `<p style="margin:0 0 10px;font-style:italic;color:var(--text-dim)">${esc(DATA.companion.intro)}</p>` : ''}
          <span class="who">${esc(DATA.companion.name)}</span>
          &ldquo;${esc(wrenLine)}&rdquo;
        </div>
      </div>` : '';
    const flash = (DESIGN_MODE && pi === 0)
      ? `<div class="flash ${type === 'light' ? 'corrupt' : 'virtue'}">${type === 'light' ? '☠ Corruption +' + (choice.corruption || 0) : '✧ Virtue +' + (choice.virtue || 0)}</div>`
      : '';
    const last = state.chapterIndex >= DATA.chapters.length - 1;
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(ch)}></div>
      <div class="screen">
        ${hudHTML(ch)}
        ${flash}
        <div class="narrative">
          ${proseOrDialogue(pages[pi])}
          ${echoes}
          ${wren}
        </div>
        ${dots}
        <div class="actions actions-row">
          ${pi > 0 ? '<button class="continue btn-back" data-act="beat-back" aria-label="Back to the previous page">&larr;</button>' : ''}
          ${lastPage
            ? `<button class="continue grow" data-act="next">${last ? 'See Your Ending' : 'Continue'}</button>`
            : '<button class="continue grow" data-act="aftermath">Continue</button>'}
        </div>
        ${state.showMap ? mapOverlayHTML() : ''}
      </div>`;
  } else if (state.phase === 'ending') {
    const ending = pickEnding();
    const reflections = (ending.reflections || [])
      .filter(r => conditionMet(r.if))
      .map(r => `<p>${esc(r.text)}</p>`).join('');
    const discovered = GameStore.endingsDiscovered().length;
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(DATA.chapters[DATA.chapters.length - 1])}></div>
      <div class="screen">
        <div class="ending-title ${ending.id}">${esc(ending.name)}</div>
        <div class="narrative">
          <p>${esc(endingBody(ending))}</p>
          ${reflections ? `<div class="reflections">${reflections}</div>` : ''}
          <p class="chron-mark">Recorded in your Chronicle &mdash; ${discovered} of ${DATA.endings.length} endings discovered.</p>
        </div>
        <div class="actions">
          <button class="continue" data-act="book-open">Read the Seer&rsquo;s Account</button>
          <button class="continue" data-act="journal-open">Wren&rsquo;s Journal</button>
          <button class="continue" data-act="restart">Play Again</button>
          <button class="continue" data-act="chronicle">Chronicle</button>
        </div>
      </div>`;
  }
}

/* ---------------------------------------------------------------- actions */

app.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  if (act !== 'erase') eraseArmed = false;
  if (act !== 'import' && act !== 'export') importNote = null;

  if (act === 'begin') {
    GameStore.clearCurrent();
    state = freshState();
    state.phase = 'narrative';
    AudioFX.tap();
  } else if (act === 'resume') {
    state = GameStore.current;
    state.showMap = false;
    AudioFX.tap();
  } else if (act === 'chronicle') {
    state = freshState();
    state.phase = 'chronicle';
    AudioFX.tap();
  } else if (act === 'howto') {
    state = freshState();
    state.phase = 'howto';
    AudioFX.tap();
  } else if (act === 'to-title') {
    state = freshState();
    AudioFX.tap();
  } else if (act === 'choices') {
    const beats = chapterBeats(chapter());
    if ((state.beat || 0) < beats.length - 1) {
      state.beat = (state.beat || 0) + 1;
    } else {
      state.phase = 'choice';
      state.beat = 0;
    }
    AudioFX.tap();
  } else if (act === 'beat-back') {
    // Re-reading is free; only decisions are permanent. Within a chapter's
    // beats or a consequence's pages this steps back a page — it can never
    // cross back over a choice already made.
    state.beat = Math.max(0, (state.beat || 0) - 1);
    AudioFX.tap();
  } else if (act === 'reread') {
    state.phase = 'narrative';
    state.beat = chapterBeats(chapter()).length - 1;
    AudioFX.tap();
  } else if (act === 'choose') {
    const type = btn.dataset.choice;
    const ch = chapter();
    const choice = type === 'light' ? ch.lightChoice : ch.darkChoice;
    state.lastChoice = type;
    state.choices[ch.id] = type;
    state.corruption += choice.corruption || 0;
    state.virtue += choice.virtue || 0;
    state.heroism += choice.heroism || 0;
    state.phase = 'consequence';
    state.beat = 0;
    if (type === 'light') AudioFX.light(); else AudioFX.dark();
  } else if (act === 'aftermath') {
    state.beat = (state.beat || 0) + 1;
    AudioFX.tap();
  } else if (act === 'next') {
    if (state.chapterIndex < DATA.chapters.length - 1) {
      state.chapterIndex += 1;
      state.phase = 'narrative';
      state.beat = 0;
      AudioFX.tap();
    } else {
      state.phase = 'ending';
      const ending = pickEnding();
      GameStore.recordRun(state, ending.id);
      AudioFX.ending(ending.id);
    }
  } else if (act === 'restart') {
    state = freshState();
    state.phase = 'narrative';
    AudioFX.tap();
  } else if (act === 'book-open') {
    book = {
      run: {
        choices: state.choices,
        corruption: state.corruption,
        virtue: state.virtue,
        heroism: state.heroism,
        ending: pickEnding().id,
      },
      page: 0,
      back: 'ending',
    };
    state.phase = 'book';
    AudioFX.tap();
  } else if (act === 'read-run') {
    const run = GameStore.chronicle[parseInt(btn.dataset.idx, 10)];
    if (run) {
      book = { run, page: 0, back: 'chronicle' };
      state.phase = 'book';
    }
    AudioFX.tap();
  } else if (act === 'journal-open') {
    journal = {
      run: {
        choices: state.choices,
        ending: state.phase === 'ending' ? pickEnding().id : null,
      },
      back: state.phase,
    };
    state.phase = 'journal';
    AudioFX.tap();
  } else if (act === 'read-journal') {
    const run = GameStore.chronicle[parseInt(btn.dataset.idx, 10)];
    if (run) {
      journal = { run, back: 'chronicle' };
      state.phase = 'journal';
    }
    AudioFX.tap();
  } else if (act === 'journal-close') {
    state.phase = journal.back;
    if (state.phase === 'chronicle') { state = freshState(); state.phase = 'chronicle'; }
    journal = null;
    AudioFX.tap();
  } else if (act === 'book-next') {
    book.page = Math.min(book.page + 1, playedChapters(book.run).length + 1);
    AudioFX.tap();
  } else if (act === 'book-prev') {
    book.page = Math.max(book.page - 1, 0);
    AudioFX.tap();
  } else if (act === 'book-close') {
    state.phase = book.back;
    if (state.phase === 'chronicle') { state = freshState(); state.phase = 'chronicle'; }
    book = null;
    AudioFX.tap();
  } else if (act === 'map') {
    state.showMap = !state.showMap;
    AudioFX.tap();
  } else if (act === 'sound') {
    AudioFX.toggle();
    try { MusicEngine.sync(); } catch (e) { /* music is optional */ }
  } else if (act === 'recover') {
    GameStore.clearCurrent();
    book = null;
    journal = null;
    state = freshState();
    AudioFX.tap();
  } else if (act === 'export') {
    const code = GameStore.exportCode();
    const box = document.getElementById('importBox');
    const done = () => { importNote = 'Save code copied — paste it on your other device.'; render(); };
    const fallback = () => {
      if (box) { box.value = code; box.select(); }
      importNote = 'Copy the code from the box below.';
      render();
      const box2 = document.getElementById('importBox');
      if (box2) { box2.value = code; box2.select(); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, fallback);
    } else { fallback(); }
    AudioFX.tap();
    return;                       // async feedback renders on its own
  } else if (act === 'import') {
    const box = document.getElementById('importBox');
    const result = GameStore.importCode(box ? box.value : '');
    importNote = result.ok ? 'Save loaded. Welcome back.' : result.error;
    AudioFX.tap();
  } else if (act === 'erase') {
    if (eraseArmed) {
      GameStore.eraseAll();
      eraseArmed = false;
      importNote = 'Chronicle erased.';
    } else {
      eraseArmed = true;
    }
    AudioFX.tap();
  }
  persistState();
  render();
});

/* ---------------------------------------------------------------- boot */

fetch('data/game-data.json')
  .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(data => {
    DATA = data;
    // A mid-run save from a different content version can point at
    // chapters that moved or changed shape — drop it rather than resume
    // into a mismatch. Completed runs in the chronicle are unaffected.
    const cur = GameStore.current;
    if (cur && (cur.dataVersion !== DATA.version || cur.chapterIndex >= DATA.chapters.length)) {
      GameStore.clearCurrent();
    }
    state = freshState();
    render();
  })
  .catch(err => {
    app.innerHTML = `<div class="loading">Couldn&rsquo;t load game data (${esc(String(err.message || err))}).<br>
      Serve this folder over HTTP &mdash; e.g. <code>python3 -m http.server</code> &mdash; rather than opening the file directly.</div>`;
  });

window.addEventListener('error', () => {
  // Last-resort boundary: never leave the player on a dead screen.
  if (app && !app.querySelector('[data-act="recover"]')) {
    app.innerHTML = errorScreen();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}
