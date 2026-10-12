/** Exercise navigation and page behavior against the local static server. */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const origin=process.env.SECUREKEY_QA_BASE_URL || 'http://127.0.0.1:5500';
const artifacts=path.join(root,'qa-artifacts');fs.mkdirSync(artifacts,{recursive:true});
const tabs=await fetch('http://127.0.0.1:9224/json/list').then(r=>r.json());
const ws=new WebSocket(tabs.find(t=>t.type==='page'&&!t.url.startsWith('chrome:')).webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map();const exceptions=[];
let pageLoaded;
ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails);});
ws.addEventListener('message',event=>{if(JSON.parse(event.data).method==='Page.loadEventFired')pageLoaded?.();});
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const evaluate=async expression=>{const scoped=`(()=>eval(${JSON.stringify(expression)}))()`;const r=await send('Runtime.evaluate',{expression:scoped,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const pause=()=>new Promise(resolve=>setTimeout(resolve,60));
const navigate=async page=>{const loaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Page load timed out: '+page)),10000);pageLoaded=()=>{clearTimeout(timer);pageLoaded=null;resolve();};});await send('Page.navigate',{url:`${origin}/${page}`});await loaded;};
const passed=[];
const check=async(expression,label)=>{if(!await evaluate(expression))throw Error(label);passed.push(label);};
await send('Page.enable');await send('Runtime.enable');
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
const pages=process.argv.includes('--behavior-only')?[]:fs.readdirSync(root).filter(f=>f.endsWith('.html')).sort();
for(const page of pages){
  await navigate(page);
  for(const width of [1440,1024,390]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    for(const theme of ['light','dark'])for(const dir of ['ltr','rtl']){
      await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dir='${dir}'`);
      if(width>1024){
        await evaluate("document.querySelector('.home-menu-toggle').click()");await pause();
        await check("document.querySelector('.home-dropdown .dropdown-menu').classList.contains('show')",`${page}/${width}/${theme}/${dir}: desktop Home dropdown opens`);
        await check("(()=>{const r=document.querySelector('.home-dropdown .dropdown-menu').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()",`${page}/${width}/${theme}/${dir}: dropdown fits`);
        await evaluate("document.querySelector('.home-menu-toggle').click()");await pause();
      }else{
        await evaluate("document.querySelector('.menu-button').click()");await pause();
        await check("document.getElementById('mobileMenu').classList.contains('show')",`${page}/${width}/${theme}/${dir}: mobile menu opens`);
        await check("(()=>{const r=document.getElementById('mobileMenu').getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1})()",`${page}/${width}/${theme}/${dir}: drawer fits`);
        await evaluate("document.querySelector('.mobile-home-toggle').click()");await pause();
        await check("document.getElementById('mobileHomeLinks').classList.contains('show')",`${page}/${width}/${theme}/${dir}: mobile Home opens`);
        await evaluate("document.querySelector('.mobile-home-toggle').click()");await pause();
        await check("!document.getElementById('mobileHomeLinks').classList.contains('show')",`${page}/${width}/${theme}/${dir}: mobile Home closes`);
        await evaluate("document.querySelector('#mobileMenu [data-bs-dismiss=offcanvas]').click()");await pause();
        await check("!document.getElementById('mobileMenu').classList.contains('show')",`${page}/${width}/${theme}/${dir}: menu closes`);
      }
    }
  }
  console.log(`${page}: navigation checked`);
}
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await navigate('index.html');
await evaluate("localStorage.setItem('securekey_theme','light');localStorage.setItem('securekey_direction','ltr')");await navigate('index.html');
await evaluate("document.querySelector('.theme-toggle-btn').click();document.querySelector('.rtl-toggle-btn').click()");
await check("localStorage.getItem('securekey_theme')==='dark'&&localStorage.getItem('securekey_direction')==='rtl'",'Preferences are saved');
await navigate('contact.html');
await check("document.documentElement.dataset.bsTheme==='dark'&&document.documentElement.dir==='rtl'&&document.documentElement.lang==='en'",'Theme and direction persist between pages without changing language');
await send('Page.reload');await pause();
await check("document.documentElement.dataset.bsTheme==='dark'&&document.documentElement.dir==='rtl'",'Preferences survive reload');
await evaluate("document.querySelector('.rtl-toggle-btn').click()");
await check("document.querySelector('.schedule-field').hidden&&document.getElementById('preferredDate').disabled",'Emergency hides scheduling');
await evaluate("document.getElementById('urgencyStandard').click()");
await check("document.getElementById('preferredDate').required&&!document.getElementById('preferredDate').disabled&&!document.querySelector('.schedule-field').hidden",'Appointment requires date and time');
await evaluate("document.getElementById('preferredDate').value='2000-01-01'");
await check("!document.getElementById('preferredDate').checkValidity()",'Past appointment dates fail');
await evaluate("document.getElementById('urgencyEmergency').click();document.getElementById('contactForm').requestSubmit()");
await check("document.activeElement.id==='fullName'",'Empty contact request focuses name');
await evaluate("document.getElementById('fullName').value='   ';document.getElementById('fullName').dispatchEvent(new Event('input'))");
await check("!document.getElementById('fullName').checkValidity()",'Whitespace-only name fails');
await evaluate("document.getElementById('phoneNumber').value='abc5551234567';document.getElementById('phoneNumber').dispatchEvent(new Event('input'))");
await check("!document.getElementById('phoneNumber').checkValidity()",'Invalid phone characters fail');
await evaluate(`for(const[id,value]of Object.entries({fullName:'Alex Test',phoneNumber:'(555) 123-4567',emailAddress:'alex@example.com',addressArea:'Westside',serviceDetails:'Please repair my lock'})){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input'));}document.getElementById('serviceType').selectedIndex=1;document.getElementById('contactForm').requestSubmit()`);
await check("!document.getElementById('bookingFeedback').hidden&&location.pathname==='/contact.html'",'Placeholder endpoint blocks sending and shows honest feedback');
await evaluate("document.getElementById('contactForm').action='https://formsubmit.co/verified-inbox@test.invalid';document.getElementById('contactForm').addEventListener('submit',e=>e.preventDefault());document.getElementById('contactForm').requestSubmit()");
await check(`document.querySelector('input[name=_next]').value===${JSON.stringify(origin+'/thank-you.html')}`,'Configured FormSubmit computes absolute success URL (no network submission)');
await evaluate("document.querySelector('.faq-list summary').click()");
await check("document.querySelector('.faq-list details').open",'Contact FAQ opens');
await navigate('blog.html?q=smart');
await check("document.getElementById('blogSearchInput').value==='smart'&&[...document.querySelectorAll('.blog-article-item')].filter(e=>!e.hidden).length===2",'Sidebar search query filters the archive');
await navigate('blog.html?category=home%20security');
await check("[...document.querySelectorAll('.blog-article-item')].filter(e=>!e.hidden).length===3&&document.querySelector('.blog-category-filter.active').dataset.category==='home security'",'Sidebar category query filters the archive');
await evaluate("document.querySelector('[data-category=all]').click();const e=document.getElementById('blogSearchInput');e.value='zzzzzz';e.dispatchEvent(new Event('input'))");
await check("!document.getElementById('blogNoResults').hidden&&[...document.querySelectorAll('.blog-article-item')].every(e=>e.hidden)",'Blog no-results feedback appears');
await navigate('blog-details-1.html');
await check("[...document.querySelectorAll('a[aria-label^=\"Share on\"]')].every(e=>e.href.includes(encodeURIComponent(location.href))&&e.target==='_blank'&&e.rel.includes('noopener'))",'Article sharing links use the current URL safely');
await navigate('index-2.html');
await evaluate("document.querySelector('.compare-toggle-btn[data-mode=smart]').click()");
await check("document.getElementById('viewTraditional').classList.contains('d-none')&&!document.getElementById('viewSmart').classList.contains('d-none')",'Before/after switches to smart access');
await evaluate("document.querySelector('.compare-toggle-btn[data-mode=traditional]').click()");
await check("!document.getElementById('viewTraditional').classList.contains('d-none')&&document.getElementById('viewSmart').classList.contains('d-none')",'Before/after switches back');
await navigate('index.html');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
for(const dir of ['ltr','rtl']){
  await evaluate(`document.documentElement.dir='${dir}'`);await pause();
  await evaluate("document.querySelector('[data-slide-next]').click()");await pause();
  await check("document.querySelector('.slider-status').textContent==='Story 2 of 3'&&Math.abs(Math.abs(document.querySelector('.testimonial-track').scrollLeft)-document.querySelector('.testimonial-track').clientWidth)<2",`Testimonial advances in ${dir}`);
  await evaluate("document.querySelector('[data-slide-prev]').click()");await pause();
  await check("document.querySelector('.slider-status').textContent==='Story 1 of 3'&&Math.abs(document.querySelector('.testimonial-track').scrollLeft)<2",`Testimonial reverses in ${dir}`);
}
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await navigate('login.html');
await evaluate("document.getElementById('loginForm').requestSubmit()");
await check("document.activeElement.id==='loginEmail'",'Login invalid submission focuses email');
await evaluate("document.getElementById('loginEmail').value='alex@example.com';document.getElementById('loginPassword').value='Example123';document.getElementById('loginForm').requestSubmit()");
await check("document.querySelector('#loginForm .form-alert').textContent.includes('no sign-in')&&location.pathname==='/login.html'",'Login reports frontend validation without fake authentication');
await evaluate("document.querySelector('[data-bs-target=\"#forgotPasswordModal\"]').click()");await pause();
await check("document.getElementById('forgotPasswordModal').classList.contains('show')",'Password recovery modal opens');
await evaluate("const f=document.getElementById('forgotPasswordForm');f.querySelector('input[type=email]').value='invalid';f.requestSubmit()");
await check("!document.querySelector('#forgotPasswordForm .form-alert')",'Recovery rejects invalid email');
await evaluate("const f=document.getElementById('forgotPasswordForm');f.querySelector('input[type=email]').value='alex@example.com';f.requestSubmit()");
await check("document.querySelector('#forgotPasswordForm .form-alert').textContent.includes('no email was sent')",'Recovery does not claim delivery');
await navigate('register.html');
await evaluate(`for(const[id,value]of Object.entries({regName:'Alex Test',regEmail:'alex@example.com',regPhone:'5551234567',regPassword:'Example123',regConfirmPassword:'Mismatch'}))document.getElementById(id).value=value;document.getElementById('acceptTerms').checked=true;document.getElementById('registerForm').requestSubmit()`);
await check("!document.getElementById('regConfirmPassword').checkValidity()",'Mismatched passwords fail');
await evaluate("document.getElementById('regConfirmPassword').value='Example123';document.getElementById('regConfirmPassword').dispatchEvent(new Event('input'));document.getElementById('acceptTerms').checked=false;document.getElementById('registerForm').requestSubmit()");
await check("!document.getElementById('acceptTerms').checkValidity()",'Registration requires terms');
await evaluate("document.getElementById('acceptTerms').checked=true;document.getElementById('registerForm').requestSubmit()");
await check("document.querySelector('#registerForm .form-alert').textContent.includes('no account has been created')",'Registration is explicitly a frontend demo');
await evaluate("document.getElementById('newsletterEmail').value='alex@example.com';document.getElementById('newsletterForm').requestSubmit()");
await check("document.querySelector('#newsletterForm .form-alert').textContent.includes('Connect an email service')",'Newsletter does not claim subscription');
await evaluate("document.querySelector('[data-demo-social]').click()");
await check("!document.querySelector('.social-feedback').hidden",'Social placeholder feedback is useful');
await navigate('coming-soon.html');
const initial=await evaluate("document.getElementById('countdownTimer').dataset.launchDate");
await send('Page.reload');await pause();
await check(`document.getElementById('countdownTimer').dataset.launchDate===${JSON.stringify(initial)}&&Number.isFinite(Number(document.getElementById('countDays').textContent))`,'Countdown has a stable configurable launch date');
await evaluate("document.getElementById('notificationForm').querySelector('input').value='alex@example.com';document.getElementById('notificationForm').requestSubmit()");
await check("document.querySelector('#notificationForm .form-alert').textContent.includes('notific')",'Launch notification form stays in the frontend demo');
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
for(const page of ['index.html','index-2.html','contact.html','login.html']){
  await navigate(page);await evaluate("document.documentElement.dir='ltr';window.scrollTo({top:0,behavior:'instant'})");await pause();
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(artifacts,page.replace('.html','')+'-mobile.png'),Buffer.from(shot.data,'base64'));
}
const report={passed:passed.length,failures:[],runtimeExceptions:exceptions,checks:passed};
fs.writeFileSync(path.join(artifacts,'interaction-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:passed.length,runtimeExceptions:exceptions.length,report:path.join(artifacts,'interaction-report.json')},null,2));
ws.close();process.exitCode=exceptions.length?1:0;
