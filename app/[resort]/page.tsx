import Game from "@/components/game";
import { loadOrFetchLifts } from "@/lib/lift_data";
import Link from "next/link";

export default async function GamePage({ params }: { params: Promise<{ resort: string }> }) {
  const { resort } = await params;
  const resortNameOrId = decodeURIComponent(resort);

  let resortWithLifts;
  try {
    resortWithLifts = await loadOrFetchLifts(resortNameOrId);
  } catch (e) {
    return <main className="flex flex-col justify-center items-center mt-10">
      <span>Encountered an error:</span>
      <p className="text-error my-3">&quot;{e?.toString()}&quot;</p>
      <Link href="/" className="p-3 rounded-md hover:border-selection border-2">Back to search</Link>
    </main>
  }

  if (!resortWithLifts) {
    return <main className="flex flex-col justify-center items-center mt-10">
      <span>Cannot find resort &quot;{resort}&quot;</span>
      <Link href="/" className="p-3 rounded-md hover:border-selection border-2">Back to search</Link>
    </main>
  }

  return <Game resort={resortWithLifts} />
}
