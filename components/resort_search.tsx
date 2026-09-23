"use client"

import { ResortIdent } from "@/types/types";
import Fuse, { FuseResult } from "fuse.js";
import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";

interface ResortSearchProps {
    resortList: ResortIdent[];
}

export default function ResortSearch({ resortList }: ResortSearchProps) {
    const searchRef = useRef<Fuse<ResortIdent> | null>(null);
    const [resortName, setResortName] = useState("");
    const [filteredResorts, setFilteredResorts] = useState<ResortIdent[]>(resortList);

    function searchForResorts(e: ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setResortName(value);

        const search = searchRef.current;
        if (!search) {
            return;
        }
        const filtered = search.search(value).map(({ item }) => item);
        setFilteredResorts(filtered);
    }

    useEffect(() => {
        const resortSearch = new Fuse(resortList, {
            keys: ["name"],
            shouldSort: true,
        });
        searchRef.current = resortSearch;
    }, [resortList]);

    return <main>
        <input type="text" placeholder="Ski Resort" value={resortName} onChange={searchForResorts} />    
        <ul className="flex flex-col">
            {filteredResorts.map(resort => <li key={resort.id}><Link href={`/${resort.id}`}>{resort.name}</Link></li>)}
        </ul>
    </main>
}
