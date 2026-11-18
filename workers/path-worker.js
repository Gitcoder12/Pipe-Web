/* Pipe-Web pathfinding worker. No DOM access; safe for large imported graphs. */
"use strict";

class MinHeap {
  constructor(){this.items=[];}
  push(value){
    const a=this.items;a.push(value);let i=a.length-1;
    while(i>0){const p=(i-1)>>1;if(a[p].distance<=value.distance)break;a[i]=a[p];i=p;}
    a[i]=value;
  }
  pop(){
    const a=this.items;if(!a.length)return null;
    const root=a[0],last=a.pop();
    if(a.length){let i=0;while(true){
      const left=i*2+1,right=left+1;let smallest=i;
      if(left<a.length&&a[left].distance<a[smallest].distance)smallest=left;
      if(right<a.length&&a[right].distance<a[smallest].distance)smallest=right;
      if(smallest===i)break;a[i]=a[smallest];i=smallest;
    }a[i]=last;}
    return root;
  }
  get size(){return this.items.length;}
}

function edgeKey(a,b){return a<b?a+"-"+b:b+"-"+a;}
function edgeWeight(edge,objective){
  return edge[objective==="time"?2:objective==="distance"?3:objective==="cost"?4:5];
}
function buildGraph(nodes,edges){
  const graph=Object.create(null);
  for(const id of nodes)graph[id]=[];
  for(const edge of edges){
    const [from,to]=edge;
    if(!graph[from]||!graph[to])continue;
    graph[from].push({to,edge});
    if(!edge[6])graph[to].push({to:from,edge});
  }
  return graph;
}
function sumMetrics(edges){
  const totals={time:0,distance:0,cost:0,energy:0};
  for(const edge of edges){totals.time+=edge[2];totals.distance+=edge[3];totals.cost+=edge[4];totals.energy+=edge[5];}
  return totals;
}
function shortestPath(graph,start,end,objective,blocked,congested,avoidCongestion){
  if(!graph[start]||!graph[end])return null;
  const distances=new Map(),previous=new Map(),heap=new MinHeap();
  for(const id in graph)distances.set(id,Infinity);
  distances.set(start,0);heap.push({id:start,distance:0});
  while(heap.size){
    const current=heap.pop(),from=current.id;
    if(current.distance!==distances.get(from))continue;
    if(from===end)break;
    for(const next of graph[from]){
      const key=edgeKey(from,next.to);
      if(blocked.has(key))continue;
      const penalty=avoidCongestion&&congested.has(key)?1.65:1;
      const candidate=current.distance+edgeWeight(next.edge,objective)*penalty;
      if(candidate<distances.get(next.to)){
        distances.set(next.to,candidate);
        previous.set(next.to,{node:from,edge:next.edge});
        heap.push({id:next.to,distance:candidate});
      }
    }
  }
  if(!Number.isFinite(distances.get(end)))return null;
  const ids=[end],edges=[];let cursor=end;
  while(cursor!==start){
    const step=previous.get(cursor);if(!step)return null;
    edges.unshift(step.edge);cursor=step.node;ids.unshift(cursor);
  }
  return{ids,edges,score:distances.get(end),metrics:sumMetrics(edges)};
}
function findPaths(data){
  const graph=buildGraph(data.nodes,data.edges);
  const congested=new Set(data.congested||[]);
  const run=blocked=>shortestPath(graph,data.start,data.end,data.objective,blocked,congested,data.avoidCongestion);
  const first=run(new Set());if(!first)return[];
  const results=[first];
  if(data.alternatives&&first.edges.length){
    const candidates=new Map(),stride=Math.max(1,Math.ceil(first.edges.length/8));
    for(let i=0;i<first.edges.length;i+=stride){
      const blocked=new Set([edgeKey(first.ids[i],first.ids[i+1])]);
      const candidate=run(blocked);
      if(candidate&&candidate.ids.join("|")!==first.ids.join("|"))candidates.set(candidate.ids.join("|"),candidate);
    }
    for(const candidate of candidates.values())results.push(candidate);
    results.sort((a,b)=>a.score-b.score);
    return results.slice(0,3);
  }
  return results;
}

self.onmessage=event=>{
  const data=event.data||{};
  try{
    const paths=findPaths(data);
    self.postMessage({id:data.id,paths});
  }catch(error){
    self.postMessage({id:data.id,error:error&&error.message?error.message:String(error)});
  }
};
