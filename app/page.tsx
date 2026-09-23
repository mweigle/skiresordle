import ResortSearch from "@/components/resort_search";
import { loadCachedResorts } from "@/lib/lift_data"

export default function Home() {
  // TODO: remaining icons
  // TODO: front page
  const resorts = loadCachedResorts();

  return <ResortSearch resortList={resorts} />
}