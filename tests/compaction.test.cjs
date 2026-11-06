const {test}=require('node:test'),assert=require('node:assert/strict');
const {runAgent}=require('../desktop/core.cjs'),{sse}=require('./pi-response.cjs');
test('automatic compaction persists summary, keeps canonical history and resumes without resummarizing',async()=>{
 let summaries=0,answers=0,checkpoint;
 const config={baseUrl:'https://example.com/v1',model:'fixture',modelContextWindow:12000,maxOutputTokens:1024};
 const fetchImpl=async(_u,init)=>{const body=JSON.parse(init.body);if(body.messages[0].content.includes('压缩学习助手')){summaries++;return new Response(sse({content:'已完成待办 id-123；用户需要继续复习；来源 test.txt。'}))}answers++;return new Response(sse({content:'继续复习'}))};
 const base=await runAgent({messages:[{role:'user',content:'hello'}],config,fetchImpl});
 const history=[];for(let i=0;i<30;i++){history.push({role:'user',content:'历史'+i+'x'.repeat(500),timestamp:i});history.push({...base.session.messages.at(-1),content:[{type:'text',text:'答复'+i+'y'.repeat(500)}]})}
 const original=JSON.stringify(history);
 const result=await runAgent({messages:[{role:'user',content:'现在继续'}],session:{messages:history},config,fetchImpl,onCheckpoint:s=>{checkpoint=JSON.parse(JSON.stringify(s))}});
 assert(summaries>0);assert.equal(result.meta.compactions,1);assert.equal(result.session.messages.length,62);assert.equal(JSON.stringify(result.session.messages.slice(0,60)),original);assert(checkpoint.compaction.summary.includes('id-123'));
 const before=summaries;await runAgent({messages:[{role:'user',content:'再继续'}],session:JSON.parse(JSON.stringify(result.session)),config,fetchImpl});assert.equal(summaries,before);assert.equal(answers,3);
});
test('compaction failure or cancellation never discards the original history',async()=>{
 const {compactContext}=await import('../desktop/agent/compaction.mjs');const messages=Array.from({length:12},(_,i)=>({role:'user',content:'x'.repeat(1000),timestamp:i}));const original=JSON.stringify(messages);
 await assert.rejects(compactContext(messages,{window:4000,reserve:800,summarize:async()=>{throw Error('summary offline')}}),/summary offline/);
 assert.equal(JSON.stringify(messages),original);
 const signal=new AbortController();signal.abort();await assert.rejects(compactContext(messages,{window:4000,reserve:800,signal:signal.signal,summarize:async()=>''}),/已停止/);
});
