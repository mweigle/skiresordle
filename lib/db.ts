import Database from "better-sqlite3";

const db = new Database("./data.db");
db.pragma("journal_mode = WAL");

// create table
db.exec("CREATE TABLE IF NOT EXISTS resorts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, lifts TEXT)");

// prepare statements
const getLiftsStmt = db.prepare("SELECT lifts FROM resorts WHERE name = ?");
const insertLiftsStmt = db.prepare("UPDATE resorts SET lifts = ? WHERE name = ?");
const insertResortStmt = db.prepare("INSERT INTO resorts (id, name) VALUES (?, ?)");
const insertResortsTrans = db.transaction(resorts => {
    for (const resort of resorts) {
        insertResortStmt.run(resort.id, resort.tags.name);
    }
});

export enum FetchResult {
    DoesNotExist,
    NotLoaded,
    JsonError,
    GeoJson,
}

export function getLiftsForResort(name: string): { res: FetchResult, val?: object} {
    const row = getLiftsStmt.get(name);
    if (!row) {
        return { res: FetchResult.DoesNotExist }; // the resort does not exist
    }
    if (!row.lifts) {
        return { res: FetchResult.NotLoaded }; // the resort exists but lifts have not been preloaded
    }
    try {
        const geoJson = JSON.parse(row.lifts);
        return { res: FetchResult.GeoJson, val: geoJson };
    } catch (e) {
        return { res: FetchResult.JsonError, val: e as SyntaxError };
    }
}

export function insertLiftsForResort(name: string, lifts: object) {
    const liftsJson = JSON.stringify(lifts);
    insertLiftsStmt.run(liftsJson, name);
}

export function insertResorts(resorts: object) {
    insertResortsTrans(resorts);
}
