"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
let response;
const sandbox={self:{postMessage:value=>{response=value;}}};
vm.runInNewContext(fs.readFileSync("workers/path-worker.js","utf8"),sandbox,{filename:"path-worker.js"});
const network={
  id:1,start:"A",end:"D",objective:"time",avoidCongestion:false,alternatives:true,
  nodes:["A","B","C","D"],
  edges:[
    ["A","B",1,1,1,1,false],
    ["B","D",1,1,1,1,false],
    ["A","C",2,1,1,1,false],
    ["C","D",2,1,1,1,false]
  ],
  congested:[]
};
sandbox.self.onmessage({data:network});
assert.equal(response.id,1);
assert.equal(response.paths.length,3);
assert.deepEqual(Array.from(response.paths[0].ids),["A","B","D"]);
assert.equal(response.paths[0].metrics.time,2);
assert.equal(response.paths[1].metrics.time,3);
const oneWay={...network,id:2,start:"B",end:"A",alternatives:false,edges:[["A","B",1,1,1,1,true]]};
sandbox.self.onmessage({data:oneWay});
assert.equal(response.id,2);
assert.equal(response.paths.length,0);
const reverse={...network,id:3,start:"A",end:"D",avoidCongestion:true,alternatives:false,edges:network.edges,congested:["A-B"]};
sandbox.self.onmessage({data:reverse});
assert.equal(response.paths[0].metrics.time,2);
console.log("Path worker tests passed.");
