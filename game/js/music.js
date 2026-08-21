/* Consequences — generative lo-fi score.
 *
 * No audio assets: every theme is synthesized live. The recipe is
 * folk-modal melody (harp-like plucks over a tonic-and-fifth drone,
 * rare low horn swells) pushed through a warm lowpass with vinyl
 * crackle and a slow pitch wobble — Rings-adjacent tunes, four-track
 * warmth. Themes are per-location; endings get their own.
 *
 * Autoplay policy: the engine arms on the first pointer gesture and
 * simply remembers the requested theme until then. Muting suspends the
 * whole context (saves battery on phones).
 */

const MusicEngine = (() => {
  // scale = semitone offsets; root = MIDI note; density = melody notes per step
  const THEMES = {
    'title':              { root: 62, scale: [0, 2, 4, 7, 9],      tempo: 64, bright: 2100, drone: 0.050, density: 0.45, swell: 0.10 },
    'thornfield-village': { root: 62, scale: [0, 2, 4, 7, 9],      tempo: 68, bright: 2300, drone: 0.050, density: 0.55, swell: 0.08 },
    'aldrics-tower':      { root: 64, scale: [0, 2, 3, 5, 7, 10],  tempo: 56, bright: 1700, drone: 0.055, density: 0.35, swell: 0.12 },
    'wayrest-inn':        { root: 57, scale: [0, 3, 5, 7, 10],     tempo: 60, bright: 1600, drone: 0.050, density: 0.40, swell: 0.06 },
    'greymarch':          { root: 55, scale: [0, 2, 3, 5, 7, 9],   tempo: 58, bright: 1800, drone: 0.055, density: 0.40, swell: 0.10 },
    'mount-ashenmere':    { root: 61, scale: [0, 2, 3, 7, 8],      tempo: 50, bright: 1400, drone: 0.065, density: 0.25, swell: 0.20 },
    'high-court':         { root: 65, scale: [0, 2, 4, 6, 7, 11],  tempo: 66, bright: 2400, drone: 0.045, density: 0.50, swell: 0.16 },
    'river-meridian':     { root: 62, scale: [0, 2, 3, 5, 7, 8],   tempo: 54, bright: 1700, drone: 0.055, density: 0.35, swell: 0.10 },
    'vellbrook':          { root: 64, scale: [0, 1, 3, 5, 7, 8],   tempo: 52, bright: 1500, drone: 0.060, density: 0.30, swell: 0.10 },
    'willowmere':         { root: 67, scale: [0, 2, 4, 7, 9],      tempo: 70, bright: 2400, drone: 0.045, density: 0.60, swell: 0.05 },
    'moonlit-glade':      { root: 69, scale: [0, 2, 4, 6, 7, 9],   tempo: 46, bright: 1900, drone: 0.060, density: 0.28, swell: 0.14 },
    'dark-lord':          { root: 50, scale: [0, 2, 3, 5, 6],      tempo: 44, bright: 1100, drone: 0.080, density: 0.20, swell: 0.25 },
    'true-hero':          { root: 62, scale: [0, 2, 4, 7, 9, 11],  tempo: 58, bright: 2300, drone: 0.050, density: 0.45, swell: 0.12 },
    'crossroads':         { root: 62, scale: [0, 2, 5, 7, 10],     tempo: 52, bright: 1800, drone: 0.055, density: 0.32, swell: 0.10 },
  };

  let ctx = null;
  let master = null, filter = null;
  let droneOscs = [], droneGain = null;
  let current = null, pending = null;
  let timer = null, nextTime = 0, stepCount = 0;
  let degree = 0;                       // melody random-walk position
  let armed = false;

  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function buildGraph() {
    master = ctx.createGain();
    master.gain.value = 0;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.4;
    master.connect(filter).connect(ctx.destination);

    // vinyl crackle: sparse impulses in a looped noise buffer
    const dur = 2.5;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      if (Math.random() < 0.0006) ch[i] = (Math.random() * 2 - 1) * Math.random();
    }
    const crackle = ctx.createBufferSource();
    crackle.buffer = buf;
    crackle.loop = true;
    const cg = ctx.createGain();
    cg.gain.value = 0.05;
    crackle.connect(cg).connect(master);
    crackle.start();
  }

  function startDrone(theme) {
    stopDrone();
    droneGain = ctx.createGain();
    droneGain.gain.value = theme.drone;
    // slow breathing on the drone level
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05 + Math.random() * 0.04;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = theme.drone * 0.35;
    lfo.connect(lfoGain).connect(droneGain.gain);
    lfo.start();
    droneOscs.push(lfo);
    for (const [off, detune, level] of [[0, 0, 1], [7, 4, 0.55], [-12, -3, 0.6]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midiHz(theme.root + off);
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = level;
      o.connect(g).connect(droneGain);
      o.start();
      droneOscs.push(o);
    }
    droneGain.connect(master);
  }

  function stopDrone() {
    for (const o of droneOscs) { try { o.stop(); } catch (e) { /* lfo/osc */ } }
    droneOscs = [];
    if (droneGain) { try { droneGain.disconnect(); } catch (e) { /* ok */ } droneGain = null; }
  }

  function pluck(midi, t, vel) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midiHz(midi);
    o.detune.value = (Math.random() * 8 - 4);           // tape wobble
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1.6);
    // faint octave shimmer
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = midiHz(midi + 12);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(vel * 0.18, t + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o2.connect(g2).connect(master);
    o2.start(t);
    o2.stop(t + 1.0);
  }

  function bassNote(midi, t) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midiHz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.055, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 2.4);
  }

  function hornSwell(theme, t) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midiHz(theme.root - 12 + [0, 7, 5][Math.floor(Math.random() * 3)]);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 620;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 1.6);
    g.gain.linearRampToValueAtTime(0, t + 4.2);
    o.connect(f).connect(g).connect(master);
    o.start(t);
    o.stop(t + 4.4);
  }

  function scheduleStep(theme, t) {
    const beatsPerBar = 4;
    const stepInBar = stepCount % (beatsPerBar * 2);    // 8th-note steps
    if (stepInBar === 0) {
      const bassDeg = [0, 0, -2, 0][Math.floor(stepCount / (beatsPerBar * 2)) % 4];
      const idx = ((bassDeg % theme.scale.length) + theme.scale.length) % theme.scale.length;
      bassNote(theme.root - 12 + theme.scale[idx], t);
      if (Math.random() < theme.swell / 4) hornSwell(theme, t);
    }
    if (Math.random() < theme.density) {
      // mostly stepwise random walk, occasional leap or rest
      const move = Math.random();
      if (move < 0.4) degree += 1;
      else if (move < 0.8) degree -= 1;
      else degree += Math.random() < 0.5 ? 2 : -2;
      degree = Math.max(-2, Math.min(theme.scale.length + 4, degree));
      const oct = Math.floor(degree / theme.scale.length);
      const idx = ((degree % theme.scale.length) + theme.scale.length) % theme.scale.length;
      const midi = theme.root + 12 + oct * 12 + theme.scale[idx];
      const humanize = (Math.random() - 0.5) * 0.03;
      pluck(midi, t + humanize, 0.05 + Math.random() * 0.04);
    }
    stepCount += 1;
  }

  function tick() {
    if (!ctx || ctx.state !== 'running' || !current) return;
    const theme = THEMES[current];
    const stepDur = 30 / theme.tempo;                   // 8th note
    while (nextTime < ctx.currentTime + 1.0) {
      scheduleStep(theme, Math.max(nextTime, ctx.currentTime + 0.02));
      nextTime += stepDur;
    }
  }

  function startTheme(name) {
    const theme = THEMES[name] || THEMES.title;
    current = name;
    stepCount = 0;
    degree = Math.floor(theme.scale.length / 2);
    filter.frequency.setTargetAtTime(theme.bright, ctx.currentTime, 0.8);
    startDrone(theme);
    nextTime = ctx.currentTime + 0.1;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted() ? 0 : 1, ctx.currentTime, 0.9);
    if (!timer) timer = setInterval(tick, 200);
  }

  function crossfadeTo(name) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    setTimeout(() => { if (ctx) startTheme(name); }, 900);
  }

  function muted() {
    return (typeof AudioFX !== 'undefined') && AudioFX.muted;
  }

  function ensureStarted() {
    if (armed) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      buildGraph();
      armed = true;
      if (pending) { startTheme(pending); pending = null; }
    } catch (e) { /* no audio available */ }
  }

  // arm on the first real gesture (autoplay policy)
  const onGesture = () => {
    ensureStarted();
    if (ctx && ctx.state === 'suspended' && !muted()) ctx.resume();
    if (armed && ctx && ctx.state === 'running') {
      document.removeEventListener('pointerdown', onGesture);
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onGesture);
  }

  return {
    /* Ask for a theme; harmless to call every render. */
    play(name) {
      if (!THEMES[name]) name = 'title';
      if (!armed) { pending = name; return; }
      if (muted()) { current = name; return; }
      if (ctx.state === 'suspended') ctx.resume();
      if (!current) startTheme(name);
      else if (name !== current) crossfadeTo(name);
    },
    /* Call after the mute toggle flips. */
    sync() {
      if (!armed) return;
      if (muted()) {
        ctx.suspend();
      } else {
        ctx.resume();
        if (current) {
          nextTime = ctx.currentTime + 0.1;
          master.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
        }
      }
    },
    get current() { return current; },
    get running() { return !!(ctx && ctx.state === 'running'); },
  };
})();
