/* Pipe-Web geospatial layer. Geographic positions are explicitly illustrative demo coordinates. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const center = null;
  let mode = "schematic", map = null, globe = null, mapLayers = [], globeReady = false;
  const AIRCRAFT_API = window.PIPEWEB_CONFIG && window.PIPEWEB_CONFIG.aircraftApi;
  const AIRCRAFT_REFRESH_MS = 60 * 60 * 1000;
  const aircraftTrailMap = new Map();
  let backdropGlobe = null;
  function initEarthBackdrop() {
    const host = $("earthBackdrop");
    if (!host || !window.Globe || backdropGlobe) return;
    backdropGlobe = Globe()(host)
      .width(window.innerWidth)
      .height(window.innerHeight)
      .backgroundColor("rgba(0,0,0,0)")
      .showAtmosphere(true)
      .atmosphereColor("#4c9fc4")
      .atmosphereAltitude(0.19)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .showGraticules(false)
      .rendererConfig({ alpha: true, antialias: false, powerPreference: "low-power" });
    backdropGlobe.controls().enabled = false;
    backdropGlobe.controls().autoRotate = true;
    backdropGlobe.controls().autoRotateSpeed = 0.22;
  }
  // Hidden background globe is unused; do not create an extra WebGL context on load.
  let aircraftCache = [], aircraftFetchedAt = 0, aircraftBusy = false, aircraftTimer = null;
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
    lat: Number.isFinite(node[4]) ? node[4] : null,
    lng: Number.isFinite(node[5]) ? node[5] : null
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
    if (next === "globe" || next === "world") { ensureGlobe(); if(!globe){$("geoGlobe").innerHTML='<div class="geo-error">3D globe library could not load. Check your internet connection or use the 2D map.</div>';return} if(next==="world")drawWorld();else drawLiveEarth(); }
  }
  function ensureMap() {
    if (map || !window.L) return;
    map = L.map("geoMap", { zoomControl:true }).setView([center.lat, center.lng], 12);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom:19, attribution:'&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
  }
  function drawMap() {
    const s=state(); if(!s||!map) return;
    mapLayers.forEach(layer=>map.removeLayer(layer));mapLayers=[];
    if(s.network.nodes.some(n=>!Number.isFinite(n[4])||!Number.isFinite(n[5]))){
      $("geoMap").innerHTML="<div class=\"geo-error\">Flow plotting is unavailable for schematic-only networks. Import an OSM or GeoJSON network with real coordinates.</div>";
      return;
    }
    const nodes=Object.fromEntries(s.network.nodes.map(n=>[n[0],{...nodeCoords(n)}]));
    const palette=["#64d5ad","#62c7ff","#b69cff","#e5cf73","#ff986b"];
    (s.paths||[]).forEach((path,index)=>{
      const color=palette[index%palette.length],selected=index===s.selected;
      const coords=path.ids.map(id=>nodes[id]).filter(p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));
      if(coords.length<2)return;
      const line=L.polyline(coords.map(p=>[p.lat,p.lng]),{
        color,weight:selected?5.5:3.2,opacity:selected?0.98:0.72,
        lineCap:"round",lineJoin:"round",className:"pipeweb-route-flow"
      }).addTo(map);
      line.bindTooltip("Real network geometry · alternative "+(index+1));
      mapLayers.push(line);
    });
    if(mapLayers.length){const bounds=L.featureGroup(mapLayers).getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(0.15),{maxZoom:16});}
    else $("geoMap").innerHTML="<div class=\"geo-error\">No optimized flow path is available yet.</div>";
  }
  
  function ensureGlobe() {
    if (globeReady || !window.Globe) return;
    globeReady=true;
    globe=Globe()($("geoGlobe"))
      .backgroundColor("#08111e")
      .showAtmosphere(true).atmosphereColor("#4c9bba").atmosphereAltitude(0.18)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .pointsData([]).arcColor(d=>d.color).arcAltitude(d=>d.altitude||0.08).arcStroke(d=>d.stroke||0.7)
      .arcDashLength(0.45).arcDashGap(0.25).arcDashAnimateTime(1800);
    globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
    globe.controls().autoRotate=true; globe.controls().autoRotateSpeed=0.35;
  }
  function drawWorld() {
    globe.pointsData([]).arcsData([]);
    $("networkName").textContent="WORLD FLOWS"; $("nodeCount").textContent="NOT YET IMPLEMENTED";
    $("worldDescription").textContent="Verified global corridor geometry and live flow telemetry: Not yet implemented.";
    return;
    if($("worldFlowType").value==="maritime"&&window.PipeWebMaritime){
      const feed=window.PipeWebMaritime.snapshot(),ships=feed.ships||[];
      if(ships.length){
        globe.pointsData(ships.map(s=>({lat:s.lat,lng:s.lon,color:s.sog>15?"#e7b96c":s.sog>5?"#65d5b0":"#70b9ee",label:(s.name||"Vessel "+s.mmsi)+" · "+(s.sog==null?"speed n/a":s.sog.toFixed(1)+" kn")}))).pointLabel("label").arcsData([]);
        globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
        $("networkName").textContent="LIVE MARITIME POSITIONS · OPENSEAFEED";
        $("nodeCount").textContent=ships.length.toLocaleString()+" OBSERVED VESSELS";
        $("worldDescription").textContent="Live AIS position reports. Coverage varies by receiver network; vessel positions are not cargo or trade-volume data.";
        return;
      }
    }
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
  function setAircraftStatus(state, message) {
    const pill=$("aircraftStatus");
    if(pill){pill.className="feed-pill "+(state==="LIVE"?"feed-live":state==="OFFLINE"?"feed-error":"feed-loading");pill.innerHTML="<i></i> "+state;}
    if(message&&$("aircraftCoverage"))$("aircraftCoverage").textContent=message;
  }
  function renderAircraft() {
    if(!globe)return;
    const arcs=[];
    for(const points of aircraftTrailMap.values()){
      for(let i=1;i<points.length;i++){
        const a=points[i-1],b=points[i];
        if(a.timestamp<b.timestamp)arcs.push({startLat:a.lat,startLng:a.lon,endLat:b.lat,endLng:b.lon,
          color:"#b69cff",altitude:0.08,stroke:0.72});
      }
    }
    globe.pointsData([]).arcsData(arcs.slice(-900));
    globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
    $("aircraftCount").textContent=String(arcs.length);
  }
  async function fetchAircraft(force=false) {
    if(aircraftBusy)return;
    if(!AIRCRAFT_API){setAircraftStatus("OFFLINE","Aircraft Worker: Not yet implemented until endpoint configured.");$("aircraftSource").textContent="Not yet implemented: deploy workers/live-api.js and set aircraftApi in config.js.";return;}
    if(!force&&aircraftFetchedAt&&Date.now()-aircraftFetchedAt<AIRCRAFT_REFRESH_MS){renderAircraft();return;}
    aircraftBusy=true;setAircraftStatus("CONNECTING","REQUESTING CONFIGURED WORKER");
    try{
      const response=await fetch(AIRCRAFT_API,{headers:{accept:"application/json"},cache:"no-store"});
      if(!response.ok)throw new Error("OpenSky returned HTTP "+response.status);
      const payload=await response.json();
      const parsed=Array.isArray(payload.aircraft)?payload.aircraft.filter(a=>Number.isFinite(a.longitude)&&Number.isFinite(a.latitude)):((Array.isArray(payload.states)?payload.states:[]).flatMap(v=>{
        if(!Number.isFinite(v[5])||!Number.isFinite(v[6]))return [];
        return [{icao24:v[0],callsign:(v[1]||"").trim(),originCountry:v[2],longitude:v[5],latitude:v[6],altitudeM:Number.isFinite(v[7])?v[7]:null,onGround:Boolean(v[8]),velocityMs:Number.isFinite(v[9])?v[9]:null,headingDeg:Number.isFinite(v[10])?v[10]:null}];
      }));
      if(payload.status==="OFFLINE")throw new Error(payload.error||"Aircraft provider offline");
      aircraftCache=parsed;aircraftFetchedAt=Date.now();
      for(const aircraft of parsed){
        const id=String(aircraft.icao24||"");if(!id)continue;
        const points=aircraftTrailMap.get(id)||[],last=points[points.length-1];
        if(!last||last.lat!==aircraft.latitude||last.lon!==aircraft.longitude){
          points.push({lat:aircraft.latitude,lon:aircraft.longitude,timestamp:aircraftFetchedAt});
          if(points.length>6)points.shift();aircraftTrailMap.set(id,points);
        }
      }
      renderAircraft();
      $("aircraftCount").textContent=parsed.length.toLocaleString();
      $("aircraftUpdated").textContent=new Date(aircraftFetchedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
      $("nodeCount").textContent="AIR MOVEMENT TRAILS";
      $("networkName").textContent="AIR FLOW · REPEATED ADS-B OBSERVATIONS";
      setAircraftStatus("LIVE","SAMPLED POSITIONS · 60-MINUTE REFRESH");
      $("aircraftSource").textContent=(payload.source||"ADS-B feed")+" · sampled coverage only; trails link repeat changed observations, not exact flight paths.";
    }catch(error){
      const stale=aircraftCache.length>0;
      setAircraftStatus(stale?"STALE":"OFFLINE",stale?"SHOWING LAST SUCCESSFUL SNAPSHOT":"LIVE FEED UNAVAILABLE");
      $("aircraftSource").textContent="OpenSky feed unavailable: "+(error&&error.message?error.message:"network error")+". No simulated aircraft are shown.";
      if(!stale){$("aircraftCount").textContent="—";$("aircraftUpdated").textContent="—";}
    }finally{aircraftBusy=false;}
  }
  function drawLiveEarth() {
    if(!globe)return;
    if(!aircraftCache.length){setAircraftStatus("CONNECTING","FETCHING LIVE POSITIONS");}
    else renderAircraft();
    fetchAircraft();
    if(aircraftTimer)clearInterval(aircraftTimer);
    aircraftTimer=setInterval(()=>{if(mode==="globe")fetchAircraft(true);},AIRCRAFT_REFRESH_MS);
  }
  function drawGlobe() {
    const s=state();if(!s||!globe)return;
    if(s.network.nodes.some(n=>!Number.isFinite(n[4])||!Number.isFinite(n[5]))){
      globe.pointsData([]).arcsData([]);
      $("geoGlobe").insertAdjacentHTML("afterbegin","<div class=\"geo-error\">Flow plotting requires an imported network with real geographic coordinates.</div>");
      return;
    }
    const nodes=Object.fromEntries(s.network.nodes.map(n=>[n[0],{...nodeCoords(n)}]));
    const palette=["#64d5ad","#62c7ff","#b69cff","#e5cf73","#ff986b"];
    const arcs=[];
    (s.paths||[]).forEach((path,index)=>path.edges.forEach(e=>arcs.push({
      startLat:nodes[e[0]].lat,startLng:nodes[e[0]].lng,
      endLat:nodes[e[1]].lat,endLng:nodes[e[1]].lng,
      color:palette[index%palette.length],altitude:0.08,selected:index===s.selected
    })));
    globe.pointsData([]).arcsData(arcs).arcColor(d=>d.color).arcStroke(d=>d.selected?1.1:0.65);
    globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
  }
  
  document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.view)));
  $("worldFlowType").addEventListener("change",drawWorld);
  window.addEventListener("pipeweb:render",()=>{if(mode==="map")drawMap();if(mode==="globe")drawLiveEarth();if(mode==="world")drawWorld();});

  window.addEventListener("resize",()=>{if(mode==="map"&&map)map.invalidateSize();if((mode==="globe"||mode==="world")&&globe)globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);});
})();
