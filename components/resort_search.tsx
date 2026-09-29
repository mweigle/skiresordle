"use client"

import { action_searchResorts } from "@/lib/actions";
import { ResortIdent } from "@/types/types";
// import Fuse from "fuse.js";
import Link from "next/link";
import { useEffect, useState, KeyboardEvent, ChangeEvent } from "react";

export default function ResortSearch() {
  // const searchRef = useRef<Fuse<ResortIdent> | null>(null);
  const [resortName, setResortName] = useState("");
  const [filteredResorts, setFilteredResorts] = useState<ResortIdent[]>([]);
  const [debounceTimeout, setDebounceTimout] = useState<NodeJS.Timeout | null>(null);

  function onUpdate(e: ChangeEvent<HTMLInputElement>) {
    setResortName(e.target.value);

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    const timeout = setTimeout(async () => {
      const list = await action_searchResorts(e.target.value);
      setFilteredResorts(list);  
    }, 300);
    setDebounceTimout(timeout);
  }

  async function onEnter(e: KeyboardEvent) {
    if (e.code !== "Enter") {
      return;
    }

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      setDebounceTimout(null);
    }
    const list = await action_searchResorts(resortName);
    setFilteredResorts(list);

    // const search = searchRef.current;
    // if (!search) {
    //   return;
    // }
    // const filtered = search.search(value).map(({ item }) => item);
    // setFilteredResorts(filtered);
  }

  useEffect(() => {
    (async () => {
      const list = await action_searchResorts(null);
      // const resortSearch = new Fuse(list, {
      //   keys: ["name"],
      //   // shouldSort: true,
      // });
      // searchRef.current = resortSearch;
      setFilteredResorts(list);
    })();
  }, []);

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
