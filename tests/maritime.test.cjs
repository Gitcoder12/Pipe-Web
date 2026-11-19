const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("src/feeds/maritime.js","utf8"),sent=[];
class FakeWebSocket{constructor(url){this.url=url;FakeWebSocket.last=this;}send(value){sent.push(JSON.parse(value));}close(){this.closed=true;}}
const window={WebSocket:FakeWebSocket};
vm.runInNewContext(source,{window,setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,clearTimeout:()=>{},Date,Map,Set,JSON,Number,String});
const feed=window.PipeWebMaritime;assert.ok(feed);feed.connect();
const ws=FakeWebSocket.last;assert.equal(ws.url,"wss://stream.openseafeed.com/v1/stream");ws.onopen();
assert.equal(sent[0].BoundingBoxes.length,7);
assert.deepEqual(sent[0].BoundingBoxes[0],[[0,-75],[60,10]]);
assert.deepEqual(sent[0].FilterMessageTypes,["PositionReport"]);
const now=Date.now();
const frame=(lat,lon,time)=>({data:JSON.stringify({MessageType:"PositionReport",MetaData:{MMSI:123456789,ShipName:"TEST",ShipType:70,latitude:lat,longitude:lon,time_utc:new Date(time).toISOString()},Message:{PositionReport:{Sog:12.4,Cog:91.2}}})});
ws.onmessage(frame(12.5,77.2,now));ws.onmessage(frame(12.6,77.3,now+60000));
assert.equal(feed.ships.size,1);assert.equal(feed.tracks.get("123456789").length,2);
assert.equal(feed.snapshot().tracks[0].shipType,70);
ws.onmessage({data:JSON.stringify({MessageType:"ShipStaticData",MetaData:{MMSI:123456789}})});
assert.equal(feed.ships.size,1);feed.disconnect();assert.equal(feed.status,"DISCONNECTED");
console.log("Maritime tests passed: seven-region free tier and repeat-position trail validation.");
