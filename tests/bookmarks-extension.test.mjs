import test from 'node:test';
import assert from 'node:assert/strict';
let tree,sequence,calls;
function reset(){sequence=10;calls=[];tree=[{id:'0',title:'Root',children:[{id:'1',parentId:'0',title:'Bar',folderType:'bookmarks-bar',children:[{id:'2',parentId:'1',title:'Design',children:[{id:'3',parentId:'2',title:'Existing',url:'https://example.com/'}]}]},{id:'4',parentId:'0',title:'Other',folderType:'other',children:[]}]}];}
function find(id,nodes=tree){for(const node of nodes){if(node.id===id)return node;const child=find(id,node.children||[]);if(child)return child;}}
function remove(id){const node=find(id),parent=find(node.parentId);parent.children=parent.children.filter(n=>n.id!==id);}
reset();
globalThis.chrome={runtime:{id:'test-extension'},tabs:{},bookmarks:{
 getTree:async()=>structuredClone(tree),create:async options=>{calls.push(['create',options]);const parent=find(options.parentId);if(!parent||parent.url)throw new Error('invalid parent');const node={...options,id:String(++sequence),index:parent.children.length,...(!options.url?{children:[]}:{})};parent.children.push(node);return structuredClone(node);},update:async(id,changes)=>Object.assign(find(id),changes),move:async(id,{parentId})=>{const node=find(id);remove(id);node.parentId=parentId;find(parentId).children.push(node);return structuredClone(node);},remove:async id=>remove(id),removeTree:async id=>{calls.push(['removeTree',id]);remove(id);}
}};
const {BrowserAdapter}=await import('../src/browser.js');const browser=new BrowserAdapter({});
test('native session saving writes into a named browser subfolder and reuses it on retry',async()=>{
 reset();const tabs=[{title:'Page',url:'https://a.test/'},{title:'Second',url:'https://b.test/'}];const result=await browser.copyToBookmarks(tabs,'2',{name:'Session'});assert.equal(result.count,2);assert.equal(find(result.parentId).parentId,'2');assert.equal(find(result.parentId).children.length,2);const again=await browser.copyToBookmarks(tabs,'2',{name:'Session'});assert.equal(again.count,0);assert.equal(again.parentId,result.parentId);
});
test('native folder operations use bookmark APIs and restore all children',async()=>{
 reset();const folder=await browser.createBookmarkFolder('New','2');await browser.saveBookmark({title:'Page',url:'https://new.test/'},folder.id);await browser.renameBookmarkFolder(folder.id,'Renamed');await browser.moveBookmarkFolder(folder.id,'4');const snapshot=await browser.snapshotBookmarkFolder(folder.id);await browser.deleteBookmarkFolder(folder.id,snapshot);assert.equal(find(folder.id),undefined);const restored=await browser.restoreBookmarkFolder(snapshot);assert.equal(find(restored.id).parentId,'4');assert.equal(find(restored.id).children[0].title,'Page');assert.ok(calls.some(c=>c[0]==='removeTree'));
});
test('native system roots cannot be removed or moved, and cyclic destinations never reach API',async()=>{
 reset();const child=await browser.createBookmarkFolder('Child','2');await assert.rejects(()=>browser.deleteBookmarkFolder('1'),/内置/);await assert.rejects(()=>browser.moveBookmarkFolder('2',child.id),/自身/);assert.ok(find('1'));assert.equal(calls.filter(c=>c[0]==='removeTree').length,0);
});
test('deletion stops if a folder changes after the recovery copy was saved',async()=>{
 reset();const snapshot=await browser.snapshotBookmarkFolder('2');await browser.saveBookmark({title:'New arrival',url:'https://new.test/'},'2');await assert.rejects(()=>browser.deleteBookmarkFolder('2',snapshot),/刚刚发生变化/);assert.equal(find('2').children.length,2);assert.equal(calls.filter(c=>c[0]==='removeTree').length,0);
});
