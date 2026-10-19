import {readFile,writeFile,readdir,mkdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const root=resolve(import.meta.dirname,'..');
const modules=process.env.QIYE_STORE_NODE_MODULES;
const require=createRequire(modules?resolve(modules,'../package.json'):import.meta.url);
const JSZip=require('jszip');
const {version}=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
const source=new JSZip(),kit=new JSZip();
const options={date:new Date('1980-01-01T00:00:00Z')};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const inventory=[];
async function add(zip,path,prefix='',inventoryTarget){
  const entry=await stat(path);
  if(entry.isDirectory())for(const name of (await readdir(path)).sort())await add(zip,resolve(path,name),prefix?prefix+'/'+name:name,inventoryTarget);
  else{
    const bytes=await readFile(path);
    zip.file(prefix,bytes,options);
    if(inventoryTarget)inventoryTarget.push({name:prefix,size:bytes.length,sha256:hash(bytes)});
  }
}
for(const name of ['src','assets','scripts','tests','background.js','manifest.json','package.json','index.html','popup.html','newtab.html','styles.css','settings.css','auxiliary.css','README.md','README.en.md','INSTALL.md','BROWSERS.md','CONFIGURATION.md'])await add(source,resolve(root,name),name);
for(const name of ['LICENSE','LICENSE.md','NOTICE','NOTICE.md'])try{await add(source,resolve(root,name),name);}catch(error){if(error.code!=='ENOENT')throw error;}
await add(source,resolve(root,'docs/store/profile.json'),'docs/store/profile.json');
source.file('BUILD-FOR-REVIEW.md',`# Qiye ${version}: source reproduction\n\nThis archive includes the extension's source files, original SVG assets, build scripts, tests, and input documents. It excludes credentials, browser profiles, generated distributions and Git history.\n\nUse Node.js 24 (minimum 20.11). No dependency installation is needed to build or test the extension.\n\n1. Run \`node --test tests/*.test.mjs\`.\n2. Run \`node scripts/package.mjs --target=firefox\` for Firefox.\n3. Inspect \`dist-firefox/\` or \`artifacts/qiye-workspace-firefox-v${version}.zip\`.\n4. For Chromium, use \`node scripts/package.mjs --target=chromium\`.\n\nThe build copies source files and emits a browser-specific manifest without minification, obfuscation, transpilation, or downloading executable code. Store artwork helper scripts use optional tooling and are not part of the extension build.\n\nThe submitted ZIP must be compared against the output for this exact source and version. License and asset authorization status are recorded in docs/store/profile.json; do not assume a license has been granted when the field is null.\n`,options);
await mkdir(resolve(root,'artifacts'),{recursive:true});
const sourceBytes=await source.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
const sourceName=`qiye-review-source-v${version}.zip`;
await writeFile(resolve(root,'artifacts',sourceName),sourceBytes);
await add(kit,resolve(root,'docs/store'),'');
kit.file('LICENSE',await readFile(resolve(root,'LICENSE')),options);
kit.file('source/'+sourceName,sourceBytes,options);
inventory.push({name:'source/'+sourceName,size:sourceBytes.length,sha256:hash(sourceBytes)});
for(const target of ['chromium','firefox']){
  const name=`qiye-workspace-${target}-v${version}.zip`;
  const bytes=await readFile(resolve(root,'artifacts',name));
  const path='packages/'+name;
  kit.file(path,bytes,options);
  inventory.push({name:path,size:bytes.length,sha256:hash(bytes)});
}
for(const [name,file] of Object.entries(kit.files))if(!file.dir&&!inventory.some(item=>item.name===name)){
  const bytes=await file.async('nodebuffer');inventory.push({name,size:bytes.length,sha256:hash(bytes)});
}
inventory.sort((a,b)=>a.name.localeCompare(b.name));
kit.file('SHA256SUMS',inventory.map(file=>`${file.sha256}  ${file.name}`).join('\n')+'\n',options);
const bytes=await kit.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
const name=`qiye-store-materials-v${version}.zip`;
await writeFile(resolve(root,'artifacts',name),bytes);
await writeFile(resolve(root,'artifacts',name+'.sha256'),`${hash(bytes)}  ${name}\n`);
console.log(`Generated ${name} (${bytes.length} bytes), ${sourceName}, and SHA-256 manifests.`);
