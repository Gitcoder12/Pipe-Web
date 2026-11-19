/* Pipe-Web flow-first globe and section router. WebGL is initialized only on the globe route. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
  const state = { view:isMobile()?"2d":"3d", map:null, globe:null, flowLayers:[],
    seaTracks:[], airTracks:[], railTracks:[], active:new Set(["sea"]),
    unsubscribers:{}, toastTimer:null, landingStarted:false, tiltEnabled:false };
  const colorForShipType = type => {
    const n=Number(type);
    if(n>=80&&n<=89)return "#ff986b"; // tanker
    if(n>=70&&n<=79)return "#61c6ff"; // cargo
    if(n>=60&&n<=69)return "#b69cff"; // passenger
    if(n>=30&&n<=39)return "#6de0b2"; // fishing
    if(n>=50&&n<=59)return "#e5cf73"; // service
    return "#72d7d0";
  };
  const apiEndpoint = (key,path) => {
    const cfg=window.PIPEWEB_CONFIG||{};
    return cfg[key]||(cfg.liveApiBase?cfg.liveApiBase.replace(/\/$/,"")+path:"");
  };
  function toast(message) {
    const el=$("landingToast"); if(!el)return;
    el.textContent=message;el.classList.add("show");
    clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove("show"),3200);
  }
  function status(message,mode="connecting") {
    $("liveCounts").textContent=message;
    $("feedPulse").className="feed-pulse"+(mode==="live"?" is-live":mode==="error"?" is-error":"");
  }
  function activeTracks() {
    return [
      ...(state.active.has("sea")?state.seaTracks:[]),
      ...(state.active.has("air")?state.airTracks:[]),
      ...(state.active.has("rail")?state.railTracks:[])
    ];
  }
  function segments() {
    const output=[];
    for(const track of activeTracks()) {
      const pts=track.points||[];
      for(let i=Math.max(1,pts.length-6);i<pts.length;i++) {
        const a=pts[i-1],b=pts[i];
        if(!a||!b||!Number.isFinite(a.lat)||!Number.isFinite(a.lon)||
          !Number.isFinite(b.lat)||!Number.isFinite(b.lon)||b.timestamp<=a.timestamp)continue;
        output.push({startLat:a.lat,startLng:a.lon,endLat:b.lat,endLng:b.lon,
          color:track.color||"#72d7d0",altitude:0.075,stroke:0.9});
      }
    }
    return output.slice(-1200);
  }
  function updateStatus() {
    const count=segments().length,feed=window.PipeWebMaritime?.status||"OFFLINE";
    if(count)status("LIVE FLOW · "+count.toLocaleString()+" observed trail segments · AIS "+feed,"live");
    else if(feed==="LIVE")status("AIS LIVE · waiting for repeat positions to form flow trails","live");
    else status("AIS "+feed+" · no verified movement trail yet",feed==="ERROR"?"error":"connecting");
  }
  function initGlobe() {
    if(state.globe||!window.Globe)return;
    const host=$("liveGlobe");
    state.globe=Globe()(host)
      .rendererConfig({preserveDrawingBuffer:true,antialias:true,alpha:false})
      .backgroundColor("#0a0a0a")
      .showAtmosphere(true).atmosphereColor("#287da3").atmosphereAltitude(0.16)
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .showGraticules(false)
      .arcsData([]).arcColor(d=>d.color).arcAltitude(d=>d.altitude)
      .arcStroke(d=>d.stroke).arcDashLength(0.52).arcDashGap(0.18)
      .arcDashAnimateTime(2200).arcsTransitionDuration(650).pointsData([]);
    state.globe.width(host.clientWidth).height(host.clientHeight);
    state.globe.controls().autoRotate=true;state.globe.controls().autoRotateSpeed=0.28;
    state.globe.controls().enableDamping=true;state.globe.controls().dampingFactor=0.08;
    state.globe.pointOfView({lat:20,lng:10,altitude:2.1},0);
  }
  function initMap() {
    if(state.map||!window.L)return;
    state.map=L.map("liveMap",{zoomControl:false,worldCopyJump:true,preferCanvas:true,attributionControl:true}).setView([20,0],2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {maxZoom:8,attribution:"&copy; OpenStreetMap &copy; CARTO"}).addTo(state.map);
  }
  function render() {
    const arcs=segments();
    if(state.globe)state.globe.pointsData([]).arcsData(arcs);
    if(state.map) {
      state.flowLayers.forEach(layer=>state.map.removeLayer(layer));state.flowLayers=[];
      for(const track of activeTracks()) {
        const pts=(track.points||[]).slice(-7).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
        if(pts.length<2)continue;
        const line=L.polyline(pts.map(p=>[p.lat,p.lon]),{color:track.color||"#72d7d0",weight:2.6,opacity:.9,
          lineCap:"round",lineJoin:"round",className:"pipeweb-flow-track"}).addTo(state.map);
        state.flowLayers.push(line);
      }
    }
    updateStatus();
  }
  function showView(view) {
    state.view=view;
    $("liveGlobe").hidden=view!=="3d";$("liveMap").hidden=view!=="2d";
    $("viewToggle").innerHTML=view==="3d"?"🌐 <span>3D</span>":"🗺️ <span>2D</span>";
    $("viewToggle").setAttribute("aria-label",view==="3d"?"Switch to 2D map":"Switch to 3D globe");
    if(view==="3d") {initGlobe();render();}
    else {initMap();render();requestAnimationFrame(()=>state.map?.invalidateSize());}
  }
  function subscribeSea() {
    const feed=window.PipeWebMaritime;if(!feed)return;
    state.unsubscribers.sea?.();
    state.unsubscribers.sea=feed.subscribe(snapshot=>{
      state.seaTracks=(snapshot.tracks||[]).map(track=>({...track,color:colorForShipType(track.shipType)}));
      render();
    });
    if(feed.status==="DISCONNECTED")feed.connect();
  }
  function subscribeOptional(kind) {
    const air=kind==="air",feed=air?window.PipeWebAircraft:window.PipeWebRail;
    const endpoint=apiEndpoint(air?"aircraftApi":"railApi",air?"/api/aircraft":"/api/rail");
    if(!endpoint||!feed) {toast((air?"Aircraft":"Rail")+" flow needs the free-data Worker URL configured in config.js.");return false;}
    state.unsubscribers[kind]?.();
    state.unsubscribers[kind]=feed.subscribe(snapshot=>{
      if(air)state.airTracks=(snapshot.tracks||[]).map(track=>({...track,color:"#b69cff"}));
      else state.railTracks=(snapshot.tracks||[]).map(track=>({...track,color:"#ffbd70"}));
      render();
    });
    feed.connect(endpoint);return true;
  }
  function syncLayerButtons() {
    document.querySelectorAll(".layer-pill").forEach(button=>{
      const active=state.active.has(button.dataset.layer);
      button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));
    });
    document.querySelectorAll("#mobileLayerButtons .layer-pill").forEach(button=>{
      const original=document.querySelector('#layerTray [data-layer="'+button.dataset.layer+'"]');
      if(original){button.classList.toggle("active",original.classList.contains("active"));button.setAttribute("aria-pressed",original.getAttribute("aria-pressed"));}
    });
  }
  function setLayer(name,enabled) {
    if(name==="sea") {
      if(enabled){state.active.add(name);subscribeSea();}
      else {state.active.delete(name);window.PipeWebMaritime?.disconnect(false);}
    } else if(name==="air"||name==="rail") {
      if(enabled) {
        if(subscribeOptional(name))state.active.add(name);
        else state.active.delete(name);
      } else {
        state.active.delete(name);
        (name==="air"?window.PipeWebAircraft:window.PipeWebRail)?.disconnect();
      }
    } else {
      state.active.delete(name);
      if(enabled)toast(name.charAt(0).toUpperCase()+name.slice(1)+" flow: Not yet implemented.");
    }
    syncLayerButtons();render();
  }
  function openMenu(open) {$("landingMenu").hidden=!open;$("menuToggle").setAttribute("aria-expanded",String(open));}
  function openSettings(open) {$("landingSettings").hidden=!open;$("settingsToggle").setAttribute("aria-expanded",String(open));}
  function route() {
    const hash=location.hash||"#/";
    if(hash==="#"||hash==="#/"||hash==="") {
      document.body.classList.remove("legacy-route");$("legacyWorkspace").setAttribute("aria-hidden","true");
      openMenu(false);openSettings(false);return false;
    }
    const routes={"#/route-planner":"route-planner","#/corridors":"intelligence",
      "#/bottlenecks":"intelligence","#/sankey":"flowMap","#/statistics":"flowMetrics"};
    const target=routes[hash];
    if(!target){toast("Unknown section. Returning to the live globe.");location.hash="#/";return true;}
    document.body.classList.add("legacy-route");$("legacyWorkspace").setAttribute("aria-hidden","false");
    openMenu(false);
    requestAnimationFrame(()=>{
      const el=$(target);if(el)el.scrollIntoView({behavior:"auto",block:"start"});
      window.dispatchEvent(new CustomEvent("pipeweb:section-visible",{detail:{id:target}}));
    });
    return true;
  }
  function safeShowView(view) {try{showView(view);}catch(error){toast("Globe view unavailable: "+(error?.message||"graphics initialization failed"));}}
  function startLanding() {
    if(state.landingStarted){safeShowView(state.view);return;}
    state.landingStarted=true;
    if(isMobile()){$("viewToggle").disabled=true;$("viewToggle").title="3D is disabled on mobile";}
    safeShowView(state.view);subscribeSea();
  }
  function syncRoute(){if(!route())startLanding();}
  function enableTilt() {
    if(!isMobile()||typeof DeviceOrientationEvent==="undefined"){toast("Phone tilt is unavailable on this device.");$("tiltToggle").checked=false;return;}
    const activate=()=>{state.tiltEnabled=true;window.addEventListener("deviceorientation",onOrientation,{passive:true});toast("Tilt navigation enabled.");};
    if(typeof DeviceOrientationEvent.requestPermission==="function")
      DeviceOrientationEvent.requestPermission().then(result=>result==="granted"?activate():toast("Motion permission denied.")).catch(()=>toast("Motion sensors unavailable."));
    else activate();
  }
  function onOrientation(event) {
    if(!state.tiltEnabled||!state.map)return;
    const gamma=Math.max(-25,Math.min(25,Number(event.gamma)||0));
    const beta=Math.max(-25,Math.min(25,(Number(event.beta)||0)-35));
    const center=state.map.getCenter();state.map.panTo([center.lat-beta*.002,center.lng+gamma*.002],{animate:false});
  }
  function screenshot() {
    if(state.view!=="3d"||!state.globe){toast("Switch to 3D before taking a globe capture.");return;}
    try{const link=document.createElement("a");link.href=state.globe.renderer().domElement.toDataURL("image/png");link.download="pipe-web-flow-globe.png";link.click();}
    catch(_){toast("Screenshot blocked by browser graphics security.");}
  }
  function syncMobileLayers() {
    const target=$("mobileLayerButtons");
    if(target.childElementCount)return;
    document.querySelectorAll("#layerTray .layer-pill").forEach(button=>{
      const clone=button.cloneNode(true);
      clone.addEventListener("click",()=>setLayer(clone.dataset.layer,!state.active.has(clone.dataset.layer)));
      target.appendChild(clone);
    });
  }
  $("menuToggle").addEventListener("click",()=>openMenu($("landingMenu").hidden));
  $("settingsToggle").addEventListener("click",()=>openSettings($("landingSettings").hidden));
  $("viewToggle").addEventListener("click",()=>{if(isMobile()){safeShowView("2d");toast("3D globe is disabled on small screens.");}else safeShowView(state.view==="3d"?"2d":"3d");});
  $("screenshotBtn").addEventListener("click",screenshot);
  $("tiltToggle").addEventListener("change",event=>{if(event.target.checked)enableTilt();else{state.tiltEnabled=false;window.removeEventListener("deviceorientation",onOrientation);}});
  $("layerTray").addEventListener("click",event=>{const button=event.target.closest(".layer-pill");if(button)setLayer(button.dataset.layer,!state.active.has(button.dataset.layer));});
  $("layerSheetBackdrop").addEventListener("click",()=>{$("layerSheet").hidden=true;$("layerSheetBackdrop").hidden=true;});
  $("mobileLayersToggle").addEventListener("click",()=>{$("layerSheet").hidden=false;$("layerSheetBackdrop").hidden=false;});
  $("landingMenu").addEventListener("click",event=>{if(event.target.closest("a"))requestAnimationFrame(syncRoute);});
  document.addEventListener("click",event=>{
    if(!event.target.closest("#landingMenu,#menuToggle"))openMenu(false);
    if(!event.target.closest("#landingSettings,#settingsToggle"))openSettings(false);
  });
  window.addEventListener("hashchange",syncRoute);window.addEventListener("pageshow",syncRoute);
  window.addEventListener("resize",()=>{
    if(document.body.classList.contains("legacy-route"))return;
    if(isMobile()){$("viewToggle").disabled=true;if(state.view!=="2d")safeShowView("2d");else state.map?.invalidateSize();}
    else{$("viewToggle").disabled=false;if(state.globe)state.globe.width($("liveGlobe").clientWidth).height($("liveGlobe").clientHeight);if(state.map)state.map.invalidateSize();}
  });
  syncMobileLayers();status("Connecting to free movement feeds…");
  // Resolve the route before creating a WebGL context. A GPU initialization problem must not block navigation.
  const onSection=route();if(!onSection)startLanding();
})();
