import { NextResponse } from 'next/server';
import { appendWeighIn, appendLift, appendCardio, appendNutrition } from '@/lib/data';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, data } = body;

        if (!type || !data) {
            return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
        }

        if (type === 'weigh-in') {
            await appendWeighIn(data);
        } else if (type === 'lift') {
            await appendLift(data);
        } else if (type === 'cardio') {
            await appendCardio(data);
        } else if (type === 'nutrition') {
            await appendNutrition(data);
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Log error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to log data';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
