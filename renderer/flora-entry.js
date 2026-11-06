import { compose, Painter } from '@alpaca-software/web-flora/engine';
import { toDisplayList, drawCanvas2D } from '@alpaca-software/web-flora';
// Static background: paint once, replace every five visible minutes; no growth animation.
const interval=5*60*1000;
const canvas=document.getElementById('page-flora');
let lastPaint=0;
function refreshBackground(){
 if(!canvas?.isConnected||document.hidden)return;
 try{
  const seed=crypto.getRandomValues(new Uint32Array(1))[0];
  const width=260,height=420;
  const text={x0:235,y0:24,x1:260,y1:396};
  const painter=new Painter({width,height});
  compose.plant({width,height,seed,text,lines:[text],grow:.65,budget:160},painter);
  // Render offscreen first, then replace the visible canvas in a single frame.
  const ratio=Math.min(devicePixelRatio||1,2);
  const buffer=document.createElement('canvas');buffer.width=width*ratio;buffer.height=height*ratio;
  drawCanvas2D(buffer.getContext('2d'),toDisplayList(painter.scene()),{scale:ratio});
  canvas.width=buffer.width;canvas.height=buffer.height;
  canvas.getContext('2d').drawImage(buffer,0,0);
  canvas.dataset.flora='ready';canvas.dataset.generation=String(Number(canvas.dataset.generation||0)+1);
  lastPaint=Date.now();
 }catch(e){canvas.dataset.flora='error';console.error('Flora background failed',e.message)}
}
requestAnimationFrame(refreshBackground);
setInterval(refreshBackground,interval);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastPaint>=interval)refreshBackground()});
