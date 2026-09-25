import { GeoFeature, GeoFeatureList, OverpassJson, OverpassResorts, ResortIdent, ResortWithLifts } from "@/types/types";
import { getLiftsForResortId, getLiftsForResortName, getResorts, insertLiftsForResort, insertResorts } from "./db";

const OVERPASS_API = "https://overpass-api.de/api/interpreter";

function queryApi(overpassQuery: string) {
    console.log("calling overpass API", overpassQuery);
    return fetch(OVERPASS_API, {
        method: "POST",
        body: "data=" + encodeURIComponent(overpassQuery),
        headers: {
            "User-Agent": "Skiresordle"
        }
    });
}

async function fetchResortLifts(resortId: number): Promise<GeoFeatureList> {
    const overpassQuery =
        `[out:json][timeout:25];
way(${resortId})->.resort;
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
    const result = await queryApi(overpassQuery);
    if (!result.ok) {
        throw new Error(`Overpass API error -- status: ${result.status}, msg: ${result.statusText}`);
    }
    const overpassJson = await result.json();
    const geoJson = overpassJsonToGeoJson(overpassJson);
    return geoJson;
}

function overpassJsonToGeoJson(overpassJson: OverpassJson): GeoFeatureList {
    const features = overpassJson.elements
        .filter(elem => elem.tags?.name)
        .map((elem): GeoFeature => ({
            type: "Feature",
            id: elem.id,
            properties: {
                ...elem.tags,
                type: elem.tags.aerialway ?? elem.tags.railway ?? "unknown",
            },
            geometry: {
                type: "LineString",
                coordinates: (elem.geometry ?? []).map(coord => [coord.lon, coord.lat]),
            },
        }));

    return {
        type: "FeatureCollection",
        features,
    };
}

export async function loadOrFetchLifts(resortNameOrId: string | number): Promise<ResortWithLifts | undefined> {
    const id = Number(resortNameOrId);
    let resort;
    if (id) {
        resort = getLiftsForResortId(id);
    } else {
        resort = getLiftsForResortName(resortNameOrId as string);
    }

    if (!resort) {
        return undefined; // a resort with this name/id does not exist
    }

    if (resort.lifts) {
        return resort; // the resort exists and the lifts were already loaded
    }

    // console.log("lift data not loaded yet");

    const lifts = await fetchResortLifts(resort.id); // NOTE: this may throw an exception
    // console.log("successfully fetched data");
    insertLiftsForResort(resort.id, lifts);
    resort.lifts = lifts;

    return resort;
}

export async function fetchResorts(): Promise<number> {
    const overpassQuery = `[out:json][timeout:25]; area["landuse"="winter_sports"]; out tags;`

    const result = await queryApi(overpassQuery);
    if (!result.ok) {
        throw new Error(`Overpass API error -- status: ${result.status}, msg: ${result.statusText}`);
    }
    const resorts = await result.json() as OverpassResorts;

    // resorts must have a "name" tag; if the "sport" tag is set, then it must include "skiing"
    const skiResorts = resorts.elements.filter(({ tags }) => tags.name && (!tags.sport || tags.sport.includes("skiing")));
    insertResorts(skiResorts);
    return skiResorts.length;
}

export function loadCachedResorts(): ResortIdent[] {
    return getResorts();
}