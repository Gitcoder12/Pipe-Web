/* Pipe-Web geospatial layer. Geographic positions are explicitly illustrative demo coordinates. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const center = null;
  let mode = "schematic", map = null, globe = null, mapLayers = [], globeReady = false;
  const AIRCRAFT_API = (window.PIPEWEB_CONFIG && (window.PIPEWEB_CONFIG.aircraftApi || (window.PIPEWEB_CONFIG.liveApiBase && window.PIPEWEB_CONFIG.liveApiBase.replace(/\\/$/,"") + "/api/aircraft"))) || "";
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
    if(globe)globe.pointsData([]).arcsData([]);
    $("networkName").textContent="WORLD FLOW LAYERS";
    $("nodeCount").textContent="NOT YET IMPLEMENTED";
    $("worldDescription").textContent="No verified global flow geometry is connected. No illustrative arcs are shown.";
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
