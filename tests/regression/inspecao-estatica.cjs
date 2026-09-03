'use strict';
// Read-only inspection of the packaged candidate; this is NOT addons-linter.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const base=path.resolve(process.env.RAVUE_PACKAGE_DIR || require('./harness.cjs').source);
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name==='tests'?[]:e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(base).map(p=>path.relative(base,p).split(path.sep).join('/')).sort();
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const manifest=JSON.parse(read('manifest.json'));
const checks=[];
function check(id,detail,fn){try{fn();checks.push({id,detail,ok:true});}catch(error){checks.push({id,detail,ok:false,error:error.message});}}
check('manifest', 'MV3, version, public ID, minimum desktop version, data declaration',()=>{
 assert.equal(manifest.manifest_version,3);assert.equal(manifest.version,'2.1.8');
 assert.equal(manifest.browser_specific_settings.gecko.id,'{351e58ce-b7a8-4e88-b53f-d23acc464659}');
 assert.equal(manifest.browser_specific_settings.gecko.strict_min_version,'142.0');
 assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions,{required:['websiteContent'],optional:[]});
 assert.equal('gecko_android' in manifest.browser_specific_settings,false);
});
check('privileges','Exact reviewed permission set and packaged event background',()=>{
 assert.deepEqual(manifest.permissions,['activeTab','menus','scripting','storage']);
 assert.deepEqual(manifest.host_permissions,['https://images.google.com/*','https://lens.google.com/*']);
 assert.deepEqual(manifest.background,{scripts:['background.mjs'],type:'module'});
 assert.equal(manifest.web_accessible_resources,undefined);
 assert.equal(manifest.content_security_policy.extension_pages,"script-src 'self'; object-src 'none'; base-uri 'none'; upgrade-insecure-requests");
});
const references=[];
function ref(from,value,relative=false){
 if(/^(?:https?:|data:|#)/i.test(value))return;
 const target=path.posix.normalize(relative?path.posix.join(path.posix.dirname(from),value):value).split(/[?#]/)[0];
 references.push({from,target});assert.ok(files.includes(target),`${from}: missing ${target}`);
}
check('references','Manifest, HTML assets, literal imports, injections and runtime.getURL paths exist',()=>{
 for(const p of Object.values(manifest.icons))ref('manifest.json',p);
 for(const p of Object.values(manifest.action.default_icon))ref('manifest.json',p);
 ref('manifest.json',manifest.action.default_popup);
 for(const p of manifest.background.scripts)ref('manifest.json',p);
 for(const cs of manifest.content_scripts)for(const p of [...(cs.js||[]),...(cs.css||[])])ref('manifest.json',p);
 for(const file of files){
  if(/\.html$/.test(file))for(const m of read(file).matchAll(/(?:src|href)=["']([^"']+)["']/g))ref(file,m[1],true);
  if(/\.(?:mjs|js)$/.test(file)){
   const code=read(file);
   for(const m of code.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g))ref(file,m[1],true);
   for(const m of code.matchAll(/getURL\(["']([^"']+)["']\)/g))ref(file,m[1]);
   for(const m of code.matchAll(/["'](content\/[^"']+\.js)["']/g))ref(file,m[1]);
  }
 }
});
const locales=Object.fromEntries(['pt_BR','en'].map(l=>[l,JSON.parse(read(`_locales/${l}/messages.json`))]));
const usedKeys=new Set();
check('locales','Both locales have the same nonempty keys; explicit message references resolve',()=>{
 assert.equal(manifest.default_locale,'pt_BR');assert.deepEqual(Object.keys(locales.en).sort(),Object.keys(locales.pt_BR).sort());
 for(const data of Object.values(locales))for(const [key,value]of Object.entries(data))assert.ok(typeof value.message==='string'&&value.message.length>0,key);
 for(const file of files.filter(f=>/\.(?:mjs|js|html|json)$/.test(f))){
  const code=read(file);
  for(const m of code.matchAll(/__MSG_(\w+)__/g))usedKeys.add(m[1]);
  for(const m of code.matchAll(/data-i18n=["'](\w+)["']/g))usedKeys.add(m[1]);
  for(const m of code.matchAll(/\b(?:t|text|message|getMessage)\(\s*["'](\w+)["']/g))usedKeys.add(m[1]);
  for(const m of code.matchAll(/message\(browserApi,\s*["'](\w+)["']/g))usedKeys.add(m[1]);
 }
 for(const key of usedKeys)assert.ok(locales.en[key]&&locales.pt_BR[key],key);
});
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
const pngs=[];
check('png','All six PNG icons have valid chunk CRCs, declared dimensions and decodable scanlines',()=>{
 for(const file of files.filter(f=>/^icons\/.*\.png$/.test(f))){
  const b=fs.readFileSync(path.join(base,file));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  let offset=8,ihdr=null,ended=false;const idat=[];
  while(offset<b.length){const n=b.readUInt32BE(offset),type=b.toString('ascii',offset+4,offset+8),data=b.subarray(offset+8,offset+8+n);
   assert.equal(crc32(b.subarray(offset+4,offset+8+n)),b.readUInt32BE(offset+8+n));
   if(type==='IHDR')ihdr=data;if(type==='IDAT')idat.push(data);if(type==='IEND')ended=true;offset+=12+n;
  }
  assert.equal(offset,b.length);assert.ok(ihdr&&ended);
  const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),depth=ihdr[8],color=ihdr[9];
  assert.equal(width,Number(file.match(/-(\d+)\.png$/)[1]));assert.equal(height,width);assert.equal(depth,8);assert.equal(ihdr[12],0);
  const channels=({0:1,2:3,4:2,6:4})[color];assert.ok(channels);
  const raw=zlib.inflateSync(Buffer.concat(idat)),stride=1+width*channels;assert.equal(raw.length,stride*height);
  for(let row=0;row<height;row++)assert.ok(raw[row*stride]<=4);
  pngs.push({file,width,height,depth,color,decodedBytes:raw.length});
 }
 assert.equal(pngs.length,6);
});
const runtime=files.filter(f=>/\.(js|mjs|html|css|svg)$/.test(f));
const hitLines=(regex)=>runtime.flatMap(file=>read(file).split('\n').flatMap((line,i)=>regex.test(line)?[{file,line:i+1,text:line.trim()}]:[]));
const prohibited=hitLines(/\beval\s*\(|\bnew\s+Function\s*\(|XMLHttpRequest|\bWebSocket\b|sendBeacon|browser\.(?:cookies|history|webRequest|webNavigation|downloads)\b|storage\.(?:local|sync)\b/);
check('no-obvious-dynamic-or-persistent-sinks','Text scan for selected dangerous sinks; not a proof of absence of all vulnerabilities',()=>assert.deepEqual(prohibited,[]));
const sinks=hitLines(/innerHTML|outerHTML|insertAdjacentHTML|\bfetch\(|tabs\.(?:create|update)|storageArea\.(?:set|get|remove)/);
check('static-html-templates','Both innerHTML templates are packaged constants without interpolation',()=>{
 for(const file of ['content/overlay.js','content/loading-screen.js']){
  const matches=[...read(file).matchAll(/\.innerHTML\s*=\s*`([\s\S]*?)`/g)];assert.equal(matches.length,1);assert.equal(matches[0][1].includes('${'),false);
 }
});
check('no-remote-executable-assets','No remote HTML script source or remote JS import is present in packaged text',()=>{
 for(const file of runtime){const code=read(file);assert.doesNotMatch(code,/<script[^>]+src=["']https?:\/\//i);assert.doesNotMatch(code,/(?:from\s*|import\s*\()["']https?:\/\//);}
 assert.equal(files.some(f=>/\.(?:xpi|zip|exe|dll|so|wasm|map)$/i.test(f)),false);
});
const markupFindings={
 panelShortcutRowInHTML:read('popup/popup.html').includes('shortcut-row'),
 shortcutStillRegistered:manifest.commands['open-ravue'].suggested_key.default,
 overlayModal:read('content/overlay.js').includes('"aria-modal", "true"'),
 reducedMotion:['popup/popup.css','ui/overlay.css','ui/results.css','ui/upload.css','content/loading-screen.js'].map(file=>({file,declared:read(file).includes('prefers-reduced-motion')})),
 warning:'ARIA/CSS presence is not a keyboard, screen-reader, layout or Firefox rendering pass.'
};
function luminance(hex){const [r,g,b]=hex.match(/[a-f\d]{2}/ig).map(n=>parseInt(n,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;}
function ratio(a,b){const [hi,lo]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return(hi+.05)/(lo+.05);}
const contrast=[
 ['popup light accent','#'+read('popup/popup.css').match(/--accent-two:\s*#([a-f0-9]{6})/i)[1],'#f7f8fc'],
 ['popup light muted','#'+read('popup/popup.css').match(/--muted:\s*#([a-f0-9]{6})/i)[1],'#f7f8fc'],
 ['preparation light accent','#'+read('content/loading-screen.js').match(/--accent:\s*#([a-f0-9]{6})/i)[1],'#f6f7fb'],
 ['preparation light muted','#'+read('content/loading-screen.js').match(/--muted:\s*#([a-f0-9]{6})/i)[1],'#f6f7fb'],
 ['dark muted','#a8b3c6','#080b16'],['primary button at cyan stop','#07111c','#67e8f9'],
].map(([label,foreground,background])=>({label,foreground,background,ratio:ratio(foreground,background),normalTextMinimum:4.5,meetsBaseColorPair:ratio(foreground,background)>=4.5}));
const report={at:new Date().toISOString(),scope:'Packaged text, assets and declared colors only; no official validator or browser renderer.',checks,references,localeKeys:Object.keys(locales.en).length,explicitUsedLocaleKeys:usedKeys.size,pngs,sinks,markupFindings,contrast,contrastCaveat:'Base colors only. Gradients, alpha surfaces, focus states, OS themes, font zoom and actual compositing require a real rendered audit.'};
if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(checks.some(c=>!c.ok))process.exitCode=1;
