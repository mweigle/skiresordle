
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
    let overpassJson;
    try {
        const result = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(overpassQuery),
        });
        overpassJson = await result.json();
    } catch (e) {
        console.log(e);
        return null; // TODO: error handling!
    }

    const geoJson = overpassJsonToGeoJson(overpassJson);
    console.log(geoJson);
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