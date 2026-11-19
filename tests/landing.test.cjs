"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const ui = fs.readFileSync("src/ui/landing.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

assert.match(html, /id="liveMap"/);
assert.match(html, /id="layerTray"/);
assert.match(html, /id="liveCounts"/);
assert.match(html, /id="legacyWorkspace"/);
assert.match(html, /id="flowRibbonSwatch"/);
assert.match(html, /leaflet\.bezier@2\.1\.0\/dist\/leaflet\.bezier\.global\.js/);
assert.ok(html.indexOf("leaflet.js") < html.indexOf("leaflet.bezier"), "Leaflet must load before its Bezier plugin");
assert.doesNotMatch(html, /globe\.gl|id="liveGlobe"|id="geoGlobe"/);

assert.match(ui, /function drawFlowPath\(/);
assert.match(ui, /state\.ribbonRenderer=typeof L\.svg/);
assert.match(ui, /renderer:state\.ribbonRenderer/);
assert.match(ui, /L\.bezier\(/);
assert.match(ui, /function drawCorridorRibbons\(/);
assert.match(ui, /prefers-reduced-motion: reduce/);
assert.match(ui, /overpass-api\.de\/api\/interpreter/);
assert.match(ui, /new AbortController\(/);
assert.match(ui, /scheduleRender\(active\.dataset\.layer,false\)/);
for (const mode of ["sea", "road", "air", "rail", "pipe", "digital"]) {
  assert.match(ui, new RegExp(mode + ":"));
}
for (const color of ["#0077b6", "#e4572e", "#2ecc40", "#008f95", "#ff8c00", "#9b59b6"]) {
  assert.ok(ui.includes(color), "Missing transport-mode ribbon colour " + color);
}
assert.match(css, /pipeweb-flow-ribbon--sea/);
assert.match(css, /pipeweb-flow-ribbon--digital/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.doesNotMatch(ui, /1,247 ships|3,412 aircraft/);

console.log("Landing tests passed: 2D map, six ribbon modes, reduced motion, OSM geometry and honest source boundaries.");
