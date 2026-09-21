import Game from "@/components/game";
import { loadOrFetchLifts } from "@/lib/lift_data";

export default async function GamePage({ params }) {
    const { resort } = await params;

    let geoJson;
    try {
      geoJson = await loadOrFetchLifts(resort);
    } catch (e) {
      return <div>{e.toString()}</div>
    }

    if (!geoJson) {
      return <div>The resort "{resort}" does not exist</div>
    }

    return <Game resortGeoJson={geoJson}></Game>
}
