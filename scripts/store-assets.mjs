import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createDemoState} from '../src/data.js';

const root=resolve(import.meta.dirname,'..');
const bundled=process.env.QIYE_STORE_NODE_MODULES;
const require=createRequire(bundled?resolve(bundled,'../package.json'):import.meta.url);
const sharp=require('sharp');
const output=resolve(root,'docs/store/assets');
await mkdir(output,{recursive:true});
const brand=await readFile(resolve(root,'assets/brand/qiye.svg'),'utf8');
const inner='<g fill="none">'+brand.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'')+'</g>';
for(const size of [128,300,512,1024]){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128"><g transform="translate(9.142857 9.142857) scale(1.7142857)">${inner}</g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(resolve(output,`icon-${size}.png`));
}
await writeFile(resolve(output,'qiye.svg'),brand);

for(const language of ['zh-CN','en']){
  const en=language==='en';
  for(const [width,height,name] of [[440,280,'small-promo'],[1400,560,'marquee']]){
    const big=width>500;
    const scale=big?1:0.52;
    const widthBase=width/scale,heightBase=height/scale;
    const markX=big?90:58,markY=big?88:72;
    const title=en?'Qiye':'栖页 Qiye';
    const subtitle=en?'Room for your next idea.':'给注意力，留一点空间。';
    const description=en?'Tabs · Sessions · Bookmarks':'标签 · 会话 · 书签';
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${widthBase} ${heightBase}">
<defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fffaf4"/><stop offset="1" stop-color="#efd2bb"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#paper)"/>
<circle cx="${widthBase-55}" cy="${heightBase+40}" r="260" fill="#e8b894" opacity=".38"/>
<g transform="translate(${markX} ${markY}) scale(1.38)">${inner}</g>
<g font-family="PingFang SC,Microsoft YaHei,Arial,sans-serif" fill="#382b24">
<text x="${markX+107}" y="${markY+64}" font-size="${big?64:59}" font-weight="700">${title}</text>
<text x="${markX+7}" y="${markY+171}" font-size="${big?42:40}" font-weight="600">${subtitle}</text>
<text x="${markX+7}" y="${markY+232}" font-size="27" fill="#785d4b">${description}</text>
<rect x="${markX+7}" y="${markY+280}" width="${en?147:132}" height="40" rx="20" fill="#f3e1d2"/>
<text x="${markX+26}" y="${markY+308}" font-size="22" fill="#8c4f34">${en?'Local-first':'本地优先'}</text>
<rect x="${markX+(en?168:153)}" y="${markY+280}" width="84" height="40" rx="20" fill="#c77750"/>
<text x="${markX+(en?191:174)}" y="${markY+308}" font-size="22" fill="#fffaf4">${en?'Free':'免费'}</text>
</g>
${big?`<g transform="translate(865 85) rotate(4 200 195)"><rect x="-20" y="24" width="395" height="340" rx="24" fill="#b67a54" opacity=".12"/><rect width="420" height="352" rx="24" fill="#fffaf6" stroke="#dfbea5"/><rect x="26" y="26" width="368" height="39" rx="10" fill="#f4e3d6"/><circle cx="45" cy="46" r="6" fill="#c77750"/><circle cx="65" cy="46" r="6" fill="#dcb897"/><circle cx="85" cy="46" r="6" fill="#e8d3c1"/>${[99,171,243].map((y,i)=>`<rect x="26" y="${y}" width="368" height="55" rx="12" fill="${i===1?'#f2dfce':'#fbf2e9'}"/><rect x="45" y="${y+17}" width="22" height="22" rx="6" fill="#d09a75"/><rect x="83" y="${y+15}" width="${[204,149,177][i]}" height="8" rx="4" fill="#c29b7e"/><rect x="83" y="${y+32}" width="114" height="5" rx="2.5" fill="#dfc7b3"/>`).join('')}</g>`:''}
</svg>`;
    await writeFile(resolve(output,`${name}.${language}.svg`),svg);
    await sharp(Buffer.from(svg)).removeAlpha().png().toFile(resolve(output,`${name}.${language}.png`));
  }
}
console.log('Generated brand icons and bilingual promotional artwork from the existing SVG brand.');

if(!process.argv.includes('--screenshots'))process.exit(0);
const {chromium}=require('playwright');
const executablePath=process.env.QIYE_STORE_CHROME;
const origin=process.env.QIYE_STORE_PREVIEW||'http://127.0.0.1:4173';
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('Screenshots require a local preview origin.');
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const captures=[];
try{
  for(const language of ['zh-CN','en']){
    const folder=resolve(output,language);
    await mkdir(folder,{recursive:true});
    for(const [slug,route] of [
      ['01-tabs','?view=tabs'],
      ['02-sessions','?view=groups'],
      ['03-bookmarks','?view=bookmarks&folder=all'],
      ['04-preferences','?view=settings&section=display'],
      ['05-sync','?view=settings&section=sync']
    ]){
      const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1,locale:language==='en'?'en-US':'zh-CN',colorScheme:'light'});
      const state=createDemoState();
      Object.assign(state.settings,{language,theme:'light',compact:slug==='01-tabs',showHints:true,showBrowserPanel:true,autoSync:false,expandAll:slug==='02-sessions'});
      if(slug==='01-tabs')state.demoTabs=state.demoTabs.filter(tab=>[101,104,106,201,203,301,302].includes(tab.id));
      if(slug==='05-sync')Object.assign(state.settings,{syncProvider:'webdav',webdavUrl:'https://sync.example.com/qiye.json'});
      if(language==='en'){
        const groupNames=['Design resources','Read this week','Extension development','Daily workspace','Weekend ideas','Frontend references','A fresh start'];
        state.groups.forEach((group,index)=>group.name=groupNames[index]);
        state.demoNativeGroups.forEach((group,index)=>group.title=['Inspiration','Development','Read later'][index]);
        state.bookmarkFolders.forEach(folder=>folder.title=({'书签栏':'Bookmarks bar','设计收藏':'Design resources','开发文档':'Developer docs'})[folder.title]||folder.title);
        state.demoTabs.forEach(tab=>tab.title=({'Workers 和 Pages · Cloudflare':'Cloudflare — Workers and Pages','Lewis — 我的小世界':'A personal workspace','Untitled — Figma':'Figma — Design workspace','新标签页':'New tab','Vite · 构建工具':'Vite — Build tools','MDN · CSS 参考':'MDN — CSS reference','React · 学习文档':'React — Learn','W3C · Web 标准':'W3C — Web standards','CSS-Tricks · 阅读清单':'CSS-Tricks — Reading list'})[tab.title]||tab.title);
        for(const tab of [...state.groups.flatMap(group=>group.tabs),...state.bookmarks])tab.title=new URL(tab.url).hostname.replace(/^www\./,'')+' — Saved reference';
      }
      await context.addInitScript(({state})=>{localStorage.setItem('qiye-workspace-v1',JSON.stringify(state));localStorage.setItem('qiye-preferences-v2',JSON.stringify(state.settings));},{state});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/'+route,{waitUntil:'networkidle'});
      await page.locator('.shell').waitFor();
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:resolve(folder,slug+'.png'),animations:'disabled'});
      if(errors.length)throw new Error(`${language}/${slug}: ${errors.join('; ')}`);
      const bytes=await readFile(resolve(folder,slug+'.png'));
      captures.push({file:`${language}/${slug}.png`,width:1280,height:800,locale:language,route,mode:'actual application rendered with isolated sample data; not a native extension installation test',sha256:createHash('sha256').update(bytes).digest('hex')});
      await context.close();
    }
  }
}finally{await browser.close();}
const sources={};
for(const file of ['src/app.js','src/settings-view.js','styles.css','settings.css','src/data.js'])sources[file]=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex');
await writeFile(resolve(output,'screenshots.json'),JSON.stringify({browser:browser.version(),sampleData:true,credentialsUsed:false,sources,captures},null,2)+'\n');
console.log(`Captured ${captures.length} screenshots at 1280×800 in fresh isolated browser contexts.`);
