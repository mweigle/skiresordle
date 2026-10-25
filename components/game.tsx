"use client"

import { Lift, ResortWithLifts } from "@/lib/lift_data";
import Fuse from "fuse.js";
import Link from "next/link";
import { extend } from "ol/extent";
import { KeyboardEvent, startTransition, useEffect, useRef, useState } from "react";
import CompletionBar from "./completion_bar";
import { GameMap, LiftStatus } from "./game_map";
import SidePanel from "./side_panel";

// TODO: AI slop, make better this work better
// (e.g. accept the lift if 3 out of 4 words are correct
// (prevent annoyance on really long lift names like the ones in whistler))
const MAX_NAME_DISTANCE = 2;
function editDistance(first: string, second: string) {
  const left = first.trim().toLowerCase();
  const right = second.trim().toLowerCase();
  // array counting from zero to right.length
  const distances = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row++) {
    let diagonal = distances[0];
    distances[0] = row;

    for (let column = 1; column <= right.length; column++) {
      const above = distances[column];
      distances[column] = left[row - 1] === right[column - 1]
        ? diagonal
        : Math.min(diagonal, above, distances[column - 1]) + 1;
      diagonal = above;
    }
  }

  return distances[right.length];
}

function liftNameVariants(name: string) {
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
  const nameWithoutBahn = normalizedName
    .replace(/bahn(?=\s|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return nameWithoutBahn === normalizedName
    ? [normalizedName]
    : [normalizedName, nameWithoutBahn];
}

function matchesLiftName(query: string, name: string) {
  return liftNameVariants(name).some(variant =>
    editDistance(query, variant) <= MAX_NAME_DISTANCE
  );
}
// --------- end AI slop

enum GameState {
  Playing,
  Solved,
  GaveUp,
}

interface GameProps {
  resort: ResortWithLifts,
}

const STORAGE_KEY_LIFTS = "_lifts";
const STORAGE_KEY_NDISCOVERED = "_n_discovered";

export default function Game({ resort }: GameProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<GameMap | null>(null);
  const mapElemRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<Fuse<Lift> | null>(null);

  const [liftName, setLiftName] = useState("");
  const [discoveredLifts, setDiscoveredLifts] = useState<Lift[]>([]);
  const [revealedLifts, setRevealedLifts] = useState<Lift[]>([]);

  const [incorrectGuess, setIncorrectGuess] = useState(false);
  const [alreadyFound, setAlreadyFound] = useState(false);
  const [gameState, setGameState] = useState(GameState.Playing);


  function submitLiftName(e: KeyboardEvent) {
    if (e.code !== "Enter" || !liftName) {
      return;
    }

    const search = searchRef.current;
    if (!search) {
      return;
    }

    const query = liftName.trim();
    let lifts = search.search(query)
      .filter(({ item }) =>
        // check for matching names
        item.name && matchesLiftName(query, item.name))
      .map(({ item }) => item);

    if (lifts.length === 0) {
      setIncorrectGuess(true);
      setTimeout(() => setIncorrectGuess(false), 500);
      return;
    }

    // filter any that were already discovered
    lifts = lifts.filter(lift => !discoveredLifts.some(discovered => discovered.id === lift.id));
    if (lifts.length === 0) {
      setLiftName("");
      setAlreadyFound(true);
      setTimeout(() => setAlreadyFound(false), 2000);
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    // mark all the features that comprise this lift
    let focusExtent;
    for (const lift of lifts) {
      map.setLiftStatus(lift.id, LiftStatus.Correct);
      const extent = map.getLiftExtent(lift.id);
      if (extent && focusExtent) {
        extend(focusExtent, extent);
      } else {
        focusExtent = extent;
      }
    }

    const totalFound = discoveredLifts.length + lifts.length;
    if (totalFound >= resort.n_lifts) {
      setGameState(GameState.Solved);
      map.zoomOut();
    } else if (focusExtent) {
      map.setFocus(focusExtent);
    }

    addDiscoveredLifts(lifts, totalFound);
    setLiftName("");
  }

  // for when the user gives up
  function revealRest() {
    const missedLifts = resort.lifts.features
      .filter(lift => !discoveredLifts.some(discovered => lift.id === discovered.id))
      .map(lift => lift.properties);

    missedLifts.sort((a, b) => a.name.localeCompare(b.name));

    const map = mapRef.current;
    if (map) {
      for (const lift of missedLifts) {
        map.setLiftStatus(lift.id, LiftStatus.Missed);
      }
      map.zoomOut();
    }
    setRevealedLifts(missedLifts);
    setGameState(GameState.GaveUp);
    clearLocalStorage();
  }

  function resetGame() {
    mapRef.current?.setAllLiftsStatus(LiftStatus.Inactive);
    setDiscoveredLifts([]);
    setRevealedLifts([]);
    setGameState(GameState.Playing);
    clearLocalStorage();
  }

  function clearLocalStorage() {
    localStorage.removeItem(resort.id + STORAGE_KEY_LIFTS);
    localStorage.removeItem(resort.id + STORAGE_KEY_NDISCOVERED);
  }

  function onListLiftHovered(liftId: number) {
    mapRef.current?.setLiftHovered(liftId);
  }

  function onListLiftSelected(liftId: number) {
    mapRef.current?.setLiftFocus(liftId, 16);
  }

  function addDiscoveredLifts(lifts: Lift[], nDiscovered: number) {
    setDiscoveredLifts(prev => [...lifts, ...prev]);

    // update local storage
    const prev = localStorage.getItem(resort.id + STORAGE_KEY_LIFTS);
    const newIds = lifts.map(lift => lift.id).join(";");
    localStorage.setItem(resort.id + STORAGE_KEY_LIFTS, prev ? `${prev};${newIds}` : newIds);
    localStorage.setItem(resort.id + STORAGE_KEY_NDISCOVERED, nDiscovered.toString(10))
  }

  function calcPercentageSolved() {
    return Math.floor((discoveredLifts.length / resort.n_lifts) * 100);
  }

  useEffect(() => {
    inputRef.current?.focus();

    // create a list of properties for searching
    const liftList = resort.lifts.features.map(feature => feature.properties);
    const search = new Fuse<Lift>(liftList, {
      keys: ["name"],
      threshold: 1, // TODO: this may be pointless with the new filtering logic
    });
    searchRef.current = search;

    const mapElem = mapElemRef.current;
    if (!mapElem) {
      throw new Error("Could not find map target element");
    }

    // initialize the OpenLayers map
    const gameMap = new GameMap(mapElem, resort.lifts);
    mapRef.current = gameMap;

    // get the previous state from localStorage
    const encodedLifts = localStorage.getItem(resort.id + STORAGE_KEY_LIFTS);
    const discovered: Lift[] = [];
    if (encodedLifts) {
      const uniqueIds = new Set<string>();
      const idStrings = encodedLifts.split(";");
      for (let i = idStrings.length - 1; i >= 0; i--) {
        const idStr = idStrings[i];
        if (uniqueIds.has(idStr)) {
          continue;
        }
        uniqueIds.add(idStr);
        const lift = resort.lifts.features.find(lift => lift.properties.id === +idStr);
        if (lift) {
          discovered.push(lift.properties);
          gameMap.setLiftStatus(lift.properties.id, LiftStatus.Correct);
        }
      }
    }
    startTransition(() => setDiscoveredLifts(discovered));

    // ─────────────────────────
    // CLEANUP
    // ─────────────────────────
    return () => {
      gameMap.dispose();
      mapRef.current = null;
    };
  }, [resort]);

  return <>
    <div ref={mapElemRef} className="absolute inset-0 z-1"></div>
    <main className="grid h-dvh grid-cols-4 grid-rows-[auto_minmax(0,1fr)]">
      <div className="z-2 mt-10 col-start-1 flex items-center justify-center">
        <Link href="/" className="p-3 bg-background rounded-md border-2 border-background hover:border-selection mr-3">&larr;</Link>
        <span className="p-3 bg-background rounded-md border-2 border-background max-w-3/4 overflow-hidden text-nowrap text-ellipsis">{resort.name}</span>
      </div>
      {gameState === GameState.Playing
        ? <input ref={inputRef} type="text" name="Lift Name" placeholder="Lift Name" value={liftName} onChange={e => setLiftName(e.target.value)} onKeyDown={submitLiftName}
          className={`mt-10 p-3 z-2 bg-background col-start-2 col-span-2 outline-none rounded-md border-2
            ${incorrectGuess ? "animate-shake border-error" : "border-background focus:border-selection"}`} />
        : gameState === GameState.Solved
          ? <span className="z-2 mt-10 h-fit p-3 bg-success col-start-2 col-span-2 flex items-center justify-center rounded-md">You got it!</span>
          : <CompletionBar percentage={calcPercentageSolved()} />
      }
      <span className={`z-2 mt-5 h-fit p-3 row-start-2 col-start-2 col-span-2 w-1/3 justify-self-center flex items-center
        justify-center rounded-md bg-success transition-opacity duration-300 ${alreadyFound ? "visible opacity-100" : "invisible opacity-0"}`}>Already found!</span>
      <SidePanel nLifts={resort.n_lifts}
        discovered={discoveredLifts}
        revealed={revealedLifts}
        onLiftHovered={onListLiftHovered}
        onLiftSelected={onListLiftSelected}
        revealAll={revealRest}
        reset={resetGame}
      />
    </main>
  </>;
}
