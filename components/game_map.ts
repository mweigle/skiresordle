import { FeatureCollection, Lift } from "@/lib/lift_data";
import { defaults as defaultControls } from "ol/control/defaults";
import { Extent } from "ol/extent";
import Feature, { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import MapBrowserEvent from "ol/MapBrowserEvent";
import "ol/ol.css";
import { OSM } from "ol/source";
import VectorSource from "ol/source/Vector";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import type { LiftGeometry } from "openskidata-format";

export enum LiftStatus {
  Inactive,
  Correct,
  Missed,
}

export const STATUS = "status";
export const HOVERED = "hovered";

const MAP_ATTRIBUTION = 'Data from OpenSkiData / <a href="https://openskimap.org">OpenSkiMap.org</a>, © <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL), <a href="https://skimap.org">Skimap.org</a>, Who\'s On First, © Mapterhorn';

export interface GameMap {
  map: Map;
  liftSource: VectorSource;
  setFocus: (extent: Extent) => void;
  dispose: () => void;
}

export function createGameMap(
  target: HTMLElement,
  lifts: FeatureCollection<GeoJSON.Feature<LiftGeometry, Lift>>
): GameMap {
  const styleCache = new globalThis.Map<string, Style>();

  function liftStyle(feature: FeatureLike) {
    let color = "#505050";
    switch (feature.get(STATUS)) {
      case LiftStatus.Correct:
        color = "#2ecc71";
        break;
      case LiftStatus.Missed:
        color = "#ff3838";
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

  const liftSource = new VectorSource({
    features: new GeoJSON().readFeatures(lifts, {
      featureProjection: "EPSG:3857",
    }),
  });
  const liftLayer = new VectorLayer({
    source: liftSource,
    style: liftStyle,
  });
  const map = new Map({
    target,
    controls: defaultControls({
      attributionOptions: {
        collapsible: true,
        collapsed: false,
      },
    }),
    layers: [
      new TileLayer({
        source: new OSM({ attributions: MAP_ATTRIBUTION }),
      }),
      liftLayer,
    ],
  });

  map.getView().fit(liftSource.getExtent()!, {
    padding: [200, 200, 200, 200],
    maxZoom: 14,
  });

  let hoveredFeature: Feature | null = null;
  function handlePointerMove(event: MapBrowserEvent) {
    if (event.dragging) {
      return;
    }

    const resolution = map.getView().getResolution();
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

    if (feature === hoveredFeature) {
      return;
    }

    hoveredFeature?.set(HOVERED, false);
    feature?.set(HOVERED, true);
    hoveredFeature = feature;
  }

  map.on("pointermove", handlePointerMove);

  return {
    map,
    liftSource,
    setFocus(extent: Extent) {
      map.getView().fit(extent, {
        padding: [200, 200, 200, 200],
        duration: 500,
        maxZoom: 14,
      });
    },
    dispose() {
      map.un("pointermove", handlePointerMove);
      map.setTarget(undefined);
      hoveredFeature = null;
    },
  };
}
