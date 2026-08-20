/* Consequences — persistence layer.
 *
 * One versioned blob in localStorage:
 *   { version: 2, current: <run state|null>, chronicle: [<finished runs>], }
 * plus the audio mute flag under its own key (owned by audio.js).
 *
 * localStorage is the right tool here — the save is ~2KB of JSON, far below
 * any quota, and synchronous access keeps the engine simple. Falls back to
 * in-memory storage when localStorage is unavailable (private browsing).
 * Save codes (export/import) make the whole save portable across devices
 * without a backend.
 */

const GameStore = (() => {
  const KEY = 'consequences-v2';
  const LEGACY_KEY = 'consequences-save-v1';
  const MUTE_KEY = 'consequences-muted';
  const CODE_PREFIX = 'CSQ1.';

  let memory = null;   // fallback blob when localStorage is unavailable

  function readRaw(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeRaw(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }
  function removeRaw(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ok */ }
  }

  function blank() {
    return { version: 2, current: null, chronicle: [] };
  }

  function migrate() {
    // v1 stored the bare run state; wrap it into the v2 envelope.
    const legacy = readRaw(LEGACY_KEY);
    if (!legacy) return null;
    try {
      const run = JSON.parse(legacy);
      removeRaw(LEGACY_KEY);
      if (run && typeof run.chapterIndex === 'number' && run.phase && run.phase !== 'title') {
        const data = blank();
        data.current = run;
        return data;
      }
    } catch (e) { removeRaw(LEGACY_KEY); }
    return null;
  }

  function load() {
    const raw = readRaw(KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data && data.version === 2) return data;
      } catch (e) { /* corrupt — fall through */ }
    }
    return migrate() || blank();
  }

  let data = load();

  function persist() {
    const raw = JSON.stringify(data);
    if (!writeRaw(KEY, raw)) memory = raw;
  }

  // Ask the browser not to evict our storage under pressure. Best effort.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => { /* fine */ });
  }

  /* ---- unicode-safe base64 for save codes ---- */
  function enc(str) {
    return btoa(String.fromCharCode(...new TextEncoder().encode(str)));
  }
  function dec(b64) {
    return new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
  }

  return {
    get current() { return data.current; },
    get chronicle() { return data.chronicle; },

    setCurrent(run) {
      data.current = run;
      persist();
    },

    clearCurrent() {
      data.current = null;
      persist();
    },

    recordRun(run, endingId) {
      data.chronicle.push({
        ending: endingId,
        choices: run.choices,
        corruption: run.corruption,
        virtue: run.virtue,
        heroism: run.heroism,
        finishedAt: new Date().toISOString(),
      });
      data.current = null;
      persist();
    },

    endingsDiscovered() {
      return [...new Set(data.chronicle.map(r => r.ending))];
    },

    timesReached(endingId) {
      return data.chronicle.filter(r => r.ending === endingId).length;
    },

    eraseAll() {
      data = blank();
      persist();
    },

    exportCode() {
      const payload = { v: 2, data, muted: readRaw(MUTE_KEY) === '1' };
      return CODE_PREFIX + enc(JSON.stringify(payload));
    },

    importCode(code) {
      const trimmed = (code || '').trim();
      if (!trimmed.startsWith(CODE_PREFIX)) return { ok: false, error: 'That doesn’t look like a save code.' };
      try {
        const payload = JSON.parse(dec(trimmed.slice(CODE_PREFIX.length)));
        if (!payload || payload.v !== 2 || !payload.data || payload.data.version !== 2 ||
            !Array.isArray(payload.data.chronicle)) {
          return { ok: false, error: 'That save code is damaged or from an incompatible version.' };
        }
        data = payload.data;
        persist();
        writeRaw(MUTE_KEY, payload.muted ? '1' : '0');
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'That save code couldn’t be read.' };
      }
    },
  };
})();
