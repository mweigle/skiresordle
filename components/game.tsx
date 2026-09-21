"use client"

import Fuse from "fuse.js";
import { MapBrowserEvent, View } from "ol";
import { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import { OSM } from "ol/source";
import VectorSource from "ol/source/Vector";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

enum LiftStatus {
  Inactive,
  Hovered,
  Correct,
}

interface Lift {
  id: number;
  name: string;
  alt_name?: string;
  aerialway?: string;
}

const STATUS = "status";

export default function Game({ resortGeoJson }) {
  const mapRef = useRef<Map | null>(null);
  const liftLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const liftTable = useRef<Lift[]>([]);
  const search = useRef<Fuse<Lift> | null>(null);
  const hoveredFeatureRef = useRef<FeatureLike | null>(null);

  const [liftName, setLiftName] = useState("");
  const [discoveredLifts, setDiscoveredLifts] = useState<string[]>([]);
  const [nLifts, setNLifts] = useState(0);

  function submitLiftName(e: KeyboardEvent) {
    if (e.code !== "Enter") {
      return;
    }

    const fuse = search.current;
    if (!fuse) {
      return;
    }

    const searchResult = fuse.search(liftName);
    const item = searchResult[0]?.item;

    if (!item) {
      // TODO: play a shaky animation ;)
      return;
    }

    const source = liftLayerRef.current?.getSource();
    if (!source) {
      return;
    }

    const feature = source.getFeatureById(item.id);
    if (!feature) {
      console.error("Could not find feature:", item.id);
      return;
    }

    if (feature.get(STATUS) === LiftStatus.Correct) {
      // TODO: show info that the lift is already discovered
      setLiftName("");
      return;
    }

    feature.set(STATUS, LiftStatus.Correct);

    const geometry = feature.getGeometry();
    if (geometry) {
      mapRef.current?.getView().fit(geometry.getExtent(), {
        padding: [200, 200, 200, 200],
        duration: 500,
        maxZoom: 16,
      });
    }
    const displayString = item.alt_name
      ? `${item.name}/${item.alt_name} (${item.aerialway})`
      : `${item.name} (${item.aerialway})`;
    setDiscoveredLifts(prev => [displayString, ...prev]);
    setLiftName("");
    // TODO: center the map on the discovered lift!
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
        color: "#2ecc71",
        width: 5,
      }),
    });

    const hoveredStyle = new Style({
      stroke: new Stroke({
        color: "#3498db",
        width: 6,
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
    const lifts = resortGeoJson?.features.map(feature => ({
      ...feature.properties,
      id: feature.id,
    })) || [];
    setDiscoveredLifts([]);
    setNLifts(lifts.length);

    const fuse = new Fuse<Lift>(lifts, {
      keys: ["name", "alt_name"],
      includeScore: true,
      distance: 0,
      threshold: 0.2,
    });

    liftTable.current = lifts;
    search.current = fuse;

    const liftSource = new VectorSource({
      features: new GeoJSON().readFeatures(resortGeoJson, {
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
      view: new View({
        center: [0, 0],
        zoom: 2,
      }),
    });

    olMap.getView().fit(liftSource.getExtent()!, {
      padding: [200, 200, 200, 200],
      maxZoom: 14,
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
        // console.log("Hovered:", feature.get("name"));
        // console.log("Status:", feature.get(STATUS));

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
  }, [resortGeoJson]);

  return <>
    <div id="map" className="absolute inset-0 z-1"></div>
    <main className="grid grid-cols-4">
      <input type="text" placeholder="Lift Name" value={liftName} onChange={e => setLiftName(e.target.value)} onKeyDown={submitLiftName}
        className="mt-10 p-3 z-2 bg-white text-black col-start-2 col-span-2 outline-none rounded-md border-solid border-2 border-blue-200" />
      <div className="mt-10 p-3 bg-white text-black rounded-full z-2 col-start-4">{discoveredLifts.length}/{nLifts}</div>
      <ul className="row-start-2 col-start-4 z-2 p-3 text-black">
        {discoveredLifts.map(lift => <li key={lift}>{lift}</li>)}
      </ul>
    </main>
  </>;
}