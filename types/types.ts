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
  type: string,
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

/// from Overpass API

export interface OverpassResorts {
  elements: OverpassResort[],
}

export interface OverpassResort {
  id: number,
  tags: {
    name: string,
    sport?: string,
  }
}

export interface OverpassJson {
    elements: OverpassElement[],
}

export interface OverpassElement {
    id: number,
    tags: OverpassTags,
    geometry: Array<{ lat: number, lon: number }>,
}

export interface OverpassTags {
    id: number,
    name: string,
    alt_name?: string,
    aerialway?: string,
    railway?: string,
}
