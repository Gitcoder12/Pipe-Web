/**
 * Pipe-Web public-data edge gateway.
 * /api/aircraft samples six free ADS-B regions; OpenSky is a cached fallback.
 * /api/rail proxies Finland's current train-location GeoJSON.
 * No provider credentials, fabricated positions or cargo inference.
 */
const AIR_CACHE_SECONDS = 60 * 60;
const RAIL_CACHE_SECONDS = 30;
const AIR_REGIONS = [[50,10],[22,78],[35,135],[40,-100],[-15,-60],[-25,135]];
const AIR_RADIUS_NM = 250;
const ADSB_BASE = "https://api.adsb.lol/v2/point";
const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const RAIL_URL = "https://rata.digitraffic.fi/api/v1/train-locations.geojson/latest";

function json(data,status=200,cacheSeconds=0,extra={}) {
  return new Response(JSON.stringify(data),{status,headers:{
    "content-type":"application/json; charset=utf-8",
    "cache-control":cacheSeconds?`public, max-age=0, s-maxage=${cacheSeconds}`:"no-store",
    "access-control-allow-origin":"*","access-control-allow-methods":"GET, OPTIONS",
    "access-control-allow-headers":"content-type",...extra
  }});
}
async function cached(request,ctx,path,ttl,producer) {
  const cache=caches.default,key=new Request(new URL("/__pipeweb_cache"+path,request.url));
  const hit=await cache.match(key);
  if(hit){const headers=new Headers(hit.headers);headers.set("x-pipeweb-cache","HIT");return new Response(hit.body,{status:hit.status,headers});}
  const result=await producer(),out=json(result.body,result.status||200,ttl);
  const stored=new Response(out.clone().body,{status:out.status,headers:out.headers});
  ctx.waitUntil(cache.put(key,stored));
  const headers=new Headers(out.headers);headers.set("x-pipeweb-cache","MISS");
  return new Response(out.body,{status:out.status,headers});
}
async function fetchAircraft() {
  const aircraftByHex=new Map(),failures=[];
  await Promise.all(AIR_REGIONS.map(async([lat,lon])=>{
    try {
      const url=`${ADSB_BASE}/${lat}/${lon}/${AIR_RADIUS_NM}`;
      const upstream=await fetch(url,{headers:{accept:"application/json"}});
      if(!upstream.ok)throw new Error("adsb.lol HTTP "+upstream.status);
      const payload=await upstream.json();
      for(const a of (Array.isArray(payload.ac)?payload.ac:[])) {
        if(!a.hex||!Number.isFinite(a.lat)||!Number.isFinite(a.lon))continue;
        const id=String(a.hex).toLowerCase(),seen=Number.isFinite(a.seen_pos)?a.seen_pos:Infinity;
        const old=aircraftByHex.get(id);
        if(old&&old.seen<=seen)continue;
        const altFeet=typeof a.alt_baro==="number"?a.alt_baro:(typeof a.alt_geom==="number"?a.alt_geom:null);
        aircraftByHex.set(id,{seen,record:{
          icao24:id,callsign:String(a.flight||"").trim(),aircraftType:a.t||null,
          latitude:a.lat,longitude:a.lon,altitudeM:altFeet==null?null:altFeet*.3048,
          onGround:a.alt_baro==="ground"||a.alt_geom==="ground",
          velocityMs:Number.isFinite(a.gs)?a.gs*.514444:null,
          headingDeg:Number.isFinite(a.track)?a.track:null,
          lastContact:Number.isFinite(a.seen_pos)?Date.now()/1000-a.seen_pos:null
        }});
      }
    } catch(error) { failures.push(error instanceof Error?error.message:String(error)); }
  }));
  let aircraft=[...aircraftByHex.values()].map(entry=>entry.record),source="adsb.lol";
  if(!aircraft.length) {
    const upstream=await fetch(OPENSKY_URL,{headers:{accept:"application/json"}});
    if(!upstream.ok)return {status:upstream.status===429?503:upstream.status,body:{
      status:"OFFLINE",source:"adsb.lol / OpenSky",error:"No usable aircraft positions were returned.",details:failures
    }};
    const payload=await upstream.json();
    aircraft=(Array.isArray(payload.states)?payload.states:[]).flatMap(s=>{
      if(!Number.isFinite(s[5])||!Number.isFinite(s[6]))return [];
      return [{icao24:s[0],callsign:(s[1]||"").trim(),aircraftType:null,originCountry:s[2]||null,
        longitude:s[5],latitude:s[6],altitudeM:Number.isFinite(s[7])?s[7]:null,onGround:Boolean(s[8]),
        velocityMs:Number.isFinite(s[9])?s[9]:null,headingDeg:Number.isFinite(s[10])?s[10]:null,
        lastContact:Number.isFinite(s[4])?s[4]:null}];
    });
    source="OpenSky Network";
  }
  return {body:{status:"LIVE",source,fetchedAt:new Date().toISOString(),count:aircraft.length,aircraft,
    coverageNote:source==="adsb.lol"
      ?"Six sampled 250 NM regions, refreshed hourly; not continuous global coverage. A line is drawn only after a repeated changed position."
      :"Cached OpenSky global state-vector snapshot; receiver coverage is incomplete.",
    fallbackNote:failures.length?"Some adsb.lol regions could not be queried.":null}};
}
async function fetchRail() {
  const upstream=await fetch(RAIL_URL,{headers:{accept:"application/geo+json, application/json",
    "Digitraffic-User":"Pipe-Web/2.1 (https://github.com/Gitcoder12/Pipe-Web)"}});
  if(!upstream.ok)return {status:upstream.status,body:{status:"OFFLINE",source:"Fintraffic Digitraffic",error:"Rail provider returned HTTP "+upstream.status}};
  const payload=await upstream.json();
  const trains=(Array.isArray(payload.features)?payload.features:[]).flatMap(feature=>{
    const c=feature.geometry?.coordinates,p=feature.properties||{};
    if(!Array.isArray(c)||!Number.isFinite(c[0])||!Number.isFinite(c[1]))return [];
    return [{id:String(p.departureDate||"")+":"+String(p.trainNumber||""),
      trainNumber:p.trainNumber??null,departureDate:p.departureDate??null,
      longitude:c[0],latitude:c[1],timestamp:p.timestamp??null,
      trainType:p.trainType??null,trainCategory:p.trainCategory??null}];
  });
  return {body:{status:"LIVE",source:"Fintraffic Digitraffic",fetchedAt:new Date().toISOString(),
    count:trains.length,trains,coverageNote:"Current train positions for Finland only. Lines connect successive observed position snapshots; they are not published route geometry."}};
}
export default {
  async fetch(request,env,ctx) {
    const url=new URL(request.url);
    if(request.method==="OPTIONS")return json({},204);
    if(request.method!=="GET")return json({error:"Method not allowed"},405);
    if(url.pathname==="/api/aircraft")return cached(request,ctx,"/aircraft",AIR_CACHE_SECONDS,fetchAircraft);
    if(url.pathname==="/api/rail")return cached(request,ctx,"/rail",RAIL_CACHE_SECONDS,fetchRail);
    return json({error:"Not found"},404);
  }
};
