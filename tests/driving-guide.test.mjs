import assert from 'node:assert/strict';
import {createDrivingGuide} from '../dist/driving-guide.js';
import {TRACKS, createTrackCurve, createTrackSampler} from '../dist/tracks.js';

const synthetic = segments => createDrivingGuide({
  trackLength: 1200,
  sample: distance => ({curvature: segments.find(([from, to]) => distance >= from && distance < to)?.[2] || 0}),
});
assert.throws(() => createDrivingGuide({sample: () => ({}), trackLength: 0}), TypeError);
assert.equal(synthetic([]).read({progress: 0, speed: 300}).direction, 'straight');
const right = synthetic([[300, 450, .018]]);
const left = synthetic([[300, 450, -.018]]);
assert.equal(right.read({progress: 260, speed: 200}).direction, 'right');
assert.equal(left.read({progress: 260, speed: 200}).direction, 'left');
assert.equal(right.read({progress: 310, speed: 200}).severity, 'hairpin');
assert.equal(right.read({progress: 310, speed: 200}).active, true);
assert.equal(right.read({progress: 310, speed: 200}).distance, 0);
assert.equal(right.read({progress: 210, speed: 300}).braking, true);
assert.equal(right.read({progress: 210, speed: 100}).braking, false);
assert.equal(right.read({progress: 100, speed: 80}).visible, false);
assert.equal(right.read({progress: 100, speed: 300}).visible, true);
const chicane = synthetic([[300, 360, .012], [372, 432, -.012]]);
assert.equal(chicane.read({progress: 325, speed: 170}).direction, 'right');
assert.equal(chicane.read({progress: 395, speed: 170}).direction, 'left');
const seam = synthetic([[0, 60, -.014], [1110, 1200, -.014]]);
assert.equal(seam.bends.length, 1, 'finish-line seam keeps one corner');
assert.equal(seam.read({progress: 1190, speed: 200}).id, seam.read({progress: 1210, speed: 200}).id);
assert.deepEqual(seam.read({progress: 1210, speed: 200}), seam.read({progress: 10, speed: 200}));
assert.deepEqual(seam.read({progress: -10, speed: 200}), seam.read({progress: 1190, speed: 200}));
let calls = 0;
const cached = createDrivingGuide({trackLength: 1200, sample: () => {calls++; return {curvature: 0};}});
const setupCalls = calls;
for(let i = 0; i < 600; i++) cached.read({progress: i, speed: 200});
assert.equal(calls, setupCalls, 'HUD reads never re-sample route geometry');

const summary = [];
for (const track of TRACKS) {
  const data = createTrackCurve(track.id), sample = createTrackSampler(data);
  const guide = createDrivingGuide({trackLength: data.length, sample});
  assert(guide.bends.length > 0, `${track.id}: meaningful route notes`);
  let visible = 0;
  for (let progress = 0; progress < data.length; progress += 12) {
    const note = guide.read({progress, speed: 250});
    assert(Number.isFinite(note.distance) && Number.isFinite(note.recommendedSpeed));
    assert(note.distance >= 0 && note.recommendedSpeed >= 90 && note.recommendedSpeed <= 285);
    const repeated = guide.read({progress: progress + data.length, speed: 250});
    assert.deepEqual(repeated, note, `${track.id}: notes repeat each lap`);
    if (note.visible) visible++;
  }
  assert(visible > 0);
  // Direction agrees with the real road's heading change at each bend apex.
  for (const bend of guide.bends) {
    let peak = {curvature: 0, progress: bend.start};
    for(let d = 0; d < bend.length; d += 4) {
      const point = sample(bend.start + d);
      if(Math.abs(point.curvature) > Math.abs(peak.curvature)) peak = {...point, progress: bend.start + d};
    }
    const before = sample(peak.progress - 1).angle, after = sample(peak.progress + 1).angle;
    const headingChange = Math.atan2(Math.sin(after - before), Math.cos(after - before));
    assert.equal(bend.direction, headingChange > 0 ? 'left' : 'right', `${track.id}: physical turn direction`);
  }
  summary.push({track: track.id, bends: guide.bends.length});
}
console.log(JSON.stringify({passed: true, cachedGeometry: true, tracks: summary}));
