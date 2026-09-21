"use client";

import { overpassJsonToGeoJson } from "@/lib/transform";
import Fuse from "fuse.js";
import { Feature } from "ol";
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
import View from "ol/View.js";
import { useEffect, useRef, useState } from "react";

const pitztalJson = {
  "version": 0.6,
  "generator": "Overpass API 0.7.62.11 87bfad18",
  "osm3s": {
    "timestamp_osm_base": "2026-09-19T10:06:06Z",
    "timestamp_areas_base": "2026-09-18T11:19:50Z",
    "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
  },
  "elements": [

    {
      "type": "way",
      "id": 23510277,
      "bounds": {
        "minlat": 46.9112911,
        "minlon": 10.8647007,
        "maxlat": 46.9223934,
        "maxlon": 10.8897886
      },
      "nodes": [
        989083832,
        603610683,
        603610681,
        603610676,
        603610670,
        603610666,
        603610642,
        603610639,
        603610636,
        603610633,
        603610629,
        254608586,
        603610626,
        603610623,
        603610620,
        603610610,
        603610608,
        254608587
      ],
      "geometry": [
        { "lat": 46.9223934, "lon": 10.8897886 },
        { "lat": 46.9221360, "lon": 10.8894897 },
        { "lat": 46.9216888, "lon": 10.8889703 },
        { "lat": 46.9208990, "lon": 10.8880530 },
        { "lat": 46.9195444, "lon": 10.8864798 },
        { "lat": 46.9181749, "lon": 10.8848893 },
        { "lat": 46.9179028, "lon": 10.8845733 },
        { "lat": 46.9159329, "lon": 10.8822857 },
        { "lat": 46.9151638, "lon": 10.8813926 },
        { "lat": 46.9149468, "lon": 10.8811405 },
        { "lat": 46.9145943, "lon": 10.8807436 },
        { "lat": 46.9145322, "lon": 10.8806591 },
        { "lat": 46.9144572, "lon": 10.8802896 },
        { "lat": 46.9143639, "lon": 10.8798306 },
        { "lat": 46.9139161, "lon": 10.8776254 },
        { "lat": 46.9125278, "lon": 10.8707900 },
        { "lat": 46.9124550, "lon": 10.8704313 },
        { "lat": 46.9112911, "lon": 10.8647007 }
      ],
      "tags": {
        "aerialway": "gondola",
        "aerialway:bicycle": "summer",
        "aerialway:occupancy": "8",
        "name": "Mittelbergbahn",
        "oneway": "no"
      }
    },
    {
      "type": "way",
      "id": 23511343,
      "bounds": {
        "minlat": 46.9221633,
        "minlon": 10.8550838,
        "maxlat": 46.9261468,
        "maxlon": 10.8790990
      },
      "nodes": [
        633177584,
        9008122596,
        9008122593,
        9008122592,
        9008122591,
        9008122590,
        9008122589,
        9008122588,
        9008122587,
        9008122586,
        9008122585,
        9008122584,
        9008122583,
        9008122582,
        9008122581,
        9008122580,
        9008122579,
        9008122578,
        254620333,
        3548593457
      ],
      "geometry": [
        { "lat": 46.9261468, "lon": 10.8790990 },
        { "lat": 46.9260394, "lon": 10.8784516 },
        { "lat": 46.9259029, "lon": 10.8776286 },
        { "lat": 46.9257433, "lon": 10.8766666 },
        { "lat": 46.9255374, "lon": 10.8754252 },
        { "lat": 46.9252321, "lon": 10.8735844 },
        { "lat": 46.9250873, "lon": 10.8727117 },
        { "lat": 46.9248229, "lon": 10.8711174 },
        { "lat": 46.9245690, "lon": 10.8695869 },
        { "lat": 46.9243639, "lon": 10.8683502 },
        { "lat": 46.9241415, "lon": 10.8670095 },
        { "lat": 46.9238957, "lon": 10.8655277 },
        { "lat": 46.9236338, "lon": 10.8639489 },
        { "lat": 46.9234216, "lon": 10.8626695 },
        { "lat": 46.9232599, "lon": 10.8616947 },
        { "lat": 46.9229597, "lon": 10.8598848 },
        { "lat": 46.9226415, "lon": 10.8579666 },
        { "lat": 46.9223866, "lon": 10.8564302 },
        { "lat": 46.9222438, "lon": 10.8555691 },
        { "lat": 46.9221633, "lon": 10.8550838 }
      ],
      "tags": {
        "aerialway": "t-bar",
        "name": "Brunnenkogellift"
      }
    },
    {
      "type": "way",
      "id": 23511345,
      "bounds": {
        "minlat": 46.9127897,
        "minlon": 10.8624690,
        "maxlat": 46.9258139,
        "maxlon": 10.8790771
      },
      "nodes": [
        254620336,
        14148589249,
        9008122595,
        9008122594,
        603610685,
        603610611,
        9008122597,
        9008122598,
        254620334,
        9008122599,
        9008122600,
        9008122601,
        603610602,
        9008122602,
        254620335
      ],
      "geometry": [
        { "lat": 46.9258139, "lon": 10.8790771 },
        { "lat": 46.9256953, "lon": 10.8789201 },
        { "lat": 46.9256657, "lon": 10.8788810 },
        { "lat": 46.9251370, "lon": 10.8782202 },
        { "lat": 46.9242323, "lon": 10.8770127 },
        { "lat": 46.9217141, "lon": 10.8738279 },
        { "lat": 46.9211467, "lon": 10.8731350 },
        { "lat": 46.9195420, "lon": 10.8711181 },
        { "lat": 46.9194261, "lon": 10.8709724 },
        { "lat": 46.9193417, "lon": 10.8708664 },
        { "lat": 46.9167981, "lon": 10.8675983 },
        { "lat": 46.9160189, "lon": 10.8666148 },
        { "lat": 46.9157885, "lon": 10.8663300 },
        { "lat": 46.9137433, "lon": 10.8637196 },
        { "lat": 46.9127897, "lon": 10.8624690 }
      ],
      "tags": {
        "aerialway": "gondola",
        "aerialway:bicycle": "summer",
        "aerialway:bubble": "yes",
        "aerialway:capacity": "2185",
        "aerialway:duration": "5,67",
        "aerialway:heating": "yes",
        "aerialway:occupancy": "8",
        "alt_name": "Piz Panoramabahn",
        "name": "Wildspitzbahn"
      }
    },
    {
      "type": "way",
      "id": 23511348,
      "bounds": {
        "minlat": 46.9226697,
        "minlon": 10.8804477,
        "maxlat": 46.9261122,
        "maxlon": 10.8894172
      },
      "nodes": [
        989084006,
        8721146404,
        8721146405,
        8721146406,
        8721146407,
        8721146408,
        8721146409,
        8721146410,
        254620337
      ],
      "geometry": [
        { "lat": 46.9226697, "lon": 10.8894172 },
        { "lat": 46.9228783, "lon": 10.8888757 },
        { "lat": 46.9235349, "lon": 10.8871711 },
        { "lat": 46.9242908, "lon": 10.8852089 },
        { "lat": 46.9250555, "lon": 10.8832240 },
        { "lat": 46.9252410, "lon": 10.8827423 },
        { "lat": 46.9256077, "lon": 10.8817904 },
        { "lat": 46.9259095, "lon": 10.8810070 },
        { "lat": 46.9261122, "lon": 10.8804477 }
      ],
      "tags": {
        "aerialway": "chair_lift",
        "aerialway:bicycle": "summer",
        "aerialway:bubble": "yes",
        "aerialway:occupancy": "6",
        "name": "Gletschersee"
      }
    },
    {
      "type": "way",
      "id": 29006128,
      "bounds": {
        "minlat": 46.9269601,
        "minlon": 10.8714481,
        "maxlat": 46.9583193,
        "maxlon": 10.8796103
      },
      "nodes": [
        1684610373,
        7619187582,
        14070246137,
        3114658710,
        1632603430
      ],
      "geometry": [
        { "lat": 46.9583193, "lon": 10.8714481 },
        { "lat": 46.9582509, "lon": 10.8714658 },
        { "lat": 46.9536060, "lon": 10.8726751 },
        { "lat": 46.9269930, "lon": 10.8796017 },
        { "lat": 46.9269601, "lon": 10.8796103 }
      ],
      "tags": {
        "layer": "-1",
        "maxspeed": "43",
        "name": "Gletscherexpress",
        "operator": "Pitztaler Gletscherbahnen",
        "railway": "funicular",
        "start_date": "1983",
        "tunnel": "yes",
        "wikidata": "Q110008162",
        "wikipedia": "de:Gletscherexpress (Pitztaler Gletscher)"
      }
    },
    {
      "type": "way",
      "id": 47422475,
      "bounds": {
        "minlat": 46.9265488,
        "minlon": 10.8738028,
        "maxlat": 46.9279986,
        "maxlon": 10.8786262
      },
      "nodes": [
        633177587,
        14008640879,
        3548574480,
        633177497
      ],
      "geometry": [
        { "lat": 46.9265488, "lon": 10.8786262 },
        { "lat": 46.9266664, "lon": 10.8782351 },
        { "lat": 46.9278325, "lon": 10.8743554 },
        { "lat": 46.9279986, "lon": 10.8738028 }
      ],
      "tags": {
        "aerialway": "platter",
        "name": "Mittagskogel"
      }
    },
    {
      "type": "way",
      "id": 95648828,
      "bounds": {
        "minlat": 46.9261209,
        "minlon": 10.8772466,
        "maxlat": 46.9261511,
        "maxlon": 10.8781426
      },
      "nodes": [
        1109028431,
        1109028258
      ],
      "geometry": [
        { "lat": 46.9261511, "lon": 10.8781426 },
        { "lat": 46.9261209, "lon": 10.8772466 }
      ],
      "tags": {
        "aerialway": "magic_carpet"
      }
    }

  ]
};

export default function Home() {
  const hoveredFeatureRef = useRef<FeatureLike | null>(null);

  const mapRef = useRef(null);
  const liftLayerRef = useRef(null);
  const liftTable = useRef([]);
  const search = useRef(null);

  const [liftName, setLiftName] = useState("");
  const [discoveredLifts, setDiscoveredLifts] = useState<string[]>([]);
  const [nLifts, setNLifts] = useState(0);

  function submitLiftName(e) {
    if (e.code !== "Enter") {
      return;
    }
    const searchResult = search.current.search(liftName);
    const item = searchResult[0]?.item;

    if (!item) {
      // TODO: play a shaky animation ;)
      return;
    }

    if (item.discovered) {
      // TODO: show info that the lift is already discovered
      setLiftName("");
      return;
    }

    item.discovered = true;
    const feature = liftLayerRef.current.getSource().getFeatureById(item.id);
    feature.set("status", "correct");

    const geometry = feature.getGeometry();
    if (geometry) {
      mapRef.current.getView().fit(geometry.getExtent(), {
        padding: [200, 200, 200, 200],
        duration: 500,
        maxZoom: 16,
      });
    }
    const displayString = item.alt_name ? `${item.name}/${item.alt_name} (${item.aerialway})` : `${item.name} (${item.aerialway})`;
    setDiscoveredLifts([displayString, ...discoveredLifts]);
    setLiftName("");
    // TODO: center the map on the discovered lift!
  }

  useEffect(() => {
    console.log("init function");

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

    const selectedStyle = new Style({
      stroke: new Stroke({
        color: "#3498db",
        width: 6,
      }),
    });

    function liftStyle(feature: Feature) {
      switch (feature.get("status")) {
        case "correct":
          return correctStyle;

        case "hover":
          return selectedStyle;

        default:
          return unknownStyle;
      }
    }


    const featureList = overpassJsonToGeoJson(JSON.stringify(pitztalJson));

    // create a list of features
    const lifts = featureList?.features.map(feature => ({
      ...feature.properties,
      id: feature.id,
      discovered: false,
    })) || [];
    console.log(lifts);
    setDiscoveredLifts([]);
    setNLifts(lifts.length);

    const fuse = new Fuse(lifts, {
      keys: ["name", "alt_name"],
      includeScore: true,
      distance: 0,
      threshold: 0.2,
    });

    liftTable.current = lifts;
    search.current = fuse;

    const liftSource = new VectorSource({
      features: new GeoJSON().readFeatures(featureList, {
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

    olMap.getView().fit(liftSource.getExtent(), {
      padding: [200, 200, 200, 200],
      maxZoom: 14,
    });

    olMap.on("pointermove", (event) => {
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
        if (previousFeature.get("status") === "hover") {
          previousFeature.set("status", "unknown");
        }
      }

      // Mouse entered new lift
      if (feature) {
        console.log("Hovered:", feature.get("name"));
        console.log("Status:", feature.get("status"));

        if (feature.get("status") === "unknown") {
          feature.set("status", "hover");
        }
      }

      hoveredFeatureRef.current = feature ?? null;
    });

    mapRef.current = olMap;
    liftLayerRef.current = liftLayer;

    return () => {
      olMap.setTarget(undefined);
    };
  }, []);

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

/*


[out:json][timeout:25];

area["landuse"="winter_sports"];

out geom;


[out:json][timeout:25];
(
  way["name"="Pitztaler Gletscher"];
)->.resort;
(
  way["aerialway"="cable_car"](area.resort);
  way["aerialway"="gondola"](area.resort);
  way["aerialway"="chair_lift"](area.resort);
  way["aerialway"="mixed_lift"](area.resort);
  way["aerialway"="t-bar"](area.resort);
  way["aerialway"="j-bar"](area.resort);
  way["aerialway"="platter"](area.resort);
  way["aerialway"="rope_tow"](area.resort);
  way["aerialway"="magic_carpet"](area.resort);
  way["railway"="funicular"](area.resort);
);

out geom;

*/
