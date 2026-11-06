/** Read-only route notes. Metres / km/h, matching RaceSession's road sampler.
 * Positive sampler curvature is a right turn (world heading decreases).
 * Geometry is cached once per track; read() does not call the sampler.
 */
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const wrap = (n, length) => ((n % length) + length) % length;

export function createDrivingGuide({ sample, trackLength } = {}) {
  if (typeof sample !== 'function' || !Number.isFinite(trackLength) || trackLength <= 0) {
    throw new TypeError('A route sampler and positive track length are required');
  }
  const count = clamp(Math.ceil(trackLength / 6), 32, 4096);
  const step = trackLength / count;
  const raw = Array.from({ length: count }, (_, i) => {
    const curvature = Number(sample(i * step, 0)?.curvature);
    return Number.isFinite(curvature) ? clamp(curvature, -.1, .1) : 0;
  });
  // Remove tiny spline ripples without hiding a sustained change of direction.
  const smooth = raw.map((k, i) => (raw[(i + count - 1) % count] + 2 * k + raw[(i + 1) % count]) / 4);
  const labels = smooth.map(k => Math.abs(k) >= .003 ? Math.sign(k) : 0);
  const originalLabels = labels.slice();
  // A brief flat at an apex should not produce two alternating instructions.
  // Never join opposite turns, even when the neutral section is very short.
  const bridge = clamp(Math.floor(24 / step), 1, count - 1);
  for (let i = 0; i < count; i++) {
    if (originalLabels[i]) continue;
    let before = 1, after = 1;
    while (before <= bridge && !originalLabels[(i - before + count) % count]) before++;
    while (after <= bridge && !originalLabels[(i + after) % count]) after++;
    if (before + after - 1 <= bridge) {
      const a = originalLabels[(i - before + count) % count];
      const b = originalLabels[(i + after) % count];
      if (a && a === b) labels[i] = a;
    }
  }
  // Begin at a boundary so a corner spanning the finish line remains one note.
  let pivot = labels.findIndex((sign, i) => sign !== labels[(i + count - 1) % count]);
  if (pivot < 0) pivot = 0;
  const bends = [];
  for (let offset = 0; offset < count;) {
    const start = offset, sign = labels[(pivot + offset) % count];
    let peak = 0, angle = 0;
    while (offset < count && labels[(pivot + offset) % count] === sign) {
      const k = raw[(pivot + offset) % count];
      peak = Math.max(peak, Math.abs(k));
      angle += Math.max(0, k * sign) * step;
      offset++;
    }
    const length = (offset - start) * step;
    if (!sign || length < 18 || angle < .17) continue;
    const hairpin = length < 360 && angle >= 2.1;
    const severity = hairpin ? 'hairpin' : peak >= .009 || angle >= .9 ? 'sharp' : 'bend';
    // Leave steering margin for manual correction. This is an advisory target,
    // not an automatic speed limit or a guarantee for every entry angle.
    const recommendedSpeed = Math.round(clamp(.61 / Math.max(.001, peak) * 3.6, 90, 270) / 10) * 10;
    bends.push(Object.freeze({
      id: bends.length,
      start: wrap((pivot + start - .5) * step, trackLength),
      length,
      direction: sign > 0 ? 'right' : 'left',
      severity,
      recommendedSpeed,
      turnAngle: angle,
    }));
  }
  const straight = Object.freeze({
    direction: 'straight', severity: 'straight', distance: 0,
    recommendedSpeed: 285, braking: false, active: false, visible: false, id: null,
  });
  return Object.freeze({
    bends: Object.freeze(bends),
    read({ progress = 0, speed = 0 } = {}) {
      const position = wrap(Number.isFinite(progress) ? progress : 0, trackLength);
      const velocity = clamp(Number.isFinite(speed) ? speed : 0, 0, 500) / 3.6;
      // At higher speed the player needs more time to read the same route.
      const horizon = clamp(velocity * 3.4 + 40, 120, 360);
      let next, distance = Infinity, active = false;
      for (const bend of bends) {
        const travelled = wrap(position - bend.start, trackLength);
        const inside = travelled < bend.length;
        const ahead = inside ? 0 : wrap(bend.start - position, trackLength);
        if (ahead < distance) { next = bend; distance = ahead; active = inside; }
      }
      if (!next || distance > horizon) return straight;
      const target = next.recommendedSpeed / 3.6;
      // RaceSession brakes at 135 km/h per second. Add human reaction room.
      const brakingDistance = Math.max(0, (velocity * velocity - target * target) / (2 * (135 / 3.6))) + velocity * .65;
      return {
        id: next.id, direction: next.direction, severity: next.severity,
        distance: Math.max(0, Math.round(distance / 5) * 5),
        recommendedSpeed: next.recommendedSpeed,
        braking: speed > next.recommendedSpeed + 12 && distance <= brakingDistance,
        active, visible: true,
      };
    },
  });
}
