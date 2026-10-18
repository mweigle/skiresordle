import Database from "better-sqlite3";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const DATA_URL = "https://tiles.openskimap.org/geojson";
const databasePath = resolve("data/openskidata.db");
const temporaryDatabasePath = `${databasePath}.${process.pid}.tmp`;
const localDataDirectory = process.env.OPENSKIDATA_DATA_DIR
    ? resolve(process.env.OPENSKIDATA_DATA_DIR)
    : null;

async function fetchFeatureCollection(resource) {
    let collection;
    if (localDataDirectory) {
        const filePath = join(localDataDirectory, `${resource}.geojson`);
        collection = JSON.parse(await readFile(filePath, "utf8"));
    } else {
        const response = await fetch(`${DATA_URL}/${resource}.geojson`);
        if (!response.ok) {
            throw new Error(`OpenSkiMap API error -- status: ${response.status}, msg: ${response.statusText}`);
        }
        collection = await response.json();
    }

    if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
        throw new Error(`OpenSkiMap returned an invalid ${resource} FeatureCollection`);
    }
    return collection;
}

function indexUsableLifts(lifts) {
    const liftsBySkiArea = new Map();
    let excludedCount = 0;

    for (const lift of lifts.features) {
        const properties = lift?.properties;
        if (
            !properties?.name ||
            typeof properties.id !== "string" ||
            properties.status !== "operating" ||
            !Array.isArray(properties.skiAreas) ||
            properties.skiAreas.length === 0
        ) {
            excludedCount++;
            continue;
        }

        lift.id = properties.id;
        const associatedSkiAreaIds = new Set();
        for (const skiArea of properties.skiAreas) {
            const skiAreaId = skiArea?.properties?.id;
            if (typeof skiAreaId !== "string" || associatedSkiAreaIds.has(skiAreaId)) {
                continue;
            }
            associatedSkiAreaIds.add(skiAreaId);

            let skiAreaLifts = liftsBySkiArea.get(skiAreaId);
            if (!skiAreaLifts) {
                skiAreaLifts = [];
                liftsBySkiArea.set(skiAreaId, skiAreaLifts);
            }
            skiAreaLifts.push(lift);
        }
    }

    console.log(`Selected ${[...liftsBySkiArea.values()].reduce((count, areaLifts) => count + areaLifts.length, 0)} lift associations; excluded ${excludedCount} lifts.`);
    return liftsBySkiArea;
}

function createDatabase(skiAreas, liftsBySkiArea) {
    const database = new Database(temporaryDatabasePath);
    let resortCount = 0;

    try {
        database.exec(`
            CREATE TABLE resorts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                n_lifts INTEGER NOT NULL,
                lifts_geojson TEXT NOT NULL
            )
        `);

        const insertResort = database.prepare(
            "INSERT INTO resorts (id, name, n_lifts, lifts_geojson) VALUES (?, ?, ?, ?)"
        );
        const insertResorts = database.transaction(() => {
            for (const skiArea of skiAreas.features) {
                const properties = skiArea?.properties;
                if (
                    properties?.status !== "operating" ||
                    !properties.name ||
                    !properties.activities?.includes("downhill") ||
                    !properties.statistics
                ) {
                    continue;
                }

                const areaLifts = liftsBySkiArea.get(properties.id);
                if (!areaLifts?.length) {
                    continue;
                }

                const liftsGeoJson = JSON.stringify({
                    type: "FeatureCollection",
                    features: areaLifts,
                });
                 // TODO: find a way to put stable IDs, maybe hash the name or smth...
                insertResort.run(properties.id, properties.name, areaLifts.length, liftsGeoJson);
                resortCount++;
            }
        });

        insertResorts();
        database.close();
        return resortCount;
    } catch (error) {
        if (database.open) {
            database.close();
        }
        throw error;
    }
}

async function main() {
    const liftsBySkiArea = indexUsableLifts(await fetchFeatureCollection("lifts"));
    const skiAreas = await fetchFeatureCollection("ski_areas");

    await mkdir(dirname(databasePath), { recursive: true });
    await rm(temporaryDatabasePath, { force: true });

    try {
        const resortCount = createDatabase(skiAreas, liftsBySkiArea);
        await rename(temporaryDatabasePath, databasePath);
        console.log(`Built ${databasePath} with ${resortCount} ski resorts.`);
    } finally {
        await rm(temporaryDatabasePath, { force: true });
        await rm(`${temporaryDatabasePath}-journal`, { force: true });
    }
}

main().catch(error => {
    console.error("Failed to build the OpenSkiMap database:", error);
    process.exitCode = 1;
});
