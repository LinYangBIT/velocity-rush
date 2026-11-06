import * as THREE from './vendor/three.module.js';
import {EXPEDITION_TRACKS} from './expedition-tracks.js';
/** Original web-racing circuits. Coordinates are in metres; each route is a closed loop. */
export const TRACKS = [
  {
    id:'coast',name:'蔚蓝海岸',label:'海滨环线 · 晴昼',icon:'☀',subtitle:'AZURE COAST',difficulty:2,accent:'#11a9d5',
    description:'灯塔、游艇与棕榈海滨。宽阔长弯连接海岸直道，适合练习高速走线。',
    features:'滨海栈道 / 灯塔码头 / 沙滩度假村',
    points:[[0,0,0],[0,0,202.5],[121.5,1,391.5],[391.5,7,479.25],[594,12,337.5],[648,9,87.75],[486,5,-108],[513,2,-297],[310.5,0,-459],[81,0,-418.5],[-148.5,0,-270],[-108,0,-101.25]]
  },
  {
    id:'city',name:'霓虹都会',label:'城市街区 · 夜赛',icon:'◈',subtitle:'NEON DISTRICT',difficulty:3,accent:'#d975ff',
    description:'穿行亮灯楼群与空中连廊。城市直角弯、双 S 弯和冲刺大道考验刹车时机。',
    features:'霓虹商街 / 摩天楼群 / 空中连廊',
    points:[[0,0,0],[0,0,180],[65,0,255],[235,0,255],[315,2,185],[315,4,30],[435,4,-55],[435,2,-205],[325,0,-285],[130,0,-285],[-35,0,-195],[-40,0,-80]]
  },
  {
    id:'forest',tension:.7,name:'松林山谷',label:'山谷公路 · 晨光',icon:'♧',subtitle:'PINE VALLEY',difficulty:4,accent:'#70b25a',
    description:'沿松林和岩壁盘旋，掠过木屋营地与高架桥。起伏坡道与发卡弯带来连续漂移。',
    features:'松林营地 / 峡谷石桥 / 盘山连续弯',
    points:[[0,0,0],[0,4,165],[100,13,285],[260,22,310],[350,29,215],[290,32,90],[410,22,-15],[455,14,-170],[340,6,-295],[165,1,-335],[55,7,-230],[-90,12,-270],[-190,8,-155],[-100,2,-65]]
  }
  ,{
    id:'citadel',curveType:'centripetal',challenge:true,theme:'town',weather:'晴日街区',inspiration:'十一城',name:'十一街区',label:'经典街区 · 连环 U 弯',icon:'♜',subtitle:'CITADEL ELEVEN',difficulty:5,accent:'#bea4ff',
    description:'五组连续折返串起钟塔街区。长直道接 U 弯，提前刹车，把氮气留给出弯。',features:'五连 U 弯 / 钟塔街区 / 冲刺大道',
    points:[[0,0,0],[0,0,260],[0,0,520],[26,0,584],[90,0,610],[154,0,584],[180,0,520],[180,0,120],[206,0,56],[270,0,30],[334,0,56],[360,0,120],[360,0,520],[386,0,584],[450,0,610],[514,0,584],[540,0,520],[540,0,120],[566,0,56],[630,0,30],[694,0,56],[720,0,120],[720,0,520],[746,0,584],[810,0,610],[874,0,584],[900,0,520],[900,0,-160],[874,0,-224],[810,0,-250],[90,0,-250],[26,0,-224],[0,0,-160]]
  },{
    id:'alpine',curveType:'centripetal',challenge:true,theme:'forest',weather:'秋日山岭',inspiration:'秋名山',name:'秋山九曲',label:'秋色山道 · 发卡爬坡',icon:'♧',subtitle:'AUTUMN NINE',difficulty:5,accent:'#eda659',
    description:'爬升近百米，连续发卡与起伏 S 弯接连出现。越过山顶后，控制速度驶入长下坡。',features:'连续发卡 / 96 米高差 / 下坡 S 弯',
    points:[[0,0,0],[0,1.3,180],[50,5.2,360],[100,11.6,540],[129,14.8,611],[200,18.4,640],[271,22.2,611],[300,26.3,540],[310,36.7,360],[250,47.1,200],[260,57,40],[289,61.5,-31],[360,66,-60],[431,70.3,-31],[460,74.3,40],[470,83.7,240],[530,90.6,430],[550,95.1,650],[579,95.8,721],[650,96,750],[721,95.8,721],[750,95.1,650],[770,91.1,450],[720,84.5,260],[780,73.9,40],[820,62.6,-160],[820,51.2,-350],[791,46.4,-421],[720,41.7,-450],[100,9.6,-450],[29,7,-421],[0,4.7,-350]]
  },{
    id:'foundry',curveType:'centripetal',challenge:true,theme:'industrial',weather:'厂区薄云',inspiration:'老街管道',name:'老街工坊',label:'工业老街 · 隧道组合弯',icon:'⚙',subtitle:'OLDTOWN FOUNDRY',difficulty:4,accent:'#67d4df',tunnels:[[.12,.19],[.53,.64]],
    description:'穿过管道门架与两段灯带隧道，连续直角弯衔接厂区折返；后场长廊适合氮气冲刺。',features:'双隧道 / 工业组合弯 / 厂区长廊',
    points:[[0,0,0],[0,0.2,165],[0,1.2,412.5],[24.2,1.5,470.8],[82.5,1.9,495],[137.5,2.3,495],[195.8,2.8,470.8],[220,3.3,412.5],[220,3.7,357.5],[244.2,4.2,299.2],[302.5,4.8,275],[412.5,5.7,275],[470.8,6.2,299.2],[495,6.7,357.5],[495,8.6,632.5],[519.2,9,690.8],[577.5,9.3,715],[687.5,9.7,715],[745.8,9.8,690.8],[770,10,632.5],[770,7.4,-82.5],[745.8,6.9,-140.8],[687.5,6.4,-165],[577.5,5.5,-165],[519.2,5,-140.8],[495,4.4,-82.5],[495,4,-27.5],[470.8,3.5,30.8],[412.5,3,55],[302.5,2.2,55],[244.2,1.7,30.8],[220,1.4,-27.5],[220,1,-82.5],[195.8,0.7,-140.8],[137.5,0.5,-165],[82.5,0.3,-165],[24.2,0.2,-140.8],[0,0,-82.5]]
  }
  ,...EXPEDITION_TRACKS
];
export function normalizeTrackId(id){return id==='night'||id==='neon'?'city':id==='sunset'?'coast':TRACKS.some(t=>t.id===id)?id:'coast';}
export function getTrack(id){return TRACKS.find(t=>t.id===normalizeTrackId(id));}

export function createTrackCurve(id){const track=getTrack(id),curve=new THREE.CatmullRomCurve3(track.points.map(p=>new THREE.Vector3(...p)),true,track.curveType||'catmullrom',track.tension??.5);curve.arcLengthDivisions=Math.max(2000,track.points.length*100);return {track,curve,length:curve.getLength()};}
/** Shared by rendering and driving tests: progress wraps, heading stays independent of steering. */
export function createTrackSampler({curve,length}){
  const wrap=n=>((n%1)+1)%1;
  return (progress,lane=0)=>{
    const u=wrap(progress/length),position=curve.getPointAt(u),tangent=curve.getTangentAt(u).normalize(),side=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
    const before=curve.getTangentAt(wrap(u-1/length)),after=curve.getTangentAt(wrap(u+1/length));
    const delta=Math.atan2(Math.sin(Math.atan2(after.x,after.z)-Math.atan2(before.x,before.z)),Math.cos(Math.atan2(after.x,after.z)-Math.atan2(before.x,before.z)));
    position.addScaledVector(side,lane);
    return {position,tangent,angle:Math.atan2(tangent.x,tangent.z),curvature:-delta/2,slope:tangent.y/Math.hypot(tangent.x,tangent.z)};
  };
}
/** Keep the chase camera inside covered sections, including sideways drift and smoothing. */
export function constrainTunnelCamera(position,progress,track,sample){
  const d=((progress%track.length)+track.length)%track.length;
  if(!track.tunnels?.some(([from,to])=>d>=from*track.length-45&&d<=to*track.length+45))return position;
  let nearest,best=Infinity;
  for(let offset=-42;offset<=27;offset+=3){const road=sample(progress+offset),dist=(position.x-road.position.x)**2+(position.z-road.position.z)**2;if(dist<best){best=dist;nearest=road;}}
  const side=new THREE.Vector3(-nearest.tangent.z,0,nearest.tangent.x).normalize(),lane=(position.x-nearest.position.x)*side.x+(position.z-nearest.position.z)*side.z;
  position.addScaledVector(side,THREE.MathUtils.clamp(lane,-12.5,12.5)-lane);
  position.y=THREE.MathUtils.clamp(position.y,nearest.position.y+4,nearest.position.y+12);
  return position;
}
for(const track of TRACKS){const data=createTrackCurve(track.id),ys=data.curve.getSpacedPoints(600).map(p=>p.y);track.length=data.length;track.elevation=Math.max(...ys)-Math.min(...ys);}
