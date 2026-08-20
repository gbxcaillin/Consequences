/* Consequences — narrative engine.
 *
 * All content lives in data/game-data.json; this file only knows how to
 * play it: title → (narrative → choice → consequence)* → ending.
 * Progress persists in localStorage. Set DESIGN_MODE to true to surface
 * the hidden Corruption/Virtue scoring while testing.
 */

const DESIGN_MODE = false;
const SAVE_KEY = 'consequences-save-v1';

let DATA = null;
let state = null;
let saved = null;   // a resumable run found at boot, offered on the title screen

const app = document.getElementById('app');

function freshState() {
  return {
    chapterIndex: 0,
    phase: 'title',        // title | narrative | choice | consequence | ending
    lastChoice: null,
    corruption: 0,
    virtue: 0,
    heroism: 0,
    choices: {},           // chapterId -> 'light' | 'dark'
    showMap: false,
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s.chapterIndex === 'number' && s.phase) return s;
    }
  } catch (e) { /* corrupt save */ }
  return null;
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
  if (cond.chapter) return state.choices[cond.chapter] === cond.choice;
  if (cond.stat) return (state[cond.stat] || 0) >= cond.gte;
  return false;
}

function activeEchoes(ch, choiceType) {
  return (ch.echoes || []).filter(e => e.after === choiceType && conditionMet(e.if));
}

function pickEnding() {
  if (state.corruption >= 80) return DATA.endings.find(e => e.id === 'dark-lord');
  if (state.virtue >= 80) return DATA.endings.find(e => e.id === 'true-hero');
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
  return `style="background-image:url('assets/scenes/${scene}.png')"`;
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

function render() {
  const ch = chapter();
  if (state.phase === 'title') {
    const resumable = saved && saved.phase !== 'title';
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(null)}></div>
      <div class="screen title-screen">
        <h1>Consequences</h1>
        <div class="sub">A fantasy of inverted morality</div>
        <div class="actions">
          ${resumable ? '<button class="continue" data-act="resume">Continue</button>' : ''}
          <button class="continue" data-act="begin">${resumable ? 'New Journey' : 'Begin'}</button>
        </div>
      </div>`;
  } else if (state.phase === 'narrative') {
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(ch)}></div>
      <div class="screen">
        ${hudHTML(ch)}
        <img class="figure" src="assets/sprites/${ch.sprite}.png" alt="">
        <div class="narrative"><p>${esc(ch.narrative)}</p></div>
        <div class="actions"><button class="continue" data-act="choices">Continue</button></div>
        ${state.showMap ? mapOverlayHTML() : ''}
      </div>`;
  } else if (state.phase === 'choice') {
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(ch)}></div>
      <div class="screen">
        ${hudHTML(ch)}
        <div class="narrative"></div>
        <div class="prompt">What do you do?</div>
        <div class="actions">
          <button class="choice-light" data-act="choose" data-choice="light">${esc(ch.lightChoice.text)}</button>
          <button class="choice-dark" data-act="choose" data-choice="dark">${esc(ch.darkChoice.text)}</button>
        </div>
        ${state.showMap ? mapOverlayHTML() : ''}
      </div>`;
  } else if (state.phase === 'consequence') {
    const type = state.lastChoice;
    const choice = type === 'light' ? ch.lightChoice : ch.darkChoice;
    const echoes = activeEchoes(ch, type)
      .map(e => `<div class="echo">${esc(e.text)}</div>`).join('');
    const isPrologue = state.chapterIndex === 0;
    const wrenLine = DATA.companion.lines[ch.id] ? DATA.companion.lines[ch.id][type] : null;
    const wren = wrenLine ? `
      <div class="wren">
        ${isPrologue ? `<p style="margin:0 0 10px;font-style:italic;color:var(--text-dim)">${esc(DATA.companion.intro)}</p>` : ''}
        <span class="who">${esc(DATA.companion.name)}</span>
        &ldquo;${esc(wrenLine)}&rdquo;
      </div>` : '';
    const flash = DESIGN_MODE
      ? `<div class="flash ${type === 'light' ? 'corrupt' : 'virtue'}">${type === 'light' ? '☠ Corruption +' + (choice.corruption || 0) : '✧ Virtue +' + (choice.virtue || 0)}</div>`
      : '';
    const last = state.chapterIndex >= DATA.chapters.length - 1;
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(ch)}></div>
      <div class="screen">
        ${hudHTML(ch)}
        ${flash}
        <div class="narrative">
          <p>${esc(choice.consequence)}</p>
          ${echoes}
          ${wren}
        </div>
        <div class="actions">
          <button class="continue" data-act="next">${last ? 'See Your Ending' : 'Continue'}</button>
        </div>
        ${state.showMap ? mapOverlayHTML() : ''}
      </div>`;
  } else if (state.phase === 'ending') {
    const ending = pickEnding();
    const reflections = (ending.reflections || [])
      .filter(r => conditionMet(r.if))
      .map(r => `<p>${esc(r.text)}</p>`).join('');
    app.innerHTML = `
      <div class="scene-bg" ${sceneStyle(DATA.chapters[DATA.chapters.length - 1])}></div>
      <div class="screen">
        <div class="ending-title ${ending.id}">${esc(ending.name)}</div>
        <div class="narrative">
          <p>${esc(endingBody(ending))}</p>
          ${reflections ? `<div class="reflections">${reflections}</div>` : ''}
        </div>
        <div class="actions">
          <button class="continue" data-act="restart">Play Again</button>
        </div>
      </div>`;
  }
}

/* ---------------------------------------------------------------- actions */

app.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;

  if (act === 'begin') {
    state = freshState();
    saved = null;
    state.phase = 'narrative';
    AudioFX.tap();
  } else if (act === 'resume') {
    state = saved;
    saved = null;
    state.showMap = false;
    AudioFX.tap();
  } else if (act === 'choices') {
    state.phase = 'choice';
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
    if (type === 'light') AudioFX.light(); else AudioFX.dark();
  } else if (act === 'next') {
    if (state.chapterIndex < DATA.chapters.length - 1) {
      state.chapterIndex += 1;
      state.phase = 'narrative';
      AudioFX.tap();
    } else {
      state.phase = 'ending';
      AudioFX.ending(pickEnding().id);
    }
  } else if (act === 'restart') {
    state = freshState();
    AudioFX.tap();
  } else if (act === 'map') {
    state.showMap = !state.showMap;
    AudioFX.tap();
  } else if (act === 'sound') {
    AudioFX.toggle();
  }
  save();
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
    saved = load();
    state = freshState();
    render();
  })
  .catch(err => {
    app.innerHTML = `<div class="loading">Couldn&rsquo;t load game data (${esc(String(err.message || err))}).<br>
      Serve this folder over HTTP &mdash; e.g. <code>python3 -m http.server</code> &mdash; rather than opening the file directly.</div>`;
  });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}
