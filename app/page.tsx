import { loadCachedResorts } from "@/lib/lift_data"
import Link from "next/link";

export default function Home() {
  // TODO: "bahn" should be optional
  // reloading causes issues
  // remaining icons
  const resorts = loadCachedResorts();

  return <ul className="flex flex-col">
    {resorts.map(resort => <li key={resort.id}><Link href={`/${resort.name}`}>{resort.name}</Link></li>)}
  </ul>
}