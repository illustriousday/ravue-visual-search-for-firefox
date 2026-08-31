'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {background,realm}=require('./harness.cjs');
async function lensSession({pending=true,expireAtMount=false}={}){
  const h=await background();if(pending){await h.image('https://example.org/full.png');await h.message('RV_START_GOOGLE_STAGE',h.sender(h.browser.runtime.getURL('results.html')));}
  let mounted=0,removed=0;const events=[];
  realm(['content/lens-ready.js'],{
    document:{readyState:'complete'},
    browser:{runtime:{onMessage:{addListener(){}},async sendMessage(m){events.push(m.type);return h.message(m.type,h.sender('https://lens.google.com/'));}}},
    RavueLoadingScreen:{mount(){mounted++;if(expireAtMount)h.state.data['ravue.pending.900'].expiresAt=Date.now()-1;},remove(){removed++;}}
  });
  await new Promise(resolve=>setImmediate(resolve));
  await h.listeners.updated(900,{status:'complete'});
  return{h,mounted,removed,events};
}
test('normal Lens completion removes the preparation cover',async()=>{const r=await lensSession();assert.equal(r.mounted,1);assert.equal(r.removed,1);assert.deepEqual(Object.keys(r.h.state.data),[]);});
test('ordinary Lens navigation does not mount a preparation cover',async()=>{const r=await lensSession({pending:false});assert.equal(r.mounted,0);});
test('LENS-02: expiring the pending operation during load must not leave a permanent cover',async()=>{
  const r=await lensSession({expireAtMount:true});
  assert.equal(r.mounted,1);assert.deepEqual(Object.keys(r.h.state.data),[]);
  assert.ok(r.removed>=1,'The operation expired and no background reveal remains; the content script must remove its cover.');
});
