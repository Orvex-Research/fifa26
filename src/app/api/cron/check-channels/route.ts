import { NextResponse } from 'next/server';
import { getChannels, saveChannels } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Only allow Vercel cron jobs to run this
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const channels = await getChannels();
    let modified = false;

    // Check each channel asynchronously
    // We do them concurrently with Promise.all to save time
    await Promise.all(
      channels.map(async (channel) => {
        if (!channel.url) return;

        try {
          // Do a fast HEAD request to check if stream is online
          const res = await fetch(channel.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          const isFailing = !res.ok;

          // If it was offline and now it's failing, we keep it offline.
          // If it was offline but now it's OK, we restore it!
          if (isFailing !== !!channel.isOffline) {
            channel.isOffline = isFailing;
            modified = true;
          }
        } catch (err) {
          // Network errors, timeouts, etc -> Mark as offline
          if (!channel.isOffline) {
            channel.isOffline = true;
            modified = true;
          }
        }
      })
    );

    if (modified) {
      await saveChannels(channels);
    }

    return NextResponse.json({ success: true, message: 'Channels auto-checked.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Cron error' }, { status: 500 });
  }
}
