const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const efforts=['auto','none','minimal','low','medium','high','xhigh','max','ultra'];
function agentOptions(input={}){
 const reasoning=input.reasoning??'auto',toolMode=input.toolMode??'auto';
 if(!efforts.includes(reasoning))throw Error('不支持的推理强度');
 if(!['auto','read-only','off'].includes(toolMode))throw Error('不支持的工具模式');
 const number=(key,fallback,min,max)=>{const n=input[key]??fallback;if(!Number.isInteger(n)||n<min||n>max)throw Error(`${key} 必须为 ${min}–${max} 的整数`);return n};
 return {reasoning,toolMode,maxTurns:number('maxTurns',8,1,32),timeoutSeconds:number('timeoutSeconds',240,30,900),maxOutputTokens:number('maxOutputTokens',4096,256,65536)};
}
function codexModels(dir=process.env.CODEX_HOME||path.join(os.homedir(),'.codex')){
 try{
  const data=JSON.parse(fs.readFileSync(path.join(dir,'models_cache.json'),'utf8'));
  return (data.models||[]).filter(m=>m.visibility!=='hide'&&typeof m.slug==='string').slice(0,300).map(m=>({id:m.slug,name:String(m.display_name||m.slug),reasoningLevels:(m.supported_reasoning_levels||[]).map(x=>x.effort).filter(x=>efforts.includes(x)&&x!=='auto'),contextWindow:Number(m.context_window)||32768}));
 }catch{return []}
}
module.exports={agentOptions,codexModels,efforts};
