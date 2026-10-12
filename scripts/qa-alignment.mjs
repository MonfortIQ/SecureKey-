/** Targeted regression checks for homepage highlights, coverage cards and team badges. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const tabs=await fetch('http://127.0.0.1:9224/json/list').then(r=>r.json());
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0,loaded;const pending=new Map(),failures=[],contrasts=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Page.loadEventFired')loaded?.();});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const navigate=async page=>{const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Load timeout')),10000);loaded=()=>{clearTimeout(timer);loaded=null;resolve();};});await send('Page.navigate',{url:`http://127.0.0.1:5500/${page}`});await ready;await evaluate('document.fonts.ready.then(()=>true)');};
await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
let layouts=0;
for(const page of ['index.html','about.html']){
  await navigate(page);
  await evaluate("Promise.all([...document.images].map(async image=>{image.loading='eager';try{await image.decode();}catch{}})).then(()=>true)");
  for(const width of [320,360,375,390,414,430,768,820,1024,1280,1366,1440,1600,1920]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    await evaluate("Promise.all([...document.images].map(async image=>{try{await image.decode();}catch{}})).then(()=>true)");
    for(const theme of ['light','dark'])for(const dir of ['ltr','rtl']){
      await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.body.classList.toggle('dark-mode',${theme==='dark'});document.documentElement.dir='${dir}'`);
      const metrics=await evaluate(`(()=>{
        const problems=[];
        if(document.documentElement.scrollWidth>innerWidth+1)problems.push('horizontal overflow');
        const rect=e=>e.getBoundingClientRect();
        const rows=selector=>{const groups=new Map();document.querySelectorAll(selector).forEach(e=>{const top=Math.round(rect(e).top);if(!groups.has(top))groups.set(top,[]);groups.get(top).push(e);});return [...groups.values()];};
        for(const row of rows('.hero-highlight')){
          const icons=row.map(e=>rect(e.querySelector('i')).top),titles=row.map(e=>rect(e.querySelector('.fw-bold')).top),subtitles=row.map(e=>rect(e.querySelector('small')).top);
          if(Math.max(...icons)-Math.min(...icons)>1||Math.max(...titles)-Math.min(...titles)>1||Math.max(...subtitles)-Math.min(...subtitles)>1)problems.push('hero highlight alignment');
        }
        for(const selector of ['.service-areas .sk-card','.team-section .sk-card'])for(const row of rows(selector)){
          const titles=row.map(e=>rect(e.querySelector('h3')).top),badges=row.map(e=>rect(e.querySelector('.badge')).bottom);
          if(Math.max(...titles)-Math.min(...titles)>1||Math.max(...badges)-Math.min(...badges)>1)problems.push('card alignment: '+selector);
        }
        const rgba=s=>s.match(/[\\d.]+/g)?.map(Number)||[0,0,0,0];
        const emergencyImages=[...document.querySelectorAll('.emergency-service-cards img')];
        if(emergencyImages.length){
          if(emergencyImages.length!==6||new Set(emergencyImages.map(i=>i.src)).size!==6)problems.push('emergency photographs must be six distinct assets');
          for(const image of emergencyImages){const r=rect(image);if(!image.complete||!image.naturalWidth)problems.push('missing emergency photograph');if(Math.abs(r.width/r.height-1.6)>.02)problems.push('emergency image aspect ratio');}
          for(const row of rows('.emergency-service-cards .sk-card')){
            const titles=row.map(e=>rect(e.querySelector('h3')).top),buttons=row.map(e=>rect(e.querySelector('.card-footer-action')).bottom);
            if(Math.max(...titles)-Math.min(...titles)>1||Math.max(...buttons)-Math.min(...buttons)>1)problems.push('emergency card alignment');
          }
        }
        const over=(fg,bg)=>{const a=fg[3]??1;return [0,1,2].map(i=>fg[i]*a+bg[i]*(1-a));};
        const background=e=>{const chain=[];for(let n=e;n;n=n.parentElement)chain.unshift(n);let color=[255,255,255];for(const n of chain)color=over(rgba(getComputedStyle(n).backgroundColor),color);return color;};
        const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
        const labels=[...document.querySelectorAll('.service-areas .badge,.team-section .badge,.hero-highlight small,.section-subtitle')].map(e=>{const style=getComputedStyle(e);const bg=e.closest('.hero-highlights')?[17,34,57]:background(e);const a=lum(over(rgba(style.color),bg)),b=lum(bg);return {text:e.textContent.trim(),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),fontSize:parseFloat(style.fontSize),overflow:e.scrollWidth>e.clientWidth+1};});
        for(const label of labels)if(label.ratio<4.5||label.fontSize<14||label.overflow)problems.push('label readability: '+label.text);
        return {problems,labels};
      })()`);
      layouts++;
      if(metrics.problems.length)failures.push({page,width,theme,dir,...metrics});
      if(width===1024&&dir==='ltr')contrasts.push({page,theme,labels:metrics.labels});
    }
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate("document.documentElement.dataset.bsTheme='dark';document.body.classList.add('dark-mode');document.documentElement.dir='ltr'");
  for(const selector of page==='index.html'?['.hero-highlights','.service-areas','.emergency-service-cards']:['.team-section']){
    await evaluate(selector==='.emergency-service-cards'?"window.scrollTo(0,document.querySelector('.emergency-service-cards .row').getBoundingClientRect().top+scrollY-100)":`document.querySelector('${selector}').scrollIntoView({block:'center'})`);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(root,'qa-artifacts',`${selector.slice(1)}-1024.png`),Buffer.from(shot.data,'base64'));
  }
  if(page==='index.html'){
    await send('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});
    await evaluate("Promise.all([...document.images].map(async image=>{try{await image.decode();}catch{}})).then(()=>true)");
    await evaluate("window.scrollTo(0,document.querySelector('.emergency-service-cards .row').getBoundingClientRect().top+scrollY-95)");
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(root,'qa-artifacts/emergency-service-cards-mobile.png'),Buffer.from(shot.data,'base64'));
  }
}
const report={layouts,failures,contrasts};
fs.writeFileSync(path.join(root,'qa-artifacts/alignment-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({layouts,failures:failures.map(({page,width,theme,dir,problems})=>({page,width,theme,dir,problems})),minimumContrast:Math.min(...contrasts.flatMap(c=>c.labels.map(l=>l.ratio)))},null,2));
await send('Browser.close');ws.close();process.exitCode=failures.length?1:0;
