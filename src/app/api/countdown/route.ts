import { NextResponse } from 'next/server';
import { getSettings, getMatches, getChannels } from '@/lib/db';

export async function GET() {
  try {
    const [settings, matches, channels] = await Promise.all([
      getSettings(),
      getMatches(),
      getChannels(),
    ]);

    let featuredMatch = null;
    let channelName = '';

    if (settings.featuredMatchId) {
      // Admin has explicitly picked a featured match
      featuredMatch = matches.find(m => m.id === settings.featuredMatchId) || null;
    }

    if (!featuredMatch) {
      // Auto-pick: next upcoming match sorted by time
      const upcoming = matches
        .filter(m => m.status === 'Upcoming')
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      featuredMatch = upcoming[0] || null;

      // If nothing upcoming, show next live
      if (!featuredMatch) {
        featuredMatch = matches.find(m => m.status === 'Live') || null;
      }
    }

    if (featuredMatch) {
      const ch = channels.find(c => c.id === featuredMatch!.channelId);
      channelName = ch?.name || settings.featuredChannelName || 'FIFA+ English';
    }

    return NextResponse.json({
      match: featuredMatch,
      channelName,
      branding: settings.creditText || 'Orvex Research',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
