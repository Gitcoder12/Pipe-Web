"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const config=fs.readFileSync("config.js","utf8"),landing=fs.readFileSync("src/ui/landing.js","utf8"),
 geo=fs.readFileSync("geo-view.js","utf8"),html=fs.readFileSync("index.html","utf8"),worker=fs.readFileSync("workers/live-api.js","utf8");
assert.equal(fs.readFileSync("README.md","utf8").trimEnd().split("\n").length,10);
assert.match(config,/liveApiBase:\s*""/);
assert.doesNotMatch(geo,/opensky-network\.org\/api\/states\/all/);
assert.match(geo,/aircraftTrailMap/);
assert.match(geo,/globe\.pointsData\(\[\]\)\.arcsData\(arcs\)/);
assert.doesNotMatch(geo,/circleMarker|L\.marker|pointLabel/);
assert.match(landing,/flow: Not yet implemented/);
assert.match(worker,/url\.pathname==="\/api\/aircraft"/);
assert.match(worker,/url\.pathname==="\/api\/rail"/);
assert.match(html,/data-view="map"/);
assert.match(html,/flow-first-20261119/);
assert.match(html,/src="src\/feeds\/aircraft.js/);
assert.match(html,/src="src\/feeds\/rail.js/);
console.log("Platform integrity tests passed.");
