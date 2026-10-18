import SqliteDatabase, { Database, Statement } from "better-sqlite3";

export interface DbResort {
    id: string,
    name: string,
    n_lifts: number,
    lifts_geojson: string,
}

export interface ResortIdent {
    id: string,
    name: string,
    n_lifts: number,
}

interface SkiresordleDatabase {
    engine: Database,
    getLiftsByIdStmt: Statement<string, DbResort>,
    getLiftsByNameStmt: Statement<string, DbResort>,
    getResortsStmt: Statement<[], ResortIdent>,
    getResortSearchStmt: Statement<string, ResortIdent>,
}

let db: SkiresordleDatabase | null = null;

function getDatabase(): SkiresordleDatabase {
    if (!db) {
        const engine = new SqliteDatabase("./data/openskidata.db");
        engine.pragma("journal_mode = WAL");

        db = {
            engine,
            getLiftsByIdStmt: engine.prepare("SELECT id, name, n_lifts, lifts_geojson FROM resorts WHERE id = ?"),
            getLiftsByNameStmt: engine.prepare("SELECT id, name, n_lifts, lifts_geojson FROM resorts WHERE name = ?"),
            getResortsStmt: engine.prepare("SELECT id, name, n_lifts FROM resorts ORDER BY n_lifts DESC LIMIT 50"),
            getResortSearchStmt: engine.prepare("SELECT id, name FROM resorts WHERE name LIKE ? LIMIT 50"),
        };
    }
    return db;
}

export function getLiftsForResortName(name: string): DbResort | undefined {
    const resort = getDatabase().getLiftsByNameStmt.get(name);
    return resort;
}

export function getLiftsForResortId(id: string): DbResort | undefined {
    const resort = getDatabase().getLiftsByIdStmt.get(id);
    return resort;
}

export function getResorts(): ResortIdent[] {
    const rows = getDatabase().getResortsStmt.all();
    return rows;
}

export function searchResorts(query: string): ResortIdent[] {
    const pattern = `%${query}%`;
    const rows = getDatabase().getResortSearchStmt.all(pattern);
    return rows;
}
