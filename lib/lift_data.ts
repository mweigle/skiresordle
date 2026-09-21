import { FetchResult, getLiftsForResort, insertLiftsForResort, insertResorts } from "./db";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

async function fetchResortLifts(resortName: string) {
    const overpassQuery =
        `[out:json][timeout:25];
(
  way["name"="${resortName}"];
)->.resort;
(
  way["aerialway"="cable_car"](area.resort);
  way["aerialway"="gondola"](area.resort);
  way["aerialway"="chair_lift"](area.resort);
  way["aerialway"="mixed_lift"](area.resort);
  way["aerialway"="t-bar"](area.resort);
  way["aerialway"="j-bar"](area.resort);
  way["aerialway"="platter"](area.resort);
  way["aerialway"="rope_tow"](area.resort);
  way["aerialway"="magic_carpet"](area.resort);
  way["railway"="funicular"](area.resort);
);

out geom;
 `
    const result = await fetch(OVERPASS_API, {
        method: "POST",
        body: "data=" + encodeURIComponent(overpassQuery),
        headers: {
            "User-Agent": "Skiresordle"
        }
    });
    const overpassJson = await result.json();
    const geoJson = overpassJsonToGeoJson(overpassJson);
    return geoJson;
}

function overpassJsonToGeoJson(overpassJson) {
    const features = overpassJson.elements?.filter(elem => elem.tags?.name).map(elem => ({
        type: "Feature",
        id: elem.id,
        properties: elem.tags,
        geometry: {
            type: "LineString",
            coordinates: elem.geometry?.map(coord => [coord.lon, coord.lat])
        },
    }));

    const geoJson = {
        type: "FeatureCollection",
        features: features,
    };

    return geoJson;
}

export async function loadOrFetchLifts(resortName: string) {
    const fetchRes = getLiftsForResort(resortName);
    switch (fetchRes.res) {
        case FetchResult.GeoJson:
            return fetchRes.val;
        case FetchResult.DoesNotExist:
            return undefined;
        case FetchResult.JsonError:
            throw fetchRes.val;
        case FetchResult.NotLoaded:
    }

    // console.log("lift data not loaded yet");

    const lifts = await fetchResortLifts(resortName); // NOTE: this may throw an exception
    // console.log("successfully fetched data");
    insertLiftsForResort(resortName, lifts);

    return lifts;
}

export async function fetchResortNames(): Promise<number> {
    const overpassQuery = `[out:json][timeout:25]; area["landuse"="winter_sports"]; out tags;`
    const result = await fetch(OVERPASS_API, {
        method: "POST",
        body: "data=" + encodeURIComponent(overpassQuery),
        headers: {
            "User-Agent": "Skiresordle",
        }
    });

    if (!result.ok) {
        throw new Error(`Overpass API error -- status: ${result.status}, msg: ${result.statusText}`);
    }
    const resorts = await result.json();
    
    // resorts must have a "name" tag; if the "sport" tag is set, then it must include "skiing"
    const skiResorts = resorts.elements.filter(({ tags }) => tags.name && (!tags.sport || tags.sport.includes("skiing")));
    insertResorts(skiResorts);
    return skiResorts.length;
}