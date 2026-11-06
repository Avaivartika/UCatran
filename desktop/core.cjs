const path = require('node:path');
function modelEndpoint(base) {
  const u = new URL(base);
  if (u.username || u.password || u.search || u.hash) throw Error('API 地址不能包含凭证、查询参数或片段');
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) throw Error('远程 API 必须使用 HTTPS；本地服务可用 HTTP');
  return u.href.replace(/\/$/,'') + '/chat/completions';
}
function inside(root, file) { const relative=path.relative(path.resolve(root),path.resolve(file)); return relative!=='' && !relative.startsWith('..'+path.sep) && relative!=='..' && !path.isAbsolute(relative); }
function safeLink(url) {const u=new URL(url); if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('链接协议不受支持');return u.href;}
async function runAgent(options) {
  const { runPiAgent } = await import('./agent/runtime.mjs');
  return runPiAgent(options);
}
module.exports={modelEndpoint,inside,safeLink,runAgent};
