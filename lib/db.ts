import { GeoFeatureList, OverpassResort, ResortIdent, ResortWithLifts } from "@/types/types";
import SqliteDatabase, { Database, Statement, Transaction } from "better-sqlite3";

interface Db {
    engine: Database,
    getResortsStmt: Statement<[], ResortIdent>,
    getResortSearchStmt: Statement<string, ResortIdent>,
    getLiftsByIdStmt: Statement<number, ResortWithLifts>,
    getLiftsByNameStmt: Statement<string, ResortWithLifts>,
    insertLiftsStmt: Statement<[string, number]>,
    deleteLiftsStmt: Statement<number>,
    incrementNSolvedStmt: Statement<number>,
    insertResortsTrans: Transaction,
}

let db: Db | null = null;

function getDb(): Db {
    if (!db) {
        const engine = new SqliteDatabase("./data/data.db");
        engine.pragma("journal_mode = WAL");

        // create table
        engine.exec("CREATE TABLE IF NOT EXISTS resorts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, lifts TEXT, n_played INTEGER DEFAULT 0, n_solved INTEGER DEFAULT 0)");

        // prepare statements
        const insertResortStmt = engine.prepare<[number, string]>("INSERT INTO resorts (id, name) VALUES (?, ?)");
        const insertResortsTrans = engine.transaction(resorts => {
            for (const resort of resorts) {
                insertResortStmt.run(resort.id, resort.tags.name);
            }
        });
        db = {
            engine,
            getResortsStmt: engine.prepare("SELECT id, name FROM resorts ORDER BY n_played DESC LIMIT 50"),
            getResortSearchStmt: engine.prepare("SELECT id, name FROM resorts WHERE name LIKE ? LIMIT 50"),
            getLiftsByIdStmt: engine.prepare("UPDATE resorts SET n_played = n_played + 1 WHERE id = ? RETURNING id, name, lifts"),
            getLiftsByNameStmt: engine.prepare("UPDATE resorts SET n_played = n_played + 1 WHERE name = ? RETURNING id, name, lifts"),
            insertLiftsStmt: engine.prepare("UPDATE resorts SET lifts = ? WHERE id = ?"),
            deleteLiftsStmt: engine.prepare("UPDATE resorts SET lifts = NULL WHERE id = ?"),
            incrementNSolvedStmt: engine.prepare("UPDATE resorts SET n_solved = n_solved + 1 WHERE id = ?"),
            insertResortsTrans,
        };
    }
    return db;
}

export function getResorts(): ResortIdent[] {
    const rows = getDb().getResortsStmt.all();
    return rows;
}

export function getLiftsForResortName(name: string): ResortWithLifts | undefined {
    const resort = getDb().getLiftsByNameStmt.get(name);
    return evaluateResort(resort);
}

export function getLiftsForResortId(id: number): ResortWithLifts | undefined {
    const resort = getDb().getLiftsByIdStmt.get(id);
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
    getDb().insertLiftsStmt.run(liftsJson, id);
}

export function insertResorts(resorts: OverpassResort[]) {
    getDb().insertResortsTrans(resorts);
}

export function deleteLiftsForResort(id: number): number {
    return getDb().deleteLiftsStmt.run(id).changes;
}

export function incrementNSolved(id: number) {
    getDb().incrementNSolvedStmt.run(id);
}

export function searchResorts(query: string): ResortIdent[] {
    const pattern = `%${query}%`;
    const rows = getDb().getResortSearchStmt.all(pattern);
    return rows;
}