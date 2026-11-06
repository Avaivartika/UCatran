const {test}=require('node:test'),assert=require('node:assert/strict');
const {agentOptions,codexModels}=require('../desktop/agent-config.cjs');
const {runAgent}=require('../desktop/core.cjs');
const {sse}=require('./pi-response.cjs');
test('agent settings reject invalid permissions, budgets and reasoning',()=>{
 for(const value of [{reasoning:'invented'},{toolMode:'shell'},{maxTurns:0},{maxTurns:33},{timeoutSeconds:10},{maxOutputTokens:1}])assert.throws(()=>agentOptions(value));
 assert.equal(agentOptions().reasoning,'auto');assert.equal(agentOptions({reasoning:'ultra'}).reasoning,'ultra');
});
test('Chat Completions sends selected reasoning and enforces read-only tools',async()=>{
 let body;
 await runAgent({messages:[{role:'user',content:'test'}],config:{baseUrl:'https://example.com/v1',model:'selected',reasoning:'high',toolMode:'read-only',maxOutputTokens:8192},fetchImpl:async(_url,init)=>{body=JSON.parse(init.body);return new Response(sse({content:'done'}))}});
 assert.equal(body.model,'selected');assert.equal(body.reasoning_effort,'high');assert.equal(body.max_tokens,8192);
 assert(!body.tools.some(t=>t.function.name==='add_todo'));assert(body.tools.some(t=>t.function.name==='read_document'));
});
test('automatic reasoning omits override; off mode excludes tools',async()=>{
 await runAgent({messages:[{role:'user',content:'test'}],config:{baseUrl:'https://example.com/v1',model:'selected',toolMode:'off'},fetchImpl:async(_url,init)=>{const body=JSON.parse(init.body);assert.equal(body.reasoning_effort,undefined);assert(!body.tools?.length);return new Response(sse({content:'done'}))}});
});
test('read-only mode rejects a hallucinated write tool before dispatch',async()=>{
 let called=false,n=0;
 await runAgent({messages:[{role:'user',content:'test'}],config:{baseUrl:'https://example.com/v1',model:'selected',toolMode:'read-only'},callTool:()=>{called=true},fetchImpl:async()=>new Response(sse(n++===0?{tool_calls:[{id:'write',type:'function',function:{name:'add_todo',arguments:'{"title":"test","due":""}'}}]}:{content:'done'}))});
 assert.equal(called,false);
});
test('Codex model catalogue exposes safe metadata and advertised reasoning levels',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ucatran-catalog-'));
 try{fs.writeFileSync(path.join(dir,'models_cache.json'),JSON.stringify({identity:'private',models:[{slug:'fixture',display_name:'Fixture',supported_reasoning_levels:[{effort:'high'},{effort:'ultra'}],secret:'private'}]}));const models=codexModels(dir);assert.deepEqual(models[0].reasoningLevels,['high','ultra']);assert(!JSON.stringify(models).includes('private'))}finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('configured tool loop budget stops repeated model tool requests',async()=>{
 let calls=0;
 await assert.rejects(runAgent({messages:[{role:'user',content:'test'}],config:{baseUrl:'https://example.com/v1',model:'selected',maxTurns:1},callTool:()=>{calls++;return []},fetchImpl:async()=>new Response(sse({tool_calls:[{id:'loop',type:'function',function:{name:'todos',arguments:'{}'}}]}))}),/1 轮/);
 assert.equal(calls,1);
});
test('failed model follow-up retains completed tool results and a checkpoint',async()=>{
 let n=0,checkpoint;
 await assert.rejects(runAgent({messages:[{role:'user',content:'test'}],config:{baseUrl:'https://example.com/v1',model:'selected'},callTool:()=>({id:'saved-todo'}),onCheckpoint:s=>{checkpoint=s},fetchImpl:async()=>{if(n++)throw Error('network interrupted');return new Response(sse({tool_calls:[{id:'save',type:'function',function:{name:'add_todo',arguments:'{"title":"test","due":""}'}}]}))}}),error=>{assert(error.session.messages.some(m=>m.role==='toolResult'));return true});
 assert(checkpoint.messages.some(m=>m.role==='toolResult'));
});
