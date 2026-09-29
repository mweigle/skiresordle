"use server"

import { ResortIdent } from "@/types/types";
import { getResorts, incrementNSolved, searchResorts } from "./db"

export async function action_markSolved(resortId: number) {
    try {
        incrementNSolved(resortId);
    } catch (e) {
        console.error(e);
    }
}

export async function action_getInitialResorts(): Promise<ResortIdent[]> {
    let resorts;
    try {
        resorts = getResorts();
    } catch (e) {
        console.error(e);
        return [];
    }
    return resorts;
}

export async function action_searchResorts(query: string): Promise<ResortIdent[]> {
    let resorts;
    try {
        resorts = searchResorts(query);
    } catch (e) {
        console.error(e);
        return [];
    }
    return resorts;
}