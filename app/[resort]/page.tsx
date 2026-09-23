import Game from "@/components/game";
import { loadOrFetchLifts } from "@/lib/lift_data";

export default async function GamePage({ params }: { params: Promise<{ resort: string }> }) {
  const { resort } = await params;
  const resortNameOrId = decodeURIComponent(resort);
  
  let resortWithLifts;
  try {
    resortWithLifts = await loadOrFetchLifts(resortNameOrId);
  } catch (e) {
    return <div>{e?.toString()}</div>
  }

  if (!resortWithLifts) {
    // notFound()
    return <div>The resort &quot;{resort}&quot; does not exist</div>
  }

  return <Game resort={resortWithLifts} />
}
