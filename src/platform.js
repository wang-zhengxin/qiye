// Firefox/Safari expose Promise APIs on `browser`; Chromium uses `chrome`.
export function resolveExtensionApi(environment=globalThis){
  return [environment.browser,environment.chrome].find(api=>api?.runtime?.id&&api?.tabs)||null;
}
export const api=resolveExtensionApi();
export function detectCapabilities(api){
  return {
    nativeGroups:typeof api?.tabGroups?.query==='function'&&typeof api?.tabs?.group==='function'&&typeof api?.tabs?.ungroup==='function',
    bookmarks:typeof api?.bookmarks?.getTree==='function',
    sleep:typeof api?.tabs?.discard==='function'
  };
}
export const DEMO_CAPABILITIES=Object.freeze({nativeGroups:true,bookmarks:true,sleep:true});
function declaredDataTypes(webext){return webext?.runtime?.getManifest?.().browser_specific_settings?.gecko?.data_collection_permissions?.optional||[];}
export function syncPermissionRequest(origins,webext=api,settings={syncPreferences:true}){
  const request={origins},declared=declaredDataTypes(webext);
  const types=['browsingActivity','authenticationInfo','bookmarksInfo',...(settings.syncPreferences?['technicalAndInteraction']:[])].filter(type=>declared.includes(type));
  if(types.length)request.data_collection=types;
  return request;
}
export async function requireSyncConsent(webext=api,settings={syncPreferences:true}){
  const request=syncPermissionRequest([],webext,settings);
  if(request.data_collection&&!await webext.permissions.contains({data_collection:request.data_collection}))throw new Error('请先在设置中保存同步配置并授权数据传输；本地收藏保持不变');
}
// Called directly from the search submit gesture, independently of sync permissions.
export function requestSearchConsent(webext=api){
  return declaredDataTypes(webext).includes('searchTerms')?webext.permissions.request({data_collection:['searchTerms']}):Promise.resolve(true);
}
export function isNewTabUrl(url){
  return ['chrome://newtab/','chrome://new-tab-page/','edge://newtab/','brave://newtab/','opera://startpage/','vivaldi://newtab/','about:newtab','about:home','favorites://'].includes(url);
}
