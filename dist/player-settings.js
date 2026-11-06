const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const level = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

export function normalizeSettings(value, touch = false) {
 const saved = record(value);
 return {
  music: typeof saved.music === 'boolean' ? saved.music : true,
  effects: typeof saved.effects === 'boolean' ? saved.effects : true,
  volume: level(saved.volume, .45),
  musicVolume: level(saved.musicVolume, .8),
  effectsVolume: level(saved.effectsVolume, 1),
  quality: ['low','medium','high'].includes(saved.quality) ? saved.quality : touch ? 'medium' : 'high',
  difficulty: ['easy','normal','hard'].includes(saved.difficulty) ? saved.difficulty : 'normal',
  guide: typeof saved.guide === 'boolean' ? saved.guide : true
 };
}

export function normalizeProfile(value) {
 const saved = record(value);
 const count = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
 const scores = source => Object.fromEntries(Object.entries(record(source)).filter(([,n]) => typeof n === 'number' && Number.isFinite(n) && n >= 0));
 const positive = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0;
 const records = (Array.isArray(saved.records) ? saved.records : [])
  .filter(r => r && typeof r === 'object' && Number.isFinite(r.time) && r.time >= 0 && (r.mode === undefined || ['race','sprint','time','drift'].includes(r.mode)))
  .slice(0,30).map(r => ({
   mode:r.mode ?? 'race', time:r.time, rank:Math.max(1, Math.min(6, count(r.rank) || 6)),
   score:count(r.score), bestCombo:Math.max(1, Math.min(5, positive(r.bestCombo))),
   track:typeof r.track === 'string' ? r.track : 'coast', car:Math.min(2,count(r.car)),
   date:positive(r.date), bestLap:positive(r.bestLap), maxSpeed:positive(r.maxSpeed),
   driftSeconds:positive(r.driftSeconds), boostCount:count(r.boostCount)
  }));
 return {
  races: count(saved.races), wins: count(saved.wins),
  bests: scores(saved.bests), scores: scores(saved.scores),
  records
 };
}
