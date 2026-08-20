/* Consequences — tiny WebAudio soundscape. No audio assets; every cue is
 * synthesized. Muting persists across sessions. The AudioContext is only
 * created on the first user gesture (autoplay policy). */

const AudioFX = (() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('consequences-muted') === '1'; } catch (e) { /* private mode */ }

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, { type = 'sine', dur = 0.15, delay = 0, vol = 0.08, glide = 0 } = {}) {
    if (muted) return;
    try {
      const c = ensure();
      const t = c.currentTime + delay;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* audio unavailable */ }
  }

  return {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('consequences-muted', muted ? '1' : '0'); } catch (e) { /* ok */ }
      return muted;
    },
    /* page-turn tap */
    tap() { tone(660, { type: 'square', dur: 0.06, vol: 0.035 }); },
    /* the light path sounds triumphant — that's the trap */
    light() {
      tone(523.25, { type: 'triangle', dur: 0.25 });
      tone(659.25, { type: 'triangle', dur: 0.3, delay: 0.09 });
      tone(783.99, { type: 'triangle', dur: 0.4, delay: 0.18 });
    },
    /* the dark path sounds uneasy — that's also the trap */
    dark() {
      tone(220, { dur: 0.35, vol: 0.09 });
      tone(233.08, { dur: 0.45, delay: 0.12, vol: 0.055 });
    },
    ending(kind) {
      if (kind === 'dark-lord') {
        [110, 130.81, 164.81].forEach((f, i) => tone(f, { dur: 1.4, delay: i * 0.06, vol: 0.07 }));
      } else if (kind === 'true-hero') {
        [261.63, 392, 523.25].forEach((f, i) => tone(f, { type: 'triangle', dur: 1.4, delay: i * 0.09, vol: 0.055 }));
      } else {
        tone(329.63, { type: 'triangle', dur: 1.1, vol: 0.07 });
        tone(311.13, { type: 'triangle', dur: 1.2, delay: 0.4, vol: 0.05 });
      }
    },
  };
})();
