import type { LiftFeature } from "openskidata-format";
import { getLiftsForResortId, getLiftsForResortName } from "./db";

export interface FeatureCollection<T> {
    type: "FeatureCollection",
    features: T[],
}

export interface ResortWithLifts {
    id: string,
    name: string,
    n_lifts: number,
    lifts: FeatureCollection<LiftFeature>,
}

export async function loadResortWithLifts(resortNameOrId: string): Promise<ResortWithLifts | undefined> {
    const isId = /^[0-9a-f-]+$/.test(resortNameOrId);
    let resort;
    if (isId) {
        resort = getLiftsForResortId(resortNameOrId);
    } else {
        resort = getLiftsForResortName(resortNameOrId);
    }

    if (!resort) {
        return undefined; // a resort with this name/id does not exist
    }

    // NOTE: here we trust that lift_geojson stored in the db is in the expected format
    const parsedLifts = JSON.parse(resort.lifts_geojson) as FeatureCollection<LiftFeature>;

    const resortWithLifts = {
        id: resort.id,
        name: resort.name,
        n_lifts: resort.n_lifts,
        lifts: parsedLifts,
    };

    return resortWithLifts;
}
