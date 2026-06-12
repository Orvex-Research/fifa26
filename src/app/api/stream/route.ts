import { NextRequest, NextResponse } from 'next/server';
import { getChannels, incrementChannelViews } from '@/lib/db';
import { encryptStreamUrl } from '@/lib/crypto';

export async function POST(req: NextRequest) {
  try {
    const { channelId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
    }

    const channels = await getChannels();
    const channel = channels.find(c => c.id === channelId);

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Encrypt/obfuscate the stream URL
    const encryptedUrl = encryptStreamUrl(channel.url);

    // Increment views (non-blocking)
    incrementChannelViews(channel.id).catch(() => {});

    return NextResponse.json({
      stream: encryptedUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to resolve stream' }, { status: 500 });
  }
}
