import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({
    filename: "./data.db",
    driver: sqlite3.Database
});

// create table
await db.exec("CREATE TABLE IF NOT EXISTS resorts (id INTEGER PRIMARY KEY, name TEXT, lifts TEXT)");


// functions to interact with the database
export async function insertList(list: number[]): Promise<number> {
    const { id } = await db.get("INSERT INTO sortable_lists (list) VALUES (?) RETURNING id", JSON.stringify(list));
    return id;
}

export async function getNextList(): Promise<{ id: number; list: number[] } | undefined> {
    const row = await db.get("SELECT id, list FROM sortable_lists ORDER BY id LIMIT 1");
    if (row) {
        const list = JSON.parse(row.list) as number[];
        return { id: row.id, list };
    }
    return undefined;
}

export async function checkForList(id: number): Promise<boolean> {
    const { count } = await db.get("SELECT COUNT(*) AS count FROM sortable_lists WHERE id = ?", id);
    return count !== 0;
}

export async function removeList(id: number) {
    await db.run("DELETE FROM sortable_lists WHERE id = ?", id);
}

// for testing
export async function getAllLists(): Promise<{ id: number; list: number[] }[]> {
    const rows = await db.all("SELECT id, list FROM sortable_lists");
    return rows.map(row => ({ id: row.id, list: JSON.parse(row.list) as number[] }));
}
