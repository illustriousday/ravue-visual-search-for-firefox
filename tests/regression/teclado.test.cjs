'use strict';
// Desired user-control expectations; intentionally fail if a non-search button submits.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {source}=require('./harness.cjs');
const geometry=require(path.join(source,'content/geometry.js'));
const {RavueOverlaySession}=require(path.join(source,'content/overlay.js'));
function session(){
  const s=Object.create(RavueOverlaySession.prototype),sent=[];
  Object.assign(s,{geometry,selection:{x:10,y:20,width:150,height:80},closed:false,busy:false,error:'',root:{activeElement:null},render(){},bounds(){return{width:1000,height:500};},dispose(cancelled){this.closed=true;this.cancelled=cancelled;},config:{async onSubmit(rect){sent.push(rect);}}});
  return{s,sent};
}
function key(control){return{key:'Enter',target:control,composedPath:()=>[control],preventDefault(){},stopPropagation(){}};}
for(const command of ['cancel','reset','close','full'])test('KEY-01: Enter focused on '+command+' must not start a search',async()=>{const {s,sent}=session();const button={tagName:'BUTTON',dataset:{command}};s.root.activeElement=button;s.key(key(button));await Promise.resolve();assert.equal(sent.length,0,'The real submit callback must not run for a non-search control.');});
test('Enter on the selected region can submit exactly once',async()=>{const{s,sent}=session();s.root.activeElement={tagName:'DIV'};s.key(key(s.root.activeElement));await Promise.resolve();assert.equal(sent.length,1);});
test('Escape cancels a valid selection without submitting it',()=>{const{s,sent}=session();s.key({...key({}),key:'Escape'});assert.equal(sent.length,0);assert.equal(s.closed,true);assert.equal(s.cancelled,true);});
test('Enter with no selection cannot submit anything',()=>{const{s,sent}=session();s.selection=null;s.key(key({}));assert.equal(sent.length,0);});
test('double submission while busy invokes the callback once',async()=>{const{s,sent}=session();await Promise.all([s.submit(),s.submit()]);assert.equal(sent.length,1);});
