// Check new and previously saved endpoints before any network request.
export function secureSyncUrl(value){
  let url;try{url=new URL(value);}catch{throw new Error('请输入有效的 HTTPS 同步文件地址');}
  if(url.protocol!=='https:')throw new Error('同步仅支持 HTTPS，请更新同步地址后重试');
  if(url.username||url.password)throw new Error('同步地址不能包含账号密码，请使用单独的凭据栏');
  return url;
}
