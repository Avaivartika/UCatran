// Stationary daylight: irregular geometry, refreshed without continuous motion.
(()=>{
 const interval=5*60*1000;let lastPaint=0;
 const between=(min,max)=>min+Math.random()*(max-min);
 function paint(){
  if(document.hidden)return;
  const angle=between(122,157),start=between(18,35),end=start+between(20,33);
  const penumbra=between(.8,2.6),second=Math.min(88,end+between(17,27));
  const brightness=between(.34,.53),shade=between(.07,.13);
  const light=`rgba(var(--sunlight-rgb,255,255,230),${brightness.toFixed(3)})`;
  const shadow=`rgba(var(--sun-shadow,57,76,38),${shade.toFixed(3)})`;
  // A broad sunlit opening and a weaker edge of light; never equal-width stripes.
  const gradient=`linear-gradient(${angle.toFixed(1)}deg,${shadow} 0%,${shadow} ${start.toFixed(1)}%,${light} ${(start+penumbra).toFixed(1)}%,${light} ${end.toFixed(1)}%,${shadow} ${(end+penumbra*1.6).toFixed(1)}%,${shadow} ${second.toFixed(1)}%,rgba(var(--sunlight-edge,255,255,232),${(brightness*.55).toFixed(3)}) ${Math.min(100,second+between(3,7)).toFixed(1)}%)`;
  document.documentElement.style.setProperty('--daylight',gradient);
  document.documentElement.dataset.daylight='ready';lastPaint=Date.now();
 }
 paint();setInterval(paint,interval);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastPaint>=interval)paint()});
})();
