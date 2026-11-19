/* Pipe-Web geospatial layer. Global links are schematic until provider-backed route geometry is integrated. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let mode = "schematic", map = null, mapLayers = [], ribbonRenderer = null;
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

  const nodeCoords = (node) => ({lat:Number.isFinite(node[4])?node[4]:null,lng:Number.isFinite(node[5])?node[5]:null});
  function state(){return window.PipeWeb?window.PipeWeb.getState():null;}
  function clearMapLayers(){mapLayers.forEach(layer=>{if(map&&map.hasLayer(layer))map.removeLayer(layer);});mapLayers=[];}
  function ensureMap(){
    if(map||!window.L)return;
    map=L.map("geoMap",{zoomControl:true,worldCopyJump:true,minZoom:2,maxZoom:18}).setView([22,15],2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'}).addTo(map);
    ribbonRenderer=typeof L.svg==="function"?L.svg({padding:.5}).addTo(map):null;
  }
  function safeText(value){return String(value??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
  function setMode(next){
    mode=next;
    const isMap=next==="map"||next==="world";
    $("networkMap").hidden=isMap;$("geoMap").hidden=!isMap;$("worldControls").hidden=next!=="world";
    document.querySelectorAll(".view-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===next));
    if(!isMap)return;
    ensureMap();
    if(!map){$("mapHint").textContent="Leaflet map unavailable · check the network and reload";return;}
    if(next==="world")drawWorld();else drawMap();
    setTimeout(()=>map&&map.invalidateSize(),80);
  }
  function drawMap(){
    const s=state();if(!s||!map)return;clearMapLayers();
    if(!s.network.nodes.every(n=>Number.isFinite(n[4])&&Number.isFinite(n[5]))){
      $("mapHint").textContent="Import geographic GeoJSON/GPX or load OpenStreetMap roads to plot this route.";
      return;
    }
    $("mapHint").textContent="Mapped network geometry · route alternatives";
    const nodes=Object.fromEntries(s.network.nodes.map(n=>[n[0],{raw:n,...nodeCoords(n)}]));
    s.network.edges.forEach(e=>{
      const a=nodes[e[0]],b=nodes[e[1]];if(!a||!b)return;
      const line=L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{color:"#718391",weight:1.7,opacity:.36,dashArray:"3 7"}).addTo(map);
      line.bindTooltip(e[0]+" ↔ "+e[1]);mapLayers.push(line);
    });
    const ranks=["#168b61","#c58a19","#d14d4d"];
    (s.paths||[]).map((path,index)=>({path,index})).reverse().forEach(({path,index})=>{
      const color=ranks[Math.min(index,2)],selected=index===s.selected;
      path.edges.forEach(e=>{
        const a=nodes[e[0]],b=nodes[e[1]];if(!a||!b)return;
        const line=L.polyline([[a.lat,a.lng],[b.lat,b.lng]],{color,weight:selected?6:3.5,opacity:selected?.98:.72,lineCap:"round",lineJoin:"round",className:"pipeweb-route-flow"}).addTo(map);
        line.bindTooltip((index===0?"FASTEST":index===1?"ALTERNATIVE":"OTHER ROUTE")+" · "+e[0]+" → "+e[1]);mapLayers.push(line);
      });
    });
    s.network.nodes.forEach(n=>{
      const p=nodes[n[0]],origin=n[0]===s.origin,destination=n[0]===s.destination;if(!p)return;
      const marker=L.circleMarker([p.lat,p.lng],{radius:origin||destination?6:3.5,color:"#fff",fillColor:origin?"#168b61":destination?"#d14d4d":"#526b7b",fillOpacity:1,weight:1.5}).addTo(map);
      marker.bindTooltip(safeText(n[0])+" · "+safeText(n[1]));
      marker.bindPopup("<b>"+safeText(n[0])+" · "+safeText(n[1])+"</b><br>Imported geographic network node<br>"+p.lat.toFixed(5)+", "+p.lng.toFixed(5));mapLayers.push(marker);
    });
    if(mapLayers.length){const bounds=L.featureGroup(mapLayers).getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.12),{maxZoom:16});}
  }
  function flowIconSvg(color){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.1" fill="#fff" stroke="'+color+'" stroke-width="2.4"/><path d="M12 4.3 16.2 13l-4.2-2-4.2 2z" fill="'+color+'"/></svg>';}
  function drawFlowPath(from,to,options){
    const color=options.color,reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const css="pipeweb-flow-ribbon pipeweb-flow-ribbon--"+options.mode;let layer;
    if(typeof L.bezier==="function"&&ribbonRenderer){
      const config={curve:"arc",deep:5,color,weight:2.8,opacity:.9,dashArray:"10 6",lineCap:"round",lineJoin:"round",className:css,renderer:ribbonRenderer};
      if(!reduce){config.animate=1500;config.duration=8000;config.easing="flight";config.travel=1;config.loop=true;}
      layer=L.bezier({path:[[{lat:from.lat,lng:from.lng},{lat:to.lat,lng:to.lng}]],icon:reduce?undefined:{svg:flowIconSvg(color),size:18,rotate:true,scaleWithZoom:false,className:"pipeweb-flow-token"}},config).addTo(map);
      if(layer&&typeof layer.eachLayer==="function")layer.eachLayer(part=>part.bindTooltip(options.label,{sticky:true}));
    }else{
      layer=L.polyline([[from.lat,from.lng],[to.lat,to.lng]],{color,weight:2.8,opacity:.9,dashArray:"10 6",className:css}).addTo(map);
      layer.bindTooltip(options.label,{sticky:true});
    }
    mapLayers.push(layer);return layer;
  }
  function drawWorld(){
    if(!map)return;clearMapLayers();
    const key=$("worldFlowType").value,layer=worldLayers[key]||worldLayers.air;
    const palette={air:"#2ecc40",digital:"#9b59b6",maritime:"#0077b6",energy:"#ff8c00"},color=palette[key]||"#2476a8";
    const hubs=layer.hubs.map(([name,lat,lng])=>({name,lat,lng})),byName=Object.fromEntries(hubs.map(h=>[h.name,h]));
    layer.links.forEach(([a,b])=>{if(byName[a]&&byName[b])drawFlowPath(byName[a],byName[b],{mode:key,color,label:a+" → "+b+" · schematic connection"});});
    hubs.forEach(h=>{const marker=L.circleMarker([h.lat,h.lng],{radius:3.2,color:"#fff",weight:1.3,fillColor:color,fillOpacity:1}).addTo(map);marker.bindTooltip(h.name,{direction:"top",offset:[0,-4]});mapLayers.push(marker);});
    $("networkName").textContent=layer.title;
    $("nodeCount").textContent=hubs.length+" NAMED HUBS · "+layer.links.length+" SCHEMATIC LINKS";
    $("worldDescription").textContent=layer.description+" Curved ribbons are illustrative hub-to-hub connections, not verified operational routes or live traffic.";
    $("mapHint").textContent="Mode-coloured animated ribbons · hover a line or hub for its name";
    map.setView([20,10],2);
  }
  document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.view)));
  $("worldFlowType").addEventListener("change",drawWorld);
  window.addEventListener("pipeweb:render",()=>{if(mode==="map")drawMap();});
  window.addEventListener("resize",()=>{if(map)map.invalidateSize();});
})();
