"use server"

import { ResortIdent } from "@/types/types";
import { incrementNSolved, searchResorts } from "./db"

export async function action_markSolved(resortId: number) {
    try {
        incrementNSolved(resortId);
    } catch (e) {
        console.error(e);
    }
}

export async function action_searchResorts(query: string): Promise<ResortIdent[]> {
    try {
        return searchResorts(query);
    } catch (e) {
        console.error(e);
        return [];
    }
}
