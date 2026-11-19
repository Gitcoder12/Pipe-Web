"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("workers/live-api.js","utf8").replace("export default {","module.exports = {");
const module={exports:{}};
let urls=[];
const caches={default:{async match(){return null;},async put(){return true;}}};
const fetch=async input=>{
 const url=String(input);urls.push(url);
 if(url.includes("api.adsb.lol"))return new Response(JSON.stringify({ac:url.includes("/50/10/250")?[{hex:"abc123",lat:51,lon:2,flight:"TEST",gs:100,track:90,seen_pos:1,t:"A320"}]:[]}),{status:200,headers:{"content-type":"application/json"}});
 if(url.includes("rata.digitraffic.fi"))return new Response(JSON.stringify({features:[{geometry:{coordinates:[24.9,60.2]},properties:{trainNumber:7,departureDate:"2026-11-19",timestamp:"2026-11-19T10:00:00Z"}}]}),{status:200,headers:{"content-type":"application/json"}});
 throw new Error("Unexpected upstream "+url);
};
vm.runInNewContext(source,{module,Response,Request,URL,caches,fetch,Date,JSON,Number,String,Array,Map,Promise,Error});
const worker=module.exports;
async function run(){
 const ctx={waitUntil(){}};
 const bad=await worker.fetch(new Request("https://worker.test/nope"),{},ctx);assert.equal(bad.status,404);
 const air=await worker.fetch(new Request("https://worker.test/api/aircraft"),{},ctx);
 const ad=await air.json();assert.equal(ad.status,"LIVE");assert.equal(ad.aircraft.length,1);assert.equal(ad.aircraft[0].icao24,"abc123");
 assert.equal(urls.filter(u=>u.includes("api.adsb.lol")).length,6);
 const rail=await worker.fetch(new Request("https://worker.test/api/rail"),{},ctx);
 const rd=await rail.json();assert.equal(rd.trains.length,1);assert.equal(rd.trains[0].trainNumber,7);
 console.log("Worker tests passed: six sampled ADS-B regions and Finland rail GeoJSON.");
}
run().catch(error=>{console.error(error);process.exitCode=1;});
