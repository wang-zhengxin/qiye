// Native folder IDs stay local to the browser; saved sessions never own folders.
export function flattenBookmarkTree(nodes) {
  const bookmarks=[],folders=[],rootIds=new Set(['0','root________']);
  function visit(list,parentId,readOnly=false){for(const node of list){
    const parent=node.parentId??parentId,locked=readOnly||Boolean(node.unmodifiable)||node.folderType==='managed';
    const item={id:String(node.id),title:node.title||node.url||'未命名文件夹',parentId:parent,index:node.index??0,readOnly:locked};
    if(node.type==='separator')continue;
    if(node.url)bookmarks.push({...item,url:node.url});
    else{if(!rootIds.has(String(node.id)))folders.push({...item,protected:rootIds.has(String(parent))||Boolean(node.folderType)});visit(node.children||[],String(node.id),locked);}
  }}
  visit(nodes);return {bookmarks,folders};
}
export function folderPath(folders,id){const names=[],seen=new Set();let current=folders.find(f=>f.id===id);while(current&&!seen.has(current.id)){seen.add(current.id);names.unshift(current.title);current=folders.find(f=>f.id===current.parentId);}return names.join(' / ');}
export function folderIds(folders,id){const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const f of folders)if(ids.has(f.parentId)&&!ids.has(f.id)){ids.add(f.id);changed=true;}}return ids;}
export function folderSnapshot(bookmarks,folders,id){
  const root=folders.find(f=>f.id===id);if(!root)throw new Error('书签文件夹已不存在');
  const build=(folder,seen)=>{if(seen.has(folder.id))throw new Error('书签文件夹结构不正确');const next=new Set([...seen,folder.id]);return {title:folder.title,children:[...folders.filter(f=>f.parentId===folder.id),...bookmarks.filter(b=>b.parentId===folder.id)].sort((a,b)=>(a.index??0)-(b.index??0)).map(node=>node.url?{title:node.title,url:node.url}:build(node,next))};};
  return {...build(root,new Set()),parentId:root.parentId};
}
export function validateFolderMove(folders,id,parentId){
  const folder=folders.find(f=>f.id===id),parent=folders.find(f=>f.id===parentId);
  if(!folder)throw new Error('书签文件夹已不存在');
  if(folder.protected||folder.readOnly)throw new Error('浏览器内置或托管文件夹不能移动');
  if(!parent||parent.readOnly)throw new Error('请选择可写入的书签文件夹');
  if(folderIds(folders,id).has(parentId))throw new Error('不能将文件夹移入自身或其子文件夹');
}
// Keep a recoverable copy of retired categories, including their assignments.
export function retireCategories(state){
  const categories=state.categories||[],groups=state.groups||[];
  if(categories.some(c=>c.id!=='inbox')||groups.some(g=>g.categoryId&&g.categoryId!=='inbox')){
    const signature=JSON.stringify([categories,groups.map(g=>[g.id,g.categoryId])]);
    if(!state.snapshots?.some(s=>s.categoryMigration===signature)){
      state.snapshots||=[];state.snapshots.unshift({id:crypto.randomUUID(),name:'分类整合前的收藏',createdAt:new Date().toISOString(),categoryMigration:signature,categories:structuredClone(categories),groups:structuredClone(groups),stash:structuredClone(state.stash||[]),openTabs:[]});
    }
  }
  state.categories=[{id:'inbox',name:'已保存标签'}];
  groups.forEach(g=>g.categoryId='inbox');
  if(state.settings)delete state.settings.defaultCategory;
  return state;
}
