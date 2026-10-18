// import { readFile } from "node:fs/promises";
// import { join } from "node:path";
import { buildSkiResortDb, queryOpenSkiData } from "@/lib/lift_data";
// import type { FeatureCollection } from "@/lib/lift_data";
import type { LiftFeature, SkiAreaFeature } from "openskidata-format";

// TODO: instead of an API endpoint, this should be a separate script, run by a github action
export async function POST() {
    try {
        // const dataDirectory = join(process.cwd(), "data");
        // const [skiAreasJson, liftsJson] = await Promise.all([
        //     readFile(join(dataDirectory, "ski_areas.geojson"), "utf8"),
        //     readFile(join(dataDirectory, "lifts.geojson"), "utf8"),
        // ]);
        // const skiAreas = JSON.parse(skiAreasJson) as FeatureCollection<SkiAreaFeature>;
        // const lifts = JSON.parse(liftsJson) as FeatureCollection<LiftFeature>;
        const [skiAreas, lifts] = await Promise.all([
            queryOpenSkiData<SkiAreaFeature>("ski_areas"),
            queryOpenSkiData<LiftFeature>("lifts")
        ]);

        const result = buildSkiResortDb(skiAreas, lifts);
        return Response.json({ success: true, nResorts: result });
    } catch (e) {
        return Response.json({ success: false, error: e?.toString() }, { status: 500 });
    }
}
