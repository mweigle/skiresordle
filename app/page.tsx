import ResortSearch from "@/components/resort_search";
import { initialResorts } from "@/lib/db";

export default function Home() {
  // TODO: remaining icons
  // TODO: lookups besser machen
  // TODO: list <-> map interaction
  //  - zoom deeper into a focussed lift.
  //  - remove focus thickness when mouse leaves
  //  - make relation work both ways
  // TODO: einstellen, welche lift-arten man sehen will? nice to have
  
  // NOTE: do not use "await connection();" here because the front page data is static
  //       and does not need to get re-fetched per request
  const resorts = initialResorts();

  return <ResortSearch initialResorts={resorts} />
}