"use server"

import { incrementNSolved } from "./db"

export async function action_markSolved(resortId: number) {
    try {
        incrementNSolved(resortId);
    } catch (e) {
        console.error(e);
    }
}