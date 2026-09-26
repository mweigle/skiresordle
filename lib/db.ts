import { GeoFeatureList, OverpassResort, ResortIdent, ResortWithLifts } from "@/types/types";
import Database from "better-sqlite3";

const db = new Database("./data/data.db");
db.pragma("journal_mode = WAL");

// create table
// db.exec("CREATE TABLE IF NOT EXISTS resorts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, lifts TEXT, n_played INTEGER DEFAULT 0, n_solved INTEGER DEFAULT 0)");
db.exec("CREATE TABLE IF NOT EXISTS resorts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, lifts TEXT)");

// prepare statements
//const getResortsStmt = db.prepare<[], ResortIdent>("SELECT id, name FROM resorts ORDER BY n_played DESC");
const getResortsStmt = db.prepare<[], ResortIdent>("SELECT id, name FROM resorts WHERE lifts IS NOT NULL LIMIT 50"); // TODO: temporary
const getLiftsByIdStmt = db.prepare<number, ResortWithLifts>("SELECT id, name, lifts FROM resorts WHERE id = ?");
const getLiftsByNameStmt = db.prepare<string, ResortWithLifts>("SELECT id, name, lifts FROM resorts WHERE name = ?");
const insertLiftsStmt = db.prepare<[string, number]>("UPDATE resorts SET lifts = ? WHERE id = ?");
const insertResortStmt = db.prepare<[number, string]>("INSERT INTO resorts (id, name) VALUES (?, ?)");
const insertResortsTrans = db.transaction(resorts => {
    for (const resort of resorts) {
        insertResortStmt.run(resort.id, resort.tags.name);
    }
});
const deleteLiftsStmt = db.prepare<number>("UPDATE resorts SET lifts = NULL WHERE id = ?");

export function getResorts(): ResortIdent[] {
    const rows = getResortsStmt.all();
    return rows;
}

export function getLiftsForResortName(name: string): ResortWithLifts | undefined {
    const resort = getLiftsByNameStmt.get(name);
    return evaluateResort(resort);
}

export function getLiftsForResortId(id: number): ResortWithLifts | undefined {
    const resort = getLiftsByIdStmt.get(id);
    return evaluateResort(resort);
}

function evaluateResort(resort: ResortWithLifts | undefined): ResortWithLifts | undefined {
    if (!resort) {
        return undefined; // the resort does not exist
    }
    if (!resort.lifts) {
        return resort; // the resort exists but lifts have not been preloaded
    }
    resort.lifts = JSON.parse(resort.lifts as unknown as string); // ugly hack to make typescript happy
    return resort;
}

export function insertLiftsForResort(id: number, lifts: GeoFeatureList) {
    const liftsJson = JSON.stringify(lifts);
    insertLiftsStmt.run(liftsJson, id);
}

export function insertResorts(resorts: OverpassResort[]) {
    insertResortsTrans(resorts);
}

export function deleteLiftsForResort(id: number): number {
    return deleteLiftsStmt.run(id).changes;
}
