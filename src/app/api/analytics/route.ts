import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics, getChannels } from '@/lib/db';

const SESSION_COOKIE_NAME = 'sbs_admin_session';
const SESSION_VALUE = 'sbs_authenticated_session_2026';

function checkAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return cookie?.value === SESSION_VALUE;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const analytics = await getAnalytics();
    const channels = await getChannels();

    // Determine Top Channel
    let topChannelName = '—';
    let maxViews = -1;

    for (const [channelId, activeCount] of Object.entries(analytics.channelCounts)) {
      if (activeCount > maxViews) {
        maxViews = activeCount;
        const c = channels.find(x => x.id === channelId);
        if (c) topChannelName = c.name;
      }
    }

    // Fallback top channel based on all-time views if no one is live watching
    if (maxViews === -1) {
      let maxAllTime = -1;
      for (const c of channels) {
        if ((c.views || 0) > maxAllTime) {
          maxAllTime = c.views || 0;
          topChannelName = c.name;
        }
      }
    }

    return NextResponse.json({
      totalLive: analytics.totalLive,
      totalViews: analytics.totalViews,
      topChannel: topChannelName
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
