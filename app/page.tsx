import ResortSearch from "@/components/resort_search";
import { loadCachedResorts } from "@/lib/lift_data"

export default function Home() {
  // TODO: remaining icons
  // TODO: front page
  // TODO: "reveal names" feature, zumindest zum debuggen
  // TODO: einstellen, welche lift-arten man sehen will? nice to have
  const resorts = loadCachedResorts();

  return <ResortSearch resortList={resorts} />
}