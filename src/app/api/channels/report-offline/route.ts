import { NextRequest, NextResponse } from 'next/server';
import { getChannels, saveChannels } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { channelId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
    }

    const channels = await getChannels();
    const index = channels.findIndex(c => c.id === channelId);

    if (index > -1) {
      // Mark as offline permanently
      channels[index].isOffline = true;
      await saveChannels(channels);
      return NextResponse.json({ success: true, message: 'Channel marked as offline permanently' });
    } else {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to report channel offline' }, { status: 500 });
  }
}
