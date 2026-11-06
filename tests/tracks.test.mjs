import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {TRACKS,createTrackCurve,createTrackSampler,normalizeTrackId,constrainTunnelCamera} from '../dist/tracks.js';
import {RaceSession} from '../dist/physics.js';
import {buildCircuit} from '../dist/scenery.js';
import * as THREE from '../dist/vendor/three.module.js';

assert.equal(new Set(TRACKS.map(t=>t.id)).size,TRACKS.length);
for(const [old,id] of [['night','city'],['neon','city'],['sunset','coast'],['unknown','coast']])assert.equal(normalizeTrackId(old),id);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const summaries=[];
for(const track of TRACKS){
  const data=createTrackCurve(track.id),sample=createTrackSampler(data),start=sample(0);
  assert(start.position.distanceTo(sample(data.length).position)<1e-8);
  assert(start.position.distanceTo(sample(-data.length).position)<1e-8);
  assert(Math.abs(wrap(sample(.01).angle-sample(data.length-.01).angle))<.005,`${track.id}: smooth seam`);
  assert(existsSync(new URL(`../dist/assets/tracks/${track.id}.svg`,import.meta.url)),`${track.id}: preview exists`);
  const n=Math.ceil(data.length/2),points=[],step=data.length/n;
  let maxCurvature=0,maxGrade=0;
  for(let i=0;i<n;i++){
    const p=sample(i*step);points.push(p.position);
    assert([p.position.x,p.position.y,p.position.z,p.angle,p.curvature,p.slope].every(Number.isFinite));
    assert(Math.abs(p.tangent.length()-1)<1e-8);
    maxCurvature=Math.max(maxCurvature,Math.abs(p.curvature));maxGrade=Math.max(maxGrade,Math.abs(p.slope));
    assert(Math.abs(sample(i*step,8.8).position.distanceTo(p.position)-8.8)<1e-8,'lane matches collision envelope');
  }
  if(!track.challenge)continue;
  assert(Math.abs(start.angle)<.001,`${track.id}: launch straight`);
  assert(maxCurvature<.025,`${track.id}: curvature fits physics model`);
  assert(maxGrade<.13,`${track.id}: drivable slopes`);
  // Non-adjacent strips need enough room for road, curbs and guardrails.
  let crossings=0;
  for(let i=0;i<n;i+=3)for(let j=i+3;j<n;j+=3){
    if(Math.min(j-i,n-j+i)*step<80)continue;
    const a=points[i],b=points[j];
    if(Math.hypot(a.x-b.x,a.z-b.z)<5){crossings++;assert(Math.abs(a.y-b.y)>25,`${track.id}: crossing decks have real vertical clearance`);}
    assert(Math.hypot(a.x-b.x,a.z-b.z)>34||Math.abs(a.y-b.y)>20,`${track.id}: road segments overlap`);
  }
  if(track.overpass)assert(crossings>0,`${track.id}: advertised overpass is present in the driving route`);
  // Test-only driver issues real steering/braking, without resetting or forcing progress.
  const race=new RaceSession({trackLength:data.length,sample,mode:'time'});let collisions=0,maxLane=0;
  for(let i=0;i<24000&&!race.finished;i++){
    const look=sample(race.progress+Math.max(6,race.speed/3.6*.22));
    const error=wrap(look.angle+Math.atan(race.lane*.1)-race.heading);
    let curvature=0;for(let j=0;j<=90;j+=10)curvature=Math.max(curvature,Math.abs(sample(race.progress+j).curvature));
    const target=Math.min(265,.66/Math.max(.001,curvature)*3.6);
    collisions+=race.update(1/60,{left:error>.004,right:error<-.004,brake:race.speed>target}).includes('collision');
    maxLane=Math.max(maxLane,Math.abs(race.lane));
  }
  assert(race.finished,`${track.id}: two-lap race finishes`);
  assert.equal(collisions,0,`${track.id}: real inputs can negotiate every bend without hitting barriers`);
  assert.equal(race.lapTimes.length,2);assert.equal(race.progress,data.length*2);
  for(const [from,to] of track.tunnels||[])for(let d=from*data.length;d<to*data.length;d+=8)for(const lane of [-8.8,8.8])for(const yaw of [-.6,.6]){
    const road=sample(d,lane),heading=road.angle+yaw,cam=road.position.clone();cam.x-=Math.sin(heading)*19.3;cam.z-=Math.cos(heading)*19.3;cam.y+=8.3;
    constrainTunnelCamera(cam,d,track,sample);
    let closest,best=Infinity;
    for(let offset=-45;offset<=30;offset++){const q=sample(d+offset),dist=(cam.x-q.position.x)**2+(cam.z-q.position.z)**2;if(dist<best){best=dist;closest=q;}}
    assert(Math.sqrt(best)<13.2,`${track.id}: camera clears tunnel side walls during drift`);
    assert(cam.y>closest.position.y+3&&cam.y<closest.position.y+13,`${track.id}: camera clears tunnel floor and roof`);
  }
  const practice=new RaceSession({trackLength:data.length,sample,mode:'practice'});practice.progress=data.length*.57;practice.lane=7;practice.heading=1;
  const before=practice.progress;practice.resetToRoad();assert.equal(practice.progress,before);assert.equal(practice.lane,0);assert.equal(practice.heading,sample(before).angle);
  summaries.push({track:track.name,km:+(data.length/1000).toFixed(2),minRadius:+(1/maxCurvature).toFixed(1),maxGrade:+maxGrade.toFixed(3),maxLane:+maxLane.toFixed(2),twoLapsSeconds:+race.elapsed.toFixed(2)});
}

// Build/dispose the real scenery graph in Node. Browser tests additionally verify WebGL appearance.
const context=new Proxy({},{get:(_,key)=>key==='canvas'?{}:()=>{}});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
for(const track of TRACKS){
  const data=createTrackCurve(track.id),group=buildCircuit({...data,sample:createTrackSampler(data),renderer:{capabilities:{getMaxAnisotropy:()=>8}}});
  assert(group.children.length>0);assert(group.userData.instanceCount>0);
  group.traverse(o=>{if(o.geometry?.attributes.position)assert([...o.geometry.attributes.position.array].every(Number.isFinite));if(o.instanceMatrix)assert([...o.instanceMatrix.array].every(Number.isFinite));});
  if(track.edition===2){
    // Check the complete rendered graph, including scenery, tunnel ceilings and bridge decks.
    // A driver must have an unobstructed car-height corridor on all three racing lanes.
    group.updateMatrixWorld(true);const sample=createTrackSampler(data),ray=new THREE.Raycaster();
    ray.near=.05;ray.far=5.8;
    for(let d=20;d<data.length;d+=21)for(const lane of [-8.8,0,8.8]){
      const p=sample(d,lane).position;p.y+=.35;ray.set(p,new THREE.Vector3(0,1,0));
      assert.equal(ray.intersectObject(group,true).length,0,`${track.id}: scenery obstructs the lane at ${d} m`);
    }
  }
  group.userData.dispose();
}
console.log(JSON.stringify({passed:true,tracks:TRACKS.length,challengeRoutes:summaries,sceneryBuildAndDispose:true}));
