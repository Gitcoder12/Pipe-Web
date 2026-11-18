"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
let response;
const sandbox={self:{postMessage:value=>{response=value;}}};
vm.runInNewContext(fs.readFileSync("workers/path-worker.js","utf8"),sandbox,{filename:"path-worker.js"});
const network={
 id:1,start:"A",end:"D",objective:"distance",avoidCongestion:false,alternatives:true,
 nodes:["A","B","C","D"],
 nodeCoords:[["A",0,0],["B",0,.01],["C",.01,.01],["D",0,.02]],
 edges:[
  ["A","B",1,1.111,1,1,false],["B","D",1,1.111,1,1,false],
  ["A","C",1,1.572,1,1,false],["C","D",1,1.572,1,1,false]
 ],congested:[]
};
sandbox.self.onmessage({data:network});
assert.equal(response.id,1);
assert.equal(response.paths.length,2);
assert.deepEqual(Array.from(response.paths[0].ids),["A","B","D"]);
assert.ok(Math.abs(response.paths[0].metrics.distance-2.222)<.001);
assert.ok(Math.abs(response.paths[1].metrics.distance-3.144)<.001);
const oneWay={...network,id:2,start:"B",end:"A",alternatives:false,edges:[["A","B",1,1.111,1,1,true]]};
sandbox.self.onmessage({data:oneWay});
assert.equal(response.paths.length,0);
const congestion={...network,id:3,alternatives:false,avoidCongestion:true,congested:["A-B"]};
sandbox.self.onmessage({data:congestion});
assert.ok(Math.abs(response.paths[0].score-2.944)<.01);
const dateline={id:4,start:"W",end:"E",objective:"distance",alternatives:false,nodes:["W","E"],nodeCoords:[["W",0,179.9],["E",0,-179.9]],edges:[["W","E",1,22.239,1,1,false]],congested:[]};
sandbox.self.onmessage({data:dateline});
assert.equal(response.paths.length,1);
assert.ok(Math.abs(response.paths[0].score-22.239)<.01);
const same={...dateline,id:5,end:"W"};
sandbox.self.onmessage({data:same});
assert.equal(response.paths.length,1);
assert.equal(response.paths[0].score,0);
const disconnected={...dateline,id:6,start:"W",end:"E",edges:[]};
sandbox.self.onmessage({data:disconnected});
assert.equal(response.paths.length,0);
const nodes=Array.from({length:100000},(_,i)=>"n"+i);
const edges=Array.from({length:99999},(_,i)=>[nodes[i],nodes[i+1],1,1,1,1,false]);
sandbox.self.onmessage({data:{id:7,start:nodes[0],end:nodes.at(-1),objective:"distance",nodes,edges,alternatives:false}});
assert.equal(response.paths.length,1);
assert.equal(response.paths[0].edges.length,99999);
console.log("A* worker tests passed: optimal path, alternatives, one-way, congestion, antimeridian, same-node, disconnected and 100k-node chain.");
