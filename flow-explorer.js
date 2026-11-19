(() => {
"use strict";
const $=id=>document.getElementById(id);
if(!$("flowMap")||!window.L)return;
let map=null,flowLayer=null,kind="goods",network="ships",layers=[];
const goods=[["2709","Crude oil"],["2701","Coal"],["271111","Liquefied natural gas"],["2710","Refined petroleum"],["all","All goods"]];
const services=[["200","Transport services"],["236","Travel services"],["266","Telecommunications & IT"],["268","Other business services"],["280","Personal & cultural services"]];
const number=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});
const money=n=>{const v=Number(n||0);return v>=1e12?"$"+(v/1e12).toFixed(2)+"T":v>=1e9?"$"+(v/1e9).toFixed(2)+"B":v>=1e6?"$"+(v/1e6).toFixed(1)+"M":"$"+number(v)};
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function status(message,ok=false){$("flowFeedStatus").textContent=message;$("flowFeedStatus").style.color=ok?"#9fe0c7":"#d9b17b";}
function label(){return $("flowCommodity").selectedOptions[0]?.text||"Goods";}
function setOptions(){const options=kind==="goods"?goods:services;$("flowCommodity").innerHTML=options.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("");}
function ensureMap(){
 if(map)return;
 map=L.map("flowMap",{worldCopyJump:true,zoomControl:true,minZoom:2}).setView([20,0],2);
 L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  {maxZoom:8,attribution:'&copy; OpenStreetMap contributors &copy; CARTO'}).addTo(map);
 flowLayer=L.layerGroup().addTo(map);
 if(network==="ships")drawTracks(window.PipeWebMaritime?.snapshot()?.tracks||[],"sea");
 else if(network==="aircraft")drawTracks(window.PipeWebAircraft?.snapshot()?.tracks||[],"air");
 else if(network==="rail")drawTracks(window.PipeWebRail?.snapshot()?.tracks||[],"rail");
 requestAnimationFrame(()=>map&&map.invalidateSize());
}
function clearTracks(){if(flowLayer)flowLayer.clearLayers();}
function typeColor(type){
 const n=Number(type);
 if(n>=80&&n<=89)return "#ff986b";
 if(n>=70&&n<=79)return "#61c6ff";
 if(n>=60&&n<=69)return "#b69cff";
 if(n>=30&&n<=39)return "#6de0b2";
 if(n>=50&&n<=59)return "#e5cf73";
 return "#72d7d0";
}
function drawTracks(tracks,mode){
 if(!flowLayer)return;
 clearTracks();
 (tracks||[]).forEach(track=>{
  const pts=(track.points||[]).slice(-8).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
  if(pts.length<2)return;
  const color=mode==="sea"?typeColor(track.shipType):mode==="air"?"#b69cff":"#ffbd70";
  const line=L.polyline(pts.map(p=>[p.lat,p.lon]),{
   color,weight:2.8,opacity:.92,lineCap:"round",lineJoin:"round",className:"pipeweb-flow-track"
  }).addTo(flowLayer);
  line.bindTooltip(mode.toUpperCase()+" · repeat observations");
 });
 const count=(tracks||[]).filter(t=>(t.points||[]).length>1).length;
 if(count&&map){const bounds=flowLayer.getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.1),{maxZoom:4});}
 $("flowVesselCount").textContent=number(count);
 $("flowVesselNote").textContent=count?"Observed trails · lines require repeat positions":"Waiting for repeat positions; no route is inferred.";
}
function clearTradeLayers(){layers.forEach(layer=>map&&map.removeLayer(layer));layers=[];}
function liveApiEndpoint(key,path){
 const cfg=window.PIPEWEB_CONFIG||{};
 return cfg[key]||(cfg.liveApiBase?cfg.liveApiBase.replace(/\/$/,"")+path:"");
}
function chooseNetwork(next){
 network=next;
 document.querySelectorAll(".network-card").forEach(button=>button.classList.toggle("active",button.dataset.network===next));
 if(map)clearTracks();
 if(next==="ships"){
  status("CONNECTING TO LIVE AIS · OPENSEAFEED");
  if(window.PipeWebMaritime&&window.PipeWebMaritime.status==="DISCONNECTED")window.PipeWebMaritime.connect();
  if(map)drawTracks(window.PipeWebMaritime?.snapshot()?.tracks||[],"sea");
 }else if(next==="aircraft"||next==="rail"){
  const air=next==="aircraft",key=air?"aircraftApi":"railApi",path=air?"/api/aircraft":"/api/rail";
  const feed=air?window.PipeWebAircraft:window.PipeWebRail,endpoint=liveApiEndpoint(key,path);
  if(!endpoint||!feed){status((air?"AIR":"RAIL")+" FEED NEEDS WORKER CONFIGURATION");$("flowVesselCount").textContent="—";$("flowVesselNote").textContent="Configure the Worker URL in config.js"; }
  else {feed.connect(endpoint);if(map)drawTracks(feed.snapshot().tracks,air?"air":"rail");status("CONNECTING TO "+(air?"ADS-B":"FINTRAFFIC RAIL"));}
 }else{
  status(next.toUpperCase()+" FLOW · NOT YET IMPLEMENTED");
  $("flowVesselCount").textContent="—";$("flowVesselNote").textContent="No verified free live feed is wired for this network yet.";
 }
 $("flowMapTitle").textContent=next.toUpperCase()+" FLOW · "+label().toUpperCase();
}
function plot(rows){
 // Trade values have no verified country-to-country path geometry. Keep values in the table;
 // never turn country centroids into invented movement paths.
 clearTradeLayers();
 return rows.filter(row=>Number(row.primaryValue)>0)
  .sort((a,b)=>Number(b.primaryValue)-Number(a.primaryValue)).slice(0,35);
}
function table(rows,period){
 const html=rows.slice(0,15).map((row,i)=>'<tr><td>'+String(i+1).padStart(2,"0")+'</td><td>'+esc(row.partnerDesc||"Partner")+'</td><td>'+(row.netWgt?number(row.netWgt)+" kg":"—")+'</td><td>'+money(row.primaryValue)+'</td></tr>').join("");
 $("flowTable").innerHTML=html?'<table class="flow-table"><thead><tr><th>RANK</th><th>TRADE PARTNER</th><th>NET WEIGHT</th><th>REPORTED VALUE (USD)</th></tr></thead><tbody>'+html+'</tbody></table>':'<div class="flow-empty">No partner records were returned for this selection.</div>';
 $("flowTableNote").textContent=rows.length+" reported partner records";
 $("flowTotalValue").textContent=money(rows.reduce((sum,row)=>sum+Number(row.primaryValue||0),0));
 $("flowPartnerCount").textContent=number(rows.length);$("flowDataPeriod").textContent=period;
 $("flowFreshness").textContent="Reported trade statistics · not live cargo telemetry";
 $("flowMapPeriod").textContent="REPORTED PERIOD: "+period;
 $("flowMapSource").textContent="SOURCE: UN COMTRADE · TABLE ONLY · NO ROUTE GEOMETRY";
}
async function load(){
 ensureMap();
 const reporter=$("flowReporter").value,period=$("flowPeriod").value,code=$("flowCommodity").value;
 const endpoint=kind==="goods"?"C/M/HS":"S/A/EBOPS";
 const url="https://comtradeapi.un.org/public/v1/preview/"+endpoint+"?reporterCode="+reporter+"&period="+period+"&flowCode=X"+(code==="all"?"":"&cmdCode="+code);
 const button=$("loadTradeFlows");button.disabled=true;button.textContent="FETCHING DATA…";
 status("REQUESTING UN COMTRADE · REPORTED VALUES");
 $("flowTable").innerHTML='<div class="flow-empty">Requesting official trade records…</div>';
 try{
  const response=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store"});
  if(!response.ok)throw new Error("UN Comtrade returned HTTP "+response.status);
  const payload=await response.json();if(payload.error)throw new Error(payload.error);
  const rows=Array.isArray(payload.data)?payload.data:[];
  if(!rows.length)throw new Error("No records for this selection. Try another period or reporter.");
  const valid=plot(rows);table(rows,period);
  $("flowMapTitle").textContent=network.toUpperCase()+" FLOW · "+label().toUpperCase();
  status("COMTRADE RESPONDED · "+valid.length+" REPORTED RECORDS",true);
  $("flowVesselNote").textContent="Reported values are in the table, not plotted as geographic routes.";
 }catch(error){
  status("TRADE STATISTICS UNAVAILABLE");
  $("flowTable").innerHTML='<div class="flow-empty">'+esc(error.message||"Data request failed")+'<br><br>UN Comtrade public preview may not have this reporter, category or period available.</div>';
  $("flowTotalValue").textContent="—";$("flowPartnerCount").textContent="—";$("flowDataPeriod").textContent="—";$("flowFreshness").textContent="No source response";
 }finally{button.disabled=false;button.innerHTML="SHOW REPORTED VALUES ↗";}
}
document.querySelectorAll(".network-card").forEach(button=>button.addEventListener("click",()=>chooseNetwork(button.dataset.network)));
document.querySelectorAll(".flow-toggle button").forEach(button=>button.addEventListener("click",()=>{
 kind=button.dataset.kind;document.querySelectorAll(".flow-toggle button").forEach(item=>item.classList.toggle("active",item===button));
 setOptions();$("flowMapTitle").textContent=network.toUpperCase()+" FLOW · "+label().toUpperCase();
}));
$("flowCommodity").addEventListener("change",()=>$("flowMapTitle").textContent=network.toUpperCase()+" FLOW · "+label().toUpperCase());
$("loadTradeFlows").addEventListener("click",load);
if(window.PipeWebMaritime)window.PipeWebMaritime.subscribe(feed=>{
 if(network!=="ships")return;
 drawTracks(feed.tracks||[],"sea");
 status(feed.status==="LIVE"?"LIVE AIS · "+(feed.tracks||[]).filter(t=>(t.points||[]).length>1).length+" FLOW TRAILS":"AIS · "+feed.status,feed.status==="LIVE");
});
if(window.PipeWebAircraft)window.PipeWebAircraft.subscribe(feed=>{if(network==="aircraft"&&map){drawTracks(feed.tracks||[],"air");status("ADS-B · "+feed.status,feed.status==="LIVE");}});
if(window.PipeWebRail)window.PipeWebRail.subscribe(feed=>{if(network==="rail"&&map){drawTracks(feed.tracks||[],"rail");status("FINTRAFFIC · "+feed.status,feed.status==="LIVE");}});
window.addEventListener("pipeweb:section-visible",event=>{
 if(event.detail?.id==="flowMap"){ensureMap();chooseNetwork(network);}
});
window.addEventListener("resize",()=>map?.invalidateSize());
chooseNetwork("ships");status("SELECT A FLOW NETWORK");
$("flowTable").innerHTML='<div class="flow-empty">Historical UN Comtrade statistics appear here. They are reported trade values—not live cargo telemetry.</div>';
})();
