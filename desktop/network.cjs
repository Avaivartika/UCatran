// Keep authentication and requests in Electron's main process. Chromium follows
// system proxy/PAC changes; Node fetch does not use Windows Internet Settings.
function createModelFetch(session){
 return async(url,options={})=>{
  const parsed=new URL(url);
  if(!['https:','http:'].includes(parsed.protocol))throw Error('模型请求地址无效');
  let response;
  try{
   response=await session.fetch(String(url),{...options,credentials:'omit',redirect:'error'});
  }catch(error){
   if(options.signal?.aborted)throw error;
   const detail=String(error.cause?.code||error.code||error.message||'');
   let hint='网络连接失败，请检查网络、系统代理和服务地址';
   if(/NAME_NOT_RESOLVED|ENOTFOUND|EAI_AGAIN/i.test(detail))hint='DNS 解析失败，请检查服务地址和网络';
   else if(/CERT|SSL|TLS/i.test(detail))hint='TLS 证书验证失败，请检查系统时间、证书和代理';
   else if(/PROXY|TUNNEL/i.test(detail))hint='代理连接失败，请检查当前系统代理是否正在运行';
   else if(/TIMED_OUT|ETIMEDOUT|TIMEOUT/i.test(detail))hint='网络连接超时，请检查系统代理和服务可达性';
   throw Error(hint);
  }
  if(!response.ok){
   await response.body?.cancel();
   const hints={400:'模型、协议或推理强度不兼容，请检查设置；可先将推理强度设为自动',401:'认证失败，请重新登录 Codex 或更新 API Key',403:'服务拒绝访问，请检查账户权限和网络区域',404:'服务或模型不存在，请检查 API 根地址和模型名称',407:'代理需要认证，请检查系统代理',429:'请求过多或额度不足，请检查账户额度并稍后重试'};
   throw Error(`模型服务 HTTP ${response.status}：${hints[response.status]||(response.status>=500?'服务暂时不可用，请稍后重试':'请求失败，请检查服务配置')}`);
  }
  return response;
 };
}
module.exports={createModelFetch};
