/* Pipe-Web v0.1.0 — deterministic path optimization demo. No external runtime dependencies. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const domains = {
    road:{name:"METRO / URBAN ROAD NETWORK",nodes:[["A","Origin",70,220],["B","North Gate",205,95],["C","West Hub",205,220],["D","South Gate",205,350],["E","Central",390,95],["F","Midtown",390,220],["G","South Hub",390,350],["H","East Gate",575,95],["I","East Hub",575,220],["J","South East",575,350],["K","Destination",800,220],["L","Airport Link",710,60]],edges:[["A","B",8,5,4,2],["A","C",5,3,2,1],["A","D",7,4,3,2],["B","E",5,3,2,1],["B","F",8,4,3,3],["C","E",7,4,2,2],["C","F",4,2,2,1],["C","G",8,4,3,2],["D","F",7,3,3,2],["D","G",4,2,2,1],["E","H",4,2,2,1],["E","I",7,4,3,2],["F","H",7,3,3,2],["F","I",4,2,2,1],["F","J",8,5,4,3],["G","I",7,3,2,2],["G","J",4,2,2,1],["H","K",8,4,3,2],["H","L",3,1,1,1],["I","K",5,2,2,1],["J","K",6,3,2,2],["L","K",6,3,2,1]],congested:["B-F","E-I","F-J"],units:{time:"min",distance:"km",cost:"cr",energy:"kWh"}},
    pipeline:{name:"REGIONAL / FLUID TRANSMISSION GRID",nodes:[["A","Source",70,220],["B","Valve 01",210,95],["C","Junction 02",210,220],["D","Valve 03",210,350],["E","Pump 01",390,95],["F","Manifold",390,220],["G","Pump 02",390,350],["H","Junction 04",575,95],["I","Junction 05",575,220],["J","Valve 06",575,350],["K","Terminal",800,220],["L","Reserve",710,60]],edges:[["A","B",7,4,3,2],["A","C",4,2,2,1],["A","D",8,5,4,2],["B","E",4,2,2,1],["B","F",7,4,3,2],["C","E",6,3,2,2],["C","F",3,2,1,1],["C","G",8,4,3,2],["D","F",7,4,3,2],["D","G",4,2,2,1],["E","H",3,2,1,1],["E","I",7,4,3,2],["F","H",7,4,3,2],["F","I",4,2,2,1],["F","J",8,5,4,3],["G","I",6,3,2,2],["G","J",4,2,2,1],["H","K",7,4,3,2],["H","L",3,1,1,1],["I","K",5,2,2,1],["J","K",6,3,2,2],["L","K",6,3,2,1]],congested:["B-F","E-I","F-J"],units:{time:"min",distance:"km",cost:"cr",energy:"kWh"}},
    rail:{name:"INTERCITY / RAIL CORRIDOR NETWORK",nodes:[["A","Origin",70,220],["B","North Station",205,95],["C","West Junction",205,220],["D","South Station",205,350],["E","Central",390,95],["F","Interchange",390,220],["G","South Junction",390,350],["H","East Station",575,95],["I","East Junction",575,220],["J","Freight Yard",575,350],["K","Destination",800,220],["L","Express Link",710,60]],edges:[["A","B",8,6,5,3],["A","C",6,4,3,2],["A","D",9,7,5,3],["B","E",4,3,2,1],["B","F",8,5,4,3],["C","E",7,4,3,2],["C","F",4,3,2,1],["C","G",8,5,4,3],["D","F",7,4,3,2],["D","G",4,3,2,1],["E","H",4,3,2,1],["E","I",7,4,3,2],["F","H",7,4,3,2],["F","I",4,3,2,1],["F","J",8,5,4,3],["G","I",7,4,3,2],["G","J",4,3,2,1],["H","K",8,5,4,3],["H","L",3,2,1,1],["I","K",5,3,2,1],["J","K",6,4,3,2],["L","K",6,4,3,2]],congested:["B-F","E-I","F-J"],units:{time:"min",distance:"km",cost:"cr",energy:"kWh"}},
    data:{name:"EDGE / DATA TRANSPORT NETWORK",nodes:[["A","Client",70,220],["B","Edge 01",205,95],["C","POP West",205,220],["D","Edge 02",205,350],["E","Core 01",390,95],["F","IXP",390,220],["G","Core 02",390,350],["H","Edge 03",575,95],["I","POP East",575,220],["J","Edge 04",575,350],["K","Server",800,220],["L","Cache",710,60]],edges:[["A","B",8,6,3,5],["A","C",5,4,2,3],["A","D",7,5,3,4],["B","E",5,4,2,3],["B","F",8,5,3,5],["C","E",7,5,2,4],["C","F",4,3,2,2],["C","G",8,6,3,5],["D","F",7,5,2,4],["D","G",4,3,2,2],["E","H",4,3,2,2],["E","I",7,5,3,4],["F","H",7,5,3,4],["F","I",4,3,2,2],["F","J",8,6,3,5],["G","I",7,5,2,4],["G","J",4,3,2,2],["H","K",8,6,3,5],["H","L",3,2,1,1],["I","K",5,4,2,3],["J","K",6,4,2,3],["L","K",6,4,2,3]],congested:["B-F","E-I","F-J"],units:{time:"ms",distance:"hops",cost:"credits",energy:"J"}},
    robot:{name:"AUTONOMOUS / ROBOT NAVIGATION GRID",nodes:[["A","Start",70,220],["B","Waypoint 01",205,95],["C","Waypoint 02",205,220],["D","Waypoint 03",205,350],["E","Waypoint 04",390,95],["F","Waypoint 05",390,220],["G","Waypoint 06",390,350],["H","Waypoint 07",575,95],["I","Waypoint 08",575,220],["J","Waypoint 09",575,350],["K","Goal",800,220],["L","Safe Zone",710,60]],edges:[["A","B",8,5,3,4],["A","C",5,3,2,2],["A","D",7,4,3,3],["B","E",5,3,2,2],["B","F",8,5,4,4],["C","E",7,4,3,3],["C","F",4,2,2,2],["C","G",8,5,4,4],["D","F",7,4,3,3],["D","G",4,2,2,2],["E","H",4,2,2,2],["E","I",7,4,3,3],["F","H",7,4,3,3],["F","I",4,2,2,2],["F","J",8,5,4,4],["G","I",7,4,3,3],["G","J",4,2,2,2],["H","K",8,5,3,4],["H","L",3,1,1,1],["I","K",5,3,2,2],["J","K",6,3,2,3],["L","K",6,3,2,2]],congested:["B-F","E-I","F-J"],units:{time:"s",distance:"m",cost:"risk",energy:"Wh"}}
  };
  const labels={time:"Fastest",distance:"Shortest",cost:"Lowest cost",energy:"Lowest energy"};
  let domain="road",paths=[],selected=0,paused=false,particles=[],animFrame=0,lastTime=0;
  const nodeMap=()=>Object.fromEntries(domains[domain].nodes.map(n=>[n[0],{id:n[0],name:n[1],x:n[2],y:n[3],lat:n[4],lng:n[5]}]));
  const edgeId=(a,b)=>[a,b].sort().join("-");
  function metric(edge,obj){return edge[obj==="time"?2:obj==="distance"?3:obj==="cost"?4:5]}
  // Path search runs in a dedicated worker so large graphs never block map/UI interaction.
  let pathWorker=null,pathRequestId=0;
  const pathRequests=new Map();
  function getPathWorker(){
    if(pathWorker)return pathWorker;
    if(!("Worker" in window))throw new Error("This browser does not support Web Workers.");
    pathWorker=new Worker("workers/path-worker.js");
    pathWorker.onmessage=event=>{
      const {id,paths,error}=event.data||{},pending=pathRequests.get(id);
      if(!pending)return;
      pathRequests.delete(id);
      if(error)pending.reject(new Error(error));else pending.resolve(paths||[]);
    };
    pathWorker.onerror=event=>{
      const error=new Error(event.message||"Path worker failed.");
      pathRequests.forEach(p=>p.reject(error));pathRequests.clear();
      pathWorker.terminate();pathWorker=null;
    };
    return pathWorker;
  }
  function findPathsAsync(start,end,obj,avoid,alternatives){
    return new Promise((resolve,reject)=>{
      let worker;
      try{worker=getPathWorker()}catch(error){reject(error);return}
      const id=++pathRequestId;
      pathRequests.set(id,{resolve,reject});
      worker.postMessage({id,start,end,objective:obj,avoidCongestion:avoid,alternatives,
        nodes:domains[domain].nodes.map(n=>n[0]),
        nodeCoords:domains[domain].nodes.filter(n=>Number.isFinite(Number(n[4]))&&Number.isFinite(Number(n[5]))).map(n=>[n[0],n[4],n[5]]),
        edges:domains[domain].edges,
        congested:domains[domain].congested
      });
    });
  }
  function populateSelects(){const ns=domains[domain].nodes,opts=ns.map(n=>`<option value="${n[0]}">${n[0]} — ${n[1]}</option>`).join("");$("origin").innerHTML=opts;$("destination").innerHTML=opts;$("origin").value=ns[0]?.[0]||"";$("destination").value=ns[ns.length-1]?.[0]||""}
  async function optimize(){
    const a=$("origin").value,b=$("destination").value;
    if(a===b){paths=[];selected=0;renderMap();renderResults();$("mapHint").textContent="Origin and destination are the same location."; $("resultCount").textContent="SAME ENDPOINT";toast("Choose two different endpoints.");return}
    const button=$("findBtn"),original=button.textContent;
    button.disabled=true;button.textContent="CALCULATING IN WORKER…";
    $("mapHint").textContent="Calculating routes off the main thread…";
    try{
      paths=await findPathsAsync(a,b,$("objective").value,$("avoidCongestion").checked,$("showAlternatives").checked);
      selected=0;renderMap();renderResults();
      $("mapHint").textContent=paths.length?`${paths.length} viable path(s) · ${labels[$("objective").value].toLowerCase()} route highlighted`:"No route found";
      $("resultCount").textContent=paths.length?`${paths.length} PATHS FOUND`:"NO PATH FOUND";
      if(!paths.length)toast("No connected route found.");
    }catch(error){$("mapHint").textContent=error.message||"Path calculation failed.";toast(error.message||"Path calculation failed.");}
    finally{button.disabled=false;button.textContent=original;}
  }
  function renderMap(){
    const svg=$("networkMap"),rankClasses=["rank-fast","rank-medium","rank-slow"];
    let out="";
    if(domains[domain].nodes.length>500){
      svg.innerHTML='<text x="450" y="205" text-anchor="middle" fill="#9aacc1" font-size="18">Large geographic network loaded</text><text x="450" y="235" text-anchor="middle" fill="#71839b" font-size="12">Switch to 2D Map or 3D Globe to explore actual coordinates</text>';
      svg.setAttribute("viewBox","0 0 900 440");$("networkName").textContent=domains[domain].name;
      $("nodeCount").textContent=`${domains[domain].nodes.length} NODES · ${domains[domain].edges.length} LINKS`;
      window.dispatchEvent(new CustomEvent("pipeweb:render"));return;
    }
    const nodes=nodeMap();
    svg.setAttribute("viewBox","0 0 900 440");
    domains[domain].edges.forEach(e=>{const a=nodes[e[0]],b=nodes[e[1]],key=edgeId(e[0],e[1]);const congestion=domains[domain].congested.includes(key)?" congested":"";out+=`<path class="edge${congestion}" d="M${a.x} ${a.y} L${b.x} ${b.y}" data-edge="${key}"/>`;});
    paths.map((p,i)=>({p,i})).reverse().forEach(({p,i})=>{
      const cls=rankClasses[Math.min(i,2)],selectedClass=i===selected?" selected":"";
      p.edges.forEach(e=>{const a=nodes[e[0]],b=nodes[e[1]];out+=`<path class="ranked-edge ${cls}${selectedClass}" d="M${a.x} ${a.y} L${b.x} ${b.y}" data-rank="${i}" data-edge="${edgeId(e[0],e[1])}"/>`;});
      if(p.edges.length){
        const a=nodes[p.ids[0]],b=nodes[p.ids[1]];
        out+=`<circle class="flow-particle ${cls}" r="4"><animateMotion dur="${2.8+i*.8}s" repeatCount="indefinite" path="M${a.x} ${a.y} L${b.x} ${b.y}"/></circle>`;
      }
    });
    const best=paths[0];
    if(best){best.edges.forEach(e=>{const a=nodes[e[0]],b=nodes[e[1]],x=(a.x+b.x)/2,y=(a.y+b.y)/2;out+=`<text class="edge-label" x="${x}" y="${y-8}" text-anchor="middle">${metric(e,$("objective").value)} ${domains[domain].units[$("objective").value]}</text>`;});}
    domains[domain].nodes.forEach(n=>{
      const [id,name,x,y]=n,kind=id===$("origin").value?"origin":id===$("destination").value?"destination":paths.some(p=>p.ids.includes(id))?"on-route":"";
      out+=`<g class="node ${kind}" transform="translate(${x} ${y})"><circle r="9"/><text y="25">${id} · ${name}</text></g>`;
    });
    svg.innerHTML=out;$("networkName").textContent=domains[domain].name;
    $("nodeCount").textContent=`${domains[domain].nodes.length} NODES · ${domains[domain].edges.length} LINKS`;
    window.dispatchEvent(new CustomEvent("pipeweb:render"));
  }
  
  function updateRankLegend(){
    const timeMode=$("objective").value==="time";
    $("rankLegendOne").textContent=timeMode?"Fastest":"Best";
    $("rankLegendTwo").textContent=timeMode?"Medium":"2nd";
    $("rankLegendThree").textContent=timeMode?"Slowest":"3rd";
  }
  function renderResults(){
    const el=$("results");
    if(!paths.length){el.innerHTML='<div class="empty-state panel"><span class="empty-icon">⌁</span><strong>No connected path found</strong><p>Try another pair of endpoints or network.</p></div>';return;}
    const obj=$("objective").value,unit=domains[domain].units,labels=obj==="time"?["FASTEST","MEDIUM","SLOWEST"]:["BEST MATCH","2ND OPTION","3RD OPTION"];
    const classes=["fast","medium","slow"];
    el.innerHTML=paths.map((p,i)=>{
      const m=p.metrics,primary=m[obj],best=paths[0].metrics[obj],delta=best?((primary-best)/best*100):0;
      return `<article class="route-card route-${classes[Math.min(i,2)]} ${i===selected?"selected":""}" data-index="${i}" tabindex="0" role="button" aria-label="Select path ${i+1}">
        <div class="route-top"><span class="route-name"><i class="rank-dot"></i> PATH 0${i+1}</span><span class="route-tag">${labels[i]||"ALTERNATIVE"}</span></div>
        <div class="route-time">${fmt(primary)} <small>${unit[obj]}</small></div>
        <div class="route-delta">${i===0?"Best available": "+"+fmt(delta)+"% vs best on selected objective"}</div>
        <div class="route-metrics"><div class="metric"><span>TIME</span><b>${fmt(m.time)} ${unit.time}</b></div><div class="metric"><span>DISTANCE</span><b>${fmt(m.distance)} ${unit.distance}</b></div><div class="metric"><span>COST</span><b>${fmt(m.cost)} ${unit.cost}</b></div></div>
        <div class="route-via">FLOW · ${p.ids.join(" → ")}</div>
        <div class="route-bar"><span style="width:${Math.max(8,100/(1+Math.max(0,delta)/100))}%"></span></div>
      </article>`;
    }).join("");
    el.querySelectorAll(".route-card").forEach(card=>{
      const choose=()=>{selected=Number(card.dataset.index);el.querySelectorAll(".route-card").forEach(c=>c.classList.toggle("selected",Number(c.dataset.index)===selected));renderMap();};
      card.addEventListener("click",choose);
      card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose();}});
    });
  }
  
  function highlightSelected(){const p=paths[selected];if(!p)return;const keys=new Set(p.edges.map(e=>edgeId(e[0],e[1])));$("networkMap").querySelectorAll(".edge").forEach(el=>{el.classList.toggle("best",keys.has(el.dataset.edge));el.classList.toggle("alt",!keys.has(el.dataset.edge)&&paths.some((x,i)=>i!==selected&&x.edges.some(e=>edgeId(e[0],e[1])===el.dataset.edge)))})}
  function fmt(n){return Number(n.toFixed(1)).toString()}
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
  function setDomain(name){domain=name;document.querySelectorAll(".domain").forEach(b=>b.classList.toggle("active",b.dataset.domain===name));paths=[];populateSelects();renderMap();renderResults();$("resultCount").textContent="Awaiting optimization";$("mapHint").textContent="Select a route and run optimization";$("networkName").textContent=domains[domain].name}
  $("findBtn").addEventListener("click",optimize);$("swapBtn").addEventListener("click",()=>{const a=$("origin").value;$("origin").value=$("destination").value;$("destination").value=a;if(paths.length)optimize()});$("resetBtn").addEventListener("click",()=>{setDomain(domain);$("objective").value="time";$("avoidCongestion").checked=true;$("showAlternatives").checked=true;toast("Explorer reset.")});document.querySelectorAll(".domain").forEach(b=>b.addEventListener("click",()=>setDomain(b.dataset.domain)));$("animateBtn").addEventListener("click",()=>{paused=!paused;$("networkMap").querySelectorAll("animateMotion").forEach(a=>paused?a.pauseAnimations():a.unpauseAnimations());$("animateBtn").textContent=paused?"▶ Resume flow":"Ⅱ Pause flow"});$("networkInfoBtn").addEventListener("click",()=>toast(`${domains[domain].nodes.length} nodes · ${domains[domain].edges.length} bidirectional links · simulated network`));$("objective").addEventListener("change",()=>{updateRankLegend();if(paths.length)optimize()});$("avoidCongestion").addEventListener("change",()=>{if(paths.length)optimize()});$("showAlternatives").addEventListener("change",()=>{if(paths.length)optimize()});

  function haversine(a,b){const rad=x=>x*Math.PI/180,R=6371,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng),v=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(v))}
  function finalizeNetwork(coords,links,name){
    if(coords.size>100000)throw new Error("This network exceeds the 100,000-node import limit. Simplify it before importing.");
    const values=[...coords.values()];let minLat=Infinity,maxLat=-Infinity,minLng=Infinity,maxLng=-Infinity;
    for(const n of values){if(n.lat<minLat)minLat=n.lat;if(n.lat>maxLat)maxLat=n.lat;if(n.lng<minLng)minLng=n.lng;if(n.lng>maxLng)maxLng=n.lng}
    const spanLat=maxLat-minLat||1,spanLng=maxLng-minLng||1,ids=new Map();
    const nodes=values.map((n,i)=>{const id="N"+String(i+1).padStart(5,"0");ids.set(n.key,id);return[id,n.name||"Network node",40+(n.lng-minLng)/spanLng*820,400-(n.lat-minLat)/spanLat*360,n.lat,n.lng]});
    const edges=[];for(const link of links.values()){let a=coords.get(link.a),b=coords.get(link.b);if(link.props?.reverse){const tmp=a;a=b;b=tmp}const distance=haversine(a,b);if(distance<0.0001)continue;const klass=link.props?.highway||"residential",defaults={motorway:100,trunk:80,primary:60,secondary:50,tertiary:40,residential:30,service:15,footway:5,path:5};const parsed=Number.parseFloat(link.props?.maxspeed);const speed=parsed>0?parsed:(defaults[klass]||35);const time=distance/Math.max(5,speed)*60;edges.push([ids.get(a.key),ids.get(b.key),time,distance,distance*0.08,distance*0.12,Boolean(link.props?.oneway)])}
    if(!edges.length)throw new Error("No connected segments found in this network.");
    return{name:name.toUpperCase(),nodes,edges,congested:[],units:{time:"min",distance:"km",cost:"credits (est.)",energy:"units (est.)"}};
  }
  function parseGeoJson(raw,name){
    const features=raw.type==="FeatureCollection"?raw.features:raw.type==="Feature"?[raw]:[],coords=new Map(),links=new Map();
    function addLine(line,props){let prev=null;for(const pair of line){const lng=Number(pair[0]),lat=Number(pair[1]);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)continue;const key=lat.toFixed(6)+","+lng.toFixed(6);if(!coords.has(key))coords.set(key,{key,lat,lng,name:props.name||"Network node"});if(prev&&prev!==key){const id=[prev,key].sort().join("|");if(!links.has(id))links.set(id,{a:prev,b:key,props:{}})}prev=key}}
    features.forEach(f=>{const g=f.geometry||{},p=f.properties||{};if(g.type==="LineString")addLine(g.coordinates,p);if(g.type==="MultiLineString")g.coordinates.forEach(line=>addLine(line,p));if(g.type==="GeometryCollection")g.geometries.forEach(x=>{if(x.type==="LineString")addLine(x.coordinates,p);if(x.type==="MultiLineString")x.coordinates.forEach(line=>addLine(line,p))})});
    if(!coords.size)throw new Error("GeoJSON needs LineString or MultiLineString features.");return finalizeNetwork(coords,links,name);
  }
  function parseGpx(xml,name){
    const doc=new DOMParser().parseFromString(xml,"application/xml");if(doc.getElementsByTagName("parsererror").length)throw new Error("Invalid GPX XML.");
    const all=Array.from(doc.getElementsByTagName("*")),segments=all.filter(el=>el.localName==="trkseg"||el.localName==="rte"),coords=new Map(),links=new Map();segments.forEach(seg=>{let prev=null;Array.from(seg.getElementsByTagName("*")).filter(p=>p.localName==="trkpt"||p.localName==="rtept").forEach(p=>{const lat=Number(p.getAttribute("lat")),lng=Number(p.getAttribute("lon"));if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const key=lat.toFixed(6)+","+lng.toFixed(6);if(!coords.has(key))coords.set(key,{key,lat,lng,name:"GPX point"});if(prev&&prev!==key)links.set([prev,key].sort().join("|"),{a:prev,b:key,props:{}});prev=key})});
    return finalizeNetwork(coords,links,name);
  }
  function activateNetwork(network,label){domains.custom=network;domain="custom";paths=[];document.querySelectorAll(".domain").forEach(b=>b.classList.remove("active"));populateSelects();renderMap();renderResults();$("mapHint").textContent="Geographic network loaded · choose endpoints and optimize";$("resultCount").textContent="READY TO OPTIMIZE";$("importStatus").textContent=label+" · "+network.nodes.length.toLocaleString()+" nodes / "+network.edges.length.toLocaleString()+" links";toast("Network loaded. Choose endpoints and find paths.");}
  $("networkFile").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const text=await file.text(),network=file.name.toLowerCase().endsWith(".gpx")?parseGpx(text,file.name):parseGeoJson(JSON.parse(text),file.name);activateNetwork(network,"Imported "+file.name)}catch(err){$("importStatus").textContent=err.message||"Import failed";toast(err.message||"Could not import network.")}finally{e.target.value=""}});
  $("loadOsmBtn").addEventListener("click",async()=>{
    const place=$("placeSearch").value.trim();if(!place){toast("Enter a place or area first.");return}
    const button=$("loadOsmBtn");button.disabled=true;button.textContent="Loading…";$("importStatus").textContent="Geocoding area…";
    try{
      const g=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q="+encodeURIComponent(place),{headers:{Accept:"application/json"}});
      if(!g.ok)throw Error("Geocoding service unavailable ("+g.status+").");
      const found=await g.json();if(!found.length)throw Error("Place not found. Try a more specific search.");
      const lat=Number(found[0].lat),lng=Number(found[0].lon);
      const requested=[lat-.035,lng-.04,lat+.035,lng+.04];
      if(!window.PipeWebOverpass)throw Error("OSM loader did not initialize. Refresh the page.");
      const result=await window.PipeWebOverpass.fetchGraph(requested);
      if(result.error)throw Error(result.error);
      if(result.clamped)toast("Area narrowed to a smaller region. Zoom in for full detail.");
      const data=result.graph,osmNodes=new Map(),ways=[];
      data.elements.forEach(el=>{if(el.type==="node")osmNodes.set(el.id,{lat:el.lat,lng:el.lon});else if(el.type==="way")ways.push(el);});
      const coords=new Map(),links=new Map();
      ways.forEach(way=>{let prev=null;way.nodes.forEach(id=>{const p=osmNodes.get(id);if(!p)return;const key=String(id);if(!coords.has(key))coords.set(key,{key,lat:p.lat,lng:p.lng,name:"OSM "+id});if(prev){const props=way.tags||{},linkId=[prev,key].sort().join("|");if(!links.has(linkId))links.set(linkId,{a:prev,b:key,props:{highway:props.highway,maxspeed:props.maxspeed,oneway:["yes","1","-1"].includes(props.oneway),reverse:props.oneway==="-1"}});}prev=key;});});
      if(coords.size<2)throw Error("No road graph found in this area. Try another location.");
      const network=finalizeNetwork(coords,links,"OpenStreetMap / "+(found[0].name||place));
      activateNetwork(network,"OpenStreetMap · "+(found[0].name||place));
      const date=new Date(result.ts||Date.now()).toLocaleDateString();
      $("importStatus").textContent+=" · © OpenStreetMap contributors · "+(result.stale?"STALE CACHE · ":"CACHE · ")+(result.cached?"Data as of "+date:result.clamped?"Area limited":"Fresh data");
      if(result.stale)toast("Connection unavailable. Showing cached OSM data from "+date+".");
      else if(result.cached)toast("Loaded cached road data instantly.");
    }catch(err){$("importStatus").textContent=err.message||"OSM download failed";toast(err.message||"Could not load OSM roads.");}
    finally{button.disabled=false;button.textContent="Load OSM roads ↗";}
  });

  window.PipeWeb={getState:()=>({domain,network:domains[domain],paths,selected,objective:$("objective").value,origin:$("origin").value,destination:$("destination").value})};
  populateSelects();updateRankLegend();renderMap();renderResults();
})();