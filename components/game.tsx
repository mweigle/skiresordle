"use client"

import Fuse from "fuse.js";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import "ol/ol.css";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import SidePanel from "./side_panel";
import { Lift, ResortWithLifts } from "@/types/types";

enum LiftStatus {
  Inactive,
  Hovered,
  Correct,
}

const STATUS = "status";
const MAX_NAME_DISTANCE = 2;

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

interface GameProps {
  resort: ResortWithLifts,
}

export default function Game({ resort }: GameProps) {
  const mapRef = useRef<Map | null>(null);
  const liftLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const hoveredFeatureRef = useRef<FeatureLike | null>(null);
  const searchRef = useRef<Fuse<Lift> | null>(null);

  const [liftName, setLiftName] = useState("");
  const [discoveredLifts, setDiscoveredLifts] = useState<Lift[]>([]);

  const [incorrectGuess, setIncorrectGuess] = useState(false);
  const [alreadyFound, setAlreadyFound] = useState(false);

  function submitLiftName(e: KeyboardEvent) {
    if (e.code !== "Enter" || !liftName) {
      return;
    }

    const search = searchRef.current;
    if (!search) {
      return;
    }

    const query = liftName.trim();
    const lift = search.search(query).find(({ item }) =>
      [item.name, item.alt_name].some(name => name && matchesLiftName(query, name))
    )?.item;

    if (!lift) {
      setIncorrectGuess(true);
      setTimeout(() => setIncorrectGuess(false), 500);
      return;
    }

    const source = liftLayerRef.current?.getSource();
    if (!source) {
      return;
    }

    const feature = source.getFeatureById(lift.id);
    if (!feature) {
      console.error("Could not find feature:", lift.id);
      return;
    }

    if (feature.get(STATUS) === LiftStatus.Correct) {
      setLiftName("");
      setAlreadyFound(true);
      setTimeout(() => setAlreadyFound(false), 2000);
      return;
    }

    feature.set(STATUS, LiftStatus.Correct);

    let focusExtent;
    if (discoveredLifts.length + 1 >= resort.lifts.features.length) {
      // all lifts have been found, focus the entire map
      // TODO: more fanfare!
      focusExtent = source.getExtent();
    } else {
      focusExtent = feature.getGeometry()?.getExtent();
    }
    if (focusExtent) {
      mapRef.current?.getView().fit(focusExtent, {
        padding: [200, 200, 200, 200],
        duration: 500,
        maxZoom: 16,
      });
    }

    setDiscoveredLifts(prev => [lift, ...prev]);
    setLiftName("");
  }

  useEffect(() => {
    // console.log("init function");
    const unknownStyle = new Style({
      stroke: new Stroke({
        color: "#555",
        width: 3,
      }),
    });

    const correctStyle = new Style({
      stroke: new Stroke({
        color: "#2ecc71", // color-success
        width: 5,
      }),
    });

    const hoveredStyle = new Style({
      stroke: new Stroke({
        color: "#3498db", // color-selection
        width: 5,
      }),
    });

    function liftStyle(feature: FeatureLike) {
      switch (feature.get(STATUS)) {
        case LiftStatus.Correct:
          return correctStyle;
        case LiftStatus.Hovered:
          return hoveredStyle;
        default:
          return unknownStyle;
      }
    }

    // create a list of features
    const liftList = resort.lifts.features.map(feature => ({
      ...feature.properties,
      id: feature.id,
    })) || [];
    // setDiscoveredLifts([]);

    const search = new Fuse<Lift>(liftList, {
      keys: ["name", "alt_name"],
      threshold: 1,
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
      layers: [
        new TileLayer({
          source: new OSM(), // TODO: eventually use something other than OSM directly!          
        }),
        liftLayer,
      ],
    });

    olMap.getView().fit(liftSource.getExtent()!, {
      padding: [200, 200, 200, 200],
      maxZoom: 16,
    });

    function handlePointerMove(event: MapBrowserEvent) {
      if (event.dragging) {
        return;
      }

      const feature = olMap.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (layer === liftLayer) {
          return feature;
        }
        return undefined;
      },
        { hitTolerance: 8 }
      );

      const previousFeature = hoveredFeatureRef.current;

      // Nothing changed
      if (feature === previousFeature) {
        return;
      }

      // Mouse left previous lift
      if (previousFeature) {
        if (previousFeature.get(STATUS) === LiftStatus.Hovered) {
          previousFeature.set(STATUS, LiftStatus.Inactive);
        }
      }

      // Mouse entered new lift
      if (feature) {
        if (feature.get(STATUS) !== LiftStatus.Correct) {
          feature.set(STATUS, LiftStatus.Hovered);
        }
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
    <main className="grid grid-cols-4">
      <div className="z-2 mt-10 p-3 w-fit justify-self-center col-start-1 bg-background rounded-full flex items-center justify-center">{resort.name}</div>
      <input name="Lift Name" type="text" placeholder="Lift Name" value={liftName} onChange={e => setLiftName(e.target.value)} onKeyDown={submitLiftName}
        className={`mt-10 p-3 z-2 bg-background col-start-2 col-span-2 outline-none rounded-md border-2
        ${incorrectGuess ? "animate-shake border-error" : "border-background focus:border-selection"}`} />
      <span className={`z-2 mt-5 h-fit p-3 row-start-2 col-start-2 col-span-2 w-1/3 justify-self-center flex items-center
        justify-center rounded-md bg-success transition-opacity duration-300 ${alreadyFound ? "visible opacity-100" : "invisible opacity-0"}`}>Already found!</span>
      <SidePanel nLifts={resort.lifts.features.length} discovered={discoveredLifts} />
    </main>
  </>;
}