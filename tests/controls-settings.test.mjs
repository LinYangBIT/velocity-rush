import assert from 'node:assert/strict';
import {createDrivingInput, KEY_CONTROLS} from '../dist/driving-input.js';
import {normalizeSettings, normalizeProfile} from '../dist/player-settings.js';

const controls = createDrivingInput();
controls.press('key:KeyA', KEY_CONTROLS.KeyA);
controls.press('key:ArrowLeft', KEY_CONTROLS.ArrowLeft);
controls.release('key:KeyA');
assert(controls.state.left, 'releasing A must not cancel a held left arrow');
controls.press('pointer:4', 'left');
controls.release('key:ArrowLeft');
assert(controls.state.left, 'touch remains active after keyboard release');
controls.press('pointer:5', 'left');
controls.press('pointer:6', 'drift');
controls.release('pointer:4');
assert(controls.state.left && controls.state.drift, 'one lifted finger does not release another');
controls.release('pointer:5');
assert(!controls.state.left && controls.state.drift);
controls.reset();
assert(Object.values(controls.state).every(v => !v), 'pause/cancel clears every source');
controls.release('pointer:6');
assert(Object.values(controls.state).every(v => !v));

assert.equal(normalizeSettings({music:false,volume:0,bgmVersion:0}).music, false, 'legacy mute survives migration');
assert.equal(normalizeSettings({music:false,volume:0}).volume, 0);
assert.equal(normalizeSettings({effectsVolume:.3,musicVolume:.7}).musicVolume, .7);
assert.equal(normalizeSettings({quality:'broken',volume:'bad',difficulty:'unknown'},true).quality, 'medium');
for (const invalid of [null, [], 'broken', 4]) {
 assert.equal(normalizeSettings(invalid).music, true);
 assert.deepEqual(normalizeProfile(invalid).records, []);
}
const restored = normalizeProfile({races:4,wins:2,records:null,bests:{'coast-time-normal':55,broken:'bad'},scores:[]});
assert.equal(restored.races,4);
assert.deepEqual(restored.bests,{'coast-time-normal':55});
assert.deepEqual(restored.records,[]);
const oldRecords=normalizeProfile({records:[{time:12,mode:'drift',score:{toLocaleString:0}},{time:50,rank:1}]}).records;
assert.equal(oldRecords[0].score.toLocaleString(),'0','malformed score cannot break the records view');
assert.equal(oldRecords[1].mode,'race','legacy results without a mode survive migration');
console.log('Controls and saved preferences: passed');
