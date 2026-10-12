/** Browser QA without an npm dependency. Start headless Chrome with CDP port 9224. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const origin=process.env.SECUREKEY_QA_BASE_URL || 'http://127.0.0.1:5500';
const artifacts=path.join(root,'qa-artifacts');fs.mkdirSync(artifacts,{recursive:true});
const tabs=await fetch('http://127.0.0.1:9224/json/list').then(r=>r.json());
const tab=tabs.find(t=>t.type==='page' && !t.url.startsWith('chrome:'));
const ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();const runtimeErrors=[];const requestFailures=[];const httpAssetFailures=[];
let pageLoaded;
ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')runtimeErrors.push(msg.params.exceptionDetails);if(msg.method==='Network.loadingFailed')requestFailures.push(msg.params);});
ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.method==='Network.responseReceived'&&msg.params.response.status>=400)httpAssetFailures.push({url:msg.params.response.url,status:msg.params.response.status});});
ws.addEventListener('message',event=>{if(JSON.parse(event.data).method==='Page.loadEventFired')pageLoaded?.();});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const navigate=async page=>{const loaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Page load timed out: '+page)),10000);pageLoaded=()=>{clearTimeout(timer);pageLoaded=null;resolve();};});await send('Page.navigate',{url:`${origin}/${page}`});await loaded;await evaluate(`document.fonts.ready.then(()=>true)`);};
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const assetOnly=process.argv.includes('--asset-only');
const widths=assetOnly?[]:process.argv.includes('--quick')?[320,768,1024,1440]:[320,360,375,390,414,430,768,820,1024,1280,1366,1440,1600,1920];
const pages=fs.readdirSync(root).filter(f=>f.endsWith('.html')).sort();
const failures=[];let combinations=0;const pageResults=[];
for(const page of pages){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate(page);
  await evaluate(`document.querySelectorAll('img').forEach(i=>i.loading='eager');`);
  const images=await evaluate(`Promise.all([...document.images].map(i=>new Promise(resolve=>{const done=()=>resolve({src:i.getAttribute('src'),alt:i.alt,width:i.naturalWidth,height:i.naturalHeight});if(i.complete)done();else{i.addEventListener('load',done,{once:true});i.addEventListener('error',done,{once:true});setTimeout(done,4000)}})))`);
  for(const image of images)if(!image.width)failures.push({page,issue:'missing-image',image});
  for(const width of widths){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
    for(const theme of ['light','dark'])for(const dir of ['ltr','rtl']){
      await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.body.classList.toggle('dark-mode',${theme==='dark'});document.documentElement.dir='${dir}';window.scrollTo(0,0)`);
      const metrics=await evaluate(`(()=>{const w=document.documentElement.clientWidth;return {documentWidth:w,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>w+1||r.left<-1)&&!e.closest('.offcanvas')&&!e.closest('.icon-library')&&!e.matches('.skip-link')&&!e.closest('.hero-emblem')&&!e.closest('.comparison-table-wrap')&&!e.parentElement?.closest('.testimonial-track')&&!(e instanceof SVGElement&&e.ownerSVGElement)}).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:e.className.baseVal,text:e.textContent.slice(0,45),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).slice(0,8),desktopVisible:getComputedStyle(document.querySelector('.desktop-links')).display!=='none',menuVisible:getComputedStyle(document.querySelector('.menu-button')).display!=='none',footerOverlap:document.querySelector('.contact-footer').getBoundingClientRect().top<document.querySelector('main').getBoundingClientRect().bottom-1}})()`);
      combinations++;
      if(metrics.scrollWidth>metrics.documentWidth+1||metrics.overflow.length||metrics.footerOverlap||(width<=1024&&(metrics.desktopVisible||!metrics.menuVisible)))failures.push({page,width,theme,dir,...metrics});
    }
  }
  pageResults.push({page,images:images.length});
  console.log(`${page}: checked ${widths.length*4} layouts`);
}
const report={pages:pages.length,combinations,failures,runtimeErrors,requestFailures,httpAssetFailures,pageResults};
const reportName=assetOnly?'asset-report.json':'browser-report.json';
fs.writeFileSync(path.join(artifacts,reportName),JSON.stringify(report,null,2));
for(const page of process.argv.includes('--image-audit')?pages:['index.html','index-2.html','contact.html','services.html','login.html']){
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await navigate(page);await evaluate("document.documentElement.dataset.bsTheme='dark';document.body.classList.add('dark-mode');document.documentElement.dir='ltr';window.scrollTo(0,0)");
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(artifacts,`${page.replace('.html','')}-desktop.png`),Buffer.from(shot.data,'base64'));
}
console.log(JSON.stringify({pages:pages.length,combinations,failures:failures.length,runtimeErrors:runtimeErrors.length,httpAssetFailures:httpAssetFailures.length,report:path.join(artifacts,reportName)},null,2));
ws.close();
process.exitCode=failures.length||runtimeErrors.length||httpAssetFailures.length?1:0;
