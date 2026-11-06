const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {parse}=require('smol-toml');
const {modelEndpoint}=require('./core.cjs');
const CODEX_URL='https://chatgpt.com/backend-api/codex';
function codexHome(){return process.env.CODEX_HOME||path.join(os.homedir(),'.codex')}
function readAuth(dir){try{return JSON.parse(fs.readFileSync(path.join(dir,'auth.json'),'utf8'))}catch{return {}}}
function accessToken(dir=codexHome()){
 const token=readAuth(dir).tokens?.access_token;
 if(typeof token!=='string')throw Error('未找到 Codex 文件登录信息。请先在 Codex 登录；系统钥匙串存储暂不支持直接导入。');
 let claims;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString())}catch{throw Error('Codex 登录信息无效，请在 Codex 重新登录')}
 if(!claims['https://api.openai.com/auth']?.chatgpt_account_id)throw Error('Codex 登录缺少账户信息，请重新登录');
 if(!claims.exp||claims.exp*1000<=Date.now()+30000)throw Error('Codex 登录已过期，请先在 Codex 完成登录刷新，再重试');
 return token;
}
function importCodex(dir=codexHome(),env=process.env){
 let c;try{c=parse(fs.readFileSync(path.join(dir,'config.toml'),'utf8'))}catch(e){throw Error(e.code==='ENOENT'?'未找到本机 Codex 配置，请先安装并配置 Codex':'Codex 配置无法解析，请检查 config.toml')}
 const profile=c.profile?c.profiles?.[c.profile]:{};if(c.profile&&!profile)throw Error('Codex 当前配置档不存在');c={...c,...profile};
 const model=c.model;if(typeof model!=='string'||!model.trim()||model.length>200)throw Error('请先在 Codex 配置中选择模型');
 const provider=c.model_provider||'openai',p=c.model_providers?.[provider]||{},auth=readAuth(dir);
 if(provider==='openai'&&(auth.auth_mode==='chatgpt'||(!auth.OPENAI_API_KEY&&auth.tokens))){
  accessToken(dir);return {config:{model,baseUrl:CODEX_URL,protocol:'openai-codex-responses',authMode:'codex-local'},apiKey:''};
 }
 if(provider!=='openai'&&!p.base_url)throw Error('Codex 自定义服务缺少 API 地址');
 if(p.http_headers||p.env_http_headers||p.auth||p.gateway_oauth)throw Error('此 Codex 配置使用额外认证或请求头，请改用手动配置');
 const baseUrl=p.base_url||c.openai_base_url||'https://api.openai.com/v1';modelEndpoint(baseUrl);
 const apiKey=p.experimental_bearer_token||(p.env_key?env[p.env_key]:undefined)||((provider==='openai'||p.requires_openai_auth)?auth.OPENAI_API_KEY||env.OPENAI_API_KEY:undefined);
 if(!apiKey)throw Error('未找到 Codex API Key；如使用环境变量，请让应用继承该变量或手动填写');
 const wire=p.wire_api||'responses';if(!['responses','chat'].includes(wire))throw Error('此 Codex 请求协议暂不支持');
 return {config:{model,baseUrl,protocol:wire==='responses'?'openai-responses':'openai-completions',authMode:'api-key'},apiKey};
}
module.exports={importCodex,accessToken,CODEX_URL};
