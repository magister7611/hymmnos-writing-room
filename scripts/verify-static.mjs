import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk('dist');const textFiles=files.filter(f=>/\.(js|html|css|json|webmanifest)$/u.test(f));
for(const file of textFiles){
 const text=fs.readFileSync(file,'utf8');
 assert.ok(!/sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}/u.test(text),'Credential-like value found: '+file);
 assert.ok(!/api\.openai\.com|\/api\/(?:generate|status)|localhost:\d+|127\.0\.0\.1:\d+/u.test(text),'Server dependency found: '+file);
 assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/u.test(text),'External font dependency: '+file);
}
const index=fs.readFileSync('dist/index.html','utf8');assert.ok(/lang="ko"/u.test(index));
for(const [,link]of index.matchAll(/(?:src|href)="([^"#]+)"/gu)){
 assert.ok(!link.startsWith('/'),'Root-relative path would break project Pages: '+link);
 assert.ok(fs.existsSync(path.join('dist',link.split('?')[0])),'Missing index asset: '+link);
}
assert.ok(files.some(f=>f.endsWith('.wasm')),'WASM analyzer missing');assert.ok(files.some(f=>f.endsWith('.gmdl')),'Model missing');
assert.ok(fs.existsSync('dist/sw.js'));assert.ok(fs.existsSync('dist/.nojekyll'));
assert.ok(fs.existsSync('dist/notices/garu/LICENSE'));assert.ok(fs.existsSync('dist/notices/garu/models/NOTICE.md'));
const sw=fs.readFileSync('dist/sw.js','utf8');
const manifest=JSON.parse(sw.match(/const ASSETS=(\[[^\n]+\]);/u)[1]);
for(const p of manifest)assert.ok(p==='./'||fs.existsSync(path.join('dist',p)),'Offline asset missing: '+p);
console.log(JSON.stringify({staticFiles:files.length,totalBytes:files.reduce((n,p)=>n+fs.statSync(p).size,0),secretLikeValues:false,serverDependency:false,projectSubpathReady:true,offlineAssets:manifest.length}));
