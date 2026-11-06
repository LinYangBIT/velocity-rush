import * as THREE from './vendor/three.module.js';
import {buildChallengeScenery} from './challenge-scenery.js';
import {buildExpeditionScenery} from './expedition-scenery.js';
import {EXPEDITION_ENVIRONMENTS} from './track-environments.js';

const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.76,...extra});
const basic=color=>new THREE.MeshBasicMaterial({color});
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function signTexture(title,subtitle,color,background){return texture(1024,256,(ctx,w,h)=>{ctx.fillStyle=background;ctx.fillRect(0,0,w,h);ctx.fillStyle=color;ctx.textAlign='center';ctx.font='italic 900 100px Arial';ctx.fillText(title,w/2,132);ctx.fillStyle='#effcff';ctx.font='bold 25px Arial';ctx.fillText(subtitle,w/2,199);ctx.fillStyle=color;ctx.fillRect(0,h-10,w,10);});}

/** Track-side objects use a small set of instanced batches, even for the window grids. */
export function buildCircuit({track,curve,sample,length,renderer}){
  const env=EXPEDITION_ENVIRONMENTS[track.id];
  const group=new THREE.Group();group.name=`circuit-${track.id}`;const challenge=!!track.challenge,city=track.theme==='city'||track.id==='city',forest=track.theme==='forest'||track.id==='forest';
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),cone:new THREE.ConeGeometry(1,1,12),sphere:new THREE.SphereGeometry(1,12,8),rock:new THREE.IcosahedronGeometry(1,1),pyramid:new THREE.ConeGeometry(1,1,4)};
  const materials={solid:mat('#ffffff'),metal:mat('#ffffff',{metalness:.35,roughness:.48}),light:basic('#ffffff'),leaf:mat('#ffffff',{side:THREE.DoubleSide}),glass:mat('#ffffff',{metalness:.6,roughness:.2})};
  const batches=new Map(),dummy=new THREE.Object3D();let seed=track.id==='coast'?2035:track.id==='city'?777:301;
  const rand=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  function add(geo,material,p,s=[1,1,1],color='#ffffff',r=[0,0,0]){const key=`${geo}:${material}`;if(!batches.has(key))batches.set(key,[]);batches.get(key).push({p,s,color,r});}
  function at(distance,lane=0){const p=sample(distance,lane);return {x:p.position.x,y:p.position.y,z:p.position.z,a:p.angle};}
  function piece(g,m,p,offset,size,color,rotation=0){const sin=Math.sin(p.a),cos=Math.cos(p.a),[x,y,z]=offset;add(g,m,[p.x+cos*x+sin*z,p.y+y,p.z-sin*x+cos*z],size,color,[0,p.a+rotation,0]);}
  function ribbon(a,b,height,material,segments=900){const positions=[],uv=[],indices=[];for(let i=0;i<=segments;i++){const u=i/segments,p=curve.getPointAt(u),t=curve.getTangentAt(u),r=new THREE.Vector3(t.z,0,-t.x).normalize();for(const lane of [a,b]){positions.push(p.x+r.x*lane,p.y+height,p.z+r.z*lane);uv.push(lane===a?0:1,u*length/16);}if(i<segments){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.receiveShadow=true;group.add(m);return m;}
  const groundMaterial=env?mat(env.ground):challenge?mat(track.id==='alpine'?'#6c7859':track.id==='citadel'?'#b3b99d':'#516d76'):forest?mat('#5b854b'):city?mat('#172436'):new THREE.MeshPhysicalMaterial({color:'#168fe3',roughness:.48,metalness:.08,clearcoat:.5});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=env?env.groundY:challenge?(forest?-5:-.6):forest?-5:city?-1:-7;ground.receiveShadow=true;group.add(ground);
  const asphalt=texture(256,256,(ctx,w,h)=>{ctx.fillStyle=env?.asphalt||(city?'#4c566c':'#84949c');ctx.fillRect(0,0,w,h);for(let i=0;i<12000;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.07)':'rgba(16,26,32,.09)';ctx.fillRect(rand()*w,rand()*h,1.4,1.4);}});asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;asphalt.repeat.set(3,1);asphalt.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const shoulderWidth=env?.shoulderWidth||(challenge?(forest?50:18):forest?70:38);
  const shoulder=ribbon(-shoulderWidth,shoulderWidth,-.27,mat(env?.shoulder||(challenge?(forest?'#87956a':track.id==='citadel'?'#c7baa0':'#7b9298'):forest?'#739757':city?'#405166':'#e9cb89')));shoulder.name='road-shoulder';
  if(env||challenge&&(forest||track.id==='foundry')){
    const edge=shoulderWidth,floor=env?.groundY??(forest?-5:-.6),terrain=mat(env?.wall||(forest?'#7e8065':'#71878e'),{side:THREE.DoubleSide});
    for(const side of [-1,1]){const positions=[],indices=[],steps=Math.ceil(length/6);
      for(let i=0;i<=steps;i++){const p=sample(i/steps*length,side*edge).position;positions.push(p.x,p.y-.27,p.z,p.x,env?.bridge?p.y-2.4:floor,p.z);if(i<steps){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const wall=new THREE.Mesh(geometry,terrain);wall.name='road-retaining-wall';wall.receiveShadow=true;wall.castShadow=!!env?.bridge;group.add(wall);
    }
    if(env?.bridge){const underside=ribbon(-edge,edge,-2.4,terrain);underside.name='bridge-underside';underside.castShadow=true;}
  }
  if(city){ribbon(-20,-13,.1,mat('#617587'));ribbon(13,20,.1,mat('#617587'));}
  const road=ribbon(-11,11,0,mat(env?.road||(city?'#8291ae':'#afb4b5'),{map:asphalt,roughness:.96}),Math.max(900,Math.ceil(length/4)));road.name='driving-surface';
  const line=mat('#eff7f1');ribbon(-10.6,-10.43,.025,line);ribbon(10.43,10.6,.025,line);
  for(let d=0;d<length;d+=4){for(const side of [-1,1]){const p=at(d,side*11.6);piece('box','solid',p,[0,.09,0],[1.2,.18,4.08],Math.floor(d/4)%2?'#fff8e8':env?.curb||(city?'#5fa7cb':'#e14f42'));}}
  for(let d=0;d<length;d+=10){for(const side of [-1,1]){const p=at(d,side*14);piece('box','metal',p,[0,.65,0],[.24,1.3,.24],forest?'#7d6b4a':'#a0b8c2');piece('box','metal',p,[0,1,0],[.2,.24,10.15],forest?'#b0a587':'#d4e5e9');if(city||env)piece('box','light',p,[0,.65,0],[.22,.06,9.5],env?.rail||(side>0?'#44dcff':'#d988ff'));}if(Math.floor(d/10)%2===0){const p=at(d);piece('box','solid',p,[0,.028,0],[.16,.02,5],'#edf5e6');}}
  // Street furniture makes speed and distance readable even close to the car.
  for(let d=50;d<length;d+=city?48:84){for(const side of [-1,1]){const p=at(d,side*16.4);piece('cylinder','metal',p,[0,3.9,0],[.12,7.8,.12],city?'#566d8b':'#557273');piece('box','metal',p,[-side*.9,7.7,0],[2.2,.12,.16],'#9eb8bc');piece('box','light',p,[-side*1.7,7.64,0],[.95,.13,.48],city?'#c4f2ff':'#fff3ba');}}
  // Starting portal: road surface is kept clear below 8 metres.
  const start=at(0);for(const x of [-13.5,13.5]){piece('box','metal',start,[x,5.5,30],[1,11,1.3],city?'#294667':'#254453');piece('box','light',start,[x,9.5,30],[1.12,.32,1.4],track.accent);}
  piece('box','metal',start,[0,10,30],[28,3,1.2],city?'#25335d':'#1764aa');
  const portal=new THREE.Group();portal.position.set(start.x,start.y,start.z);portal.rotation.y=start.a;group.add(portal);
  const banner=new THREE.Mesh(new THREE.PlaneGeometry(24,2.8),new THREE.MeshBasicMaterial({map:signTexture('SPEED RACE',track.subtitle+' / START YOUR ENGINE','#ffe37a',city?'#302852':'#1764aa')}));banner.position.set(0,10,29.37);banner.rotation.y=Math.PI;portal.add(banner);const back=banner.clone();back.position.z=30.63;back.rotation.y=0;portal.add(back);
  for(let i=0;i<16;i++)for(let j=0;j<4;j++)piece('box','solid',start,[(i-7.5)*1.3,.035,26+j*.65],[1.3,.025,.65],(i+j)%2?'#f2f6ed':'#233445');
  const arrowTexture=signTexture('>>>','BRAKE / TURN / BOOST','#eaffed',city?'#653f96':'#218591');
  for(let d=140;d<(challenge?0:length);d+=230){const p=at(d,17.5);const sign=new THREE.Mesh(new THREE.PlaneGeometry(7,2.7),new THREE.MeshBasicMaterial({map:arrowTexture,side:THREE.DoubleSide}));sign.position.set(p.x,p.y+3,p.z);sign.rotation.y=p.a-Math.PI/2;group.add(sign);piece('box','metal',p,[0,1.5,0],[.15,3,.15],'#607d86');}

  function bench(p,color='#bb8953'){piece('box','solid',p,[0,.65,0],[3,.18,1],color);piece('box','solid',p,[0,1.3,.45],[3,.8,.14],color);for(const x of [-1.1,1.1])piece('box','metal',p,[x,.35,0],[.15,.7,.8],'#425a60');}
  function palm(p,height=11){piece('cylinder','solid',p,[0,height/2,0],[.37,height,.37],'#bb9764');for(let j=0;j<7;j++){const a=j/7*Math.PI*2;add('leaf','leaf',[p.x,p.y+height,p.z],[1,1,1],'#3e8e46',[0,a,0]);}}
  const leafPos=[],leafIdx=[],width=[.08,.7,.8,.52,0],height=[0,.5,.45,-.2,-1.25];for(let i=0;i<5;i++){leafPos.push(-width[i],height[i],i*1.5,width[i],height[i],i*1.5);if(i<4){const n=i*2;leafIdx.push(n,n+2,n+1,n+1,n+2,n+3);}}const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute(leafPos,3));leafGeo.setIndex(leafIdx);leafGeo.computeVertexNormals();geometries.leaf=leafGeo;
  function pine(p,h=14){piece('cylinder','solid',p,[0,h*.3,0],[.42,h*.6,.42],'#71563e');for(let j=0;j<3;j++)piece('cone','solid',p,[0,h*(.4+j*.2),0],[h*(.23-j*.045),h*.52,h*(.23-j*.045)],j%2?'#36754a':'#2e6744');}
  function cabin(p,color='#c18c62'){piece('box','solid',p,[0,2.4,0],[10,4.8,8],color);piece('pyramid','solid',p,[0,6.3,0],[8,4,6.4],'#533e35',Math.PI/4);piece('box','solid',p,[0,1.6,-4.08],[1.5,3.1,.12],'#5c493f');for(const x of [-3,3])piece('box','light',p,[x,2.5,-4.1],[1.6,1.5,.13],'#ffd79b');piece('box','solid',p,[0,.2,-5.5],[11,.4,3.5],'#bca07e');}
  function billboard(p,title,subtitle,color='#84efff'){for(const x of [-3.5,3.5])piece('box','metal',p,[x,3,0],[.23,6,.23],'#506576');const m=new THREE.Mesh(new THREE.PlaneGeometry(10,3.5),new THREE.MeshBasicMaterial({map:signTexture(title,subtitle,color,city?'#2b214a':'#225775'),side:THREE.DoubleSide}));m.position.set(p.x,p.y+6,p.z);m.rotation.y=p.a;group.add(m);}

  if(env){
    buildExpeditionScenery({track:{...track,...env},sample,length,at,piece,add,billboard});
  }else if(challenge){
    buildChallengeScenery({track,sample,length,at,piece,add,billboard});
  }else if(!city&&!forest){
    // Palm promenades, striped parasols, beach seating, kiosks and waterside villas.
    for(let d=40;d<length;d+=42){for(const side of [-1,1]){const p=at(d,side*(22+rand()*4));palm(p,9+rand()*5);if(Math.floor(d/42)%3===0)bench(at(d+12,side*18));}}
    for(let d=90;d<length;d+=105){const side=Math.floor(d/105)%2?1:-1,p=at(d,side*29),color=['#f0645a','#ffe59a','#5bb9d7'][Math.floor(d/105)%3];piece('cylinder','metal',p,[0,1.8,0],[.07,3.6,.07],'#f3ead0');piece('cone','solid',p,[0,3.6,0],[3.7,.95,3.7],color);for(const x of [-2,2]){piece('box','solid',p,[x,.5,0],[1,.16,3],'#f5f2dd');piece('box','solid',p,[x,.9,1],[1,1,.16],color);}}
    for(let d=190;d<length;d+=290){const p=at(d,35),color=['#f6dcaf','#ffd4bf','#b9e0db'][Math.floor(d/290)%3];piece('box','solid',p,[0,3.6,0],[13,7.2,14],color);piece('box','solid',p,[0,7.5,0],[14,.6,15],'#f2efdf');for(const y of [2.2,5.3])for(const z of [-4,0,4]){piece('box','glass',p,[-6.55,y,z],[.12,1.7,2.3],'#4f9dbe');piece('box','glass',p,[6.55,y,z],[.12,1.7,2.3],'#4f9dbe');}piece('box','solid',p,[0,.2,0],[17,.3,18],'#e3c49a');}
    const lighthouse=at(135,-38);piece('cylinder','solid',lighthouse,[0,10.5,0],[3.6,21,3.6],'#f6f0df');for(const y of [5,12,18])piece('cylinder','solid',lighthouse,[0,y,0],[3.65,2.5,3.65],'#d55749');piece('cylinder','metal',lighthouse,[0,22,0],[4.5,1,4.5],'#435f71');piece('cylinder','glass',lighthouse,[0,24,0],[2.8,3,2.8],'#8ddaff');piece('cone','solid',lighthouse,[0,26.5,0],[4.2,2.5,4.2],'#d04e46');
    // Marina pontoons and three detailed sailboats just off the shoreline.
    for(let i=0;i<5;i++){const p=at(300+i*37,-48);p.y=-5.8;piece('box','solid',p,[0,0,0],[32,.6,5],'#ae8b60');for(const x of [-12,12])piece('cylinder','solid',p,[x,-1.2,0],[.3,3,.3],'#66563e');const boat=at(300+i*37,-68);boat.y=-6;piece('sphere','solid',boat,[0,.4,0],[3,1.1,8],'#f5f4df');piece('box','solid',boat,[0,1.1,0],[4.3,.3,10.5],'#ba9b73');piece('box','solid',boat,[0,1.7,1],[3.1,1.2,4.4],'#e8eade');piece('cylinder','metal',boat,[0,8,0],[.1,15,.1],'#e2e5db');piece('pyramid','solid',boat,[0,8,1],[.2,12,5],i%2?'#ec7764':'#e8f2e6',Math.PI/4);}
    billboard(at(70,29),'COAST CLUB','SUNSHINE / SEA BREEZE','#ffe59c');
    for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=900+rand()*260;add('sphere','solid',[220+Math.cos(a)*r,-35,Math.sin(a)*r],[120+rand()*90,70+rand()*90,130+rand()*120],i%2?'#91b7aa':'#a4c5b4');}
  }else if(city){
    // Alternating towers with luminous windows, shopfronts and neon roof cornices.
    for(let d=65;d<length;d+=52){for(const side of [-1,1]){const p=at(d,side*(31+rand()*6)),h=17+rand()*39,w=15+rand()*7,depth=24+rand()*7,color=['#30476a','#45506d','#374360','#52617e'][Math.floor(rand()*4)];piece('box','solid',p,[0,h/2,0],[w,h,depth],color);piece('box','metal',p,[0,h+.4,0],[w+1,.8,depth+1],'#7086a2');piece('box','light',p,[0,h+1,0],[w+.5,.25,depth+.5],side>0?'#64deec':'#bd77ef');for(let y=4;y<h-2;y+=4.8)for(let z=-depth/2+3;z<depth/2-1;z+=4){piece('box','light',p,[-w/2-.055,y,z],[.12,1.7,1.7],rand()>.27?'#92c9e2':'#365b83');piece('box','light',p,[w/2+.055,y,z],[.12,1.7,1.7],rand()>.27?'#e9c899':'#365b83');}piece('box','glass',p,[-w/2-.08,1.6,0],[.16,2.8,depth*.7],'#8daac6');piece('box','glass',p,[w/2+.08,1.6,0],[.16,2.8,depth*.7],'#8daac6');piece('box','light',p,[-w/2-.3,3.5,0],[.7,.45,depth*.8],side>0?'#71f3e1':'#ea9ee6');piece('box','light',p,[w/2+.3,3.5,0],[.7,.45,depth*.8],side>0?'#71f3e1':'#ea9ee6');}}
    // Distant skyline remains visible down the straightaways.
    for(let i=0;i<48;i++){const a=i/48*Math.PI*2,r=650+rand()*180,h=40+rand()*130;add('box','solid',[180+Math.cos(a)*r,h/2-1,Math.sin(a)*r],[25+rand()*35,h,28+rand()*40],['#293b62','#354a74','#45577d'][i%3]);add('box','light',[180+Math.cos(a)*r,h+.2,Math.sin(a)*r],[24,.8,25],i%2?'#8e74bd':'#76a4cc');}
    for(const d of [230,length*.5,length*.78]){const p=at(d);piece('box','metal',p,[0,12,0],[42,1.3,8],'#687b92');piece('box','glass',p,[0,14,0],[41,3,7.6],'#6e91ab');piece('box','metal',p,[0,15.8,0],[43,.8,8.5],'#344b69');for(const x of [-19,19])piece('box','solid',p,[x,6,0],[2.2,12,6],'#586b85');for(const z of [-4,4])piece('box','light',p,[0,12.8,z],[40,.2,.15],'#a5e4f3');}
    for(let d=95;d<length;d+=310)billboard(at(d,23),Math.floor(d/310)%2?'NIGHT RUN':'NEON CITY','FIND YOUR LINE / FEEL THE SPEED',Math.floor(d/310)%2?'#f5b0ef':'#8df2ed');
    for(let d=95;d<length;d+=88){for(const side of [-1,1]){const p=at(d,side*20);piece('box','solid',p,[0,.6,0],[3.5,1.2,3.5],'#78909b');piece('cylinder','solid',p,[0,2.7,0],[.2,3.2,.2],'#765d4a');piece('sphere','solid',p,[0,5,0],[2.5,2.8,2.5],'#437166');}}
    // Small stars are a single instanced batch, without lights per building.
    for(let i=0;i<90;i++){const a=rand()*Math.PI*2,r=700+rand()*650;add('sphere','light',[Math.cos(a)*r,170+rand()*240,Math.sin(a)*r],[.7,.7,.7],'#adc4e4');}
  }else{
    // Dense pine rows, layered slopes and low roadside boulders.
    for(let d=25;d<length;d+=19){for(const side of [-1,1]){pine(at(d,side*(22+rand()*14)),11+rand()*11);if(Math.floor(d/19)%2===0)pine(at(d+8,side*(43+rand()*18)),15+rand()*13);}}
    for(let d=65;d<length;d+=49){for(const side of [-1,1]){const p=at(d,side*(18+rand()*3));piece('rock','solid',p,[0,1.4,0],[2+rand()*2,2+rand()*1.5,3+rand()*3],rand()>.5?'#a8ad9b':'#929c93',rand()*3);}}
    for(let d=150;d<length;d+=430){const p=at(d,36);cabin(p);bench(at(d-14,21));piece('box','solid',p,[13,.2,0],[10,.4,12],'#b9a382');piece('cone','solid',p,[13,2.2,0],[4.4,4.5,4.4],'#cf9c52');}
    // Timber viewing gates arch safely over the route; concrete valley bridge rails.
    for(const d of [length*.28,length*.71]){const p=at(d);for(const x of [-15,15]){piece('box','solid',p,[x,5.8,0],[1.7,11.6,2],'#8f7452');piece('box','solid',p,[x,9,0],[3,.7,3],'#b69a70');}piece('box','solid',p,[0,11.6,0],[33,1.5,2.4],'#927650');piece('box','solid',p,[0,12.5,0],[36,.6,3.3],'#c8b080');}
    for(let d=length*.38;d<length*.46;d+=7){for(const side of [-1,1]){const p=at(d,side*13.3);piece('box','solid',p,[0,1,0],[1.1,2.4,6.8],'#b6b6a2');piece('box','solid',p,[0,2.25,0],[1.4,.25,7.1],'#d0cbb5');piece('box','solid',p,[0,-5,0],[2.3,10,2.3],'#9a9b8e');}}
    billboard(at(72,25),'PINE VALLEY','MOUNTAIN ROAD / TAKE THE TURN','#e2f7ad');
    for(let i=0;i<35;i++){const a=i/35*Math.PI*2,r=650+rand()*300,h=95+rand()*180;add('rock','solid',[120+Math.cos(a)*r,-25,Math.sin(a)*r],[180+rand()*140,h,180+rand()*120],i%3===0?'#9ba794':i%3===1?'#718c76':'#81967d',[0,rand()*3,0]);}
  }
  if(env){
    // Warn before tight corners; arrows point in the actual steering direction.
    for(let d=95;d<length;d+=110){const bend=sample(d+38).curvature;if(Math.abs(bend)<.006)continue;const p=at(d,bend>0?-17.7:17.7);
      piece('box','metal',p,[0,2.2,0],[.2,4.4,.2],'#52697c');piece('box','solid',p,[0,4,0],[5.8,2.3,.2],'#173346');
      for(const x of [-1.7,0,1.7])for(const y of [-1,1])add('box','light',[p.x+Math.cos(p.a)*x,p.y+4+y*.32,p.z-Math.sin(p.a)*x],[1.1,.24,.25],env.rail,[0,p.a,y*(bend>0?1:-1)*Math.PI/4]);
    }
    for(const [from,to] of track.tunnels||[])for(let d=length*from;d<length*to;d+=6){const p=at(d);
      for(const x of [-16.4,16.4])piece('box','solid',p,[x,8,0],[1,16,7],env.wall);
      piece('box','solid',p,[0,16,0],[33,1.2,7],env.wall);
      if(Math.floor(d/6)%3===0){for(const x of [-15.6,15.6])piece('box','light',p,[x,6,0],[.12,.3,5],env.rail);piece('box','light',p,[0,15.25,0],[5,.16,1.4],'#effaff');}
    }
  }
  if(!city){for(let i=0;i<20;i++){const a=i/20*Math.PI*2,r=650+rand()*500,cx=Math.cos(a)*r,cz=Math.sin(a)*r,cy=110+rand()*45;for(let j=0;j<4;j++)add('sphere','light',[cx+(j-1.5)*30,cy+j%2*12,cz+j%3*12],[37+rand()*18,16+rand()*10,28+rand()*12],forest?'#e9f1df':'#f6fbff');}}
  for(const [key,items] of batches){const [geometry,material]=key.split(':'),mesh=new THREE.InstancedMesh(geometries[geometry],materials[material],items.length);mesh.name=`${track.id}-${geometry}-${material}`;items.forEach((v,i)=>{dummy.position.set(...v.p);dummy.rotation.set(...v.r);dummy.scale.set(...v.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(v.color));});mesh.castShadow=material!=='light';mesh.receiveShadow=material!=='light';mesh.computeBoundingSphere();group.add(mesh);}
  group.userData={trackId:track.id,theme:challenge?track.subtitle:city?'neon city':forest?'pine mountain':'seaside resort',instanceCount:[...batches.values()].reduce((n,items)=>n+items.length,0)};
  // Dispose shared materials/geometries once when switching tracks.
  group.userData.dispose=()=>{const geometrySet=new Set(Object.values(geometries)),materialSet=new Set(Object.values(materials)),textureSet=new Set();group.traverse(o=>{if(o.geometry)geometrySet.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materialSet.add(m);});for(const m of materialSet){if(m.map)textureSet.add(m.map);m.dispose();}for(const g of geometrySet)g.dispose();for(const t of textureSet)t.dispose();};
  return group;
}
