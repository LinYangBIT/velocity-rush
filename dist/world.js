import * as THREE from './vendor/three.module.js';
import {createClassicCar} from './car-model.js';
import {createTrackCurve,normalizeTrackId,createTrackSampler,getTrack,constrainTunnelCamera} from './tracks.js';
import {buildCircuit} from './scenery.js';
import {EXPEDITION_ENVIRONMENTS} from './track-environments.js';

// +Z is vehicle forward. The chase camera sees physical right at -X when facing +Z.
// Positive lane points to physical right; positive world yaw is a left turn.
const clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
const UP=new THREE.Vector3(0,1,0);
function material(color,opts={}){return new THREE.MeshStandardMaterial({color,roughness:.65,envMapIntensity:.25,...opts});}
function box(w,h,d,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function texCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function labelTexture(text,sub,color='#bdfb4e',bg='#101c27') {return texCanvas(1024,256,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=color;c.font='italic 900 105px Arial';c.textAlign='center';c.fillText(text,w/2,133);c.fillStyle='#d9f5fc';c.font='500 26px Arial';c.letterSpacing='6px';c.fillText(sub,w/2,198);c.fillStyle=color;c.fillRect(0,h-11,w,11);});}
export function createWorld(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(canvas.clientWidth||innerWidth,canvas.clientHeight||innerHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#c9e8ee');scene.fog=new THREE.Fog('#8bd3ff',220,1400);const raceGroup=new THREE.Group();scene.add(raceGroup);const showroom=new THREE.Group();scene.add(showroom);
 const envScene=new THREE.Scene();envScene.background=new THREE.Color('#617a89');for(const [x,y,z,sx,sy,sz] of [[-6,4,0,.1,7,10],[6,4,0,.1,6,8],[0,8,0,8,.1,8],[0,3,8,8,5,.1]]){const panel=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),new THREE.MeshBasicMaterial({color:'#ffffff'}));panel.position.set(x,y,z);envScene.add(panel);}const pmrem=new THREE.PMREMGenerator(renderer);const envTarget=pmrem.fromScene(envScene,.025);scene.environment=envTarget.texture;pmrem.dispose();
 const camera=new THREE.PerspectiveCamera(43,(canvas.clientWidth||innerWidth)/(canvas.clientHeight||innerHeight),.1,2200);
 const hemisphere=new THREE.HemisphereLight('#e1f5ff','#738f92',1.55);scene.add(hemisphere);const sun=new THREE.DirectionalLight('#fff6e7',2.6);sun.position.set(-150,270,100);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-38;sun.shadow.camera.right=38;sun.shadow.camera.top=38;sun.shadow.camera.bottom=-38;sun.shadow.camera.near=1;sun.shadow.camera.far=500;sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;scene.add(sun);scene.add(sun.target);
 const fill=new THREE.DirectionalLight('#9addff',1);fill.position.set(40,40,-70);scene.add(fill);
 const dummy=new THREE.Object3D();
 let curve,trackLength=0,currentTrackId='',circuit;
 let trackSampler;
 function sample(progress,lane=0){return trackSampler(progress,lane);}
 function setTrack(id){
  const normalized=normalizeTrackId(id);if(normalized===currentTrackId)return;
  const data=createTrackCurve(normalized);curve=data.curve;trackLength=data.length;trackSampler=createTrackSampler(data);currentTrackId=normalized;
  if(circuit){raceGroup.remove(circuit);circuit.userData.dispose();}
  circuit=buildCircuit({track:data.track,curve,sample,length:trackLength,renderer});raceGroup.add(circuit);
  readyCam=false;lastTrack='';
 }
 function sky(top,bottom){return texCanvas(32,512,(c,w,h)=>{const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,top);gr.addColorStop(1,bottom);c.fillStyle=gr;c.fillRect(0,0,w,h);});}
 const daySky=sky('#1686e7','#b8e8ff'),nightSky=sky('#101b3b','#53638d'),forestSky=sky('#589cbd','#d4e6cb'),industrialSky=sky('#527e97','#ccdedc'),autumnSky=sky('#7da6b3','#f2dcaf');
 const expeditionSkies=Object.fromEntries(Object.entries(EXPEDITION_ENVIRONMENTS).map(([id,e])=>[id,sky(...e.sky)]));
 const lobbyBackdrop=texCanvas(1024,1024,(c,w,h)=>{const gr=c.createRadialGradient(w*.38,h*.6,20,w*.45,h*.55,w*.75);gr.addColorStop(0,'#63d8cc');gr.addColorStop(.55,'#198b9e');gr.addColorStop(1,'#06374d');c.fillStyle=gr;c.fillRect(0,0,w,h);for(let x=0;x<w;x+=24){c.strokeStyle=x%120===0?'rgba(191,255,255,.16)':'rgba(157,238,247,.065)';c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=0;y<h;y+=24){c.strokeStyle=y%120===0?'rgba(191,255,255,.14)':'rgba(157,238,247,.055)';c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}});
 const gridTexture=texCanvas(256,256,(c,w,h)=>{c.fillStyle='#217d87';c.fillRect(0,0,w,h);c.strokeStyle='#55b7bd';c.lineWidth=1;for(let i=0;i<=256;i+=32){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.moveTo(0,i);c.lineTo(w,i);c.stroke();}c.strokeStyle='#8bd5ce';c.strokeRect(0,0,w,h);});gridTexture.wrapS=gridTexture.wrapT=THREE.RepeatWrapping;gridTexture.repeat.set(180,180);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(1920,1920),material('#75bbc0',{map:gridTexture,roughness:.65,metalness:.15,emissive:'#104c5a',emissiveIntensity:.35}));floor.rotation.x=-Math.PI/2;floor.position.y=-.22;floor.receiveShadow=true;showroom.add(floor);
 const stage=new THREE.Mesh(new THREE.CylinderGeometry(5.9,6.1,.2,96),material('#398c92',{metalness:.3,roughness:.48}));stage.position.y=-.13;stage.receiveShadow=true;showroom.add(stage);
 for(const radius of [4.9,5.85,6.12]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,radius===5.85?.055:.022,8,128),new THREE.MeshBasicMaterial({color:'#80ffed',transparent:true,opacity:radius===5.85?.9:.5}));ring.rotation.x=-Math.PI/2;ring.position.y=.005;showroom.add(ring);}
 const ringMarks=new THREE.InstancedMesh(new THREE.BoxGeometry(.055,.015,.3),new THREE.MeshBasicMaterial({color:'#a8fff1'}),40);for(let i=0;i<40;i++){const a=i/40*Math.PI*2;dummy.position.set(Math.sin(a)*5.6,.015,Math.cos(a)*5.6);dummy.rotation.set(0,a,0);dummy.scale.set(1,1,1);dummy.updateMatrix();ringMarks.setMatrixAt(i,dummy.matrix);}showroom.add(ringMarks);
 const car=createClassicCar();car.name='player-car';scene.add(car);const rivals=[];for(let i=0;i<5;i++){const c=createClassicCar(['#50c4df','#efc74a','#7586ee','#e89bbd','#f0eee5'][i],false);c.name=`rival-${i}`;scene.add(c);rivals.push(c);}
 const smokeGeo=new THREE.SphereGeometry(.55,8,6),smokeMat=new THREE.MeshBasicMaterial({color:'#d6ebea',transparent:true,opacity:.3,depthWrite:false});const smoke=new THREE.InstancedMesh(smokeGeo,smokeMat,22);smoke.count=0;scene.add(smoke);
 let previousMode='',lastQuality='',lastTrack='',colorSet='';let currentCam=new THREE.Vector3(),currentLook=new THREE.Vector3(),readyCam=false;
 function resize(){let w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
 function update({mode='lobby',time=0,dt=.016,progress=0,lane=0,heading,travelHeading,steer=0,drift=false,boost=false,speed=0,opponents=[],carColor='#aaa99a',trackId='coast',quality='high'}={}){
  if(quality!==lastQuality){lastQuality=quality;renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='low'?1:quality==='medium'?1.35:1.7));renderer.shadowMap.enabled=quality!=='low';resize();}
  setTrack(trackId);
  const paletteKey=mode==='race'?currentTrackId:'lobby';
  if(paletteKey!==lastTrack){lastTrack=paletteKey;const lobby=paletteKey==='lobby',night=currentTrackId==='city',forest=getTrack(currentTrackId).theme==='forest'||currentTrackId==='forest',industrial=currentTrackId==='foundry';scene.background=lobby?lobbyBackdrop:(night?nightSky:industrial?industrialSky:currentTrackId==='alpine'?autumnSky:forest?forestSky:daySky);scene.fog.color.set(lobby?'#258a93':night?'#273954':forest?'#a2bda1':'#91d1f6');scene.fog.near=lobby?35:night?180:220;scene.fog.far=lobby?140:night?1050:1400;sun.intensity=lobby?2.2:night?1.3:2.6;sun.color.set(lobby?'#eefaff':night?'#a1bcff':forest?'#fff1ce':'#fff6e7');hemisphere.color.set(lobby?'#d6ffff':night?'#88acef':forest?'#dbefd0':'#e1f5ff');hemisphere.intensity=lobby?1.8:night?1.45:1.55;renderer.toneMappingExposure=lobby?1:night?1.3:1.05;const env=EXPEDITION_ENVIRONMENTS[currentTrackId];if(!lobby&&env){scene.background=expeditionSkies[currentTrackId];scene.fog.color.set(env.fog);scene.fog.near=260;scene.fog.far=1800;sun.color.set(env.sun);hemisphere.color.set(env.hemisphere);sun.intensity=currentTrackId==='skyport'?1.7:2.4;renderer.toneMappingExposure=env.exposure;}raceGroup.visible=!lobby;showroom.visible=lobby;}

  if(colorSet!==carColor){colorSet=carColor;car.userData.bodyMaterial.color.set(carColor);}
  const racing=mode==='race',p=racing?sample(progress,lane):{position:new THREE.Vector3(0,0,0),tangent:new THREE.Vector3(0,0,1),angle:0};
  const bodyHeading=racing&&Number.isFinite(heading)?heading:p.angle,velocityHeading=racing&&Number.isFinite(travelHeading)?travelHeading:bodyHeading;
  const pitch=racing?Math.atan((p.slope||0)*Math.cos(bodyHeading-p.angle)):0;
  const forward=new THREE.Vector3(Math.sin(velocityHeading),racing?(p.slope||0)*Math.cos(velocityHeading-p.angle):0,Math.cos(velocityHeading)),side=new THREE.Vector3(-forward.z,0,forward.x);
  if(car.userData.driver)car.userData.driver.visible=racing;car.position.copy(p.position);car.position.y+=.04+Math.sin(time*10)*Math.min(.025,speed*.00015);car.rotation.set(-pitch,bodyHeading,racing?-steer*.025:0,'YXZ');
  car.userData.wheels.forEach(w=>{w.rotation.x=time*speed*.14;w.rotation.y=w.userData.front?-steer*.18:0;});car.userData.flames.forEach(f=>{f.visible=!!boost&&racing;f.scale.y=.8+Math.sin(time*53)*.22;});
  rivals.forEach((r,i)=>{let data=opponents[i];r.visible=racing&&!!data&&data.progress>=progress-1;if(r.userData.driver)r.userData.driver.visible=racing&&!!data&&data.progress>=progress-1;if(data){let rp=sample(data.progress,data.lane);r.position.copy(rp.position);r.position.y+=.04;r.rotation.set(-Math.atan(rp.slope||0),rp.angle,0,'YXZ');if(data.color)r.userData.bodyMaterial.color.set(data.color);r.userData.wheels.forEach(w=>w.rotation.x=time*13);}});
  smoke.count=(racing&&drift&&speed>25)?22:0;for(let i=0;i<smoke.count;i++){let age=((time*1.3+i/22)%1),sp=p.position.clone().addScaledVector(forward,-2.8-age*14).addScaledVector(side,((i%2)?-1:1)*1.8+steer*age*2);dummy.position.copy(sp);dummy.position.y+=.3+age*1.2;dummy.rotation.set(0,0,0);dummy.scale.setScalar(.3+age*1.8);dummy.updateMatrix();smoke.setMatrixAt(i,dummy.matrix);}if(smoke.count)smoke.instanceMatrix.needsUpdate=true;
  let targetCam,targetLook;
  if(racing){targetCam=p.position.clone().addScaledVector(forward,-17.5-(boost?1.8:0)).add(new THREE.Vector3(0,8.3,0));targetLook=p.position.clone().addScaledVector(forward,8.5).add(new THREE.Vector3(0,1.2,0));camera.fov=lerp(camera.fov,boost?61:50,Math.min(1,dt*5));}
  else{const swing=Math.sin(time*.1)*.35;targetCam=new THREE.Vector3(-13.5+swing,8.3,-19);targetLook=new THREE.Vector3(-2.4,4.0,1.75);camera.fov=lerp(camera.fov,35,Math.min(1,dt*5));}

  if(previousMode!==mode||!readyCam){currentCam.copy(targetCam);currentLook.copy(targetLook);readyCam=true;previousMode=mode;}
  else {currentCam.lerp(targetCam,Math.min(1,dt*(racing?8:2)));currentLook.lerp(targetLook,Math.min(1,dt*(racing?10:2)));}
  if(racing)constrainTunnelCamera(currentCam,progress,getTrack(currentTrackId),sample);
  camera.position.copy(currentCam);camera.lookAt(currentLook);camera.updateProjectionMatrix();sun.position.copy(p.position).add(new THREE.Vector3(-100,180,80));sun.target.position.copy(p.position);sun.target.updateMatrixWorld();renderer.render(scene,camera);
 }
 update({});
 return {renderer,scene,camera,get trackLength(){return trackLength},get currentTrackId(){return currentTrackId},sample,setTrack,update,resize,dispose(){resizeObserver.disconnect();if(circuit){raceGroup.remove(circuit);circuit.userData.dispose();}scene.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});[lobbyBackdrop,daySky,nightSky,forestSky,industrialSky,autumnSky,...Object.values(expeditionSkies)].forEach(t=>t.dispose());envTarget.dispose();envScene.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});renderer.dispose();}};
}
