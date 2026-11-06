/** Prepare an independent, redistributable snapshot. Never copies Git history or hosting credentials. */
import {copyFile,mkdir,readdir,readFile,writeFile,lstat} from 'node:fs/promises';
import {resolve,dirname,join,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(!process.argv[2])throw new Error('Usage: node scripts/export-open-source.mjs /absolute/empty/destination');
const out=resolve(process.argv[2]);
if(out===root||out.startsWith(root+'/'))throw new Error('Choose an empty destination outside the source project.');
await mkdir(out,{recursive:true});
if((await readdir(out)).length)throw new Error('Destination is not empty; no files were changed.');
const copied=[];
async function copy(file){
  const source=join(root,file),target=join(out,file),stat=await lstat(source);
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error(`Expected regular source file: ${file}`);
  await mkdir(dirname(target),{recursive:true});await copyFile(source,target);copied.push(file);
}
async function copyDirectory(dir,allowed){
  for(const item of await readdir(join(root,dir),{withFileTypes:true})){
    if(item.isFile()&&allowed(item.name))await copy(join(dir,item.name));
  }
}
for(const file of ['package.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md'])await copy(file);
// Only application modules and explicitly reviewed asset classes are eligible.
await copyDirectory('dist',name=>/\.(js|css|html)$/.test(name)&&name!=='car-model.js');
for(const file of ['dist/vendor/three.module.js','dist/vendor/THREE-LICENSE.txt','dist/assets/fonts/OFL.txt','dist/assets/audio/README.txt','dist/assets/audio/sunline-drive.mp3','dist/assets/audio/night-pulse.mp3'])await copy(file);
await copyDirectory('dist/assets/fonts',name=>/^barlow-[0-6]\.ttf$/.test(name));
await copyDirectory('dist/assets/tracks',name=>/^[a-z]+\.svg$/.test(name));
await copyDirectory('tests',name=>/\.(mjs|html)$/.test(name));
await copyDirectory('scripts',name=>/\.(mjs|py)$/.test(name));
await copyDirectory('scripts/open-source',name=>/\.(js|svg)$/.test(name));
await writeFile(join(out,'.gitignore'),'node_modules/\n.DS_Store\n*.log\n.env\n.env.*\n!.env.example\n.openai/\nartifacts/\n');

const originalBranding=[
  ['QQ飞车 · 经典端游画面重制','Velocity Rush · 霓速'],
  ['QQ飞车 · 经典重制','Velocity Rush · 霓速'],
  ['依据 QQ 飞车端游经典原图重建的非官方网页竞速体验。经典大厅、雷诺风格赛车、','独立制作的原创网页竞速游戏。凌光赛车、'],
  ['QQ<span>飞车</span><small>QQ SPEED</small>','霓<span>速</span><small>VELOCITY RUSH</small>'],
  ['QQ SPEED','VELOCITY RUSH'],['雷诺','凌光'],['RENO','LUMEN'],['四喷','双喷'],
  ['原版图鉴','项目图鉴'],['原版截图对照 · 2008 — 2010','九条原创路线 · 五种竞速模式'],
  ['查看原图','查看介绍'],['回到熟悉的飞车世界','驶向下一段旅程'],
  ['非官方网页体验','原创网页竞速'],['经典，再次出发','弯道，等你征服'],
  ['正在回到熟悉的飞车世界…','正在准备下一场竞速…'],
  ['按照老版大厅参考重建的飞车人物','原创头盔车手'],
  ['QQ飞车老版比赛画面参考','蔚蓝海岸实际路线预览'],
];
async function edit(file,transform){const path=join(out,file),before=await readFile(path,'utf8');await writeFile(path,transform(before));}
function replaceRequired(text,pattern,replacement,label){
  if(typeof pattern==='string'?!text.includes(pattern):!text.match(pattern))throw new Error(`Export transform missing anchor: ${label}`);
  return text.replace(pattern,replacement);
}
for(const file of copied.filter(f=>/^dist\//.test(f)&&/\.(js|html|css)$/.test(f)&&!f.includes('/vendor/'))){
  await edit(file,text=>originalBranding.reduce((value,[from,to])=>value.replaceAll(from,to),text));
}
await edit('dist/index.html',text=>{
  text=text.replaceAll('assets/classic-avatar.png','assets/pilot.svg').replaceAll('assets/reference/classic-race.jpg','assets/tracks/coast.svg');
  if(!text.includes('assets/pilot.svg')||!text.includes('id="credits-btn"'))throw new Error('Export index portrait/credits anchors changed.');
  return text;
});
await edit('dist/game.js',text=>{
  if(text.includes('const references=[')){
    text=replaceRequired(text,/const references=\[[\s\S]*?(?=async function fullscreen\()/,`function showCredits(){showModal('独立制作 · 原创路线','VELOCITY RUSH',\`<p class="reference-description">九条赛道、五种玩法。路线、场景、凌光赛车与头盔车手均以代码创作；内置两首原创竞速配乐。</p><div class="reference-grid"><div class="reference-card"><img src="assets/car.svg" alt="原创凌光赛车"><b>凌光 LUMEN</b><small>低重心封闭座舱 · 双喷动力</small></div><div class="reference-card"><img src="assets/tracks/skyport.svg" alt="云港天环路线"><b>云港天环</b><small>双层八字立交 · 六十米桥面高差</small></div></div><p class="modal-note">原创代码与素材 MIT；Three.js MIT，Barlow 字体 SIL OFL 1.1。完整许可见项目 THIRD_PARTY_NOTICES.md。本作品与商业竞速游戏厂商无从属关系。</p>\`,'credits');}\n`, 'reference gallery block');
  }
  text=text.replaceAll('assets/reference/original-reno.jpg','assets/car.svg').replaceAll('凌光官方原始车体设计图','原创凌光赛车设计图');
  text=text.replace(/以 2008 年凌光官方设计图重建同一款赛车，提供三种涂装与驾驶设定。图中为官方原图，场景中为可驾驶的 3D 重建模型。/g,'独立设计的凌光赛车，提供三种涂装与驾驶设定。低重心封闭座舱搭配双喷动力。');
  if(text.includes("const trackImage=track=>"))text=replaceRequired(text,/const trackImage=track=>[^;]+;/,'const trackImage=track=>`assets/tracks/${track.id}.svg`;','track image resolver');
  else throw new Error('Export trackImage anchor changed.');
  text=text.replace("classList.toggle('diagram-preview',!!track.challenge)","classList.toggle('diagram-preview',true)").replaceAll("track.challenge?'路线预览':'实景'","'路线预览'").replaceAll("track.challenge?'挑战赛道 · 路线预览':'3D 赛道实景'","'实际路线预览'");
  return text;
});
await edit('tests/tracks.test.mjs',text=>text.replaceAll("${track.id}.${track.challenge?'svg':'jpg'}","${track.id}.svg"));
await edit('scripts/build-track-previews.mjs',text=>{
  if(text.includes('TRACKS.filter(t=>t.challenge)'))text=replaceRequired(text,'for(const track of TRACKS.filter(t=>t.challenge)){','for(const track of TRACKS){','route preview loop');
  return text;
});
await copyFile(join(root,'scripts/open-source/car-model.js'),join(out,'dist/car-model.js'));
await copyFile(join(root,'scripts/open-source/pilot.svg'),join(out,'dist/assets/pilot.svg'));
await copyFile(join(root,'scripts/open-source/car.svg'),join(out,'dist/assets/car.svg'));
// Keep publicly offered license metadata explicit; no publishing configuration is included.
await edit('package.json',text=>{const pkg=JSON.parse(text);pkg.name='velocity-rush';pkg.license='MIT';pkg.private=true;return JSON.stringify(pkg,null,2)+'\n';});
execFileSync(process.execPath,['scripts/build-track-previews.mjs'],{cwd:out,stdio:'inherit'});

async function walk(dir){const files=[];for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())files.push(...await walk(path));else files.push(path);}return files;}
const files=await walk(out);
for(const file of files){
  const rel=relative(out,file);
  if(/(^|\/)(\.git|\.openai|\.env|artifacts)(\/|$)|\.(png|jpe?g|webp)$/.test(rel))throw new Error(`Excluded path leaked into export: ${rel}`);
  if(['.js','.html','.css','.json'].includes(extname(file))&&!rel.startsWith('scripts/')){
    const text=await readFile(file,'utf8');
    if(/assets\/reference\/|assets\/classic-avatar\.png|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{25,}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/.test(text))throw new Error(`Private/reference content detected in: ${rel}`);
  }
}
console.log(`Prepared ${files.length} redistributable files in ${out}. No Git history, hosting config or reference images were copied.`);
