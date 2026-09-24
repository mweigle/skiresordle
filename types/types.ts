export interface ResortIdent {
  id: number,
  name: string,
}

export interface ResortWithLifts {
  id: number,
  name: string,
  lifts: GeoFeatureList,
}

export interface Lift {
  id: number,
  name: string,
  alt_name?: string,
  aerialway?: string,
  railway?: string, // TODO: consolidate these into "type" or smth in the transformation set from overpass to geoJson
}

export interface GeoFeature {
  type: string,
  id: number,
  properties: Lift,
  geometry: {
    type: string,
    coordinates: Array<[number, number]>,
  },
}

export interface GeoFeatureList {
  type: string,
  features: GeoFeature[],
}