import { NextRequest, NextResponse } from 'next/server';
import { getMatches, saveMatches, getChannels, Match } from '@/lib/db';

const SESSION_COOKIE_NAME = 'sbs_admin_session';
const SESSION_VALUE = 'sbs_authenticated_session_2026';

function checkAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return cookie?.value === SESSION_VALUE;
}

export async function POST(req: NextRequest) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channels = await getChannels();
    const defaultChannelId = channels[0]?.id || 'ch_1';

    // Try fetching from TheSportsDB (Free Tier using demo key '3')
    // League ID: 4480 is World Cup Qualifiers. Let's try next events.
    let externalMatches: any[] = [];
    try {
      const response = await fetch('https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4480');
      if (response.ok) {
        const data = await response.json();
        if (data && data.events) {
          externalMatches = data.events;
        }
      }
    } catch (err) {
      console.warn('TheSportsDB fetch failed, using fallback generator:', err);
    }

    const matches = await getMatches();
    let newMatchesAdded = 0;

    if (externalMatches && externalMatches.length > 0) {
      // Map external events to our Match structure
      for (const event of externalMatches) {
        const eventId = `external_${event.idEvent}`;
        if (matches.some(m => m.id === eventId)) continue;

        // Construct Date
        const dateStr = event.dateEvent || event.strDate;
        const timeStr = event.strTime || '18:00:00';
        const matchTime = new Date(`${dateStr}T${timeStr}`).toISOString();

        const newMatch: Match = {
          id: eventId,
          teamA: event.strHomeTeam,
          teamB: event.strAwayTeam,
          time: matchTime,
          status: 'Upcoming',
          stage: event.strLeague || 'FIFA World Cup',
          channelId: defaultChannelId,
        };
        matches.push(newMatch);
        newMatchesAdded++;
      }
    }

    // Fallback generator: If no matches synced, populate real FIFA World Cup 2026 fixtures
    if (newMatchesAdded === 0) {
      const fallbackFixtures = [
        { teamA: 'United States', teamB: 'Paraguay', stage: 'Group D · MD1 - Los Angeles', dateStr: '2026-06-12T15:00:00.000Z', isLive: false },
        { teamA: 'Qatar', teamB: 'Switzerland', stage: 'Group B · MD1 - San Francisco Bay Area', dateStr: '2026-06-12T18:00:00.000Z', isLive: false },
        { teamA: 'Brazil', teamB: 'Morocco', stage: 'Group C · MD1 - New York/New Jersey', dateStr: '2026-06-13T12:00:00.000Z', isLive: false },
        { teamA: 'Haiti', teamB: 'Scotland', stage: 'Group C · MD1 - Boston', dateStr: '2026-06-13T18:00:00.000Z', isLive: false },
        { teamA: 'Australia', teamB: 'Turkey', stage: 'Group D · MD1 - Vancouver', dateStr: '2026-06-13T21:00:00.000Z', isLive: false },
        { teamA: 'Germany', teamB: 'Curaao', stage: 'Group E · MD1 - Houston', dateStr: '2026-06-13T21:00:00.000Z', isLive: false },
        { teamA: 'Netherlands', teamB: 'Japan', stage: 'Group F · MD1 - Dallas', dateStr: '2026-06-14T12:00:00.000Z', isLive: false },
        { teamA: 'Ivory Coast', teamB: 'Ecuador', stage: 'Group E · MD1 - Philadelphia', dateStr: '2026-06-14T15:00:00.000Z', isLive: false },
        { teamA: 'Sweden', teamB: 'Tunisia', stage: 'Group F · MD1 - Monterrey', dateStr: '2026-06-14T19:00:00.000Z', isLive: false },
        { teamA: 'Spain', teamB: 'Cape Verde', stage: 'Group H · MD1 - Atlanta', dateStr: '2026-06-14T20:00:00.000Z', isLive: false },
        { teamA: 'Belgium', teamB: 'Egypt', stage: 'Group G · MD1 - Seattle', dateStr: '2026-06-15T12:00:00.000Z', isLive: false },
        { teamA: 'Iran', teamB: 'New Zealand', stage: 'Group G · MD1 - Los Angeles', dateStr: '2026-06-15T12:00:00.000Z', isLive: false },
        { teamA: 'Saudi Arabia', teamB: 'Uruguay', stage: 'Group H · MD1 - Miami', dateStr: '2026-06-15T18:00:00.000Z', isLive: false },
        { teamA: 'France', teamB: 'Senegal', stage: 'Group I · MD1 - New York/New Jersey', dateStr: '2026-06-15T18:00:00.000Z', isLive: false },
        { teamA: 'Iraq', teamB: 'Norway', stage: 'Group I · MD1 - Boston', dateStr: '2026-06-16T15:00:00.000Z', isLive: false },
        { teamA: 'Argentina', teamB: 'Algeria', stage: 'Group J · MD1 - Kansas City', dateStr: '2026-06-16T18:00:00.000Z', isLive: false },
        { teamA: 'Austria', teamB: 'Jordan', stage: 'Group J · MD1 - San Francisco Bay Area', dateStr: '2026-06-16T20:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'Group K · MD1 - Houston', dateStr: '2026-06-16T21:00:00.000Z', isLive: false },
        { teamA: 'England', teamB: 'Croatia', stage: 'Group L · MD1 - Dallas', dateStr: '2026-06-17T12:00:00.000Z', isLive: false },
        { teamA: 'Ghana', teamB: 'Panama', stage: 'Group L · MD1 - Toronto', dateStr: '2026-06-17T15:00:00.000Z', isLive: false },
        { teamA: 'Uzbekistan', teamB: 'Colombia', stage: 'Group K · MD1 - Mexico City', dateStr: '2026-06-17T19:00:00.000Z', isLive: false },
        { teamA: 'Switzerland', teamB: 'Bosnia and Herzegovina', stage: 'Group B · MD2 - Los Angeles', dateStr: '2026-06-17T20:00:00.000Z', isLive: false },
        { teamA: 'Czech Republic', teamB: 'South Africa', stage: 'Group A · MD2 - Atlanta', dateStr: '2026-06-18T12:00:00.000Z', isLive: false },
        { teamA: 'Canada', teamB: 'Qatar', stage: 'Group B · MD2 - Vancouver', dateStr: '2026-06-18T12:00:00.000Z', isLive: false },
        { teamA: 'Mexico', teamB: 'South Korea', stage: 'Group A · MD2 - Guadalajara', dateStr: '2026-06-18T15:00:00.000Z', isLive: false },
        { teamA: 'United States', teamB: 'Australia', stage: 'Group D · MD2 - Seattle', dateStr: '2026-06-18T19:00:00.000Z', isLive: false },
        { teamA: 'Scotland', teamB: 'Morocco', stage: 'Group C · MD2 - Boston', dateStr: '2026-06-19T12:00:00.000Z', isLive: false },
        { teamA: 'Turkey', teamB: 'Paraguay', stage: 'Group D · MD2 - San Francisco Bay Area', dateStr: '2026-06-19T18:00:00.000Z', isLive: false },
        { teamA: 'Brazil', teamB: 'Haiti', stage: 'Group C · MD2 - Philadelphia', dateStr: '2026-06-19T20:00:00.000Z', isLive: false },
        { teamA: 'Netherlands', teamB: 'Sweden', stage: 'Group F · MD2 - Houston', dateStr: '2026-06-19T21:00:00.000Z', isLive: false },
        { teamA: 'Germany', teamB: 'Ivory Coast', stage: 'Group E · MD2 - Toronto', dateStr: '2026-06-20T12:00:00.000Z', isLive: false },
        { teamA: 'Ecuador', teamB: 'Curaao', stage: 'Group E · MD2 - Kansas City', dateStr: '2026-06-20T16:00:00.000Z', isLive: false },
        { teamA: 'Tunisia', teamB: 'Japan', stage: 'Group F · MD2 - Monterrey', dateStr: '2026-06-20T19:00:00.000Z', isLive: false },
        { teamA: 'Belgium', teamB: 'Iran', stage: 'Group G · MD2 - Los Angeles', dateStr: '2026-06-20T22:00:00.000Z', isLive: false },
        { teamA: 'Spain', teamB: 'Saudi Arabia', stage: 'Group H · MD2 - Atlanta', dateStr: '2026-06-21T12:00:00.000Z', isLive: false },
        { teamA: 'New Zealand', teamB: 'Egypt', stage: 'Group G · MD2 - Vancouver', dateStr: '2026-06-21T12:00:00.000Z', isLive: false },
        { teamA: 'Uruguay', teamB: 'Cape Verde', stage: 'Group H · MD2 - Miami', dateStr: '2026-06-21T18:00:00.000Z', isLive: false },
        { teamA: 'Argentina', teamB: 'Austria', stage: 'Group J · MD2 - Dallas', dateStr: '2026-06-21T18:00:00.000Z', isLive: false },
        { teamA: 'France', teamB: 'Iraq', stage: 'Group I · MD2 - Philadelphia', dateStr: '2026-06-22T12:00:00.000Z', isLive: false },
        { teamA: 'Norway', teamB: 'Senegal', stage: 'Group I · MD2 - New York/New Jersey', dateStr: '2026-06-22T17:00:00.000Z', isLive: false },
        { teamA: 'Jordan', teamB: 'Algeria', stage: 'Group J · MD2 - San Francisco Bay Area', dateStr: '2026-06-22T20:00:00.000Z', isLive: false },
        { teamA: 'Portugal', teamB: 'Uzbekistan', stage: 'Group K · MD2 - Houston', dateStr: '2026-06-22T20:00:00.000Z', isLive: false },
        { teamA: 'England', teamB: 'Ghana', stage: 'Group L · MD2 - Boston', dateStr: '2026-06-23T12:00:00.000Z', isLive: false },
        { teamA: 'Panama', teamB: 'Croatia', stage: 'Group L · MD2 - Toronto', dateStr: '2026-06-23T16:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'Group K · MD2 - Guadalajara', dateStr: '2026-06-23T19:00:00.000Z', isLive: false },
        { teamA: 'Bosnia and Herzegovina', teamB: 'Qatar', stage: 'Group B · MD3 - Seattle', dateStr: '2026-06-23T20:00:00.000Z', isLive: false },
        { teamA: 'Switzerland', teamB: 'Canada', stage: 'Group B · MD3 - Vancouver', dateStr: '2026-06-24T12:00:00.000Z', isLive: false },
        { teamA: 'Scotland', teamB: 'Brazil', stage: 'Group C · MD3 - Miami', dateStr: '2026-06-24T12:00:00.000Z', isLive: false },
        { teamA: 'Morocco', teamB: 'Haiti', stage: 'Group C · MD3 - Atlanta', dateStr: '2026-06-24T18:00:00.000Z', isLive: false },
        { teamA: 'South Africa', teamB: 'South Korea', stage: 'Group A · MD3 - Monterrey', dateStr: '2026-06-24T18:00:00.000Z', isLive: false },
        { teamA: 'Czech Republic', teamB: 'Mexico', stage: 'Group A · MD3 - Mexico City', dateStr: '2026-06-24T19:00:00.000Z', isLive: false },
        { teamA: 'Curaao', teamB: 'Ivory Coast', stage: 'Group E · MD3 - Philadelphia', dateStr: '2026-06-24T19:00:00.000Z', isLive: false },
        { teamA: 'Ecuador', teamB: 'Germany', stage: 'Group E · MD3 - New York/New Jersey', dateStr: '2026-06-25T16:00:00.000Z', isLive: false },
        { teamA: 'Japan', teamB: 'Sweden', stage: 'Group F · MD3 - Dallas', dateStr: '2026-06-25T16:00:00.000Z', isLive: false },
        { teamA: 'Tunisia', teamB: 'Netherlands', stage: 'Group F · MD3 - Kansas City', dateStr: '2026-06-25T18:00:00.000Z', isLive: false },
        { teamA: 'Paraguay', teamB: 'Australia', stage: 'Group D · MD3 - San Francisco Bay Area', dateStr: '2026-06-25T18:00:00.000Z', isLive: false },
        { teamA: 'Turkey', teamB: 'United States', stage: 'Group D · MD3 - Los Angeles', dateStr: '2026-06-25T19:00:00.000Z', isLive: false },
        { teamA: 'Senegal', teamB: 'Iraq', stage: 'Group I · MD3 - Toronto', dateStr: '2026-06-25T19:00:00.000Z', isLive: false },
        { teamA: 'Norway', teamB: 'France', stage: 'Group I · MD3 - Boston', dateStr: '2026-06-26T15:00:00.000Z', isLive: false },
        { teamA: 'Uruguay', teamB: 'Spain', stage: 'Group H · MD3 - Guadalajara', dateStr: '2026-06-26T15:00:00.000Z', isLive: false },
        { teamA: 'Cape Verde', teamB: 'Saudi Arabia', stage: 'Group H · MD3 - Houston', dateStr: '2026-06-26T18:00:00.000Z', isLive: false },
        { teamA: 'Egypt', teamB: 'Iran', stage: 'Group G · MD3 - Seattle', dateStr: '2026-06-26T19:00:00.000Z', isLive: false },
        { teamA: 'New Zealand', teamB: 'Belgium', stage: 'Group G · MD3 - Vancouver', dateStr: '2026-06-26T20:00:00.000Z', isLive: false },
        { teamA: 'Panama', teamB: 'England', stage: 'Group L · MD3 - New York/New Jersey', dateStr: '2026-06-26T20:00:00.000Z', isLive: false },
        { teamA: 'Croatia', teamB: 'Ghana', stage: 'Group L · MD3 - Philadelphia', dateStr: '2026-06-27T17:00:00.000Z', isLive: false },
        { teamA: 'Colombia', teamB: 'Portugal', stage: 'Group K · MD3 - Miami', dateStr: '2026-06-27T17:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'Group K · MD3 - Atlanta', dateStr: '2026-06-27T19:30:00.000Z', isLive: false },
        { teamA: 'Algeria', teamB: 'Austria', stage: 'Group J · MD3 - Kansas City', dateStr: '2026-06-27T19:30:00.000Z', isLive: false },
        { teamA: 'Jordan', teamB: 'Argentina', stage: 'Group J · MD3 - Dallas', dateStr: '2026-06-27T21:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Los Angeles', dateStr: '2026-06-27T21:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Houston', dateStr: '2026-06-28T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Boston', dateStr: '2026-06-29T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Monterrey', dateStr: '2026-06-29T16:30:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Dallas', dateStr: '2026-06-29T19:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - New York/New Jersey', dateStr: '2026-06-30T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Mexico City', dateStr: '2026-06-30T17:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Atlanta', dateStr: '2026-06-30T19:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Seattle', dateStr: '2026-07-01T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - San Francisco Bay Area', dateStr: '2026-07-01T13:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Los Angeles', dateStr: '2026-07-01T17:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Toronto', dateStr: '2026-07-02T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Vancouver', dateStr: '2026-07-02T19:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Dallas', dateStr: '2026-07-02T20:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Miami', dateStr: '2026-07-03T13:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R32 · MD4 - Kansas City', dateStr: '2026-07-03T18:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - Houston', dateStr: '2026-07-03T20:30:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - Philadelphia', dateStr: '2026-07-04T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - New York/New Jersey', dateStr: '2026-07-04T17:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - Mexico City', dateStr: '2026-07-05T16:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - Dallas', dateStr: '2026-07-05T18:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - Seattle', dateStr: '2026-07-06T14:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - Atlanta', dateStr: '2026-07-06T17:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'R16 · MD5 - Vancouver', dateStr: '2026-07-07T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'QF · MD6 - Boston', dateStr: '2026-07-07T13:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'QF · MD6 - Los Angeles', dateStr: '2026-07-09T16:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'QF · MD6 - Miami', dateStr: '2026-07-10T12:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'QF · MD6 - Kansas City', dateStr: '2026-07-11T17:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'SF · MD7 - Dallas', dateStr: '2026-07-11T20:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'SF · MD7 - Atlanta', dateStr: '2026-07-14T14:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: '3RD · MD8 - Miami', dateStr: '2026-07-15T15:00:00.000Z', isLive: false },
        { teamA: 'TBD', teamB: 'TBD', stage: 'FINAL · MD9 - New York/New Jersey', dateStr: '2026-07-18T17:00:00.000Z', isLive: false },
      ];

      for (const fixture of fallbackFixtures) {
        const matchId = `real_wc_${fixture.teamA.toLowerCase().replace(/\s+/g, '_')}_${fixture.teamB.toLowerCase().replace(/\s+/g, '_')}_2026_${Math.random().toString(36).substr(2, 5)}`;
        if (matches.some(m => m.id === matchId)) continue;

        const newMatch: Match = {
          id: matchId,
          teamA: fixture.teamA,
          teamB: fixture.teamB,
          time: fixture.dateStr,
          status: fixture.isLive ? 'Live' : 'Upcoming',
          stage: fixture.stage,
          channelId: defaultChannelId,
        };
        matches.push(newMatch);
        newMatchesAdded++;
      }
    }

    await saveMatches(matches);
    return NextResponse.json({ success: true, added: newMatchesAdded });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to sync matches' }, { status: 500 });
  }
}
