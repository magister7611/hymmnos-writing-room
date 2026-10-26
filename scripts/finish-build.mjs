import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const list=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name)):[path.join(dir,e.name)]);
fs.writeFileSync('dist/.nojekyll','');
const files=list('dist').map(p=>p.replaceAll('\\','/').replace(/^dist\//u,''));
const stamp=crypto.createHash('sha256');for(const p of files)stamp.update(fs.readFileSync(path.join('dist',p)));
const version=stamp.digest('hex').slice(0,16);
const sw=`const PREFIX='hymmnos-browser-'+new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi,'_')+'-';
const CACHE=PREFIX+'${version}';
const ASSETS=${JSON.stringify(['./',...files.filter(p=>!p.split('/').some(s=>s.startsWith('.'))).map(p=>'./'+p)])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(c=>c.match(new URL('./',self.registration.scope)))));return;}
event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));});
`;
fs.writeFileSync('dist/sw.js',sw);
fs.mkdirSync('public/notices',{recursive:true});
console.log(JSON.stringify({staticFiles:files.length+1,build:version,serverRequired:false}));
