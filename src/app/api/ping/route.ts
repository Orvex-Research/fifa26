import { NextRequest, NextResponse } from 'next/server';
import { pingSession } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { channelId, sessionId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
    }

    // Use native crypto — no external packages needed
    const sid: string = sessionId || crypto.randomUUID();

    // Register active viewer session
    await pingSession(sid, channelId);

    return NextResponse.json({ success: true, sessionId: sid });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to ping' }, { status: 500 });
  }
}
