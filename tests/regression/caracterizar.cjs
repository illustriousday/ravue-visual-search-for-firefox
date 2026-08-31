'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {source,read,realm,storage,background,plain}=require('./harness.cjs');
const report={at:new Date().toISOString(),node:process.version,scope:'Fresh local characterization, not a Firefox/Google end-to-end test.',observations:[],performance:[]};
(async()=>{
  for(const sourceUrl of ['http://127.0.0.1/private.png','http://192.168.1.10/private.jpg','http://intranet/secret.png','https://example.org/image?access_token=example-only']){
    const h=await background();await h.image(sourceUrl);const route=await h.context.RavuePendingStore.route(900);
    const expected=sourceUrl.startsWith('https://example.org/');
    assert.equal(Boolean(route),expected);report.observations.push({id:'URL-01',input:sourceUrl,accepted:route?.sourceUrl||false,meaning:'Recognizable local addresses are excluded. Syntactic eligibility still does not establish public reachability or remove sensitive query parameters.'});
  }
  const h=await background();await h.image('https://example.org/x.png');await h.message('RV_START_GOOGLE_STAGE',h.sender(h.browser.runtime.getURL('results.html')));
  await h.listeners.updated(900,{status:'complete'},{url:'https://lens.google.com/uploadbyurl?example-only',title:'403'});
  assert.equal(await h.context.RavuePendingStore.route(900),null);
  report.observations.push({id:'LENS-01',meaning:'Completion clears the route without checking HTTP status or semantic success; no fallback JPEG follows a failed accepted URL.'});
  const s=storage(),c=realm(['shared/session-store.js'],{browser:{storage:{session:s}}});
  const token='a'.repeat(32),payload={dataUrl:'data:image/jpeg;base64,YQ==',width:1,height:1,mimeType:'image/jpeg'};
  await c.RavueSessionStore.put(token,payload,1000);
  const copies=await Promise.all([c.RavueSessionStore.take(token,1001),c.RavueSessionStore.take(token,1001)]);
  assert.equal(copies.filter(Boolean).length,1);report.observations.push({id:'STATE-01',concurrentConsumers:copies.filter(Boolean).length,meaning:'The in-memory claim now prevents concurrent consumers from receiving duplicate payloads in this background instance.'});
  const smart=require(path.join(source,'content/smart-selection.js'));
  for(const kind of ['uniform','noise','caption']){
    const data=new Uint8ClampedArray(960*960*4);let seed=716216;
    for(let y=0;y<960;y++)for(let x=0;x<960;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=kind==='noise'?(seed>>>24):kind==='caption'?(x>120&&x<840&&y>300&&y<630?240:35):120;const i=4*(960*y+x);data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=255;}
    const times=[];let selected;
    for(let n=0;n<7;n++){const started=performance.now();selected=smart.select({imageData:{width:960,height:960,data},point:{x:480,y:480},viewport:{width:960,height:960},target:{kind:'media',rect:{x:0,y:0,width:960,height:960}}});times.push(performance.now()-started);assert.ok(selected.rect.width>0&&selected.rect.height>0);}
    report.performance.push({pattern:kind,analysisPixels:921600,iterations:7,elapsedMs:times.map(x=>+x.toFixed(2)),medianMs:+[...times].sort((a,b)=>a-b)[3].toFixed(2),maxMs:+Math.max(...times).toFixed(2),selection:plain(selected)});
  }
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
