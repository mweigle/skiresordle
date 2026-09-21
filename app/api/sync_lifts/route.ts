import { fetchResortNames } from "@/lib/lift_data";

export async function POST() {
    try {
        const nResorts = await fetchResortNames();
        return Response.json({ success: true, nResorts });
    } catch (e) {
        return Response.json({ success: false, error: e.toString() }, { status: 500 });
    }
}
