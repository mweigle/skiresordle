import { LiftType } from "openskidata-format";
import LiftIcon from "./lift_icon";
import { Lift } from "@/lib/lift_data";

export default function DiscoveredLift({ lift, revealed = false }: { lift: Lift, revealed?: boolean }) {
  let liftType;
  switch (lift.liftType) {
    case LiftType.JBar:
    case LiftType.TBar:
    case LiftType.Platter:
    case LiftType.RopeTow: // not technically the same thing but...        
      liftType = LiftType.DragLift;
      break;
    default:
      liftType = lift.liftType;
      break;
  }

  const displayName = lift.name;
  const color = revealed ? " text-error" : "text-foreground";

  return <li className={`flex items-center justify-between ${color}`}>
    {displayName}<LiftIcon liftType={liftType} className={`h-6 w-6 ${color}`} />
  </li>;
}