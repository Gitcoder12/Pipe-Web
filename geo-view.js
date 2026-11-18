/* Pipe-Web geospatial layer. Geographic positions are explicitly illustrative demo coordinates. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const center = { lat: 16.5062, lng: 80.6480 };
  let mode = "schematic", map = null, globe = null, mapLayers = [], globeReady = false;
  const worldLayers = {
    air: { title:"GLOBAL AIR CONNECTIVITY", description:"Illustrative connections between major world aviation hubs.", hubs:[
      ["New York",40.7128,-74.006],["London",51.5074,-0.1278],["Dubai",25.2048,55.2708],["Singapore",1.3521,103.8198],["Tokyo",35.6762,139.6503],["Los Angeles",34.0522,-118.2437],["São Paulo",-23.5505,-46.6333],["Johannesburg",-26.2041,28.0473],["Sydney",-33.8688,151.2093],["Delhi",28.6139,77.209],["Paris",48.8566,2.3522],["Toronto",43.6532,-79.3832],["Mexico City",19.4326,-99.1332],["Istanbul",41.0082,28.9784],["Doha",25.2854,51.531]
    ],links:[["New York","London"],["London","Dubai"],["Dubai","Singapore"],["Singapore","Sydney"],["Singapore","Tokyo"],["Tokyo","Los Angeles"],["Los Angeles","New York"],["London","São Paulo"],["Dubai","Johannesburg"],["Delhi","Singapore"],["Delhi","London"],["Paris","New York"],["Istanbul","Doha"],["Toronto","London"],["Mexico City","São Paulo"],["Dubai","Sydney"],["Tokyo","Delhi"],["Johannesburg","Sydney"]]},
    digital: { title:"GLOBAL DIGITAL BACKBONE", description:"Conceptual intercontinental data-exchange links between major internet hubs.", hubs:[
      ["Ashburn",39.0438,-77.4874],["New York",40.7128,-74.006],["London",51.5074,-0.1278],["Amsterdam",52.3676,4.9041],["Frankfurt",50.1109,8.6821],["Marseille",43.2965,5.3698],["Mumbai",19.076,72.8777],["Chennai",13.0827,80.2707],["Singapore",1.3521,103.8198],["Hong Kong",22.3193,114.1694],["Tokyo",35.6762,139.6503],["Sydney",-33.8688,151.2093],["São Paulo",-23.5505,-46.6333],["Los Angeles",34.0522,-118.2437],["Nairobi",-1.2921,36.8219]
    ],links:[["Ashburn","New York"],["New York","London"],["London","Amsterdam"],["Amsterdam","Frankfurt"],["Frankfurt","Marseille"],["Marseille","Mumbai"],["Mumbai","Chennai"],["Chennai","Singapore"],["Singapore","Hong Kong"],["Hong Kong","Tokyo"],["Tokyo","Los Angeles"],["Los Angeles","Ashburn"],["Singapore","Sydney"],["Marseille","Nairobi"],["Ashburn","São Paulo"],["London","Mumbai"]]},
    maritime: { title:"GLOBAL MARITIME CORRIDORS", description:"Conceptual sea-lane connections between major port regions; routes are schematic.", hubs:[
      ["Rotterdam",51.9244,4.4777],["Singapore",1.3521,103.8198],["Shanghai",31.2304,121.4737],["Hong Kong",22.3193,114.1694],["Dubai",25.2048,55.2708],["Mumbai",19.076,72.8777],["Durban",-29.8587,31.0218],["Cape Town",-33.9249,18.4241],["New York",40.7128,-74.006],["Los Angeles",34.0522,-118.2437],["Panama City",8.9824,-79.5199],["Santos",-23.9608,-46.3331],["Sydney",-33.8688,151.2093],["Busan",35.1796,129.0756]
    ],links:[["Rotterdam","Dubai"],["Dubai","Mumbai"],["Mumbai","Singapore"],["Singapore","Shanghai"],["Shanghai","Busan"],["Busan","Los Angeles"],["Los Angeles","Panama City"],["Panama City","New York"],["New York","Rotterdam"],["Singapore","Sydney"],["Singapore","Durban"],["Durban","Cape Town"],["Cape Town","Santos"],["Hong Kong","Singapore"],["Shanghai","Hong Kong"]]},
    energy: { title:"GLOBAL ENERGY CONNECTIONS", description:"Illustrative cross-border energy relationships, not a live grid or pipeline map.", hubs:[
      ["North Sea",56,3],["London",51.5074,-0.1278],["Algiers",36.7538,3.0588],["Cairo",30.0444,31.2357],["Riyadh",24.7136,46.6753],["Doha",25.2854,51.531],["Mumbai",19.076,72.8777],["Singapore",1.3521,103.8198],["Perth",-31.9505,115.8605],["Tokyo",35.6762,139.6503],["Baku",40.4093,49.8671],["Berlin",52.52,13.405],["Lagos",6.5244,3.3792],["Johannesburg",-26.2041,28.0473]
    ],links:[["North Sea","London"],["North Sea","Berlin"],["Algiers","London"],["Algiers","Cairo"],["Cairo","Riyadh"],["Riyadh","Doha"],["Doha","Mumbai"],["Mumbai","Singapore"],["Singapore","Perth"],["Perth","Tokyo"],["Baku","Berlin"],["Lagos","Johannesburg"],["Doha","Tokyo"]]}
  };
  const nodeCoords = (node) => ({
    lat: Number.isFinite(node[4]) ? node[4] : center.lat + (220 - node[3]) * 0.00019,
    lng: Number.isFinite(node[5]) ? node[5] : center.lng + (node[2] - 450) * 0.00022
  });
  function state(){ return window.PipeWeb ? window.PipeWeb.getState() : null; }
  function setMode(next) {
    mode = next;
    $("networkMap").hidden = next !== "schematic";
    $("geoMap").hidden = next !== "map";
    $("geoGlobe").hidden = next !== "globe" && next !== "world";
    $("worldControls").hidden = next !== "world";
    document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === next));
    if (next === "map") { ensureMap(); if(!map){$("geoMap").innerHTML='<div class="geo-error">Map library could not load. Check your internet connection or use the schematic view.</div>';return} drawMap(); setTimeout(() => map && map.invalidateSize(), 80); }
    if (next === "globe" || next === "world") { ensureGlobe(); if(!globe){$("geoGlobe").innerHTML='<div class="geo-error">3D globe library could not load. Check your internet connection or use the 2D map.</div>';return} if(next==="world")drawWorld();else drawGlobe(); }
  }
  function ensureMap() {
    if (map || !window.L) return;
    map = L.map("geoMap", { zoomControl:true }).setView([center.lat, center.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  }
  function drawMap() {
    const s=state(); if(!s||!map) return;
    mapLayers.forEach(layer=>map.removeLayer(layer));mapLayers=[];
    const nodes=Object.fromEntries(s.network.nodes.map(n=>[n[0],{raw:n,...nodeCoords(n)}]));
    s.network.edges.forEach(e=>{
      const a=nodes[e[0]],b=nodes[e[1]],key=[e[0],e[1]].sort().join("-");
      const layer=L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{
        color:s.network.congested.includes(key)?"#8e6346":"#64748b",
        weight:2,opacity:0.42,dashArray:"3 7"
      }).addTo(map);
      layer.bindTooltip(e[0]+" ↔ "+e[1]);mapLayers.push(layer);
    });
    const rankColors=["#35d39a","#e8b94e","#ef6262"];
    (s.paths||[]).map((path,index)=>({path,index})).reverse().forEach(({path,index})=>{
      const color=rankColors[Math.min(index,2)],selected=index===s.selected;
      path.edges.forEach(e=>{
        const a=nodes[e[0]],b=nodes[e[1]];
        const line=L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{
          color,weight:selected?7:4,opacity:selected?1:0.78,
          lineCap:"round",lineJoin:"round",className:"pipeweb-route-flow"
        }).addTo(map);
        line.bindTooltip((index===0?"FASTEST":index===1?"MEDIUM":"SLOWEST")+" · "+e[0]+" → "+e[1]);
        mapLayers.push(line);
      });
    });
    s.network.nodes.forEach(n=>{
      const p=nodes[n[0]],isOrigin=n[0]===s.origin,isDest=n[0]===s.destination;
      const marker=L.circleMarker([p.lat,p.lng],{radius:isOrigin||isDest?8:5,color:isOrigin?"#e5b66c":isDest?"#67c9e8":"#d7e2ee",fillColor:isOrigin?"#e5b66c":isDest?"#67c9e8":"#26394e",fillOpacity:1,weight:2}).addTo(map);
      marker.bindPopup("<b>"+n[0]+" · "+n[1]+"</b><br>"+(Number.isFinite(n[4])?"Imported geographic network node":"Illustrative demo node")+"<br>"+p.lat.toFixed(5)+", "+p.lng.toFixed(5));mapLayers.push(marker);
    });
    if(mapLayers.length){const bounds=L.featureGroup(mapLayers).getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(0.12),{maxZoom:16});}
    $("geoMap").setAttribute("aria-label","Interactive geographic visualization with fastest, medium and slow route alternatives");
  }
  
  function ensureGlobe() {
    if (globeReady || !window.Globe) return;
    globeReady=true;
    globe=Globe()($("geoGlobe"))
      .backgroundColor("#08111e")
      .showAtmosphere(true).atmosphereColor("#4c9bba").atmosphereAltitude(0.18)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .pointAltitude(0.015).pointRadius(0.45).pointColor(d=>d.color)
      .arcColor(d=>d.color).arcAltitude(0.18).arcStroke(0.7)
      .arcDashLength(0.45).arcDashGap(0.25).arcDashAnimateTime(1800);
    globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
    globe.controls().autoRotate=true; globe.controls().autoRotateSpeed=0.35;
  }
  function drawWorld() {
    const layer=worldLayers[$("worldFlowType").value]||worldLayers.air;
    const hubs=layer.hubs.map(([name,lat,lng])=>({name,lat,lng}));
    const byName=Object.fromEntries(hubs.map(h=>[h.name,h]));
    const arcs=layer.links.map(([a,b],i)=>({startLat:byName[a].lat,startLng:byName[a].lng,endLat:byName[b].lat,endLng:byName[b].lng,color:["#62d6b1","#70b9ee","#e7b96c","#b49af5"][i%4]}));
    globe.pointsData(hubs.map(h=>({...h,color:"#e9c27b"}))).pointLabel("name").arcsData(arcs);
    globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
    $("networkName").textContent=layer.title;
    $("nodeCount").textContent=String(hubs.length)+" GLOBAL HUBS · "+String(arcs.length)+" ILLUSTRATIVE LINKS";
    $("worldDescription").textContent=layer.description+" Not live traffic or infrastructure telemetry.";
  }
  function drawGlobe() {
    const s=state();if(!s||!globe)return;
    const nodes=Object.fromEntries(s.network.nodes.map(n=>[n[0],{raw:n,...nodeCoords(n)}]));
    const points=s.network.nodes.map(n=>{const p=nodes[n[0]];return{lat:p.lat,lng:p.lng,color:n[0]===s.origin?"#e5b66c":n[0]===s.destination?"#67c9e8":"#b8c9dc",label:n[0]+" · "+n[1]};});
    const rankColors=["#35d39a","#e8b94e","#ef6262"];
    const arcs=[];
    (s.paths||[]).map((path,index)=>({path,index})).reverse().forEach(({path,index})=>path.edges.forEach(e=>arcs.push({
      startLat:nodes[e[0]].lat,startLng:nodes[e[0]].lng,
      endLat:nodes[e[1]].lat,endLng:nodes[e[1]].lng,
      color:rankColors[Math.min(index,2)],selected:index===s.selected
    })));
    globe.pointsData(points).pointLabel("label").arcsData(arcs)
      .arcColor(d=>d.color).arcStroke(d=>d.selected?1.1:0.65);
    globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
  }
  
  document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.view)));
  $("worldFlowType").addEventListener("change",drawWorld);
  window.addEventListener("pipeweb:render",()=>{if(mode==="map")drawMap();if(mode==="globe")drawGlobe();if(mode==="world")drawWorld();});
  window.addEventListener("resize",()=>{if(mode==="map"&&map)map.invalidateSize();if((mode==="globe"||mode==="world")&&globe)globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);});
})();
