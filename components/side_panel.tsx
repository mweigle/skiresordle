import DiscoveredLift from "./discovered_lift";
import { Lift } from "@/types/types";

interface SidePanelProps {
  nLifts: number,
  discovered: Lift[],
}

export default function SidePanel({ nLifts, discovered }: SidePanelProps) {
  return <>
    <div className="mt-10 p-3 w-1/5 text-center bg-white text-black rounded-full z-2 col-start-4 justify-self-center flex items-center justify-center">{discovered.length}/{nLifts}</div>
    <ul className="row-start-2 col-start-4 z-2 p-3 text-black">
      {discovered.map(lift => <DiscoveredLift key={lift.id} lift={lift} />)}
    </ul>
  </>
}
