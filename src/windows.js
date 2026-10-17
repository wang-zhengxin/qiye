export function windowSections(tabs,groups=[],windows=[],currentWindowId){
  const ids=new Set(tabs.map(tab=>tab.windowId));
  const sections=[...ids].map(id=>{
    const meta=windows.find(window=>window.id===id)||{},items=tabs.filter(tab=>tab.windowId===id).sort((a,b)=>a.index-b.index),seen=new Set(),entries=[];
    for(const tab of items){const group=groups.find(group=>group.id===tab.groupId&&group.windowId===id);if(!group){entries.push({type:'tab',tab});continue;}if(!seen.has(group.id)){seen.add(group.id);entries.push({type:'group',group,tabs:items.filter(item=>item.groupId===group.id)});}}
    return {id,current:id===currentWindowId,focused:Boolean(meta.focused),incognito:Boolean(meta.incognito),tabs:items,entries};
  });
  sections.sort((a,b)=>Number(b.current)-Number(a.current)||a.id-b.id);
  return sections.map((section,index)=>({...section,number:index+1}));
}
