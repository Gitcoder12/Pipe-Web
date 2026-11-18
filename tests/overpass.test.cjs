"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
let fetchCalls=0,fetchImpl;const window={PipeWebOSMCache:{async get(){return null;},async set(){return true;}}};
const context={window,Date,Math,Number,Array,Error,AbortController,setTimeout,clearTimeout,fetch:(...a)=>{fetchCalls++;return fetchImpl(...a);}};
vm.runInNewContext(fs.readFileSync("src/osm/overpass.js","utf8"),context);
const api=window.PipeWebOverpass,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
let r=api.clampBbox([1,2,1.1,2.1]);assert.equal(r.clamped,false);assert.deepEqual(Array.from(r.bbox),[1,2,1.1,2.1]);
for(const b of [[0,0,1,1],[0,0,1,.1],[0,0,.1,1],[-1,-1,1,1],[0,0,10,.01]]){r=api.clampBbox(b);assert.equal(r.clamped,true);close((r.bbox[2]-r.bbox[0])*(r.bbox[3]-r.bbox[1]),.25);}
for(const b of [[1,1,0,2],[0,0,1,1,2],["a",0,1,1]])assert.throws(()=>api.clampBbox(b));
assert.equal(api.clampBbox([0,0,.5,.5]).clamped,false);
(async()=>{
 let cacheData=null;const payload={elements:[{type:"node",id:1}]};
 window.PipeWebOSMCache={async get(){return cacheData;},async set(k,v){cacheData={key:k,...v};}};
 fetchImpl=async()=>({ok:true,json:async()=>payload});
 const fresh=await api.fetchGraph([0,0,.1,.1]);assert.equal(fresh.stale,false);assert.equal(fetchCalls,1);
 const hit=await api.fetchGraph([0,0,.1,.1]);assert.equal(hit.cached,true);assert.equal(fetchCalls,1);
 cacheData.ts=Date.now()-31*864e5;fetchImpl=async()=>{throw Error("offline");};
 const stale=await api.fetchGraph([0,0,.1,.1]);assert.equal(stale.stale,true);assert.equal(stale.graph.elements.length,1);
 cacheData=null;fetchImpl=async()=>{const e=Error("timeout");e.name="AbortError";throw e;};
 const timed=await api.fetchGraph([0,0,.1,.1]);assert.match(timed.error,/timed out/);
 console.log("Overpass tests passed: bbox cap, invalid bounds, fetch, cache hit, stale fallback and timeout.");
})().catch(e=>{console.error(e);process.exitCode=1;});
