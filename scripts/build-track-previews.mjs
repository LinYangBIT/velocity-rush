import {writeFileSync} from 'node:fs';
import {TRACKS,createTrackCurve} from '../dist/tracks.js';

// Code-native route posters use the exact driving curve, not a decorative substitute.
for(const track of TRACKS){
  const {curve}=createTrackCurve(track.id),pts=curve.getSpacedPoints(Math.ceil(track.length/6));
  const xs=pts.map(p=>p.x),zs=pts.map(p=>p.z),ys=pts.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const scale=Math.min(480/(maxX-minX),265/(maxZ-minZ)),q=pts.map(p=>[480+(p.x-(minX+maxX)/2)*scale,184+(p.z-(minZ+maxZ)/2)*scale]);
  const path=q.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')+' Z';
  const city=track.id==='citadel',mountain=track.id==='alpine',bg=({glacier:'#285776',canyon:'#624a40',skyport:'#343c6c'})[track.id]||(city?'#1e3b51':mountain?'#314b48':'#173a4d');
  const decor=city?Array.from({length:9},(_,i)=>`<path d="M${20+i*24} 300v-${42+i%3*20}h18v${42+i%3*20}" fill="#9db9ba" opacity=".12"/>`).join(''):mountain?'<path d="M0 308 85 169 142 243 211 117 295 308Z" fill="#b7c8a5" opacity=".12"/><path d="M15 310 87 218 118 264 176 183 250 310Z" fill="#eac191" opacity=".12"/>':'<g stroke="#67d4df" stroke-width="8" fill="none" opacity=".12"><path d="M0 260H125V90h88v210M10 278h97V71h124v235"/></g>';
  const layered=track.overpass?q.slice(1).map((p,i)=>({a:q[i],b:p,y:(ys[i]+ys[i+1])/2})).sort((a,b)=>a.y-b.y).map(({a,b,y})=>`<path d="M${a.join(',')} L${b.join(',')}" fill="none" stroke="#172d42" stroke-width="13"/><path d="M${a.join(',')} L${b.join(',')}" fill="none" stroke="${y>45?'#e0c9ff':'#8ed8ea'}" stroke-width="5"/>`).join(''):'';
  const profile=ys.map((y,i)=>`${i?'L':'M'}${(30+i/(ys.length-1)*175).toFixed(2)},${(287-(y-Math.min(...ys))/Math.max(1,track.elevation)*45).toFixed(2)}`).join(' ');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="540" height="360" viewBox="220 0 540 360" role="img" aria-label="${track.name}实际路线预览">
<defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#d9f3f8" stroke-width=".5" opacity=".09"/></pattern><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#102938"/></linearGradient></defs>
<rect width="800" height="360" fill="url(#bg)"/><rect width="800" height="360" fill="url(#grid)"/>${decor}
<g font-family="Arial,'Microsoft YaHei','PingFang SC',sans-serif"><text x="30" y="43" fill="${track.accent}" font-size="11" letter-spacing="3">CLASSIC CHALLENGE</text><text x="30" y="91" fill="#f3f5e9" font-size="29" font-weight="700">${track.name}</text><text x="30" y="118" fill="#a3bec7" font-size="11" letter-spacing="1">${track.subtitle}</text><path d="M30 145H75" stroke="${track.accent}" stroke-width="3"/>
<text x="30" y="185" fill="#fff4c0" font-size="32" font-weight="700">${(track.length/1000).toFixed(2)}<tspan font-size="12" fill="#a3bec7"> KM</tspan></text><text x="30" y="211" fill="#b3cbd1" font-size="12">${'★'.repeat(track.difficulty)} · ${Math.round(track.elevation)} m 高差</text><path d="${profile}" stroke="${track.accent}" stroke-width="2" opacity=".7" fill="none"/><path d="M30 290H205" stroke="#b5c8c6" opacity=".3"/>
<text x="30" y="322" fill="#93b1bd" font-size="11">原创路线 · 端游风格参考</text></g>
<path d="${path}" fill="none" stroke="#071e29" stroke-width="19" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${track.accent}" stroke-opacity=".24" stroke-width="13"/><path d="${path}" fill="none" stroke="${track.accent}" stroke-width="5" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="#f8f6df" stroke-opacity=".5" stroke-width="1" stroke-dasharray="3 7"/>
${layered}<circle cx="${q[0][0]}" cy="${q[0][1]}" r="8" fill="#faffdc" stroke="#173a4d" stroke-width="3"/><text x="${q[0][0]-13}" y="${q[0][1]+22}" fill="#fff6c9" font-family="Arial" font-size="9">START</text></svg>`;
  writeFileSync(new URL(`../dist/assets/tracks/${track.id}.svg`,import.meta.url),svg);
  console.log(`${track.id}: ${(track.length/1000).toFixed(2)} km route preview generated`);
}
