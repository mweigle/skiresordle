import { Lift } from "./game";
import LiftIcon from "./lift_icon";

export default function DiscoveredLift({ lift }: { lift: Lift }) {
  let liftType = "unknown";
  switch (lift.aerialway) {
    case "cable_car":
    case "mixed_lift":
      // TODO: make an SVG
      break;
    case "gondola":
    case "chair_lift":
    case "drag_lift":
      // TODO: make an SVG
      liftType = lift.aerialway;
      break;
    case "j-bar":
    case "t-bar":
    case "platter":
    case "row_tow": // not technically the same thing but...        
      liftType = "drag_lift";
      break;
    case undefined:
      if (lift.railway === "funicular") {
        liftType = lift.railway;
      } else if (lift.railway) {
        console.error("weird railway type", lift.railway)
      }
      break;
    default:
      console.error("weird aerialway type", lift.aerialway)
  }

  let displayName = lift.name;
  if (lift.alt_name) {
    displayName += ` (${lift.alt_name})`;
  }

  return <li className="flex items-center justify-between">
    {displayName}<LiftIcon liftType={liftType} className="h-6 w-6" />
  </li>;
}