// Reproducible macOS icon export from the editable SVG master.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try {
  const page=await browser.newPage({viewport:{width:1024,height:1024},deviceScaleFactor:1});
  await page.setContent('<style>html,body{margin:0;background:transparent}</style>'+fs.readFileSync(path.join(root,'renderer/assets/brand/ucatran.svg'),'utf8'));
  await page.screenshot({path:path.join(root,'renderer/assets/brand/ucatran.png'),omitBackground:true});
 } finally {await browser.close()}
 const dir=path.join(root,'build/ucatran.iconset');fs.mkdirSync(dir,{recursive:true});
 for(const size of [16,32,128,256,512])for(const scale of [1,2]){
  execFileSync('sips',['-z',String(size*scale),String(size*scale),path.join(root,'renderer/assets/brand/ucatran.png'),'--out',path.join(dir,`icon_${size}x${size}${scale===2?'@2x':''}.png`)],{stdio:'ignore'});
 }
 const sizes=[16,32,64,128,256];const images=sizes.map(n=>fs.readFileSync(path.join(dir,n===64?'icon_32x32@2x.png':`icon_${n}x${n}.png`)));
 const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
 sizes.forEach((n,i)=>{const at=6+i*16;header[at]=header[at+1]=n%256;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(images[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=images[i].length});fs.writeFileSync(path.join(root,'build/ucatran.ico'),Buffer.concat([header,...images]));
 execFileSync('iconutil',['-c','icns',dir,'-o',path.join(root,'build/ucatran.icns')]);
 console.log('Generated UCatran PNG and macOS ICNS from SVG.');
})().catch(e=>{console.error(e);process.exit(1)});
