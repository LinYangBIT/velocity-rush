import assert from 'node:assert/strict';
import {GameAudio} from '../dist/audio.js';

// Model the Web Audio lifecycle, including a browser that leaves resume()
// pending until a real gesture. These tests do not claim to assess sound quality.
class Param {
  value = 0;
  setValueAtTime(v) { this.value = v; }
  setTargetAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  exponentialRampToValueAtTime(v) { this.value = v; }
  cancelScheduledValues() {}
}
class Node {
  gain = new Param(); frequency = new Param(); Q = new Param();
  threshold = new Param(); knee = new Param(); ratio = new Param();
  attack = new Param(); release = new Param();
  connect(next) { return next; }
  disconnect() { this.disconnected = true; }
  start(at = 0, offset = 0) { this.started = {at, offset}; }
  stop() { this.stopped = true; this.onended?.(); }
}
class Context {
  state = 'suspended'; currentTime = 0; sampleRate = 8000; destination = new Node();
  createGain() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createOscillator() { return new Node(); }
  createBiquadFilter() { return new Node(); }
  createBufferSource() { return new Node(); }
  createBuffer(_channels, length) { return {getChannelData:() => new Float32Array(length)}; }
  decodeAudioData() { return Promise.resolve({duration:58}); }
  resume() { if (this.blocked) return new Promise(() => {}); this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
globalThis.window = Object.assign(new EventTarget(), {AudioContext:Context});
globalThis.document = Object.assign(new EventTarget(), {hidden:false,baseURI:'http://localhost:4173/'});
globalThis.fetch = async () => ({ok:true,arrayBuffer:async () => new ArrayBuffer(8)});

const audio = new GameAudio();
audio.installLifecycle();
await audio._pendingBuiltin.promise;
assert.equal(audio.playbackState, 'playing', 'allowed autoplay starts original BGM');
const first = audio._trackSource;
for (let i=0;i<8;i++) await audio.unlock();
assert.equal(audio._trackSource, first, 'repeated start / unlock keeps one loop');
assert.equal(audio._musicSources.size, 1);

audio.setMusicVolume(.25); audio.setEffectsVolume(.8);
assert.equal(audio.music.gain.value, .25);
assert.equal(audio.effects.gain.value, .8, 'music adjustment preserves effects volume');
audio.setPaused(true);
assert.equal(audio.music.gain.value, .25*.35);
assert.equal(audio.effects.gain.value, 0);
audio.play('boost');
assert.equal(audio._voices.size, 0, 'paused race cannot schedule driving SFX');
audio.setPaused(false);
assert.equal(audio.effects.gain.value, .8);
audio.play('collision');
const voicesAfterCollision = audio._voices.size;
for (let i=0;i<50;i++) audio.play('collision');
assert.equal(audio._voices.size, voicesAfterCollision, 'wall-contact SFX is debounced');

audio.ctx.currentTime = 12;
document.hidden = true;
document.dispatchEvent(new Event('visibilitychange'));
assert.equal(audio.playbackState, 'background');
assert.equal(audio._trackSource, null);
assert.equal(audio._voices.size, 0);
assert.equal(audio._trackOffset, 12);
document.hidden = false;
document.dispatchEvent(new Event('visibilitychange'));
await Promise.resolve();
assert.equal(audio.playbackState, 'playing');
assert.equal(audio._trackSource.started.offset, 12, 'background resume continues the same phrase');
audio.setMusicEnabled(false);
audio.setSuspended(true); audio.setSuspended(false); await audio.unlock();
assert.equal(audio.playbackState, 'muted', 'returning to foreground preserves explicit mute');
assert.equal(audio._trackSource, null);
audio.destroy();

const blocked = new GameAudio();
blocked._init(); blocked.ctx.blocked = true;
blocked.installLifecycle();
assert.equal(await blocked.unlock(), false, 'autoplay denial never blocks game start');
assert.equal(blocked.playbackState, 'waiting');
blocked.ctx.blocked = false;
document.dispatchEvent(new Event('pointerup'));
await blocked._pendingBuiltin.promise;
assert.equal(blocked.playbackState, 'playing', 'a later actual gesture retries unlocking');
blocked.destroy();

globalThis.fetch = async () => ({ok:false,status:404});
const missing = new GameAudio();
await missing.unlock();
await missing._pendingBuiltin.promise.catch(() => {});
await Promise.resolve();
assert(missing._fallback && missing._timer, 'missing MP3 falls back to the original sequenced score');
assert.equal(missing.playbackState, 'playing');
missing.setSuspended(true);
assert.equal(missing._timer, null, 'background stops the fallback scheduler');
assert.equal(missing._voices.size, 0, 'background clears previously scheduled notes');
missing.destroy();

console.log('Audio lifecycle: autoplay retry, one loop, independent mix, pause, background, mute and fallback passed.');
