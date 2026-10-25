import { Lift } from "@/lib/lift_data";
import DiscoveredLift from "./discovered_lift";

interface SidePanelProps {
  nLifts: number,
  discovered: Lift[],
  revealed: Lift[],
  onLiftHovered: (liftId: number) => void,
  onLiftSelected: (liftId: number) => void,
  revealAll: () => void,
  reset: () => void,
}

// XXX: circle that fills as more lifts are discovered

export default function SidePanel({ nLifts, discovered, revealed, revealAll, reset, onLiftHovered, onLiftSelected }: SidePanelProps) {
  return <>
    <div className="mt-10 z-2 col-start-4 flex items-center justify-center">
      <div className="rounded-full text-center bg-background w-1/5 p-3 mr-3">{discovered.length}/{nLifts}</div>
      <button onClick={revealAll} className="p-3 rounded-md cursor-pointer bg-background border-2 border-background hover:border-error mr-3" hidden={!!revealed.length}>Reveal all</button>
      <button onClick={reset} className="p-3 rounded-md cursor-pointer bg-background border-2 border-background hover:border-selection">Restart</button>
    </div>
    {(discovered.length || revealed.length) && <ul className="row-start-2 col-start-4 z-2 mt-5 mx-10 self-start min-h-0 max-h-11/12 p-3 rounded-md bg-background/75 overflow-y-auto">
      {revealed.map(lift => <DiscoveredLift key={lift.id} lift={lift} revealed={true} onFocus={onLiftHovered} onSelect={onLiftSelected} />)}
      {discovered.map(lift => <DiscoveredLift key={lift.id} lift={lift} onFocus={onLiftHovered} onSelect={onLiftSelected} />)}
    </ul>}
  </>
}
