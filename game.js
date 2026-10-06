/* =====================================================================
   LE CADEAU — une petite aventure interactive d'anniversaire
   Aucune dépendance. Tout ce qui est personnalisable est dans config.js.
   Chapitres : Prologue (la pièce noire) → I Le lapin → II Le cadeau
   → III Les souvenirs (énigme) → IV-V Les proches → VI Le secret
   → VII Tous réunis → Final, puis album et exploration libre.
   ===================================================================== */
(() => {
  'use strict';

  const C = window.GIFT_CONFIG || {};
  const TX = C.texts || {};
  const T = Object.assign({ typeSpeed: 42, handwritingSpeed: 22, seekSpots: 3, skipGameAfter: 40 }, C.timings);
  const AUD = Object.assign({ music: null, musicVolume: .55, duckVolume: .12, showCaptions: true, sfx: {} }, C.audio);
  const SECRETS = C.secrets || {};
  const GIFTC = C.gift || {};
  const LAYERS = (GIFTC.layers && GIFTC.layers.length) ? GIFTC.layers : [{ name: 'Le cadeau', game: 'charge', reveal: { kind: 'people' } }];
  const CHAPTER_COLORS = C.chapterColors || ['#ff8fbf', '#9b6bff', '#3fa9ff', '#ffcc4d', '#ff5a5f'];

  // ---------- Outils ----------
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fill = (s, vars) => String(s == null ? '' : s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : (k === 'recipient' ? (C.recipient || '') : '')));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function hexToRgb(h) {
    h = String(h || '#ffffff').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (rgb, a) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
  const shade = (rgb, f) => rgb.map((v) => clamp(Math.round(v * f), 0, 255));
  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Sauvegarde durable (le navigateur peut être fermé puis rouvert)
  const SAVE_KEY = 'cadeau-aventure-v3';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible : le jeu continue */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* rien */ } }
  };

  // ---------- DOM ----------
  const app = $('#app'), hero = $('#hero'), gift = $('#gift'), bunny = $('#bunny'), bunnySayEl = $('#bunnySay');
  const lineTop = $('#lineTop'), lineBottom = $('#lineBottom'), bubble = $('#bubble'), chapterEl = $('#chapter');
  const coreLight = $('#coreLight'), spheresEl = $('#spheres'), skipBtn = $('#skipBtn'), objectsEl = $('#objects');
  const endBar = $('#endBar'), card = $('#card'), splash = $('#splash'), panel = $('#panel'), memo = $('#memo');
  const albumEl = $('#album'), albumBtn = $('#albumBtn'), hudEl = $('#hud'), blackout = $('#blackout');

  // ---------- Données ----------
  const P = (C.participants || []).map((p, i) => ({ ...p, i, kind: 'person', rgb: hexToRgb(p.color) }));
  const ORGA = C.organizer ? { ...C.organizer, i: P.length, kind: 'organizer', rgb: hexToRgb(C.organizer.color || '#ff8fbf') } : null;
  const ALLP = ORGA ? P.concat([ORGA]) : P.slice();
  const SOUV = (C.souvenirs || []).map((s, i) => ({ ...s, i }));
  const souvById = (id) => SOUV.find((s) => s.id === id);

  // ---------- État ----------
  const blank = () => ({ ck: 'prologue', layer: 0, person: 0, found: [], reveals: [], people: [], secrets: [], narr: [], completed: false, visits: 0, seen: false });
  let SV = Object.assign(blank(), store.get(SAVE_KEY, {}));
  const prefs = store.get('cadeau-prefs', {});
  const reducePref = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = {
    started: false, busy: false, fast: false, modal: null, ck: SV.ck,
    calm: prefs.calm != null ? !!prefs.calm : reducePref,
    muted: !!prefs.muted, volume: prefs.volume != null ? prefs.volume : .8,
    cur: null, W: innerWidth, H: innerHeight, portrait: innerHeight > innerWidth,
    dark: 1, darkTarget: 1, light: { x: innerWidth / 2, y: innerHeight * .7, r: 90, moved: false },
    lights: [], groups: new Set(), tint: 0, tintTarget: 0,
    bunny: { x: 50, y: 80, size: 15, clicks: 0, taps: [], state: 'hidden' },
    seek: null, combo: [], lastInput: performance.now(), lastIdle: -1e9,
    mode: 'none', focus: null, game: null, hs: 200
  };
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4;
  const fxScale = () => (G.calm ? .25 : lowPower ? .6 : 1);
  const dur = (ms) => (G.calm ? ms * .5 : ms);

  function save() { SV.ck = G.ck; store.set(SAVE_KEY, SV); updateHud(); }
  function checkpoint(ck, extra) { G.ck = ck; Object.assign(SV, extra || {}); app.dataset.ck = ck; save(); }

  // Pauses que le bouton « Passer » peut écourter
  let skipWaiters = [];
  function sleep(ms) {
    if (G.fast) return Promise.resolve();
    return new Promise((r) => {
      const done = () => { clearTimeout(t); skipWaiters = skipWaiters.filter((x) => x !== done); r(); };
      const t = setTimeout(done, dur(ms));
      skipWaiters.push(done);
    });
  }
  function skipAnimations() { G.fast = true; skipWaiters.slice().forEach((f) => f()); }
  function showSkip(on) { skipBtn.hidden = !on; if (!on) G.fast = false; }
  function retrigger(el, cls) { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); }
  // Attente d'un clic sur un élément (ou d'une condition), sans jamais bloquer l'interface
  function waitClick(el) { return new Promise((r) => el.addEventListener('click', () => r(), { once: true })); }
  /* =================================================================
     SON : musique générée (ou fichier), effets, voix
     ================================================================= */
  const A = {
    ctx: null, master: null, musicBus: null, sfxBus: null, verb: null, noise: null,
    init() {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      const ctx = this.ctx;
      this.master = ctx.createGain(); this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain(); this.sfxBus = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.8);
      const verbOut = ctx.createGain(); verbOut.gain.value = .32;
      this.verb.connect(verbOut); verbOut.connect(this.master);
      [this.musicBus, this.sfxBus].forEach((b) => { b.connect(this.master); b.connect(this.verb); });
      this.musicBus.gain.value = 0;
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolume();
    },
    impulse(sec) {
      const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      return buf;
    },
    resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); },
    level() { return G.muted ? 0 : G.volume; },
    applyVolume() {
      if (this.master) this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime, .05);
      Music.applyFileVolume();
      if (G.cur && G.cur.el) { G.cur.el.volume = clamp(this.level(), 0, 1); G.cur.el.muted = G.muted; }
    },
    bell(f, t, d = 1.6, g = .08, dest) {
      const ctx = this.ctx; if (!ctx) return;
      const out = ctx.createGain(); out.connect(dest || this.sfxBus);
      out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(g, t + .006);
      out.gain.exponentialRampToValueAtTime(.0001, t + d);
      [[1, 1], [2.01, .28], [3.98, .1]].forEach(([m, a]) => {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * m; og.gain.value = a;
        o.connect(og); og.connect(out); o.start(t); o.stop(t + d + .05);
      });
    },
    blip(f1, f2, t, d = .14, g = .16, type = 'sine') {
      const ctx = this.ctx; if (!ctx) return;
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(g, t + .01); og.gain.exponentialRampToValueAtTime(.0001, t + d + .05);
      o.connect(og); og.connect(this.sfxBus); o.start(t); o.stop(t + d + .1);
    },
    noiseBurst(t, d, freq, q, g, type = 'bandpass', sweepTo) {
      const ctx = this.ctx; if (!ctx) return;
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + d);
      const og = ctx.createGain(); og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(g, t + Math.min(.02, d / 3));
      og.gain.exponentialRampToValueAtTime(.0001, t + d);
      s.connect(f); f.connect(og); og.connect(this.sfxBus);
      s.start(t, Math.random() * .5); s.stop(t + d + .05);
    },
    file(src) {
      try { const a = new Audio(src); a.volume = clamp(this.level(), 0, 1); a.muted = G.muted; a.play().catch(() => {}); return true; } catch (e) { return false; }
    }
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const sfx = {
    custom(name) { const src = AUD.sfx && AUD.sfx[name]; return src ? A.file(src) : false; },
    now() { return A.ctx ? A.ctx.currentTime + .01 : 0; },
    bunny() { if (this.custom('bunny') || !A.ctx) return; const t = this.now(); A.blip(520, 1040, t, .12, .14); A.blip(760, 1320, t + .11, .1, .1); },
    surprise() { if (!A.ctx) return; const t = this.now(); A.blip(400, 1400, t, .25, .14, 'triangle'); A.bell(mtof(91), t + .22, 1, .05); },
    sparkle(n = 5) { if (!A.ctx) return; const t = this.now(); for (let i = 0; i < n; i++) A.bell(rand(1500, 3200), t + i * .045, .7, .03); },
    magic() {
      if (this.custom('magic') || !A.ctx) return;
      const t = this.now();
      [72, 76, 79, 84, 88, 91].forEach((m, i) => A.bell(mtof(m), t + i * .075, 2.2, .055));
      A.noiseBurst(t, 1.2, 7000, .7, .05, 'highpass');
    },
    paper() {
      if (this.custom('paper') || !A.ctx) return;
      const t = this.now(), n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) A.noiseBurst(t + rand(0, .16), rand(.03, .08), rand(1400, 4200), .9, .28);
      A.noiseBurst(t, .35, 2500, .4, .05, 'highpass');
      this.sparkle(2);
    },
    chime(i) {
      if (this.custom('chime') || !A.ctx) return;
      const scale = [76, 79, 81, 84, 86, 88, 91, 93], t = this.now(), m = scale[i % scale.length];
      A.bell(mtof(m), t, 2.6, .09); A.bell(mtof(m + 7), t + .12, 2.4, .06); A.bell(mtof(m + 12), t + .24, 2.2, .04);
    },
    whoosh() { if (!A.ctx) return; A.noiseBurst(this.now(), 1.1, 300, 1.2, .2, 'bandpass', 3000); },
    rumble() {
      if (!A.ctx) return;
      const t = this.now();
      A.noiseBurst(t, 1.2, 180, .8, .35, 'lowpass');
      A.blip(70, 50, t, 1.1, .18);
    },
    open() {
      if (this.custom('open') || !A.ctx) return;
      const t = this.now();
      A.noiseBurst(t, 2.2, 600, .5, .18, 'bandpass', 9000);
      [60, 64, 67, 72, 76, 79, 84, 88].forEach((m, i) => A.bell(mtof(m), t + .5 + i * .06, 3.2, .06));
    },
    giggle() { if (!A.ctx) return; const t = this.now(); [0, .09, .18].forEach((d, i) => A.blip(900 + i * 140, 1300 + i * 140, t + d, .06, .08)); },
    pop() { if (!A.ctx) return; A.blip(300, 700, this.now(), .08, .12); }
  };

  // Musique : fichier fourni, sinon petite musique générée en direct
  const Music = {
    el: null, procedural: false, intensity: .15, mood: 'mystery', next: 0, beat: 0, chord: 0, timer: 0, duck: false,
    moods: {
      mystery: [[57, 60, 64, 71], [53, 57, 60, 67], [48, 52, 55, 62], [55, 59, 62, 69]],
      warm: [[53, 57, 60, 64], [48, 52, 55, 59], [50, 53, 57, 60], [46, 50, 53, 57]]
    },
    start() {
      if (AUD.music) {
        try {
          this.el = new Audio(AUD.music); this.el.loop = true; this.el.preload = 'auto';
          this.el.addEventListener('error', () => { this.el = null; this.startProcedural(); }, { once: true });
          this.applyFileVolume();
          this.el.play().catch(() => { this.el = null; this.startProcedural(); });
          return;
        } catch (e) { /* repli */ }
      }
      this.startProcedural();
    },
    startProcedural() {
      if (!A.ctx || this.procedural) return;
      this.procedural = true;
      this.next = A.ctx.currentTime + .15;
      this.timer = setInterval(() => this.tick(), 100);
      this.applyBus();
    },
    target() { if (this.silent) return 0; return (this.duck ? AUD.duckVolume : AUD.musicVolume) * (this.el ? (.7 + this.intensity * .3) : 1); },
    applyBus() { if (A.musicBus) A.musicBus.gain.setTargetAtTime(this.procedural ? this.target() : 0, A.ctx.currentTime, .6); },
    applyFileVolume() {
      if (!this.el) return;
      const goal = clamp(this.target() * A.level(), 0, 1), el = this.el;
      cancelAnimationFrame(this._raf);
      const step = () => { el.volume = clamp(el.volume + (goal - el.volume) * .08, 0, 1); if (Math.abs(goal - el.volume) > .005) this._raf = requestAnimationFrame(step); };
      step();
    },
    setIntensity(x) { this.intensity = clamp(x, 0, 1); this.applyBus(); this.applyFileVolume(); },
    setMood(m) { this.mood = m; },
    silence(on) { this.silent = on; this.applyBus(); this.applyFileVolume(); },
    setDuck(on) { this.duck = on; this.applyBus(); this.applyFileVolume(); },
    tick() {
      const ctx = A.ctx; if (!ctx) return;
      const eighth = 60 / 70 / 2;
      while (this.next < ctx.currentTime + .4) { this.scheduleBeat(this.next); this.next += eighth; this.beat++; }
    },
    scheduleBeat(t) {
      const chords = this.moods[this.mood], b = this.beat, x = this.intensity, eighth = 60 / 70 / 2;
      if (b % 16 === 0) { this.chord = (this.chord + 1) % chords.length; this.pad(chords[this.chord], t, eighth * 16); }
      const ch = chords[this.chord];
      if (x > .4 && b % 8 === 0) this.bass(ch[0] - 12, t, eighth * 8);
      const density = .18 + x * .6;
      if (Math.random() < density) A.bell(mtof(pick(ch) + (Math.random() < .5 ? 12 : 24)), t, 1.8, .028 + x * .025, A.musicBus);
      if (x > .75 && Math.random() < .5) A.bell(mtof(pick(ch) + 36), t + eighth / 2, .9, .012, A.musicBus);
    },
    pad(notes, t, d) {
      const ctx = A.ctx, x = this.intensity;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380 + x * 2400; f.Q.value = .5;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 + x * .03, t + 1.6);
      g.gain.setValueAtTime(.05 + x * .03, t + d - .2); g.gain.linearRampToValueAtTime(0, t + d + 1.8);
      f.connect(g); g.connect(A.musicBus);
      notes.forEach((m) => [-6, 6].forEach((det) => {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
        const og = ctx.createGain(); og.gain.value = .22 / notes.length;
        o.connect(og); og.connect(f); o.start(t); o.stop(t + d + 2);
      }));
    },
    bass(m, t, d) {
      const ctx = A.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09 * this.intensity, t + .3); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(g); g.connect(A.musicBus); o.start(t); o.stop(t + d + .1);
    }
  };


  // Voix : chaque fichier est préchargé une seule fois ; repli texte s'il manque
  const voiceEls = new Map();
  function voiceEl(src) {
    if (!src) return null;
    if (voiceEls.has(src)) return voiceEls.get(src);
    let rec = { el: null, failed: false };
    try {
      const el = new Audio(); el.preload = 'auto';
      el.addEventListener('error', () => { rec.failed = true; });
      el.src = src; rec.el = el;
    } catch (e) { rec.failed = true; }
    voiceEls.set(src, rec);
    return rec;
  }
  function preloadVoices() {
    ALLP.forEach((p) => { voiceEl(p.audio); voiceEl(p.secretAudio); voiceEl(p.wordAudio); });
    LAYERS.forEach((l) => l.reveal && voiceEl(l.reveal.audio));
    if (C.together) voiceEl(C.together.audio);
    if (C.viewers) (C.viewers.messages || []).forEach((v) => voiceEl(v.audio));
  }

  function stopVoice() { if (G.cur) G.cur.finish(); }
  // v = { audio, caption } ; opts.captionEl : où écrire le texte
  function playVoice(v, opts = {}) {
    stopVoice(); stopNarr();
    const capEl = opts.captionEl || lineBottom;
    return new Promise((resolve) => {
      let finished = false, to = 0, el = null, usingText = false;
      const finish = () => {
        if (finished) return; finished = true; clearTimeout(to);
        if (el) { el.onended = null; el.onerror = null; try { el.pause(); } catch (e) { /* rien */ } }
        if (G.cur && G.cur.finish === finish) G.cur = null;
        if (skipBtn.dataset.mode === 'voice') { skipBtn.hidden = true; skipBtn.dataset.mode = ''; }
        Music.setDuck(false);
        resolve();
      };
      const textFallback = () => {
        if (finished || usingText) return; usingText = true; el = null;
        if (G.cur) G.cur.el = null;
        caption(capEl, v.caption, true);
        to = setTimeout(finish, clamp((v.caption || '').length * 65, opts.min || 3200, 15000));
      };
      G.cur = { finish, el: null };
      if (!skipBtn.dataset.mode) { skipBtn.hidden = false; skipBtn.dataset.mode = 'voice'; }
      Music.setDuck(true);
      const rec = voiceEl(v.audio);
      if (rec && rec.el && !rec.failed) {
        el = rec.el; G.cur.el = el;
        try { el.currentTime = 0; } catch (e) { /* rien */ }
        el.volume = clamp(A.level(), 0, 1); el.muted = G.muted;
        el.onended = finish;
        el.onerror = () => { rec.failed = true; textFallback(); };
        if (AUD.showCaptions) caption(capEl, v.caption, false);
        el.play().then(() => {
          const len = isFinite(el.duration) && el.duration > 0 ? el.duration : 60;
          clearTimeout(to); to = setTimeout(finish, (len + 3) * 1000);
        }).catch(() => { rec.failed = true; textFallback(); });
      } else textFallback();
    });
  }
  function caption(el, text, isText) {
    if (!text) { setLine(el, ''); return; }
    type(el, '« ' + text + ' »', { speed: 26, after: isText ? `<span class="tag">${esc(TX.textOnly || 'message écrit')}</span>` : '' });
  }

  /* =================================================================
     LA NARRATRICE
     Sa voix a sa propre carte : un petit orbe rose qui vibre avec sa voix,
     ses sous-titres écrits à la main, mot après mot, au rythme de l'audio.
     Une légère réverbération lui donne une voix « de conte ».
     ================================================================= */
  const NARR = C.narrator || null;
  const narrCard = $('#narr'), narrText = $('#narrText');
  const narrEls = new Map();
  let narrCur = null, narrAn = null, narrBuf = null;
  const narrPending = [];

  function narrLine(key) { return NARR && NARR.lines && NARR.lines[key]; }
  function narrRec(src) {
    if (!src) return null;
    if (narrEls.has(src)) return narrEls.get(src);
    const rec = { el: null, failed: false, wired: false };
    try {
      const el = new Audio(); el.preload = 'auto';
      el.addEventListener('error', () => { rec.failed = true; });
      el.src = src; rec.el = el;
    } catch (e) { rec.failed = true; }
    narrEls.set(src, rec);
    return rec;
  }
  function preloadNarration() { if (NARR && NARR.lines) Object.values(NARR.lines).forEach((l) => narrRec(l.audio)); }
  // Branche la voix sur l'analyseur (pour l'orbe) et sur un peu de réverbération
  function wireNarr(rec) {
    if (rec.wired || !A.ctx) return;
    try {
      const ctx = A.ctx;
      if (!narrAn) {
        narrAn = ctx.createAnalyser(); narrAn.fftSize = 512; narrBuf = new Uint8Array(narrAn.fftSize);
        const dry = ctx.createGain(); dry.gain.value = 1;
        const send = ctx.createGain(); send.gain.value = .22;
        narrAn.connect(dry); dry.connect(A.master);
        narrAn.connect(send); send.connect(A.verb);
      }
      ctx.createMediaElementSource(rec.el).connect(narrAn);
      rec.el.volume = 1;
      rec.wired = true;
    } catch (e) { /* lecture directe, sans effet */ }
  }
  function stopNarr() { if (narrCur) narrCur.finish(); }

  // Joue une réplique. lines : une clé de config ou { text: [...], audio, at }
  function narrate(key, opts = {}) {
    const L = typeof key === 'string' ? narrLine(key) : key;
    if (!L || !(L.text || []).length) return Promise.resolve();
    if (opts.once && typeof key === 'string' && SV.narr.includes(key)) return Promise.resolve();
    stopNarr();
    if (typeof key === 'string' && !SV.narr.includes(key)) { SV.narr.push(key); save(); }
    return new Promise((resolve) => {
      const sents = [].concat(L.text);
      const rec = narrRec(L.audio);
      const useAudio = rec && rec.el && !rec.failed;
      let el = null, t0 = performance.now(), idx = -1, finished = false, stopT = 0;
      // Moments de début de chaque phrase (secondes)
      let at = (L.at && L.at.length === sents.length) ? L.at.slice() : null;
      let total = 0;
      if (!at) {
        at = []; let acc = 0;
        sents.forEach((s) => { at.push(acc); acc += clamp(s.length * .062, 1.5, 6); });
        total = acc + .4;
      }
      const showSentence = (i) => {
        narrText.innerHTML = sents[i].split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span>${esc(w)}</span>`)).join('');
        narrText.dataset.n = narrText.children.length;
        retrigger(narrText, 'in');
      };
      const tick = () => {
        if (finished) return;
        const t = el ? el.currentTime : (performance.now() - t0) / 1000;
        let i = 0; while (i + 1 < at.length && t >= at[i + 1]) i++;
        if (i !== idx) { idx = i; showSentence(i); }
        // les mots apparaissent au rythme de la phrase
        const end = at[i + 1] != null ? at[i + 1] : (el && isFinite(el.duration) ? el.duration : total || at[i] + 3);
        const k = clamp((t - at[i]) / Math.max(.3, (end - at[i]) * .8), 0, 1);
        const ws = narrText.children, n = Math.ceil(k * ws.length);
        for (let j = 0; j < ws.length; j++) ws[j].classList.toggle('w', j < n || G.calm);
        // l'orbe vibre avec la voix
        let amp = 0;
        if (el && narrAn && !el.paused) {
          narrAn.getByteTimeDomainData(narrBuf);
          let sum = 0; for (let j = 0; j < narrBuf.length; j += 4) { const v = (narrBuf[j] - 128) / 128; sum += v * v; }
          amp = clamp(Math.sqrt(sum / (narrBuf.length / 4)) * 5, 0, 1);
        } else if (!el) amp = .25 + .2 * Math.sin(performance.now() / 160);
        narrCard.style.setProperty('--amp', amp.toFixed(3));
        if (!el && t >= total) finish();
      };
      const finish = () => {
        if (finished) return; finished = true;
        clearTimeout(stopT); frameHooks.delete(tick);
        if (el) { el.onended = null; try { el.pause(); } catch (e) { /* rien */ } }
        if (narrCur && narrCur.finish === finish) narrCur = null;
        G.narr = null;
        if (skipBtn.dataset.mode === 'narr') { skipBtn.hidden = true; skipBtn.dataset.mode = ''; }
        narrCard.classList.remove('show'); app.classList.remove('narrating');
        setTimeout(() => { if (!narrCur) narrCard.hidden = true; }, 450);
        if (!G.cur) Music.setDuck(false);
        resolve();
        // une réaction en attente n'a de sens que juste après ce qui l'a provoquée
        let next; while ((next = narrPending.shift()) && performance.now() > next.until);
        if (next) setTimeout(() => narrateSoft(next.key, { drop: true }), 500);
      };
      narrCur = { finish, key }; G.narr = typeof key === 'string' ? key : 'custom';
      $('#narrName').textContent = (NARR && NARR.name) || '';
      $('#narrLabel').textContent = (NARR && NARR.label) || '';
      narrCard.hidden = false; void narrCard.offsetWidth; narrCard.classList.add('show'); app.classList.add('narrating');
      narrCard.classList.toggle('text-only', !useAudio);
      if (!skipBtn.dataset.mode) { skipBtn.hidden = false; skipBtn.dataset.mode = 'narr'; }
      Music.setDuck(true);
      frameHooks.add(tick);
      if (useAudio) {
        el = rec.el; wireNarr(rec);
        if (!rec.wired) { el.volume = clamp(A.level(), 0, 1); el.muted = G.muted; }
        try { el.currentTime = 0; } catch (e) { /* rien */ }
        el.onended = () => setTimeout(finish, 500);
        el.play().then(() => {
          const len = isFinite(el.duration) && el.duration > 0 ? el.duration : 30;
          stopT = setTimeout(finish, (len + 2) * 1000);
        }).catch(() => {
          // lecture refusée ou fichier absent : sous-titres seuls
          rec.failed = true; el.onended = null; el = null; t0 = performance.now();
          let acc = 0; at = sents.map((s) => { const a = acc; acc += clamp(s.length * .062, 1.5, 6); return a; }); total = acc + .4;
          narrCard.classList.add('text-only');
        });
      }
    });
  }
  // Ne coupe jamais la narratrice : attend son tour si elle parle déjà
  function narrateSoft(key, opts = {}) {
    if (!narrLine(key)) return;
    if (!opts.repeat && SV.narr.includes(key)) return;
    // les répliques d'ambiance laissent la place à une vraie réaction
    const ambient = ['world', 'sleeping', 'firstDiscovery'];
    if (narrCur && !G.cur && ambient.includes(narrCur.key) && !ambient.includes(key)) { narrate(key); return; }
    if (narrCur || G.cur) { if (!opts.drop && !narrPending.some((p) => p.key === key)) narrPending.push({ key, until: performance.now() + 7000 }); return; }
    narrate(key);
  }
  function narrCenter() {
    const o = narrCard.querySelector('.narr-orb');
    if (!o || narrCard.hidden) return [G.W / 2, G.H * .15];
    const r = o.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
  }
  /* =================================================================
     TEXTES
     ================================================================= */
  function setLine(el, html) { el._tok = (el._tok || 0) + 1; el.classList.remove('caret'); el.innerHTML = html || ''; }
  async function type(el, text, opts = {}) {
    const tok = el._tok = (el._tok || 0) + 1;
    const prefix = opts.prefix || '';
    text = String(text || '');
    if (G.calm || G.fast || !text) { el.innerHTML = prefix + esc(text) + (opts.after ? '<br>' + opts.after : ''); return; }
    el.classList.add('caret');
    const speed = opts.speed || T.typeSpeed;
    for (let i = 1; i <= text.length; i++) {
      if (el._tok !== tok) return;
      el.innerHTML = prefix + esc(text.slice(0, i));
      const c = text[i - 1];
      await wait(/[.…,!?]/.test(c) ? speed * 5 : speed);
    }
    if (el._tok !== tok) return;
    el.classList.remove('caret');
    if (opts.after) el.innerHTML += '<br>' + opts.after;
  }
  let bubbleT = 0;
  function say(msg, ms = 2600) {
    if (!msg) return;
    bubble.textContent = msg; bubble.classList.add('show');
    clearTimeout(bubbleT); bubbleT = setTimeout(() => bubble.classList.remove('show'), ms);
  }
  const who = (label, name, sym) => `<span class="who">${esc(label)}</span>${esc(name)}${sym ? ' ' + esc(sym) : ''}`;
  // Particules
  const parts = [];
  const maxParts = () => Math.round(700 * fxScale());
  function spawn(o) {
    if (parts.length >= maxParts()) return;
    parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: .98, life: 1, max: 1, size: 3, kind: 'spark', color: [255, 255, 255], rot: rand(0, 6), vr: rand(-4, 4), ax: null }, o, { max: o.life || 1 }));
  }
  function burst(x, y, colors, n, speed = 220, kind = 'spark', extra = {}) {
    const cnt = Math.round(n * fxScale());
    for (let i = 0; i < cnt; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(.25, 1) * speed;
      spawn(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(.7, 1.6), size: rand(1.5, 4), kind, color: Array.isArray(colors[0]) ? pick(colors) : colors }, extra));
    }
  }
  function drawStar(c, x, y, r) {
    c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill();
  }
  function drawHeart(c, x, y, r) {
    c.beginPath(); c.moveTo(x, y + r * .9);
    c.bezierCurveTo(x - r * 1.6, y - r * .2, x - r * .6, y - r * 1.4, x, y - r * .45);
    c.bezierCurveTo(x + r * .6, y - r * 1.4, x + r * 1.6, y - r * .2, x, y + r * .9); c.fill();
  }
  function updateFx(dt) {
    const c = fctx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, G.W, G.H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.ax != null) { p.vx += (p.ax - p.x) * 6 * dt; p.vy += (p.ay - p.y) * 6 * dt; }
      p.vx *= Math.pow(p.drag, dt * 60); p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const k = p.life / p.max, a = Math.min(1, k * 1.6);
      if (p.kind === 'spark' || p.kind === 'glow') {
        c.globalCompositeOperation = 'lighter';
        if (p.kind === 'glow') {
          const gg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          gg.addColorStop(0, rgba(p.color, a * .8)); gg.addColorStop(1, rgba(p.color, 0));
          c.fillStyle = gg; c.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8);
        } else { c.fillStyle = rgba(p.color, a); drawStar(c, p.x, p.y, p.size * (1 + .4 * Math.sin(p.rot * 3))); }
      } else {
        c.globalCompositeOperation = 'source-over';
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = rgba(p.color, a);
        if (p.kind === 'heart') drawHeart(c, 0, 0, p.size);
        else if (p.kind === 'scrap') c.fillRect(-p.size, -p.size * .6, p.size * 2, p.size * 1.2);
        else { c.scale(1, Math.abs(Math.sin(p.rot * 2)) + .2); c.fillRect(-p.size, -p.size * .5, p.size * 2, p.size); }
        c.restore();
      }
    }
    c.globalCompositeOperation = 'source-over';
  }


  /* =================================================================
     LA PIÈCE : décor, objets, lumière
     ================================================================= */
  // Dessins des objets (viewBox 0 0 100 100), en couleurs : la pièce
  // les affiche en gris tant qu'ils n'ont pas reçu leur couleur.
  const ICONS = {
    moon: '<circle cx="50" cy="50" r="40" fill="#fff3c4" opacity=".18"/><path d="M60 14a37 37 0 1 0 26 60 30 30 0 1 1-26-60z" fill="#f6e6a6"/><circle cx="40" cy="48" r="4" fill="#e6d48c"/><circle cx="52" cy="66" r="3" fill="#e6d48c"/>',
    star: '<path d="M50 6l11 30 32 2-25 20 9 32-27-18-27 18 9-32L7 38l32-2z" fill="#ffe28a"/>',
    frame1: '<rect x="6" y="6" width="88" height="88" rx="3" fill="#7a5235"/><rect x="15" y="15" width="70" height="70" fill="#cfe3f2"/><circle cx="50" cy="50" r="22" fill="#f0c9a5"/><circle cx="42" cy="44" r="2.6" fill="#333"/><circle cx="58" cy="44" r="2.6" fill="#333"/><path d="M50 56c-6-6-16-6-20 2 6-2 12 0 20 1 8-1 14-3 20-1-4-8-14-8-20-2z" fill="#3b2a1e"/><path d="M28 30c6-10 38-10 44 0-6-4-38-4-44 0z" fill="#6b4a2c"/>',
    frame2: '<rect x="6" y="6" width="88" height="88" rx="3" fill="#a0436a"/><rect x="15" y="15" width="70" height="70" fill="#fde4ec"/><circle cx="50" cy="50" r="22" fill="#f3cfb4"/><path d="M38 44q4-5 8 0M54 44q4-5 8 0" stroke="#333" stroke-width="2.4" fill="none"/><path d="M36 41l-3-3M64 41l3-3" stroke="#333" stroke-width="2"/><ellipse cx="37" cy="54" rx="5" ry="3" fill="#f59ab5"/><ellipse cx="63" cy="54" rx="5" ry="3" fill="#f59ab5"/><path d="M42 61q8 7 16 0q-8 3-16 0z" fill="#d6204f"/>',
    frame3: '<rect x="10" y="4" width="80" height="92" rx="3" fill="#5c4632"/><rect x="18" y="12" width="64" height="62" fill="#e8d6b8"/><circle cx="40" cy="38" r="8" fill="#a98c6a"/><path d="M28 72c0-14 24-14 24 0z" fill="#a98c6a"/><circle cx="62" cy="44" r="6" fill="#a98c6a"/><path d="M53 72c0-11 18-11 18 0z" fill="#a98c6a"/><rect x="18" y="78" width="64" height="10" fill="#efe3cc"/>',
    clock: '<circle cx="50" cy="50" r="40" fill="#efe6d2" stroke="#7a5235" stroke-width="7"/><path d="M50 50V26M50 50l15 10" stroke="#3a2a20" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#c0392b"/><g fill="#7a5235"><circle cx="50" cy="18" r="3"/><circle cx="82" cy="50" r="3"/><circle cx="50" cy="82" r="3"/><circle cx="18" cy="50" r="3"/></g>',
    plush: '<ellipse cx="38" cy="22" rx="8" ry="20" fill="#e9cfc6" transform="rotate(-12 38 22)"/><ellipse cx="62" cy="22" rx="8" ry="20" fill="#e9cfc6" transform="rotate(12 62 22)"/><ellipse cx="50" cy="72" rx="28" ry="22" fill="#e9cfc6"/><circle cx="50" cy="46" r="20" fill="#f3ded7"/><circle cx="43" cy="44" r="2.6" fill="#333"/><circle cx="57" cy="44" r="2.6" fill="#333"/><circle cx="31" cy="38" r="6" fill="#ff4d4d"/><circle cx="34" cy="29" r="6" fill="#ffb13f"/><circle cx="66" cy="29" r="6" fill="#4fc3ff"/><circle cx="69" cy="38" r="6" fill="#7bdc5a"/><circle cx="50" cy="51" r="4.2" fill="#e8202a"/><circle cx="48.6" cy="49.6" r="1.2" fill="#fff" opacity=".7"/><path d="M42 82l8-6 8 6-8 6z" fill="#ffd84f"/><path d="M40 84h20" stroke="#c9a59a" stroke-width="3"/><circle cx="66" cy="70" r="4" fill="#fff"/>',
    medallion: '<path d="M50 4v14" stroke="#b8902e" stroke-width="3"/><circle cx="50" cy="56" r="38" fill="#d8ad4b"/><circle cx="50" cy="56" r="30" fill="#2e4a6b"/><path d="M50 40c-10 4-20 2-28 10 8 2 16 0 22 4-6 2-12 4-16 10 8-1 14-4 22-12z" fill="#fff"/><path d="M50 40c10 4 20 2 28 10-8 2-16 0-22 4 6 2 12 4 16 10-8-1-14-4-22-12z" fill="#5b8bc2"/>',
    cap: '<path d="M14 60c0-30 18-44 36-44s36 14 36 44z" fill="#c0392b"/><path d="M50 16v44" stroke="#9e2c20" stroke-width="2"/><path d="M8 60h84c4 0 4 10-4 12H30c-14 0-22-4-22-12z" fill="#9e2c20"/><circle cx="50" cy="16" r="4" fill="#9e2c20"/>',
    note: '<rect x="14" y="12" width="72" height="78" rx="2" fill="#fff4b8" transform="rotate(-4 50 50)"/><circle cx="50" cy="14" r="5" fill="#d64545"/><path d="M26 36h46M26 50h46M26 64h32" stroke="#c7b46c" stroke-width="3" transform="rotate(-4 50 50)"/>',
    book: '<rect x="20" y="10" width="60" height="80" rx="4" fill="#7d5ba6"/><rect x="20" y="10" width="10" height="80" fill="#5d3f86"/><rect x="40" y="30" width="30" height="8" rx="2" fill="#e9dcf7"/>',
    strawberries: '<path d="M10 58h80c-4 22-20 32-40 32S14 80 10 58z" fill="#d9d4cc"/><path d="M10 58h80" stroke="#bdb6aa" stroke-width="3"/><g><path d="M30 34c-10 0-12 16 0 24 12-8 10-24 0-24z" fill="#e0324b"/><path d="M24 34l6-6 6 6z" fill="#3c9a4a"/></g><g><path d="M52 26c-12 0-14 20 0 30 14-10 12-30 0-30z" fill="#e8384f"/><path d="M45 27l7-8 7 8z" fill="#3c9a4a"/></g><g><path d="M72 36c-9 0-11 14 0 21 11-7 9-21 0-21z" fill="#d42c45"/><path d="M66 36l6-6 6 6z" fill="#3c9a4a"/></g>',
    console: '<path d="M18 36h64c10 0 16 10 14 26-2 14-10 18-18 12l-10-8H32l-10 8c-8 6-16 2-18-12-2-16 4-26 14-26z" fill="#4a4f5c"/><path d="M26 50h14M33 43v14" stroke="#cfd5e0" stroke-width="5" stroke-linecap="round"/><circle cx="66" cy="46" r="4.5" fill="#ff5a5f"/><circle cx="75" cy="54" r="4.5" fill="#3fa9ff"/><circle cx="57" cy="54" r="4.5" fill="#ffcc4d"/><circle cx="66" cy="62" r="4.5" fill="#6ad47a"/>',
    radio: '<path d="M30 30L70 8" stroke="#888" stroke-width="3"/><rect x="8" y="30" width="84" height="56" rx="8" fill="#b5653a"/><circle cx="34" cy="58" r="17" fill="#6e3b20"/><circle cx="34" cy="58" r="9" fill="#4a2615"/><rect x="58" y="42" width="26" height="12" rx="2" fill="#f2deb0"/><circle cx="64" cy="70" r="5" fill="#f2deb0"/><circle cx="78" cy="70" r="5" fill="#f2deb0"/>',
    lamp: '<path d="M30 6h40l12 30H18z" fill="#f2d48a"/><path d="M50 36v52" stroke="#6b6b6b" stroke-width="4"/><ellipse cx="50" cy="92" rx="18" ry="5" fill="#6b6b6b"/>',
    plant: '<path d="M30 64h40l-6 30H36z" fill="#c56a3a"/><path d="M50 64C48 44 34 34 22 34c4 14 14 22 28 30zM50 64c2-22 14-34 28-36-2 16-12 28-28 36zM50 64c-2-20 0-38 0-50 6 14 6 34 0 50z" fill="#4fae5f"/>',
    shelf: '<rect x="4" y="60" width="92" height="8" rx="2" fill="#8b6b4a"/><path d="M14 68v14M86 68v14" stroke="#6b4f35" stroke-width="5"/>',
    door: '<rect x="14" y="4" width="72" height="94" rx="4" fill="#4a3226"/><rect x="20" y="10" width="60" height="88" rx="2" class="door-leaf" fill="#8a5a3c"/><rect x="28" y="18" width="44" height="30" rx="2" fill="#7a4e33"/><rect x="28" y="56" width="44" height="34" rx="2" fill="#7a4e33"/><circle cx="70" cy="56" r="4" fill="#e3b54c"/>',
    sil: '<circle cx="50" cy="28" r="17" fill="currentColor"/><path d="M18 96c0-30 14-46 32-46s32 16 32 46z" fill="currentColor"/>'
  };

  // Disposition : x, y en % de l'écran, s = taille en vmin. L = paysage, P = portrait.
  const LAYOUT = {
    moon: { L: [80, 18, 9], P: [78, 14, 10] },
    frame1: { L: [13, 30, 12], P: [16, 30, 14] },
    frame2: { L: [29, 25, 11], P: [40, 31, 12] },
    frame3: { L: [45, 31, 10], P: [12, 47, 12] },
    clock: { L: [58, 20, 8], P: [36, 18, 9] },
    note: { L: [64, 45, 6], P: [62, 41, 7] },
    medallion: { L: [80, 47, 6], P: [75, 49, 7] },
    book: { L: [88, 48, 6], P: [86, 48, 7] },
    shelf: { L: [84, 55, 16], P: [80, 54, 20], decor: true },
    cap: { L: [6, 52, 8], P: [90, 64, 10] },
    lamp: { L: [5, 70, 15], P: [7, 75, 14], decor: true },
    plush: { L: [11, 89, 9], P: [10, 92, 11] },
    strawberries: { L: [34, 86, 8], P: [34, 90, 9] },
    console: { L: [70, 87, 9], P: [64, 90, 10] },
    radio: { L: [88, 79, 10], P: [86, 80, 11] },
    plant: { L: [26, 67, 11], P: [27, 71, 11], decor: true, hidden: true },
    door: { L: [50, 58, 24], P: [50, 58, 26], decor: true, hidden: true }
  };
  const STAR_POS = { L: [[8, 8], [22, 6], [52, 10], [38, 21], [94, 40]], P: [[9, 10], [27, 7], [52, 21], [7, 60], [93, 36]] };
  const SIL_ROW = { L: [16, 78, 52], P: [10, 90, 62] }; // x début, x fin, y
  const ROOM_GROUPS = {
    ch1: ['lamp', 'plush', 'rug'], ch2: ['window', 'moon', 'curtains'], ch3: ['shelf', 'book', 'medallion', 'note', 'clock'],
    p0: ['plant', 'star', 'strawberries'], p1: ['frame1', 'frame2', 'frame3', 'garland', 'console'], p2: ['wall', 'radio', 'cap'], p3: ['floor']
  };
  const OBJ = {};
  // Chaque dessin reçoit un modelé : un dégradé de lumière découpé à sa propre silhouette
  let volN = 0;
  function volumeSvg(icon) {
    const id = 'vm' + (volN++);
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120"><g class="vol-mask">${icon}</g></mask></defs>${icon}<rect class="vol" x="-10" y="-10" width="120" height="120" fill="url(#objVol)" mask="url(#${id})"/>`;
  }
  function groupOf(id) { for (const g in ROOM_GROUPS) if (ROOM_GROUPS[g].includes(id)) return g; return 'end'; }
  function isColored(id) {
    const s = SOUV.find((x) => x.object === id);
    if (s && SV.found.includes(s.id)) return true;
    return G.groups.has(groupOf(id)) || G.groups.has('end');
  }

  function buildRoom() {
    objectsEl.innerHTML = '';
    Object.keys(LAYOUT).forEach((id) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'obj mono'; b.dataset.id = id;
      b.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${id === 'door' ? ICONS[id] : volumeSvg(ICONS[id])}</svg>`;
      const s = SOUV.find((x) => x.object === id);
      b.setAttribute('aria-label', s ? 'Un objet de la pièce' : (id === 'door' ? 'Une porte' : 'Un élément du décor'));
      if (LAYOUT[id].decor && id !== 'door') b.tabIndex = -1;
      if (LAYOUT[id].hidden) b.hidden = true;
      b.addEventListener('click', (e) => { e.stopPropagation(); onObject(id, b); });
      objectsEl.appendChild(b); OBJ[id] = b;
    });
    STAR_POS.L.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'obj star mono'; b.dataset.id = 'star' + i;
      b.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${volumeSvg(ICONS.star)}</svg>`;
      b.setAttribute('aria-label', 'Une étoile');
      b.addEventListener('click', (e) => { e.stopPropagation(); onStar(i, b); });
      objectsEl.appendChild(b); OBJ['star' + i] = b;
    });
    P.forEach((p, i) => {
      const b = document.createElement('div');
      b.className = 'obj sil'; b.dataset.id = 'sil' + i;
      b.style.setProperty('--c', p.color);
      b.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${ICONS.sil}</svg>`;
      objectsEl.appendChild(b); OBJ['sil' + i] = b;
    });
    layoutRoom();
  }
  function placeObj(el, x, y, s) {
    el.style.left = x + '%'; el.style.top = y + '%';
    el.style.width = el.style.height = s + 'vmin';
  }
  function layoutRoom() {
    if (!OBJ.moon) return;
    const k = G.portrait ? 'P' : 'L';
    Object.keys(LAYOUT).forEach((id) => { const [x, y, s] = LAYOUT[id][k]; placeObj(OBJ[id], x, y, s); });
    STAR_POS[k].forEach(([x, y], i) => placeObj(OBJ['star' + i], x, y, G.portrait ? 5.5 : 4.2));
    const [x0, x1, y] = SIL_ROW[k];
    // les silhouettes se rangent de part et d'autre du centre, là où la porte apparaîtra
    const gapL = G.portrait ? 33 : 40, gapR = G.portrait ? 67 : 60, span = (gapL - x0) + (x1 - gapR);
    P.forEach((_, i) => {
      let d = P.length > 1 ? span * i / (P.length - 1) : span / 2;
      const x = d <= gapL - x0 ? x0 + d : gapR + (d - (gapL - x0));
      placeObj(OBJ['sil' + i], x, y, G.portrait ? 9 : 7);
    });
    roomDirty = true;
  }
  function refreshRoomColors() {
    Object.keys(OBJ).forEach((id) => {
      const el = OBJ[id];
      if (id.startsWith('sil')) { el.classList.toggle('lit', SV.people.includes(P[+id.slice(3)].id) || G.groups.has('end')); return; }
      const key = id.startsWith('star') ? 'star' : id;
      el.classList.toggle('mono', !isColored(key));
    });
    OBJ.plant.hidden = !(G.groups.has('p0') || G.groups.has('end'));
    G.tintTarget = ['ch1', 'ch2', 'ch3', 'p0', 'p1', 'p2', 'p3'].filter((g) => G.groups.has(g)).length / 7;
    if (G.groups.has('end')) G.tintTarget = 1;
    roomDirty = true;
  }
  function unlockGroup(g) { G.groups.add(g); refreshRoomColors(); }

  // Le décor dessiné : mur, sol, fenêtre, tapis, guirlande
  const roomCv = $('#room'), rctx = roomCv.getContext('2d');
  let roomDirty = true;
  const groupColor = (g, i) => hexToRgb(CHAPTER_COLORS[i % CHAPTER_COLORS.length]);
  function drawRoom(t) {
    const w = G.W, h = G.H, c = rctx, tint = G.tint;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const floorY = h * (G.portrait ? .74 : .7);
    const has = (g) => G.groups.has(g) || G.groups.has('end');
    // mur
    const wallBase = [58, 58, 62];
    const wallCol = has('p2') ? mix(wallBase, mix(hexToRgb(P[2] ? P[2].color : CHAPTER_COLORS[2]), [255, 255, 255], .35), .55) : mix(wallBase, [70, 62, 78], tint);
    let g = c.createLinearGradient(0, 0, 0, floorY);
    g.addColorStop(0, rgba(shade(wallCol, .75), 1)); g.addColorStop(1, rgba(wallCol, 1));
    c.fillStyle = g; c.fillRect(0, 0, w, floorY);
    // papier peint discret : fines rayures, plus claires au centre
    for (let x = 13; x < w; x += 26) {
      const a = .028 + .02 * (1 - Math.abs(x / w - .5) * 2);
      c.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; c.fillRect(Math.round(x), 0, 1, floorY);
    }
    // lumière du plafond : le haut du mur et les côtés restent dans l'ombre
    g = c.createRadialGradient(w * .5, floorY * .55, 0, w * .5, floorY * .55, Math.max(w, floorY) * .75);
    g.addColorStop(0, 'rgba(255,240,225,.07)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
    c.fillStyle = g; c.fillRect(0, 0, w, floorY);
    // ombre portée dans l'angle mur / sol
    g = c.createLinearGradient(0, floorY - 46, 0, floorY);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.32)');
    c.fillStyle = g; c.fillRect(0, floorY - 46, w, 46);
    // plinthe, avec son arête éclairée
    const skirt = Math.max(8, h * .012);
    c.fillStyle = rgba(shade(wallCol, .55), 1); c.fillRect(0, floorY - skirt, w, skirt);
    c.fillStyle = 'rgba(255,255,255,.10)'; c.fillRect(0, floorY - skirt, w, 1);
    // sol
    const floorBase = [44, 42, 44];
    const floorCol = has('p3') ? mix(floorBase, hexToRgb(P[3] ? P[3].color : CHAPTER_COLORS[3]), .45) : floorBase;
    g = c.createLinearGradient(0, floorY, 0, h);
    g.addColorStop(0, rgba(floorCol, 1)); g.addColorStop(1, rgba(shade(floorCol, .7), 1));
    c.fillStyle = g; c.fillRect(0, floorY, w, h - floorY);
    // lames du parquet en perspective : elles fuient vers le fond de la pièce
    c.lineWidth = 1;
    const fh = h - floorY, nb = G.portrait ? 9 : 13, stepTop = w / nb, stepBot = stepTop * 2.3;
    for (let i = -nb; i <= nb; i++) {
      const xt = w / 2 + i * stepTop, xb = w / 2 + i * stepBot;
      c.strokeStyle = 'rgba(0,0,0,.20)'; c.beginPath(); c.moveTo(xt, floorY); c.lineTo(xb, h); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.035)'; c.beginPath(); c.moveTo(xt + 1, floorY); c.lineTo(xb + 2, h); c.stroke();
    }
    c.strokeStyle = 'rgba(0,0,0,.12)';
    for (let i = 1; i < 6; i++) { const y = floorY + fh * Math.pow(i / 6, 1.6); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    // reflet doux au centre du sol, ombre au premier plan
    g = c.createRadialGradient(w * .5, floorY + fh * .25, 0, w * .5, floorY + fh * .25, w * .55);
    g.addColorStop(0, 'rgba(255,240,220,.06)'); g.addColorStop(1, 'rgba(255,240,220,0)');
    c.fillStyle = g; c.fillRect(0, floorY, w, fh);
    g = c.createLinearGradient(0, floorY, 0, floorY + 30);
    g.addColorStop(0, 'rgba(0,0,0,.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, floorY, w, 30);
    // tapis
    const rugCol = has('ch1') ? hexToRgb(CHAPTER_COLORS[0]) : [90, 90, 92];
    {
      const rx = w * (G.portrait ? .42 : .3), ry = fh * .28, rcx = w * .5, rcy = floorY + fh * .5, th = Math.max(3, ry * .07);
      // ombre portée puis épaisseur du tapis
      g = c.createRadialGradient(rcx, rcy + th * 2, ry * .4, rcx, rcy + th * 2, rx * 1.05);
      g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(rcx, rcy + th * 2, rx * 1.06, ry * 1.18, 0, 0, 7); c.fill();
      c.fillStyle = rgba(shade(rugCol, .5), 1);
      c.beginPath(); c.ellipse(rcx, rcy + th, rx, ry, 0, 0, 7); c.fill();
      g = c.createRadialGradient(rcx - rx * .2, rcy - ry * .35, 0, rcx, rcy, rx);
      g.addColorStop(0, rgba(mix(shade(rugCol, .8), [255, 255, 255], .12), 1)); g.addColorStop(1, rgba(shade(rugCol, .68), 1));
      c.fillStyle = g; c.beginPath(); c.ellipse(rcx, rcy, rx, ry, 0, 0, 7); c.fill();
      c.strokeStyle = rgba(mix(rugCol, [255, 255, 255], .3), .55); c.lineWidth = 2.5;
      c.beginPath(); c.ellipse(rcx, rcy, rx * .9, ry * .8, 0, 0, 7); c.stroke();
      c.strokeStyle = rgba(mix(rugCol, [255, 255, 255], .3), .25); c.lineWidth = 1;
      c.beginPath(); c.ellipse(rcx, rcy, rx * .84, ry * .72, 0, 0, 7); c.stroke();
    }
    // fenêtre
    const [wx, wy, ww, wh] = G.portrait ? [w * .58, h * .06, w * .38, h * .2] : [w * .67, h * .06, w * .25, h * .32];
    const night = has('ch2') ? [[26, 22, 70], [74, 46, 120]] : [[14, 14, 16], [34, 34, 38]];
    g = c.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, rgba(night[0], 1)); g.addColorStop(1, rgba(night[1], 1));
    c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
    c.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 14; i++) { const sx = wx + ((i * 73) % 100) / 100 * ww, sy = wy + ((i * 37) % 100) / 100 * wh; c.fillRect(sx, sy, 1.5, 1.5); }
    // reflet sur la vitre
    c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
    g = c.createLinearGradient(wx, wy, wx + ww, wy + wh);
    g.addColorStop(.25, 'rgba(255,255,255,0)'); g.addColorStop(.32, 'rgba(255,255,255,.07)'); g.addColorStop(.42, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
    // ombre intérieure : l'embrasure a de la profondeur
    g = c.createLinearGradient(0, wy, 0, wy + 14); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(wx, wy, ww, 14);
    c.restore();
    // cadre en bois, avec arêtes claire et sombre
    const fw = Math.max(6, Math.min(w, h) * .012);
    c.strokeStyle = '#5e4836'; c.lineWidth = fw; c.strokeRect(wx, wy, ww, wh);
    c.strokeStyle = 'rgba(255,230,200,.16)'; c.lineWidth = 1; c.strokeRect(wx - fw / 2, wy - fw / 2, ww + fw, wh + fw);
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.strokeRect(wx + fw / 2, wy + fw / 2, ww - fw, wh - fw);
    c.strokeStyle = '#5e4836'; c.lineWidth = fw * .5;
    c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
    // rebord de fenêtre
    c.fillStyle = '#6e5642'; c.fillRect(wx - fw * 1.6, wy + wh + fw / 2, ww + fw * 3.2, fw * .9);
    c.fillStyle = 'rgba(255,230,200,.18)'; c.fillRect(wx - fw * 1.6, wy + wh + fw / 2, ww + fw * 3.2, 1);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(wx - fw * 1.2, wy + wh + fw * 1.4, ww + fw * 2.4, fw * .8);
    // la nuit entre par la fenêtre une fois colorée
    if (has('ch2')) {
      g = c.createLinearGradient(0, wy, 0, floorY);
      g.addColorStop(0, 'rgba(170,180,255,.07)'); g.addColorStop(1, 'rgba(170,180,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx + ww, wy + wh); c.lineTo(wx + ww * .8, floorY); c.lineTo(wx - ww * .35, floorY); c.closePath(); c.fill();
    }
    // rideaux
    const curCol = has('ch2') ? hexToRgb(CHAPTER_COLORS[1]) : [96, 96, 100];
    c.fillStyle = rgba(curCol, .85);
    c.beginPath(); c.moveTo(wx - 14, wy - 8); c.quadraticCurveTo(wx + 8, wy + wh * .5, wx - 4, wy + wh + 16); c.lineTo(wx - 22, wy + wh + 16); c.lineTo(wx - 22, wy - 8); c.fill();
    c.beginPath(); c.moveTo(wx + ww + 14, wy - 8); c.quadraticCurveTo(wx + ww - 8, wy + wh * .5, wx + ww + 4, wy + wh + 16); c.lineTo(wx + ww + 22, wy + wh + 16); c.lineTo(wx + ww + 22, wy - 8); c.fill();
    // guirlande lumineuse
    if (has('p1')) {
      c.strokeStyle = 'rgba(40,30,30,.6)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, h * .03);
      for (let x = 0; x <= w; x += w / 8) c.quadraticCurveTo(x + w / 16, h * .07, x + w / 8, h * .03);
      c.stroke();
      for (let i = 0; i < 24; i++) {
        const x = (i + .5) * w / 24, y = h * .03 + Math.abs(Math.sin((x / (w / 8)) * Math.PI)) * h * .02 + 4;
        const col = hexToRgb(ALLP[i % ALLP.length] ? ALLP[i % ALLP.length].color : '#fff');
        const tw = .6 + .4 * Math.sin(t * 2 + i);
        const gg = c.createRadialGradient(x, y, 0, x, y, 10);
        gg.addColorStop(0, rgba(col, tw)); gg.addColorStop(1, rgba(col, 0));
        c.fillStyle = gg; c.fillRect(x - 10, y - 10, 20, 20);
      }
    }
    // voiles de couleur des proches déjà découverts
    c.globalCompositeOperation = 'screen';
    ALLP.forEach((p, i) => {
      if (!SV.people.includes(p.id) && !G.groups.has('end')) return;
      const a = (i / ALLP.length) * Math.PI * 2 + t * .04;
      const cx = w / 2 + Math.cos(a) * w * .35, cy = h * .45 + Math.sin(a) * h * .3;
      const gg = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .45);
      gg.addColorStop(0, rgba(p.rgb, .16)); gg.addColorStop(1, rgba(p.rgb, 0));
      c.fillStyle = gg; c.fillRect(0, 0, w, h);
    });
    c.globalCompositeOperation = 'source-over';
    // halo chaud de la lampe une fois allumée
    if (has('ch1') && OBJ.lamp) {
      const [lx, ly] = LAYOUT.lamp[G.portrait ? 'P' : 'L'];
      const px = lx / 100 * w, py = ly / 100 * h - Math.min(w, h) * .05;
      g = c.createRadialGradient(px, py, 0, px, py, Math.min(w, h) * .45);
      g.addColorStop(0, 'rgba(255,214,150,.20)'); g.addColorStop(1, 'rgba(255,214,150,0)');
      c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
    }
    // vignette : les bords de la pièce s'enfoncent dans l'ombre
    g = c.createRadialGradient(w * .5, h * .5, Math.min(w, h) * .35, w * .5, h * .5, Math.hypot(w, h) * .62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // grain
    if (grain) { c.globalAlpha = .4; c.fillStyle = grain; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
  }
  let grain = null;
  function makeGrain() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const x = cv.getContext('2d'), img = x.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 20; }
    x.putImageData(img, 0, 0); grain = rctx.createPattern(cv, 'repeat');
  }

  // L'obscurité, percée par la lampe du joueur et les lumières allumées
  const darkCv = $('#dark'), dctx = darkCv.getContext('2d');
  function drawDark() {
    const c = dctx, w = G.W, h = G.H;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, w, h);
    if (G.dark < .01) return;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = `rgba(5,5,7,${G.dark.toFixed(3)})`; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-out';
    const holes = G.lights.concat(G.lightOn ? [{ x: G.light.x, y: G.light.y, r: G.light.r, a: 1 }] : []);
    holes.forEach((L0) => {
      let L = L0;
      if (L0.id) { const [x, y] = objCenter(L0.id); L = { x, y, r: L0.r || G.light.r, a: L0.a == null ? 1 : L0.a }; }
      const gg = c.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 2);
      gg.addColorStop(0, `rgba(0,0,0,${L.a})`); gg.addColorStop(.45, `rgba(0,0,0,${L.a * .85})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gg; c.fillRect(L.x - L.r * 2, L.y - L.r * 2, L.r * 4, L.r * 4);
    });
    c.globalCompositeOperation = 'source-over';
  }
  const pctToPx = (x, y) => [x / 100 * G.W, y / 100 * G.H];
  function objCenter(id) {
    const el = OBJ[id]; if (!el) return [G.W / 2, G.H / 2];
    const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
  }
  // Petites lueurs sur les souvenirs pas encore trouvés (visibles dans le noir)
  let glimT = 0;
  function glimmers(dt) {
    glimT -= dt; if (glimT > 0) return;
    glimT = rand(.6, 1.4);
    if (G.modal) return;
    const hidden = SOUV.filter((s) => !SV.found.includes(s.id) && OBJ[s.object] && !OBJ[s.object].hidden);
    if (!hidden.length) return;
    const s = pick(hidden), [x, y] = objCenter(s.object);
    spawn({ x: x + rand(-14, 14), y: y + rand(-14, 14), vx: rand(-6, 6), vy: rand(-14, -4), life: rand(.8, 1.4), size: rand(1.2, 2.4), kind: 'spark', color: [255, 250, 230] });
  }

  /* =================================================================
     LE LAPIN, LES SPHÈRES, LA BOUCLE D'ANIMATION
     ================================================================= */
  const fx = $('#fx'), fctx = fx.getContext('2d');
  let DPR = 1;
  function resize() {
    G.W = innerWidth; G.H = innerHeight;
    const wasPortrait = G.portrait; G.portrait = G.H > G.W * 1.05;
    DPR = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75);
    [roomCv, darkCv, fx].forEach((cv) => { cv.width = Math.round(G.W * DPR); cv.height = Math.round(G.H * DPR); });
    G.light.r = clamp(Math.min(G.W, G.H) * .17, 62, 130);
    G.hs = hero.offsetWidth || Math.min(G.W * .46, G.H * .3, 240);
    const size = clamp(Math.round(Math.min(G.W, G.H) * .12), 44, 64);
    spheresEl.style.setProperty('--s', size + 'px');
    if (wasPortrait !== G.portrait || !objectsEl.children.length) layoutRoom();
    placeBunny(true);
    roomDirty = true;
  }

  // ---------- Le lapin ----------
  function placeBunny(instant) {
    const b = G.bunny;
    if (instant) bunny.style.transition = 'none';
    bunny.style.left = b.x + '%'; bunny.style.top = b.y + '%';
    bunny.style.setProperty('--bs', b.size + 'vmin');
    if (instant) { void bunny.offsetWidth; bunny.style.transition = ''; }
  }
  function bunnyShow(x, y, size) {
    Object.assign(G.bunny, { x, y, size: size || G.bunny.size });
    bunny.hidden = false; placeBunny(true);
  }
  function bunnyTo(x, y, opts = {}) {
    const b = G.bunny;
    const ms = opts.ms || clamp(Math.hypot(x - b.x, y - b.y) * 22, 400, 1600);
    bunny.style.setProperty('--move', ms + 'ms');
    Object.assign(b, { x, y }); if (opts.size) b.size = opts.size;
    bunny.classList.toggle('flip', x < parseFloat(bunny.style.left));
    bunny.classList.add('moving'); placeBunny(false);
    return new Promise((r) => setTimeout(() => { bunny.classList.remove('moving'); r(); }, ms));
  }
  function bunnyMood(cls, on = true) { bunny.classList.toggle(cls, on); }
  let sayT = 0;
  function bunnySay(text, ms = 2600) {
    if (!text) return;
    bunnySayEl.textContent = text; bunnySayEl.classList.add('show');
    clearTimeout(sayT); sayT = setTimeout(() => bunnySayEl.classList.remove('show'), ms);
  }
  function placeBunnySay() {
    if (!bunnySayEl.classList.contains('show') || bunny.hidden) return;
    const r = bunny.getBoundingClientRect();
    const hw = bunnySayEl.offsetWidth / 2 + 10;
    const x = clamp(r.left + r.width / 2, hw, G.W - hw), y = Math.max(bunnySayEl.offsetHeight + 60, r.top - 8);
    bunnySayEl.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -100%)`;
  }
  function bunnyCenter() { const r = bunny.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * .45]; }
  function bunnyColor(hex) {
    const c = hexToRgb(hex);
    const tone = (t) => rgba(mix([255, 255, 255], c, t), 1);
    bunny.style.setProperty('--fur0', tone(.28)); bunny.style.setProperty('--fur1', tone(.38));
    bunny.style.setProperty('--fur2', tone(.48)); bunny.style.setProperty('--fur3', tone(.2));
    bunny.style.setProperty('--inner', tone(.75)); bunny.style.setProperty('--blush', tone(.85));
    bunny.classList.add('colored');
  }

  // ---------- Les sphères ----------
  const SPH = new Map();
  function sphereOf(p) {
    if (SPH.has(p.id)) return SPH.get(p.id);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sphere';
    b.setAttribute('aria-label', `Écouter ${p.name}`);
    b.style.setProperty('--c', p.color);
    b.style.setProperty('--cd', rgba(shade(p.rgb, .62), 1));
    b.style.setProperty('--cg', rgba(p.rgb, .45));
    b.innerHTML = `<span class="core"></span><span class="gloss"></span><span class="sym">${esc(p.symbol || '')}</span><span class="nm">${esc(p.name)}</span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); onSphere(p); });
    spheresEl.appendChild(b);
    const s = { p, el: b, x: G.W / 2, y: G.H / 2, s: .2, mode: 'hidden', tx: 0, ty: 0, ts: 1 };
    SPH.set(p.id, s);
    return s;
  }
  function sphereMode(p, mode, from) {
    const s = sphereOf(p);
    if (from) { s.x = from[0]; s.y = from[1]; s.s = .2; }
    s.mode = mode; s.el.dataset.mode = mode; s.el.classList.toggle('in', mode !== 'hidden');
    return s;
  }
  function skySlot(p) {
    const n = ALLP.length, i = ALLP.indexOf(p);
    const x = G.W * lerp(.18, .82, n > 1 ? i / (n - 1) : .5);
    const y = G.H * (G.portrait ? .2 : .17) + (i % 2) * G.H * .04;
    return [x, y];
  }
  function heartPoint(a) {
    const s = Math.sin(a);
    return [16 * s * s * s, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))];
  }
  function updateSpheres(dt, t) {
    const cx = G.W / 2, cy = G.H * .5, k = 1 - Math.exp(-dt * (G.calm ? 6 : 2.4));
    const inHeart = [...SPH.values()].filter((s) => s.mode === 'heart');
    SPH.forEach((s) => {
      if (s.mode === 'hidden') return;
      let tx = cx, ty = cy, ts = 1;
      if (s.mode === 'focus') { tx = cx; ty = G.H * (G.portrait ? .27 : .26); ts = 1.8; }
      else if (s.mode === 'side') { tx = G.W * .5; ty = G.H * .24; ts = 1.1; }
      else if (s.mode === 'sky') { [tx, ty] = skySlot(s.p); ts = .62; }
      else if (s.mode === 'heart') {
        const i = inHeart.indexOf(s), n = inHeart.length;
        const [hx, hy] = heartPoint((i / n) * Math.PI * 2 + (G.calm ? 0 : t * .2));
        const sc = Math.min(G.W * .4, G.H * .3) / 16.5;
        tx = cx + hx * sc; ty = cy + hy * sc - sc * 1.5; ts = .9;
      } else if (s.mode === 'center') { tx = cx; ty = cy; ts = 1.4; }
      if (!G.calm) ty += Math.sin(t * 1.3 + s.p.i * 1.7) * 5;
      s.x += (tx - s.x) * k; s.y += (ty - s.y) * k; s.s += (ts - s.s) * k;
      s.el.style.transform = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) scale(${s.s.toFixed(3)})`;
      if (Math.random() < dt * 3 * fxScale()) {
        const r = 20 * s.s, a = rand(0, 6.28);
        spawn({ x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r, vx: rand(-10, 10), vy: rand(-26, -6), life: rand(.6, 1.2), size: rand(1.2, 2.6), kind: 'spark', color: s.p.rgb });
      }
    });
  }

  // ---------- Boucle ----------
  let last = performance.now(), roomAcc = 0;
  const frameHooks = new Set();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    G.dark += (G.darkTarget - G.dark) * (1 - Math.exp(-dt * 1.2));
    const tintBefore = G.tint;
    G.tint += (G.tintTarget - G.tint) * (1 - Math.exp(-dt * 1.2));
    if (!G.light.moved && !G.calm) {
      G.light.x = G.W / 2 + Math.sin(t * .4) * G.W * .25;
      G.light.y = G.H * .62 + Math.sin(t * .31) * G.H * .12;
    }
    roomAcc += dt;
    const animated = G.groups.has('p1') || SV.people.length || G.groups.has('end');
    if (roomDirty || Math.abs(G.tint - tintBefore) > .0005 || (animated && roomAcc > 1 / 24)) { drawRoom(t); roomDirty = false; roomAcc = 0; }
    drawDark();
    updateSpheres(dt, t);
    placeBunnySay();
    glimmers(dt);
    const c = fctx; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    updateFx(dt);
    frameHooks.forEach((f) => f(dt, now));
    parallax(dt);
    idleCheck(now);
    requestAnimationFrame(frame);
  }

  // Profondeur : le décor glisse très légèrement avec la lumière (le mur moins que les objets)
  const par = { x: 0, y: 0 };
  const objLayer = $('#objects');
  function parallax(dt) {
    if (G.calm) { if (par.x || par.y) { par.x = par.y = 0; roomCv.style.transform = objLayer.style.transform = ''; } return; }
    const tx = clamp((G.light.x / G.W - .5) * 2, -1, 1), ty = clamp((G.light.y / G.H - .5) * 2, -1, 1);
    const k = 1 - Math.exp(-dt * 2.2);
    par.x += (tx - par.x) * k; par.y += (ty - par.y) * k;
    roomCv.style.transform = `translate3d(${(-par.x * 5).toFixed(2)}px, ${(-par.y * 3).toFixed(2)}px, 0) scale(1.02)`;
    objLayer.style.transform = `translate3d(${(-par.x * 9).toFixed(2)}px, ${(-par.y * 5).toFixed(2)}px, 0)`;
  }

  // Petites icônes au trait, toutes sur la même grille de 24 px
  const ICO = {
    souv: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9.5" cy="10" r="1.6"/><path d="M5 17l4.5-4 3 2.5L16 12l3 3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19s-7-4.3-7-9.2A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.2C19 14.7 12 19 12 19z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l1.9 5.1L19 11l-5.1 1.9L12 18l-1.9-5.1L5 11l5.1-1.9z"/></svg>'
  };

  // ---------- HUD : l'album et ses compteurs ----------
  function updateHud() {
    const any = SV.found.length || SV.people.length || SV.secrets.length || SV.reveals.length;
    albumBtn.hidden = !any;
    const parts = [];
    if (SV.found.length) parts.push(['souv', `${SV.found.length}/${SOUV.length}`, 'Souvenirs']);
    if (SV.people.length) parts.push(['heart', `${SV.people.length}/${ALLP.length}`, 'Personnes']);
    if (SV.secrets.length) parts.push(['spark', `${SV.secrets.length}/${SECRET_IDS().length}`, 'Secrets']);
    hudEl.innerHTML = parts.map(([ic, v, l]) => `<span class="hud-i" title="${l}">${ICO[ic]}<b>${v}</b></span>`).join('');
  }
  function pulseHud() { retrigger(albumBtn, 'ping'); }

  /* =================================================================
     CARTES : souvenir, album, panneau d'épreuve, mot final
     ================================================================= */
  function photoHTML(src, emoji, color, label) {
    const ph = `<div class="ph-empty" style="--c:${esc(color || '#bbb')}"><span>${esc(emoji || '✦')}</span><em>${esc(label || TX.photoSoon || 'photo à venir')}</em></div>`;
    if (!src) return ph;
    return `<img src="${esc(src)}" alt="" onerror="this.outerHTML=this.dataset.fb" data-fb="${esc(ph)}">`;
  }

  // Carte souvenir : une photo apparaît, un petit texte s'écrit, puis elle repart
  function showMemo(m) {
    return new Promise((resolve) => {
      G.modal = 'memo';
      $('#memoPhoto').innerHTML = photoHTML(m.photo, m.emoji, m.color, m.photoLabel);
      // une photo en hauteur (un papier, un portrait) s'affiche en entier
      const mp = $('#memoPhoto'), mi = mp.querySelector('img');
      mp.classList.remove('tall');
      if (mi) { const fit = () => mp.classList.toggle('tall', mi.naturalHeight > mi.naturalWidth * 1.1); if (mi.complete) fit(); else mi.addEventListener('load', fit, { once: true }); }
      $('#memoTag').textContent = m.tag || '';
      $('#memoTitle').textContent = m.title || '';
      $('#memoBack').textContent = m.back || '';
      const acts = $('#memoActions'); acts.innerHTML = '';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button'; closeBtn.className = 'pill dark'; closeBtn.textContent = TX.close || 'Fermer';
      (m.buttons || []).forEach((bt) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pill dark ghost'; b.textContent = bt.label;
        b.addEventListener('click', (e) => { e.stopPropagation(); bt.fn(); });
        acts.appendChild(b);
      });
      acts.appendChild(closeBtn);
      memo.querySelector('.memo-card').style.setProperty('--tilt', rand(-3, 3).toFixed(1) + 'deg');
      memo.hidden = false; retrigger(memo, 'open');
      const txt = $('#memoText');
      type(txt, m.text || '', { speed: 22 });
      const done = () => {
        stopVoice();
        memo.classList.remove('open'); memo.classList.add('closing');
        setTimeout(() => { memo.hidden = true; memo.classList.remove('closing'); G.modal = null; resolve(); }, G.calm ? 50 : 420);
      };
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); done(); }, { once: true });
      if (m.voice) setTimeout(() => playVoice(m.voice, { captionEl: $('#memoBack') }), 600);
    });
  }

  // ---------- Album ----------
  const SECRET_IDS = () => ['moon', 'combo', 'idle', 'tickle', 'angry', 'bonus'].concat(P.filter((p) => p.secretAudio || p.secretCaption).map((p) => 'star-' + p.id));
  function addSecret(id) {
    if (SV.secrets.includes(id)) return false;
    SV.secrets.push(id); save(); pulseHud();
    narrateSoft('secretFound');
    return true;
  }
  function openAlbum() {
    if (G.modal && G.modal !== 'album') return;
    G.modal = 'album';
    $('#albumTitle').textContent = TX.album || 'Ton album';
    $('#albumClose').textContent = TX.close || 'Fermer';
    $('#albumStats').textContent = `${TX.albumSouvenirs || 'Souvenirs'} ${SV.found.length}/${SOUV.length}  ·  ${TX.albumPeople || 'Personnes'} ${SV.people.length}/${ALLP.length}  ·  ${TX.albumSecrets || 'Secrets'} ${SV.secrets.length}/${SECRET_IDS().length}`;
    const grid = $('#albumGrid'); grid.innerHTML = '';
    const section = (title) => { const h = document.createElement('h3'); h.textContent = title; grid.appendChild(h); const d = document.createElement('div'); d.className = 'album-row'; grid.appendChild(d); return d; };
    const tile = (row, opts) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'album-tile' + (opts.locked ? ' locked' : '');
      b.style.setProperty('--c', opts.color || '#ddd');
      const ph = !opts.locked && opts.memo && opts.memo.photo;
      if (ph) b.classList.add('has-img');
      b.innerHTML = opts.locked ? `<span class="t-emo">?</span><span class="t-cap">${esc(TX.albumEmpty || 'Encore caché…')}</span>`
        : (ph ? `<span class="t-img"><img src="${esc(ph)}" alt="" loading="lazy" onerror="this.closest('.album-tile').classList.remove('has-img');this.parentNode.remove()"></span>` : '') + `<span class="t-emo">${esc(opts.emoji || '✦')}</span><span class="t-cap">${esc(opts.title)}</span>`;
      if (!opts.locked) b.addEventListener('click', () => { albumEl.hidden = true; G.modal = null; showMemo(opts.memo).then(() => openAlbum()); });
      else b.disabled = true;
      row.appendChild(b);
    };
    let row = section(TX.albumSouvenirs || 'Souvenirs');
    SOUV.forEach((s) => tile(row, SV.found.includes(s.id) ? { emoji: s.symbol, title: s.title, memo: souvMemo(s) } : { locked: true }));
    const revs = LAYERS.map((l, i) => ({ l, i })).filter(({ l, i }) => SV.reveals.includes(i) && l.reveal && ['photo', 'phrase', 'souvenir'].includes(l.reveal.kind));
    if (revs.length) {
      row = section('Le cadeau');
      revs.forEach(({ l }) => tile(row, { emoji: l.reveal.kind === 'phrase' ? '❝' : '📷', title: l.name, memo: revealMemo(l) }));
    }
    row = section(TX.albumPeople || 'Personnes');
    ALLP.forEach((p) => tile(row, SV.people.includes(p.id) ? { emoji: p.symbol, title: p.name, color: p.color, memo: personMemo(p, true) } : { locked: true }));
    if (SV.viewers && C.viewers && (C.viewers.messages || []).length) {
      row = section(C.viewers.title || 'Le chat');
      C.viewers.messages.forEach((v, i) => tile(row, { emoji: '💬', title: v.name, color: chatColor(v, i), memo: { emoji: '💬', color: chatColor(v, i), title: v.name, text: v.text, tag: '💬', photoLabel: ' ' } }));
    }
    const heard = NARR && NARR.lines ? Object.keys(NARR.lines).filter((k) => SV.narr.includes(k) && NARR.lines[k].audio) : [];
    if (heard.length) {
      row = section(`${TX.albumNarrator || 'La voix de'} ${NARR.name}`);
      const col = ORGA ? ORGA.color : '#ff8fbf';
      heard.forEach((k) => { const l = NARR.lines[k]; tile(row, { emoji: '🎙️', title: l.text[0], color: col, memo: { emoji: '🎙️', color: col, title: `${NARR.name} · ${NARR.label || ''}`, text: l.text.join(' '), tag: '🎙️', photoLabel: ' ', voice: { audio: l.audio, caption: '' } } }); });
    }
    const sec = SV.secrets.map(secretLabel).filter(Boolean);
    if (sec.length) {
      row = section(TX.albumSecrets || 'Secrets');
      sec.forEach((s) => tile(row, { emoji: '✦', title: s.title, memo: { title: s.title, text: s.text, photo: s.photo || null, emoji: '✦', voice: s.voice, tag: 'Secret' } }));
    }
    albumEl.hidden = false;
  }
  function closeAlbum() { albumEl.hidden = true; G.modal = null; }
  function secretLabel(id) {
    if (id === 'moon') return { title: 'La lune', text: SECRETS.moonMessage };
    if (id === 'combo') return { title: 'La combinaison', text: SECRETS.comboMessage };
    if (id === 'idle') return { title: 'Patience', text: SECRETS.idleMessage };
    if (id === 'tickle') return { title: 'Chatouilles', text: SECRETS.tickleMessage };
    if (id === 'angry') return { title: 'Le lapin fâché', text: SECRETS.angryMessage };
    if (id === 'bonus') return { title: (SECRETS.bonus && SECRETS.bonus.title) || 'Bonus', text: SECRETS.bonus && SECRETS.bonus.text, photo: SECRETS.bonus && SECRETS.bonus.photo };
    if (id.startsWith('star-')) { const p = P.find((x) => 'star-' + x.id === id); return p && { title: `${TX.secretVoice || 'Un message secret'} · ${p.name}`, text: p.secretCaption, voice: { audio: p.secretAudio, caption: p.secretCaption } }; }
    return null;
  }
  const souvMemo = (s) => ({ photo: s.photo, emoji: s.symbol, title: s.title, text: s.text, back: s.digit != null ? `Au dos, un chiffre : ${s.digit}` : '', tag: s.symbol, voice: s.music ? { audio: s.music, caption: '' } : null });
  const revealMemo = (l) => ({ photo: l.reveal.photo, emoji: l.reveal.kind === 'phrase' ? '❝' : '📷', title: l.reveal.title || l.name, text: l.reveal.text, tag: l.name, photoLabel: l.reveal.kind === 'phrase' ? ' ' : null });
  function personMemo(p, withVoice) {
    const buttons = [];
    if (withVoice) {
      buttons.push({ label: TX.listen || 'Écouter', fn: () => playVoice({ audio: p.audio, caption: p.caption }, { captionEl: $('#memoBack') }) });
      if (SV.secrets.includes('star-' + p.id)) buttons.push({ label: TX.secretVoice || 'Message secret', fn: () => playVoice({ audio: p.secretAudio, caption: p.secretCaption }, { captionEl: $('#memoBack') }) });
    }
    const mem = memOf(p), first = mem && mem.images && mem.images.length ? imgOf(mem.images[0]) : {};
    return { photo: p.photo || first.src || null, emoji: p.symbol, color: p.color, title: `${p.name} · ${(mem && mem.title) || p.object || ''}`, text: (mem && mem.text) || p.memory || p.caption, back: withVoice ? (p.joke || '') : (p.hint ? `${TX.hintLabel || 'Un petit indice'} : ${p.hint}` : ''), tag: p.symbol, buttons };
  }

  // ---------- Panneau des épreuves ----------
  let skipOfferT = 0;
  function openPanel(title, cls) {
    G.modal = 'panel';
    panel.className = cls || '';
    $('#panelTitle').textContent = title || '';
    $('#panelBody').innerHTML = ''; $('#panelFoot').innerHTML = '';
    panel.hidden = false;
    return $('#panelBody');
  }
  function closePanel() { clearTimeout(skipOfferT); panel.hidden = true; G.modal = null; }
  function offerSkip(onSkip, foot) {
    clearTimeout(skipOfferT);
    skipOfferT = setTimeout(() => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'link'; b.textContent = TX.skipGame || 'Passer l\'épreuve';
      b.addEventListener('click', onSkip, { once: true });
      (foot || $('#panelFoot')).appendChild(b);
    }, (T.skipGameAfter || 40) * 1000);
  }

  // ---------- Mot final ----------
  let writeTimer = 0;
  function showCard(instant) {
    return new Promise((resolve) => {
      clearInterval(writeTimer); stopVoice();
      G.modal = 'card';
      const fc = C.finalCard || {};
      $('#cardTitle').textContent = fc.title || '';
      $('#cardSign').textContent = fc.signature || '';
      const box = $('#cardText'); box.innerHTML = '';
      const spans = [];
      (fc.paragraphs || []).forEach((para) => {
        const pEl = document.createElement('p');
        for (const ch of fill(para)) { const s = document.createElement('span'); s.textContent = ch; pEl.appendChild(s); spans.push(s); }
        box.appendChild(pEl);
      });
      const actions = $('#cardActions'); actions.innerHTML = '';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pill dark'; b.textContent = TX.close || 'Fermer';
      b.addEventListener('click', (e) => { e.stopPropagation(); card.hidden = true; G.modal = null; resolve(); }, { once: true });
      actions.appendChild(b); actions.classList.remove('show');
      card.hidden = false;
      const finish = () => { clearInterval(writeTimer); spans.forEach((s) => s.classList.add('w')); actions.classList.add('show'); card._finish = null; };
      card._finish = finish;
      if (instant || G.calm) { finish(); return; }
      let i = 0;
      const per = Math.max(1, Math.round(16 / T.handwritingSpeed));
      writeTimer = setInterval(() => {
        for (let k = 0; k < per && i < spans.length; k++) spans[i++].classList.add('w');
        if (i >= spans.length) finish();
      }, Math.max(16, T.handwritingSpeed));
    });
  }

  // ---------- Écran noir ----------
  async function blackIn(text) {
    blackout.hidden = false; void blackout.offsetWidth; blackout.classList.add('on');
    await wait(dur(1200));
    if (text) await type($('#blackText'), text, { speed: 70 });
  }
  async function blackOut() {
    setLine($('#blackText'), '');
    blackout.classList.remove('on');
    await wait(dur(1200)); blackout.hidden = true;
  }
  async function chapter(title) {
    if (!title) return;
    setLine(lineTop, ''); setLine(lineBottom, '');
    chapterEl.textContent = title; retrigger(chapterEl, 'show');
    sfx.magic();
    await wait(dur(2600));
    chapterEl.classList.remove('show');
    await wait(dur(500));
  }

  /* =================================================================
     LES ÉPREUVES
     Chaque épreuve renvoie une promesse résolue quand elle est réussie.
     Aucune ne peut bloquer : des gestes simples finissent par compter,
     et « Passer l'épreuve » apparaît après un moment.
     ================================================================= */
  const GAME_HELP = {
    ribbon: ['Tire sur le nœud pour le dénouer', 'Glisse ton doigt depuis le nœud vers l\'extérieur'],
    paper: ['Frotte le papier pour le déchirer', 'Frotte le cadeau avec ton doigt, comme un ticket à gratter'],
    timing: ['Touche l\'écran quand le cercle de lumière rejoint le cadeau', ''],
    charge: ['Garde le doigt appuyé sur le cadeau pour le remplir de lumière', ''],
    puzzle: ['Touche deux morceaux pour les échanger', ''],
    code: ['', ''],
    memory: ['Retrouve les paires', ''],
    constellation: ['Relie les étoiles dans l\'ordre : suis celle qui scintille', ''],
    music: ['Écoute la mélodie, puis rejoue-la', ''],
    seek: ['Trouve les 5 objets cachés dans le noir', ''],
    catch: ['Attrape les lumières qui s\'échappent', '']
  };
  function runGame(kind, ctx = {}) {
    const fn = { ribbon: giftGame, paper: giftGame, timing: giftGame, charge: giftGame, puzzle: puzzleGame, code: codeGame, memory: memoryGame, constellation: constellationGame, music: musicGame, seek: seekGame, catch: catchGame }[kind] || giftGame;
    G.game = kind;
    return fn(kind, ctx).then(() => { G.game = null; });
  }

  /* ---------- Épreuves sur le cadeau (ruban, papier, rythme, charge) ---------- */
  const R = { active: false, t0: 0, misses: 0, flash: -1e9, ok: false };
  const CH = { on: false, v: 0, nextNote: 0 };
  const ptr = { down: false, sx: 0, sy: 0, lx: 0, ly: 0, moved: 0, t0: 0, pulled: false };
  const heroC = () => { const r = hero.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * .55]; };
  const nearHero = (x, y, f) => { const [cx, cy] = heroC(); return Math.hypot(x - cx, y - cy) < G.hs * f; };

  function giftGame(kind, ctx) {
    return new Promise((resolve) => {
      const need = ctx.n || (kind === 'charge' ? 1 : 3);
      const gg = G.gg = { kind, need, count: 0, taps: 0, rub: 0, busy: false, ctx, resolve };
      type(lineBottom, GAME_HELP[kind][0]);
      if (kind === 'ribbon') showHand('pull');
      if (kind === 'paper') showHand('rub');
      if (kind === 'timing') { R.active = true; R.t0 = performance.now() + 600; R.misses = 0; }
      if (kind === 'charge') { CH.v = 0; CH.on = false; }
      const skip = setTimeout(() => {
        if (G.gg !== gg) return;
        skipBtn.hidden = false; skipBtn.dataset.mode = 'game';
      }, (T.skipGameAfter || 40) * 1000);
      gg.end = () => { clearTimeout(skip); skipBtn.hidden = true; skipBtn.dataset.mode = ''; };
    });
  }
  function gameStep(px, py) {
    const gg = G.gg; if (!gg) return;
    gg.count++;
    const [x, y] = heroC();
    retrigger(gift, gg.count % 2 ? 'tap' : 'tap2');
    burst(px || x, py || y - G.hs * .1, [255, 255, 255], 12, 150);
    if (gg.ctx.onStep) gg.ctx.onStep(gg.count, gg.need);
    if (gg.count >= gg.need) { finishGiftGame(); return true; }
    return false;
  }
  function finishGiftGame() {
    const gg = G.gg; if (!gg) return;
    G.gg = null; R.active = false; CH.on = false; hideHand(); gift.classList.remove('charging');
    gg.end && gg.end();
    gg.resolve();
  }
  function ribbonPull() {
    const gg = G.gg; gg.busy = true; hideHand();
    sfx.whoosh(); sfx.paper();
    const bow = gift.querySelector('.g-bow'); if (bow) { bow.classList.remove('tug'); bow.getBoundingClientRect(); bow.classList.add('tug'); }
    const [x, y] = heroC();
    burst(x, y - G.hs * .35, [255, 230, 160], 18, 200);
    if (!gameStep()) setTimeout(() => { gg.busy = false; }, 450);
  }
  function paperTear(px, py) {
    const gg = G.gg; gg.busy = true; hideHand();
    sfx.paper();
    for (let i = 0; i < 10 * fxScale() + 2; i++) spawn({ x: px, y: py, vx: rand(-160, 160), vy: rand(-240, -60), g: 520, drag: .985, life: rand(.9, 1.4), size: rand(3, 6), kind: 'scrap', color: [235, 205, 215] });
    if (!gameStep(px, py)) setTimeout(() => { gg.busy = false; }, 250);
  }
  function tapFallback() {
    const gg = G.gg; if (!gg || gg.busy) return;
    gg.taps++;
    retrigger(gift, 'giggle'); sfx.pop();
    if (gg.taps === 2) { say(GAME_HELP[gg.kind][1], 3000); showHand(gg.kind === 'ribbon' ? 'pull' : 'rub'); }
    if (gg.taps >= 5) { gg.taps = 3; const [x, y] = heroC(); if (gg.kind === 'ribbon') ribbonPull(); else paperTear(x, y); }
  }
  const ringPeriod = () => (G.calm ? 2400 : 1800);
  const ringTarget = () => G.hs * .62;
  function ringRadius(now) {
    if (now < R.t0) return -1;
    const k = ((now - R.t0) % ringPeriod()) / ringPeriod();
    return lerp(G.hs * 1.5, G.hs * .12, k);
  }
  function rhythmTap() {
    const gg = G.gg; if (!R.active || !gg || gg.busy) return;
    const now = performance.now(), r = ringRadius(now);
    const tol = G.hs * (.12 + .045 * Math.min(R.misses, 5));
    R.flash = now;
    if (r > 0 && Math.abs(r - ringTarget()) <= tol) {
      R.ok = true; R.t0 = now + 650;
      sfx.chime(gg.count + 2);
      const [x, y] = heroC(); burst(x, y, [255, 255, 255], 30, 260);
      gg.busy = true;
      if (!gameStep()) setTimeout(() => { gg.busy = false; }, 500);
    } else {
      R.ok = false; R.misses++;
      if (R.misses === 1 || R.misses % 4 === 0) narrateSoft('timingMiss', { repeat: true, drop: true });
      sfx.pop(); retrigger(gift, 'giggle');
      say(pick(['Presque !', 'Un poil trop tôt…', 'Réessaie !']), 1200);
    }
  }
  frameHooks.add((dt, now) => {
    const gg = G.gg; if (!gg) return;
    const c = fctx, [x, y] = heroC();
    if (gg.kind === 'timing' && R.active) {
      const tr = ringTarget(), r = ringRadius(now);
      c.save();
      c.setLineDash([4, 8]); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.5)';
      c.beginPath(); c.arc(x, y, tr, 0, 7); c.stroke(); c.setLineDash([]);
      if (r > 0) {
        const near = clamp(1 - Math.abs(r - tr) / (G.hs * .5), 0, 1);
        c.lineWidth = 3 + near * 4; c.strokeStyle = `rgba(255,255,255,${.35 + near * .6})`;
        c.shadowColor = '#fff'; c.shadowBlur = 10 + near * 20;
        c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
      }
      const fa = 1 - (now - R.flash) / 450;
      if (fa > 0) { c.shadowBlur = 0; c.lineWidth = 10 * fa; c.strokeStyle = R.ok ? `rgba(255,255,255,${fa})` : `rgba(140,140,150,${fa * .8})`; c.beginPath(); c.arc(x, y, tr, 0, 7); c.stroke(); }
      c.restore();
    }
    if (gg.kind === 'charge') {
      CH.v = clamp(CH.v + dt * (CH.on ? 1 / (G.calm ? 2 : 2.6) : -.3), 0, 1);
      hero.style.setProperty('--charge', CH.v.toFixed(3));
      gift.classList.toggle('charging', CH.on);
      if (CH.on) {
        if (now > CH.nextNote && A.ctx) { A.bell(mtof(60 + Math.round(CH.v * 24)), A.ctx.currentTime + .01, .6, .05); CH.nextNote = now + 220; }
        if (Math.random() < dt * 30 * fxScale()) { const a = rand(0, 6.28), rr = G.hs * rand(1, 1.6); spawn({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, ax: x, ay: y, drag: .9, life: 1, size: rand(1.5, 3), kind: 'spark', color: [255, 255, 255] }); }
      }
      c.save(); c.lineWidth = 6; c.lineCap = 'round';
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.arc(x, y, G.hs * .7, 0, 7); c.stroke();
      if (CH.v > .005) { c.strokeStyle = 'rgba(255,255,255,.95)'; c.shadowColor = '#fff'; c.shadowBlur = 18; c.beginPath(); c.arc(x, y, G.hs * .7, -Math.PI / 2, -Math.PI / 2 + CH.v * Math.PI * 2); c.stroke(); }
      c.restore();
      if (CH.v >= 1) { CH.on = false; gameStep(); }
    }
  });
  function giftPtrDown(e) {
    const gg = G.gg; if (!gg || G.modal) return;
    Object.assign(ptr, { down: true, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: 0, t0: performance.now(), pulled: false });
    if (gg.kind === 'timing') rhythmTap();
    if (gg.kind === 'charge' && nearHero(e.clientX, e.clientY, .95)) { CH.on = true; hideHand(); }
  }
  function giftPtrMove(e) {
    const gg = G.gg; if (!gg || !ptr.down) return;
    const d = Math.hypot(e.clientX - ptr.lx, e.clientY - ptr.ly);
    ptr.lx = e.clientX; ptr.ly = e.clientY; ptr.moved += d;
    if (gg.busy) return;
    if (gg.kind === 'ribbon' && !ptr.pulled && nearHero(ptr.sx, ptr.sy, .85) && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > Math.max(60, G.hs * .3)) { ptr.pulled = true; ribbonPull(); }
    if (gg.kind === 'paper' && nearHero(e.clientX, e.clientY, .75)) {
      gg.rub += d;
      if (Math.random() < .25) spawn({ x: e.clientX, y: e.clientY, vx: rand(-60, 60), vy: rand(-120, -20), g: 400, drag: .98, life: .7, size: rand(2, 4), kind: 'scrap', color: [220, 200, 210] });
      if (gg.rub >= Math.max(260, G.hs * 1.3)) { gg.rub = 0; paperTear(e.clientX, e.clientY); }
    }
  }
  function giftPtrUp() {
    const gg = G.gg; if (!ptr.down) return;
    ptr.down = false;
    if (!gg) return;
    if (gg.kind === 'charge') CH.on = false;
    const isTap = ptr.moved < 14 && performance.now() - ptr.t0 < 450;
    if (isTap && (gg.kind === 'ribbon' || gg.kind === 'paper') && nearHero(ptr.sx, ptr.sy, .85)) tapFallback();
  }
  function giftKey(e) {
    const gg = G.gg; if (e.detail !== 0 || !gg || gg.busy) return;
    const [x, y] = heroC();
    if (gg.kind === 'ribbon') ribbonPull();
    else if (gg.kind === 'paper') paperTear(x, y);
    else if (gg.kind === 'timing') { R.misses = 9; R.t0 = performance.now() - ringPeriod() * .58; rhythmTap(); }
    else if (gg.kind === 'charge') CH.v = Math.min(1, CH.v + .34);
  }
  const hand = document.createElement('div'); hand.id = 'hand'; hand.hidden = true; hero.appendChild(hand);
  function showHand(kind) { hand.className = ''; hand.hidden = false; void hand.offsetWidth; hand.className = kind; }
  function hideHand() { hand.hidden = true; hand.className = ''; }

  /* ---------- Puzzle : remettre une image en place ---------- */
  async function puzzleImage(ctx) {
    if (ctx.photo) return ctx.photo;
    try { await Promise.race([document.fonts.load('600 40px Caveat'), wait(1500)]); } catch (e) { /* police de repli */ }
    const cv = document.createElement('canvas'); cv.width = cv.height = 420;
    const c = cv.getContext('2d');
    if (ctx.letter) {
      c.fillStyle = '#f6efe4'; c.fillRect(0, 0, 420, 420);
      c.strokeStyle = 'rgba(80,60,90,.12)'; for (let y = 60; y < 420; y += 40) { c.beginPath(); c.moveTo(20, y); c.lineTo(400, y); c.stroke(); }
      c.fillStyle = '#3b2d45'; c.font = '600 40px Caveat, "Segoe Print", cursive'; c.textAlign = 'center';
      (ctx.lines || ['Pour toi,', 'tout ce qu\'on', 'n\'a jamais su', 'dire en une', 'seule fois ♡']).forEach((l, i) => c.fillText(l, 210, 92 + i * 66));
      c.fillStyle = '#e35d7a'; c.beginPath(); c.arc(360, 380, 18, 0, 7); c.fill();
    } else {
      const col = hexToRgb(ctx.color || '#f7a8c8');
      const g = c.createLinearGradient(0, 0, 420, 420); g.addColorStop(0, rgba(mix(col, [255, 255, 255], .5), 1)); g.addColorStop(1, rgba(shade(col, .6), 1));
      c.fillStyle = g; c.fillRect(0, 0, 420, 420);
      c.font = '200px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ctx.symbol || '✦', 210, 220);
    }
    return cv.toDataURL();
  }
  function puzzleGame(kind, ctx) {
    return new Promise(async (resolve) => {
      const body = openPanel(ctx.title || 'Le puzzle', 'p-puzzle');
      const src = await puzzleImage(ctx);
      const help = document.createElement('p'); help.className = 'panel-help'; help.textContent = GAME_HELP.puzzle[0];
      const grid = document.createElement('div'); grid.className = 'puzzle';
      body.appendChild(grid); body.appendChild(help);
      let order = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      if (order.every((v, i) => v === i)) order = [1, 0, 2, 3, 4, 5, 6, 8, 7];
      let sel = -1;
      const render = () => {
        grid.innerHTML = '';
        order.forEach((piece, pos) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'pz' + (piece === pos ? ' ok' : '') + (sel === pos ? ' sel' : '');
          b.style.backgroundImage = `url("${src}")`;
          b.style.backgroundPosition = `${(piece % 3) * 50}% ${Math.floor(piece / 3) * 50}%`;
          b.setAttribute('aria-label', `Morceau ${pos + 1}`);
          b.addEventListener('click', () => {
            if (sel < 0) { sel = pos; sfx.pop(); render(); return; }
            if (sel !== pos) { [order[sel], order[pos]] = [order[pos], order[sel]]; sfx.paper(); }
            sel = -1; render();
            if (order.every((v, i) => v === i)) { sfx.chime(2); grid.classList.add('solved'); setTimeout(() => { closePanel(); resolve(); }, 1100); }
          });
          grid.appendChild(b);
        });
      };
      render();
      offerSkip(() => { closePanel(); resolve(); });
    });
  }

  /* ---------- Code : la serrure du coffre ---------- */
  function codeGame(kind, ctx) {
    return new Promise((resolve) => {
      const ids = (C.code && C.code.souvenirs) || SOUV.slice(0, 4).map((s) => s.id);
      const items = ids.map(souvById).filter(Boolean);
      const answer = items.map((s) => String(s.digit != null ? s.digit : 0));
      const vals = items.map(() => 0);
      let wrong = 0;
      const build = () => {
        const body = openPanel(TX.lockTitle || 'Trouve le code', 'p-code');
        const help = document.createElement('p'); help.className = 'panel-help'; help.textContent = TX.lockHint || '';
        const row = document.createElement('div'); row.className = 'lock';
        items.forEach((s, i) => {
          const col = document.createElement('div'); col.className = 'lock-col';
          const sym = document.createElement('button'); sym.type = 'button'; sym.className = 'lock-sym'; sym.textContent = s.symbol || '?';
          sym.setAttribute('aria-label', 'Voir ce souvenir');
          sym.addEventListener('click', () => {
            if (SV.found.includes(s.id)) { panel.hidden = true; showMemo(souvMemo(s)).then(() => { panel.hidden = false; G.modal = 'panel'; }); }
            else say(TX.lockMissing || 'Ce souvenir est encore caché dans la pièce.', 2600);
          });
          const up = document.createElement('button'); up.type = 'button'; up.className = 'lock-btn'; up.textContent = '▲'; up.setAttribute('aria-label', 'Chiffre suivant');
          const dg = document.createElement('output'); dg.className = 'lock-digit'; dg.textContent = vals[i];
          const dn = document.createElement('button'); dn.type = 'button'; dn.className = 'lock-btn'; dn.textContent = '▼'; dn.setAttribute('aria-label', 'Chiffre précédent');
          up.addEventListener('click', () => { vals[i] = (vals[i] + 1) % 10; dg.textContent = vals[i]; sfx.pop(); });
          dn.addEventListener('click', () => { vals[i] = (vals[i] + 9) % 10; dg.textContent = vals[i]; sfx.pop(); });
          col.append(sym, up, dg, dn); row.appendChild(col);
        });
        const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'pill'; ok.textContent = 'Ouvrir';
        ok.addEventListener('click', () => {
          if (vals.join('') === answer.join('')) {
            sfx.chime(4); row.classList.add('open'); type(help, TX.lockOpen || 'CLIC !');
            setTimeout(() => { closePanel(); resolve(); }, 1200);
          } else {
            wrong++; sfx.pop(); retrigger(row, 'shake');
            help.textContent = wrong >= 4 ? fill(TX.lockHelp, { code: answer.join(' — ') }) : (TX.lockWrong || 'Ce n\'est pas ça…');
            if (wrong >= 4) bunnySay(fill(TX.lockHelp, { code: answer.join(' — ') }), 5000);
          }
        });
        const search = document.createElement('button'); search.type = 'button'; search.className = 'pill ghost'; search.textContent = TX.lockSearch || 'Chercher dans la pièce';
        search.addEventListener('click', () => {
          closePanel();
          const back = document.createElement('button'); back.type = 'button'; back.className = 'pill floating'; back.textContent = '🔒 ' + (ctx.title || 'Le coffre');
          back.addEventListener('click', () => { back.remove(); build(); }, { once: true });
          app.appendChild(back);
        });
        const actions = document.createElement('div'); actions.className = 'panel-actions'; actions.append(ok, search);
        body.append(row, help, actions);
      };
      build();
    });
  }

  /* ---------- Mémoire : retrouver les paires ---------- */
  function memoryGame(kind, ctx) {
    return new Promise((resolve) => {
      const body = openPanel(ctx.title || 'Mémoire', 'p-memory');
      const pool = [...new Set(ALLP.map((p) => p.symbol).concat(SOUV.map((s) => s.symbol)).filter(Boolean))];
      const syms = shuffle(pool).slice(0, 6);
      if (ctx.symbol && !syms.includes(ctx.symbol)) syms[0] = ctx.symbol;
      const deck = shuffle(syms.concat(syms));
      const grid = document.createElement('div'); grid.className = 'mem';
      const help = document.createElement('p'); help.className = 'panel-help'; help.textContent = GAME_HELP.memory[0];
      let open = [], matched = 0, lock = false;
      deck.forEach((sym) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'mem-card';
        b.innerHTML = `<span class="back">✦</span><span class="face">${esc(sym)}</span>`;
        b.setAttribute('aria-label', 'Carte');
        b.addEventListener('click', () => {
          if (lock || b.classList.contains('flip')) return;
          b.classList.add('flip'); sfx.pop(); open.push({ b, sym });
          if (open.length === 2) {
            lock = true;
            const [a, c] = open;
            if (a.sym === c.sym) {
              setTimeout(() => { a.b.classList.add('done'); c.b.classList.add('done'); sfx.chime(matched); matched++; open = []; lock = false; if (matched === syms.length) setTimeout(() => { closePanel(); resolve(); }, 900); }, 350);
            } else setTimeout(() => { a.b.classList.remove('flip'); c.b.classList.remove('flip'); open = []; lock = false; }, 850);
          }
        });
        grid.appendChild(b);
      });
      body.append(grid, help);
      offerSkip(() => { closePanel(); resolve(); });
    });
  }

  /* ---------- Constellation : relier les étoiles ---------- */
  function constellationGame(kind, ctx) {
    return new Promise((resolve) => {
      const body = openPanel(ctx.title || 'Constellation', 'p-sky');
      const pts = [[50, 82], [22, 56], [24, 30], [38, 22], [50, 34], [62, 22], [76, 30], [78, 56]];
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.classList.add('sky');
      const path = document.createElementNS(ns, 'polyline'); path.setAttribute('class', 'sky-line'); path.style.stroke = ctx.color || '#fff';
      svg.appendChild(path);
      for (let i = 0; i < 26; i++) { const d = document.createElementNS(ns, 'circle'); d.setAttribute('cx', rand(2, 98)); d.setAttribute('cy', rand(2, 98)); d.setAttribute('r', rand(.2, .5)); d.setAttribute('class', 'sky-dust'); svg.appendChild(d); }
      let next = 0; const done = [];
      const stars = pts.map(([x, y], i) => {
        const g = document.createElementNS(ns, 'g'); g.setAttribute('class', 'sky-star' + (i === 0 ? ' next' : ''));
        g.innerHTML = `<circle cx="${x}" cy="${y}" r="7" fill="transparent"/><circle cx="${x}" cy="${y}" r="2.2" class="dot"/>`;
        g.addEventListener('click', () => {
          if (i !== next) { retrigger(g, 'nope'); return; }
          sfx.chime(i); done.push(`${x},${y}`); next++;
          g.classList.remove('next'); g.classList.add('on');
          path.setAttribute('points', done.concat(next === pts.length ? [`${pts[0][0]},${pts[0][1]}`] : []).join(' '));
          if (stars[next]) stars[next].classList.add('next');
          if (next === pts.length) { svg.classList.add('solved'); svg.style.setProperty('--c', ctx.color || '#fff'); sfx.magic(); setTimeout(() => { closePanel(); resolve(); }, 1500); }
        });
        svg.appendChild(g); return g;
      });
      const help = document.createElement('p'); help.className = 'panel-help'; help.textContent = GAME_HELP.constellation[0];
      body.append(svg, help);
      offerSkip(() => { closePanel(); resolve(); });
    });
  }

  /* ---------- Musique : rejouer la mélodie ---------- */
  function musicGame(kind, ctx) {
    return new Promise((resolve) => {
      const body = openPanel(ctx.title || 'La mélodie', 'p-music');
      const notes = [72, 76, 79, 84], cols = ['#ff8fbf', '#9b6bff', '#3fa9ff', '#ffcc4d'];
      const pads = document.createElement('div'); pads.className = 'pads';
      const help = document.createElement('p'); help.className = 'panel-help';
      let seq = [], pos = 0, listening = false, round = 0, fails = 0;
      const btns = notes.map((m, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'pad'; b.style.setProperty('--c', cols[i]);
        b.setAttribute('aria-label', `Note ${i + 1}`);
        b.addEventListener('click', () => {
          if (!listening) return;
          play(i);
          if (seq[pos] !== i) { fails++; listening = false; help.textContent = 'Oups… écoute encore.'; setTimeout(() => playSeq(), 900); return; }
          pos++;
          if (pos === seq.length) { listening = false; round++; if (round >= 2) { help.textContent = 'Bravo !'; sfx.magic(); setTimeout(() => { closePanel(); resolve(); }, 1000); } else { help.textContent = 'Bien ! Une de plus…'; setTimeout(() => newRound(), 900); } }
        });
        pads.appendChild(b); return b;
      });
      function play(i) {
        if (A.ctx) A.bell(mtof(notes[i]), A.ctx.currentTime + .01, 1, .12);
        retrigger(btns[i], 'lit');
      }
      async function playSeq() {
        listening = false; help.textContent = 'Écoute…';
        await wait(500);
        for (const i of seq) { play(i); await wait(G.calm ? 700 : 560); }
        pos = 0; listening = true; help.textContent = 'À toi !';
      }
      function newRound() {
        const len = Math.max(2, 3 + round - Math.floor(fails / 3));
        seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4));
        G.melody = seq;
        playSeq();
      }
      body.append(pads, help);
      newRound();
      offerSkip(() => { closePanel(); resolve(); });
    });
  }

  /* ---------- Cherche-et-trouve : 5 objets cachés dans le noir ---------- */
  function seekGame(kind, ctx) {
    return new Promise((resolve) => {
      const n = 5, before = G.darkTarget;
      G.darkTarget = .96; G.lightOn = true;
      type(lineBottom, GAME_HELP.seek[0]);
      let got = 0;
      const tokens = [];
      for (let i = 0; i < n; i++) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'token';
        b.textContent = ctx.symbol || '✦'; b.setAttribute('aria-label', 'Objet caché');
        // jamais caché derrière le cadeau, le lapin ou un autre objet
        const blockers = [hero, bunny].filter((el) => !el.hidden).map((el) => el.getBoundingClientRect())
          .concat(tokens.map((t) => t.getBoundingClientRect()));
        let x = 50, y = 60;
        for (let k = 0; k < 40; k++) {
          x = rand(8, 92); y = rand(G.portrait ? 30 : 24, 88);
          const px = x / 100 * G.W, py = y / 100 * G.H;
          if (!blockers.some((r) => px > r.left - 30 && px < r.right + 30 && py > r.top - 30 && py < r.bottom + 30)) break;
        }
        b.style.left = x + '%'; b.style.top = y + '%';
        b.addEventListener('click', (e) => {
          e.stopPropagation(); if (b.classList.contains('got')) return;
          b.classList.add('got'); got++; sfx.chime(got);
          const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, hexToRgb(ctx.color || '#fff'), 20, 160);
          type(lineBottom, `${got} / ${n}`);
          if (got === n) { setTimeout(() => { tokens.forEach((t) => t.remove()); G.darkTarget = before; resolve(); }, 700); }
        });
        objectsEl.appendChild(b); tokens.push(b);
      }
      setTimeout(() => {
        if (got >= n) return;
        skipBtn.hidden = false; skipBtn.dataset.mode = 'seek';
        skipBtn.onclick = () => { skipBtn.onclick = null; skipBtn.hidden = true; tokens.forEach((t) => t.remove()); G.darkTarget = before; resolve(); };
      }, (T.skipGameAfter || 40) * 1000);
    });
  }

  /* ---------- Attraper les lumières ---------- */
  function catchGame(kind, ctx) {
    return new Promise((resolve) => {
      const n = 5; let got = 0;
      type(lineBottom, GAME_HELP.catch[0]);
      const col = hexToRgb(ctx.color || '#fff');
      const wisps = [];
      for (let i = 0; i < n; i++) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wispy'; b.style.setProperty('--c', ctx.color || '#fff');
        b.setAttribute('aria-label', 'Une lumière');
        const w = { b, ph: rand(0, 6.28), sp: rand(.25, .4), x: G.W / 2, y: G.H / 2 };
        b.addEventListener('click', (e) => {
          e.stopPropagation(); if (b.classList.contains('got')) return;
          b.classList.add('got'); got++; sfx.chime(got); burst(w.x, w.y, col, 24, 180);
          if (got === n) { frameHooks.delete(move); setTimeout(() => { wisps.forEach((x) => x.b.remove()); resolve(); }, 500); }
        });
        spheresEl.appendChild(b); wisps.push(w);
      }
      const move = (dt, now) => {
        const t = now / 1000;
        wisps.forEach((w, i) => {
          if (w.b.classList.contains('got')) return;
          const tx = G.W / 2 + Math.sin(t * w.sp + w.ph) * (G.W / 2 - 50), ty = G.H / 2 + Math.sin(t * w.sp * .8 + w.ph * 1.7 + i) * (G.H / 2 - 130);
          w.x += (tx - w.x) * .03; w.y += (ty - w.y) * .03;
          w.b.style.transform = `translate3d(${w.x.toFixed(1)}px,${w.y.toFixed(1)}px,0)`;
        });
      };
      frameHooks.add(move);
    });
  }

  /* =================================================================
     LES SCÈNES DES PROCHES
     Chaque proche laisse une trace différente : photos, un mot qui claque,
     une nuit qui défile, un café et un crâne derrière la vitre…
     ================================================================= */
  const sceneEl = $('#scene');
  const memOf = (p) => (C.memories || []).find((m) => m.participant === p.id) || null;
  const imgOf = (it) => (typeof it === 'string' ? { src: it } : (it || {}));

  // L'apparition de la sphère, propre à chacun
  function sphereEntrance(p, s) {
    const kind = p.animation || 'burst';
    s.el.classList.add('anim-' + kind);
    const [x, y] = [s.x, s.y];
    if (kind === 'burst') { burst(x, y, [p.rgb, [255, 255, 255]], 110, 360); sfx.open(); }
    else if (kind === 'sparkles') {
      sfx.sparkle(8);
      const until = performance.now() + 3200;
      const hook = (dt, now) => {
        if (now > until) { frameHooks.delete(hook); return; }
        if (Math.random() < dt * 40 * fxScale()) { const a = rand(0, 6.28), r = rand(30, 90); spawn({ x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r, vx: rand(-20, 20), vy: rand(-40, -10), life: rand(.6, 1.2), size: rand(2, 4), kind: 'spark', color: Math.random() < .5 ? p.rgb : [255, 255, 255] }); }
      };
      frameHooks.add(hook);
    } else { sfx.magic(); burst(x, y, p.rgb, 40, 200); }
  }

  async function showName(p) {
    chapterEl.style.color = p.color;
    chapterEl.textContent = `${p.symbol || ''} ${p.name}`.trim(); retrigger(chapterEl, 'show');
    await sleep(1700);
    chapterEl.classList.remove('show');
    await wait(dur(500));
    chapterEl.style.color = '';
  }

  function openScene(kind, p, m) {
    sceneEl.className = 'sc-' + kind;
    sceneEl.style.setProperty('--c', p.color);
    sceneEl.style.setProperty('--cg', rgba(p.rgb, .45));
    sceneEl.innerHTML = `<div class="sc-bg"></div><div class="sc-stage"></div>
      <div class="sc-copy"><p class="sc-title"></p><p class="sc-text"></p><p class="sc-hint"></p></div>`;
    sceneEl.hidden = false; void sceneEl.offsetWidth; sceneEl.classList.add('on'); app.classList.add('scening');
    if (m.title) $('#scene .sc-title').textContent = m.title;
    return $('#scene .sc-stage');
  }
  async function closeScene() {
    sceneEl.classList.remove('on', 'dim'); app.classList.remove('scening');
    await wait(dur(700));
    sceneEl.hidden = true; sceneEl.innerHTML = '';
  }
  const add = (parent, cls, html) => { const d = document.createElement('div'); d.className = cls; if (html != null) d.innerHTML = html; parent.appendChild(d); return d; };

  // Une photo-souvenir posée au milieu de la scène (le décor passe derrière)
  async function polaroid(stage, p, m) {
    const imgs = (m.images || []).map(imgOf).filter((it) => it.src);
    if (!imgs.length) return;
    [...stage.children].forEach((c) => c.classList.add('sc-back'));
    const it = imgs[0];
    const ph = add(stage, 'sc-photo sc-solo', `<div class="sc-pic">${photoHTML(it.src, it.emoji || '📷', p.color, ' ')}</div><span>${esc(it.label || '')}</span>`);
    ph.style.setProperty('--r', rand(-4, 4).toFixed(1) + 'deg');
    void ph.offsetWidth; ph.classList.add('in'); sfx.paper();
    await sleep(1800);
  }

  // ---------- Galerie : les photos arrivent une à une ----------
  async function sceneGallery(p, m, stage) {
    const imgs = (m.images || []).map(imgOf);
    const row = add(stage, 'sc-photos');
    for (let i = 0; i < imgs.length; i++) {
      const it = imgs[i];
      const ph = add(row, 'sc-photo', `<div class="sc-pic">${photoHTML(it.src, it.emoji || '📷', p.color, ' ')}</div><span>${esc(it.label || '')}</span>`);
      ph.style.setProperty('--r', (i % 2 ? 5 : -5) + rand(-2, 2) + 'deg');
      void ph.offsetWidth; ph.classList.add('in'); sfx.paper();
      await sleep(1300);
    }
    await type($('#scene .sc-text'), m.text || '', { speed: 30 });
    const r = row.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, [p.rgb, [255, 255, 255]], 70, 300); sfx.chime(3);
    await sleep(1500);
  }

  // ---------- Texte, puis un mot qui claque ----------
  async function sceneText(p, m, stage) {
    await sleep(500);
    await polaroid(stage, p, m);
    await type($('#scene .sc-text'), m.text || '', { speed: 32 });
    await sleep(900);
    if (m.flash) {
      const f = add(stage, 'sc-flash'); f.textContent = m.flash;
      app.classList.remove('quake'); void app.offsetWidth; app.classList.add('quake');
      sfx.rumble(); sfx.pop();
      const [cx, cy] = [G.W / 2, G.H * .42];
      burst(cx, cy, [p.rgb, [255, 255, 255]], 60, 380);
      if (!bunny.hidden) { retrigger(bunny, 'jump'); bunnySay('😳', 1400); }
      await sleep(1500);
      f.classList.add('away'); sfx.giggle();
      await sleep(900);
      app.classList.remove('quake');
    }
  }

  // ---------- La nuit : l'horloge tourne, les mots flottent ----------
  async function sceneNight(p, m, stage) {
    add(stage, 'sc-stars', Array.from({ length: 40 }, () => `<i style="left:${rand(0, 100).toFixed(1)}%;top:${rand(0, 70).toFixed(1)}%;animation-delay:${rand(0, 3).toFixed(2)}s"></i>`).join(''));
    add(stage, 'sc-moon', '🌙');
    const clock = add(stage, 'sc-clock');
    const times = m.clock && m.clock.length ? m.clock : ['01:00', '03:00', '05:00'];
    await sleep(700);
    for (const t of times) {
      clock.textContent = t; retrigger(clock, 'tick'); sfx.chime(times.indexOf(t) + 1);
      await sleep(1300);
    }
    const words = m.words || [];
    const spots = [[22, 50], [76, 48], [28, 64], [72, 62], [50, 56], [18, 74], [82, 74]];
    for (let i = 0; i < words.length; i++) {
      const w = add(stage, 'sc-word'); w.textContent = words[i];
      const [x, y] = spots[i % spots.length];
      w.style.left = x + '%'; w.style.top = y + '%'; w.style.animationDelay = (i * .2) + 's';
      void w.offsetWidth; w.classList.add('in'); sfx.sparkle(3);
      await sleep(800);
    }
    await polaroid(stage, p, m);
    await type($('#scene .sc-text'), m.text || '', { speed: 30 });
    await sleep(1400);
  }

  // ---------- Le café, la fenêtre, le crâne ----------
  async function sceneCafe(p, m, stage) {
    const room = add(stage, 'sc-cafe-room');
    const win = add(room, 'sc-window', `<div class="sc-rain">${'<i></i>'.repeat(18)}</div><div class="sc-street"></div>`);
    win.querySelectorAll('.sc-rain i').forEach((r) => { r.style.left = rand(0, 100) + '%'; r.style.animationDelay = rand(0, 1.2) + 's'; });
    add(room, 'sc-cup', '☕<span class="sc-steam"><i></i><i></i><i></i></span>');
    add(room, 'sc-table');
    await sleep(1300);
    // le crâne apparaît derrière la vitre
    // le crâne derrière la vitre : sa photo si elle existe, sinon le symbole
    const face = (m.images || []).map(imgOf).find((it) => it.src);
    const emo = esc(m.symbol || p.symbol || '💀');
    const sk = add(win, 'sc-skull' + (face ? ' has-face' : ''), face
      ? `<span><img src="${esc(face.src)}" alt="" onerror="this.parentNode.textContent='${emo}';this.closest('.sc-skull').classList.remove('has-face')"></span><b class="sc-shine"></b>`
      : `<span>${emo}</span><b class="sc-shine"></b>`);
    void sk.offsetWidth; sk.classList.add('in'); sfx.surprise();
    await sleep(1200);
    // zoom dramatique
    room.classList.add('zoom'); stage.classList.add('drama');
    sfx.rumble();
    if (A.ctx) { const t = A.ctx.currentTime + .05; A.bell(mtof(43), t, 1.4, .16); A.bell(mtof(42), t + .45, 1.4, .16); A.bell(mtof(38), t + .9, 2.4, .2); }
    await sleep(2000);
    // petit effet comique : le crâne fait « boing » et brille
    sk.classList.add('boing'); sfx.giggle();
    await sleep(700);
    for (const [i, line] of (m.lines || []).entries()) {
      const l = add(room, 'sc-sticker'); l.textContent = line;
      l.style.top = (53 + i * 9) + '%'; l.style.left = (i % 2 ? 58 : 42) + '%';
      l.style.setProperty('--r', rand(-8, 8).toFixed(1) + 'deg');
      void l.offsetWidth; l.classList.add('in'); sfx.pop();
      if (/huil/i.test(line)) { sk.classList.add('oily'); sfx.sparkle(6); }
      await sleep(1300);
    }
    room.classList.remove('zoom'); stage.classList.remove('drama');
    await sleep(600);
    burst(G.W / 2, G.H * .4, [p.rgb, [255, 150, 200], [255, 255, 255]], 50, 260);
    await polaroid(stage, p, m);
    await type($('#scene .sc-text'), m.text || '', { speed: 30 });
    await sleep(1400);
  }

  const SCENES = { gallery: sceneGallery, text: sceneText, night: sceneNight, animation: sceneCafe };
  async function personScene(p) {
    const m = memOf(p);
    if (!m) { await showMemo(personMemo(p, false)); return false; }
    const kind = SCENES[m.type] ? m.type : 'text';
    const stage = openScene(kind, p, m);
    showSkip(true);
    await SCENES[kind](p, m, stage);
    if (p.hint) { const h = $('#scene .sc-hint'); h.textContent = `${TX.hintLabel || 'Un petit indice'} : ${p.hint}`; h.classList.add('in'); await sleep(2200); }
    showSkip(false);
    sceneEl.classList.add('dim');
    return true;
  }

  /* =================================================================
     LE CHAT DU LIVE : les messages des viewers, comme dans un vrai chat
     ================================================================= */
  const VIEW = C.viewers || null;
  const CHAT_COLORS = ['#ff5fa2', '#a77bff', '#3fd0ff', '#ffb547', '#4fe08a', '#ff7a59', '#ffe066', '#6ea8ff'];
  const chatColor = (v, i) => v.color || CHAT_COLORS[i % CHAT_COLORS.length];
  async function chapterViewers() {
    const msgs = (VIEW && VIEW.messages) || [];
    if (!msgs.length) return;
    G.cine = true;
    setLine(lineTop, ''); setLine(lineBottom, '');
    await type(lineTop, TX.notAll); await wait(dur(700));
    if (VIEW.intro) { await type(lineBottom, VIEW.intro, { speed: 34 }); await wait(dur(1400)); }
    setLine(lineTop, ''); setLine(lineBottom, '');
    const col = { color: '#9146FF', rgb: [145, 70, 255] };
    const stage = openScene('chat', col, {});
    const box = add(stage, 'sc-chatbox', `<div class="sc-chathead"><span class="sc-live">● LIVE</span><b></b><span class="sc-count">💬 0</span></div><div class="sc-chatlog" aria-live="polite"></div><button type="button" class="sc-next">${esc(TX.next || 'Suivant')} ›</button>`);
    box.querySelector('b').textContent = VIEW.title || 'Le chat';
    const log = box.querySelector('.sc-chatlog'), next = box.querySelector('.sc-next'), count = box.querySelector('.sc-count');
    let advance = null;
    const go = () => { if (advance) advance(); };
    next.addEventListener('click', (e) => { e.stopPropagation(); go(); });
    log.addEventListener('click', go);
    const emotes = ['💜', '❤️', '🎂', '🥳', '🔥', '👑'];
    const floatEmote = () => {
      const e = add(stage, 'sc-emote'); e.textContent = emotes[Math.floor(rand(0, emotes.length))];
      e.style.left = rand(70, 94).toFixed(1) + '%'; e.style.animationDuration = rand(2.4, 3.6).toFixed(2) + 's';
      setTimeout(() => e.remove(), 4000);
    };
    showSkip(true);
    await sleep(700);
    for (let i = 0; i < msgs.length; i++) {
      const v = msgs[i];
      [...log.children].forEach((c) => c.classList.add('old'));
      const d = add(log, 'sc-msg', `<b style="color:${esc(chatColor(v, i))}">${esc(v.name || '')}</b><span class="sc-colon">:</span> <span class="sc-mtext"></span>`);
      d.querySelector('.sc-mtext').textContent = v.text || '';
      if (v.audio) d.insertAdjacentHTML('beforeend', `<span class="sc-vocal"><i>🎙️</i><span class="sc-bars">${'<i></i>'.repeat(14)}</span><small>${esc(TX.voiceMsg || 'message vocal')}</small></span>`);
      void d.offsetWidth; d.classList.add('in'); sfx.pop();
      count.textContent = `💬 ${i + 1}`;
      log.scrollTo({ top: log.scrollHeight, behavior: G.calm ? 'auto' : 'smooth' });
      for (let k = 0; k < 3; k++) setTimeout(floatEmote, k * 350);
      if (v.audio) {
        await sleep(600);
        d.classList.add('playing');
        const voice = playVoice({ audio: v.audio, caption: v.text || '' }, { captionEl: d.querySelector('.sc-mtext') });
        await Promise.race([voice, new Promise((r) => { advance = r; })]);
        stopVoice(); d.classList.remove('playing');
      } else {
        const ms = clamp((v.text || '').length * 58, 2800, 15000);
        await Promise.race([sleep(ms), new Promise((r) => { advance = r; })]);
      }
      advance = null;
    }
    next.hidden = true;
    if (VIEW.outro) {
      [...log.children].forEach((c) => c.classList.add('old'));
      const o = add(log, 'sc-msg sys'); o.textContent = VIEW.outro;
      void o.offsetWidth; o.classList.add('in');
      log.scrollTo({ top: log.scrollHeight, behavior: 'auto' });
      sfx.chime(4);
      const r = box.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height * .8, [col.rgb, [255, 95, 162], [255, 255, 255]], 70, 320);
      for (let k = 0; k < 8; k++) setTimeout(floatEmote, k * 180);
      await sleep(3200);
    }
    showSkip(false);
    SV.viewers = true; save();
    await closeScene();
    G.cine = false;
  }

  /* =================================================================
     L'HISTOIRE
     ================================================================= */
  const SLEEP_SPOT = { L: [58, 86], P: [55, 88] };
  const SEEK_SPOTS = {
    L: [[16, 90], [90, 86], [7, 76], [84, 58], [40, 92], [70, 94], [28, 72], [47, 36]],
    P: [[18, 92], [88, 88], [9, 82], [80, 57], [42, 95], [66, 96], [30, 78], [14, 50]]
  };
  const spot = (o) => o[G.portrait ? 'P' : 'L'];
  let bunnyWaiter = null; // promesse en attente d'un clic sur le lapin
  const waitBunny = () => new Promise((r) => { bunnyWaiter = r; });

  function applyProgress() {
    G.groups.clear();
    const order = ['prologue', 'seek', 'gift', 'people', 'secret', 'finale', 'end'];
    const at = order.indexOf(SV.ck);
    if (at >= 2) G.groups.add('ch1');
    LAYERS.forEach((l, i) => {
      if (!SV.reveals.includes(i)) return;
      if (l.reveal && l.reveal.kind === 'color') G.groups.add('ch2');
      if (l.game === 'code') G.groups.add('ch3');
    });
    P.forEach((p, i) => { if (SV.people.includes(p.id)) G.groups.add(personGroup(i)); });
    if (at >= 4) ['ch1', 'ch2', 'ch3', 'p0', 'p1', 'p2', 'p3', 'end'].forEach((g) => G.groups.add(g));
    refreshRoomColors();
    G.lights = G.groups.has('ch1') ? [{ id: 'lamp', r: G.light.r * 1.4, a: .9 }] : [];
    G.darkTarget = darknessFor(SV.ck);
    G.dark = G.darkTarget;
  }
  // Chaque proche colore une partie de la pièce (4 parties, quel que soit le nombre de proches)
  function personGroup(i) { return 'p' + Math.min(3, Math.floor(i * 4 / Math.max(1, P.length))); }
  function darknessFor(ck) {
    if (ck === 'prologue' || ck === 'seek') return .97;
    if (ck === 'gift') return clamp(.62 - SV.layer * .05, .3, .62);
    if (ck === 'people') return clamp(.34 * (1 - SV.people.length / Math.max(1, P.length)), 0, .34);
    return 0;
  }

  /* ---------- Prologue : la pièce noire ---------- */
  async function prologue() {
    checkpoint('prologue');
    const [sx, sy] = spot(SLEEP_SPOT);
    bunnyShow(sx, sy, 12); bunnyMood('asleep'); $('#zzz').hidden = false;
    Music.setIntensity(.1);
    if (narrLine('intro')) {
      // écran noir : la narratrice parle d'abord
      G.lightOn = false; G.darkTarget = 1; G.dark = 1; G.cine = true;
      await wait(dur(1200));
      await narrate('intro');
      G.lightOn = true; G.darkTarget = .97; G.cine = false;
      narrate('world');
    } else {
      G.darkTarget = .97; G.lightOn = true;
      await wait(dur(900));
      await type(lineTop, TX.prologue1);
    }
    G.phase = 'asleep';
    await wait(dur(700));
    type(lineBottom, TX.prologue2);
    const watch = () => prologueWatch();
    frameHooks.add(watch);
    const nudge = setTimeout(() => {
      if (G.phase !== 'asleep') return;
      if (narrLine('sleeping')) narrateSoft('sleeping'); else type(lineTop, TX.prologueSleeper);
    }, 16000);
    await waitBunny();
    clearTimeout(nudge); frameHooks.delete(watch);
    G.phase = 'waking'; G.cine = true;
    $('#zzz').hidden = true;
    bunnyMood('asleep', false); bunnyMood('yawn');
    const [bx, by] = bunnyCenter();
    sfx.bunny(); burst(bx, by - 20, [255, 255, 255], 16, 120);
    setLine(lineBottom, ''); setLine(lineTop, '');
    bunnySay(TX.wake, 2200);
    await Promise.all([narrate('wake'), wait(dur(1700))]);
    bunnyMood('yawn', false); retrigger(bunny, 'hop');
    await wait(dur(600));
    bunnySay(TX.flee, 2000); sfx.whoosh();
    const fl = narrate('flee');
    await bunnyTo(G.bunny.x > 50 ? 112 : -12, G.bunny.y, { ms: 1100 });
    bunny.hidden = true;
    await fl;
    G.cine = false;
    chapterBunny();
  }

  // Pendant le prologue : la narratrice réagit à ce que la lampe éclaire
  function prologueWatch() {
    if (G.modal || narrCur || !G.light.moved || !G.lightOn) return;
    const lx = G.light.x, ly = G.light.y, r = G.light.r;
    if (!bunny.hidden && G.phase === 'asleep') {
      const [bx, by] = bunnyCenter();
      if (Math.hypot(bx - lx, by - ly) < r * 1.2) { narrateSoft('sleeping', { drop: true }); return; }
    }
    const near = SOUV.some((s) => !SV.found.includes(s.id) && OBJ[s.object] && (() => { const [ox, oy] = objCenter(s.object); return Math.hypot(ox - lx, oy - ly) < r * .9; })());
    if (near) narrateSoft('firstDiscovery', { drop: true });
  }

  /* ---------- Chapitre I : le lapin ---------- */
  async function chapterBunny() {
    checkpoint('seek');
    G.darkTarget = .97; G.lightOn = true; G.cine = true;
    await chapter(TX.ch1);
    G.cine = false;
    const spots = spot(SEEK_SPOTS);
    let prev = -1;
    const n = Math.max(1, T.seekSpots || 3);
    type(lineBottom, TX.seekHint);
    for (let k = 0; k < n; k++) {
      let i; do { i = Math.floor(Math.random() * spots.length); } while (i === prev && spots.length > 1);
      prev = i;
      await seekBunnyAt(spots[i]);
      bunnySay((TX.seekFound || ['Trouvé !'])[k % (TX.seekFound || [1]).length], 1500);
      await wait(dur(1100));
      bunny.hidden = true;
    }
    // Il t'amène vers le cadeau
    G.cine = true;
    unlockGroup('ch1');
    G.lights = [{ id: 'lamp', r: G.light.r * 1.4, a: .9 }];
    G.darkTarget = .62;
    sfx.magic();
    const [x, y] = G.portrait ? [30, 90] : [30, 90];
    bunnyShow(x, y, 12);
    bunnySay(TX.follow, 2600);
    await Promise.all([narrate('afterSeek'), wait(dur(1600))]);
    await bunnyTo(G.portrait ? 26 : 43, G.portrait ? 80 : 84, { ms: 1100 });
    hero.hidden = false; retrigger(gift, 'bloom');
    sfx.magic();
    G.cine = false;
    chapterGift(0);
  }
  function seekBunnyAt([x, y]) {
    return new Promise((resolve) => {
      bunnyShow(x, y, 8.5); retrigger(bunny, 'hop');
      bunnyMood('peekaboo');
      let ticks = 0;
      const nudge = setInterval(() => {
        ticks++;
        const [bx, by] = bunnyCenter();
        burst(bx, by - 10, [255, 255, 255], ticks > 4 ? 10 : 2, ticks > 4 ? 90 : 30);
        if (ticks === 6 || ticks === 11) { sfx.giggle(); bunnySay(TX.seekNudge, 1600); }
      }, 1500);
      G.phase = 'seek';
      bunnyWaiter = () => {
        clearInterval(nudge); G.phase = null; bunnyMood('peekaboo', false);
        const [bx, by] = bunnyCenter();
        G.light.x = bx; G.light.y = by;
        sfx.bunny(); sfx.sparkle(4); burst(bx, by, [255, 255, 255], 26, 180);
        retrigger(bunny, 'hop');
        resolve();
      };
    });
  }

  /* ---------- Chapitre II : le cadeau en couches ---------- */
  const LAYER_SVG = { ribbon: 'L-outer', paper: 'L-outer', timing: 'L-box2', puzzle: 'L-letter', code: 'L-chest', charge: 'L-chest' };
  function showLayerSvg(cls) {
    gift.querySelectorAll('.layer').forEach((s) => { s.toggleAttribute('hidden', !s.classList.contains(cls)); });
  }
  function restoreGiftVisual(layerIdx) {
    // remet le cadeau dans l'état correspondant à la couche en cours
    const g = LAYERS[layerIdx] ? LAYERS[layerIdx].game : 'charge';
    showLayerSvg(LAYER_SVG[g] || 'L-chest');
    const done = (game) => LAYERS.some((l, i) => i < layerIdx && l.game === game);
    gift.classList.toggle('unbow', done('ribbon'));
    gift.style.setProperty('--untie', done('ribbon') ? 1 : 0);
    gift.querySelectorAll('.tear').forEach((t) => t.classList.toggle('on', done('paper')));
    gift.classList.toggle('chest-open', done('code'));
    if (done('code')) coreLight.classList.add('soft');
  }
  async function chapterGift(start) {
    hero.hidden = false;
    checkpoint('gift', { layer: start });
    restoreGiftVisual(start);
    G.darkTarget = darknessFor('gift');
    if (start === 0) {
      G.cine = true;
      await chapter(TX.ch2);
      if (bunny.hidden) bunnyShow(G.portrait ? 26 : 43, G.portrait ? 80 : 84, 12);
      bunnySay(TX.giftHere, 2200);
      await Promise.all([narrate('giftFound'), wait(dur(1400))]);
      await narrate('beforeTrials');
      G.cine = false;
    }
    for (let i = start; i < LAYERS.length; i++) {
      const L = LAYERS[i];
      checkpoint('gift', { layer: i });
      G.darkTarget = darknessFor('gift');
      restoreGiftVisual(i);
      if (L.game === 'code' && !SV.reveals.some((r) => LAYERS[r] && LAYERS[r].game === 'code')) { G.cine = true; await chapter(TX.ch3); G.cine = false; }
      setLine(lineBottom, '');
      if (narrLine(L.game)) { G.cine = true; await narrate(L.game); G.cine = false; }
      await type(lineTop, fill(TX.layerTitle, { n: i + 1, name: L.name }));
      const ctx = { title: L.name, n: L.game === 'charge' ? 1 : 3, letter: L.game === 'puzzle', color: CHAPTER_COLORS[1] };
      if (L.game === 'ribbon') ctx.onStep = (k, n) => gift.style.setProperty('--untie', (k / n).toFixed(3));
      if (L.game === 'paper') ctx.onStep = (k, n) => gift.querySelectorAll('.tear').forEach((t, j) => t.classList.toggle('on', j < Math.ceil(k / n * 5)));
      if (L.game === 'timing') ctx.onStep = (k, n) => gift.style.setProperty('--lift', (k / n).toFixed(3));
      await runGame(L.game, ctx);
      setLine(lineBottom, '');
      G.cine = true;
      const doneLine = narrLine(L.game + 'Done') ? narrate(L.game + 'Done') : null;
      await openLayer(L, i);
      if (doneLine) await doneLine;
      await revealLayer(L, i);
      if (!SV.reveals.includes(i)) SV.reveals.push(i);
      save();
      if (L.game === 'ribbon' && i < LAYERS.length - 1) await ribbonThief();
      if (i < LAYERS.length - 1) {
        bunnyMood('laugh'); setTimeout(() => bunnyMood('laugh', false), 1600);
        setLine(lineBottom, '');
        await type(lineTop, TX.notOver);
        sfx.giggle();
        await wait(dur(1500));
      }
      G.cine = false;
    }
    chapterPeople(0);
  }
  async function openLayer(L, i) {
    const [x, y] = heroC();
    if (L.game === 'ribbon') { gift.classList.add('unbow'); sfx.whoosh(); await wait(dur(900)); }
    else if (L.game === 'paper') {
      sfx.paper(); sfx.whoosh();
      for (let k = 0; k < 30 * fxScale() + 4; k++) spawn({ x: x + rand(-G.hs * .4, G.hs * .4), y: y + rand(-G.hs * .3, G.hs * .3), vx: rand(-260, 260), vy: rand(-320, -80), g: 600, drag: .985, life: rand(1, 1.6), size: rand(4, 8), kind: 'scrap', color: hexToRgb(GIFTC.paper || '#f4b6c9') });
      gift.classList.add('unwrap'); await wait(dur(800)); gift.classList.remove('unwrap');
      showLayerSvg('L-box2'); retrigger(gift, 'bloom'); await wait(dur(700));
    } else if (L.game === 'timing') {
      gift.classList.add('lid-off'); sfx.whoosh(); await wait(dur(800)); gift.classList.remove('lid-off');
      showLayerSvg('L-letter'); retrigger(gift, 'rise'); sfx.magic(); await wait(dur(800));
    } else if (L.game === 'puzzle') {
      gift.classList.add('letter-open'); sfx.paper(); await wait(dur(900)); gift.classList.remove('letter-open');
      showLayerSvg('L-chest'); retrigger(gift, 'bloom'); await wait(dur(800));
    } else if (L.game === 'code') {
      gift.classList.add('chest-open'); sfx.open(); coreLight.classList.add('on');
      burst(x, y - G.hs * .2, [[255, 230, 160], [255, 255, 255]], 60, 260);
      await wait(dur(1200)); coreLight.classList.remove('on'); coreLight.classList.add('soft');
    } else if (L.game === 'charge') {
      gift.classList.add('rumble'); sfx.rumble(); await wait(dur(900)); gift.classList.remove('rumble', 'charging');
      coreLight.classList.add('on'); sfx.open();
      burst(x, y, [255, 255, 255], 140, 440);
      await wait(dur(1300)); coreLight.classList.remove('on'); coreLight.classList.add('soft');
      hero.style.setProperty('--charge', '0');
    }
  }
  async function revealLayer(L, i) {
    const r = L.reveal || {};
    const [x, y] = heroC();
    if (r.kind === 'photo' || r.kind === 'souvenir') { await showMemo(revealMemo(L)); pulseHud(); }
    else if (r.kind === 'phrase') { setLine(lineBottom, ''); await type(lineTop, r.text, { speed: 40 }); await wait(dur(2600)); SV.reveals.push(i); pulseHud(); }
    else if (r.kind === 'color') {
      await type(lineTop, r.text);
      unlockGroup('ch2'); sfx.chime(1);
      burst(x, y, [hexToRgb(CHAPTER_COLORS[1]), [255, 255, 255]], 90, 380);
      await wait(dur(2000));
    } else if (r.kind === 'voice') {
      await type(lineTop, r.text);
      await playVoice({ audio: r.audio, caption: r.caption });
      setLine(lineBottom, '');
    } else if (r.kind === 'people') { await type(lineTop, r.text); await wait(dur(2200)); }
    if (L.game === 'code') unlockGroup('ch3');
  }
  async function ribbonThief() {
    // Le lapin vole un bout du ruban et s'enfuit
    bunnyMood('thief');
    const [hx] = heroC();
    await bunnyTo(50, G.portrait ? 74 : 72, { ms: 700 });
    bunnySay(TX.thief, 1800); sfx.giggle();
    await wait(dur(900));
    await bunnyTo(G.bunny.x > 50 ? -12 : 112, G.bunny.y, { ms: 900 });
    bunny.hidden = true;
    const before = G.darkTarget; G.darkTarget = .96;
    G.cine = false;
    type(lineTop, TX.thiefSeek);
    const spots = spot(SEEK_SPOTS);
    await seekBunnyAt(pick(spots));
    G.cine = true;
    bunnySay(TX.thiefFound, 1800);
    bunnyMood('thief', false);
    G.darkTarget = before;
    await wait(dur(1200));
    await bunnyTo(G.portrait ? 26 : 43, G.portrait ? 80 : 84, { ms: 900 });
    void hx;
  }

  /* ---------- Chapitres IV et V : chaque proche, un mini-chapitre ---------- */
  async function chapterPeople(start) {
    checkpoint('people', { person: start });
    hero.hidden = false; restoreGiftVisual(LAYERS.length); coreLight.classList.add('soft');
    P.forEach((p) => { if (SV.people.includes(p.id)) sphereMode(p, 'sky', heroC()); });
    if (start === 0) { G.cine = true; await chapter(TX.ch4); G.cine = false; }
    for (let i = start; i < P.length; i++) {
      checkpoint('people', { person: i });
      await runPerson(P[i], i);
      checkpoint('people', { person: i + 1 });
    }
    await chapterViewers();
    chapterSecret();
  }
  async function runPerson(p, i) {
    G.cine = true;
    const [x, y] = heroC();
    setLine(lineBottom, '');
    await type(lineTop, TX.someone);
    const s = sphereMode(p, 'focus', [x, y]);
    sfx.chime(i);
    await wait(dur(600));
    sphereEntrance(p, s);
    setLine(lineTop, '');
    await showName(p);
    // l'épreuve (facultative)
    if (p.game) {
      sphereMode(p, 'side');
      await type(lineTop, fill(TX.gameFor, { name: p.name }));
      G.cine = false;
      await runGame(p.game, { title: fill(TX.gameFor, { name: p.name }), color: p.color, symbol: p.symbol, photo: null });
      G.cine = true;
      setLine(lineTop, ''); setLine(lineBottom, '');
      sphereMode(p, 'focus'); sfx.magic();
      await wait(dur(900));
    }
    // son souvenir, mis en scène
    sphereMode(p, 'side');
    const scened = await personScene(p);
    // la voix, avec le lapin qui écoute
    sphereMode(p, scened ? 'side' : 'focus');
    bunnyShow(G.portrait ? 86 : 80, G.portrait ? 97 : 94, 10); bunnyMood('listen');
    setLine(lineTop, who('Un message de', p.name, p.symbol));
    s.el.classList.add('speaking');
    await playVoice({ audio: p.audio, caption: p.caption });
    s.el.classList.remove('speaking'); bunnyMood('listen', false);
    if (scened) await closeScene();
    // mais ce n'est pas tout…
    if (p.joke) {
      setLine(lineBottom, '');
      await type(lineTop, TX.notAll);
      await wait(dur(700));
      await type(lineBottom, p.joke, { speed: 34 }); await wait(dur(2600));
    }
    // la sphère rejoint le ciel et colore la pièce
    if (!SV.people.includes(p.id)) SV.people.push(p.id);
    save(); pulseHud();
    sphereMode(p, 'sky'); sfx.chime(i + 3);
    unlockGroup(personGroup(i));
    G.darkTarget = darknessFor('people');
    setLine(lineBottom, '');
    await type(lineTop, fill(TX.toSky, { name: p.name }));
    burst(...skySlot(p), p.rgb, 40, 200);
    await wait(dur(1800));
    G.cine = false;
  }

  /* ---------- Chapitre VI : la fausse fin et la porte secrète ---------- */
  async function chapterSecret() {
    checkpoint('secret');
    G.cine = true;
    setLine(lineTop, ''); setLine(lineBottom, '');
    if (!bunny.hidden) bunnySay(TX.fakeEnd1, 1800);
    await wait(dur(1800));
    Music.silence(true);
    await blackIn(TX.fakeEnd2);
    await wait(3500);
    setLine($('#blackText'), '');
    // le lapin revient
    app.classList.add('over');
    bunnyShow(50, 66, 14); retrigger(bunny, 'hop'); sfx.bunny();
    await wait(600);
    bunnySay(TX.notFinished, 3200);
    await wait(dur(3000));
    Music.silence(false); Music.setMood('warm'); Music.setIntensity(.5);
    await chapter(TX.ch6);
    app.classList.remove('over');
    // la pièce a changé
    ['ch1', 'ch2', 'ch3', 'p0', 'p1', 'p2', 'p3'].forEach((g) => G.groups.add(g));
    refreshRoomColors();
    G.darkTarget = 0; G.lights = [];
    hero.hidden = true; ALLP.forEach((p) => SPH.has(p.id) && sphereMode(p, 'sky'));
    bunnyShow(G.portrait ? 26 : 43, G.portrait ? 84 : 86, 11);
    await blackOut();
    await type(lineTop, TX.roomChanged);
    await wait(dur(1200));
    OBJ.door.hidden = false; OBJ.door.classList.add('glow'); OBJ.door.classList.remove('mono');
    sfx.magic();
    type(lineBottom, TX.doorHint);
    G.cine = false;
    await new Promise((r) => { G.doorWaiter = r; });
    G.cine = true;
    setLine(lineTop, ''); setLine(lineBottom, '');
    OBJ.door.classList.add('open'); sfx.open();
    burst(...objCenter('door'), [255, 240, 210], 80, 300);
    await wait(dur(900));
    await secretRoom();
    finale();
  }
  async function secretRoom() {
    const body = openPanel('', 'p-secret');
    const wall = document.createElement('div'); wall.className = 'wall';
    const items = SOUV.filter((s) => SV.found.includes(s.id)).map((s) => ({ photo: s.photo, emoji: s.symbol, color: '#ddd' }))
      .concat(P.map((p) => { const m = memOf(p), im = m && (m.images || []).map(imgOf).find((x) => x.src); return { photo: p.photo || (im && im.src) || null, emoji: p.symbol, color: p.color }; }));
    items.forEach((it, k) => {
      const d = document.createElement('div'); d.className = 'wall-pic';
      d.style.setProperty('--r', rand(-8, 8).toFixed(1) + 'deg'); d.style.animationDelay = (k * 90) + 'ms';
      d.innerHTML = photoHTML(it.photo, it.emoji, it.color, ' ');
      wall.appendChild(d);
    });
    const msg = document.createElement('p'); msg.className = 'secret-msg';
    body.append(wall, msg);
    P.forEach((p) => sphereMode(p, 'heart'));
    await wait(dur(1600));
    await type(msg, TX.lastOne, { speed: 60 });
    await wait(dur(1400));
    closePanel();
    if (ORGA) {
      let [x, y] = [G.W / 2, G.H / 2];
      // la voix qui guidait depuis le début devient la dernière sphère
      if (NARR && NARR.reveal) {
        narrCard.classList.add('reveal');
        const rv = narrate({ text: NARR.reveal });
        await wait(400); [x, y] = narrCenter();
        await rv;
        narrCard.classList.remove('reveal');
      }
      const s = sphereMode(ORGA, 'focus', [x, y]);
      sfx.chime(7); burst(x, y, ORGA.rgb, 80, 300);
      await wait(dur(1500));
      await showMemo(Object.assign(personMemo(ORGA, false), { back: '' }));
      setLine(lineTop, who('Un message de', ORGA.name, ORGA.symbol));
      s.el.classList.add('speaking');
      await playVoice({ audio: ORGA.audio, caption: ORGA.caption });
      s.el.classList.remove('speaking');
      if (!SV.people.includes(ORGA.id)) SV.people.push(ORGA.id);
      save(); pulseHud();
      sphereMode(ORGA, 'sky'); setLine(lineTop, ''); setLine(lineBottom, '');
    }
  }

  /* ---------- Chapitre VII et final ---------- */
  async function finale() {
    checkpoint('finale');
    G.cine = true; hero.hidden = true;
    setLine(lineTop, ''); setLine(lineBottom, '');
    await chapter(TX.ch7);
    ALLP.forEach((p) => sphereMode(p, 'heart', SPH.has(p.id) ? null : [G.W / 2, G.H / 2]));
    Music.setIntensity(.7);
    await type(lineTop, TX.gathering);
    await wait(dur(2600));
    setLine(lineTop, '');
    // chacun dit un mot
    for (const p of P) {
      if (!p.word) continue;
      const s = SPH.get(p.id); if (s) retrigger(s.el, 'lit');
      chapterEl.textContent = p.word; retrigger(chapterEl, 'word');
      const rec = voiceEl(p.wordAudio);
      if (rec && rec.el && !rec.failed) await playVoice({ audio: p.wordAudio, caption: '' }, { min: 600 });
      else { sfx.chime(p.i); await wait(dur(1100)); }
    }
    chapterEl.classList.remove('word');
    // puis tout le monde ensemble
    ALLP.forEach((p) => { const s = SPH.get(p.id); if (s) s.el.classList.add('speaking'); });
    chapterEl.textContent = (C.together && C.together.text) || 'JOYEUX ANNIVERSAIRE !'; retrigger(chapterEl, 'together');
    const tg = C.together && voiceEl(C.together.audio);
    if (tg && tg.el && !tg.failed) await playVoice({ audio: C.together.audio, caption: '' }, { min: 1500 });
    else await wait(dur(2200));
    ALLP.forEach((p) => { const s = SPH.get(p.id); if (s) s.el.classList.remove('speaking'); });
    // BOUM
    chapterEl.classList.remove('together');
    const cols = ALLP.map((p) => p.rgb).concat([[255, 255, 255]]);
    sfx.open(); Music.setIntensity(1);
    burst(G.W / 2, G.H / 2, cols, 320, 600);
    confetti(cols);
    unlockGroup('end'); G.darkTarget = 0;
    bunnyShow(50, G.portrait ? 62 : 64, 16);
    if (ORGA) bunnyColor(ORGA.color);
    retrigger(bunny, 'jump'); sfx.bunny();
    ALLP.forEach((p) => sphereMode(p, 'sky'));
    await wait(dur(2800));
    Music.setIntensity(.5);
    await showCard(false);
    G.cine = false;
    endMode(true);
  }
  function confetti(cols) {
    const n = Math.round(110 * fxScale());
    for (let i = 0; i < n; i++) spawn({ x: rand(0, G.W), y: rand(-G.H * .4, -10), vx: rand(-30, 30), vy: rand(40, 110), g: 18, drag: .995, life: rand(5, 9), size: rand(3, 6), kind: Math.random() < .25 ? 'heart' : 'confetti', color: pick(cols) });
  }

  /* ---------- Fin : album, exploration, tout revoir ---------- */
  function endMode(first) {
    checkpoint('end', { completed: true });
    G.cine = false; hero.hidden = true;
    ['ch1', 'ch2', 'ch3', 'p0', 'p1', 'p2', 'p3', 'end'].forEach((g) => G.groups.add(g));
    refreshRoomColors(); G.darkTarget = 0; G.lights = [];
    OBJ.door.hidden = false; OBJ.door.classList.add('open');
    ALLP.forEach((p) => { if (SV.people.includes(p.id)) sphereMode(p, 'sky', SPH.has(p.id) ? null : [G.W / 2, G.H / 2]); });
    if (ORGA) bunnyColor(ORGA.color);
    const [ex, ey] = G.portrait ? [74, 66] : [64, 76];
    if (bunny.hidden) bunnyShow(ex, ey, 12);
    else bunnyTo(ex, ey, { size: 12 });
    const missing = SOUV.length - SV.found.length;
    setLine(lineTop, '');
    type(lineBottom, missing > 0 ? `${fill(TX.foundCount, { n: SV.found.length, total: SOUV.length })} ${TX.keepExploring}` : '');
    buildEndBar(!first);
  }
  function buildEndBar(collapsed) {
    endBar.innerHTML = '';
    const mk = (label, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill ' + (cls || ''); b.textContent = label; b.addEventListener('click', fn); endBar.appendChild(b); return b; };
    if (collapsed) {
      mk('☰', () => buildEndBar(false), 'ghost round').setAttribute('aria-label', 'Menu');
    } else {
      mk('📖 ' + (TX.album || 'Ton album'), openAlbum);
      mk(TX.explore || 'Explorer la pièce', () => { buildEndBar(true); setLine(lineBottom, ''); }, 'ghost');
      mk(TX.rereadCard || 'Revoir le petit mot', () => showCard(true), 'ghost');
      mk(TX.replayAll || 'Tout revoir', replayAll, 'ghost');
      mk(TX.restart || 'Recommencer', restartAll, 'ghost');
    }
    endBar.hidden = false;
  }
  function replayAll() {
    stopVoice();
    const keep = { found: SV.found, secrets: SV.secrets, completed: true, visits: SV.visits };
    store.set(SAVE_KEY, Object.assign(blank(), keep));
    try { location.reload(); } catch (e) { /* rien */ }
  }
  function restartAll() {
    stopVoice(); store.del(SAVE_KEY);
    try { location.reload(); } catch (e) { /* rien */ }
  }

  /* =================================================================
     EXPLORATION : objets, étoiles, sphères, secrets
     ================================================================= */
  const WONDER_PHOTO = ['frame1', 'frame2', 'frame3'];
  async function onObject(id, el) {
    G.lastInput = performance.now();
    if (G.modal) return;
    if (id === 'door') { if (G.doorWaiter) { const r = G.doorWaiter; G.doorWaiter = null; r(); } return; }
    // combinaison secrète
    const seq = SECRETS.comboSequence || [];
    if (seq.length) {
      G.combo.push(id); G.combo = G.combo.slice(-seq.length);
      if (G.combo.join() === seq.join()) { G.combo = []; comboSecret(); return; }
    }
    if (G.cine) { retrigger(el, 'wiggle'); return; }
    const s = SOUV.find((x) => x.object === id);
    if (s) {
      if (!SV.found.includes(s.id)) {
        SV.found.push(s.id); save(); pulseHud();
        if (SV.found.length === 1) narrateSoft('souvenirFound');
        else if (SV.found.length === 2) narrateSoft('secretFound');
        el.classList.remove('mono'); retrigger(el, 'found');
        const [x, y] = objCenter(id);
        sfx.chime(s.i); burst(x, y, [[255, 240, 200], [255, 255, 255]], 30, 180);
        say(WONDER_PHOTO.includes(id) ? TX.photoWonder : TX.objectWonder, 1600);
        await wait(dur(700));
        await showMemo(souvMemo(s));
        if (SV.found.length === SOUV.length) bonusScene();
      } else if (id === 'moon' && SECRETS.moonMessage) {
        say(SECRETS.moonMessage, 4200); retrigger(el, 'wiggle');
        if (addSecret('moon')) sfx.sparkle(5);
      } else {
        await showMemo(souvMemo(s));
      }
      return;
    }
    if (C.roomNotes && C.roomNotes[id]) { say(C.roomNotes[id], 3800); retrigger(el, 'wiggle'); return; }
    retrigger(el, 'wiggle'); sfx.pop();
  }
  async function onStar(i, el) {
    G.lastInput = performance.now();
    if (G.modal || G.cine) { retrigger(el, 'wiggle'); return; }
    const p = P[i];
    retrigger(el, 'twinkle'); sfx.sparkle(3);
    if (!p) return;
    if (!SV.people.includes(p.id)) { say('Cette étoile garde un secret… reviens plus tard.', 2400); return; }
    if (!p.secretAudio && !p.secretCaption) { el.classList.remove('mono'); say(`Cette étoile brille pour ${p.name}.`, 2200); return; }
    const first = addSecret('star-' + p.id);
    G.cine = true;
    el.classList.remove('mono');
    setLine(lineTop, who(TX.secretVoice || 'Un message secret', p.name, p.symbol));
    await playVoice({ audio: p.secretAudio, caption: p.secretCaption });
    setLine(lineTop, ''); setLine(lineBottom, '');
    G.cine = false;
    void first;
  }
  async function onSphere(p) {
    G.lastInput = performance.now();
    if (G.modal || G.cine || !SV.people.includes(p.id)) return;
    const s = SPH.get(p.id); if (!s) return;
    G.cine = true;
    setLine(lineTop, who('Un message de', p.name, p.symbol));
    s.el.classList.add('speaking');
    await playVoice({ audio: p.audio, caption: p.caption });
    s.el.classList.remove('speaking');
    setLine(lineTop, ''); setLine(lineBottom, '');
    G.cine = false;
  }
  function onBunnyTap() {
    G.lastInput = performance.now();
    if (bunnyWaiter && (G.phase === 'asleep' || G.phase === 'seek')) { const r = bunnyWaiter; bunnyWaiter = null; r(); return; }
    if (G.cine || G.modal) return;
    const b = G.bunny, now = performance.now();
    b.clicks++; b.taps = b.taps.filter((x) => now - x < 1200); b.taps.push(now);
    if (b.clicks >= 20) {
      b.clicks = 0; bunnyMood('angry'); bunnySay(SECRETS.angryMessage, 2600); sfx.rumble();
      addSecret('angry'); setTimeout(() => bunnyMood('angry', false), 2800); return;
    }
    if (b.taps.length >= 5) {
      b.taps = []; bunnySay(SECRETS.tickleMessage, 2400); retrigger(bunny, 'jump'); sfx.giggle();
      addSecret('tickle'); return;
    }
    retrigger(bunny, b.clicks % 2 ? 'hop' : 'wink'); sfx.bunny();
    if (Math.random() < .5) bunnySay(pick(['Hi hi !', 'Coucou !', 'Tu cherches quelque chose ?', 'Encore ?']), 1300);
  }
  async function comboSecret() {
    addSecret('combo');
    say(SECRETS.comboMessage, 4000);
    const wasHidden = bunny.hidden;
    if (wasHidden) bunnyShow(50, G.portrait ? 84 : 86, 12);
    bunnyMood('dance'); sfx.magic();
    const cols = ALLP.map((p) => p.rgb);
    for (let k = 0; k < 6; k++) setTimeout(() => burst(rand(G.W * .2, G.W * .8), rand(G.H * .2, G.H * .6), cols, 30, 220), k * 350);
    await wait(3600);
    bunnyMood('dance', false);
    if (wasHidden && G.ck !== 'end') bunny.hidden = true;
  }
  async function bonusScene() {
    const bn = SECRETS.bonus || {};
    addSecret('bonus');
    chapterEl.textContent = bn.title || '✦ SECRET DÉBLOQUÉ ✦'; retrigger(chapterEl, 'show');
    sfx.magic();
    const cols = ALLP.map((p) => p.rgb);
    for (let i = 0; i < 60 * fxScale() + 10; i++) spawn({ x: rand(0, G.W), y: rand(-G.H * .4, -10), vx: rand(-20, 20), vy: rand(60, 140), g: 10, drag: .995, life: rand(4, 7), size: rand(5, 9), kind: 'heart', color: pick(cols) });
    await wait(dur(2600));
    chapterEl.classList.remove('show');
    await showMemo({ photo: bn.photo, emoji: '✦', title: bn.title, text: bn.text, tag: 'Bonus', voice: bn.audio ? { audio: bn.audio, caption: '' } : null });
  }
  function idleCheck(now) {
    if (!G.started || G.modal || G.cine || G.cur || G.gg || G.phase === 'seek' || G.phase === 'asleep') return;
    if (now - G.lastInput < 30000 || now - G.lastIdle < 90000) return;
    G.lastIdle = now;
    addSecret('idle');
    const wasHidden = bunny.hidden;
    if (wasHidden) bunnyShow(G.portrait ? 80 : 84, G.portrait ? 92 : 92, 10);
    bunnyMood('dance'); bunnySay(SECRETS.idleMessage, 3200);
    for (let k = 0; k < 3; k++) setTimeout(() => {
      const y0 = rand(G.H * .05, G.H * .25);
      for (let j = 0; j < 14; j++) spawn({ x: G.W * .1 + j * 6, y: y0 + j * 2, vx: 420, vy: 120, life: 1.2 - j * .05, size: 3 - j * .12, kind: 'spark', color: [255, 255, 255] });
    }, k * 900);
    setTimeout(() => { bunnyMood('dance', false); if (wasHidden && G.ck !== 'end' && !G.cine) bunny.hidden = true; }, 3600);
  }

  /* =================================================================
     COMMANDES ET DÉMARRAGE
     ================================================================= */
  function savePrefs() { store.set('cadeau-prefs', { muted: G.muted, volume: G.volume, calm: G.calm }); }
  function setCalm(on) { G.calm = on; app.classList.toggle('calm', on); $('#calm').checked = on; savePrefs(); }
  function setMuted(on) {
    G.muted = on; A.applyVolume(); savePrefs();
    const b = $('#muteBtn'); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Remettre le son' : 'Couper le son');
  }

  function bindUI() {
    bunny.addEventListener('click', (e) => { e.stopPropagation(); onBunnyTap(); });
    gift.addEventListener('click', giftKey);
    app.addEventListener('pointerdown', (e) => {
      G.lastInput = performance.now();
      if (!e.target.closest('#panel, #memo, #album, #card, #controls')) { G.light.x = e.clientX; G.light.y = e.clientY; G.light.moved = true; }
      giftPtrDown(e);
    });
    app.addEventListener('pointermove', (e) => {
      G.lastInput = performance.now();
      if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) { G.light.x = e.clientX; G.light.y = e.clientY; G.light.moved = true; }
      giftPtrMove(e);
    });
    ['pointerup', 'pointercancel'].forEach((ev) => addEventListener(ev, giftPtrUp));
    gift.addEventListener('contextmenu', (e) => e.preventDefault());

    skipBtn.addEventListener('click', () => {
      if (skipBtn.dataset.mode === 'seek') return;
      if (skipBtn.dataset.mode === 'narr' && narrCur) { narrCur.finish(); return; }
      if (G.cur) { G.cur.finish(); return; }
      if (skipBtn.dataset.mode === 'game') { finishGiftGame(); return; }
      skipAnimations();
    });
    albumBtn.addEventListener('click', (e) => { e.stopPropagation(); if (!G.modal) openAlbum(); });
    $('#albumClose').addEventListener('click', closeAlbum);
    card.addEventListener('click', (e) => { if (card._finish && !e.target.closest('button')) card._finish(); });
    memo.addEventListener('click', (e) => { if (!e.target.closest('button')) { const t = $('#memoText'); t._tok = (t._tok || 0) + 1; } });

    $('#muteBtn').addEventListener('click', () => { A.init(); A.resume(); setMuted(!G.muted); });
    const settings = $('#settings'), sBtn = $('#settingsBtn');
    sBtn.addEventListener('click', (e) => { e.stopPropagation(); settings.hidden = !settings.hidden; sBtn.setAttribute('aria-expanded', String(!settings.hidden)); });
    settings.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => { if (!settings.hidden) { settings.hidden = true; sBtn.setAttribute('aria-expanded', 'false'); } });
    const vol = $('#vol'); vol.value = G.volume;
    vol.addEventListener('input', () => { G.volume = parseFloat(vol.value); if (G.muted && G.volume > 0) setMuted(false); A.applyVolume(); savePrefs(); });
    $('#calm').addEventListener('change', (e) => setCalm(e.target.checked));
    $('#fsBtn').addEventListener('click', () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => say('Le plein écran n\'est pas disponible ici.'));
        else say('Le plein écran n\'est pas disponible ici.');
      } catch (e) { say('Le plein écran n\'est pas disponible ici.'); }
    });
    $('#restartBtn').addEventListener('click', restartAll);
    document.addEventListener('visibilitychange', () => { if (!A.ctx) return; if (document.hidden) A.ctx.suspend().catch(() => {}); else A.resume(); });
    addEventListener('resize', resize);
  }

  function begin() {
    if (G.started) return;
    G.started = true; G.lastInput = performance.now();
    A.init(); A.resume(); Music.start();
    splash.classList.add('out');
    setTimeout(() => { splash.hidden = true; }, 1300);
    SV.visits = (SV.visits || 0) + 1; save();
    const ck = SV.ck;
    if (ck === 'end' || (SV.completed && ck === 'finale')) { endMode(false); setTimeout(() => bunnySay(TX.returnLine, 3200), 800); return; }
    if (ck === 'seek') { chapterBunny(); return; }
    if (ck === 'gift') { G.lightOn = true; bunnyShow(G.portrait ? 26 : 43, G.portrait ? 80 : 84, 12); chapterGift(SV.layer || 0); return; }
    if (ck === 'people') { G.lightOn = true; chapterPeople(SV.person || 0); return; }
    if (ck === 'secret') { chapterSecret(); return; }
    if (ck === 'finale') { finale(); return; }
    prologue();
  }

  function boot() {
    resize(); makeGrain(); buildRoom(); bindUI();
    setCalm(G.calm); setMuted(G.muted);
    [['--paper', GIFTC.paper], ['--paper-d', GIFTC.paperDark], ['--ribbon', GIFTC.ribbon], ['--ribbon-d', GIFTC.ribbonDark]].forEach(([k, v]) => v && gift.style.setProperty(k, v));
    applyProgress(); updateHud();
    preloadVoices(); preloadNarration();
    const resuming = SV.ck !== 'prologue' || SV.found.length;
    splash.querySelector('.splash-title').textContent = fill(TX.splashTitle);
    splash.querySelector('.splash-hint').textContent = resuming ? (TX.splashResume || TX.splashHint) : TX.splashHint;
    splash.querySelector('.splash-sound').textContent = TX.splashSound || '';
    skipBtn.firstChild.textContent = (TX.skip || 'Passer') + ' ';
    splash.addEventListener('click', begin);
    splash.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin(); } });
    splash.focus({ preventScroll: true });
    requestAnimationFrame(frame);
    window.__cadeau = { G, SV, P, ALLP, SOUV, R, CH, ringRadius, ringTarget, skip: skipAnimations, finishGiftGame };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
