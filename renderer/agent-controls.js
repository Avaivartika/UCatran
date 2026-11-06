let modelCatalog=[];
const effortNames={auto:'自动（服务默认）',none:'不推理',minimal:'极低',low:'低',medium:'中',high:'高',xhigh:'很高',max:'最大',ultra:'Ultra'};
function agentControls(){
 const form=el('form','agent-controls');form.setAttribute('aria-label','助手运行设置');
 const main=el('div','agent-controls-row'),model=el('select'),custom=el('input'),reasoning=el('select');
 model.id='chat-model';reasoning.id='chat-reasoning';custom.id='chat-custom-model';custom.placeholder='输入服务支持的模型 ID';custom.maxLength=200;
 const field=(label,control)=>{const l=el('label','agent-field');l.append(el('span','',label),control);return l};
 const status=el('small','hint','模型目录加载中…');
 const drawEfforts=()=>{const id=model.value==='__custom__'?custom.value.trim():model.value;const metadata=modelCatalog.find(m=>m.id===id);const previous=reasoning.value||state.config.reasoning||'auto';reasoning.replaceChildren();for(const level of ['auto',...(metadata?.reasoningLevels?.length?metadata.reasoningLevels:['none','minimal','low','medium','high','xhigh','max'])]){const o=el('option','',effortNames[level]||level);o.value=level;reasoning.append(o)}reasoning.value=Array.from(reasoning.options).some(o=>o.value===previous)?previous:'auto'};
 const drawModels=()=>{model.replaceChildren();const choices=new Map(modelCatalog.map(m=>[m.id,m.name]));if(state.config.model)choices.set(state.config.model,choices.get(state.config.model)||state.config.model);for(const [id,name] of choices){const o=el('option','',name);o.value=id;model.append(o)}const option=el('option','','手动输入模型…');option.value='__custom__';model.append(option);model.value=state.config.model||'__custom__';custom.hidden=model.value!=='__custom__';drawEfforts()};
 model.onchange=()=>{custom.hidden=model.value!=='__custom__';reasoning.value='auto';drawEfforts()};custom.onchange=drawEfforts;
 main.append(field('模型',model),custom,field('推理强度',reasoning));
 const details=el('details','agent-advanced'),summary=el('summary','','更多运行设置');details.append(summary);
 const advanced=el('div','agent-controls-row'),mode=el('select');mode.id='chat-tool-mode';
 for(const [value,label] of [['auto','自动调用学习工具'],['read-only','只读工具（不创建待办）'],['off','仅对话（关闭工具）']]){const o=el('option','',label);o.value=value;mode.append(o)}mode.value=state.config.toolMode||'auto';advanced.append(field('工具权限',mode));
 const numbers={};for(const [key,label,min,max,value] of [['maxTurns','工具循环上限',1,32,8],['timeoutSeconds','任务超时（秒）',30,900,240],...(state.config.protocol==='openai-codex-responses'?[]:[['maxOutputTokens','最大输出 tokens',256,65536,4096]])]){const input=el('input');input.type='number';input.min=min;input.max=max;input.value=state.config[key]??value;input.id='chat-'+key;numbers[key]=input;advanced.append(field(label,input))}details.append(advanced,el('p','hint','推理强度由模型服务支持；自动不附加推理参数。循环上限指模型与工具往返次数。Codex 登录通道的输出长度由服务管理。'));
 const apply=el('button','small primary','应用设置');apply.type='submit';
 const refresh=btn('刷新模型目录',async()=>{status.textContent='正在读取模型目录…';try{const r=await api('refreshModels');modelCatalog=r.models;drawModels();status.textContent=r.source+' · '+r.models.length+' 个模型；可手动输入其他 ID'}catch(e){status.textContent=e.message;throw e}},'small');refresh.type='button';
 main.append(apply,refresh);form.append(main,details,status);
 form.onsubmit=async e=>{e.preventDefault();apply.disabled=true;try{state.config=await api('configureAgent',{model:model.value==='__custom__'?custom.value.trim():model.value,reasoning:reasoning.value,toolMode:mode.value,...Object.fromEntries(Object.entries(numbers).map(([k,input])=>[k,Number(input.value)]))});notice('助手设置已应用，下一次发送生效。');status.textContent=`${state.config.model} · 推理：${effortNames[state.config.reasoning]} · ${mode.selectedOptions[0].textContent}`}catch(e){notice(e.message)}finally{apply.disabled=busy}};
 drawModels();for(const input of form.querySelectorAll('input,select,button'))input.disabled=busy;
 api('models').then(r=>{if(!form.isConnected)return;modelCatalog=r.models;drawModels();status.textContent=r.source+' · '+r.models.length+' 个模型；模型是否可用以实际请求为准'}).catch(e=>{status.textContent=e.message});
 return form;
}
