export function mockWebExtension({limited=false}={}){
  const calls=[],data={},session={},event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
  const live=[{id:1,url:'https://example.com',title:'Example',windowId:8,groupId:7,index:0,active:false},{id:2,url:'moz-extension://qiye-test/index.html',windowId:8,groupId:-1,index:1},{id:3,url:'https://other.test',title:'Other',windowId:9,groupId:-1,index:0,active:true}];
  const area=values=>({get:async keys=>keys===null?structuredClone(values):Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(values[k])])),set:async updates=>Object.assign(values,structuredClone(updates)),remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete values[key];}});
  const api={runtime:{id:'qiye-test',getURL:path=>'moz-extension://qiye-test/'+path,onInstalled:event(),onStartup:event(),onMessage:event()},
    storage:{local:area(data),session:area(session),onChanged:event()},
    tabs:{query:async options=>live.filter(t=>(options.windowId===undefined||t.windowId===options.windowId)&&(options.active===undefined||t.active===options.active)),get:async id=>live.find(t=>t.id===id),create:async options=>{calls.push(['create',options]);return {id:100,windowId:8,...options};},update:async(id,options)=>{calls.push(['update',id,options]);return {...live.find(t=>t.id===id),...options};},move:async(id,options)=>calls.push(['move',id,options]),reload:async id=>calls.push(['reload',id]),remove:async id=>calls.push(['remove',id]),onCreated:event(),onRemoved:event(),onUpdated:event(),onMoved:event(),onAttached:event(),onDetached:event(),onActivated:event()},
    windows:{getCurrent:async()=>({id:8}),getAll:async()=>[{id:8},{id:9}],update:async(id,options)=>calls.push(['focus',id,options]),onCreated:event(),onFocusChanged:event(),onRemoved:event()},
    contextMenus:{create:async options=>{calls.push(['menu',options]);return options.id;},removeAll:async()=>{},onClicked:event()},
    action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{},setPopup:async()=>{},onClicked:event()},
    alarms:{get:async()=>undefined,getAll:async()=>[],clear:async()=>{},create:async()=>{},onAlarm:event()},commands:{onCommand:event()}
  };
  if(!limited){
    Object.assign(api.tabs,{group:async options=>{calls.push(['group',options]);return 7;},ungroup:async ids=>calls.push(['ungroup',ids]),discard:async id=>calls.push(['discard',id])});
    api.tabGroups={query:async()=>[{id:7,title:'Firefox group',color:'orange',windowId:8}],get:async()=>({id:7,windowId:8}),update:async(id,options)=>calls.push(['groupUpdate',id,options])};
    api.bookmarks={getTree:async()=>[{id:'root________',children:[{id:'toolbar_____',parentId:'root________',title:'Bookmarks toolbar',children:[{id:'separator___',type:'separator',parentId:'toolbar_____'},{id:'bookmark____',title:'Example',url:'https://example.com',parentId:'toolbar_____'}]}]}]};
  }
  return {api,calls,data,session,live};
}
