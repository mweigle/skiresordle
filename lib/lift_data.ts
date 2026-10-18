import { LiftStatistics, SkiAreaActivity, Status, type LiftFeature, type SkiAreaFeature } from "openskidata-format";
import { getLiftsForResortId, getLiftsForResortName, insertResortsTransaction } from "./db";
import type { DbResort } from "./db";

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

export function buildSkiResortDb(skiAreas: FeatureCollection<SkiAreaFeature>, lifts: FeatureCollection<LiftFeature>) {
    lifts = filterLifts(lifts);

    let nResorts = 0;
    insertResortsTransaction(insertResort => {
        for (const skiResort of skiAreas.features) {
            const properties = skiResort.properties;
            if (properties.status !== Status.Operating
                || !properties.name
                || !properties.activities.includes(SkiAreaActivity.Downhill)
                || !properties.statistics) {
                console.log(`Ski area ${properties.name ?? properties.id} does not operate / is not a downhill ski area / is missing statistics`);
                continue;
            }
            let nLifts = liftCount(properties.statistics.lifts);
            if (!nLifts) {
                console.log(`Ski area ${properties.name} has 0 lifts`);
                continue;
            }

            // collect lifts for the resort, XXX: performance...
            const searchId = properties.id;
            const liftsInResort = new Array(nLifts); // pre-size the array in the hope that JavaScript does not re-allocate
            let i = 0;
            nextLift: for (const lift of lifts.features) {
                if (i === nLifts) break nextLift;
                for (const area of lift.properties.skiAreas) {
                    if (area.properties.id === searchId) {
                        liftsInResort[i++] = lift;
                        continue nextLift;
                    }
                }
            }
            // due to filtering, there can be less "game-appropriate" lifts than total lifts for a resort
            if (i === 0) {
                console.log(`skipping ${properties.name}, got 0 usable lifts`);
                continue;
            } else {
                nLifts = i;
                liftsInResort.length = i;
            }


            const liftsFeatureCollection = JSON.stringify({
                type: "FeatureCollection",
                features: liftsInResort,
            });

            // TODO: generate a unique ID based on the resort's name because this is more
            // stable than using the OpenSkiData id which is just a hash over the feature

            insertResort({
                id: properties.id,
                name: properties.name,
                n_lifts: nLifts,
                lifts_geojson: liftsFeatureCollection,
            } as DbResort);
            nResorts++;
        }
    });
    return nResorts;
}

export async function queryOpenSkiData<T>(resource: string): Promise<FeatureCollection<T>> {
    const response = await fetch(`https://tiles.openskimap.org/geojson/${resource}.geojson`);
    if (!response.ok) {
        throw new Error(`OpenSkiMap API error -- status: ${response.status}, msg: ${response.statusText}`);
    }

    const collection = await response.json() as FeatureCollection<T>; // NOTE: we assume that the data is formatted correctly here
    return collection;
}

function liftCount(lifts: LiftStatistics): number {
    return Object.values(lifts.byType).reduce((count, type) => count + type.count, 0);
}

function filterLifts(lifts: FeatureCollection<LiftFeature>): FeatureCollection<LiftFeature> {
    lifts.features = lifts.features.filter(lift => {
        const properties = lift.properties;
        if (!properties.name || properties.status !== Status.Operating) {
            console.log(`Lift "${properties.name ?? properties.id}" has no name / is not operating`);
            return false;
        }
        if (!properties.skiAreas.length) {
            console.log(`Lift ${properties.name} does not belong to a ski area`);
            return false;
        }
        lift.id = lift.properties.id; // promote the ID to the feature ID so that lookups will work inside the game
        return true;
    });
    return lifts;
}
