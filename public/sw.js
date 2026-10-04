const BASE=new URL(self.registration.scope);
const root=BASE.pathname;
const PREFIX=`inventario-shell-${root}-`;
const CACHE=`${PREFIX}v2`;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll([root,`${root}icon.svg`,`${root}manifest.webmanifest`]))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith(PREFIX)||k==='inventario-shell-v1')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 const url=new URL(e.request.url);if(url.origin!==self.location.origin||e.request.method!=='GET')return;
 if(e.request.mode==='navigate')e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(root,copy));}return r;}).catch(()=>caches.match(root)));
 else if(url.pathname.startsWith(`${root}assets/`)||url.pathname===`${root}icon.svg`)e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;})));
});
