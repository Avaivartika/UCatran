const {test}=require('node:test'),assert=require('node:assert/strict');
const {createModelFetch}=require('../desktop/network.cjs');
test('model transport uses session streaming fetch, omits cookies and refuses redirects',async()=>{
 const response=new Response('data: hello\n\n');let received;
 const fetch=createModelFetch({fetch:async(url,options)=>{received={url,options};return response}});
 const signal=new AbortController().signal;
 assert.equal(await fetch('https://example.com/responses',{signal,method:'POST',headers:{Authorization:'fixture'}}),response);
 assert.equal(received.options.signal,signal);assert.equal(received.options.credentials,'omit');assert.equal(received.options.redirect,'error');
 assert.equal(await response.text(),'data: hello\n\n');
});
test('model transport reports safe actionable network and HTTP errors',async()=>{
 for(const [message,expected] of [['net::ERR_PROXY_CONNECTION_FAILED',/代理/],['net::ERR_CERT_AUTHORITY_INVALID',/证书/],['getaddrinfo ENOTFOUND',/DNS/]]){
  await assert.rejects(createModelFetch({fetch:async()=>{throw Error(message)}})('https://example.com'),expected);
 }
 for(const status of [400,401,403,404,407,429,500]){
  await assert.rejects(createModelFetch({fetch:async()=>new Response('secret-token',{status})})('https://example.com'),e=>e.message.includes(String(status))&&!e.message.includes('secret-token'));
 }
});
test('model transport propagates cancellation without relabeling it as a network failure',async()=>{
 const controller=new AbortController();controller.abort();const error=new DOMException('Stopped','AbortError');
 await assert.rejects(createModelFetch({fetch:async()=>{throw error}})('https://example.com',{signal:controller.signal}),e=>e===error);
});
test('Pi keeps actionable transport errors even when the provider SDK wraps them',async()=>{
 const {runAgent}=require('../desktop/core.cjs');
 await assert.rejects(runAgent({messages:[{role:'user',content:'test'}],config:{model:'fixture',baseUrl:'https://example.com/v1'},toolsEnabled:false,fetchImpl:createModelFetch({fetch:async()=>new Response('private',{status:401})})}),/HTTP 401.*认证失败/);
});
