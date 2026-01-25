import { NextResponse } from 'next/server';
import { fetchContext } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await fetchContext();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Data fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
