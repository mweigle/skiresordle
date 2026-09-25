import { Lift } from "@/types/types";
import LiftIcon from "./lift_icon";

export default function DiscoveredLift({ lift }: { lift: Lift }) {
  let liftType;
  switch (lift.type) {
    case "j-bar":
    case "t-bar":
    case "platter":
    case "row_tow": // not technically the same thing but...        
      liftType = "drag_lift";
      break;
    default:
      liftType = lift.type;
      break;
  }

  let displayName = lift.name;
  if (lift.alt_name) {
    displayName += ` (${lift.alt_name})`;
  }

  return <li className="flex items-center justify-between">
    {displayName}<LiftIcon liftType={liftType} className="h-6 w-6" />
  </li>;
}