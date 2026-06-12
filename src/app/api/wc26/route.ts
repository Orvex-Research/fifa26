import { NextResponse } from 'next/server';

const WC_API_BASE = 'https://worldcup26.ir';

// Cache for 60 seconds
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000;

async function fetchWC26(endpoint: string) {
  const res = await fetch(`${WC_API_BASE}${endpoint}`, {
    next: { revalidate: 60 },
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`WC26 API error: ${res.status}`);
  return res.json();
}

// Parse PHP-like array strings: {"A 12'","B 45'"} or “J. Quiñones 9'”,”R. Jiménez 67'”
function parseScorers(raw: string | null): { name: string; minute: string }[] {
  if (!raw || raw === 'null') return [];
  try {
    // Replace smart quotes with standard double quotes
    let cleaned = raw.replace(/[“”„‟]/g, '"');
    // Strip outer braces if present
    cleaned = cleaned.replace(/^\{|\}$/g, '').trim();
    
    // Split by commas, considering quotes, or just comma splitting if simple
    const parts = cleaned.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => {
      return s.replace(/^"|"$/g, '').trim();
    }).filter(Boolean);
    
    return parts.map(p => {
      // Remove any leftover smart quotes or extra double quotes from individual parts
      const cleanPart = p.replace(/[“”"']/g, '').trim();
      // Match name and minute (e.g. "J. Quiñones 9")
      const match = cleanPart.match(/^(.+?)\s+(\d+(?:\+\d+)?)'?\s*$/);
      if (match) return { name: match[1].trim(), minute: match[2] + "'" };
      return { name: cleanPart, minute: '' };
    });
  } catch { return []; }
}

// Transforms worldcup26.ir game to our format
function transformGame(g: any, stadiumMap: Record<string, any>, teamMap: Record<string, any>) {
  let isoDate = '';
  try {
    const [datePart, timePart] = (g.local_date || '').split(' ');
    const [month, day, year] = datePart.split('/');
    isoDate = `${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${timePart}:00`;
  } catch {}

  let status: 'Live' | 'Upcoming' | 'Ended' = 'Upcoming';
  if (g.finished === 'TRUE') {
    status = 'Ended';
  } else if (g.time_elapsed && g.time_elapsed !== 'notstarted' && g.time_elapsed !== 'finished') {
    status = 'Live';
  }

  const stadium = stadiumMap[String(g.stadium_id)];
  const homeTeam = teamMap[String(g.home_team_id)];
  const awayTeam = teamMap[String(g.away_team_id)];

  const scorersA = parseScorers(g.home_scorers);
  const scorersB = parseScorers(g.away_scorers);
  const homeScore = parseInt(g.home_score) || 0;
  const awayScore = parseInt(g.away_score) || 0;

  return {
    id: String(g.id),
    teamA: g.home_team_name_en || 'TBD',
    teamB: g.away_team_name_en || 'TBD',
    teamAFlag: homeTeam?.flag || null,
    teamBFlag: awayTeam?.flag || null,
    teamACode: homeTeam?.fifa_code || '',
    teamBCode: awayTeam?.fifa_code || '',
    scoreA: homeScore,
    scoreB: awayScore,
    scorersA,
    scorersB,
    time: isoDate,
    localDate: g.local_date || '',
    status,
    timeElapsed: g.time_elapsed || 'notstarted',
    group: g.group || '',
    matchday: g.matchday || 1,
    type: g.type || 'group',
    stadiumName: stadium?.name_en || stadium?.fifa_name || `Stadium ${g.stadium_id}`,
    stadiumCity: stadium?.city_en || '',
    stadiumCountry: stadium?.country_en || '',
    stadiumCapacity: stadium?.capacity || 0,
  };
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const [gamesData, stadiumsData, teamsData, groupsData] = await Promise.all([
      fetchWC26('/get/games'),
      fetchWC26('/get/stadiums').catch(() => ({ stadiums: [] })),
      fetchWC26('/get/teams').catch(() => ({ teams: [] })),
      fetchWC26('/get/groups').catch(() => ({ groups: [] })),
    ]);

    // Build lookup maps
    const stadiumMap: Record<string, any> = {};
    for (const s of (stadiumsData.stadiums || [])) stadiumMap[String(s.id)] = s;

    const teamMap: Record<string, any> = {};
    for (const t of (teamsData.teams || [])) teamMap[String(t.id)] = t;

    const games = (gamesData.games || []).map((g: any) => transformGame(g, stadiumMap, teamMap));

    // Sort: Live first → Upcoming soonest → Ended most recent
    const weight: Record<string, number> = { Live: 3, Upcoming: 2, Ended: 1 };
    games.sort((a: any, b: any) => {
      const wDiff = (weight[b.status] || 0) - (weight[a.status] || 0);
      if (wDiff !== 0) return wDiff;
      const tA = new Date(a.time).getTime();
      const tB = new Date(b.time).getTime();
      return a.status === 'Ended' ? tB - tA : tA - tB;
    });

    // Top scorers: aggregate from all games
    const scorerMap: Record<string, { name: string; team: string; goals: number; minutes: string[] }> = {};
    for (const g of games) {
      for (const s of g.scorersA) {
        if (!s.name) continue;
        if (!scorerMap[s.name]) scorerMap[s.name] = { name: s.name, team: g.teamA, goals: 0, minutes: [] };
        scorerMap[s.name].goals++;
        scorerMap[s.name].minutes.push(s.minute);
      }
      for (const s of g.scorersB) {
        if (!s.name) continue;
        if (!scorerMap[s.name]) scorerMap[s.name] = { name: s.name, team: g.teamB, goals: 0, minutes: [] };
        scorerMap[s.name].goals++;
        scorerMap[s.name].minutes.push(s.minute);
      }
    }
    const topScorers = Object.values(scorerMap).sort((a, b) => b.goals - a.goals).slice(0, 20);

    const result = {
      games,
      groups: groupsData.groups || [],
      topScorers,
      lastUpdated: new Date().toISOString(),
    };

    cache = { data: result, timestamp: Date.now() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch WC26 data' }, { status: 500 });
  }
}
