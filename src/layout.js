import {api} from './platform.js';
export const LAYOUT_KEY='qiye-layout-v1';
export const PANE_LIMITS={sidebarWidth:[180,380],browserWidth:[270,600],sidebarHeight:[300,2000],collectionHeight:[240,2000],stashHeight:[160,900],tabsHeight:[280,1600]};
const panes={sidebarWidth:['.sidebar','width',1],browserWidth:['.browser-pane','width',-1],sidebarHeight:['.sidebar','height',1],collectionHeight:['.collection-pane','height',1],stashHeight:['.stash-panel','height',1],tabsHeight:['.live-panel','height',1]};
const variables={sidebarWidth:'--sidebar-width',browserWidth:'--browser-width',sidebarHeight:'--sidebar-height',collectionHeight:'--collection-height',stashHeight:'--stash-height',tabsHeight:'--tabs-height'};
export function normalizeLayout(value){return Object.fromEntries(Object.entries(PANE_LIMITS).flatMap(([key,[min,max]])=>typeof value?.[key]==='number'&&Number.isFinite(value[key])?[[key,Math.round(Math.max(min,Math.min(max,value[key])))]]:[]));}
export function clampPaneSize(value,min,max){max=Math.max(0,max);return Math.round(Math.max(Math.min(min,max),Math.min(max,value)));}
export function resizeHandle(key,label){return `<div class="pane-resizer ${key.endsWith('Width')?'pane-resizer-width':'pane-resizer-height'}" role="separator" tabindex="0" aria-label="${label}" aria-orientation="${key.endsWith('Width')?'vertical':'horizontal'}" data-resize="${key}" title="${label} · 拖动调整，双击恢复默认"><span aria-hidden="true"></span></div>`;}
export async function readLayout(){try{const value=api?(await api.storage.local.get(LAYOUT_KEY))[LAYOUT_KEY]:JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null');return value?.version===1?normalizeLayout(value.sizes):{};}catch{return {};}}
async function writeLayout(sizes){const value={version:1,sizes:normalizeLayout(sizes)};if(api)await api.storage.local.set({[LAYOUT_KEY]:value});else localStorage.setItem(LAYOUT_KEY,JSON.stringify(value));}
export async function attachWorkspaceLayout(root,onError=()=>{}){
  let sizes=await readLayout(),drag=null,saving=Promise.resolve();
  const scrolls=new Map();
  const save=()=>{const snapshot={...sizes};saving=saving.catch(()=>{}).then(()=>writeLayout(snapshot)).catch(onError);return saving;};
  function bounds(key){
    const [min,maximum]=PANE_LIMITS[key];let max=maximum;
    const content=root.querySelector('.content'),sidebar=root.querySelector('.sidebar'),browser=root.querySelector('.browser-panel');
    const style=content&&getComputedStyle(content),spacing=style?(parseFloat(style.paddingLeft)||0)+(parseFloat(style.paddingRight)||0)+(parseFloat(style.columnGap)||0):48;
    if(key==='sidebarWidth')max=Math.min(max,innerWidth-(browser?280+270+spacing:400+spacing));
    if(key==='browserWidth')max=Math.min(max,(content?.clientWidth||innerWidth)-280-spacing);
    if(key==='sidebarHeight')max=Math.min(max,innerHeight);
    if(key==='collectionHeight')max=Math.min(max,content?.clientHeight||innerHeight-100);
    if(browser&&innerWidth>860&&(key==='stashHeight'||key==='tabsHeight')){
      const visible=[...browser.children].filter(el=>getComputedStyle(el).display!=='none');
      const gap=parseFloat(getComputedStyle(browser).gap)||0;
      const target=key==='stashHeight'?'.stash-panel':'.live-panel';
      const others=visible.filter(el=>!el.matches(target)).reduce((height,el)=>height+(key==='stashHeight'&&el.matches('.live-panel')?280:el.getBoundingClientRect().height),0);
      max=Math.min(max,browser.clientHeight-others-Math.max(0,visible.length-1)*gap);
    }
    if(innerWidth<=860&&key==='tabsHeight')max=Math.min(max,Math.max(300,innerHeight-180));
    return [Math.min(min,Math.max(0,max)),Math.max(0,max)];
  }
  function apply(){
    for(const key of Object.keys(panes)){
      const [min,max]=bounds(key),value=sizes[key];
      if(value===undefined)root.style.removeProperty(variables[key]);
      else root.style.setProperty(variables[key],clampPaneSize(value,min,max)+'px');
    }
    root.classList.toggle('custom-tabs-height',sizes.tabsHeight!==undefined);
    for(const handle of root.querySelectorAll('[data-resize]')){
      const key=handle.dataset.resize,[selector,axis]=panes[key],[min,max]=bounds(key);
      handle.setAttribute('aria-valuemin',String(Math.round(min)));handle.setAttribute('aria-valuemax',String(Math.round(max)));
      handle.setAttribute('aria-valuenow',String(Math.round(root.querySelector(selector)?.getBoundingClientRect()[axis]||min)));
    }
  }
  async function reset(key){if(key)delete sizes[key];else sizes={};apply();await save();}
  function finish(){if(!drag)return;const id=drag.pointerId;drag=null;root.classList.remove('resizing-width','resizing-height');if(root.hasPointerCapture(id))root.releasePointerCapture(id);save();}
  root.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('[data-resize]');if(!handle||event.button!==0)return;
    const key=handle.dataset.resize,[selector,axis,sign]=panes[key];
    const start=root.querySelector(selector)?.getBoundingClientRect()[axis];if(!start)return;
    event.preventDefault();drag={key,axis,sign,start,coordinate:axis==='width'?event.clientX:event.clientY,pointerId:event.pointerId};
    root.classList.add(axis==='width'?'resizing-width':'resizing-height');
  });
  root.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    const [min,max]=bounds(drag.key),coordinate=drag.axis==='width'?event.clientX:event.clientY;
    if(!root.hasPointerCapture(event.pointerId)){if(Math.abs(coordinate-drag.coordinate)<2)return;root.setPointerCapture(event.pointerId);}
    sizes[drag.key]=clampPaneSize(drag.start+(coordinate-drag.coordinate)*drag.sign,min,max);apply();
  });
  root.addEventListener('pointerup',finish);root.addEventListener('pointercancel',finish);root.addEventListener('lostpointercapture',finish);
  root.addEventListener('dblclick',event=>{const handle=event.target.closest('[data-resize]');if(handle){event.preventDefault();reset(handle.dataset.resize).catch(onError);}});
  root.addEventListener('keydown',event=>{
    const handle=event.target.closest('[data-resize]');if(!handle)return;
    const key=handle.dataset.resize,[selector,axis,sign]=panes[key];
    if(event.key==='Home'){event.preventDefault();reset(key).catch(onError);return;}
    if(!(axis==='width'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown']).includes(event.key))return;
    event.preventDefault();const [min,max]=bounds(key),step=(event.shiftKey?40:10)*(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)*sign;
    sizes[key]=clampPaneSize(root.querySelector(selector).getBoundingClientRect()[axis]+step,min,max);apply();save();
  });
  window.addEventListener('resize',apply);window.addEventListener('blur',finish);
  return {
    reset,
    beforeRender(){for(const el of root.querySelectorAll('[data-scroll-key]'))scrolls.set(el.dataset.scrollKey,{top:el.scrollTop,left:el.scrollLeft});},
    afterRender(){apply();for(const el of root.querySelectorAll('[data-scroll-key]')){const saved=scrolls.get(el.dataset.scrollKey);if(saved){el.scrollTop=saved.top;el.scrollLeft=saved.left;}}}
  };
}
