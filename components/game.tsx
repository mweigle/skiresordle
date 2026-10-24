"use client"

import { Lift, ResortWithLifts } from "@/lib/lift_data";
import Fuse from "fuse.js";
import { defaults as defaultControls } from "ol/control/defaults";
import { extend, Extent } from "ol/extent";
import Feature, { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import MapBrowserEvent from "ol/MapBrowserEvent";
import "ol/ol.css";
import VectorSource from "ol/source/Vector";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import SidePanel from "./side_panel";
import Link from "next/link";
import TileLayer from "ol/layer/Tile";
import { OSM } from "ol/source";
import CompletionBar from "./completion_bar";

enum LiftStatus {
  Inactive,
  Correct,
  Missed,
}

const MAPTILER_API_KEY = "GdNqxAgeXV2E49H4pMfk";
const MAP_JSON = `https://api.maptiler.com/maps/outdoor-v4/style.json?key=${MAPTILER_API_KEY}`;

const STATUS = "status";
const HOVERED = "hovered";
const MAX_NAME_DISTANCE = 2;
const MAP_ATTRIBUTION = 'Data from OpenSkiData / <a href="https://openskimap.org">OpenSkiMap.org</a>, © <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL), <a href="https://skimap.org">Skimap.org</a>, Who\'s On First, © Mapterhorn';

// ------------ WARNING: AI slop
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
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<Map | null>(null);
  const liftLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const hoveredFeatureRef = useRef<Feature | null>(null);
  const searchRef = useRef<Fuse<Lift> | null>(null);

  const [liftName, setLiftName] = useState("");
  const [discoveredLifts, setDiscoveredLifts] = useState<Lift[]>([]);
  const [revealedLifts, setRevealedLifts] = useState<Lift[]>([]);
  const [percentageSolved, setPercentageSolved] = useState(0);

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

    const source = liftLayerRef.current?.getSource();
    if (!source) {
      return;
    }

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

    setPercentageSolved(Math.floor((totalFound / resort.n_lifts) * 100))
    setDiscoveredLifts(prev => [...lifts, ...prev]);
    setLiftName("");
  }

  function setMapFocus(extent: Extent) {
      mapRef.current?.getView().fit(extent, {
        padding: [200, 200, 200, 200],
        duration: 500,
        maxZoom: 14,
      });
  }

  // for when the user gives up
  function revealRest() {
    const missedLifts = resort.lifts.features
      .filter(lift => !discoveredLifts.some(discovered => lift.properties.id === discovered.id))
      .map(lift => lift.properties);

    const liftSource = liftLayerRef.current?.getSource();
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

  function onListLiftHovered(liftId: string) {
    const lift = liftLayerRef.current?.getSource()?.getFeatureById(liftId);
    if (lift) {
      lift.set(HOVERED, true);
    }
  }

  function onListLiftSelected(liftId: string) {
    const extent = liftLayerRef.current
      ?.getSource()
      ?.getFeatureById(liftId)
      ?.getGeometry()
      ?.getExtent(); // XXX: this might be slow ...
    if (extent) {
      setMapFocus(extent);
    }
  }

  useEffect(() => {
    // console.log("init function");
    inputRef.current?.focus();
    const styleCache = new globalThis.Map<string, Style>();

    function liftStyle(feature: FeatureLike) {
      let color = "#555";
      switch (feature.get(STATUS)) {
        case LiftStatus.Correct:
          color = "#2ecc71"; // color-success
          break;
        case LiftStatus.Missed:
          color = "#ff3838"; // color-error
          break;
      }

      const width = feature.get(HOVERED) ? 5 : 3;
      const key = `${color}-${width}`;
      let style = styleCache.get(key);

      if (!style) {
        style = new Style({
          stroke: new Stroke({ color, width }),
        });
        styleCache.set(key, style);
      }

      return style;
    }

    // create a list of features
    const liftList = resort.lifts.features.map(feature => feature.properties);

    const search = new Fuse<Lift>(liftList, {
      keys: ["name"],
      threshold: 1, // TODO: this may be pointless with the new filtering logic
    });

    searchRef.current = search;

    const liftSource = new VectorSource({
      features: new GeoJSON().readFeatures(resort.lifts, {
        featureProjection: "EPSG:3857",
      }),
    });
    const liftLayer = new VectorLayer({
      source: liftSource,
      style: liftStyle,
    });

    const olMap = new Map({
      target: "map",
      controls: defaultControls({
        attributionOptions: {
          collapsible: true,
          collapsed: false
        },
      }),
      layers: [
        new TileLayer({
          source: new OSM({ attributions: MAP_ATTRIBUTION }), // TODO: eventually use something other than OSM directly!
        }),
        liftLayer,
      ],
    });

    olMap.getView().fit(liftSource.getExtent()!, {
      padding: [200, 200, 200, 200],
      maxZoom: 14,
    });

    function handlePointerMove(event: MapBrowserEvent) {
      if (event.dragging) {
        return;
      }

      const resolution = olMap.getView().getResolution();
      if (!resolution) {
        return;
      }

      const [x, y] = event.coordinate;
      const tolerance = 10.5 * resolution;
      const toleranceSquared = tolerance * tolerance;
      const candidates = liftSource.getFeaturesInExtent([
        x - tolerance,
        y - tolerance,
        x + tolerance,
        y + tolerance,
      ]);

      let feature: Feature | null = null;
      let closestDistanceSquared = toleranceSquared;
      for (const candidate of candidates) {
        const geometry = candidate.getGeometry();
        if (!geometry) {
          continue;
        }

        const distanceSquared = geometry.closestPointXY(x, y, [], Infinity);
        if (distanceSquared < closestDistanceSquared) {
          feature = candidate;
          closestDistanceSquared = distanceSquared;
        }
      }

      const previousFeature = hoveredFeatureRef.current;

      // Nothing changed
      if (feature === previousFeature) {
        return;
      }

      // Mouse left previous lift
      if (previousFeature) {
        previousFeature.set(HOVERED, false);
      }

      // Mouse entered new lift
      if (feature) {
        feature.set(HOVERED, true);
      }

      hoveredFeatureRef.current = feature ?? null;
    }

    olMap.on("pointermove", handlePointerMove);

    mapRef.current = olMap;
    liftLayerRef.current = liftLayer;

    // ─────────────────────────
    // CLEANUP
    // ─────────────────────────
    return () => {
      // console.log("running cleanup");
      olMap.un("pointermove", handlePointerMove);
      olMap.setTarget(undefined);

      mapRef.current = null;
      liftLayerRef.current = null;
      hoveredFeatureRef.current = null;
    };
  }, [resort]);

  return <>
    <div id="map" className="absolute inset-0 z-1"></div>
    <main className="grid h-dvh grid-cols-4 grid-rows-[auto_minmax(0,1fr)]">
      <div className="z-2 mt-10 col-start-1 flex items-center justify-center">
        <Link href="/" className="p-3 bg-background rounded-md border-2 border-background hover:border-selection mr-3">&larr;</Link>
        <span className="p-3 bg-background rounded-md border-2 border-background">{resort.name}</span>
      </div>
      {gameState === GameState.Playing
        ? <input ref={inputRef} type="text" name="Lift Name" placeholder="Lift Name" value={liftName} onChange={e => setLiftName(e.target.value)} onKeyDown={submitLiftName}
          className={`mt-10 p-3 z-2 bg-background col-start-2 col-span-2 outline-none rounded-md border-2
            ${incorrectGuess ? "animate-shake border-error" : "border-background focus:border-selection"}`} />
        : gameState === GameState.Solved
          ? <span className="z-2 mt-10 h-fit p-3 bg-success col-start-2 col-span-2 flex items-center justify-center rounded-md">You got it!</span>
          : <CompletionBar percentage={percentageSolved} />
      }
      <span className={`z-2 mt-5 h-fit p-3 row-start-2 col-start-2 col-span-2 w-1/3 justify-self-center flex items-center
        justify-center rounded-md bg-success transition-opacity duration-300 ${alreadyFound ? "visible opacity-100" : "invisible opacity-0"}`}>Already found!</span>
      <SidePanel nLifts={resort.n_lifts} discovered={discoveredLifts} revealed={revealedLifts} onLiftHovered={onListLiftHovered} onLiftSelected={onListLiftSelected} revealAll={revealRest} />
    </main>
  </>;
}