const names={kitty:'Kitty',cinnamoroll:'玉桂狗',usagi:'乌撒奇',chiikawa:'吉伊',hachiware:'小八',momonga:'飞鼠',mymelody:'美乐蒂（淡粉）',pompompurin:'布丁狗',goblin:'哥布林'};
const image=document.querySelector('#pet-image'),choice=document.querySelector('#pet-choice'),character=document.querySelector('#character'),status=document.querySelector('#status');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let current,reset,idleTimer,motion,drag=null,raf=0,lastDrag=0,lastAttention=Date.now();
const random=(a,b)=>a+Math.random()*(b-a);
function animate(frames,duration){motion?.cancel();if(reduced.matches)return;motion=image.animate(frames,{duration,easing:'ease-in-out'});return motion}
function action(kind){
 if(drag||reduced.matches)return;document.body.dataset.motion=kind;
 const direction=Math.random()>.5?1:-1;
 const poses={
  hop:[{transform:'translateY(0)'},{transform:'translateY(2px) scale(1.02,.98)',offset:.18},{transform:'translateY(-14px) rotate(-3deg)',offset:.48},{transform:'translateY(1px)',offset:.8},{transform:'none'}],
  peek:[{transform:'none'},{transform:`translateX(${direction*7}px) rotate(${direction*7}deg)`,offset:.35},{transform:`translateX(${direction*7}px) rotate(${direction*4}deg)`,offset:.72},{transform:'none'}],
  walk:[{transform:'none'},{transform:`translate(${direction*7}px,-3px) rotate(-3deg)`},{transform:`translate(${direction*15}px,0) rotate(3deg)`},{transform:`translate(${direction*9}px,-4px) rotate(-2deg)`},{transform:'none'}],
  breathe:[{transform:'none'},{transform:'translateY(-3px) scale(1.005)'},{transform:'none'}],
  think:[{transform:'none'},{transform:'rotate(-5deg) translateY(-3px)'},{transform:'rotate(3deg)'},{transform:'none'}],
  land:[{transform:'translateY(-5px)'},{transform:'translateY(2px) scale(1.03,.97)'},{transform:'translateY(-3px)'},{transform:'none'}]
 };
 animate(poses[kind]||poses.breathe,kind==='hop'?650:kind==='land'?500:random(1200,2000));
}
function schedule(){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!drag&&!document.hidden&&!document.body.classList.contains('menu-open')){const types=current?.busy?['think','breathe']:['peek','walk','breathe','hop'];action(types[Math.floor(Math.random()*types.length)])}schedule()},current?.busy?random(1800,3000):random(3500,7500))}
function render(s){const becameBusy=s.busy&&!current?.busy,currentPet=current?.pet;current=s;document.documentElement.dataset.theme=s.theme;document.body.classList.toggle('busy',s.busy);if(choice.value!==s.pet||image.alt!==names[s.pet]){image.src=`assets/pets/${s.pet}.svg`;image.alt=names[s.pet];choice.value=s.pet}if(!document.body.classList.contains('emoting'))status.textContent=s.status;character.setAttribute('aria-label',`摸摸${names[s.pet]}`);character.title='拖动角色移动 · 双击打开助手 · 右键菜单';if(becameBusy)action('think');else if(currentPet&&currentPet!==s.pet)action('hop')}
function error(){status.textContent='操作未完成，请重试';document.body.classList.add('emoting');clearTimeout(reset);reset=setTimeout(()=>document.body.classList.remove('emoting'),2500)}
function menu(open){document.body.classList.toggle('menu-open',open);document.querySelector('#menu').setAttribute('aria-expanded',String(open));if(open){motion?.cancel();choice.focus()}}
window.pet.onState(render);window.pet.call('state').then(render).catch(error);
choice.onchange=()=>{window.pet.call('choose',{pet:choice.value}).catch(error);menu(false)};
document.querySelector('#hide').onclick=()=>window.pet.call('hide').catch(error);
document.querySelector('#open').onclick=()=>window.pet.call('openChat').catch(error);
document.querySelector('#menu').onclick=()=>menu(!document.body.classList.contains('menu-open'));
character.oncontextmenu=e=>{e.preventDefault();menu(!document.body.classList.contains('menu-open'))};
character.onpointerenter=()=>{if(!drag&&!current?.busy&&Date.now()-lastAttention>2500){lastAttention=Date.now();action('peek')}};
character.onpointerdown=e=>{
 if(e.button!==0)return;e.preventDefault();character.setPointerCapture(e.pointerId);motion?.cancel();menu(false);
 drag={id:e.pointerId,x:e.screenX,y:e.screenY,lastX:e.screenX,lastY:e.screenY,moved:false};
 window.pet.call('dragStart',{x:e.screenX,y:e.screenY}).catch(error);
};
character.onpointermove=e=>{
 if(!drag||e.pointerId!==drag.id)return;drag.lastX=e.screenX;drag.lastY=e.screenY;
 if(Math.hypot(e.screenX-drag.x,e.screenY-drag.y)>4)drag.moved=true;
 if(!drag.moved)return;document.body.classList.add('dragging');image.style.transform=`rotate(${Math.max(-9,Math.min(9,(e.screenX-drag.x)*.06))}deg) translateY(-5px)`;
 if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(drag)window.pet.call('dragMove',{x:drag.lastX,y:drag.lastY}).catch(error)});
};
function endDrag(e){
 if(!drag||e.pointerId!==drag.id)return;const ended=drag;drag=null;cancelAnimationFrame(raf);raf=0;
 if(ended.moved){lastDrag=Date.now();window.pet.call('dragMove',{x:e.screenX,y:e.screenY}).catch(error)}
 window.pet.call('dragEnd').catch(error);document.body.classList.remove('dragging');image.style.transform='';
 if(character.hasPointerCapture(e.pointerId))character.releasePointerCapture(e.pointerId);
 if(ended.moved)action('land');
}
character.onpointerup=endDrag;character.onpointercancel=endDrag;
character.onlostpointercapture=()=>{if(drag){drag=null;cancelAnimationFrame(raf);raf=0;window.pet.call('dragEnd').catch(error);document.body.classList.remove('dragging');image.style.transform=''}};
character.onclick=()=>{if(Date.now()-lastDrag<350)return;clearTimeout(reset);action('hop');document.body.classList.add('emoting');status.textContent='休息一下，再读一页。';reset=setTimeout(()=>{document.body.classList.remove('emoting');if(current)render(current)},1800)};
character.ondblclick=()=>{if(Date.now()-lastDrag>350)window.pet.call('openChat').catch(error)};
character.onkeydown=e=>{const delta={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(delta){e.preventDefault();window.pet.call('nudge',{dx:delta[0],dy:delta[1]}).catch(error)}if(e.key==='Escape')menu(false)};
document.addEventListener('keydown',e=>{if(e.key==='Escape')menu(false)});
reduced.addEventListener('change',()=>{motion?.cancel();schedule()});schedule();
window.addEventListener('beforeunload',()=>{clearTimeout(idleTimer);clearTimeout(reset);cancelAnimationFrame(raf);motion?.cancel()});
