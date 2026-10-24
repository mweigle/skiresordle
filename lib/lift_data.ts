import { LiftGeometry, LiftType } from "openskidata-format";
import { getLiftsByResortId, getResortById, getResortByName } from "./db";

export interface FeatureCollection<T> {
    type: "FeatureCollection",
    features: T[],
}

export interface Lift {
    id: number,
    name: string,
    liftType: LiftType,
}

export interface ResortWithLifts {
    id: string,
    name: string,
    n_lifts: number,
    lifts: FeatureCollection<GeoJSON.Feature<LiftGeometry, Lift>>,
}

export async function loadResortWithLifts(resortNameOrId: string): Promise<ResortWithLifts | undefined> {
    const isId = /^[0-9a-f-]+$/.test(resortNameOrId);
    let resort;
    if (isId) {
        resort = getResortById(resortNameOrId);
    } else {
        resort = getResortByName(resortNameOrId);
    }

    if (!resort) {
        return undefined; // a resort with this name/id does not exist
    }

    const lifts = getLiftsByResortId(resort.id);
    const features: GeoJSON.Feature<LiftGeometry, Lift>[] = lifts.map(lift => {
        // NOTE: here we trust that geometry geojson is stored in the db is in the expected format
        const parsedGeometry = JSON.parse(lift.geometry);
        return {
            type: "Feature",
            id: lift.id,
            geometry: parsedGeometry,
            properties: {
                id: lift.id,
                name: lift.name,
                liftType: lift.lift_type as LiftType,
            }
        };
    }); 

    const resortWithLifts: ResortWithLifts = {
        id: resort.id,
        name: resort.name,
        n_lifts: resort.n_lifts,
        lifts: {
            type: "FeatureCollection",
            features,
        },
    };

    return resortWithLifts;
}
