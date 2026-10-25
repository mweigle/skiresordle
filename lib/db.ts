import SqliteDatabase, { Database, Statement } from "better-sqlite3";

export interface ResortIdent {
  id: number,
  name: string,
  n_lifts: number,
}

export interface DbLift {
  id: number,
  name: string,
  lift_type: string,
  geometry: string,
}

interface SkiresordleDatabase {
  engine: Database,
  getResortByIdStmt: Statement<number, ResortIdent>,
  getResortByNameStmt: Statement<string, ResortIdent>,
  initialResortsStmt: Statement<[], ResortIdent>,
  searchResortsStmt: Statement<string, ResortIdent>,
  getLiftsByResortIdStmt: Statement<number, DbLift>,
}

let db: SkiresordleDatabase | null = null;

function getDatabase(): SkiresordleDatabase {
  if (!db) {
    const engine = new SqliteDatabase("./data/openskidata.db");
    engine.pragma("journal_mode = WAL"); // XXX: journal mode should not matter as long as we don't write

    db = {
      engine,
      getResortByIdStmt: engine.prepare("SELECT id, name, n_lifts FROM resorts WHERE id = ?"),
      getResortByNameStmt: engine.prepare("SELECT id, name, n_lifts FROM resorts WHERE name = ?"),
      initialResortsStmt: engine.prepare("SELECT id, name, n_lifts FROM resorts ORDER BY n_lifts DESC LIMIT 50"),
      searchResortsStmt: engine.prepare("SELECT id, name, n_lifts FROM resorts WHERE name LIKE ? LIMIT 50"),
      getLiftsByResortIdStmt: engine.prepare("SELECT id, name, lift_type, geometry FROM lifts WHERE resort_id = ?"),
    };
  }
  return db;
}

export function getResortByName(name: string): ResortIdent | undefined {
  const resort = getDatabase().getResortByNameStmt.get(name);
  return resort;
}

export function getResortById(id: number): ResortIdent | undefined {
  const resort = getDatabase().getResortByIdStmt.get(id);
  return resort;
}

export function initialResorts(): ResortIdent[] {
  const rows = getDatabase().initialResortsStmt.all();
  return rows;
}

export function searchResorts(query: string): ResortIdent[] {
  const pattern = `%${query}%`;
  const rows = getDatabase().searchResortsStmt.all(pattern);
  return rows;
}

export function getLiftsByResortId(id: number): DbLift[] {
  const rows = getDatabase().getLiftsByResortIdStmt.all(id);
  return rows;
}
