// Explicit real-service regression using synthetic history and isolated user data.
delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron}=require('@playwright/test'),{importCodex}=require('../desktop/codex.cjs'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const imported=importCodex();assert.equal(imported.config.authMode,'codex-local');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-live-compact-')),messages=[];
 const config={...imported.config,shareData:true,reasoning:'low',toolMode:'off',modelContextWindow:12000,maxOutputTokens:1024};
 for(let i=0;i<30;i++){messages.push({role:'user',content:'这是合成测试历史。目标编号 SOURCE-42；已完成待办 ID task-123，不要重复创建。来源 lecture.txt。'+i+'x'.repeat(500),timestamp:i});messages.push({role:'assistant',content:[{type:'text',text:'已记录目标 SOURCE-42 和已完成 task-123。'+i+'y'.repeat(500)}],api:config.protocol,provider:'openai-codex',model:config.model,stopReason:'stop',usage:{input:0,output:0,cacheRead:0,cacheWrite:0,totalTokens:0,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},timestamp:i})}
 fs.writeFileSync(path.join(home,'workspace.json'),JSON.stringify({config,conversations:messages.map(m=>({role:m.role,content:typeof m.content==='string'?m.content:m.content[0].text})),agentSession:{version:1,engine:'pi',messages}}));
 const app=await _electron.launch({executablePath:process.env.UCL_STUDY_EXECUTABLE,args:[],cwd:path.dirname(process.env.UCL_STUDY_EXECUTABLE),env:{...process.env,UCL_STUDY_TEST_HOME:home}});
 try{const page=await app.firstWindow();await page.waitForFunction(()=>!!window.study);const result=await page.evaluate(()=>window.study.call('chat',{message:'请说出历史里的目标编号和已经完成的待办 ID，不执行任何操作。'}));assert.equal(result.ok,true,result.error);assert.match(result.data,/SOURCE-42/);assert.match(result.data,/task-123/);const saved=JSON.parse(fs.readFileSync(path.join(home,'workspace.json'),'utf8'));assert.equal(saved.agentSession.compaction.count,1);assert.equal(saved.conversations.length,62);console.log('Real Codex summarization and continuation retained SOURCE-42 and task-123; original transcript preserved.')}finally{await app.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
