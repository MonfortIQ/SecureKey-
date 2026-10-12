/** Capture every rendered page after all photo and font requests settle. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const tabs=await fetch('http://127.0.0.1:9224/json/list').then(r=>r.json());
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0,loaded;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Page.loadEventFired')loaded?.();});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
await send('Page.enable');await send('Runtime.enable');
const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')).sort();
for(const page of pages){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Load timeout')),10000);loaded=()=>{clearTimeout(timer);loaded=null;resolve();};});
  await send('Page.navigate',{url:`http://127.0.0.1:5500/${page}`});await ready;
  await evaluate("document.documentElement.dataset.bsTheme='dark';document.body.classList.add('dark-mode');document.documentElement.dir='ltr';window.scrollTo(0,0)");
  const photos=await evaluate("document.fonts.ready.then(()=>Promise.all([...document.images].map(async image=>{image.loading='eager';try{await image.decode();}catch{}return {src:image.currentSrc,width:image.naturalWidth,alt:image.alt};})))");
  for(const photo of photos)if(!photo.width)errors.push({page,...photo});
  for(const width of [1440,...(['about.html','services.html','pricing.html','blog.html','contact.html','404.html','index-2.html'].includes(page)?[375,1024]:[])]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    await evaluate("Promise.all([...document.images].map(async image=>{try{await image.decode();}catch{}})).then(()=>true)");
    // Await paint after decode to prevent screenshots of unpainted image layers.
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(root,'qa-artifacts',`${page.replace('.html','')}-${width===1440?'desktop':width}.png`),Buffer.from(shot.data,'base64'));
  }
}
fs.writeFileSync(path.join(root,'qa-artifacts/image-loading-report.json'),JSON.stringify({pages:pages.length,errors},null,2));
console.log(JSON.stringify({pages:pages.length,errors},null,2));
await send('Browser.close');ws.close();process.exitCode=errors.length?1:0;
