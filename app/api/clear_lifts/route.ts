import { deleteLiftsForResort } from "@/lib/db";

export async function DELETE(request: Request) {
    let body;
    try {
        body = await request.json() as { id?: number | string };
    } catch (e) {
        void(e);
        return Response.json({ success: false, msg: "malformed input" }, { status: 400 });
    }
    const resortId = Number(body.id);
    if (!Number.isFinite(resortId)) {
        return Response.json({ success: false, msg: "missing or invalid id" }, { status: 400 });
    }
    let nRows;
    try {
        nRows = deleteLiftsForResort(resortId);
    } catch (e) {
        console.error(e);
        return Response.json({ success: false, msg: "internal server error "}, { status: 500 });
    }
    return Response.json({ success: true, nRows });
} 