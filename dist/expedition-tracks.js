/** Original expedition circuits. Metres; all are closed centripetal splines.
 * The skyport crosses itself in plan, with about 60 m between its two decks.
 * Keep its bridge piers clear of the lower road as well as the upper one.
 */
const roundPoints=points=>points.map(p=>p.map(n=>Math.round(n*10)/10));

// Five canyon lobes alternate exposed outer hairpins and narrow inner bends.
// The flattened eastern tip provides a short, straight +Z starting section.
function canyonRoute(){
  const points=[];
  for(let i=0;i<72;i++){
    const t=i/72*Math.PI*2,r=550+135*Math.cos(5*t);
    points.push([r*Math.cos(t)-685,30*(1-Math.cos(t))+8*Math.sin(t)**2,r*Math.sin(t)]);
  }
  for(let i=1;i<=3;i++)points[i][0]=points[points.length-i][0]=[-3,-30,-90][i-1];
  points.splice(1,0,[0,0,12],[0,0,32]);
  points.push([0,0,-32],[0,0,-12]);
  return roundPoints(points);
}

// Two elevated lobes cross at different heights. The sixth harmonic adds
// alternating S-bends to each lobe while preserving a single crossing.
function skyportRoute(){
  const points=[],angle=-Math.atan2(620,700+6*45),c=Math.cos(angle),s=Math.sin(angle);
  for(let i=0;i<96;i++){
    const t=i/96*Math.PI*2,x=620*Math.sin(t),z=350*Math.sin(2*t)+45*Math.sin(6*t);
    points.push([x*c+z*s,28+30*(1-Math.cos(t)),-x*s+z*c]);
  }
  points.splice(1,0,[0,28,12],[0,28,32]);
  points.push([0,28,-32],[0,28,-12]);
  return roundPoints(points);
}

export const EXPEDITION_TRACKS=[
  {
    id:'glacier',curveType:'centripetal',challenge:true,edition:2,theme:'glacier',
    weather:'雪谷晴光',name:'冰川回廊',label:'冰川雪谷 · 连环发卡',icon:'❄',
    subtitle:'GLACIER CORRIDOR',difficulty:5,accent:'#76e4ef',
    description:'沿冰川裂谷连续折返，三组发卡之间串起左右 S 弯。越过雪谷高点，再从宽阔冰壁回廊冲向终点。',
    features:'连续双发卡 / 冰壁 S 弯 / 32 米起伏',
    points:[[0,0,0],[0,0,65],[0,.2,130],[-90,1.3,300],[-80,3.3,500],[-112,4.4,578],[-190,5.6,610],[-268,7,578],[-300,8.4,500],[-310,13.1,250],[-420,17.2,80],[-452,18.8,2],[-530,20.5,-30],[-608,22.1,2],[-640,23.6,80],[-660,26.9,280],[-610,29.5,480],[-650,31.4,700],[-685,31.8,785],[-770,32,820],[-855,32,785],[-890,31.8,700],[-900,30.1,450],[-1030,27.5,270],[-1000,23.5,20],[-1000,18.4,-250],[-965,16.6,-335],[-880,14.7,-370],[-650,10.2,-400],[-420,6,-330],[-200,2.9,-380],[-95,1.8,-335],[0,.8,-250],[0,.1,-100]]
  },
  {
    id:'canyon',curveType:'centripetal',challenge:true,edition:2,theme:'canyon',
    weather:'赤岩夕照',name:'赤岩迷峡',label:'赤岩峡谷 · 五重折返',icon:'◭',
    subtitle:'SCARLET CANYON',difficulty:5,accent:'#ee9b66',
    description:'五重峡湾交替伸向崖外与岩隙，连续折返爬升六十米；两段岩洞衔接明暗变化中的组合弯。',
    features:'五重峡湾折返 / 双岩洞 / 60 米爬升',
    tunnels:[[.17,.23],[.62,.68]],points:canyonRoute()
  },
  {
    id:'skyport',curveType:'centripetal',challenge:true,edition:2,theme:'skyport',overpass:true,
    weather:'云海晨曦',name:'云港天环',label:'云港高架 · 双层天环',icon:'✧',
    subtitle:'SKYPORT SKYLOOP',difficulty:5,accent:'#a6c0ff',
    description:'双叶高架以八字交叠，交叉处上下桥面相隔六十米。两翼连续 S 弯连接长坡，腾出空间再释放氮气。',
    features:'双层八字立交 / 连续 S 弯 / 60 米桥面高差',
    points:skyportRoute()
  }
];
