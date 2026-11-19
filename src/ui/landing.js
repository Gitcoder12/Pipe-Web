/* Pipe-Web flow-first map. Corridor classes are illustrative until measured datasets are connected. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const state={map:null,layer:null,ribbonLayers:[],toastTimer:null};
const makeRoute=(name,kind,points,labels=[])=>({name,kind,points,labels});
const corridors={
sea:{label:"SEA ROUTES",routes:[
makeRoute("Suez–Singapore corridor","fast",[[51.9,4.5],[36,12],[30,32],[12,44],[1.3,103.8],[22.3,114.2],[31.2,121.5]],["Rotterdam","Suez Canal","Singapore","Hong Kong","Shanghai"]),
makeRoute("Cape of Good Hope route","slow",[[1.3,103.8],[-6,80],[-20,55],[-29.9,31],[-33.9,18.4]],["Singapore","Cape of Good Hope","Cape Town"]),
makeRoute("North Pacific corridor","fast",[[40.7,-74],[18,-60],[8.9,-79.5],[34,-118.2]],["New York","Panama Canal","Los Angeles"]),
makeRoute("South Pacific connection","special",[[31.2,121.5],[20,150],[0,160],[-33.9,151.2]],["Shanghai","Sydney"])
]},
road:{label:"ROAD ROUTES",routes:[
makeRoute("Western Europe corridor","fast",[[51.5,-.1],[48.9,2.35],[50.1,8.7],[52.4,13.4],[52.2,21],[55.8,37.6]],["London","Paris","Frankfurt","Berlin","Warsaw"]),
makeRoute("South Asia–Gulf corridor","slow",[[28.6,77.2],[26.9,75.8],[24.9,67],[25.3,55.3],[24.7,46.7]],["Delhi","Jaipur","Karachi","Dubai","Riyadh"]),
makeRoute("North American transcontinental","fast",[[40.7,-74],[39,-96],[34,-118.2]],["New York","Chicago","Los Angeles"]),
makeRoute("East China corridor","special",[[31.2,121.5],[30.6,104.1],[23.1,113.3],[22.3,114.2]],["Shanghai","Chengdu","Guangzhou","Hong Kong"])
]},
air:{label:"AIR CONNECTIVITY ROUTES",routes:[
makeRoute("North Atlantic trunk","fast",[[40.7,-74],[51.5,-.1]],["New York","London"]),
makeRoute("Europe–Asia connection","fast",[[51.5,-.1],[48.9,2.35],[28.6,77.2],[1.3,103.8]],["London","Paris","Delhi","Singapore"]),
makeRoute("Transpacific connection","slow",[[34,-118.2],[35.7,139.7],[-33.9,151.2]],["Los Angeles","Tokyo","Sydney"]),
makeRoute("South Atlantic connection","special",[[40.7,-74],[-23.6,-46.6],[-33.9,18.4]],["New York","São Paulo","Cape Town"])
]},
rail:{label:"RAIL CONNECTIVITY ROUTES",routes:[
makeRoute("Central European rail corridor","fast",[[51.5,-.1],[48.9,2.35],[50.1,8.7],[52.4,13.4],[52.2,21],[55.8,37.6]],["London","Paris","Frankfurt","Berlin","Warsaw","Moscow"]),
makeRoute("South Asian rail corridor","slow",[[28.6,77.2],[26.9,75.8],[24.9,67],[25.3,55.3]],["Delhi","Jaipur","Karachi","Dubai"]),
makeRoute("China east–west rail corridor","special",[[31.2,121.5],[30.6,104.1],[39.9,116.4]],["Shanghai","Chengdu","Beijing"])
]},
pipe:{label:"ENERGY PIPELINE ROUTES",routes:[
makeRoute("North Sea energy corridor","fast",[[51.9,4.5],[48.9,2.35],[43.3,5.4],[36.8,3.1]],["Rotterdam","Paris","Marseille","Barcelona"]),
makeRoute("Caspian–Mediterranean corridor","slow",[[40.4,49.9],[41,44],[39.9,32.9],[36.8,30.8]],["Baku","Tbilisi","Ankara","Ceyhan"]),
makeRoute("Gulf energy corridor","special",[[25.3,55.3],[24.7,46.7],[29.3,47.9]],["Dubai","Riyadh","Kuwait"])
]},
digital:{label:"DIGITAL BACKBONE ROUTES",routes:[
makeRoute("Transatlantic digital corridor","fast",[[38.9,-77.5],[40.7,-74],[51.5,-.1],[52.4,4.9]],["Virginia","New York","London","Amsterdam"]),
makeRoute("Europe–Asia digital corridor","fast",[[51.5,-.1],[43.3,5.4],[19.1,72.9],[1.3,103.8],[22.3,114.2]],["London","Marseille","Mumbai","Singapore","Hong Kong"]),
makeRoute("Africa connectivity corridor","slow",[[6.5,3.4],[-1.3,36.8],[-33.9,18.4]],["Lagos","Nairobi","Cape Town"]),
makeRoute("South Pacific digital route","special",[[34,-118.2],[-23.6,-46.6],[-34.6,-58.4]],["Los Angeles","São Paulo","Buenos Aires"])
]}
};
const ribbonColors={sea:"#0077b6",road:"#e4572e",air:"#2ecc40",rail:"#008f95",pipe:"#ff8c00",digital:"#9b59b6"};
function toast(message){const el=$("landingToast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function status(message){const el=$("liveCounts");if(el)el.textContent=message;const pulse=$("feedPulse");if(pulse)pulse.className="feed-pulse";}
function initMap(){
if(state.map)return true;if(!window.L){status("Map library unavailable · reload after connection");return false;}
const host=$("liveMap");if(!host)return false;host.hidden=false;
try{state.map=L.map(host,{zoomControl:false,worldCopyJump:true,preferCanvas:true,attributionControl:true,minZoom:2,maxZoom:18}).setView([22,15],2);
L.control.zoom({position:"bottomright"}).addTo(state.map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{minZoom:2,maxZoom:19,crossOrigin:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(state.map);
requestAnimationFrame(()=>state.map&&state.map.invalidateSize());return true;
}catch(error){console.error("Pipe-Web map initialization failed:",error);status("Map initialization failed");return false;}
}
function flowIconSvg(color){
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.1" fill="#ffffff" stroke="'+color+'" stroke-width="2.4"/><path d="M12 4.3 16.2 13l-4.2-2-4.2 2z" fill="'+color+'"/></svg>';
}
function clearRibbonLayers(){
 state.ribbonLayers.forEach(layer=>{if(state.map&&state.map.hasLayer(layer))state.map.removeLayer(layer);});state.ribbonLayers=[];
}
function drawFlowPath(from,to,options){
 const color=options.color,reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const points=[{lat:Number(from[0]),lng:Number(from[1])},{lat:Number(to[0]),lng:Number(to[1])}];
 const css="pipeweb-flow-ribbon pipeweb-flow-ribbon--"+options.mode;let layer;
 if(typeof L.bezier==="function"){
   const settings={curve:"arc",deep:5,color,weight:2.7,opacity:.9,dashArray:"10 6",lineCap:"round",lineJoin:"round",className:css};
   if(!reduce){settings.animate=1500;settings.duration=8000;settings.easing="flight";settings.travel=1;settings.loop=true;}
   layer=L.bezier({path:[points],icon:reduce?undefined:{svg:flowIconSvg(color),size:18,rotate:true,scaleWithZoom:false,className:"pipeweb-flow-token"}},settings).addTo(state.map);
   if(layer&&typeof layer.eachLayer==="function")layer.eachLayer(part=>part.bindTooltip(options.label,{sticky:true}));
 }else{
   layer=L.polyline([[points[0].lat,points[0].lng],[points[1].lat,points[1].lng]],{color,weight:2.7,opacity:.9,dashArray:"10 6",className:css}).addTo(state.map);
   layer.bindTooltip(options.label,{sticky:true});
 }
 state.ribbonLayers.push(layer);return layer;
}
function drawCorridorRibbons(name){
 clearRibbonLayers();
 const section=corridors[name],color=ribbonColors[name];if(!section||!color)return 0;
 let segments=0;
 section.routes.forEach(route=>{
   for(let i=1;i<route.points.length;i++){
     drawFlowPath(route.points[i-1],route.points[i],{mode:name,color,label:route.name+" · segment "+i+"/"+(route.points.length-1)});segments++;
   }
   const start=route.points[0],end=route.points[route.points.length-1];
   [[start,route.labels[0]||route.name+" · entry"],[end,route.labels.length?route.labels[route.labels.length-1]:route.name+" · exit"]].forEach(([point,label])=>{
     const marker=L.circleMarker(point,{radius:3.5,color:"#ffffff",weight:1.3,fillColor:color,fillOpacity:1,className:"pipeweb-flow-endpoint"}).addTo(state.map);
     marker.bindTooltip(String(label),{direction:"top",offset:[0,-5]});state.ribbonLayers.push(marker);
   });
 });
 return section.routes.length;
}
function labelIcon(text){return L.divIcon({className:"pipeweb-place-label",html:'<span>'+text.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+'</span>',iconSize:[0,0],iconAnchor:[0,8]});}
const liveLayers={
 sea:{label:"SEA INFRASTRUCTURE",selector:'way["route"="ferry"]'},
 road:{label:"ROAD NETWORK",selector:'way["highway"~"motorway|trunk|primary"]'},
 rail:{label:"RAIL NETWORK",selector:'way["railway"~"rail|narrow_gauge"]'},
 pipe:{label:"PIPELINE NETWORK",selector:'way["man_made"="pipeline"]'}
};
let liveRequest=0,activeRequest=null,renderTimer=null;
function setFeedState(message,mode="loading"){
 const el=$("liveCounts");if(el)el.textContent=message;
 const pulse=$("feedPulse");if(pulse)pulse.className="feed-pulse"+(mode==="live"?" is-live":mode==="error"?" is-error":"");
}
function scheduleRender(name,refreshRibbons=true){
 clearTimeout(renderTimer);
 renderTimer=setTimeout(()=>render(name,refreshRibbons),650);
}
async function render(name,refreshRibbons=true){
 if(!state.map)return;
 if(activeRequest){activeRequest.abort();activeRequest=null;}
 if(state.layer){state.map.removeLayer(state.layer);state.layer=null;}
 const ribbonCount=refreshRibbons?drawCorridorRibbons(name):(corridors[name]?.routes.length||0);
 const spec=liveLayers[name];
 if(!spec){setFeedState((ribbonCount||0)+" illustrative "+name.toUpperCase()+" route examples · no verified live geographic feed connected","error");return;}
 if(state.map.getZoom()<4){setFeedState((ribbonCount||0)+" illustrative "+spec.label.toLowerCase()+" ribbons · zoom to level 4+ for OSM infrastructure");return;}
 const bounds=state.map.getBounds();
 const south=Math.max(-85,bounds.getSouth()),north=Math.min(85,bounds.getNorth());
 const west=bounds.getWest(),east=bounds.getEast();
 const bbox=[south,west,north,east].join(",");
 const requestId=++liveRequest;
 const controller=new AbortController();activeRequest=controller;
 const timeout=setTimeout(()=>controller.abort(),30000);
 setFeedState("Loading mapped "+spec.label.toLowerCase()+" from OpenStreetMap…");
 const query='[out:json][timeout:25];('+spec.selector+'('+bbox+'););out geom;';
 try{
   const response=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(query),signal:controller.signal});
   if(!response.ok)throw new Error("Overpass HTTP "+response.status);
   const data=await response.json();
   if(requestId!==liveRequest)return;
   const group=L.layerGroup();let drawn=0;
   (data.elements||[]).forEach(element=>{
     if(element.type!=="way"||!Array.isArray(element.geometry)||element.geometry.length<2)return;
     const points=element.geometry.map(p=>[p.lat,p.lon]);
     L.polyline(points,{color:"#526b7b",weight:name==="road"?1.8:1.7,opacity:.55,lineCap:"round",lineJoin:"round",smoothFactor:2}).addTo(group);
     drawn++;
   });
   state.layer=group.addTo(state.map);
   const stamp=new Date().toLocaleTimeString();
   setFeedState(spec.label+" · "+drawn.toLocaleString()+" mapped OSM ways · "+ribbonCount+" illustrative route ribbons · queried "+stamp,drawn?"live":"error");
   if(!drawn)setFeedState("No mapped features in this view. Illustrative ribbons remain visible; pan or zoom to another region.","error");
 }catch(error){
   if(requestId!==liveRequest)return;
   console.error("Pipe-Web mapped infrastructure feed failed:",error);
   setFeedState(controller.signal.aborted?"OSM request timed out or was superseded · illustrative ribbons remain visible":"OSM unavailable · "+(error.message||"network error")+" · illustrative ribbons remain visible","error");
 }finally{clearTimeout(timeout);if(activeRequest===controller)activeRequest=null;}
}
function setLayer(name){if(!corridors[name])return;document.querySelectorAll(".layer-pill").forEach(button=>{const active=button.dataset.layer===name;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});const swatch=$("flowRibbonSwatch");if(swatch)swatch.style.backgroundColor=ribbonColors[name]||"#64748b";scheduleRender(name,true);}
function syncMobileLayers(){const source=$("layerTray"),target=$("mobileLayerButtons");if(!source||!target||target.childElementCount)return;source.querySelectorAll(".layer-pill").forEach(button=>{const clone=button.cloneNode(true);clone.addEventListener("click",()=>setLayer(clone.dataset.layer));target.appendChild(clone);});}
function openMenu(open){$("landingMenu").hidden=!open;$("menuToggle").setAttribute("aria-expanded",String(open));}
function openSettings(open){$("landingSettings").hidden=!open;$("settingsToggle").setAttribute("aria-expanded",String(open));}
function route(){const hash=location.hash||"#/";if(hash==="#/"||hash==="#"||hash===""){document.body.classList.remove("legacy-route");$("legacyWorkspace").setAttribute("aria-hidden","true");openMenu(false);openSettings(false);return;}const routes={"#/route-planner":"route-planner","#/corridors":"intelligence","#/bottlenecks":"intelligence","#/sankey":"flowMap","#/statistics":"flowMetrics"};const target=routes[hash];if(!target){toast("Unknown section. Returning to the global map.");location.hash="#/";return;}document.body.classList.add("legacy-route");$("legacyWorkspace").setAttribute("aria-hidden","false");openMenu(false);requestAnimationFrame(()=>{const el=$(target);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});if(target==="flowMap")window.dispatchEvent(new Event("resize"));});}
$("menuToggle").addEventListener("click",()=>openMenu($("landingMenu").hidden));
$("settingsToggle").addEventListener("click",()=>openSettings($("landingSettings").hidden));

$("screenshotBtn").addEventListener("click",()=>state.map&&state.map.setView([22,15],2,{animate:true}));
$("tiltToggle").addEventListener("change",()=>{$("tiltToggle").checked=false;toast("Tilt navigation is disabled in flow-map mode.");});
$("layerTray").addEventListener("click",event=>{const button=event.target.closest(".layer-pill");if(button)setLayer(button.dataset.layer);});
$("layerSheetBackdrop").addEventListener("click",()=>{$("layerSheet").hidden=true;$("layerSheetBackdrop").hidden=true;});
$("mobileLayersToggle").addEventListener("click",()=>{$("layerSheet").hidden=false;$("layerSheetBackdrop").hidden=false;});
document.addEventListener("click",event=>{if(!event.target.closest("#landingMenu,#menuToggle"))openMenu(false);if(!event.target.closest("#landingSettings,#settingsToggle"))openSettings(false);});
window.addEventListener("hashchange",route);window.addEventListener("resize",()=>state.map&&state.map.invalidateSize());
syncMobileLayers();if(!initMap())return;setLayer("sea");state.map.on("moveend",()=>{const active=document.querySelector(".layer-pill.active");if(active)scheduleRender(active.dataset.layer,false);});route();
})();