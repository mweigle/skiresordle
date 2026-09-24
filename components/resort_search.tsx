"use client"

import { ResortIdent } from "@/types/types";
import Fuse from "fuse.js";
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
      // shouldSort: true,
    });
    searchRef.current = resortSearch;
  }, [resortList]);

  return <main className="flex flex-col items-center">
    <input type="text" name="Ski Resort" placeholder="Ski Resort Search" value={resortName} onChange={searchForResorts}
      className="w-1/2 mt-10 p-3 outline-none border-2 rounded-md border-foreground focus:border-selection" />
    <ul className="w-1/2 flex flex-col">
      {filteredResorts.map(resort => <li key={resort.id}>
        <Link href={`/${resort.id}`} className="block p-3 border-2 rounded-md border-background hover:border-selection">{resort.name}</Link>
      </li>)}
    </ul>
  </main>
}
