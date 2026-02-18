
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { appendWeighIn, appendLift, appendCardio, appendNutrition, appendEaglesPeakLog } from "@/lib/data";
import { getUserConfig } from "@/lib/user-store";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return new Response('Unauthorized', { status: 401 });
        }

        const config = await getUserConfig(session.user.email);
        if (!config || !config.sheetId) {
            return new Response('Setup Required', { status: 428 });
        }

        const body = await req.json();
        const { type, data } = body;

        if (type === 'weigh-in') await appendWeighIn(data, config.sheetId);
        if (type === 'lift') await appendLift(data, config.sheetId);
        if (type === 'cardio') await appendCardio(data, config.sheetId);
        if (type === 'nutrition') await appendNutrition(data, config.sheetId);
        if (type === 'eagles-peak') await appendEaglesPeakLog(data, config.sheetId);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error(e);
        return new Response('Error logging data', { status: 500 });
    }
}
