import LiftIcon from "./lift_icon";
import { Lift } from "@/lib/lift_data";

interface DiscoveredLiftProps {
  lift: Lift,
  revealed?: boolean,
  onSelect: (liftId: number) => void,
  onFocus: (liftId: number) => void,
}

export default function DiscoveredLift({ lift, revealed = false, onSelect, onFocus }: DiscoveredLiftProps) {
  const color = revealed ? "error" : "foreground";

  return <li onClick={() => onSelect(lift.id)} onMouseEnter={() => onFocus(lift.id)}
    className={`px-2 py-1 flex items-center justify-between rounded-md cursor-pointer hover:bg-selection/50 text-${color}`}>
    {lift.name}<LiftIcon liftType={lift.liftType} className={`h-6 w-6 text-${color}`} />
  </li>;
}
