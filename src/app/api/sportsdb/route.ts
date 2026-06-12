import { NextRequest, NextResponse } from 'next/server';

const SPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }

    let url = '';

    if (type === 'player') {
      const p = searchParams.get('p');
      if (!p) return NextResponse.json({ error: 'Missing p (player name) parameter' }, { status: 400 });
      url = `${SPORTSDB_BASE}/searchplayers.php?p=${encodeURIComponent(p)}`;

    } else if (type === 'team') {
      const t = searchParams.get('t');
      if (!t) return NextResponse.json({ error: 'Missing t (team name) parameter' }, { status: 400 });
      url = `${SPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(t)}`;

    } else if (type === 'event') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing id (event/match ID) parameter' }, { status: 400 });
      url = `${SPORTSDB_BASE}/lookupevent.php?id=${encodeURIComponent(id)}`;

    } else if (type === 'squad') {
      // Step 1: resolve team name → team ID
      const t = searchParams.get('t');
      if (!t) return NextResponse.json({ error: 'Missing t (team name) parameter' }, { status: 400 });

      const teamRes = await fetch(`${SPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(t)}`, {
        next: { revalidate: 86400 },
      });
      if (!teamRes.ok) return NextResponse.json({ error: 'Team search failed' }, { status: 500 });
      const teamData = await teamRes.json();

      // Find first national/international team (prefer FIFA World Cup league)
      const teams: any[] = teamData.teams || [];
      const national = teams.find((t: any) =>
        t.strLeague?.toLowerCase().includes('fifa') ||
        t.strLeague?.toLowerCase().includes('world cup') ||
        t.strSport === 'Soccer'
      ) || teams[0];

      if (!national) return NextResponse.json({ team: null, player: [] });

      // Step 2: fetch all players
      const playersRes = await fetch(`${SPORTSDB_BASE}/lookup_all_players.php?id=${national.idTeam}`, {
        next: { revalidate: 3600 }, // 1h cache
      });
      if (!playersRes.ok) return NextResponse.json({ error: 'Players fetch failed' }, { status: 500 });
      const playersData = await playersRes.json();

      let fetchedPlayers = playersData.player || [];

      // MOCK FALLBACK: TheSportsDB API often misses current star players for national teams.
      // We inject them manually so the UI is populated correctly for FIFA 2026.
      if (national.strTeam === 'Argentina') {
        const missing = [
          { idPlayer: 'm1', strPlayer: 'Lionel Messi', strNumber: '10', strPosition: 'Forward', strNationality: 'Argentina', strTeam: 'Inter Miami', strThumb: 'https://www.thesportsdb.com/images/media/player/thumb/wrrwqq1420790795.jpg', strCutout: 'https://www.thesportsdb.com/images/media/player/cutout/0c23o51703080062.png' },
          { idPlayer: 'm2', strPlayer: 'Ángel Di María', strNumber: '11', strPosition: 'Forward', strNationality: 'Argentina', strTeam: 'Benfica', strThumb: 'https://www.thesportsdb.com/images/media/player/thumb/vxvqwq1420790858.jpg', strCutout: 'https://www.thesportsdb.com/images/media/player/cutout/nswdls1694770248.png' },
          { idPlayer: 'm3', strPlayer: 'Julián Álvarez', strNumber: '9', strPosition: 'Forward', strNationality: 'Argentina', strTeam: 'Manchester City', strThumb: 'https://www.thesportsdb.com/images/media/player/thumb/6t1m7n1653066345.jpg', strCutout: 'https://www.thesportsdb.com/images/media/player/cutout/b9o0i11656858169.png' },
          { idPlayer: 'm4', strPlayer: 'Lautaro Martínez', strNumber: '22', strPosition: 'Forward', strNationality: 'Argentina', strTeam: 'Inter Milan', strThumb: 'https://www.thesportsdb.com/images/media/player/thumb/xuywvx1529141010.jpg' },
          { idPlayer: 'm5', strPlayer: 'Rodrigo De Paul', strNumber: '7', strPosition: 'Central Midfield', strNationality: 'Argentina', strTeam: 'Atlético Madrid' },
          { idPlayer: 'm6', strPlayer: 'Lisandro Martínez', strNumber: '25', strPosition: 'Centre-Back', strNationality: 'Argentina', strTeam: 'Manchester United' },
          { idPlayer: 'm7', strPlayer: 'Nicolas Otamendi', strNumber: '19', strPosition: 'Centre-Back', strNationality: 'Argentina', strTeam: 'Benfica' }
        ];
        // Only add if not already in the array
        missing.forEach(mp => {
          if (!fetchedPlayers.some((p: any) => p.strPlayer.includes(mp.strPlayer))) {
            fetchedPlayers.push(mp);
          }
        });
      } else if (national.strTeam === 'France') {
        const missing = [
          { idPlayer: 'm8', strPlayer: 'Kylian Mbappé', strNumber: '10', strPosition: 'Forward', strNationality: 'France', strTeam: 'Real Madrid', strThumb: 'https://www.thesportsdb.com/images/media/player/thumb/q62fnt1602758872.jpg' },
          { idPlayer: 'm9', strPlayer: 'Antoine Griezmann', strNumber: '7', strPosition: 'Forward', strNationality: 'France', strTeam: 'Atlético Madrid' }
        ];
        missing.forEach(mp => {
          if (!fetchedPlayers.some((p: any) => p.strPlayer.includes(mp.strPlayer))) {
            fetchedPlayers.push(mp);
          }
        });
      }

      return NextResponse.json({
        team: {
          id: national.idTeam,
          name: national.strTeam,
          badge: national.strBadge,
          logo: national.strLogo,
          fanart: national.strFanart1,
          color1: national.strColour1,
          color2: national.strColour2,
          country: national.strCountry,
          stadium: national.strStadium,
          formed: national.intFormedYear,
          description: national.strDescriptionEN,
        },
        player: fetchedPlayers.map((p: any) => ({
          id: p.idPlayer,
          name: p.strPlayer,
          lastName: p.strLastName,
          number: p.strNumber,
          position: p.strPosition,
          nationality: p.strNationality,
          birthDate: p.dateBorn,
          birthLocation: p.strBirthLocation,
          height: p.strHeight,
          weight: p.strWeight,
          club: p.strTeam,
          thumb: p.strThumb,
          cutout: p.strCutout,
          render: p.strRender,
          poster: p.strPoster,
          status: p.strStatus,
          side: p.strSide,
          signing: p.strSigning,
          wage: p.strWage,
          instagram: p.strInstagram,
        })),
      });

    } else {
      return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    const res = await fetch(url, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `SportsDB API returned error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
