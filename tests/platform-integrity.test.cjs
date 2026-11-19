"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");

const config=fs.readFileSync("config.js","utf8");
const landing=fs.readFileSync("src/ui/landing.js","utf8");
const geo=fs.readFileSync("geo-view.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const readme=fs.readFileSync("README.md","utf8");
const worker=fs.readFileSync("workers/live-api.js","utf8");

assert.match(config,/aircraftApi:\s*""/);
assert.doesNotMatch(geo,/opensky-network\.org\/api\/states\/all/);
assert.doesNotMatch(html,/globe\.gl|id="liveGlobe"|id="geoGlobe"|Live Earth/);
assert.doesNotMatch(geo,/\bGlobe\(|globe\./);
assert.match(geo,/function ensureMap\(/);
assert.match(geo,/function drawWorld\(/);
assert.match(geo,/function drawFlowPath\(/);
assert.match(geo,/L\.bezier\(/);
assert.match(geo,/ribbonRenderer=typeof L\.svg/);
assert.match(geo,/renderer:ribbonRenderer/);
assert.match(geo,/setView\(\[22,15\],2\)/);
assert.match(geo,/light_all/);
assert.match(geo,/not verified operational routes or live traffic/);
assert.match(landing,/function drawCorridorRibbons\(/);
assert.match(landing,/overpass-api\.de\/api\/interpreter/);
assert.match(landing,/illustrative route ribbons/);
assert.match(landing,/no verified live geographic feed connected/);
assert.match(html,/data-view="world"/);
assert.doesNotMatch(html,/World flows · Not yet implemented/);
assert.match(readme,/Leaflet\.bezier/);
assert.match(readme,/schematic\/illustrative/);
assert.match(readme,/not live traffic/);
assert.match(worker,/url\.pathname !== "\/api\/aircraft"/);

console.log("Platform integrity tests passed: 2D-only map, Bezier flow views and clear modeled-vs-observed data boundaries.");
