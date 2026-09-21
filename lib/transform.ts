export function overpassJsonToGeoJson(overpassJson: string) {
    let input;
    try {
        input = JSON.parse(overpassJson);
    } catch (e) {
        console.error(e); // TODO: error handling
        return null;
    }
    const features = input.elements?.filter(elem => elem.tags?.name).map(elem => ({
        type: "Feature",
        id: elem.id,
        properties: { ...elem.tags, status: 'unknown' }, // ideally this "status should not be part of the geoJSON but instead be in the lift map"
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