const {test}=require('node:test');const assert=require('node:assert/strict');const {modelEndpoint,inside,safeLink,runAgent}=require('../desktop/core.cjs');
test('model endpoint rejects insecure remote endpoints and embedded secrets',()=>{assert.equal(modelEndpoint('https://example.com/v1/'),'https://example.com/v1/chat/completions');assert.equal(modelEndpoint('http://127.0.0.1:11434/v1'),'http://127.0.0.1:11434/v1/chat/completions');for(const u of ['http://example.com','https://secret@example.com','https://example.com?key=secret'])assert.throws(()=>modelEndpoint(u))});
test('file access stays within the library',()=>{assert.equal(inside('/tmp/library','/tmp/library/a.pdf'),true);assert.equal(inside('/tmp/library','/tmp/library2/a.pdf'),false);assert.equal(inside('/tmp/library','/tmp/library/../secret'),false)});
test('external links cannot launch local programs',()=>{assert.throws(()=>safeLink('file:///etc/passwd'));assert.throws(()=>safeLink('javascript:alert(1)'));assert.equal(safeLink('https://ucl.ac.uk'),'https://ucl.ac.uk/')});
const {sse}=require('./pi-response.cjs');
test('Pi executes tools, streams output and persists tool context',async()=>{
 let calls=[],requests=[],events=[];
 const fetchImpl=async(u,o)=>{requests.push(JSON.parse(o.body));return new Response(sse(requests.length===1?{tool_calls:[{id:'one',type:'function',function:{name:'courses',arguments:'{}'}}]}:{content:'Course ABC'}),{headers:{'Content-Type':'text/event-stream'}})};
 const r=await runAgent({messages:[{role:'user',content:'courses?'}],config:{baseUrl:'https://example.com/v1',model:'test'},apiKey:'test',callTool:async n=>{calls.push(n);return [{name:'ABC'}]},onEvent:e=>events.push(e),fetchImpl});
 assert.equal(r.text,'Course ABC');assert.deepEqual(calls,['courses']);assert.equal(r.session.engine,'pi');assert(r.session.messages.some(m=>m.role==='toolResult'));assert(events.some(e=>e.type==='delta'));assert.equal(requests[0].stream,true);
});
test('Pi validates tool arguments before execution',async()=>{
 let i=0,called=false;
 const r=await runAgent({messages:[{role:'user',content:'browse'}],config:{baseUrl:'https://example.com',model:'test'},callTool:()=>{called=true},fetchImpl:async()=>new Response(sse(++i===1?{tool_calls:[{id:'bad',type:'function',function:{name:'browse',arguments:'{}'}}]}:{content:'missing course'}),{headers:{'Content-Type':'text/event-stream'}})});
 assert.equal(called,false);assert(r.session.messages.some(m=>m.role==='toolResult'&&m.isError));
});
test('Pi rejects unknown tools without dispatching',async()=>{
 let i=0,called=false;
 await runAgent({messages:[{role:'user',content:'hello'}],config:{baseUrl:'https://example.com',model:'test'},callTool:()=>{called=true},fetchImpl:async()=>new Response(sse(++i===1?{tool_calls:[{id:'bad',type:'function',function:{name:'shell',arguments:'{}'}}]}:{content:'done'}),{headers:{'Content-Type':'text/event-stream'}})});
 assert.equal(called,false);
});
test('Pi cancellation stops provider stream',async()=>{
 const controller=new AbortController();
 const task=runAgent({messages:[{role:'user',content:'hello'}],config:{baseUrl:'https://example.com',model:'test'},signal:controller.signal,callTool:()=>{},fetchImpl:async(_u,o)=>new Promise((resolve,reject)=>{o.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));setTimeout(()=>controller.abort(),20)})});
 await assert.rejects(task,/已停止/);
});
test('Pi resumes saved session without losing tool results',async()=>{
 let n=0;const config={baseUrl:'https://example.com',model:'test'};
 const fetchImpl=async(_u,o)=>{const body=JSON.parse(o.body);n++;if(n===3)assert(body.messages.some(m=>m.role==='tool'));return new Response(sse(n===1?{tool_calls:[{id:'first',type:'function',function:{name:'courses',arguments:'{}'}}]}:{content:'reply'}),{headers:{'Content-Type':'text/event-stream'}})};
 const first=await runAgent({messages:[{role:'user',content:'courses'}],config,callTool:async()=>[{name:'ABC'}],fetchImpl});
 const second=await runAgent({messages:[{role:'user',content:'which course?'}],session:first.session,config,callTool:async()=>[],fetchImpl});
 assert.equal(second.session.messages.filter(m=>m.role==='user').length,2);
});
