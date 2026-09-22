import Game from "@/components/game";
import { loadOrFetchLifts } from "@/lib/lift_data";

export default async function GamePage({ params }: { params: Promise<{ resort: string }> }) {
  let { resort } = await params;
  resort = decodeURIComponent(resort);
  
  let geoJson;
  try {
    geoJson = await loadOrFetchLifts(resort);
  } catch (e) {
    return <div>{e.toString()}</div>
  }

  if (!geoJson) {
    return <div>The resort "{resort}" does not exist</div>
  }

  return <Game resortGeoJson={geoJson} />
}
