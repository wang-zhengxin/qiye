import {DEFAULT_SETTINGS} from './settings.js';
export const uid = () => globalThis.crypto.randomUUID();
const item = (id, title, url) => ({id, title, url});
export function createDemoState() {
  const state = {
    version: 1,
    categories: [{id:'inbox',name:'中转站'}, {id:'work',name:'工作空间'}, {id:'inspiration',name:'灵感收藏'}],
    groups: [
      {id:'g1',name:'设计灵感与好用的工具',categoryId:'inbox',starred:true,locked:false,createdAt:'2026-10-16T10:20:00+08:00',tabs:[
        item('s1','Figma — 好想法，从这里开始','https://www.figma.com/'),
        item('s2','Dribbble · Discover the world’s top designers','https://dribbble.com/'),
        item('s3','Mobbin — UI & UX design inspiration','https://mobbin.com/')
      ]},
      {id:'g2',name:'这周，想认真读一读',categoryId:'inbox',starred:false,locked:false,createdAt:'2026-10-16T09:32:00+08:00',tabs:[item('s4','少即是多：数字生活的整理方法','https://www.notion.so/'),item('s5','让注意力回到重要的事情上','https://read.cv/')]},
      {id:'g3',name:'浏览器扩展 · 开发参考',categoryId:'work',starred:true,locked:false,createdAt:'2026-10-15T17:48:00+08:00',tabs:[item('s6','Chrome Extensions · API 参考','https://developer.chrome.com/docs/extensions/reference/api/'),item('s7','Chrome Extensions · 开发文档','https://developer.chrome.com/docs/extensions/')]},
      {id:'g4',name:'工作日常',categoryId:'work',starred:false,locked:true,createdAt:'2026-10-15T14:06:00+08:00',tabs:[item('s8','Linear — Plan and build products','https://linear.app/'),item('s9','Notion — 我的工作空间','https://www.notion.so/'),item('s10','GitHub · Where software is built','https://github.com/')]},
      {id:'g5',name:'留给周末的小计划',categoryId:'inspiration',starred:false,locked:false,createdAt:'2026-10-14T20:15:00+08:00',tabs:[item('s11','小红书 · 你的生活指南','https://www.xiaohongshu.com/'),item('s12','豆瓣 · 发现好电影','https://movie.douban.com/')]},
      {id:'g6',name:'前端开发 · 文档与参考',categoryId:'inbox',starred:false,locked:false,createdAt:'2026-10-14T11:30:00+08:00',tabs:[item('s13','MDN Web Docs','https://developer.mozilla.org/'),item('s14','CSS-Tricks — Tips, Tricks, and Techniques','https://css-tricks.com/')]},
      {id:'g7',name:'一个新的开始',categoryId:'inbox',starred:false,locked:false,createdAt:'2026-10-13T08:40:00+08:00',tabs:[]}
    ],
    stash: [], trash: [], snapshots: [], recent: [],
    bookmarks:[
      {...item('b1','Figma · 设计工作台','https://www.figma.com/'),parentId:'bf1'},
      {...item('b2','GitHub · 我的项目','https://github.com/'),parentId:'bf2'},
      {...item('b3','Dribbble · 每日灵感','https://dribbble.com/'),parentId:'bf1'},
      {...item('b4','MDN Web Docs','https://developer.mozilla.org/'),parentId:'bf2'}
    ],
    bookmarkFolders:[{id:'bf-root',title:'书签栏',parentId:'0',protected:true,index:0},{id:'bf1',title:'设计收藏',parentId:'bf-root',index:0},{id:'bf2',title:'开发文档',parentId:'bf-root',index:1}],
    settings:structuredClone(DEFAULT_SETTINGS),
    demoTabs:[
      {id:101,title:'Workers 和 Pages · Cloudflare',url:'https://dash.cloudflare.com/',windowId:1,groupId:-1,active:false,discarded:false,index:0},
      {id:102,title:'宇宙群',url:'https://www.yuque.com/',windowId:1,groupId:-1,active:false,discarded:false,index:1},
      {id:103,title:'Lewis — 我的小世界',url:'https://lewis.cool/',windowId:1,groupId:1,active:false,discarded:false,index:2},
      {id:104,title:'Untitled — Figma',url:'https://www.figma.com/design/bWy9soamVKc057Z6MDjUz2/',windowId:1,groupId:1,active:false,discarded:false,index:3},
      {id:105,title:'Chrome Extensions · API 参考',url:'https://developer.chrome.com/docs/extensions/reference/api/',windowId:1,groupId:-1,active:false,discarded:true,index:4},
      {id:106,title:'新标签页',url:'chrome://newtab/',windowId:1,groupId:-1,active:true,discarded:false,index:5}
    ],
    demoNativeGroups:[{id:1,title:'灵感探索',color:'orange',windowId:1}]
  };
  upgradeDemoWindows(state);return state;
}
export function createEmptyState() {
  const state = createDemoState();
  return {...state,categories:[{id:'inbox',name:'中转站'}],groups:[],bookmarks:[],bookmarkFolders:[],demoTabs:[],demoNativeGroups:[],demoWindows:[]};
}

export function upgradeDemoWindows(state){
  if(state.demoWindowsVersion===1)return;
  const extras=[
    {id:201,title:'Vite · 构建工具',url:'https://vite.dev/guide/',windowId:2,groupId:2,active:false,discarded:false,index:0},
    {id:202,title:'MDN · CSS 参考',url:'https://developer.mozilla.org/zh-CN/docs/Web/CSS',windowId:2,groupId:2,active:false,discarded:false,index:1},
    {id:203,title:'React · 学习文档',url:'https://react.dev/learn',windowId:2,groupId:-1,active:true,discarded:false,index:2},
    {id:301,title:'W3C · Web 标准',url:'https://www.w3.org/standards/',windowId:3,groupId:3,active:true,discarded:false,index:0},
    {id:302,title:'CSS-Tricks · 阅读清单',url:'https://css-tricks.com/',windowId:3,groupId:3,active:false,discarded:true,index:1}
  ];
  for(const id of [2,3])if(!state.demoTabs.some(t=>t.windowId===id)){state.demoTabs.push(...extras.filter(t=>t.windowId===id&&!state.demoTabs.some(existing=>existing.id===t.id)));if(!state.demoNativeGroups.some(g=>g.id===id))state.demoNativeGroups.push({id,title:id===2?'开发工作':'稍后阅读',color:id===2?'blue':'green',windowId:id});}
  state.demoWindows=[...new Set(state.demoTabs.map(t=>t.windowId))].map(id=>({id,focused:id===1,incognito:false}));state.demoWindowsVersion=1;
}
