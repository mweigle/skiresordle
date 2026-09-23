export interface Lift {
  id: number;
  name: string;
  alt_name?: string;
  aerialway?: string;
  railway?: string;
}

export interface GeoFeature {
  type: "Feature",
  id: number,
  properties: object,
  geometry: {
    type: "LineString"
    coordinates: Array<[number, number]>,
  },
}

export interface GeoFeatureList {
  type: "FeatureList",
  features: GeoFeature[],
}