const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("src/feeds/maritime.js", "utf8");
const sent = [];
class FakeWebSocket {
  constructor(url) { this.url=url; FakeWebSocket.last=this; }
  send(value) { sent.push(JSON.parse(value)); }
  close() { this.closed=true; }
}
const window = { WebSocket: FakeWebSocket };
vm.runInNewContext(source, { window, setInterval:()=>1, clearInterval:()=>{}, setTimeout:()=>1, clearTimeout:()=>{}, Date, Map, Set, JSON, Number, String });
const feed = window.PipeWebMaritime;
assert.ok(feed);
feed.connect([[54,-5],[72,32]]);
const ws = FakeWebSocket.last;
assert.equal(ws.url,"wss://stream.openseafeed.com/v1/stream");
ws.onopen();
assert.deepEqual(sent[0].BoundingBoxes,[[[54,-5],[72,32]]]);
assert.deepEqual(sent[0].FilterMessageTypes,["PositionReport"]);
let latest;
feed.subscribe(value=>{latest=value;});
ws.onmessage({data:JSON.stringify({MessageType:"PositionReport",MetaData:{MMSI:123456789,ShipName:"TEST VESSEL",latitude:12.5,longitude:77.2},Message:{PositionReport:{Sog:12.4,Cog:91.2}}})});
assert.equal(feed.ships.size,1);
const ship=feed.ships.get("123456789");
assert.equal(ship.name,"TEST VESSEL");
assert.equal(ship.sog,12.4);
assert.equal(ship.cog,91.2);
assert.equal(ship.lat,12.5);
assert.equal(ship.trail.length,1,"first observed position should seed the trail");
ws.onmessage({data:JSON.stringify({MessageType:"PositionReport",MetaData:{MMSI:123456789,ShipName:"TEST VESSEL",latitude:12.6,longitude:77.3,time_utc:"2026-11-19T11:00:00Z"},Message:{PositionReport:{Sog:13.1,Cog:92.4}}})});
assert.equal(feed.ships.get("123456789").trail.length,2,"new AIS positions should extend a bounded observed trail");
assert.equal(feed.ships.get("123456789").trail[1].lat,12.6);
ws.onmessage({data:JSON.stringify({MessageType:"ShipStaticData",MetaData:{MMSI:123456789}})});
assert.equal(feed.ships.size,1,"non-position reports must be ignored");
feed.disconnect();
assert.equal(feed.status,"DISCONNECTED");
console.log("Maritime feed tests passed.");
