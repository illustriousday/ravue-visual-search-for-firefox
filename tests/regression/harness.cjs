'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const source=path.resolve(process.env.RAVUE_TEST_SOURCE || path.join(__dirname,'../..'));
const read=file=>fs.readFileSync(path.join(source,file),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function storage(initial={}){
  const data=structuredClone(initial);
  return {data,async get(query){return structuredClone(query===null?data:Object.fromEntries((Array.isArray(query)?query:[query]).filter(k=>k in data).map(k=>[k,data[k]])));},async set(values){Object.assign(data,structuredClone(values));},async remove(query){for(const key of Array.isArray(query)?query:[query])delete data[key];}};
}
function realm(files,extra={}){
  const context=vm.createContext({URL,URLSearchParams,console,Date,Uint8Array,Uint8ClampedArray,Uint32Array,Int32Array,Blob,File,crypto:webcrypto,structuredClone,setTimeout,clearTimeout,...extra});
  for(const file of files)vm.runInContext(read(file),context,{filename:file});
  return context;
}
async function background(options={}){
  assert.equal(typeof vm.SourceTextModule,'function','Use node --experimental-vm-modules');
  const state=options.storage||storage();const listeners={};
  const calls={create:[],update:[],remove:[],capture:[],script:[],send:[],badge:[],log:[],draw:[],network:[]};
  const active=new Map([[7,{id:41,windowId:7}],[8,{id:42,windowId:8}]]);
  const event=name=>({addListener(fn){listeners[name]=fn;}});let tabNumber=900;
  const browser={
    i18n:{getMessage(){return '';},getUILanguage(){return 'pt-BR';}},
    runtime:{getURL:file=>'moz-extension://audit-ravue/'+file,onMessage:event('message'),onInstalled:event('installed'),onStartup:event('startup')},
    storage:{session:state},menus:{onClicked:event('menu'),async removeAll(){},create(){}},commands:{onCommand:event('command')},
    action:{onClicked:event('action'),async setBadgeText(value){calls.badge.push(value);},async setTitle(){},async setBadgeBackgroundColor(){}},
    scripting:{async executeScript(request){calls.script.push(request);if(options.denyScript)throw Error('Injection denied');return []; }},
    tabs:{onUpdated:event('updated'),onRemoved:event('removed'),async query(q){return active.has(q.windowId||7)?[active.get(q.windowId||7)]:[];},
      async create(request){calls.create.push(request);if(options.failCreate)throw Error('Creation failed');return{id:tabNumber++};},
      async update(id,request){calls.update.push({id,...request});if(options.failUpdate)throw Error('Navigation failed');return{id};},
      async remove(id){calls.remove.push(id);},
      async captureVisibleTab(windowId,request){calls.capture.push({windowId,...request});if(options.denyCapture)throw Error('Capture denied');if(options.switchDuringCapture)active.set(windowId,{id:999,windowId});return options.captureDataUrl || 'data:image/png;base64,YXVkaXQ=';},
      async sendMessage(tabId,request,opt){calls.send.push({tabId,...request,...opt});if(options.noBridge&&request.type==='RV_PING')return {ok:false};if(request.type==='RV_WAIT_LAYOUT')return{ok:true,viewport:{width:1000,height:500}};if(request.type==='RV_DIRECT_IMAGE_BEGIN')return options.directResponse||{ok:false};return{ok:true};}
    }
  };
  class FakeImage {
    constructor(){this.naturalWidth=options.bitmapWidth||2000;this.naturalHeight=options.bitmapHeight||1000;this.listeners={};}
    addEventListener(type,fn){this.listeners[type]=fn;}
    set src(value){this.value=value;queueMicrotask(()=>this.listeners[options.decodeFailure?'error':'load']?.());}
    remove(){}
  }
  class FakeReader {constructor(){this.listeners={};}addEventListener(k,f){this.listeners[k]=f;}readAsDataURL(){this.result='data:image/jpeg;base64,YXVkaXQtanBlZw==';queueMicrotask(()=>this.listeners.load());}}
  const document={createElement(kind){assert.equal(kind,'canvas');return{width:0,height:0,remove(){},getContext(){return{drawImage(...args){calls.draw.push(args);},fillRect(){},fillStyle:''};},toBlob(cb,mime,quality){assert.equal(quality,.94);cb(new Blob(['audit-jpeg'],{type:mime}));}};}};
  const context=vm.createContext({browser,console:{warn(...x){calls.log.push(x.map(String));},error(...x){calls.log.push(x.map(String));}},URL,URLSearchParams,Date,Uint8Array,Uint32Array,Uint8ClampedArray,Int32Array,Blob,File,Image:options.Image||FakeImage,FileReader:options.FileReader||FakeReader,document:options.document||document,crypto:webcrypto,structuredClone,queueMicrotask,setTimeout:()=>0,clearTimeout(){},fetch:async url=>{calls.network.push(url);assert.equal(url,browser.runtime.getURL('ui/overlay.css'));if(options.failStyles)throw Error('Styles missing');return{ok:true,text:async()=>'.rv-shell{}'};}});
  const moduleCache=new Map();
  function getModule(filename){if(!moduleCache.has(filename))moduleCache.set(filename,new vm.SourceTextModule(fs.readFileSync(filename,'utf8'),{context,identifier:filename}));return moduleCache.get(filename);}
  const main=getModule(path.join(source,'background.mjs'));
  await main.link((specifier,parent)=>{const target=path.resolve(path.dirname(parent.identifier),specifier);assert.ok(target.startsWith(source+path.sep),'Unexpected import');return getModule(target);});
  await main.evaluate();await new Promise(resolve=>setImmediate(resolve));
  const sourceTab=active.get(7);
  return{browser,context,state,calls,listeners,sourceTab,setActive:(tab)=>active.set(tab.windowId,tab),message:(type,sender,rest={})=>listeners.message({type,...rest},sender),image:(srcUrl,rest={},tab=sourceTab)=>listeners.menu({menuItemId:'ravue-image',srcUrl,...rest},tab),area:(tab=sourceTab)=>listeners.menu({menuItemId:'ravue-area'},tab),sender:(host,tabId=900)=>({url:host,tab:{id:tabId,windowId:7}})};
}
module.exports={source,read,plain,storage,realm,background};
