"use client"

import { action_searchResorts } from "@/lib/actions";
import { ResortIdent } from "@/types/types";
// import Fuse from "fuse.js";
import Link from "next/link";
import { useState, KeyboardEvent, ChangeEvent, useRef } from "react";

const DEBOUNCE_TIME_MS = 400;

interface ResortSearchProps {
  initialResorts: ResortIdent[],
}

export default function ResortSearch({ initialResorts }: ResortSearchProps) {
  // const searchRef = useRef<Fuse<ResortIdent> | null>(null);
  const [resortName, setResortName] = useState("");
  const [filteredResorts, setFilteredResorts] = useState<ResortIdent[]>(initialResorts);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  function onUpdate(e: ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setResortName(name);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    if (!name) {
      debounceTimeout.current = null;
      setFilteredResorts(initialResorts);
    } else {
      debounceTimeout.current = setTimeout(async () => {
        const list = await action_searchResorts(name);
        setFilteredResorts(list);
        debounceTimeout.current = null;
      }, DEBOUNCE_TIME_MS);
    }
  }

  async function onEnter(e: KeyboardEvent) {
    if (e.code !== "Enter") {
      return;
    }

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    if (resortName) {
      const list = await action_searchResorts(resortName);
      setFilteredResorts(list);
    } else {
      setFilteredResorts(initialResorts);
    }
    // const search = searchRef.current;
    // if (!search) {
    //   return;
    // }
    // const filtered = search.search(value).map(({ item }) => item);
    // setFilteredResorts(filtered);
  }

  return <main className="flex flex-col items-center">
    <input type="text" name="Ski Resort" placeholder="Ski Resort Search" value={resortName} onChange={onUpdate} onKeyDown={onEnter}
      className="w-1/2 mt-10 p-3 outline-none border-2 rounded-md border-foreground focus:border-selection" />
    <ul className="w-1/2 flex flex-col">
      {filteredResorts.map(resort => <li key={resort.id}>
        <Link href={`/${resort.id}`} className="block p-3 border-2 rounded-md border-background hover:border-selection">{resort.name}</Link>
      </li>)}
    </ul>
  </main>
}
