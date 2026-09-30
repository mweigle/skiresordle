import ResortSearch from "@/components/resort_search";
import { getResorts } from "@/lib/db";
import { connection } from "next/server";

export default async function Home() {
  // TODO: remaining icons
  // TODO: front page
  // TODO: "reveal names" feature, zumindest zum debuggen
  // TODO: einstellen, welche lift-arten man sehen will? nice to have
  // TODO: speichern welche wie oft gespielt / wie oft gelöst wurden
  await connection();
  const resorts = getResorts();

  return <ResortSearch initialResorts={resorts} />
}