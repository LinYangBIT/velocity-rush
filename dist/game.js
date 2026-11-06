import {createWorld} from './world.js';
import {TRACKS,createTrackCurve} from './tracks.js';
import {GameAudio} from './audio.js?v=experience-2';
import {mountClassicMusic} from './classic-music.js?v=experience-2';
import {RaceSession} from './physics.js';
import {createDrivingInput,KEY_CONTROLS} from './driving-input.js';
import {normalizeSettings,normalizeProfile} from './player-settings.js';
import {createDrivingGuide} from './driving-guide.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const safeRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const touchCapable=matchMedia('(any-pointer:coarse)').matches||navigator.maxTouchPoints>0;
let settings=normalizeSettings(safeRead('velocity-settings',{}),touchCapable);
let profile=normalizeProfile(safeRead('velocity-profile',{}));
const cars=[{name:'凌光',suffix:'CLASSIC',color:'#aaa99a',speed:285,handling:92,nitro:96,tag:'经典银灰涂装 · 双喷动力'},{name:'凌光',suffix:'STEEL BLUE',color:'#526b8e',speed:278,handling:98,nitro:92,tag:'蓝钢涂装 · 灵敏转向'},{name:'凌光',suffix:'SANDSTORM',color:'#b3a278',speed:295,handling:86,nitro:94,tag:'沙暴涂装 · 直道极速'}];
const tracks=TRACKS;
const modes=[{id:'race',name:'个人竞速',icon:'⚑',description:'你与 5 位 AI 车手 · 2 圈'},{id:'sprint',name:'一圈冲刺',icon:'ϟ',description:'短途决胜 · 5 位 AI · 1 圈'},{id:'time',name:'计时挑战',icon:'◷',description:'独自挑战个人纪录 · 2 圈'},{id:'drift',name:'漂移积分',icon:'↝',description:'90 秒限时 · 连续漂移提高倍率'},{id:'practice',name:'自由练习',icon:'∞',description:'不限时间与圈数 · 熟悉每条路线'}];
let chosenCar=Number(safeRead('velocity-car',0));if(!cars[chosenCar])chosenCar=0;
let chosenTrack=safeRead('velocity-track','coast');chosenTrack=({sunset:'coast',night:'city'})[chosenTrack]||chosenTrack;if(!tracks.find(t=>t.id===chosenTrack))chosenTrack='coast';
let chosenMode='race', session=null, state='lobby', world, countdown=0,lastCount=0, last=performance.now(),sceneTime=0,modalType='',messageUntil=0,toastTimer,frameCount=0;
const drivingInput=createDrivingInput(),input=drivingInput.state;
let pausedFrom='race',guide=null,lastHUD=0;
const audio=new GameAudio();audio.setMusicEnabled(settings.music);audio.setEffectsEnabled(settings.effects);audio.setVolume(settings.volume);audio.setMusicVolume(settings.musicVolume);audio.setEffectsVolume(settings.effectsVolume);
const classicMusic=mountClassicMusic({audio,toast,enabled:settings.music});
function syncSettings(){save('velocity-settings',settings);audio.setMusicEnabled(settings.music&&['builtin','local'].includes(classicMusic.source));audio.setEffectsEnabled(settings.effects);audio.setVolume(settings.volume);audio.setMusicVolume(settings.musicVolume);audio.setEffectsVolume(settings.effectsVolume);$('#music-btn').classList.toggle('off',!settings.music);$('#music-btn').setAttribute('aria-label','打开音乐播放器');$('#music-btn').title='内置 BGM / 音乐播放器'}
function isCompetitive(mode=chosenMode){return mode==='race'||mode==='sprint'}
function bestText(){return chosenMode==='drift'?`${(profile.scores[recordKey()]||0).toLocaleString()} 分`:timeText(profile.bests[recordKey()])}
const diagramCache=new Map();
function trackDiagram(track){
 if(diagramCache.has(track.id))return diagramCache.get(track.id);
 const {curve}=createTrackCurve(track.id),points=curve.getSpacedPoints(Math.ceil(track.length/8)),xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),scale=Math.min(190/(maxX-minX),94/(maxZ-minZ));
 const q=points.map(p=>[110+(p.x-(minX+maxX)/2)*scale,62+(p.z-(minZ+maxZ)/2)*scale]);
 const d=q.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ')+' Z';
 const svg=`<svg class="route-diagram" viewBox="0 0 220 124" role="img" aria-label="${track.name}实际路线，圆点为起点"><path d="${d}" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="12"/><path d="${d}" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="${q[0][0]}" cy="${q[0][1]}" r="5" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>`;
 diagramCache.set(track.id,svg);return svg;
}
const trackImage=track=>`assets/tracks/${track.id}.svg`;


function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600)}
function timeText(seconds){if(!Number.isFinite(seconds))return '--:--.---';const m=Math.floor(seconds/60),s=Math.floor(seconds%60),ms=Math.floor((seconds%1)*1000);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`}
function recordKey(){return `${chosenTrack}-${chosenMode}-${settings.difficulty}`}
function refreshLobby(){const car=cars[chosenCar],track=tracks.find(t=>t.id===chosenTrack);$('#car-title').innerHTML=`${car.name} <span>${car.suffix}</span>`;$('#stat-speed').innerHTML=`${car.speed}<small>km/h</small>`;$('#stat-handling').innerHTML=`${car.handling}<small>/100</small>`;$('#stat-nitro').innerHTML=`${car.nitro}<small>/100</small>`;$('#track-region').textContent=track.label;$('#track-title').innerHTML=`${track.name} <span>${track.subtitle||track.id.toUpperCase()}</span>`;$('#track-length').textContent=(world.trackLength/1000).toFixed(2);$('#track-difficulty').textContent='★'.repeat(track.difficulty||2)+'☆'.repeat(5-(track.difficulty||2));$('#track-laps').textContent=chosenMode==='sprint'?'1 圈':chosenMode==='drift'?'90 秒':chosenMode==='practice'?'不限圈数':'2 圈';$('#mode-label').textContent=modes.find(m=>m.id===chosenMode).name;$('#mode-detail').textContent=modes.find(m=>m.id===chosenMode).description;const best=chosenMode==='drift'?profile.scores[recordKey()]:profile.bests[recordKey()];const [base,ms]=timeText(best).split('.');$('#lobby-best').innerHTML=chosenMode==='drift'?`${(best||0).toLocaleString()}<em> 分</em>`:`${base}<em>.${ms}</em>`;$('#best-caption').textContent=best?(chosenMode==='drift'?'下一次，连击更高':'下一次，再快一点'):'新纪录，等你创造';$('#player-level').textContent=String(1+Math.floor(profile.races/3)).padStart(2,'0');$('#race-best').textContent=bestText();$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='lobby'));$('.track-illustration').dataset.track=chosenTrack;$('.track-illustration').classList.toggle('diagram-preview',true);$('.track-illustration img').src=trackImage(track);$('.track-illustration img').alt=track.name+('路线预览');$('.weather').textContent=track.icon+' '+(track.weather||({coast:'晴昼',city:'夜景',forest:'山林'})[chosenTrack]);$('.preview-tag').textContent='实际路线预览';$('.race-track>b').textContent=track.name;$('.minimap-wrap>span').textContent=track.subtitle||track.id.toUpperCase()}

function showModal(title,kicker,content,type){modalType=type;$('#modal-title').textContent=title;$('#modal-kicker').textContent=kicker;$('#modal-body').innerHTML=content;$('#modal').classList.remove('hidden');$('#close-modal').focus();if(type==='pause')$('#close-modal').setAttribute('aria-label','继续比赛');else $('#close-modal').setAttribute('aria-label','关闭弹窗')}
function closeModal(){if(modalType==='result')return;$('#modal').classList.add('hidden');if(state==='paused'){state=pausedFrom;last=performance.now();resetInput();audio.setPaused(false);audio.unlock().catch(()=>{});}modalType='';refreshLobby()}
function paintInput(){$$('[data-control]').forEach(b=>b.classList.toggle('pressed',input[b.dataset.control]))}
function resetInput(){drivingInput.reset();paintInput()}
function selectGarage(){showModal('我的赛车','CLASSIC GARAGE',`<div class="garage-tabs"><span>赛车</span><b>我的物品</b></div><div class="option-grid garage-grid">${cars.map((c,i)=>`<button class="option-card ${i===chosenCar?'selected':''}" data-car="${i}"><small>A 级 · ${i===0?'经典银灰':i===1?'蓝钢涂装':'沙暴涂装'}</small><div class="classic-car-thumb car-skin-${i}"><img src="assets/car.svg" alt="原创凌光赛车设计图"></div><b>${c.name}</b><small>${c.tag}<br>极速 ${c.speed} km/h · 操控 ${c.handling}</small><span class="equip-label">${i===chosenCar?'已装备 ✓':'装备'}</span></button>`).join('')}</div><p class="modal-note">独立设计的凌光赛车，提供三种涂装与驾驶设定。低重心封闭座舱搭配双喷动力。</p><div class="modal-actions"><button class="primary-btn" id="garage-done">装备完成 · 返回大厅</button></div>`,'garage');$$('[data-car]').forEach(b=>b.onclick=()=>{chosenCar=+b.dataset.car;save('velocity-car',chosenCar);selectGarage();audio.play('click')});$('#garage-done').onclick=closeModal;$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='garage'))}
let trackFilter='new';
function trackCard(t){return `<button class="option-card track-option ${t.id===chosenTrack?'selected':''}" data-track="${t.id}" aria-pressed="${t.id===chosenTrack}" style="--track-accent:${t.accent||'#55ddee'}"><div class="track-card-image"><img src="${trackImage(t)}" alt="${t.name}${t.challenge?'路线预览':'沿途风景'}">${trackDiagram(t)}${t.challenge?`<span class="challenge-badge">${t.edition===2?'新增':'挑战'}</span>`:''}</div><b>${t.icon} ${t.name}</b><span class="track-metrics">${(t.length/1000).toFixed(2)} km · 高差 ${Math.round(t.elevation||0)} m</span><small>${t.description}</small><span class="track-stars">${'★'.repeat(t.difficulty||2)}${'☆'.repeat(5-(t.difficulty||2))} <i>${t.subtitle||t.id.toUpperCase()}</i></span><span class="track-inspiration">${t.inspiration?`参考端游「${t.inspiration}」 · 原创路线`:t.features}</span></button>`;}
function selectTrack(){
 const fresh=tracks.filter(t=>t.edition===2),challenge=tracks.filter(t=>t.challenge&&t.edition!==2),classic=tracks.filter(t=>!t.challenge),ordered=[...fresh,...challenge,...classic];
 const filters=[['new','本次新增',fresh.length],['challenge','全部挑战',fresh.length+challenge.length],['all','全部赛道',tracks.length]];
 const shown=ordered.filter(t=>trackFilter==='all'||trackFilter==='new'&&t.edition===2||trackFilter==='challenge'&&t.challenge);
 showModal('选择赛道 · 探索新的弯道',`${tracks.length} CIRCUITS · EXPEDITION SERIES`,
 `<div class="track-collection-heading"><b>冰川 · 峡谷 · 云上港口</b><span>已选：${tracks.find(t=>t.id===chosenTrack).name}</span></div><div class="track-filters" role="group" aria-label="赛道筛选">${filters.map(([id,label,count])=>`<button data-track-filter="${id}" aria-pressed="${trackFilter===id}">${label}<span>${count}</span></button>`).join('')}</div><div class="option-grid track-options">${shown.map(trackCard).join('')}</div><p class="modal-note">先刹车降速，再转向或漂移通过急弯；出弯后使用氮气。全部赛道支持五种模式，初次体验建议自由练习。</p><div class="modal-actions"><button class="primary-btn" id="track-done">选好了 · 返回大厅 →</button></div>`,'track');
 $$('button[data-track]').forEach(b=>b.onclick=()=>{chosenTrack=b.dataset.track;world.setTrack(chosenTrack);setupMap();save('velocity-track',chosenTrack);const scroll=$('.modal-panel').scrollTop;selectTrack();refreshLobby();$('.modal-panel').scrollTop=scroll;$(`button[data-track="${chosenTrack}"]`).focus({preventScroll:true});audio.play('click')});
 $$('[data-track-filter]').forEach(b=>b.onclick=()=>{trackFilter=b.dataset.trackFilter;selectTrack();$(`[data-track-filter="${trackFilter}"]`).focus({preventScroll:true});});$('#track-done').onclick=closeModal;
}


function selectMode(){showModal('今天，怎么飞驰？','5 WAYS TO RACE',`<div class="option-grid mode-options">${modes.map(m=>`<button class="option-card ${m.id===chosenMode?'selected':''}" data-mode="${m.id}"><span class="big-icon">${m.icon}</span><b>${m.name}</b><small>${m.description}</small></button>`).join('')}</div><div class="setting-row"><label for="difficulty">AI 难度<small>只影响个人竞速和一圈冲刺中的对手</small></label><select id="difficulty"><option value="easy">轻松入门</option><option value="normal">势均力敌</option><option value="hard">极限挑战</option></select></div><p class="modal-note">漂移积分：速度超过 85 km/h，按住方向 + 漂移；连续漂移提升倍率，碰撞或复位会中断连击。其余模式保持原有手动驾驶。</p><div class="modal-actions"><button class="primary-btn" id="mode-done">确认模式 →</button></div>`,'mode');$('#difficulty').value=settings.difficulty;$('#difficulty').onchange=e=>{settings.difficulty=e.target.value;syncSettings();refreshLobby()};$$('[data-mode]').forEach(b=>b.onclick=()=>{chosenMode=b.dataset.mode;selectMode();refreshLobby();audio.play('click')});$('#mode-done').onclick=closeModal}

function showSettings(){
 showModal('系统设置','GAME SETTINGS',`
 <div class="setting-row"><label for="setting-music">背景音乐<small>内置竞速配乐；保留你的静音选择</small></label><input type="checkbox" id="setting-music" ${settings.music?'checked':''}></div>
 <div class="setting-row"><label for="setting-musicVolume">音乐音量<small>单独调节配乐，不改变引擎与提示</small></label><input type="range" id="setting-musicVolume" min="0" max="1" step=".05" value="${settings.musicVolume}"></div>
 <div class="setting-row"><label for="setting-effects">驾驶音效<small>引擎、漂移、氮气与碰撞反馈</small></label><input type="checkbox" id="setting-effects" ${settings.effects?'checked':''}></div>
 <div class="setting-row"><label for="setting-effectsVolume">音效音量<small>单独调节驾驶反馈</small></label><input type="range" id="setting-effectsVolume" min="0" max="1" step=".05" value="${settings.effectsVolume}"></div>
 <div class="setting-row"><label for="setting-volume">总音量<small>同时调整音乐与音效</small></label><input type="range" id="setting-volume" min="0" max="1" step=".05" value="${settings.volume}"></div>
 <div class="setting-row"><label for="setting-guide">入弯提示<small>弯向、距离与建议车速；车辆由你操控</small></label><input type="checkbox" id="setting-guide" ${settings.guide?'checked':''}></div>
 <div class="setting-row"><label for="setting-quality">画面品质<small>手机建议均衡，发热时可切换流畅</small></label><select id="setting-quality"><option value="low">流畅</option><option value="medium">均衡</option><option value="high">高清</option></select></div>
 <div class="setting-row"><span>内置 BGM<small>原创电子竞速 · 支持本地音乐</small></span><button class="secondary-btn" id="settings-classic-music">打开播放器 ♫</button></div>
 <p class="modal-note">首次操作后自动播放音乐；切后台暂停声音。设置和成绩保存在当前浏览器。</p>`,'settings');
 $('#setting-quality').value=settings.quality;
 for(const name of ['music','effects','guide'])$(`#setting-${name}`).onchange=e=>{
  settings[name]=e.target.checked;
  if(name==='music')classicMusic.setEnabled(settings.music);
  syncSettings();
 };
 for(const name of ['volume','musicVolume','effectsVolume'])$(`#setting-${name}`).oninput=e=>{settings[name]=+e.target.value;syncSettings()};
 $('#setting-quality').onchange=e=>{settings.quality=e.target.value;syncSettings()};
 $('#settings-classic-music').onclick=()=>{closeModal();classicMusic.open()};
}
function showHelp(){showModal('每个高手，都从第一弯开始','QUICK START',`<div class="guide-grid"><div class="guide-item"><b>01 自动加速</b><p>发车后自动踩油门。手机左下方双键转向；键盘使用 <kbd>←</kbd><kbd>→</kbd> 或 A / D。刹车使用 ↓ / S。</p></div><div class="guide-item"><b>02 漂移集气</b><p>转弯时同时按住方向和「漂移」<kbd>Shift</kbd>，蓝色氮气槽持续充能。松开漂移恢复抓地。</p></div><div class="guide-item"><b>03 氮气爆发</b><p>氮气达到 35% 后，按「N₂O」<kbd>Space</kbd> 获得短时极速。出弯后的直道是好时机。</p></div><div class="guide-item"><b>04 保持最佳路线</b><p>撞到护栏会损失速度。松开方向保持当前朝向，弯道需要手动转向。按 R 或触屏「复位」重置到路中央；Esc 暂停。HUD 提前显示弯向、距离与建议车速，橙色提示时先刹车。手机建议横屏，并点击右上角进入全屏。</p></div></div><p class="modal-note">个人竞速 2 圈，一圈冲刺 1 圈，均有 5 位 AI 对手。漂移积分限时 90 秒；计时挑战独自跑 2 圈；自由练习不限圈数。可在 ${tracks.length} 条赛道中自由搭配。</p><div class="modal-actions"><button class="primary-btn" id="help-done">准备好了 →</button></div>`,'help');$('#help-done').onclick=closeModal}
function showRecords(){showModal('每一秒，都值得超越','YOUR RACING CAREER',`<div class="records-stats"><div><b>${profile.races}</b><span>完成比赛</span></div><div><b>${profile.wins}</b><span>冠军次数</span></div><div><b>${String(1+Math.floor(profile.races/3)).padStart(2,'0')}</b><span>车手等级</span></div></div>${profile.records.length?`<table class="records-table"><thead><tr><th>比赛 / 赛道</th><th>名次</th><th>成绩</th></tr></thead><tbody>${profile.records.slice(0,8).map(r=>`<tr><td>${modes.find(m=>m.id===r.mode)?.name||'个人竞速'}<small class="record-track">${tracks.find(t=>t.id===r.track)?.name||'海滨环线'}</small></td><td>${isCompetitive(r.mode)?`${r.rank} / 6`:'—'}</td><td>${r.mode==='drift'?`${(r.score||0).toLocaleString()} 分`:timeText(r.time)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">赛道还是一张白纸。<br>完成第一场比赛，写下你的名字。</div>'}<p class="modal-note">每条赛道、模式和难度分别记录最佳成绩。纪录保存在当前浏览器。</p>`,'records');$$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view==='records'))}

function showCredits(){showModal('独立制作 · 原创路线','VELOCITY RUSH',`<p class="reference-description">九条赛道、五种玩法。路线、场景、凌光赛车与头盔车手均以代码创作；内置两首原创竞速配乐。</p><div class="reference-grid"><div class="reference-card"><img src="assets/car.svg" alt="原创凌光赛车"><b>凌光 LUMEN</b><small>低重心封闭座舱 · 双喷动力</small></div><div class="reference-card"><img src="assets/tracks/skyport.svg" alt="云港天环路线"><b>云港天环</b><small>双层八字立交 · 六十米桥面高差</small></div></div><p class="modal-note">原创代码与素材 MIT；Three.js MIT，Barlow 字体 SIL OFL 1.1。完整许可见项目 THIRD_PARTY_NOTICES.md。本作品与商业竞速游戏厂商无从属关系。</p>`,'credits');}
async function fullscreen(){try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen?.();if(screen.orientation?.lock)await screen.orientation.lock('landscape').catch(()=>{})}else await document.exitFullscreen?.()}catch{toast('当前浏览器不支持全屏，可使用横屏模式')}}
function startRace(){audio.setPaused(false);audio.unlock().catch(()=>{});last=performance.now();world.setTrack(chosenTrack);setupMap();resetInput();classicMusic.close();$('#modal').classList.add('hidden');modalType='';session=new RaceSession({trackLength:world.trackLength,sample:world.sample,mode:chosenMode,difficulty:settings.difficulty,carIndex:chosenCar});state='countdown';countdown=3.5;lastCount=0;$('#lobby').classList.add('hidden');$('#race').classList.remove('hidden');document.body.classList.add('race-active');$('#race-mode').textContent=modes.find(m=>m.id===chosenMode).name;$('.rank-display').classList.toggle('hidden',!isCompetitive());$('.lap-display').classList.toggle('hidden',chosenMode==='drift');$('#drift-score').classList.toggle('hidden',chosenMode!=='drift');$('.lap-display i').textContent=Number.isFinite(session.totalLaps)?`/ ${session.totalLaps}`:'/ ∞';$('.race-time>small').textContent=chosenMode==='drift'?'剩余时间':'比赛用时';$('#race-message').textContent='';$('#race-best').textContent=bestText();$('#scene').focus({preventScroll:true});updateHUD()}

function pauseRace(){if(!['race','countdown'].includes(state))return;pausedFrom=state;state='paused';resetInput();audio.setPaused(true);audio.update({speed:0,racing:false});showModal('稍作停靠，再次出发','RACE PAUSED',`<div class="modal-note" style="margin:0">比赛计时已暂停，继续后从当前位置出发。</div><div class="modal-actions"><button class="secondary-btn" id="quit-race">返回大厅</button><button class="secondary-btn" id="retry-race">重新开始</button><button class="primary-btn" id="resume-race">继续比赛 →</button></div>`,'pause');$('#quit-race').onclick=returnLobby;$('#retry-race').onclick=startRace;$('#resume-race').onclick=closeModal}
function returnLobby(){audio.setPaused(false);state='lobby';session=null;resetInput();$('#modal').classList.add('hidden');modalType='';$('#race').classList.add('hidden');$('#lobby').classList.remove('hidden');document.body.classList.remove('race-active');$('#countdown').textContent='';audio.update({speed:0,drift:false,boost:false,racing:false});refreshLobby()}
function finishRace(){audio.setPaused(false);state='results';resetInput();audio.play('finish');audio.update({racing:false,speed:0});const r=session.result,key=recordKey(),isDrift=chosenMode==='drift',metric=isDrift?r.score:r.time,storeBest=isDrift?profile.scores:profile.bests,newBest=storeBest[key]===undefined||(isDrift?metric>storeBest[key]:metric<storeBest[key]);if(newBest)storeBest[key]=metric;profile.races++;if(r.rank===1&&isCompetitive())profile.wins++;profile.records.unshift({...r,car:chosenCar,track:chosenTrack,date:Date.now()});profile.records=profile.records.slice(0,30);save('velocity-profile',profile);showModal(isDrift?'漂移挑战完成':chosenMode==='time'?'冲线！刷新你的极限':r.rank===1?'冠军，属于你！':'精彩冲线！',isDrift?'DRIFT CHALLENGE COMPLETE':'RACE COMPLETE',`<div class="result-rank ${isDrift?'result-score':''}">${isDrift?r.score.toLocaleString():chosenMode==='time'?'FINISH':`0${r.rank}`}<small>${isDrift?' 分':chosenMode==='time'?'':' / 06'}</small></div><p class="result-title">${isDrift?`最高连击倍率 ×${r.bestCombo.toFixed(1)}`:chosenMode==='time'?'只与自己较量':r.rank<=3?'漂亮的驾驶，继续向前':'下一次，把对手甩在身后'}</p><div class="result-metrics"><div><small>${isDrift?'漂移时长 / 秒':'总用时'}</small><b>${isDrift?r.driftSeconds.toFixed(1):timeText(r.time)}</b></div><div><small>极速 km/h</small><b>${Math.round(r.maxSpeed)}</b></div><div><small>氮气爆发</small><b>${r.boostCount}</b></div></div>${newBest?'<div class="new-best">✦ NEW PERSONAL BEST ✦</div>':''}<div class="modal-actions"><button class="secondary-btn" id="result-lobby">返回大厅</button><button class="primary-btn" id="result-again">再来一场 →</button></div>`,'result');$('#result-lobby').onclick=returnLobby;$('#result-again').onclick=startRace;$('#close-modal').onclick=()=>{if(modalType==='result')returnLobby();else closeModal()}}

function resetCar(){if(state!=='race')return;session.resetToRoad();resetInput();raceMessage('车辆已手动重置',1100)}
function nitro(){if(state!=='race')return;if(session.activateBoost()){audio.play('boost');raceMessage('NITRO BOOST',1000)}else toast(session.boost>0?'氮气正在释放中':'氮气不足，按住方向 + 漂移集气')}
function raceMessage(t,duration=1500){$('#race-message').textContent=t;messageUntil=performance.now()+duration}
function updateHUD(){if(!session)return;$('#rank').textContent=session.rank;$('#rank-suffix').textContent=['','ST','ND','RD','TH','TH','TH'][session.rank]||'TH';$('#speed-needle').style.transform=`rotate(${-110+Math.min(1,session.speed/350)*220}deg)`;$('#lap').textContent=session.lap;$('#timer').textContent=timeText(chosenMode==='drift'?session.timeRemaining:session.elapsed);$('#drift-points').textContent=(session.score||0).toLocaleString();$('#drift-combo').textContent=`×${(session.combo||1).toFixed(1)}`;$('#drift-score').classList.toggle('scoring',session.scoring);$('#speed').textContent=Math.round(session.speed);$('#speed-line').style.width=Math.min(100,session.speed/350*100)+'%';$('#nitro-fill').style.width=session.nitro+'%';$('#nitro-percent').textContent=Math.floor(session.nitro)+'%';$('#nitro-btn').classList.toggle('ready',session.nitro>=35);$('#nitro-hint').textContent=session.boost>0?'氮气爆发中':session.nitro>=35?'氮气就绪 · 点击 N₂O':'按住漂移收集氮气';$('#drift-label').textContent=session.boost>0?'NITRO BOOST':session.drift?'DRIFT + N₂O':'PERFECT LINE';updateGuide();drawMap()}
let mapPoints=[],mapBounds,mapBackdrop=null,mapProjection;
function setupMap(){
 guide=createDrivingGuide({sample:world.sample,trackLength:world.trackLength});
 const canvas=$('#minimap');mapBackdrop=document.createElement('canvas');
 mapBackdrop.width=canvas.width;mapBackdrop.height=canvas.height;
 mapPoints=[];const steps=Math.max(160,Math.ceil(world.trackLength/8));
 for(let i=0;i<=steps;i++){const p=world.sample(i/steps*world.trackLength).position;mapPoints.push({x:p.x,y:p.y,z:p.z})}
 const xs=mapPoints.map(p=>p.x),zs=mapPoints.map(p=>p.z);
 mapBounds={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
 const b=mapBounds,scale=Math.min((canvas.width-40)/(b.maxX-b.minX),(canvas.height-30)/(b.maxZ-b.minZ));
 mapProjection=p=>({x:canvas.width/2+(p.x-(b.maxX+b.minX)/2)*scale,y:canvas.height/2+(p.z-(b.maxZ+b.minZ)/2)*scale});
 const ctx=mapBackdrop.getContext('2d');ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
 mapPoints.forEach((p,i)=>{const q=mapProjection(p);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});
 ctx.strokeStyle='#b9d5dd55';ctx.lineWidth=7;ctx.stroke();ctx.strokeStyle='#d5e5eacc';ctx.lineWidth=2;ctx.stroke();
 if(tracks.find(t=>t.id===chosenTrack).overpass){
  const edges=mapPoints.slice(1).map((q,i)=>[mapPoints[i],q]).sort((a,b)=>(a[0].y+a[1].y)-(b[0].y+b[1].y));
  for(const [a,b] of edges){const p=mapProjection(a),q=mapProjection(b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='#173b50';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle=a.y>45?'#cdb8ff':'#92cdda';ctx.lineWidth=2;ctx.stroke()}
 }
}
function drawMap(){
 const canvas=$('#minimap'),ctx=canvas.getContext('2d');
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(mapBackdrop,0,0);
 for(const rival of session.opponents){const p=mapProjection(world.sample(rival.progress).position);ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='#f4ac91';ctx.fill()}
 const p=mapProjection(world.sample(session.progress).position);
 ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fillStyle='#deff6c';ctx.shadowColor='#deff6c';ctx.shadowBlur=9;ctx.fill();ctx.shadowBlur=0;
}
function updateGuide(){
 const panel=$('#driving-guide');panel.classList.toggle('hidden',!settings.guide);
 if(!settings.guide||!guide)return;
 const cue=guide.read({progress:session.progress,speed:session.speed});
 const turn=cue.direction==='left'?'左':'右',straight=cue.direction==='straight'||!cue.visible;
 panel.dataset.braking=String(!straight&&cue.braking);
 $('#guide-arrow').textContent=straight?'↑':cue.direction==='left'?'↰':'↱';
 $('#guide-turn').textContent=straight?'前方直道':turn+({hairpin:'发卡弯',sharp:'急弯',bend:'弯'}[cue.severity]||'弯');
 $('#guide-distance').textContent=straight?'保持路线':cue.active?'正在过弯':`${Math.max(5,Math.round(cue.distance/5)*5)} 米后`;
 $('#guide-speed').textContent=straight?'—':Math.round(cue.recommendedSpeed);
 $('#guide-action').textContent=straight?'自由提速':cue.braking?'刹车入弯':'建议 km/h';
}
$$('[data-control]').forEach(button=>{
 button.addEventListener('pointerdown',event=>{
  if(!['race','countdown'].includes(state)||event.button>0)return;
  event.preventDefault();button.setPointerCapture(event.pointerId);
  drivingInput.press(`pointer:${event.pointerId}`,button.dataset.control);paintInput();
 });
 const release=event=>{drivingInput.release(`pointer:${event.pointerId}`);paintInput()};
 button.addEventListener('pointerup',release);
 button.addEventListener('pointercancel',release);
 button.addEventListener('lostpointercapture',release);
});
window.addEventListener('keydown',event=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)||event.target.isContentEditable)return;
 if(KEY_CONTROLS[event.code]&&['race','countdown'].includes(state)){
  event.preventDefault();drivingInput.press(`key:${event.code}`,KEY_CONTROLS[event.code]);paintInput();
 }
 if(event.code==='Space'&&state==='race'){event.preventDefault();if(!event.repeat)nitro()}
 if(event.code==='Escape'&&!event.repeat){
  event.preventDefault();
  if(['race','countdown'].includes(state))pauseRace();
  else if(classicMusic.isOpen)classicMusic.close();
  else if(!$('#modal').classList.contains('hidden'))closeModal();
 }
 if(event.code==='KeyR'&&state==='race'&&!event.repeat)resetCar();
});
window.addEventListener('keyup',event=>{drivingInput.release(`key:${event.code}`);paintInput()});
window.addEventListener('blur',()=>{resetInput();pauseRace()});
document.addEventListener('visibilitychange',()=>{
 last=performance.now();
 if(document.hidden){resetInput();pauseRace();audio.update({speed:0,racing:false})}
});
$('#reset-car-btn').onclick=resetCar;$('#start-btn').onclick=startRace;$('#nitro-btn').onclick=nitro;$('#pause-btn').onclick=pauseRace;$('#garage-btn').onclick=selectGarage;$('#track-btn').onclick=selectTrack;$('#mode-btn').onclick=selectMode;$('#help-btn').onclick=showHelp;$('#settings-btn').onclick=showSettings;$('#credits-btn').onclick=showCredits;$('#music-btn').onclick=()=>classicMusic.toggle();$('#close-modal').onclick=closeModal;$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))closeModal()});$$('.fullscreen-btn').forEach(b=>b.onclick=fullscreen);$('#rotate-fullscreen').onclick=fullscreen;$('#portrait-continue').onclick=()=>$('#orientation').classList.add('dismissed');$('.brand').onclick=e=>{e.preventDefault();returnLobby()};$$('.nav-btn').forEach(b=>b.onclick=()=>{if(b.dataset.view==='garage')selectGarage();else if(b.dataset.view==='records')showRecords();else closeModal()});audio.installLifecycle();
// Keep focus inside dialogs for keyboard users.
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||$('#modal').classList.contains('hidden'))return;const items=$$('#modal button:not(:disabled),#modal a,#modal input:not([hidden]),#modal select'),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}});
document.addEventListener('classic-music:change',e=>{settings.music=e.detail.enabled;syncSettings();$('.status-music button b').textContent=e.detail.track||'内置竞速 BGM'});
document.addEventListener('classic-music:mix',e=>{settings.musicVolume=e.detail.musicVolume;settings.effectsVolume=e.detail.effectsVolume;syncSettings()});
document.addEventListener('classic-music:volume',e=>{settings.volume=e.detail.volume;syncSettings()});
for(const id of ['classic-music-nav','chat-music','quick-music','status-music'])$('#'+id).onclick=()=>classicMusic.toggle();
$('#original-nav').onclick=showCredits;
$('#quick-practice').onclick=()=>{chosenMode='practice';refreshLobby();startRace()};
$('#quick-records').onclick=showRecords;
$('#chat-toggle').onclick=()=>{const c=$('.classic-chat');c.classList.toggle('collapsed');$('#chat-toggle').textContent=c.classList.contains('collapsed')?'+':'−'};
function animate(now){requestAnimationFrame(animate);const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;if(document.hidden)return;sceneTime+=dt;frameCount++;if(state==='countdown'&&!document.hidden){countdown-=dt;const n=Math.ceil(countdown-.5);if(n!==lastCount&&n>0){lastCount=n;audio.play('count')}$('#countdown').textContent=n>0?n:'GO!';if(countdown<=0){state='race';audio.play('go');$('#countdown').textContent='';raceMessage('全速向前！',1200)}}if(state==='race'){const events=session.update(dt,input);for(const event of events){if(event==='collision')audio.play('collision');if(event==='lap'&&!session.finished)raceMessage(['practice','drift'].includes(chosenMode)?`第 ${session.lap} 圈 · 继续飞驰`:'最后一圈 · FINAL LAP',2000);if(event==='nitroReady')raceMessage('氮气就绪 · N₂O READY',1000);if(event==='finish')finishRace()}}if(session){audio.update({speed:session.speed,drift:session.drift,boost:session.boost>0,racing:state==='race'});if(now-lastHUD>=50){lastHUD=now;updateHUD()}}if(now>messageUntil)$('#race-message').textContent='';try{world.update({mode:state==='lobby'?'lobby':'race',time:sceneTime,dt,progress:session?.progress||0,lane:session?.lane||0,heading:session?.heading,travelHeading:session?.travelHeading,steer:session?.steering||0,drift:session?.drift||false,boost:(session?.boost||0)>0,speed:session?.speed||0,opponents:session?.opponents||[],carColor:cars[chosenCar].color,trackId:chosenTrack,quality:settings.quality})}catch(e){console.error('Rendering error',e)}}
try{world=createWorld($('#scene'));world.setTrack(chosenTrack);setupMap();$('#track-length').textContent=(world.trackLength/1000).toFixed(1);refreshLobby();syncSettings();window.addEventListener('resize',()=>world.resize());requestAnimationFrame(animate);setTimeout(()=>{$('#loading').style.opacity=0;setTimeout(()=>$('#loading').remove(),500)},400)}catch(e){console.error(e);$('#loading').innerHTML='<b>画面暂时没有准备好</b><span>请使用支持 WebGL 的 Chrome、Safari 或 Edge 浏览器。</span><button class="primary-btn" onclick="location.reload()">重新加载</button>'}
window.__velocity={get state(){return state},get session(){return session},get world(){return world},startRace,returnLobby,pauseRace,settings,get music(){return classicMusic},get audio(){return audio}};
