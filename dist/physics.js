/** Deterministic manual arcade driving. Distances: metres; speed: km/h.
 * World heading is atan2(forward.x, forward.z). Positive lane is the driver's
 * right (-tangent.z, 0, tangent.x); right steering decreases world heading.
 */
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const CARS=[{speed:285,handling:1,nitro:1},{speed:278,handling:1.12,nitro:1.03},{speed:295,handling:.92,nitro:.97}];
const COLORS=['#65d7ff','#f2cc60','#a899f5','#d8f3ee','#ff9c75'];
const NAMES=['海风','弯道诗人','蓝色闪电','追光者','夜行星'];
export class RaceSession {
 constructor({trackLength,sample,mode='race',difficulty='normal',carIndex=0}={}){
  if(!Number.isFinite(trackLength)||trackLength<=0)throw new TypeError('trackLength must be a positive distance');
  this.trackLength=trackLength;this.sample=typeof sample==='function'?sample:()=>({angle:0,curvature:0});
  this.mode=['race','time','practice','sprint','drift'].includes(mode)?mode:'race';this.difficulty=['easy','normal','hard'].includes(difficulty)?difficulty:'normal';
  this.car=CARS[clamp(Math.trunc(carIndex)||0,0,2)];this.maxSpeed=this.car.speed;this.totalLaps=['practice','drift'].includes(this.mode)?Infinity:this.mode==='sprint'?1:2;
  this.progress=0;this.lane=0;this.speed=0;this.elapsed=0;this.lap=1;this.rank=1;this.nitro=35;this.boost=0;this.drift=false;this.driftTime=0;this.finished=false;this.result=null;
  this.heading=this._road(0).angle;this.travelHeading=this.heading;this.steering=0;this.driftAngle=0;
  this.driftSeconds=0;this.boostCount=0;this.peakSpeed=0;this.bestLap=Infinity;this.lapTimes=[];this._lapStart=0;this._lastLap=0;this._collisionCooldown=0;this._steer=0;
  this.score=0;this.combo=1;this.bestCombo=1;this._score=0;this._comboDrift=0;this._comboGrace=0;
  const base={easy:217,normal:239,hard:259}[this.difficulty];
  this.opponents=['race','sprint'].includes(this.mode)?NAMES.map((name,i)=>({name,color:COLORS[i],progress:[24,15,6,-4,-14][i],lane:[-4,3,-1,5,-5][i],speed:0,targetSpeed:base+[9,1,-5,-12,-2][i],finishTime:null})):[];
  this.rank=1+this.opponents.filter(o=>o.progress>this.progress).length;
 }
 get scoring(){return this.mode==='drift'&&!this.finished&&this.drift&&this.speed>85&&Math.abs(this.driftAngle)>.035&&this._collisionCooldown<=0&&Math.abs(this.lane)<8.8;}
 get timeRemaining(){return this.mode==='drift'?Math.max(0,90-this.elapsed):Infinity;}
 _road(progress){const point=this.sample(progress,0)||{};return {angle:Number.isFinite(point.angle)?point.angle:0,curvature:clamp(Number(point.curvature)||0,-.025,.025)};}
 update(dt,input={}){
  const events=[];if(this.finished||!Number.isFinite(dt)||dt<=0)return events;
  // Fixed-size substeps keep steering and collisions equivalent at 30/60 fps.
  let remaining=Math.min(dt,.25,this.timeRemaining);while(remaining>1e-8&&!this.finished){const step=Math.min(remaining,1/60);this._step(step,input,events);remaining-=step;}
  if(this.mode==='drift'&&this.timeRemaining<1e-7&&!this.finished){this.elapsed=90;this._finish(events);}
  return [...new Set(events)];
 }
 _step(dt,input,events){
  const beforeTime=this.elapsed,beforeProgress=this.progress;this.elapsed+=dt;this._collisionCooldown=Math.max(0,this._collisionCooldown-dt);
  const turn=(input.right?1:0)-(input.left?1:0),road=this._road(this.progress);
  // Releasing the controls neutralizes the wheels, never the vehicle heading.
  this._steer=turn?this._steer+(turn-this._steer)*(1-Math.exp(-dt*16)):0;this.steering=this._steer;
  this.drift=!!input.drift&&turn!==0&&this.speed>75&&!input.brake;
  if(this.drift){this.driftTime+=dt;this.driftSeconds+=dt;}else this.driftTime=0;
  const oldNitro=this.nitro;
  if(this.drift)this.nitro=clamp(this.nitro+dt*(11+this.speed/65)*this.car.nitro,0,100);
  else if(this.speed>100)this.nitro=clamp(this.nitro+dt*.35,0,100);
  if(oldNitro<35&&this.nitro>=35)events.push('nitroReady');
  const boosting=this.boost>0;this.boost=Math.max(0,this.boost-dt);
  // Speed changes come from the driver's controls; reading a bend never steers
  // or brakes the player automatically.
  let target=this.maxSpeed*(this.drift?.79:1)+(boosting?60:0);
  if(input.brake)target=0;
  const acceleration=input.brake?135:boosting?90:this.speed>target?46:49;
  this.speed+=clamp(target-this.speed,-acceleration*dt,acceleration*dt);
  const turningAtSpeed=clamp(this.speed/120,0,1);
  if(this.steering!==0)this.heading=wrapAngle(this.heading-this.steering*(this.drift?1.18:.82)*this.car.handling*turningAtSpeed*dt);
  // During a drift the tyres retain some lateral momentum. When grip returns,
  // velocity follows the car's own heading, not the centreline's direction.
  if(this.drift)this.travelHeading=wrapAngle(this.travelHeading+wrapAngle(this.heading-this.travelHeading)*(1-Math.exp(-dt*3.4)));
  else this.travelHeading=this.heading;
  this.driftAngle=wrapAngle(this.heading-this.travelHeading);
  const relativeHeading=wrapAngle(this.travelHeading-road.angle),metres=this.speed/3.6*dt;
  // Frenet coordinates only locate the free-heading car on the track. There is
  // no centre pull, heading correction, curve-follow term or player autopilot.
  const longitudinal=metres*Math.cos(relativeHeading)/clamp(1-road.curvature*this.lane,.65,1.35);
  this.lane-=metres*Math.sin(relativeHeading);
  this.progress=Math.max(0,this.progress+longitudinal);
  this.peakSpeed=Math.max(this.peakSpeed,this.speed);
  if(!Number.isFinite(this.lane))this.lane=0;
  let hitBarrier=false,hitOpponent=false;
  if(Math.abs(this.lane)>8.8){
   hitBarrier=true;
   this.lane=clamp(this.lane,-8.8,8.8);
   if(this._collisionCooldown<=0&&this.speed>30){this.speed*=.6;this._collisionCooldown=.75;events.push('collision');}
   // A barrier stops outward position and removes speed. It never turns the
   // car back along the road: recovery requires steering or explicit reset.
  }
  const finishDistance=this.trackLength*this.totalLaps;
  for(let i=0;i<this.opponents.length;i++){
   const opponent=this.opponents[i];if(opponent.finishTime!==null)continue;
   const curve=Math.abs(this._road(opponent.progress).curvature);
   const pace=opponent.targetSpeed-Math.min(24,curve*1800)+Math.sin(this.elapsed*.6+i*1.9)*8;
   opponent.speed+=clamp(pace-opponent.speed,-55*dt,47*dt);
   opponent.lane+=((Math.sin(opponent.progress/140+i*1.8)*3.9)-opponent.lane)*dt*.6;
   const opponentBefore=opponent.progress;opponent.progress+=opponent.speed/3.6*dt;
   if(opponent.progress>=finishDistance){opponent.finishTime=beforeTime+dt*clamp((finishDistance-opponentBefore)/Math.max(.00001,opponent.progress-opponentBefore),0,1);opponent.progress=finishDistance;}
   if(Math.abs(opponent.progress-this.progress)<3.9&&Math.abs(opponent.lane-this.lane)<1.8&&this._collisionCooldown<=0&&this.speed>80){
    hitOpponent=true;this.speed*=.84;this.lane=clamp(this.lane+(this.lane>=opponent.lane?.8:-.8),-8.8,8.8);this._collisionCooldown=1;events.push('collision');
   }
  }
  this.rank=1+this.opponents.filter(o=>o.finishTime!==null||o.progress>this.progress).length;
  if(this.mode==='drift')this._scoreDrift(dt,hitBarrier||hitOpponent);
  const crossed=Math.floor(this.progress/this.trackLength);
  // Crossing backwards does not reset earned lap boundaries, so driving back
  // and forth over a line cannot farm laps or finish a race early.
  if(crossed>this._lastLap){
   const crossingDistance=(this._lastLap+1)*this.trackLength;
   const fraction=clamp((crossingDistance-beforeProgress)/Math.max(.00001,this.progress-beforeProgress),0,1);
   const crossingTime=beforeTime+dt*fraction;
   const lapTime=crossingTime-this._lapStart;this.lapTimes.push(lapTime);this.bestLap=Math.min(this.bestLap,lapTime);this._lapStart=crossingTime;this._lastLap=crossed;
   this.lap=Math.min(crossed+1,this.totalLaps);events.push('lap');
   if(this.progress>=finishDistance){this.progress=finishDistance;this.elapsed=crossingTime;this.rank=1+this.opponents.filter(o=>o.finishTime!==null&&o.finishTime<crossingTime).length;this._finish(events);
   }
  }
 }
 _resetCombo(){this.combo=1;this._comboDrift=0;this._comboGrace=0;}
 _scoreDrift(dt,collision){
  if(collision){this._resetCombo();return;}
  const slip=Math.abs(this.driftAngle);
  // Only controlled tyre slip earns points. Holding Shift on a straight or
  // scraping a barrier cannot score, and resetting cannot preserve a combo.
  const scoring=this.drift&&this.speed>85&&slip>.035&&this._collisionCooldown<=0;
  if(scoring){
   this._comboDrift+=dt;this._comboGrace=.8;
   this.combo=Math.min(5,1+Math.floor((this._comboDrift+1e-9)/2));this.bestCombo=Math.max(this.bestCombo,this.combo);
   this._score+=dt*(this.speed*.65)*clamp(slip/.22,.2,1.8)*this.combo;this.score=Math.floor(this._score);
  }else{this._comboGrace=Math.max(0,this._comboGrace-dt);if(this._comboGrace===0)this._resetCombo();}
 }
 _finish(events){
  this.finished=true;this.drift=false;this.boost=0;
  this.result={rank:this.rank,time:this.elapsed,bestLap:this.bestLap,maxSpeed:this.peakSpeed,driftSeconds:this.driftSeconds,boostCount:this.boostCount,mode:this.mode,score:this.score,bestCombo:this.bestCombo};events.push('finish');
 }
 activateBoost(){if(this.finished||this.nitro<35||this.boost>.15)return false;this.nitro-=35;this.boost=2.8;this.boostCount++;return true;}
 resetToRoad(){if(this.finished)return;this._resetCombo();this.lane=0;this._steer=0;this.steering=0;this.heading=this._road(this.progress).angle;this.travelHeading=this.heading;this.driftAngle=0;this.speed=Math.min(this.speed*.6,100);this.drift=false;this.driftTime=0;this.boost=0;this._collisionCooldown=1;}
}
