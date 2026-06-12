'use client';

import { useEffect, useState, useRef } from 'react';

// Format a date in a given timezone
function formatInTZ(date: Date, tz: string): string {
  try {
    return date.toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });
  } catch {
    return date.toUTCString();
  }
}

// Pad single digits
const pad = (n: number) => String(n).padStart(2, '0');

interface GeoInfo {
  country: string;
  countryCode: string;
  timezone: string;
  city: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calcTimeLeft(targetTime: number): TimeLeft {
  const now = Date.now();
  const total = targetTime - now;
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total };
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, total };
}

interface GameCountdownProps {
  onPlayLive?: (channelName?: string) => void;
}

export default function GameCountdown({ onPlayLive }: GameCountdownProps = {}) {
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [targetTime, setTargetTime] = useState<number>(Date.now() + 86400000); // Default 1 day
  const [matchData, setMatchData] = useState<any>(null);
  const [branding, setBranding] = useState('Orvex Research');
  const [channelName, setChannelName] = useState('FIFA+ English');
  
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 1 });
  const [loading, setLoading] = useState(true);
  const [prevTime, setPrevTime] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 1 });
  const [flipping, setFlipping] = useState({ days: false, hours: false, minutes: false, seconds: false });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch match settings and geo data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [geoRes, matchRes] = await Promise.all([
          fetch('/api/geo').catch(() => null),
          fetch('/api/countdown').catch(() => null)
        ]);

        if (geoRes && geoRes.ok) {
          const geoData = await geoRes.json();
          setGeo(geoData);
        } else {
          // Browser fallback if edge API fails
          setGeo({
            country: 'Unknown',
            countryCode: 'XX',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            city: ''
          });
        }

        if (matchRes && matchRes.ok) {
          const matchData = await matchRes.json();
          if (matchData.match) {
            setMatchData(matchData.match);
            const targetMs = new Date(matchData.match.time).getTime();
            setTargetTime(targetMs);
            setTimeLeft(calcTimeLeft(targetMs));
            setPrevTime(calcTimeLeft(targetMs));
          }
          if (matchData.branding) setBranding(matchData.branding);
          if (matchData.channelName) setChannelName(matchData.channelName);
        }
      } catch (e) {
        console.error('Countdown fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Countdown tick
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const next = calcTimeLeft(targetTime);
      setPrevTime(t => {
        setFlipping({
          days: t.days !== next.days,
          hours: t.hours !== next.hours,
          minutes: t.minutes !== next.minutes,
          seconds: t.seconds !== next.seconds,
        });
        return next;
      });
      setTimeLeft(next);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [targetTime]);

  // Clear flip flags after animation
  useEffect(() => {
    if (Object.values(flipping).some(Boolean)) {
      const t = setTimeout(() => setFlipping({ days: false, hours: false, minutes: false, seconds: false }), 400);
      return () => clearTimeout(t);
    }
  }, [flipping]);

  const isStarted = timeLeft.total <= 0 && !loading;
  
  if (isStarted) {
    return null; // The user requested to completely delete the box when the match is live.
  }

  const targetDateObj = new Date(targetTime);
  const localTimeStr = geo ? formatInTZ(targetDateObj, geo.timezone) : formatInTZ(targetDateObj, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const matchTitle = matchData ? `${matchData.teamA} vs ${matchData.teamB}` : 'Loading Match...';
  const matchStage = matchData?.stage ? ` — ${matchData.stage}` : '';

  // Country code → flag emoji helper (moved here to avoid reference issues)
  const flagEmoji = (cc: string) => {
    if (!cc || cc === 'XX') return '🌍';
    return [...cc.toUpperCase()].map(c => String.fromCodePoint(0x1F1E0 - 65 + c.charCodeAt(0))).join('');
  };

  return (
    <div className="game-countdown-wrapper animate-slide-up">
      {/* Branding Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#38bdf8', fontWeight: 600 }}>
          {branding}
        </span>
      </div>

      {/* Header Badge */}
      <div className="countdown-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="countdown-live-dot" />
          <span className="countdown-label" style={{ fontSize: '18px' }}>⚽ {matchTitle}{matchStage}</span>
        </div>
      </div>

      {/* Geo Info Strip */}
      <div className="countdown-geo-strip">
        {loading ? (
          <span className="countdown-geo-loading">
            <span className="geo-spinner" />
            Detecting your location…
          </span>
        ) : geo && geo.country !== 'Unknown' ? (
          <span className="countdown-geo-info">
            <span className="geo-flag">{flagEmoji(geo.countryCode)}</span>
            <span className="geo-country">{geo.city ? `${geo.city}, ` : ''}{geo.country}</span>
            <span className="geo-divider">·</span>
            <span className="geo-localtime">🕘 Your local time: <strong>{localTimeStr}</strong></span>
          </span>
        ) : null}
      </div>

      {/* Countdown Boxes */}
      <div className="countdown-grid">
        {[
          { label: 'DAYS', value: timeLeft.days, flip: flipping.days },
          { label: 'HRS', value: timeLeft.hours, flip: flipping.hours },
          { label: 'MIN', value: timeLeft.minutes, flip: flipping.minutes },
          { label: 'SEC', value: timeLeft.seconds, flip: flipping.seconds },
        ].map(({ label, value, flip }) => (
          <div key={label} className="countdown-unit">
            <div className={`countdown-box ${flip ? 'flip-anim' : ''}`}>
              <span className="countdown-number">{pad(value)}</span>
            </div>
            <span className="countdown-unit-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Sub-label */}
      {!loading && (
        <div className="countdown-sublabel">
          Countdown to kick-off · {new Date(targetTime).toLocaleString()}
        </div>
      )}
    </div>
  );
}
