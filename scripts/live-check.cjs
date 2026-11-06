// Opt-in real model check; uses an isolated workspace and synthetic prompts only.
delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-live-'));
 const executablePath=process.env.UCL_STUDY_EXECUTABLE||process.env.UCL_STUDY_ELECTRON;
 const launchOptions={executablePath,args:process.env.UCL_STUDY_EXECUTABLE?[]:[path.resolve(__dirname,'..')],env:{...process.env,UCL_STUDY_TEST_HOME:home}};
 let app=await _electron.launch(launchOptions);
 try{
  const page=await app.firstWindow();await page.waitForFunction(()=>!!window.study);
  console.log('import',await page.evaluate(async()=>{const r=await window.study.call('importCodex');return r.ok?{ok:true,protocol:r.data.protocol,model:r.data.model}:r}));
  await page.evaluate(async()=>{const s=await window.study.call('state');return window.study.call('saveConfig',{...s.data.config,shareData:true})});
  const result=await page.evaluate(()=>window.study.call('chat',{message:'这是连接测试，请只回答：连接成功'}));
  console.log('reply',result);
  assert.equal(result.ok,true);
  if(process.env.UCL_STUDY_LIVE_TOOLS==='1'){
   const diagnostic=await page.evaluate(()=>window.study.call('testConnection'));
   assert.equal(diagnostic.data.ok,true);console.log('diagnostic',diagnostic.data);
   fs.writeFileSync(path.join(home,'Library','中文测试资料.txt'),'测试课程：猫然学习方法。核心原则：先理解概念，再使用间隔复习，最后通过练习自测。来源编号：UCATRAN-TEST-1106。','utf8');
   const events=[];await page.exposeFunction('recordTool',e=>events.push(e));
   await page.evaluate(()=>window.study.onEvent(e=>{if(e.type==='tool')window.recordTool(e)}));
   const summary=await page.evaluate(()=>window.study.call('chat',{message:'请使用资料库工具查找并读取“中文测试资料.txt”，总结三条核心原则并注明文件来源和来源编号。'}));
   assert.equal(summary.ok,true);assert.match(summary.data,/UCATRAN-TEST-1106/);
   assert(events.some(e=>e.name==='read_document'&&e.status==='done'));
   console.log('Chinese document read and cited:',summary.data);
   const todo=await page.evaluate(()=>window.study.call('chat',{message:'请调用工具新增一个本地待办，标题为“猫然真实工具验收”，日期为2026-11-10。'}));
   assert.equal(todo.ok,true);assert(events.some(e=>e.name==='add_todo'&&e.status==='done'));
   const saved=JSON.parse(fs.readFileSync(path.join(home,'workspace.json'),'utf8'));
   assert(saved.todos.some(t=>t.title==='猫然真实工具验收'&&t.due==='2026-11-10'));
   console.log('Todo saved to disk; tool events:',events);
   await app.close();app=await _electron.launch(launchOptions);
   const restarted=await app.firstWindow();await restarted.waitForFunction(()=>!!window.study);
   const restored=await restarted.evaluate(()=>window.study.call('state'));
   assert(restored.data.todos.some(t=>t.title==='猫然真实工具验收'&&t.due==='2026-11-10'));
   assert.equal(restored.data.conversations.length,saved.conversations.length);
   console.log('Restart restored todo and conversation.');
  }
 }finally{await app.close();console.log('Isolated workspace:',home)}
})().catch(e=>{console.error(e.message);process.exitCode=1});
