delete process.env.ELECTRON_RUN_AS_NODE;
const {_electron}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {sse}=require('../tests/pi-response.cjs');
(async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-complete-'));fs.mkdirSync(path.join(home,'Library'));fs.writeFileSync(path.join(home,'Library','讲义.txt'),'正文包含检索练习与间隔复习。来源编号 SAMPLE-123。');
 let searchSeen=false;
 const reply='## 学习安排\n- **检索练习**\n- 间隔复习\n\n| 来源 | 片段 |\n| --- | --- |\n| 讲义.txt | 1 |\n\n```js\nconst x = 1;\n```\n<img src=x onerror=alert(1)>';
 const server=http.createServer((req,res)=>{let text='';req.on('data',c=>text+=c);req.on('end',()=>{const body=JSON.parse(text);const result=body.messages.find(m=>m.role==='tool');if(result){searchSeen=true;assert.match(result.content,/SAMPLE-123/)}res.setHeader('Content-Type','text/event-stream');res.end(sse(result?{content:reply}:{tool_calls:[{id:'find',type:'function',function:{name:'search_library',arguments:'{"query":"检索练习"}'}}]}))})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const app=await _electron.launch({executablePath:process.env.UCL_STUDY_EXECUTABLE||process.env.UCL_STUDY_ELECTRON,args:process.env.UCL_STUDY_EXECUTABLE?[]:[path.resolve(__dirname,'..')],env:{...process.env,UCL_STUDY_TEST_HOME:home}});
 try{const p=await app.firstWindow();await p.waitForFunction(()=>!!window.study);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.evaluate(port=>window.study.call('saveConfig',{baseUrl:`http://127.0.0.1:${port}/v1`,model:'fixture',shareData:true}),server.address().port);
  await p.locator('nav button[data-view="library"]').click();await p.getByLabel('搜索资料').fill('检索练习');await p.getByRole('button',{name:'全文检索',exact:true}).click();await p.locator('.search-hit').waitFor();assert.match(await p.locator('.search-hit').textContent(),/SAMPLE-123/);
  await p.locator('nav button[data-view="chat"]').click();assert.equal(await p.locator('dialog[open]').count(),0);
  await p.getByLabel('向助手提问').fill('根据检索练习讲义制定安排');await p.getByRole('button',{name:'发送 ↑',exact:true}).click();await p.locator('.bubble.assistant table').waitFor();assert(searchSeen);assert.equal(await p.locator('.bubble.assistant img,.bubble.assistant script').count(),0);assert.equal(await p.locator('.bubble.assistant pre code').textContent(),'const x = 1;');
  for(const [width,height] of [[1280,850],[850,720]]){await p.setViewportSize({width,height});await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert(await p.locator('.messages').evaluate(n=>n.clientHeight>250));assert(await p.locator('.chat-toolbar').evaluate(n=>n.clientHeight<100));await p.screenshot({path:path.join(__dirname,`../preview-complete-${width}.png`)})}
  await p.getByRole('button',{name:'打开助手设置'}).click();assert.equal(await p.locator('dialog[open]').count(),1);await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);
  assert.deepEqual(errors,[]);console.log('Full-text UI and real Python index → agent search tool → cited Markdown; safe rendering, compact toolbar, settings dialog, responsive message area passed.');
 }finally{await app.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
