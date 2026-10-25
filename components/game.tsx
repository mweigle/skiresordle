"use client"

import { Lift, ResortWithLifts } from "@/lib/lift_data";
import Fuse from "fuse.js";
import Link from "next/link";
import { extend, Extent } from "ol/extent";
import { KeyboardEvent, startTransition, useEffect, useRef, useState } from "react";
import CompletionBar from "./completion_bar";
import { createGameMap, GameMap, HOVERED, LiftStatus, STATUS } from "./game_map";
import SidePanel from "./side_panel";

const MAX_NAME_DISTANCE = 2;

// TODO: AI slop, make better this work better
// (e.g. accept the lift if 3 out of 4 words are correct
// (prevent annoyance on really long lift names like the ones in whistler))
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

export default function Game({ resort }: GameProps) {
  const storageKey = `discovered_${resort.id}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<GameMap | null>(null);
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

    const source = mapRef.current?.liftSource;
    if (!source) {
      return;
    }

    console.log("amount of discovered lifts", lifts.length);

    // mark all the features that comprise this lift
    let focusExtent;
    for (const lift of lifts) {
      const feature = source.getFeatureById(lift.id);
      if (!feature) {
        console.error("Could not find feature:", lift.id);
        continue;
      }

      feature.set(STATUS, LiftStatus.Correct);

      const extent = feature.getGeometry()?.getExtent();
      if (extent && focusExtent) {
        extend(focusExtent, extent);
      } else {
        focusExtent = extent;
      }
    }

    const totalFound = discoveredLifts.length + lifts.length;
    if (totalFound >= resort.n_lifts) {
      setGameState(GameState.Solved);
      focusExtent = source.getExtent(); // focus the entire map
    }
    if (focusExtent) {
      setMapFocus(focusExtent);
    }

    addDiscoveredLifts(lifts);
    setLiftName("");
  }

  function setMapFocus(extent: Extent) {
    mapRef.current?.map.getView().fit(extent, {
      padding: [200, 200, 200, 200],
      duration: 500,
      maxZoom: 14,
    });
  }

  // for when the user gives up
  function revealRest() {
    const missedLifts = resort.lifts.features
      .filter(lift => !discoveredLifts.some(discovered => lift.id === discovered.id))
      .map(lift => lift.properties);

    const liftSource = mapRef.current?.liftSource;
    if (liftSource) {
      for (const lift of missedLifts) {
        const feature = liftSource.getFeatureById(lift.id);
        if (!feature) {
          console.error("Could not find feature:", lift.id);
          continue;
        }

        feature.set(STATUS, LiftStatus.Missed);
      }
      setMapFocus(liftSource.getExtent()!);
    }
    setRevealedLifts(missedLifts);
    setGameState(GameState.GaveUp);
  }

  function resetGame() {
    const liftFeatures = mapRef.current?.liftSource.getFeatures();
    if (liftFeatures) {
      for (const lift of liftFeatures) {
        lift.set(STATUS, LiftStatus.Inactive);
      }
    }
    setDiscoveredLifts([]);
    setRevealedLifts([]);
    setGameState(GameState.Playing);
    localStorage.removeItem(storageKey);
  }

  function onListLiftHovered(liftId: number) {
    const lift = mapRef.current?.liftSource.getFeatureById(liftId);
    if (lift) {
      lift.set(HOVERED, true);
    }
  }

  function onListLiftSelected(liftId: number) {
    const extent = mapRef.current?.liftSource
      ?.getFeatureById(liftId)
      ?.getGeometry()
      ?.getExtent(); // XXX: this might be slow ...
    if (extent) {
      setMapFocus(extent);
    }
  }

  function addDiscoveredLifts(lifts: Lift[]) {
    setDiscoveredLifts(prev => [...lifts, ...prev]);

    // update local storage
    const prev = localStorage.getItem(storageKey);
    const newIds = lifts.map(lift => lift.id).join(";");
    localStorage.setItem(storageKey, prev ? `${prev};${newIds}` : newIds);
  }

  function calcPercentageSolved() {
    return Math.floor((discoveredLifts.length / resort.n_lifts) * 100);
  }

  useEffect(() => {
    inputRef.current?.focus();

    // create a list of features
    const liftList = resort.lifts.features.map(feature => feature.properties);

    const search = new Fuse<Lift>(liftList, {
      keys: ["name"],
      threshold: 1, // TODO: this may be pointless with the new filtering logic
    });

    searchRef.current = search;

    const target = document.getElementById("map");
    if (!target) {
      throw new Error("Could not find map target element");
    }

    const gameMap = createGameMap(target, resort.lifts);
    mapRef.current = gameMap;

    function loadDiscoveredFromLocalStorage(): Lift[] {
      const encodedLifts = globalThis.localStorage.getItem(storageKey);
      const lifts: Lift[] = [];
      if (encodedLifts) {
        const uniqueIds = new Set<string>();
        for (const idStr of encodedLifts.split(';')) {
          if (uniqueIds.has(idStr)) {
            continue;
          }
          uniqueIds.add(idStr);
          const lift = resort.lifts.features.find(lift => lift.id === +idStr);
          if (lift) {
            lifts.push(lift.properties);
          }
        }
      }
      return lifts;
    }

    // get previous state from localStorage
    const discovered = loadDiscoveredFromLocalStorage();
    for (const lift of discovered) {
      const feature = gameMap.liftSource.getFeatureById(lift.id);
      if (feature) {
        feature.set(STATUS, LiftStatus.Correct);
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
  }, [resort, storageKey]);

  return <>
    <div id="map" className="absolute inset-0 z-1"></div>
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
