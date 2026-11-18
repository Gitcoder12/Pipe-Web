/* Pipe-Web geospatial layer. Geographic positions are explicitly illustrative demo coordinates. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const center = { lat: 16.5062, lng: 80.6480 };
  let mode = "schematic", map = null, globe = null, mapLayers = [], globeReady = false;
  const nodeCoords = (node) => ({
    lat: Number.isFinite(node[4]) ? node[4] : center.lat + (220 - node[3]) * 0.00019,
    lng: Number.isFinite(node[5]) ? node[5] : center.lng + (node[2] - 450) * 0.00022
  });
  function state(){ return window.PipeWeb ? window.PipeWeb.getState() : null; }
  function setMode(next) {
    mode = next;
    $("networkMap").hidden = next !== "schematic";
    $("geoMap").hidden = next !== "map";
    $("geoGlobe").hidden = next !== "globe";
    document.querySelectorAll(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === next));
    if (next === "map") { ensureMap(); drawMap(); setTimeout(() => map && map.invalidateSize(), 80); }
    if (next === "globe") { ensureGlobe(); drawGlobe(); }
  }
  function ensureMap() {
    if (map || !window.L) return;
    map = L.map("geoMap", { zoomControl:true }).setView([center.lat, center.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  }
  function drawMap() {
    const s = state(); if (!s || !map) return;
    mapLayers.forEach(layer => map.removeLayer(layer)); mapLayers = [];
    const nodes = Object.fromEntries(s.network.nodes.map(n => [n[0], { raw:n, ...nodeCoords(n) }]));
    const chosen = s.paths[s.selected] || s.paths[0];
    s.network.edges.forEach(e => {
      const a=nodes[e[0]], b=nodes[e[1]];
      const isBest=chosen && chosen.edges.includes(e);
      const layer=L.polyline([[a.lat,a.lng],[b.lat,b.lng]], {
        color:isBest?"#20b981":(s.network.congested.includes([e[0],e[1]].sort().join("-"))?"#c88752":"#8293a8"),
        weight:isBest?6:3, opacity:isBest?0.95:0.55, dashArray:isBest?null:"5 7"
      }).addTo(map);
      layer.bindTooltip(e[0]+" → "+e[1]); mapLayers.push(layer);
    });
    s.network.nodes.forEach(n => {
      const p=nodes[n[0]], isOrigin=n[0]===s.origin, isDest=n[0]===s.destination;
      const marker=L.circleMarker([p.lat,p.lng],{radius:isOrigin||isDest?8:5,color:isOrigin?"#e5b66c":isDest?"#67c9e8":"#d7e2ee",fillColor:isOrigin?"#e5b66c":isDest?"#67c9e8":"#26394e",fillOpacity:1,weight:2}).addTo(map);
      marker.bindPopup("<b>"+n[0]+" · "+n[1]+"</b><br>Illustrative demo node"); mapLayers.push(marker);
    });
    if(mapLayers.length){const bounds=L.featureGroup(mapLayers).getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(0.12),{maxZoom:16})}
    $("geoMap").setAttribute("aria-label","Interactive geographic visualization of the network");
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
  function drawGlobe() {
    const s=state(); if(!s||!globe) return;
    const nodes=Object.fromEntries(s.network.nodes.map(n=>[n[0],{raw:n,...nodeCoords(n)}]));
    const points=s.network.nodes.map(n=>{const p=nodes[n[0]];return {lat:p.lat,lng:p.lng,color:n[0]===s.origin?"#e5b66c":n[0]===s.destination?"#67c9e8":"#b8c9dc",label:n[0]+" · "+n[1]}});
    const chosen=s.paths[s.selected]||s.paths[0];
    const arcs=chosen?chosen.edges.map(e=>({startLat:nodes[e[0]].lat,startLng:nodes[e[0]].lng,endLat:nodes[e[1]].lat,endLng:nodes[e[1]].lng,color:"#69e0ad"})):[];
    globe.pointsData(points).pointLabel("label").arcsData(arcs);
    globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);
  }
  document.querySelectorAll(".view-btn").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.view)));
  window.addEventListener("pipeweb:render",()=>{if(mode==="map")drawMap();if(mode==="globe")drawGlobe();});
  window.addEventListener("resize",()=>{if(mode==="map"&&map)map.invalidateSize();if(mode==="globe"&&globe)globe.width($("geoGlobe").clientWidth).height($("geoGlobe").clientHeight);});
})();
