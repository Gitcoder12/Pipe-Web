/* Pipe-Web flow-first map. Corridor classes are illustrative until measured datasets are connected. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const state={map:null,layer:null,toastTimer:null};
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
const colors={fast:"#38c978",slow:"#ed5b5b",special:"#aab3bd"};
function toast(message){const el=$("landingToast");if(!el)return;el.textContent=message;el.classList.add("show");clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function status(message){const el=$("liveCounts");if(el)el.textContent=message;const pulse=$("feedPulse");if(pulse)pulse.className="feed-pulse";}
function initMap(){
if(state.map)return true;if(!window.L){status("Map library unavailable · reload after connection");return false;}
const host=$("liveMap");if(!host)return false;host.hidden=false;$("liveGlobe").hidden=true;
try{state.map=L.map(host,{zoomControl:false,worldCopyJump:true,preferCanvas:true,attributionControl:true,minZoom:2,maxZoom:18}).setView([22,15],2);
L.control.zoom({position:"bottomright"}).addTo(state.map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{minZoom:2,maxZoom:19,crossOrigin:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'}).addTo(state.map);
requestAnimationFrame(()=>state.map&&state.map.invalidateSize());return true;
}catch(error){console.error("Pipe-Web map initialization failed:",error);status("Map initialization failed");return false;}
}
function interpolate(points,steps=24){const out=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1];let d=b[1]-a[1];if(d>180)d-=360;if(d< -180)d+=360;for(let j=0;j<steps;j++){const t=j/steps;out.push([a[0]+(b[0]-a[0])*t,a[1]+d*t]);}}out.push(points[points.length-1]);return out;}
function labelIcon(text){return L.divIcon({className:"pipeweb-place-label",html:'<span>'+text.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))+'</span>',iconSize:[0,0],iconAnchor:[0,8]});}
const liveLayers={
 sea:{label:"SEA INFRASTRUCTURE",selector:'way["route"="ferry"]'},
 road:{label:"ROAD NETWORK",selector:'way["highway"~"motorway|trunk|primary"]'},
 rail:{label:"RAIL NETWORK",selector:'way["railway"~"rail|narrow_gauge"]'},
 pipe:{label:"PIPELINE NETWORK",selector:'way["man_made"="pipeline"]'}
};
let liveRequest=0;
function setFeedState(message,mode="loading"){
 const el=$("liveCounts");if(el)el.textContent=message;
 const pulse=$("feedPulse");if(pulse)pulse.className="feed-pulse"+(mode==="live"?" is-live":mode==="error"?" is-error":"");
}
async function render(name){
 if(!state.map)return;
 if(state.layer){state.map.removeLayer(state.layer);state.layer=null;}
 const spec=liveLayers[name];
 if(!spec){
   setFeedState(name==="air"?"AIR: no free, reliable global corridor feed connected":"DIGITAL: no public live geographic corridor feed connected","error");
   return;
 }
 if(state.map.getZoom()<4){
   setFeedState("Zoom in to level 4+ to load live OpenStreetMap infrastructure");
   return;
 }
 const bounds=state.map.getBounds();
 const south=Math.max(-85,bounds.getSouth()),north=Math.min(85,bounds.getNorth());
 const west=bounds.getWest(),east=bounds.getEast();
 const bbox=[south,west,north,east].join(",");
 const requestId=++liveRequest;
 setFeedState("Loading current OpenStreetMap "+spec.label.toLowerCase()+"…");
 const query='[out:json][timeout:25];('+spec.selector+'('+bbox+'););out geom;';
 try{
   const response=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(query),signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw new Error("Overpass HTTP "+response.status);
   const data=await response.json();
   if(requestId!==liveRequest)return;
   const group=L.layerGroup();
   let drawn=0;
   (data.elements||[]).forEach(element=>{
     if(element.type!=="way"||!Array.isArray(element.geometry)||element.geometry.length<2)return;
     const points=element.geometry.map(p=>[p.lat,p.lon]);
     L.polyline(points,{color:"#57c9a0",weight:name==="road"?2.5:2.2,opacity:.78,lineCap:"round",lineJoin:"round",smoothFactor:2}).addTo(group);
     drawn++;
   });
   state.layer=group.addTo(state.map);
   const stamp=new Date().toLocaleTimeString();
   setFeedState(spec.label+" · "+drawn.toLocaleString()+" mapped segments · OSM queried "+stamp,drawn?"live":"error");
   if(!drawn)setFeedState("No mapped features in this view. Pan or zoom to another region.","error");
 }catch(error){
   if(requestId!==liveRequest)return;
   console.error("Pipe-Web live infrastructure feed failed:",error);
   setFeedState("Live feed unavailable · "+(error.message||"network error")+" · retry by changing view","error");
 }
}

function setLayer(name){if(!corridors[name])return;document.querySelectorAll(".layer-pill").forEach(button=>{const active=button.dataset.layer===name;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});render(name);}
function syncMobileLayers(){const source=$("layerTray"),target=$("mobileLayerButtons");if(!source||!target||target.childElementCount)return;source.querySelectorAll(".layer-pill").forEach(button=>{const clone=button.cloneNode(true);clone.addEventListener("click",()=>setLayer(clone.dataset.layer));target.appendChild(clone);});}
function openMenu(open){$("landingMenu").hidden=!open;$("menuToggle").setAttribute("aria-expanded",String(open));}
function openSettings(open){$("landingSettings").hidden=!open;$("settingsToggle").setAttribute("aria-expanded",String(open));}
function route(){const hash=location.hash||"#/";if(hash==="#/"||hash==="#"||hash===""){document.body.classList.remove("legacy-route");$("legacyWorkspace").setAttribute("aria-hidden","true");openMenu(false);openSettings(false);return;}const routes={"#/route-planner":"route-planner","#/corridors":"intelligence","#/bottlenecks":"intelligence","#/sankey":"flowMap","#/statistics":"flowMetrics"};const target=routes[hash];if(!target){toast("Unknown section. Returning to the global map.");location.hash="#/";return;}document.body.classList.add("legacy-route");$("legacyWorkspace").setAttribute("aria-hidden","false");openMenu(false);requestAnimationFrame(()=>{const el=$(target);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});if(target==="flowMap")window.dispatchEvent(new Event("resize"));});}
$("menuToggle").addEventListener("click",()=>openMenu($("landingMenu").hidden));
$("settingsToggle").addEventListener("click",()=>openSettings($("landingSettings").hidden));
$("viewToggle").hidden=true;
$("screenshotBtn").addEventListener("click",()=>state.map&&state.map.setView([22,15],2,{animate:true}));
$("tiltToggle").addEventListener("change",()=>{$("tiltToggle").checked=false;toast("Tilt navigation is disabled in flow-map mode.");});
$("layerTray").addEventListener("click",event=>{const button=event.target.closest(".layer-pill");if(button)setLayer(button.dataset.layer);});
$("layerSheetBackdrop").addEventListener("click",()=>{$("layerSheet").hidden=true;$("layerSheetBackdrop").hidden=true;});
$("mobileLayersToggle").addEventListener("click",()=>{$("layerSheet").hidden=false;$("layerSheetBackdrop").hidden=false;});
document.addEventListener("click",event=>{if(!event.target.closest("#landingMenu,#menuToggle"))openMenu(false);if(!event.target.closest("#landingSettings,#settingsToggle"))openSettings(false);});
window.addEventListener("hashchange",route);window.addEventListener("resize",()=>state.map&&state.map.invalidateSize());
syncMobileLayers();if(!initMap())return;setLayer("sea");state.map.on("moveend",()=>{const active=document.querySelector(".layer-pill.active");if(active)render(active.dataset.layer);});route();
})();