"use client"

import { action_searchResorts } from "@/lib/actions";
import { ResortIdent } from "@/lib/db";
import Link from "next/link";
import { useState, KeyboardEvent, ChangeEvent, useRef } from "react";

const DEBOUNCE_TIME_MS = 400;

interface ResortSearchProps {
  initialResorts: ResortIdent[],
}

export default function ResortSearch({ initialResorts }: ResortSearchProps) {
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
  }

  // converts the unsigned integer into a string with fixed length of at least 10
  function resortLink(id: number): string {
    return "/" + (id >>> 0).toString(10).padStart(10, "0");
  }

  function nLiftsText(resort: ResortIdent): string {
    // NOTE: "?" behind local storage because this component also gets SSR-ed as part of the front page
    const nDiscovered = localStorage?.getItem(resort.id + "_n_discovered");
    if (nDiscovered) {
      return `${nDiscovered}/${resort.n_lifts} Lifts`;
    }
    return `${resort.n_lifts} Lifts`;
  }

  return <main className="flex flex-col items-center">
    <input type="text" name="Ski Resort" placeholder="Ski Resort Search" value={resortName} onChange={onUpdate} onKeyDown={onEnter} autoComplete="off"
      className="w-1/2 mt-10 p-3 outline-none border-2 rounded-md border-foreground focus:border-selection" />
    <ul className="w-1/2 flex flex-col">
      {filteredResorts.map(resort => <li key={resort.id}>
        <Link href={resortLink(resort.id)} className="flex justify-between p-3 border-2 rounded-md border-background hover:border-selection">
          <span>{resort.name}</span>
          <span>{nLiftsText(resort)}</span>
        </Link>
      </li>)}
    </ul>
  </main>
}
