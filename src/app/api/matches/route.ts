import { NextRequest, NextResponse } from 'next/server';
import { getMatches, saveMatches, Match } from '@/lib/db';

const SESSION_COOKIE_NAME = 'sbs_admin_session';
const SESSION_VALUE = 'sbs_authenticated_session_2026';

function checkAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return cookie?.value === SESSION_VALUE;
}

// GET: returns all matches
export async function GET(req: NextRequest) {
  try {
    const matches = await getMatches();
    // Sort matches: Live first, then Upcoming (nearest first), then Completed (most recent first)
    const sorted = [...matches].sort((a, b) => {
      // Status weights: Live (3), Upcoming (2), Ended (1)
      const weight = { Live: 3, Upcoming: 2, Ended: 1 };
      const statusDiff = weight[b.status] - weight[a.status];
      if (statusDiff !== 0) return statusDiff;

      // If both are same status, sort by time
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();
      
      if (a.status === 'Live') {
        return timeA - timeB; // Oldest live match first
      } else if (a.status === 'Upcoming') {
        return timeA - timeB; // Closest upcoming match first
      } else {
        return timeB - timeA; // Most recent completed match first
      }
    });

    return NextResponse.json(sorted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch matches' }, { status: 500 });
  }
}

// POST: Add or update a match (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const matchData: Match = await req.json();
    if (!matchData.id || !matchData.teamA || !matchData.teamB || !matchData.time || !matchData.status) {
      return NextResponse.json({ error: 'Missing required match parameters' }, { status: 400 });
    }

    const matches = await getMatches();
    const index = matches.findIndex(m => m.id === matchData.id);

    if (index > -1) {
      // Update
      matches[index] = { ...matches[index], ...matchData };
    } else {
      // Add new
      matches.push(matchData);
    }

    await saveMatches(matches);
    return NextResponse.json({ success: true, match: matchData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save match' }, { status: 500 });
  }
}

// DELETE: Delete a match (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing match ID' }, { status: 400 });
    }

    const matches = await getMatches();
    const filtered = matches.filter(m => m.id !== id);

    if (filtered.length === matches.length) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    await saveMatches(filtered);
    return NextResponse.json({ success: true, message: 'Match deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete match' }, { status: 500 });
  }
}
