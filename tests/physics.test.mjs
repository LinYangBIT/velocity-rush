import assert from 'node:assert/strict';
import {RaceSession} from '../dist/physics.js';
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const straight={trackLength:2600,sample:()=>({angle:0,curvature:0}),mode:'time'};
const advance=(race,seconds,input={})=>{let events=[];for(let i=0;i<Math.round(seconds*60);i++)events.push(...race.update(1/60,input));return events;};

// With +Z forward, a physical right turn decreases world yaw and moves toward
// the positive/right lane. These were previously reversed on screen.
const right=new RaceSession(straight),left=new RaceSession(straight);right.speed=left.speed=180;
advance(right,.3,{right:true});advance(left,.3,{left:true});
assert(right.heading<0&&right.lane>0,'right input turns and moves right');
assert(left.heading>0&&left.lane<0,'left input turns and moves left');
assert(Math.abs(right.heading+left.heading)<1e-12&&Math.abs(right.lane+left.lane)<1e-12,'steering directions are symmetric');

// A saved legacy assist option cannot reactivate centering. Releasing controls
// keeps the car's world direction; it does not return to a lane or road heading.
const offset=new RaceSession({...straight,assist:true});offset.speed=160;offset.lane=5;
advance(offset,2);assert.equal(offset.lane,5);assert.equal(offset.heading,0);assert(!('assist' in offset));
const releasedHeading=right.heading,releasedLane=right.lane;
advance(right,.2);assert.equal(right.heading,releasedHeading);assert(right.lane>releasedLane);assert.equal(right.steering,0);
const both=new RaceSession(straight);both.speed=160;advance(both,.5,{left:true,right:true});assert.equal(both.heading,0);assert.equal(both.lane,0);

// On a right-hand bend an untouched car continues its original heading and
// meets the outside barrier. It must not silently follow the centreline.
const radius=160,trackLength=2*Math.PI*radius;
const sample=p=>({angle:wrap(-p/radius),curvature:1/radius});
const curved={trackLength,sample,mode:'time'};
const unattended=new RaceSession(curved);const originalHeading=unattended.heading;
let wallEvents=advance(unattended,60);
assert.equal(unattended.heading,originalHeading);assert(unattended.lane<0);assert(wallEvents.includes('collision'));assert(!unattended.finished&&unattended.progress<trackLength/2,'no-input driving cannot complete a curved circuit');

// Walls slow the car but do not align its heading. R is the sole explicit reset.
const wall=new RaceSession(straight);wall.speed=240;wall.heading=wall.travelHeading=-.5;
const wallHits=advance(wall,.75);assert(wallHits.includes('collision'));assert(Math.abs(wall.lane)<=8.8);assert.equal(wall.heading,-.5);assert(wall.speed<240);
unattended.resetToRoad();assert.equal(unattended.lane,0);assert.equal(unattended.heading,sample(unattended.progress).angle);assert.equal(unattended.travelHeading,unattended.heading);assert.equal(unattended.driftAngle,0);assert.equal(unattended.steering,0);

// This test-only driver sends real left/right inputs. Production code has no
// counterpart: it verifies that a human-steered curved race is still finishable.
function driveCircle(race){
 const desired=wrap(sample(race.progress+race.speed/3.6*.2).angle+Math.atan(race.lane*.12));
 const error=wrap(desired-race.heading);return {left:error>.002,right:error<-.002};
}
const race=new RaceSession({...curved,mode:'race'});let finished=false,maxLane=0;
for(let i=0;i<12000&&!race.finished;i++){if(race.nitro>=35)race.activateBoost();finished=race.update(1/60,driveCircle(race)).includes('finish')||finished;maxLane=Math.max(maxLane,Math.abs(race.lane));}
assert(race.finished&&finished,'explicit steering completes two laps');assert.equal(race.lap,2);assert.equal(race.progress,trackLength*2);assert.equal(race.lapTimes.length,2);assert(race.result.rank>=1&&race.result.rank<=6);assert(race.result.bestLap>0&&race.result.boostCount>0);assert(maxLane<8.8);assert.deepEqual(race.update(1/60,{right:true}),[]);
const time=new RaceSession(curved);assert.equal(time.opponents.length,0);for(let i=0;i<12000&&!time.finished;i++)time.update(1/60,driveCircle(time));assert(time.finished);assert.equal(time.rank,1);

// Drift still charges and spends nitro with manual steering and lateral slip.
const drift=new RaceSession(straight);drift.speed=220;drift.nitro=0;let ready=false,maxSlip=0;
for(let i=0;i<240;i++){const left=Math.floor(i/10)%2===0;ready=drift.update(1/60,{left,right:!left,drift:true}).includes('nitroReady')||ready;maxSlip=Math.max(maxSlip,Math.abs(drift.driftAngle));}
assert(ready&&drift.nitro>=35);assert(drift.driftSeconds>2&&maxSlip>.01);assert(drift.activateBoost());assert.equal(drift.boost,2.8);assert(!drift.activateBoost());

// Reverse motion is real longitudinal motion. Recrossing a lap line backwards
// and forwards cannot award the same lap a second time.
const reversing=new RaceSession({...straight,trackLength:50});reversing.speed=120;
while(reversing.progress<55)reversing.update(1/60,{});
assert.equal(reversing.lap,2);assert.equal(reversing.lapTimes.length,1);
reversing.heading=reversing.travelHeading=Math.PI;
while(reversing.progress>45)reversing.update(1/60,{});
assert(!reversing.finished);assert.equal(reversing.lapTimes.length,1);
reversing.heading=reversing.travelHeading=0;
while(reversing.progress<60)reversing.update(1/60,{});
assert(!reversing.finished);assert.equal(reversing.lapTimes.length,1);

const practice=new RaceSession({...straight,trackLength:50,mode:'practice'});advance(practice,15);assert(!practice.finished&&practice.lap>2&&practice.result===null);
practice.lane=NaN;practice.resetToRoad();assert.equal(practice.lane,0);assert(Number.isFinite(practice.heading));

// The same timed control sequence remains equivalent at 30 and 60 fps.
const fast=new RaceSession(curved),slow=new RaceSession(curved);
function controls(t){return t<.5?{right:true}:t<1?{left:true}:t<1.5?{right:true,drift:true}:{};}
for(let i=0;i<600;i++)fast.update(1/60,controls(i/60));for(let i=0;i<300;i++)slow.update(1/30,controls(i/30));
assert(Math.abs(fast.progress-slow.progress)<.001);assert(Math.abs(fast.lane-slow.lane)<.001);assert(Math.abs(fast.heading-slow.heading)<1e-10);
// Sprint uses the same opponents and manual controls, but ends at its first lap.
const sprint=new RaceSession({...curved,mode:'sprint'});assert.equal(sprint.totalLaps,1);assert.equal(sprint.opponents.length,5);
for(let i=0;i<12000&&!sprint.finished;i++)sprint.update(1/60,driveCircle(sprint));
assert(sprint.finished);assert.equal(sprint.progress,trackLength);assert.equal(sprint.lapTimes.length,1);assert.equal(sprint.result.mode,'sprint');

// Score attack is a timed event, independent of how often a short lap is crossed.
const timedDrift=new RaceSession({...straight,trackLength:50,mode:'drift'});assert.equal(timedDrift.opponents.length,0);assert.equal(timedDrift.timeRemaining,90);
const timerEvents=advance(timedDrift,91);
assert(timedDrift.finished&&timedDrift.lap>2);assert.equal(timedDrift.elapsed,90);assert.equal(timedDrift.timeRemaining,0);assert.equal(timedDrift.result.score,0);assert.equal(timerEvents.filter(e=>e==='finish').length,1);

// Shift alone, steering without tyre slip, and low-speed steering earn nothing.
for(const input of [{drift:true},{right:true},{right:true,drift:true,brake:true}]){
 const notDrifting=new RaceSession({...straight,mode:'drift'});notDrifting.speed=input.brake?25:180;advance(notDrifting,.25,input);assert.equal(notDrifting.score,0);
}
// A test fixture begins in a stable circular drift: holding real steering input
// maintains genuine body/velocity slip without contact with either barrier.
const driftRadius=225.15/3.6/1.18;
function scoreAttack(){
 const r=new RaceSession({trackLength:Math.PI*2*driftRadius,mode:'drift',sample:p=>({angle:wrap(-p/driftRadius),curvature:1/driftRadius})});
 r.speed=225.15;r.heading=-.337;r.travelHeading=0;r._steer=1;return r;
}
const scorer=scoreAttack();const scoreEvents=advance(scorer,10,{right:true,drift:true});
assert(!scoreEvents.includes('collision'));assert(scorer.score>5000);assert.equal(scorer.combo,5);assert.equal(scorer.bestCombo,5);assert(Math.abs(scorer.driftAngle)>.3);
// The short transition allowance preserves a combo, then a longer stop clears it.
scorer.speed=0;advance(scorer,.2,{brake:true});assert.equal(scorer.combo,5);advance(scorer,.7,{brake:true});assert.equal(scorer.combo,1);assert.equal(scorer.bestCombo,5);
const contact=scoreAttack();advance(contact,5,{right:true,drift:true});assert(contact.combo>1);const earned=contact.score,bestCombo=contact.bestCombo;
contact.lane=8.79;contact.heading=contact.travelHeading=contact.sample(contact.progress).angle-.5;
assert(contact.update(1/60,{right:true,drift:true}).includes('collision'));assert.equal(contact.combo,1);assert.equal(contact.score,earned);assert.equal(contact.bestCombo,bestCombo);
advance(contact,.4,{right:true,drift:true});assert.equal(contact.score,earned,'collision cooldown prevents barrier score farming');
const resetScore=scoreAttack();advance(resetScore,5,{right:true,drift:true});assert(resetScore.combo>1);resetScore.resetToRoad();assert.equal(resetScore.combo,1);
// Timed scoring remains frame-rate independent, including the exact deadline.
const score60=scoreAttack(),score30=scoreAttack();for(let i=0;i<600;i++)score60.update(1/60,{right:true,drift:true});for(let i=0;i<300;i++)score30.update(1/30,{right:true,drift:true});assert.equal(score30.score,score60.score);assert.equal(score30.combo,score60.combo);

console.log(JSON.stringify({passed:true,manualSteering:true,noCentering:true,noCurveFollowing:true,race:race.result,maxLane,driftSlip:maxSlip,frameRateStable:true,sprint:sprint.result,driftScore:score60.score,driftTimer:timedDrift.elapsed}));
