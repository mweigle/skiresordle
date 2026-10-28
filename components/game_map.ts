import { FeatureCollection, Lift } from "@/lib/lift_data";
import { defaults as defaultControls } from "ol/control/defaults";
import { Coordinate } from "ol/coordinate";
import { Extent } from "ol/extent";
import Feature, { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OlMap from "ol/Map";
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

const STATUS = "status";
const HOVERED = "hovered";

const MAP_ATTRIBUTION = 'Data from OpenSkiData / <a href="https://openskimap.org">OpenSkiMap.org</a>, © <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL), <a href="https://skimap.org">Skimap.org</a>, Who\'s On First, © Mapterhorn';

export class GameMap {
  map: OlMap;
  liftSource: VectorSource;
  styleCache: Map<string, Style>;
  hoveredFeature: Feature | null;

  constructor(
    target: HTMLElement,
    lifts: FeatureCollection<GeoJSON.Feature<LiftGeometry, Lift>>,
  ) {
    const liftSource = new VectorSource({
      features: new GeoJSON().readFeatures(lifts, {
        featureProjection: "EPSG:3857",
      }),
    });
    const liftLayer = new VectorLayer({
      source: liftSource,
      style: this.liftStyle,
    });
    const map = new OlMap({
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

    map.on("pointermove", this.handlePointerMove);
    map.on("click", this.handleClick);

    this.map = map;
    this.liftSource = liftSource;
    this.styleCache = new Map();
    this.hoveredFeature = null;
  }

  dispose() {
    this.map.un("pointermove", this.handlePointerMove);
    this.map.un("click", this.handleClick);
    this.map.setTarget(undefined);
    this.hoveredFeature = null;
  }

  setFocus(extent: Extent, zoom: number = 14) {
    this.map.getView().fit(extent, {
      padding: [200, 200, 200, 200],
      duration: 500,
      maxZoom: zoom,
    });
  }

  setLiftStatus(liftId: number, status: LiftStatus) {
    this.liftSource.getFeatureById(liftId)?.set(STATUS, status);
  }

  setAllLiftsStatus(status: LiftStatus) {
    const lifts = this.liftSource.getFeatures();
    for (const lift of lifts) {
      lift.set(STATUS, status);
    }
  }

  setLiftHovered(liftId: number) {
    const lift = this.liftSource.getFeatureById(liftId);
    if (lift) {
      if (this.hoveredFeature) {
        this.hoveredFeature.set(HOVERED, false);
      }
      lift.set(HOVERED, true);
      this.hoveredFeature = lift;
    }
  }

  getLiftExtent(liftId: number): Extent | undefined {
    return this.liftSource.getFeatureById(liftId)
      ?.getGeometry()
      ?.getExtent();
  }

  setLiftFocus(liftId: number, zoom?: number) {
    const extent = this.getLiftExtent(liftId);
    if (extent) {
      this.setFocus(extent, zoom);
    }
  }

  zoomOut() {
    const totalArea = this.liftSource.getExtent();
    if (totalArea) {
      this.setFocus(totalArea);
    }
  }
  // --- callbacks (defined as arrow functions to preserve "this" context)

  liftStyle = (feature: FeatureLike) => {
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
    let style = this.styleCache.get(key);

    if (!style) {
      style = new Style({
        stroke: new Stroke({ color, width }),
      });
      this.styleCache.set(key, style);
    }

    return style;
  }

  getFeatureAtCoordinate(coord: Coordinate): Feature | null {
    const resolution = this.map.getView().getResolution();
    if (!resolution) {
      return null;
    }
    const [x, y] = coord;
    const tolerance = 10.5 * resolution;
    const toleranceSquared = tolerance * tolerance;
    const candidates = this.liftSource.getFeaturesInExtent([
      x - tolerance,
      y - tolerance,
      x + tolerance,
      y + tolerance,
    ]);

    let feature = null;
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
    return feature;
  }

  handlePointerMove = (event: MapBrowserEvent) => {
    if (event.dragging) {
      return;
    }

    const feature = this.getFeatureAtCoordinate(event.coordinate);
    if (feature === this.hoveredFeature) {
      return;
    }

    this.hoveredFeature?.set(HOVERED, false);
    feature?.set(HOVERED, true);
    this.hoveredFeature = feature;
  }

  handleClick = (event: MapBrowserEvent) => {
    const feature = this.getFeatureAtCoordinate(event.coordinate);
    if (feature) {
      const extent = feature.getGeometry()?.getExtent();
      if (extent) {
        this.setFocus(extent, 16);
      }
      // const id = feature.getId();
      // this.clickCallback(id);
    }
  }
}
