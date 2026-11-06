delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron}=require('@playwright/test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {sse}=require('../tests/pi-response.cjs');
(async()=>{
 const requests=[];const server=http.createServer((req,res)=>{
  if(req.url.endsWith('/models')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:[{id:'model-a'},{id:'model-b'}]}));return}
  let body='';req.on('data',c=>body+=c);req.on('end',()=>{requests.push(JSON.parse(body));res.setHeader('Content-Type','text/event-stream');res.end(sse({content:'设置已生效'}))});
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-agent-settings-'));
 const options={executablePath:process.env.UCL_STUDY_EXECUTABLE||process.env.UCL_STUDY_ELECTRON,args:process.env.UCL_STUDY_EXECUTABLE?[]:[path.resolve(__dirname,'..')],env:{...process.env,UCL_STUDY_TEST_HOME:home}};
 let app=await _electron.launch(options);
 try{
  let page=await app.firstWindow();await page.waitForFunction(()=>!!window.study);
  await page.evaluate(port=>window.study.call('saveConfig',{baseUrl:`http://127.0.0.1:${port}/v1`,model:'model-a',shareData:true}),server.address().port);
  await page.locator('nav button[data-view="chat"]').click();await page.getByRole('button',{name:'打开助手设置'}).click();await page.getByRole('button',{name:'刷新模型目录',exact:true}).click();
  await page.locator('#chat-model option[value="model-b"]').waitFor({state:'attached'});
  await page.locator('#chat-model').selectOption('model-b');await page.locator('#chat-reasoning').selectOption('high');
  await page.getByText('更多运行设置',{exact:true}).click();
  await page.locator('#chat-tool-mode').selectOption('read-only');await page.locator('#chat-maxTurns').fill('12');await page.locator('#chat-timeoutSeconds').fill('300');await page.locator('#chat-maxOutputTokens').fill('8192');
  await page.getByRole('button',{name:'应用设置',exact:true}).click();await page.locator('#notice').filter({hasText:'助手设置已应用'}).waitFor();
  await page.getByLabel('向助手提问').fill('测试模型设置');await page.getByRole('button',{name:'发送 ↑',exact:true}).click();await page.getByText('设置已生效',{exact:true}).waitFor();
  assert.equal(requests[0].model,'model-b');assert.equal(requests[0].reasoning_effort,'high');assert.equal(requests[0].max_tokens,8192);assert(!requests[0].tools.some(t=>t.function.name==='add_todo'));
  await page.setViewportSize({width:850,height:720});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.waitForTimeout(100);
  assert(await page.evaluate(()=>{const reply=document.querySelector('.bubble.assistant').getBoundingClientRect(),composer=document.querySelector('.composer').getBoundingClientRect();return reply.bottom<=composer.top&&reply.bottom>reply.top}), 'Composer must not obscure the assistant reply');
  await page.screenshot({path:path.join(__dirname,'../preview-agent-settings.png'),fullPage:true});
  await app.close();app=await _electron.launch(options);page=await app.firstWindow();await page.waitForFunction(()=>!!window.study);
  const saved=await page.evaluate(()=>window.study.call('state'));assert.equal(saved.data.config.model,'model-b');assert.equal(saved.data.config.reasoning,'high');assert.equal(saved.data.config.maxTurns,12);assert.equal(saved.data.config.timeoutSeconds,300);
  await page.locator('nav button[data-view="chat"]').click();assert.equal(await page.locator('#chat-reasoning').inputValue(),'high');
  console.log('Agent controls: model discovery, selection, reasoning on wire, read-only permissions, budgets, narrow layout and restart persistence passed.');
 }finally{await app.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
