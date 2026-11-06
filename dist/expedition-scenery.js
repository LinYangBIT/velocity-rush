// Original expedition scenery. Every cluster is checked against the entire route,
// so dense switchbacks and stacked roads keep the same open driving corridor.
export function buildExpeditionScenery({track,sample,length,at,piece,add,billboard}) {
  const icy=track.id==='glacier',desert=track.id==='canyon',port=track.id==='skyport';
  if(!icy&&!desert&&!port)return;
  const groundY=track.groundY??(port?-50:-8),shoulder=track.shoulderWidth??18;
  const count=Math.ceil(length/6),step=length/count;
  const route=Array.from({length:count},(_,i)=>sample(i*step).position);
  const clearance=Math.max(18,shoulder);
  const palettes=icy?['#afdae3','#d1eef0','#7eafc2']:desert?['#a95b3e','#c47b4b','#deaa6b']:['#344b70','#53648b','#7683a3'];
  const accent=track.accent||(icy?'#9ff6ff':desert?'#ffc374':'#7ef4f6');

  function segmentDistance(p,a,b){
    const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
    const u=den?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/den)):0;
    return Math.hypot(p.x-a.x-dx*u,p.z-a.z-dz*u);
  }
  function clear(p,radius,skipDistance=-1){
    for(let i=0;i<count;i++){
      if(skipDistance>=0){
        const delta=Math.abs(i*step-skipDistance);
        if(Math.min(delta,length-delta)<36)continue;
      }
      if(segmentDistance(p,route[i],route[(i+1)%count])<radius+clearance)return false;
    }
    return true;
  }
  function spot(d,side,lane,radius,search=36){
    for(let offset=0;offset<=search;offset+=12){
      const p=at(d,side*(lane+offset));
      if(clear(p,radius))return p;
    }
    return null;
  }
  function local(p,x,y,z){
    return [p.x+Math.cos(p.a)*x+Math.sin(p.a)*z,p.y+y,p.z-Math.sin(p.a)*x+Math.cos(p.a)*z];
  }
  // Flat-bottomed tiers genuinely reach the ground, including under elevated roads.
  // The caller reserves the largest complete footprint, not just the central trunk.
  function foundation(p,w,depth,color=palettes[0],terraced=false){
    const h=Math.max(.5,p.y-groundY),base=p.y-h;
    if(terraced){
      for(let j=0;j<3;j++){
        const scale=1-j*.11;
        piece('box','solid',p,[0,base-p.y+h*(j+.5)/3,0],[w*scale,h/3+.04,depth*scale],j%2?palettes[1]:color);
      }
    }else piece('box','solid',p,[0,base-p.y+h/2,0],[w,h,depth],color);
    piece('box','solid',p,[0,.12,0],[w*(terraced?.78:1),.24,depth*(terraced?.78:1)],icy?'#e8f6f3':desert?'#d9ad76':'#91a2b5');
  }
  function cedar(p,x,z,h){
    piece('cylinder','solid',p,[x,h*.24,z],[.34,h*.48,.34],'#667b82');
    for(let j=0;j<3;j++){
      const r=h*(.25-j*.05),cy=h*(.39+j*.21),height=h*.49;
      piece('cone','solid',p,[x,cy,z],[r,height,r],j===1?'#638f99':'#467383');
      piece('cone','solid',p,[x,cy+height*.13,z],[r*.84,height*.76,r*.84],'#e4f3f1');
    }
  }
  function crystal(p,x,z,h,r,color=accent){
    piece('pyramid','glass',p,[x,h*.55,z],[r,h*.9,r],color,Math.PI/4);
    piece('pyramid','solid',p,[x,h*.12,z],[r*.86,h*.24,r*.86],'#d9f9f8',Math.PI/4);
  }
  function led(p,offset,size,color=accent){piece('box','light',p,offset,size,color);}
  function sign(d,title,subtitle){
    const p=spot(d,1,31,7,48);if(!p)return;
    foundation(p,11,3,icy?'#7aabba':desert?'#a36947':'#435a79');
    billboard(p,title,subtitle,accent);
  }

  // Two tall, theme-specific markers make the starting district recognisable
  // without stretching a solid landmark through the road or the chase camera.
  for(const side of [-1,1]){
    const p=spot(36,side,34,11,60);if(!p)continue;
    foundation(p,14,14,palettes[0],!port);
    if(icy){
      piece('box','solid',p,[0,8,0],[7,16,7],'#a6d9df');
      for(const y of [3,9,15])piece('box','solid',p,[0,y,0],[8.4,1.1,8.4],'#e5f7f3');
      crystal(p,0,0,29,4.2,'#a8f2ff');
      for(const x of [-5,5])crystal(p,x,2,8,2.4,'#c2fbff');
      led(p,[0,13,-3.56],[2.7,9,.18],'#d9ffff');
    }else if(desert){
      piece('box','solid',p,[0,9,0],[7.5,18,7],'#bd895d');
      piece('box','solid',p,[0,18.5,0],[11,1.5,10],'#e6bf83');
      piece('pyramid','solid',p,[0,22,0],[6,6,6],'#c17a48',Math.PI/4);
      for(const y of [3,7,11,15])piece('box','solid',p,[0,y,-3.56],[4,.7,.18],'#7d4c36');
      piece('sphere','metal',p,[0,19.5,-5.1],[2.1,2.1,.3],'#f0bf6b');
    }else{
      piece('box','metal',p,[0,13,0],[5.5,26,6],'#344c70');
      for(const x of [-2.8,2.8])led(p,[x,13,-3.05],[.18,25,.2],side<0?'#79f4ec':'#f3b3ef');
      piece('box','glass',p,[0,23,0],[9,4,9],'#668fae');
      piece('box','metal',p,[0,25.5,0],[11,1,11],'#8ea0b8');
      led(p,[0,26.1,0],[11.2,.18,11.2]);
      piece('cylinder','metal',p,[0,31,0],[.28,10,.28],'#a5b4c8');
      piece('sphere','light',p,[0,36,0],[.8,.8,.8],side<0?'#82ffff':'#ffb7eb');
    }
  }

  if(icy){
    // Alternating shelf groves and crystal banks define several distinct sectors.
    for(let d=82,index=0;d<length;d+=87,index++)for(const side of [-1,1]){
      const p=spot(d,side,47,20,24);if(!p)continue;
      foundation(p,27,29,'#91bfce',true);
      if(index%3!==2){
        cedar(p,-5,-5,13+index%5);cedar(p,5,4,10+index%4);
        cedar(p,-3,6,8+index%3);crystal(p,7,-6,5.5,2.2,'#b4f6ff');
      }else{
        for(const [x,z,h,r] of [[-5,-4,15,3.5],[5,3,10,3],[-4,6,7,2.6],[5,-6,6,2.2]])crystal(p,x,z,h,r,index%2?'#9bdce8':'#bceeff');
      }
      piece('rock','solid',p,[6,1.3,7],[3.2,1.5,3],'#e8f7f3',index*.7);
    }
    // Narrow ice fins remain outside every bend; their base is a continuous cliff.
    for(let d=180,index=0;d<length;d+=194,index++){
      const side=index%2?1:-1,p=spot(d,side,66,24,36);if(!p)continue;
      foundation(p,30,33,'#72a9bc',true);
      for(const [x,z,h,w] of [[-7,-3,29,8],[6,3,42,9],[0,8,21,6]]){
        piece('box','solid',p,[x,h*.42,z],[w,h*.84,7],'#9bc9d5');
        piece('pyramid','solid',p,[x,h*.88,z],[w,Math.max(5,h*.25),7],'#dbf2ef',Math.PI/4);
        led(p,[x,h*.4,z-3.56],[.28,h*.65,.15],'#b4f4fc');
      }
    }
    // Low expedition stations and orange equipment provide colour and scale.
    for(const f of [.25,.63,.87]){
      const p=spot(length*f,1,42,16,72);if(!p)continue;
      foundation(p,24,20,'#7ba5b5',true);
      piece('box','solid',p,[0,3.2,0],[13,6.4,10],'#d2e3e4');
      piece('box','solid',p,[0,6.7,0],[15,.6,12],'#f1f8f2');
      piece('box','glass',p,[0,4,-5.1],[9,2.2,.2],'#4e8095');
      piece('box','solid',p,[0,1.5,-5.15],[2.2,3,.25],'#df9762');
      for(const x of [-8.5,8.5])piece('cylinder','solid',p,[x,1.4,3],[1.4,2.8,1.4],'#e49a59');
      piece('cylinder','metal',p,[5,11,0],[.12,9,.12],'#829ba8');
      piece('box','solid',p,[7,14.5,0],[4,1.8,.12],'#e79a5f');
    }
    sign(83,'GLACIER PASS','ICE CRYSTALS / SNOW CEDARS / SWITCHBACKS');
  }else if(desert){
    // The different widths and warm bands create layered sandstone, not plain walls.
    for(let d=84,index=0;d<length;d+=112,index++)for(const side of [-1,1]){
      const p=spot(d,side,52,23,36);if(!p)continue;
      foundation(p,29,31,'#a66a49',true);
      const h=16+index%5*5;
      for(let j=0;j<5;j++){
        const w=25-j*2.4+(j%2?2:0),z=24-j*1.7;
        piece('box','solid',p,[0,(j+.5)*h/5,0],[w,h/5+.1,z],['#a76043','#c07b4e','#dca16a','#b9754c','#e0af77'][j],(index%3-1)*.06);
      }
      piece('rock','solid',p,[6,h+1,-3],[6,2.2,5],'#e6bd87',index*.6);
      for(const [x,z] of [[-7,-8],[8,7]])piece('rock','solid',p,[x,1.4,z],[2.8,1.6,3.4],'#a46043',index);
    }
    // Smaller obelisks and paired ruin columns change the rhythm between mesas.
    for(let d=130,index=0;d<length;d+=147,index++){
      const p=spot(d,index%2?1:-1,33,12,36);if(!p)continue;
      foundation(p,17,15,'#a7764d',true);
      if(index%3===0){
        for(const x of [-5,5]){
          piece('box','solid',p,[x,6,0],[2.7,12,3.1],'#cba16d');
          piece('box','solid',p,[x,11.6,0],[4,1,4.2],'#e3bb82');
          for(const y of [3,6,9])piece('box','solid',p,[x,y,-1.6],[2.8,.35,.14],'#8c5b40');
        }
        piece('box','solid',p,[0,13,0],[15,1.8,4.4],'#d9b078');
        piece('box','solid',p,[2,14.3,0],[9,.8,4.1],'#b98657');
      }else{
        piece('box','solid',p,[0,8,0],[4.5,16,4.5],'#d5ac73');
        piece('pyramid','solid',p,[0,18.5,0],[4.5,5,4.5],'#edca8e',Math.PI/4);
        for(const y of [4,8,12])piece('box','solid',p,[0,y,-2.3],[1.1,2.4,.14],'#89583f');
        piece('rock','solid',p,[5,1.8,3],[2.9,2,3.3],'#b67a4b');
      }
    }
    // Monument circles mark the exits of the canyon's tightest districts.
    for(const f of [.2,.52,.82]){
      const p=spot(length*f,-1,61,24,60);if(!p)continue;
      foundation(p,32,32,'#a46644',true);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3,x=Math.cos(a)*10,z=Math.sin(a)*10,h=10+(i%3)*3;
        piece('box','solid',p,[x,h/2,z],[3.6,h,3.6],'#d3a677',a);
        piece('box','solid',p,[x,h+.4,z],[4.8,.8,4.8],'#e6c08b',a);
      }
      piece('cylinder','solid',p,[0,2,0],[4.5,4,4.5],'#bd895b');
      piece('sphere','metal',p,[0,7,0],[3.3,3.3,3.3],'#e7b766');
    }
    sign(83,'REDSTONE MAZE','STRATIFIED CLIFFS / RUINS / CANYON TURNS');
  }else{
    // Small service terraces support roadside lamps and equipment all the way down.
    for(let d=74,index=0;d<length;d+=93,index++)for(const side of [-1,1]){
      const p=spot(d,side,33,10,24);if(!p)continue;
      foundation(p,13,13,'#344b68');
      piece('box','metal',p,[0,1,0],[14,1.7,14],'#526b88');
      led(p,[0,1.92,-7.04],[13,.15,.15],index%2?'#9df7ee':'#d0acfa');
      piece('cylinder','metal',p,[-3,7,0],[.25,14,.25],'#8eacc0');
      piece('box','metal',p,[-3,14,0],[4,.5,2],'#7b97b2');
      led(p,[-3,14.3,0],[4.2,.15,2.2],'#b2fbff');
      piece('box','solid',p,[3,2.5,2],[3.5,3,4.5],'#d2bd7e');
      for(const z of [-3,1,4])led(p,[5,3,z],[.14,.45,1.7],'#78f5ef');
    }
    for(let d=150,index=0;d<length;d+=174,index++){
      const side=index%2?1:-1,p=spot(d,side,58,24,48);if(!p)continue;
      foundation(p,31,34,'#344861');
      const h=19+(index%4)*7;
      piece('box','solid',p,[0,h/2,0],[22,h,25],palettes[index%3]);
      piece('box','metal',p,[0,h+.6,0],[25,1.2,28],'#a1afc0');
      for(const x of [-11.1,11.1])for(let y=4;y<h-1;y+=5){
        piece('box','glass',p,[x,y,0],[.16,2.5,21],'#6c99b2');
        led(p,[x,y-1.4,0],[.18,.16,21],index%2?'#9decf2':'#e0b5ed');
      }
      for(const z of [-12.6,12.6])led(p,[0,h-.9,z],[20,.25,.2],index%2?'#75e6eb':'#e2acf2');
      piece('box','metal',p,[0,h+2.1,0],[14,2,14],'#4c6684');
      piece('box','glass',p,[0,h+6,0],[11,6,11],'#91becd');
      piece('box','metal',p,[0,h+9.3,0],[16,.8,16],'#a1b7c7');
      led(p,[0,h+9.85,0],[16.2,.18,16.2]);
      piece('cylinder','metal',p,[0,h+14,0],[.2,8,.2],'#a5bac9');
      piece('sphere','light',p,[0,h+18.2,0],[.65,.65,.65],'#ffd697');
    }
    // Three-bladed wind turbines occupy their own safe off-road platforms.
    for(let d=270,index=0;d<length;d+=251,index++){
      const p=spot(d,index%2?1:-1,45,16,48);if(!p)continue;
      foundation(p,20,20,'#344c68');
      piece('box','metal',p,[0,12,0],[1.8,24,1.8],'#b1c6d0');
      piece('box','metal',p,[0,24,1],[3.6,3,5],'#d8e5df');
      piece('sphere','metal',p,[0,24,-2],[1.6,1.6,1.6],'#8da7b8');
      for(let j=0;j<3;j++){
        const a=index*.63+j*Math.PI*2/3;
        add('box','solid',local(p,-Math.sin(a)*5.3,24+Math.cos(a)*5.3,-2.8),[1.05,10,.4],'#dae9e4',[0,p.a,a]);
        add('box','light',local(p,-Math.sin(a)*9.3,24+Math.cos(a)*9.3,-3.04),[1.1,.8,.14],accent,[0,p.a,a]);
      }
      led(p,[0,2,-10.05],[18,.25,.2],'#91f8e7');
    }
    // Safe underside piers: skip neighbouring road segments entirely, even if
    // the present deck is far above them. Nothing is added above the road surface.
    for(let d=0;d<length;d+=79){
      const center=at(d);if(center.y-groundY<8)continue;
      for(const lane of [-8.5,8.5]){
        const p=at(d,lane);if(!clear(p,4,d))continue;
        const top=p.y-2.4,h=top-groundY;if(h<1)continue;
        piece('box','solid',p,[0,groundY-p.y+h/2,0],[2.8,h,3.2],'#30425f');
        piece('box','metal',p,[0,-3.4,0],[5,2,5],'#697e99');
      }
    }
    sign(83,'SKYPORT RING','ELEVATED DOCKS / WIND TURBINES / CITY LIGHTS');
  }

  // A route-centred ring makes distant scenery visible on the largest circuits.
  // Each backdrop footprint is also kept outside every actual segment.
  const xs=route.map(p=>p.x),zs=route.map(p=>p.z);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const radius=Math.hypot(maxX-minX,maxZ-minZ)/2+260;
  for(let i=0;i<(port?26:30);i++){
    const a=i/(port?26:30)*Math.PI*2,r=radius+(i%3)*45;
    const p={x:cx+Math.cos(a)*r,y:groundY,z:cz+Math.sin(a)*r,a:a};
    if(!clear(p,port?62:160))continue;
    if(icy){
      const h=170+i%5*33;
      piece('cone','solid',p,[0,h/2,0],[135,h,135],i%2?'#719aa9':'#8fb8c4');
      piece('cone','solid',p,[0,h*.84,0],[45,h*.32,45],'#e3f4f2');
    }else if(desert){
      const h=85+i%5*21;
      for(let j=0;j<4;j++)piece('box','solid',p,[0,(j+.5)*h/4,0],[152-j*17,h/4+.2,128-j*12],['#9a644e','#b77e58','#ca9363','#dfb17c'][j],a*.2);
    }else{
      const h=100+i%6*24;
      piece('box','solid',p,[0,h/2,0],[45,h,55],i%2?'#394b70':'#46597d');
      piece('box','metal',p,[0,h+.7,0],[52,1.4,61],'#7185a5');
      led(p,[0,h+1.55,0],[52,.22,61],i%2?'#90dce9':'#bba1e2');
      for(const y of [h*.35,h*.55,h*.75])led(p,[0,y,-27.6],[40,.5,.25],i%2?'#7bb3cb':'#a2a5d7');
    }
  }
}
