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
    <div className="mt-10 p-3 w-1/5 text-center bg-background rounded-full z-2 col-start-4 justify-self-center flex items-center justify-center">{discovered.length}/{nLifts}</div>
    {/* <button onClick={revealAll} className="z-2 rounded-md">Give up</button> */}
    {discovered.length && <ul className="row-start-2 col-start-4 z-2 mt-5 mx-10 p-3 rounded-md bg-background/75">
      {discovered.map(lift => <DiscoveredLift key={lift.id} lift={lift} />)}
    </ul>}
  </>
}
