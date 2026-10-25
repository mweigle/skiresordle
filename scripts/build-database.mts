import Database from "better-sqlite3";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { SkiAreaActivity, Status } from "openskidata-format";
import type { LiftFeature, LiftGeometry, SkiAreaFeature } from "openskidata-format";
import type { Position } from "geojson";
import { createHash } from "node:crypto";

interface FeatureCollection<T> {
    type: "FeatureCollection";
    features: T[];
}

type OpenSkiDataResource = "lifts" | "ski_areas";

const DATA_URL = "https://tiles.openskimap.org/geojson";
const databasePath = resolve("data/openskidata.db");
const temporaryDatabasePath = `${databasePath}.${process.pid}.tmp`;
const localDataDirectory = process.env.OPENSKIDATA_DATA_DIR
    ? resolve(process.env.OPENSKIDATA_DATA_DIR)
    : null;

async function fetchFeatureCollection<T>(
    resource: OpenSkiDataResource
): Promise<FeatureCollection<T>> {
    let collection: unknown;
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

    if (
        typeof collection !== "object" ||
        collection === null ||
        !("type" in collection) ||
        collection.type !== "FeatureCollection" ||
        !("features" in collection) ||
        !Array.isArray(collection.features)
    ) {
        throw new Error(`OpenSkiMap returned an invalid ${resource} FeatureCollection`);
    }
    return collection as FeatureCollection<T>;
}

function indexUsableLifts(
    lifts: FeatureCollection<LiftFeature>
): Map<string, LiftFeature[]> {
    const liftsBySkiArea = new Map<string, LiftFeature[]>();
    let excludedCount = 0;

    for (const lift of lifts.features) {
        const properties = lift?.properties;
        if (
            !properties?.name ||
            typeof properties.id !== "string" ||
            properties.status !== Status.Operating ||
            !Array.isArray(properties.skiAreas) ||
            properties.skiAreas.length === 0
        ) {
            excludedCount++;
            continue;
        }

        lift.id = properties.id;
        const associatedSkiAreaIds = new Set<string>();
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
            lift.geometry = simplifyLiftGeometry(lift.geometry);

            const duplicateByName = skiAreaLifts.find(other => other.properties.name === properties.name);
            if (duplicateByName) {
                // duplicate names do occur, primarily in railways/funiculars (e.g. Parsenbahn (Parsenn))
                duplicateByName.geometry = mergeGeometries(lift.geometry, duplicateByName.geometry);
            } else {
                skiAreaLifts.push(lift);
            }
        }
    }

    const associationCount = [...liftsBySkiArea.values()]
        .reduce((count, areaLifts) => count + areaLifts.length, 0);
    console.log(`Selected ${associationCount} lift associations; excluded ${excludedCount} lifts.`);
    return liftsBySkiArea;
}

function mergeGeometries(a: LiftGeometry, b: LiftGeometry): LiftGeometry {
    const getLineStrings = (geometry: LiftGeometry): Position[][] =>
        geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;

    // XXX: bbox does not get fixed, is currently unused though
    return {
        type: "MultiLineString",
        coordinates: [...getLineStrings(a), ...getLineStrings(b)]
    };
}

function simplifyLiftGeometry(geometry: LiftGeometry): LiftGeometry {
    if (geometry.type === "LineString") {
        return {
            ...geometry,
            coordinates: simplifyLineCoordinates(geometry.coordinates),
        };
    }

    return {
        ...geometry,
        coordinates: geometry.coordinates.map(simplifyLineCoordinates),
    };
}

function simplifyLineCoordinates(coords: Position[]): Position[] {
    if (coords.length < 3) {
        return coords;
    }
    const [startLon, startLat] = coords[0];
    const [endLon, endLat] = coords[coords.length - 1];

    const meanLatRadians = ((startLat + endLat) / 2) * Math.PI / 180;
    const metersPerDegreeLat = 111_320;
    const metersPerDegreeLon = metersPerDegreeLat * Math.cos(meanLatRadians);

    const directX = (endLon - startLon) * metersPerDegreeLon;
    const directY = (endLat - startLat) * metersPerDegreeLat;
    const directLength = Math.hypot(directX, directY);
    if (directLength === 0) {
        // lift length is 0 between start and end point
        return coords;
    }

    for (let i = 1; i < coords.length - 1; i++) {
        const [lon, lat] = coords[i];
        const offsetX = (lon - startLon) * metersPerDegreeLon;
        const offsetY = (lat - startLat) * metersPerDegreeLat;

        const distance = Math.abs(directX * offsetY - directY * offsetX) / directLength;

        if (distance > 5) {
            return coords;
        }
    }

    // all points passed the check, return only the start and end point!
    return [coords[0], coords[coords.length - 1]];
}

function generateId(resortName: string): number {
    const bytes = createHash("sha256")
        .update(resortName, "utf8")
        .digest();

    return bytes.readUInt32BE(0);
}

function createDatabase(
    skiAreas: FeatureCollection<SkiAreaFeature>,
    liftsBySkiArea: Map<string, LiftFeature[]>
): number {
    const database = new Database(temporaryDatabasePath);
    let resortCount = 0;
    const names = new Set<string>();

    try {
        database.exec(`
            CREATE TABLE resorts (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                n_lifts INTEGER NOT NULL
            );
            CREATE TABLE lifts (
                id INTEGER PRIMARY KEY,
                resort_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                lift_type TEXT NOT NULL,
                geometry TEXT NOT NULL
            );
        `);
        // XXX: if lookup performance becomes an issue:
        // CREATE INDEX lifts_IDX_resort_id ON lifts (resort_id);

        const insertResort = database.prepare<[number, string, number]>(
            "INSERT INTO resorts (id, name, n_lifts) VALUES (?, ?, ?)"
        );
        const insertLift = database.prepare<[number, string, string, string]>(
            "INSERT INTO lifts (resort_id, name, lift_type, geometry) VALUES (?, ?, ?, ?)"
        );
        const insertResorts = database.transaction(() => {
            for (const skiArea of skiAreas.features) {
                const properties = skiArea?.properties;
                if (
                    properties?.status !== Status.Operating ||
                    !properties.name ||
                    !properties.activities?.includes(SkiAreaActivity.Downhill) ||
                    !properties.statistics
                ) {
                    continue;
                }

                const areaLifts = liftsBySkiArea.get(properties.id);
                if (!areaLifts?.length) {
                    continue;
                }

                if (names.has(properties.name)) {
                    // TODO: merge these? just drop them for now
                    continue;
                } else {
                    names.add(properties.name);
                }

                const id = generateId(properties.name);
                insertResort.run(id, properties.name, areaLifts.length);
                for (const lift of areaLifts) {
                    const geometryString = JSON.stringify(lift.geometry);
                    insertLift.run(id, lift.properties.name!, lift.properties.liftType, geometryString);
                }
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
    const liftsBySkiArea = indexUsableLifts(
        await fetchFeatureCollection<LiftFeature>("lifts")
    );
    const skiAreas = await fetchFeatureCollection<SkiAreaFeature>("ski_areas");

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

main().catch((error: unknown) => {
    console.error("Failed to build the OpenSkiMap database:", error);
    process.exitCode = 1;
});
