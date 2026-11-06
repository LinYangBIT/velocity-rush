/** Bundled original soundtrack and racing sound design. No remote audio. */
export const BUILTIN_TRACKS = [
  {id:'sunline-drive',title:'逐光海岸',subtitle:'SUNLINE DRIVE',bpm:132,duration:'0:58',file:'assets/audio/sunline-drive.mp3',description:'明亮合成器 · 海岸竞速'},
  {id:'night-pulse',title:'午夜脉冲',subtitle:'NIGHT PULSE',bpm:140,duration:'0:55',file:'assets/audio/night-pulse.mp3',description:'电子低音 · 霓虹夜行'}
];
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.effectsEnabled = true;
    this.volume = 0.55;
    this.musicVolume = 0.65;
    this.effectsVolume = 0.7;
    this.userTrackName = '';
    this.trackKind = 'builtin';
    this.builtinTrackId = BUILTIN_TRACKS[0].id;
    this.builtinTrackName = BUILTIN_TRACKS[0].title;
    this._builtinCache = new Map();
    this._pendingBuiltin = null;
    this._trackOffset = 0;
    this._trackStartedAt = 0;
    this._track = null;
    this._trackSource = null;
    this._timer = null;
    this._step = 0;
    this._loadId = 0;
    this._lastBoost = false;
    this._destroyed = false;
    this._paused = false;
    this._suspended = false;
    this._fallback = false;
    this._voices = new Set();
    this._musicSources = new Set();
    this._lastEffects = new Map();
    this._state = { speed: 0, drift: false, boost: false, racing: false };
  }

  _init() {
    if (this.ctx || this._destroyed) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('当前浏览器不支持 Web Audio');
    const c = this.ctx = new AudioContext();
    this.master = c.createGain();
    this.master.gain.value = this.volume;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.006;
    limiter.release.value = 0.16;
    this.master.connect(limiter).connect(c.destination);
    this.music = c.createGain();
    this.music.gain.value = this._musicLevel();
    this.music.connect(this.master);
    this.effects = c.createGain();
    this.effects.gain.value = this._effectsLevel();
    this.effects.connect(this.master);
    this._noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const n = this._noise.getChannelData(0);
    let seed = 87129;
    for (let i = 0; i < n.length; i++) {
      seed = (seed * 16807) % 2147483647;
      n[i] = seed / 1073741823.5 - 1;
    }
    this._engineGain = c.createGain();
    this._engineGain.gain.value = 0;
    this._engineFilter = c.createBiquadFilter();
    this._engineFilter.type = 'lowpass';
    this._engineFilter.frequency.value = 420;
    this._engineFilter.Q.value = 1.3;
    this._engineGain.connect(this._engineFilter).connect(this.effects);
    this._engineOscillators = [0, 1].map(i => {
      const o = c.createOscillator();
      o.type = i ? 'triangle' : 'sawtooth';
      o.frequency.value = 45 + i * 0.6;
      o.connect(this._engineGain);
      o.start();
      return o;
    });
    this._driftGain = c.createGain();
    this._driftGain.gain.value = 0;
    const driftFilter = c.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.value = 1700;
    driftFilter.Q.value = 1.2;
    this._driftSource = c.createBufferSource();
    this._driftSource.buffer = this._noise;
    this._driftSource.loop = true;
    this._driftSource.connect(driftFilter).connect(this._driftGain).connect(this.effects);
    this._driftSource.start();
  }

  async unlock() {
    if (this._destroyed || this._suspended) return false;
    try {
      this._init();
      const ready = () => {
        if (this._destroyed || this._suspended || this.ctx?.state !== 'running') return false;
        this._startMusic();
        this.update(this._state);
        this._removeUnlockListeners?.();
        this._notify();
        return true;
      };
      // Autoplay-blocked resume promises may stay pending until a later gesture.
      // Never await one in the race-start path: silent play must remain possible.
      if (this.ctx.state !== 'running') {
        this._addUnlockListeners?.();
        this.ctx.resume().then(ready).catch(() => {});
      }
      return ready();
    } catch (error) {
      console.warn('Audio unavailable:', error.message);
      return false;
    }
  }

  _ramp(param, value, duration = 0.045) {
    if (!this.ctx) return;
    const at = this.ctx.currentTime;
    const current = param.value;
    param.cancelScheduledValues(at);
    param.setValueAtTime(current, at);
    param.setTargetAtTime(value, this.ctx.currentTime, duration);
  }

  _musicLevel() { return this.musicEnabled && !this._suspended ? this.musicVolume * (this._paused ? 0.35 : 1) : 0; }
  _effectsLevel() { return this.effectsEnabled && !this._suspended && !this._paused ? this.effectsVolume : 0; }

  get playbackState() {
    if (!this.musicEnabled) return 'muted';
    if (this._suspended) return 'background';
    if (this.ctx?.state !== 'running') return 'waiting';
    if (this._trackSource || this._timer) return this._paused ? 'ducked' : 'playing';
    return this._pendingBuiltin ? 'loading' : 'waiting';
  }

  _notify() {
    window.dispatchEvent(new CustomEvent('game-audio:state', {detail:{state:this.playbackState,fallback:this._fallback}}));
  }

  installLifecycle() {
    if (this._lifecycleCleanup || this._destroyed) return;
    const gesture = () => { void this.unlock(); };
    const events = ['pointerup', 'click', 'keydown'];
    this._addUnlockListeners = () => {
      events.forEach(name => document.addEventListener(name, gesture, {capture:true}));
    };
    this._addUnlockListeners();
    this._removeUnlockListeners = () => {
      events.forEach(name => document.removeEventListener(name, gesture, {capture:true}));
    };
    const visibility = () => this.setSuspended(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    this._lifecycleCleanup = () => {
      this._removeUnlockListeners();
      document.removeEventListener('visibilitychange', visibility);
    };
    this._suspended = Boolean(document.hidden);
    void this.unlock();
  }

  setPaused(paused) {
    this._paused = Boolean(paused);
    if (!this.ctx) return;
    this._ramp(this.music.gain, this._musicLevel(), 0.12);
    this._ramp(this.effects.gain, this._effectsLevel());
    if (this._paused) this._clearVoices(this.effects);
    this._notify();
  }

  setSuspended(suspended) {
    this._suspended = Boolean(suspended);
    if (!this.ctx) return;
    this._ramp(this.music.gain, this._musicLevel());
    this._ramp(this.effects.gain, this._effectsLevel());
    if (this._suspended) {
      this._stopMusic(false, true);
      this._clearVoices();
      if (this.ctx.state === 'running') void this.ctx.suspend().then(() => {
        if (!this._suspended && !this._destroyed) void this.unlock();
      }).catch(() => {});
    } else {
      void this.unlock();
    }
    this._notify();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (!this.ctx) return;
    this._ramp(this.music.gain, this._musicLevel());
    if (this.musicEnabled) this._startMusic();
    else this._stopMusic();
    this._notify();
  }

  setEffectsEnabled(enabled) {
    this.effectsEnabled = Boolean(enabled);
    if (this.ctx) this._ramp(this.effects.gain, this._effectsLevel());
    if (!this.effectsEnabled) this._clearVoices(this.effects);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ctx) this._ramp(this.master.gain, this.volume);
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ctx) this._ramp(this.music.gain, this._musicLevel());
  }

  setEffectsVolume(value) {
    this.effectsVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.ctx) this._ramp(this.effects.gain, this._effectsLevel());
  }

  _rememberVoice(source, bus, nodes) {
    const voice = {source, bus, nodes};
    this._voices.add(voice);
    source.onended = () => {
      this._voices.delete(voice);
      nodes.forEach(node => node.disconnect());
    };
  }

  _clearVoices(bus) {
    for (const voice of this._voices) {
      if (bus && voice.bus !== bus) continue;
      try { voice.source.stop(); } catch (_) { /* already stopped */ }
      voice.nodes.forEach(node => node.disconnect());
      this._voices.delete(voice);
    }
  }

  _note(midi, at, length, level, type = 'triangle', bus = this.music, cutoff = 2400) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    o.type = type;
    o.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, at);
    f.frequency.exponentialRampToValueAtTime(Math.max(160, cutoff * 0.4), at + length);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), at + 0.009);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    o.connect(f).connect(g).connect(bus);
    o.start(at);
    o.stop(at + length + 0.03);
    this._rememberVoice(o, bus, [o, f, g]);
  }

  _noiseHit(at, length, level, frequency, type = 'highpass', bus = this.music) {
    const c = this.ctx;
    const n = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    n.buffer = this._noise;
    f.type = type;
    f.frequency.value = frequency;
    f.Q.value = 0.7;
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    n.connect(f).connect(g).connect(bus);
    n.start(at);
    n.stop(at + length + 0.02);
    this._rememberVoice(n, bus, [n, f, g]);
  }

  _kick(at) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, at);
    o.frequency.exponentialRampToValueAtTime(42, at + 0.17);
    g.gain.setValueAtTime(0.31, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    o.connect(g).connect(this.music);
    o.start(at);
    o.stop(at + 0.25);
    this._rememberVoice(o, this.music, [o, g]);
  }

  _scheduleStep(step, at) {
    // Original 8-bar electro-pop arrangement, 132 BPM, D minor.
    const beat = 60 / 132;
    const i = step % 16;
    const bar = Math.floor(step / 16) % 8;
    const chords = [[50, 53, 57, 60], [46, 50, 53, 57], [53, 57, 60, 64], [48, 52, 55, 58]];
    const chord = chords[Math.floor(bar / 2)];
    if (i % 4 === 0) this._kick(at);
    if (i === 4 || i === 12) {
      this._noiseHit(at, 0.15, 0.13, 1500, 'bandpass');
      this._note(50, at, 0.08, 0.09, 'triangle');
    }
    if (i % 2 === 0 || (bar % 2 && i === 15))
      this._noiseHit(at, i === 14 ? 0.13 : 0.045, i % 4 === 2 ? 0.07 : 0.035, 7600);
    if (i % 2 === 0) {
      const bass = chord[0] - 12 + (i === 10 || i === 14 ? 12 : 0);
      this._note(bass, at + 0.012, beat * 0.4, 0.12, 'sawtooth', this.music, 680);
    }
    if (i === 0 || i === 8) {
      chord.forEach((n, j) => this._note(n + 12, at + j * 0.013, beat * 1.65, 0.023, 'triangle'));
    }
    const arp = [0, 2, 1, 3, 2, 1, 3, 2];
    const arpNote = chord[arp[i % 8]] + 24;
    this._note(arpNote, at, beat * 0.27, i % 2 === 0 ? 0.033 : 0.022, 'triangle', this.music, 3900);
    // Syncopated original motif enters in the second half of each phrase.
    if (bar % 2 === 1) {
      const melody = { 0: [0, 24], 3: [2, 24], 6: [1, 24], 8: [3, 24], 11: [2, 24], 14: [0, 36] };
      if (melody[i]) {
        const [n, octave] = melody[i];
        this._note(chord[n] + octave, at, beat * 0.58, 0.045, 'sine');
        this._note(chord[n] + octave, at + beat * 0.75, beat * 0.35, 0.013, 'sine');
      }
    }
  }

  _startMusic() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicEnabled || this._destroyed || this._suspended) return;
    if (this._track) {
      if (this._trackSource) return;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = this._track;
      source.loop = true;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.12);
      source.connect(gain).connect(this.music);
      source.start(0, this._trackOffset % this._track.duration);
      this._trackStartedAt = this.ctx.currentTime;
      this._trackSource = source;
      this._trackGain = gain;
      this._musicSources.add(source);
      source.onended = () => { source.disconnect(); gain.disconnect(); this._musicSources.delete(source); };
      this._notify();
      return;
    }
    if (this.trackKind === 'builtin' && !this._fallback) {
      if (!this._pendingBuiltin) void this.loadBuiltinTrack(this.builtinTrackId).catch(() => {});
      return;
    }
    if (this._timer) return;
    this._nextStepTime = this.ctx.currentTime + 0.04;
    const schedule = () => {
      if (!this.ctx || this.ctx.state !== 'running' || this._suspended || !this.musicEnabled) return;
      const now = this.ctx.currentTime;
      if (this._nextStepTime < now - 0.2) this._nextStepTime = now + 0.02;
      while (this._nextStepTime < now + 0.12) {
        this._scheduleStep(this._step++, this._nextStepTime);
        this._nextStepTime += 60 / 132 / 4;
      }
    };
    schedule();
    this._timer = setInterval(schedule, 30);
    this._notify();
  }

  _stopMusic(resetPosition = false, immediately = false) {
    clearInterval(this._timer);
    this._timer = null;
    this._clearVoices(this.music);
    if (this._trackSource) {
      if (this._track) this._trackOffset = (this._trackOffset + this.ctx.currentTime - this._trackStartedAt) % this._track.duration;
      const source = this._trackSource;
      const at = this.ctx.currentTime;
      if (!immediately && this.ctx.state === 'running') {
        this._trackGain.gain.cancelScheduledValues(at);
        this._trackGain.gain.setValueAtTime(this._trackGain.gain.value, at);
        this._trackGain.gain.linearRampToValueAtTime(0, at + 0.1);
      }
      try { source.stop(immediately ? at : at + 0.12); } catch (_) { /* already stopped */ }
      if (immediately) source.disconnect();
      this._trackSource = null;
      this._trackGain = null;
    }
    if (immediately) {
      for (const source of this._musicSources) {
        try { source.stop(); } catch (_) { /* already stopped */ }
        source.disconnect();
      }
      this._musicSources.clear();
    }
    if (resetPosition) { this._trackOffset = 0; this._step = 0; }
  }

  async loadBuiltinTrack(id = this.builtinTrackId) {
    const track = BUILTIN_TRACKS.find(t => t.id === id) || BUILTIN_TRACKS[0];
    if (this._pendingBuiltin?.id === track.id && this._pendingBuiltin.loadId === this._loadId) return this._pendingBuiltin.promise;
    if (this.trackKind === 'builtin' && this.builtinTrackId === track.id && this._track) {
      this._startMusic();
      return this._track;
    }
    const loadId = ++this._loadId;
    this._stopMusic(true);
    this._track = null;
    this._fallback = false;
    this.trackKind = 'builtin';
    this.builtinTrackId = track.id;
    this.builtinTrackName = track.title;
    this.userTrackName = '';
    this._init();
    const promise = (async () => {
      let buffer = this._builtinCache.get(track.id);
      if (!buffer) {
        const response = await fetch(new URL(track.file, document.baseURI));
        if (!response.ok) throw new Error(`Music asset returned ${response.status}`);
        buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
        this._builtinCache.set(track.id, buffer);
      }
      if (this._destroyed || loadId !== this._loadId) return;
      this._track = buffer;
      this._startMusic();
      return buffer;
    })();
    this._pendingBuiltin = {id:track.id,promise,loadId};
    try { return await promise; }
    catch (error) {
      if (!this._destroyed && loadId === this._loadId) {
        this._fallback = true;
        this._startMusic();
        window.dispatchEvent(new CustomEvent('game-audio:error', {detail:{message:'音频文件暂不可用，已切换原创合成配乐；点击曲目可重试。',fallback:true}}));
      }
      throw error;
    }
    finally { if (this._pendingBuiltin?.promise === promise) this._pendingBuiltin = null; }
  }

  update({ speed = 0, drift = false, boost = false, racing = false } = {}) {
    this._state = { speed, drift, boost, racing };
    if (!this.ctx || this.ctx.state !== 'running' || this._suspended) return;
    const ratio = Math.max(0, Math.min(1.4, speed / 320));
    // Small gear drops avoid a monotonous single rising oscillator.
    const gear = Math.floor(ratio * 5);
    const rpm = 42 + ratio * 110 - gear * 7 + (boost ? 22 : 0);
    this._engineOscillators.forEach((o, i) => this._ramp(o.frequency, rpm * (i ? 1.006 : 1), 0.09));
    this._ramp(this._engineFilter.frequency, 300 + ratio * 650 + (boost ? 400 : 0), 0.1);
    this._ramp(this._engineGain.gain, racing && !this._paused ? 0.015 + ratio * 0.025 : 0, 0.09);
    this._ramp(this._driftGain.gain, racing && !this._paused && drift && speed > 30 ? 0.055 : 0, 0.065);
    this._lastBoost = boost;
  }

  play(name) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.effectsEnabled || this._paused || this._suspended) return;
    const at = this.ctx.currentTime;
    const cooldown = {collision:0.16,boost:0.25,click:0.045,count:0.25,finish:1}[name] || 0.1;
    if (at - (this._lastEffects.get(name) ?? -Infinity) < cooldown) return;
    if ([...this._voices].filter(voice => voice.bus === this.effects).length > 24) return;
    this._lastEffects.set(name, at);
    const note = (n, t, length, level, type = 'sine') => this._note(n, at + t, length, level, type, this.effects, 4200);
    switch (name) {
      case 'click': note(83, 0, 0.055, 0.06); break;
      case 'count': note(76, 0, 0.12, 0.16); break;
      case 'go': note(88, 0, 0.36, 0.15); note(95, 0.04, 0.4, 0.08); break;
      case 'boost': {
        this._noiseHit(at, 0.58, 0.2, 900, 'bandpass', this.effects);
        [62, 69, 74, 81, 86].forEach((n, i) => note(n, i * 0.035, 0.22, 0.045, 'triangle'));
        break;
      }
      case 'collision':
        this._noiseHit(at, 0.2, 0.26, 520, 'lowpass', this.effects);
        note(33, 0, 0.22, 0.2, 'triangle');
        break;
      case 'finish':
        [74, 77, 81, 86, 89, 93].forEach((n, i) => note(n, i * 0.1, i === 5 ? 0.95 : 0.28, 0.1, 'triangle'));
        break;
    }
  }

  async loadUserTrack(file) {
    const loadId = ++this._loadId;
    if (!file) {
      await this.loadBuiltinTrack();
      return;
    }
    if (file.size > 64 * 1024 * 1024) throw new Error('请选择小于 64 MB 的音频文件');
    this._init();
    let buffer;
    try {
      buffer = await this.ctx.decodeAudioData(await file.arrayBuffer());
    } catch (_) {
      throw new Error('无法读取此音频，请选择 MP3、WAV 或浏览器支持的音乐文件');
    }
    if (this._destroyed || loadId !== this._loadId) return;
    this._stopMusic(true);
    this._track = buffer;
    this._fallback = false;
    this.trackKind = 'local';
    this.userTrackName = file.name;
    this._startMusic();
  }

  cancelPendingLoad() {
    this._loadId++;
    this._pendingBuiltin = null;
  }

  destroy() {
    this._destroyed = true;
    this._loadId++;
    this._lifecycleCleanup?.();
    this._stopMusic(false, true);
    this._clearVoices();
    this._engineOscillators?.forEach(o => { try { o.stop(); } catch (_) {} });
    try { this._driftSource?.stop(); } catch (_) {}
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
