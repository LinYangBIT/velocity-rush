/** Bundled original tracks, optional platform players and local audio import. */
import {BUILTIN_TRACKS} from './audio.js?v=experience-2';
const CLASSIC_TRACKS = [
  {title:'Loves Me Not',artist:'t.A.T.u.',scene:'经典大厅',netease:'4331105',spotify:'78qQzFkH1B5NGuPRkmnrxM',link:'https://music.163.com/song?id=4331105',alternate:'https://www.kugou.com/mixsong/1i2f2bfa.html'},
  {title:'I’m Coming',artist:'Rain feat. Tablo',scene:'经典大厅',spotify:'1G1givLHmalGfiooAaguKe',link:'https://open.spotify.com/track/1G1givLHmalGfiooAaguKe',alternate:'https://music.apple.com/us/song/1698479748'},
  {title:'Not A Single Day',artist:'Rain',scene:'经典大厅',spotify:'2tzYtLYd8Va7wIg6rvU8Cf',link:'https://open.spotify.com/track/2tzYtLYd8Va7wIg6rvU8Cf',alternate:'https://music.apple.com/us/song/1698479758'}
];

export function mountClassicMusic({audio,toast=()=>{},enabled:initialEnabled=true}={}) {
  const existing=document.getElementById('classic-music-dock');
  if(existing?.__classicMusicApi)return existing.__classicMusicApi;
  if(!audio)throw new TypeError('mountClassicMusic requires a GameAudio instance');
  const style=document.createElement('style');
  style.id='classic-music-style';
  style.textContent=`
#classic-music-dock{position:fixed;z-index:65;top:79px;right:22px;width:390px;max-width:calc(100vw - 28px);max-height:calc(100dvh - 100px);overflow:auto;box-sizing:border-box;padding:4px;border:1px solid #e1f5ff;border-radius:6px;background:linear-gradient(150deg,#c8e2f0,#6f9fbf 48%,#527a9e);color:#24496b;box-shadow:0 7px 35px #00172e88,inset 0 0 0 1px #5e7a98;font:12px Arial,'Microsoft YaHei','Noto Sans SC',sans-serif;text-shadow:none;scrollbar-width:thin;scrollbar-color:#7caccb #d9edf7}
#classic-music-dock.cm-closed{visibility:hidden;pointer-events:none;opacity:0}
#classic-music-dock *{box-sizing:border-box}
#classic-music-dock button,#classic-music-dock select,#classic-music-dock input{font:inherit;text-shadow:none}
#classic-music-dock button{cursor:pointer;color:inherit;touch-action:manipulation}
#classic-music-dock a{color:#196699;text-decoration:none;font-size:10px}
#classic-music-dock a:hover{text-decoration:underline}
#classic-music-dock button:focus-visible,#classic-music-dock a:focus-visible,#classic-music-dock select:focus-visible{outline:2px solid #f8bf36;outline-offset:2px}
#classic-music-dock .cm-titlebar{display:flex;align-items:center;gap:7px;padding:4px 7px 7px;color:#fff;text-shadow:0 1px 2px #254868;font-weight:bold;font-size:13px}
#classic-music-dock .cm-titlebar>span:first-child{font-size:19px;color:#e2f5ff}
#classic-music-dock .cm-titlebar small{margin-left:auto;font-size:9px;font-weight:normal;color:#ecf8ff;letter-spacing:1px}
#classic-music-dock .cm-close{width:21px;height:19px;display:grid;place-items:center;padding:0;border:1px solid #cfeafa;border-radius:3px;background:linear-gradient(#b4d8ea,#44749c);box-shadow:inset 0 0 0 1px #537f9f;color:#fff;font-weight:bold;line-height:1}
#classic-music-dock .cm-inner{border:1px solid #45759c;border-radius:3px;background:#e8f2f9;padding:10px;box-shadow:inset 0 1px #fff}
#classic-music-dock .cm-intro{margin:0 0 8px;display:flex;align-items:center;justify-content:space-between;color:#4b7290;font-size:10px}
#classic-music-dock .cm-intro b{font-size:11px;color:#1e608e}
#classic-music-dock .cm-tracks{list-style:none;padding:0;margin:0;border:1px solid #aac7dd;background:#f9fcff}
#classic-music-dock .cm-track{display:flex;align-items:center;width:100%;gap:9px;padding:8px;border:0;border-bottom:1px solid #d8e5ef;text-align:left;background:linear-gradient(#fff,#eaf3f9);border-radius:0;color:#2b4f6b;min-height:42px}
#classic-music-dock .cm-tracks li:last-child .cm-track{border-bottom:0}
#classic-music-dock .cm-track.cm-selected{background:linear-gradient(#e0f4ff,#a9d4f2);box-shadow:inset 0 0 0 1px #7eb9dd}
#classic-music-dock .cm-track-number{font-size:10px;color:#6587a0;width:18px;text-align:center}
#classic-music-dock .cm-track-text{flex:1;min-width:0}
#classic-music-dock .cm-track-text b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
#classic-music-dock .cm-track-text small{font-size:9px;color:#66849c;display:block;margin-top:2px}
#classic-music-dock .cm-track-tag{color:#5583a2;font-size:9px;font-weight:normal}
#classic-music-dock .cm-provider-row{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:9px;font-size:10px}
#classic-music-dock select{border:1px solid #8fadc5;padding:4px 20px 4px 7px;border-radius:3px;background:#fff;color:#2d5877;min-height:27px;font-size:10px}
#classic-music-dock .cm-buttons{display:flex;gap:6px;margin-top:9px}
#classic-music-dock .cm-button{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:29px;padding:5px 10px;border:1px solid #709abc;border-radius:3px;background:linear-gradient(#fff,#d9e9f5);box-shadow:inset 0 0 0 1px #f6fbff;font-size:11px;white-space:nowrap}
#classic-music-dock .cm-play{flex:1;background:linear-gradient(#fff3b5,#f5c154);border-color:#b58a37;color:#68421b;font-weight:bold;box-shadow:inset 0 0 0 1px #ffecad}
#classic-music-dock .cm-button:disabled{opacity:.5;cursor:wait}
#classic-music-dock .cm-import{cursor:pointer}
#classic-music-dock .cm-player{margin-top:9px;min-height:70px;display:flex;align-items:center;justify-content:center;border:1px solid #b1c7d9;background:linear-gradient(#d7e8f3,#eff7fb);border-radius:3px;overflow:hidden}
#classic-music-dock .cm-player iframe{display:block;width:100%;border:0;background:transparent;flex:1}
#classic-music-dock .cm-placeholder{margin:0;text-align:center;padding:12px 8px;font-size:11px;line-height:1.8;color:#5a7a94}
#classic-music-dock .cm-placeholder b{font-size:18px;font-weight:400;color:#7ca0ba;display:block}
#classic-music-dock .cm-status{margin:8px 0 5px;font-size:10px;line-height:1.6;color:#416785;word-break:break-word;min-height:16px}
#classic-music-dock .cm-links{display:flex;gap:12px;flex-wrap:wrap;border-top:1px solid #c8dce9;padding-top:6px;align-items:center}
#classic-music-dock .cm-legal{margin:7px 0 0;color:#738ca1;font-size:9px;line-height:1.6}
@media(max-height:560px) and (orientation:landscape){#classic-music-dock{top:51px;right:16px;max-height:calc(100dvh - 64px);width:390px}#classic-music-dock .cm-inner{padding:8px}#classic-music-dock .cm-track{min-height:34px;padding:5px 7px}#classic-music-dock .cm-track-text small{display:none}#classic-music-dock .cm-provider-row{margin-top:6px}#classic-music-dock .cm-buttons{margin-top:6px}#classic-music-dock .cm-player{margin-top:6px}#classic-music-dock .cm-legal{margin-top:5px}#classic-music-dock .cm-status{margin-top:5px}}
@media(max-width:600px) and (orientation:portrait){#classic-music-dock{top:70px;right:14px;max-height:calc(100dvh - 90px);width:calc(100vw - 28px)}}
`;
  document.head.append(style);
  const dock=document.createElement('section');
  dock.id='classic-music-dock';dock.className='cm-closed';dock.setAttribute('aria-label','游戏音乐播放器');dock.setAttribute('aria-hidden','true');
  let selected=0;
  try{const saved=localStorage.getItem('velocity-builtin-track');const index=BUILTIN_TRACKS.findIndex(t=>t.id===saved);if(index>=0)selected=index;}catch{}
  audio.builtinTrackId=BUILTIN_TRACKS[selected].id;audio.builtinTrackName=BUILTIN_TRACKS[selected].title;
  dock.innerHTML=`<div class="cm-titlebar"><span>♫</span><strong>随车音乐</strong><small>BUILT-IN SOUNDTRACK</small><button class="cm-close" type="button" aria-label="收起音乐播放器">−</button></div><div class="cm-inner"><p class="cm-intro"><b>内置竞速 BGM</b><span>原创电子 · 自动循环</span></p><ul class="cm-tracks">${BUILTIN_TRACKS.map((t,i)=>`<li><button class="cm-track" type="button" data-builtin="${i}" aria-pressed="false"><span class="cm-track-number">${String(i+1).padStart(2,'0')}</span><span class="cm-track-text"><b>${t.title} <span style="font-weight:400;font-size:9px">${t.subtitle}</span></b><small>${t.description}</small></span><span class="cm-track-tag">${t.bpm} BPM · ${t.duration}</span></button></li>`).join('')}</ul><div class="cm-buttons"><button class="cm-button cm-play" type="button">暂停音乐</button><button class="cm-button cm-next" type="button">下一首 ›</button><label class="cm-button cm-import" for="cm-local-file">导入本地</label><input type="file" id="cm-local-file" accept="audio/*" hidden></div><div class="cm-provider-row"><label for="cm-volume">音乐音量</label><input id="cm-volume" type="range" min="0" max="1" step=".05" value="${audio.musicVolume}" aria-label="音乐音量" style="width:65%;accent-color:#287fa9"></div><div class="cm-provider-row"><label for="cm-effects-volume">驾驶音效</label><input id="cm-effects-volume" type="range" min="0" max="1" step=".05" value="${audio.effectsVolume}" aria-label="驾驶音效音量" style="width:65%;accent-color:#287fa9"></div><p class="cm-status" role="status"></p><div class="cm-player" style="display:none"></div><details class="cm-external"><summary style="cursor:pointer;font-size:10px;color:#507896;padding:7px 0;border-top:1px solid #c8dce9">经典原曲 · 平台播放</summary><div class="cm-provider-row"><select id="cm-original-track" aria-label="选择经典原曲" style="max-width:68%">${CLASSIC_TRACKS.map((t,i)=>`<option value="${i}">${t.title} · ${t.artist}</option>`).join('')}</select><button type="button" class="cm-button cm-original">载入</button></div><div class="cm-links" style="margin-top:8px">${CLASSIC_TRACKS.map(t=>`<a href="${t.link}" target="_blank" rel="noopener noreferrer">${t.title} ↗</a>`).join('')}</div><p class="cm-legal">经典歌曲由平台播放，可能需要登录。内置 BGM 无需平台或账号。</p></details><p class="cm-legal">音乐随游戏内置，点击页面后播放。可随时暂停、切歌或导入本地音频。</p></div>`;
  document.body.append(dock);
  const find=s=>dock.querySelector(s),player=find('.cm-player'),status=find('.cm-status');
  let opened=false,enabled=Boolean(initialEnabled),source=enabled?'builtin':'off',resumeKind='builtin',loadSerial=0,returnFocus=null;
  audio.setMusicEnabled(enabled);
  function trackTitle(){return resumeKind==='local'?audio.userTrackName:BUILTIN_TRACKS[selected].title;}
  function changed(){dock.dispatchEvent(new CustomEvent('classic-music:change',{bubbles:true,detail:{source,enabled,track:trackTitle()}}));}
  function message(text){status.textContent=text;}
  function playbackStatus(){
    dock.dataset.playbackState=source==='platform'?'platform':audio.playbackState;
    if(source==='platform')return;
    const state=audio.playbackState;
    const track=audio._fallback?'原创合成配乐':trackTitle();
    const text={muted:`音乐已暂停 · ${track}`,background:'已切到后台，音乐暂停；返回后自动恢复。',waiting:`音乐已开启 · 点击页面后播放 ${track}`,loading:`正在载入：${track}…`,ducked:`比赛已暂停 · 音乐已降低音量 · ${track}`,playing:`正在循环：${track} · 收起面板后继续播放`};
    message(text[state]||text.waiting);
  }
  function refresh(){dock.querySelectorAll('[data-builtin]').forEach(b=>{const active=resumeKind==='builtin'&&Number(b.dataset.builtin)===selected;b.classList.toggle('cm-selected',active);b.setAttribute('aria-pressed',String(active));});find('.cm-play').textContent=enabled?'暂停音乐':'▶ 继续播放';find('.cm-play').setAttribute('aria-label',enabled?'暂停音乐':'继续播放音乐');find('#cm-volume').value=audio.musicVolume;find('#cm-effects-volume').value=audio.effectsVolume;}
  function clearFrame(){player.replaceChildren();player.style.display='none';}
  function setEnabled(value){
    const next=Boolean(value);++loadSerial;
    audio.cancelPendingLoad();
    if(source==='platform')clearFrame();
    enabled=next;source=enabled?resumeKind:'off';audio.setMusicEnabled(enabled);
    if(enabled)audio.unlock().catch(()=>{});
    message(enabled?`正在循环：${trackTitle()} · 收起面板后继续播放`:`音乐已暂停 · ${trackTitle()}`);
    refresh();changed();playbackStatus();
  }
  async function playBuiltin(index){
    const serial=++loadSerial;selected=(index+BUILTIN_TRACKS.length)%BUILTIN_TRACKS.length;resumeKind='builtin';enabled=true;source='builtin';clearFrame();
    try{localStorage.setItem('velocity-builtin-track',BUILTIN_TRACKS[selected].id);}catch{}
    audio.setMusicEnabled(false);const unlocking=audio.unlock();message(`正在载入：${trackTitle()}…`);refresh();
    try{await audio.loadBuiltinTrack(BUILTIN_TRACKS[selected].id);await unlocking;if(serial!==loadSerial)return;audio.setMusicEnabled(enabled);playbackStatus();changed();}
    catch{if(serial!==loadSerial)return;audio.setMusicEnabled(enabled);message('音频文件暂不可用，正在使用原创合成配乐。点击曲目可重试。');refresh();changed();}
  }
  dock.querySelectorAll('[data-builtin]').forEach(b=>b.addEventListener('click',()=>playBuiltin(Number(b.dataset.builtin))));
  find('.cm-play').addEventListener('click',()=>setEnabled(!enabled));
  find('.cm-next').addEventListener('click',()=>playBuiltin(selected+1));
  function mixChanged(){dock.dispatchEvent(new CustomEvent('classic-music:mix',{bubbles:true,detail:{musicVolume:audio.musicVolume,effectsVolume:audio.effectsVolume}}));}
  find('#cm-volume').addEventListener('input',event=>{audio.setMusicVolume(Number(event.currentTarget.value));mixChanged();});
  find('#cm-effects-volume').addEventListener('input',event=>{audio.setEffectsVolume(Number(event.currentTarget.value));mixChanged();});
  find('#cm-local-file').addEventListener('change',async event=>{
    const input=event.currentTarget,file=input.files?.[0];if(!file)return;
    const wasEnabled=enabled;
    const serial=++loadSerial;clearFrame();audio.setMusicEnabled(false);const unlocking=audio.unlock();message(`正在读取：${file.name}`);
    try{await audio.loadUserTrack(file);await unlocking;if(serial!==loadSerial)return;resumeKind='local';enabled=true;source='local';audio.setMusicEnabled(true);message(`本地循环播放：${audio.userTrackName}`);toast('本地音乐已载入');refresh();changed();}
    catch{if(serial!==loadSerial)return;enabled=wasEnabled;source=enabled?resumeKind:'off';audio.setMusicEnabled(enabled);refresh();changed();message('文件无法播放，已保留原音乐选择。请重试 MP3、WAV 或 OGG。');}
    finally{input.value='';}
  });
  find('.cm-original').addEventListener('click',()=>{
    ++loadSerial;audio.cancelPendingLoad();audio.setMusicEnabled(false);clearFrame();const t=CLASSIC_TRACKS[Number(find('#cm-original-track').value)];source='platform';enabled=true;
    const frame=document.createElement('iframe');frame.title=`${t.title} 官方播放器`;frame.allow='autoplay; encrypted-media';frame.height=t.netease?'86':'152';frame.src=t.netease?`https://music.163.com/outchain/player?type=2&id=${t.netease}&auto=0&height=66`:`https://open.spotify.com/embed/track/${t.spotify}?utm_source=generator&theme=0`;player.style.display='flex';player.append(frame);message('请在平台播放器内点击播放；也可打开歌曲链接。');refresh();changed();
  });
  window.addEventListener('game-audio:error',event=>{message(event.detail.message);});
  window.addEventListener('game-audio:state',playbackStatus);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&source==='platform'){
      clearFrame();
      message('平台音乐已随页面切后台停止；返回后点击“载入”继续。');
    }
  });
  function open(){returnFocus=document.activeElement;opened=true;dock.classList.remove('cm-closed');dock.setAttribute('aria-hidden','false');dock.inert=false;refresh();find('.cm-close').focus({preventScroll:true});}
  function close(){opened=false;dock.classList.add('cm-closed');dock.setAttribute('aria-hidden','true');dock.inert=true;if(returnFocus?.isConnected&&typeof returnFocus.focus==='function')returnFocus.focus({preventScroll:true});}
  find('.cm-close').addEventListener('click',close);
  dock.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
  refresh();playbackStatus();dock.inert=true;audio.installLifecycle();
  const api={open,close,toggle(){opened?close():open();},get isOpen(){return opened;},get source(){return source;},get enabled(){return enabled;},setEnabled,unlock:()=>audio.unlock(),playBuiltin,stop:()=>setEnabled(false)};
  dock.__classicMusicApi=api;
  return api;
}
