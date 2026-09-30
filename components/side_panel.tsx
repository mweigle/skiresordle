import DiscoveredLift from "./discovered_lift";
import { Lift } from "@/types/types";

interface SidePanelProps {
  nLifts: number,
  discovered: Lift[],
  revealAll: () => void,
}

// TODO: circle that fills as more lifts are discovered

export default function SidePanel({ nLifts, discovered, revealAll }: SidePanelProps) {
  return <>
    <div className="mt-10 z-2 col-start-4 flex items-center justify-center">
      <div className="rounded-full text-center bg-background w-1/5 p-3">{discovered.length}/{nLifts}</div>
      {/* <button onClick={revealAll} className="cursor-pointer bg-error rounded-md p-3">Give up</button> */}
    </div>
    {discovered.length && <ul className="row-start-2 col-start-4 z-2 mt-5 mx-10 self-start min-h-0 max-h-11/12 p-3 rounded-md bg-background/75 overflow-y-auto">
      {discovered.map(lift => <DiscoveredLift key={lift.id} lift={lift} />)}
    </ul>}
  </>
}
