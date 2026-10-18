import { LiftProperties, LiftType } from "openskidata-format";
import LiftIcon from "./lift_icon";

export default function DiscoveredLift({ lift }: { lift: LiftProperties }) {
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

  return <li className="flex items-center justify-between">
    {displayName}<LiftIcon liftType={liftType} className="h-6 w-6" />
  </li>;
}