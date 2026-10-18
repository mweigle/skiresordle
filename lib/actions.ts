"use server"

import { searchResorts, ResortIdent } from "./db";

export async function action_searchResorts(query: string): Promise<ResortIdent[]> {
    try {
        return searchResorts(query);
    } catch (e) {
        console.error(e);
        return [];
    }
}
