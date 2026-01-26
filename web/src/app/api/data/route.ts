
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchContext } from "@/lib/data";
import { getUserConfig } from "@/lib/user-store";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Get User Configuration
        const config = await getUserConfig(session.user.email);
        if (!config || !config.sheetId) {
            // New user without sheet? Return empty or signal onboarding needed
            // For now, let's return 400 or a specific code
            return new Response('Setup Required', { status: 428 }); // 428 Precondition Required
        }

        const data = await fetchContext(365, config.sheetId);

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        console.error(e);
        return new Response('Internal Server Error', { status: 500 });
    }
}
