// Original challenge environments, built from the same instanced primitives as the base game.
// Large scenery is kept clear of every road segment, including neighbouring hairpins.
export function buildChallengeScenery({track,sample,length,at,piece,add,billboard}) {
  const route=Array.from({length:Math.ceil(length/12)},(_,i)=>sample(i*12).position);
  const clear=(p,radius)=>route.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>radius+18);
  const spot=(d,lane,radius)=>{const p=at(d,lane);return clear(p,radius)?p:null;};
  const city=track.id==='citadel',mountain=track.id==='alpine';
  const color=track.accent;
  // Signs face approaching traffic. Their arrows follow the actual bend direction.
  for(let d=95;d<length;d+=95){
    const bend=sample(d+38).curvature;if(Math.abs(bend)<.0055)continue;
    const side=bend>0?-1:1,p=at(d,side*17.7);
    piece('box','metal',p,[0,2.2,0],[.2,4.4,.2],'#50616a');
    piece('box','solid',p,[0,4,0],[5.8,2.3,.2],'#173346');
    for(const x of [-1.7,0,1.7])for(const y of [-1,1]){
      const a=y*(bend>0?1:-1)*Math.PI/4;
      add('box','light',[p.x+Math.cos(p.a)*x,p.y+4+y*.32,p.z-Math.sin(p.a)*x],[1.1,.24,.25],color,[0,p.a,a]);
    }
  }
  if(city){
    // Warm stone blocks, cornices and striped shop awnings along the U-bend district.
    for(let d=80;d<length;d+=73)for(const side of [-1,1]){
      const p=spot(d,side*43,16);if(!p)continue;
      const i=Math.floor(d/73),h=13+i%4*3,c=['#edd5a6','#d0dcd9','#dbaf8b','#e2c49e'][i%4];
      piece('box','solid',p,[0,-(p.y+.6)/2,0],[19,p.y+.6,23],'#aaab99');
      piece('box','solid',p,[0,h/2,0],[19,h,23],c);
      piece('box','solid',p,[0,h+.4,0],[21,.8,25],'#f7e7c8');
      piece('pyramid','solid',p,[0,h+3,0],[15,5,18],'#667c86',Math.PI/4);
      for(const y of [3,7,11,15,19])if(y<h-1)for(const z of [-7,0,7])for(const x of [-9.6,9.6]){
        piece('box','glass',p,[x,y,z],[.18,2.5,2.6],'#497f91');
        piece('box','solid',p,[x,y-1.4,z],[.7,.3,3.2],'#f9e9cc');
      }
      for(const x of [-10.3,10.3])piece('box','solid',p,[x,3.2,0],[2.4,.35,16],i%2?'#db7961':'#638d9c');
      for(const z of [-7,0,7])piece('box','solid',p,[side*-10.4,1.4,z],[.25,2.7,2],'#294b5e');
    }
    for(let d=45;d<length;d+=80)for(const side of [-1,1]){
      const p=spot(d,side*23,3);if(!p)continue;
      piece('box','solid',p,[0,.6,0],[5,1.2,5],'#d9cdb6');
      piece('cylinder','solid',p,[0,3,0],[.3,4.8,.3],'#7d6650');
      piece('sphere','solid',p,[0,6.6,0],[3.5,3.5,3.5],'#648b65');
    }
    for(const f of [.18,.59,.86]){
      const p=spot(length*f,-63,15);if(!p)continue;
      piece('box','solid',p,[0,17,0],[16,34,16],'#d5c7a5');
      piece('box','solid',p,[0,33,0],[19,1.5,19],'#eadcb9');
      piece('pyramid','metal',p,[0,40,0],[14,12,14],'#547c8d',Math.PI/4);
      for(const side of [-1,1]){
        piece('sphere','solid',p,[0,28,side*8.1],[3.1,3.1,.18],'#fff3d0');
        piece('box','metal',p,[0,29,side*8.35],[.22,2,.2],'#30495a');
        piece('box','metal',p,[1,28,side*8.35],[2,.22,.2],'#30495a');
      }
    }
    billboard(at(80,24),'ELEVEN BLOCKS','U-TURNS / BRAKE BEFORE THE APEX',color);
  }else if(mountain){
    for(let d=35;d<length;d+=31)for(const side of [-1,1]){
      const p=spot(d,side*(27+Math.floor(d)%19),7);if(!p)continue;
      const h=12+Math.floor(d)%7,i=Math.floor(d/31);
      piece('cylinder','solid',p,[0,h*.35,0],[.4,h*.7,.4],'#715a43');
      for(let j=0;j<3;j++)piece('cone','solid',p,[0,h*(.43+j*.2),0],[h*(.28-j*.055),h*.5,h*(.28-j*.055)],['#c47539','#e0a443','#607958'][i%3]);
    }
    for(let d=100;d<length;d+=90)for(const side of [-1,1]){
      const p=spot(d,side*47,20);if(!p)continue;
      piece('rock','solid',p,[0,2,0],[16,12+Math.floor(d)%18,18],'#929080',d*.03);
    }
    // Piers make the elevation visible without putting a wide terrain ribbon through nearby bends.
    for(let d=0;d<length;d+=27){const p=at(d);if(p.y<12)continue;
      for(const side of [-1,1])piece('box','solid',p,[side*9,-(p.y+5)/2-.5,0],[1.8,p.y+5,2.4],'#9d9a88');
      piece('box','solid',p,[0,-1.2,0],[25,1.8,3],'#a8a793');
    }
    for(const f of [.12,.5,.79]){const p=at(length*f);
      for(const x of [-16,16])piece('cylinder','solid',p,[x,6.6,0],[.7,13.2,.7],'#954b37');
      piece('box','solid',p,[0,13.2,0],[36,1.1,2],'#b85f3e');
      piece('box','solid',p,[0,14.3,0],[39,.8,2.6],'#383f43');
    }
    billboard(at(80,24),'AUTUMN RIDGE','HAIRPINS / CLIMB / DESCENT',color);
  }else{
    // Brick factories and pipe racks stay outside the driving corridor.
    for(let d=65;d<length;d+=105)for(const side of [-1,1]){
      const p=spot(d,side*48,20);if(!p)continue;
      piece('box','solid',p,[0,-(p.y+.6)/2,0],[26,Math.max(.2,p.y+.6),33],'#71848a');
      piece('box','solid',p,[0,7,0],[23,14,30],'#8f7964');
      piece('box','metal',p,[0,14.5,0],[26,1,33],'#596976');
      for(const y of [4,9])for(const z of [-10,-5,0,5,10])for(const x of [-11.6,11.6])piece('box','glass',p,[x,y,z],[.18,2,2.8],'#a3c3ca');
      piece('cylinder','solid',p,[6,23,6],[2.3,30,2.3],'#a78c70');
      for(const y of [24,31,36])piece('cylinder','solid',p,[6,y,6],[2.4,1.5,2.4],'#baad92');
      piece('cylinder','metal',p,[-6,7,-7],[4.1,14,4.1],'#a2b0b5');
    }
    for(let d=120;d<length;d+=150){const p=at(d);
      for(const x of [-17,17])piece('box','metal',p,[x,8,0],[1.2,16,1.2],'#8c6f49');
      piece('box','metal',p,[0,15,0],[36,1.3,2],'#a78c54');
      for(const z of [-1.2,1.2])add('cylinder','metal',[p.x+Math.sin(p.a)*z,p.y+16.4,p.z+Math.cos(p.a)*z],[.8,36,.8],'#acb9b3',[0,p.a,Math.PI/2]);
    }
    // Swept, high-clearance covered sections follow the road instead of using straight boxes across a bend.
    for(const [from,to] of track.tunnels||[])for(let d=length*from;d<length*to;d+=8){const p=at(d);
      for(const x of [-16.4,16.4])piece('box','solid',p,[x,8,0],[1,16,9],'#657c84');
      piece('box','solid',p,[0,16,0],[33,1.2,9],'#526c78');
      if(Math.floor(d/8)%3===0){
        for(const x of [-15.6,15.6])piece('box','light',p,[x,6,0],[.12,.3,6.5],'#8debf5');
        piece('box','light',p,[0,15.25,0],[5,.16,1.4],'#d6f6ed');
      }
    }
    billboard(at(80,24),'OLD WORKS','TUNNELS / PIPEWORK / SWITCHBACKS',color);
  }
  // A distant backdrop scaled to this route, outside all of its playable roads.
  const xs=route.map(p=>p.x),zs=route.map(p=>p.z),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
  const radius=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))*.75+260;
  for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2,p=[cx+Math.cos(a)*radius,mountain?-30:20,cz+Math.sin(a)*radius];
    add(mountain?'rock':'box','solid',p,mountain?[170,140+i%5*27,170]:[36,40+i%6*15,44],mountain?'#8d997e':city?'#b4c8c6':'#607d8b');
  }
}
