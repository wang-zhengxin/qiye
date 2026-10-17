import {readFile,readdir,mkdir,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {buildTargets,requestedTargets} from './build.mjs';

const root=resolve(import.meta.dirname,'..');
const builds=await buildTargets(requestedTargets());
const table=Array.from({length:256},(_,index)=>{let value=index;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);return value>>>0;});
function crc32(bytes){let value=0xffffffff;for(const byte of bytes)value=(value>>>8)^table[(value^byte)&255];return (value^0xffffffff)>>>0;}
async function collect(folder,prefix=''){
  const files=[];
  for(const entry of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const name=prefix+entry.name,path=resolve(folder,entry.name);
    if(entry.isDirectory())files.push(...await collect(path,name+'/'));
    else if(entry.isFile())files.push({name,bytes:await readFile(path)});
  }
  return files;
}
for(const {target,directory,manifest} of builds){
const files=await collect(directory);
for(const name of ['INSTALL.md','BROWSERS.md'])files.push({name,bytes:await readFile(resolve(root,name))});
if(!files.some(file=>file.name==='manifest.json'))throw new Error('安装包根目录缺少 manifest.json');
const local=[],central=[];let offset=0,centralSize=0;
for(const file of files){
  const name=Buffer.from(file.name,'utf8'),data=deflateRawSync(file.bytes),crc=crc32(file.bytes);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(file.bytes.length,22);header.writeUInt16LE(name.length,26);
  const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50,0);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(8,10);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(file.bytes.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);
  local.push(header,name,data);central.push(entry,name);offset+=header.length+name.length+data.length;centralSize+=entry.length+name.length;
}
const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centralSize,12);end.writeUInt32LE(offset,16);
await mkdir(resolve(root,'artifacts'),{recursive:true});
const archive=resolve(root,'artifacts',`qiye-workspace-${target==='safari'?'safari-source':target}-v${manifest.version}.zip`);
await writeFile(archive+'.tmp',Buffer.concat([...local,...central,end]));await rename(archive+'.tmp',archive);
console.log(`已生成安装包：${archive}（manifest.json 位于根目录）。`);

}
