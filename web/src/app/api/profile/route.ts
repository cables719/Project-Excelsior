
import { updateUserProfile } from '@/lib/data';

export async function POST(req: Request) {
    try {
        const profile = await req.json();
        await updateUserProfile(profile);
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Profile Update Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to update profile' }), { status: 500 });
    }
}
