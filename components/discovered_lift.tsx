import LiftIcon from "./lift_icon";
import { Lift } from "@/lib/lift_data";

export default function DiscoveredLift({ lift, revealed = false }: { lift: Lift, revealed?: boolean }) {
  const displayName = lift.name;
  const color = revealed ? " text-error" : "text-foreground";

  return <li className={`flex items-center justify-between ${color}`}>
    {displayName}<LiftIcon liftType={lift.liftType} className={`h-6 w-6 ${color}`} />
  </li>;
}