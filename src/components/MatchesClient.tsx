'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Trophy, RefreshCw, MapPin, Users, Star, ChevronDown, ChevronUp, X, Lock, Eye, EyeOff, Calendar, Radio, Clock, CheckCircle, Award } from 'lucide-react';
import type { Channel } from '@/lib/db';

function formatLocalTime(isoTime: string, fallback: string) {
  try {
    const d = new Date(isoTime.endsWith('Z') ? isoTime : isoTime + 'Z');
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    }).format(d);
  } catch {
    return fallback;
  }
}

const playerPhotoCache: Record<string, string> = {};
const teamLogoCache: Record<string, string> = {};

const KNOWN_NAMES: Record<string, string> = {
  'I.B. Hwang': 'Hwang In-beom',
  'H.G. Oh': 'Oh Hyeon-gyu',
  'L. Krejčí': 'Ladislav Krejci',
  'J. Quiñones': 'Julian Quinones',
  'R. Jiménez': 'Raul Jimenez'
};

/* ── Player Avatar with photo fallback from SportsDB ── */
function PlayerAvatar({ name, team, size = 40 }: { name: string; team?: string; size?: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(playerPhotoCache[name] || null);

  useEffect(() => {
    if (!name || playerPhotoCache[name]) return;
    let isMounted = true;
    const lookup = async () => {
      try {
        const rawName = KNOWN_NAMES[name] || name;
        const cleanedName = rawName.replace(/\d+'/g, '').trim();
        let photo: string | null = null;

        // 1. Try direct lookup first
        const res = await fetch(`/api/sportsdb?type=player&p=${encodeURIComponent(cleanedName)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.player && data.player.length > 0) {
            photo = data.player[0].strCutout || data.player[0].strThumb;
          }
        }

        // 2. If no photo and we have a team name, try finding them in the team squad
        if (!photo && team && isMounted) {
          const squadRes = await fetch(`/api/sportsdb?type=squad&t=${encodeURIComponent(team)}`);
          if (squadRes.ok) {
            const squadData = await squadRes.json();
            if (squadData.player && squadData.player.length > 0) {
              // Try matching the last word of the cleaned name (e.g., "Oh" from "H.G. Oh")
              const nameParts = cleanedName.split(/[\s.]+/).filter(Boolean);
              const lastNameToken = nameParts[nameParts.length - 1].toLowerCase();

              const matchedPlayer = squadData.player.find((p: any) => {
                const pName = (p.name || '').toLowerCase();
                const pLastName = (p.lastName || '').toLowerCase();
                return pName.includes(lastNameToken) || pLastName.includes(lastNameToken);
              });

              if (matchedPlayer) {
                photo = matchedPlayer.cutout || matchedPlayer.thumb || matchedPlayer.render;
              }
            }
          }
        }

        if (photo && isMounted) {
          playerPhotoCache[name] = photo;
          setImgUrl(photo);
        }
      } catch (err) {
        console.error(err);
      }
    };
    lookup();
    return () => { isMounted = false; };
  }, [name]);

  const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
  const color = colors[(name || '').charCodeAt(0) % colors.length];
  const initials = (name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().substring(0, 2);
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size * 2}&background=${color.replace('#', '')}&color=fff&bold=true&rounded=true&length=2`;

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      border: `2px solid ${color}55`, boxShadow: `0 4px 14px ${color}44`, background: `${color}22`
    }}>
      <img src={imgUrl || fallbackUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}

/* ── Team Logo component with SportsDB lookup ── */
function TeamLogo({ name, initialFlagUrl, size = 54 }: { name: string; initialFlagUrl: string | null; size?: number }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(teamLogoCache[name] || initialFlagUrl);

  useEffect(() => {
    if (!name || teamLogoCache[name]) return;
    let isMounted = true;
    const lookup = async () => {
      try {
        const res = await fetch(`/api/sportsdb?type=team&t=${encodeURIComponent(name)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.teams && data.teams.length > 0) {
            const team = data.teams[0];
            const logo = team.strBadge || team.strLogo;
            if (logo) {
              teamLogoCache[name] = logo;
              setLogoUrl(logo);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    lookup();
    return () => { isMounted = false; };
  }, [name]);

  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0, background: 'rgba(255,255,255,0.05)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {logoUrl ? (
        <img src={logoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#94a3b8' }}>
          {(name || '??').substring(0, 3).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ── Premium Match Detail Modal ── */
function MatchDetailModal({ game, onClose }: { game: any; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'stadium'>('overview');

  const hasEvents = game.scorersA?.length > 0 || game.scorersB?.length > 0;

  return (
    <div className="modal-backdrop-animate" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', overflowY: 'auto'
    }} onClick={onClose}>

      <div className="modal-content-animate" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '640px', borderRadius: '24px', overflow: 'hidden',
        background: 'linear-gradient(160deg, #090d16 0%, #111827 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 30px 70px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>
        {/* Header Banner */}
        <div style={{
          position: 'relative', padding: '24px 20px',
          background: 'linear-gradient(180deg, rgba(30,27,75,0.4) 0%, rgba(9,13,22,0.9) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          {/* Close Button */}
          <button onClick={onClose} style={{
            position: 'absolute', right: 16, top: 16,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s', zIndex: 10
          }}>
            <X style={{ width: 18, height: 18 }} />
          </button>

          {/* Group and Match Info */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{
              fontSize: 10, fontWeight: 900, color: '#f59e0b',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px'
            }}>
              {game.type === 'group' ? `Group ${game.group}` : game.type.toUpperCase()} · MD{game.matchday}
            </span>
          </div>

          {/* Scoreboard */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, margin: '20px 0 10px' }}>
            {/* Team A */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TeamLogo name={game.teamA} initialFlagUrl={game.teamAFlag} size={70} />
              <p style={{ fontSize: 15, fontWeight: 900, color: '#f8fafc', textAlign: 'center' }}>{game.teamA}</p>
              {game.teamACode && <span style={{ fontSize: 10, color: '#475569', fontWeight: 800 }}>{game.teamACode}</span>}
            </div>

            {/* Score */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {game.status === 'Ended' || game.status === 'Live' ? (
                <div style={{
                  fontSize: 38, fontWeight: 950, fontFamily: 'monospace',
                  background: 'linear-gradient(180deg, #fff 0%, #cbd5e1 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  letterSpacing: '2px'
                }}>
                  {game.scoreA}–{game.scoreB}
                </div>
              ) : (
                <div style={{ fontSize: 18, fontWeight: 900, color: '#475569', letterSpacing: 4 }}>VS</div>
              )}
              <div style={{
                fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                background: game.status === 'Live' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                color: game.status === 'Live' ? '#ef4444' : '#64748b',
                border: game.status === 'Live' ? '1px solid rgba(239,68,68,0.25)' : 'none',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                {game.status === 'Live' ? '🔴 Live' : game.status === 'Ended' ? 'Full Time' : 'Upcoming'}
              </div>
            </div>

            {/* Team B */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TeamLogo name={game.teamB} initialFlagUrl={game.teamBFlag} size={70} />
              <p style={{ fontSize: 15, fontWeight: 900, color: '#f8fafc', textAlign: 'center' }}>{game.teamB}</p>
              {game.teamBCode && <span style={{ fontSize: 10, color: '#475569', fontWeight: 800 }}>{game.teamBCode}</span>}
            </div>
          </div>
        </div>

        {/* Tabs navigation */}
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.1)', padding: '0 12px'
        }}>
          {[
            { id: 'overview', label: '⚽ Goals & Timeline' },
            { id: 'stats', label: '📊 Match Stats' },
            { id: 'stadium', label: '🏟️ Stadium & Info' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
              flex: 1, padding: '14px 10px', fontSize: 12, fontWeight: 700,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? '#3b82f6' : '#64748b',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content - scrollable */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {activeTab === 'overview' && (
            <>
              {hasEvents ? (
                <GoalEvents scorersA={game.scorersA} scorersB={game.scorersB} teamA={game.teamA} teamB={game.teamB} scoreA={game.scoreA} scoreB={game.scoreB} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
                  <span style={{ fontSize: 32 }}>🥅</span>
                  <p style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>No goal events logged for this match.</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'stats' && (
            <div style={{ padding: '4px' }}>
              <MatchStats scoreA={game.scoreA} scoreB={game.scoreB} scorersA={game.scorersA} scorersB={game.scorersB} teamA={game.teamA} teamB={game.teamB} />
            </div>
          )}

          {activeTab === 'stadium' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '16px', display: 'flex', gap: 14, alignItems: 'center'
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '12px', background: 'rgba(59,130,246,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                }}>🏟️</div>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 900, color: '#f8fafc', margin: 0 }}>{game.stadiumName}</h4>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>{game.stadiumCity}{game.stadiumCountry ? `, ${game.stadiumCountry}` : ''}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px 16px' }}>
                  <p style={{ fontSize: 9, color: '#475569', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>👥 Capacity</p>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#f1f5f9', margin: '4px 0 0', fontFamily: 'monospace' }}>
                    {game.stadiumCapacity ? game.stadiumCapacity.toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '12px 16px' }}>
                  <p style={{ fontSize: 9, color: '#475569', fontWeight: 800, textTransform: 'uppercase', margin: 0 }}>🗓️ Match Date & Time</p>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9', margin: '4px 0 0' }}>
                    {formatLocalTime(game.time, game.localDate)}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 20px', background: 'rgba(0,0,0,0.2)',
          borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>FIFA World Cup 2026 Match Info</span>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9', fontSize: 11, fontWeight: 700,
            cursor: 'pointer'
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Match Performance Graph ── */
function MatchStats({ scoreA, scoreB, scorersA, scorersB, teamA, teamB }: any) {
  const goalsA = scoreA || 0;
  const goalsB = scoreB || 0;
  const total = goalsA + goalsB;

  // Derived stats
  const possA = total > 0 ? Math.round(50 + (goalsA - goalsB) * 5) : 50;
  const possB = 100 - possA;
  const shotsA = 7 + goalsA * 3;
  const shotsB = 7 + goalsB * 3;
  const onTargetA = goalsA + Math.max(1, Math.floor(shotsA * 0.35));
  const onTargetB = goalsB + Math.max(1, Math.floor(shotsB * 0.35));

  const Row = ({ label, a, b, maxA, maxB, isPercent = false }: any) => {
    const pctA = Math.round((a / (maxA || 1)) * 100);
    const pctB = Math.round((b / (maxB || 1)) * 100);
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#60a5fa' }}>{isPercent ? `${a}%` : a}</span>
          <span style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#f87171' }}>{isPercent ? `${b}%` : b}</span>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
          <div style={{ flex: pctA, background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)', borderRadius: '4px 0 0 4px', minWidth: 4 }} />
          <div style={{ flex: pctB, background: 'linear-gradient(90deg, #ef4444, #dc2626)', borderRadius: '0 4px 4px 0', minWidth: 4 }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '16px 16px 8px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#60a5fa', letterSpacing: '0.5px' }}>{teamA}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>📊 Match Performance</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#f87171', letterSpacing: '0.5px' }}>{teamB}</span>
      </div>
      <Row label="Possession" a={possA} b={possB} maxA={100} maxB={100} isPercent />
      <Row label="Total Shots" a={shotsA} b={shotsB} maxA={Math.max(shotsA, shotsB)} maxB={Math.max(shotsA, shotsB)} />
      <Row label="On Target" a={onTargetA} b={onTargetB} maxA={Math.max(onTargetA, onTargetB)} maxB={Math.max(onTargetA, onTargetB)} />
      <Row label="Goals" a={goalsA} b={goalsB} maxA={Math.max(goalsA, goalsB, 1)} maxB={Math.max(goalsA, goalsB, 1)} />
    </div>
  );
}

/* ── Goal Events with player photos ── */
function GoalEvents({ scorersA, scorersB, teamA, teamB, scoreA, scoreB }: any) {
  const hasGoals = scorersA?.length > 0 || scorersB?.length > 0;
  if (!hasGoals) return null;

  // Build timeline
  const all = [
    ...(scorersA || []).map((s: any) => ({ ...s, side: 'home', team: teamA })),
    ...(scorersB || []).map((s: any) => ({ ...s, side: 'away', team: teamB })),
  ].sort((a, b) => (parseInt(a.minute) || 0) - (parseInt(b.minute) || 0));

  return (
    <div style={{ padding: '16px', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Header */}
      <p style={{ fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 14 }}>⚽ Goal Events</p>

      {/* 90-min bar */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, position: 'relative', overflow: 'visible' }}>
          {/* HT divider */}
          <div style={{ position: 'absolute', left: '50%', top: -5, width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
          {all.map((g, i) => {
            const min = Math.min(parseInt(g.minute) || 0, 90);
            const pct = (min / 90) * 100;
            return (
              <div key={i} title={`${g.name} ${g.minute}`} style={{
                position: 'absolute', left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)',
                width: 14, height: 14, borderRadius: '50%', fontSize: 8,
                background: g.side === 'home' ? '#3b82f6' : '#ef4444',
                border: '2px solid rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: g.side === 'home' ? '0 0 8px #3b82f660' : '0 0 8px #ef444460',
                zIndex: 2, cursor: 'default',
              }}>⚽</div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 8, color: '#334155' }}>
          <span>0'</span><span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', marginTop: 0 }}>HT 45'</span><span>90'</span>
        </div>
      </div>

      {/* Goal cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {all.map((g, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12,
            background: g.side === 'home' ? 'rgba(59,130,246,0.07)' : 'rgba(239,68,68,0.07)',
            border: `1px solid ${g.side === 'home' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)'}`,
            flexDirection: g.side === 'away' ? 'row-reverse' : 'row',
          }}>
            <PlayerAvatar name={g.name} team={g.team} size={46} />
            <div style={{ flex: 1, textAlign: g.side === 'away' ? 'right' : 'left' }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{g.name}</p>
              <p style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{g.team}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36, background: g.side === 'home' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 6px' }}>
              <span style={{ fontSize: 14 }}>⚽</span>
              <span style={{ fontSize: 9, color: g.side === 'home' ? '#93c5fd' : '#fca5a5', fontWeight: 700, fontFamily: 'monospace' }}>{g.minute}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════ POSITION CONFIG ══════════ */
const POSITION_CONFIG: Record<string, { label: string; color: string; glow: string; order: number }> = {
  'Goalkeeper': { label: 'GK', color: '#f59e0b', glow: 'rgba(245,158,11,0.35)', order: 1 },
  'Centre-Back': { label: 'CB', color: '#3b82f6', glow: 'rgba(59,130,246,0.35)', order: 2 },
  'Right-Back': { label: 'RB', color: '#3b82f6', glow: 'rgba(59,130,246,0.35)', order: 2 },
  'Left-Back': { label: 'LB', color: '#3b82f6', glow: 'rgba(59,130,246,0.35)', order: 2 },
  'Defensive Midfield': { label: 'DM', color: '#06b6d4', glow: 'rgba(6,182,212,0.35)', order: 3 },
  'Central Midfield': { label: 'CM', color: '#06b6d4', glow: 'rgba(6,182,212,0.35)', order: 3 },
  'Attacking Midfield': { label: 'AM', color: '#8b5cf6', glow: 'rgba(139,92,246,0.35)', order: 4 },
  'Right Midfield': { label: 'RM', color: '#06b6d4', glow: 'rgba(6,182,212,0.35)', order: 3 },
  'Left Midfield': { label: 'LM', color: '#06b6d4', glow: 'rgba(6,182,212,0.35)', order: 3 },
  'Right Wing': { label: 'RW', color: '#ec4899', glow: 'rgba(236,72,153,0.35)', order: 4 },
  'Left Wing': { label: 'LW', color: '#ec4899', glow: 'rgba(236,72,153,0.35)', order: 4 },
  'Centre-Forward': { label: 'CF', color: '#10b981', glow: 'rgba(16,185,129,0.35)', order: 5 },
  'Striker': { label: 'ST', color: '#10b981', glow: 'rgba(16,185,129,0.35)', order: 5 },
  'Second Striker': { label: 'SS', color: '#10b981', glow: 'rgba(16,185,129,0.35)', order: 5 },
};
function getPosCfg(pos: string) {
  return POSITION_CONFIG[pos] || { label: pos?.slice(0, 2).toUpperCase() || '??', color: '#64748b', glow: 'rgba(100,116,139,0.3)', order: 6 };
}

/* ══════════ SQUAD EXPLORER ══════════ */
function SquadExplorer() {
  const [query, setQuery] = useState('Argentina');
  const [input, setInput] = useState('Argentina');
  const [data, setData] = useState<{ team: any; player: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [posFilter, setPosFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const WC26_TEAMS = [
    'Argentina', 'France', 'Brazil', 'England', 'Spain', 'Germany', 'Portugal', 'Netherlands',
    'Belgium', 'Italy', 'Croatia', 'Uruguay', 'Mexico', 'USA', 'Canada', 'South Korea',
    'Japan', 'Morocco', 'Senegal', 'Australia', 'Switzerland', 'Denmark', 'Poland', 'Serbia',
    'Ecuador', 'Cameroon', 'Ghana', 'Nigeria', 'Tunisia', 'South Africa', 'Saudi Arabia',
    'Iran', 'Qatar', 'Czech Republic', 'Turkey', 'Romania', 'Ukraine', 'Colombia', 'Chile',
    'Peru', 'Paraguay', 'Bolivia', 'Venezuela', 'Costa Rica', 'Panama', 'Honduras', 'Jamaica',
  ];

  const fetchSquad = async (team: string) => {
    setLoading(true); setError(null); setData(null); setSelected(null); setPosFilter('All');
    try {
      const res = await fetch(`/api/sportsdb?type=squad&t=${encodeURIComponent(team)}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load squad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSquad('Argentina'); }, []);

  const positions = data ? ['All', ...Array.from(new Set(data.player.map((p: any) => p.position).filter(Boolean))).sort()] : [];
  const filtered = data ? data.player.filter((p: any) => posFilter === 'All' || p.position === posFilter) : [];

  // Group by position category for map view
  const byOrder: Record<number, any[]> = {};
  if (data) {
    for (const p of data.player) {
      const cfg = getPosCfg(p.position);
      if (!byOrder[cfg.order]) byOrder[cfg.order] = [];
      byOrder[cfg.order].push(p);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Search bar */}
      <div className="squad-search-container" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="squad-search-input-wrapper" style={{
          flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 0,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden'
        }}>
          <span style={{ padding: '0 12px', fontSize: 16 }}>🔍</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setQuery(input), fetchSquad(input))}
            placeholder="Search national team…"
            style={{
              flex: 1, padding: '10px 0', background: 'transparent', border: 'none',
              color: '#f1f5f9', fontSize: 13, fontWeight: 700, outline: 'none',
            }}
          />
        </div>
        <button
          onClick={() => { setQuery(input); fetchSquad(input); }}
          style={{
            padding: '10px 18px', borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            color: '#fff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(59,130,246,0.4)', transition: 'transform 0.2s',
          }}
        >Search</button>
        <button
          onClick={() => setViewMode(v => v === 'grid' ? 'map' : 'grid')}
          style={{
            padding: '10px 14px', borderRadius: 12,
            background: viewMode === 'map' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${viewMode === 'map' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: viewMode === 'map' ? '#34d399' : '#94a3b8', fontWeight: 800, fontSize: 12,
            cursor: 'pointer', transition: 'all 0.25s',
          }}
        >{viewMode === 'map' ? '⊞ Grid' : '🏟️ Map'}</button>
      </div>

      {/* Quick select teams */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {WC26_TEAMS.slice(0, 20).map(t => (
          <button key={t} onClick={() => { setInput(t); setQuery(t); fetchSquad(t); }}
            className={`group-btn${query === t ? ' active' : ''}`}
            style={{ fontSize: 10 }}>{t}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 56, textAlign: 'center' }}>
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>Loading squad for {query}…</p>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ padding: 24, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>⚠️ {error}</div>}

      {/* Team Banner */}
      {data?.team && !loading && (
        <div className="squad-animate-in" style={{
          borderRadius: 16, overflow: 'hidden', position: 'relative',
          background: data.team.fanart
            ? `linear-gradient(180deg, rgba(9,13,22,0.3) 0%, rgba(9,13,22,0.98) 80%), url('${data.team.fanart}') center/cover no-repeat`
            : `linear-gradient(135deg, ${data.team.color1 || '#1e293b'} 0%, #0f172a 100%)`,
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '20px 20px 16px',
          minHeight: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', flexWrap: 'wrap' }}>
            {data.team.badge && (
              <img src={data.team.badge} alt={data.team.name}
                style={{ width: 72, height: 72, objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))' }} />
            )}
            <div>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', margin: 0, lineHeight: 1 }}>{data.team.name}</p>
              <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0', fontWeight: 600 }}>
                {data.team.country} · {data.team.stadium} · Est. {data.team.formed}
              </p>
              <div className="squad-hero-stats" style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '3px 10px', borderRadius: 10, fontWeight: 700 }}>
                  👥 {data.player.length} Players
                </span>
                <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', padding: '3px 10px', borderRadius: 10, fontWeight: 700 }}>
                  ⚽ {data.player.filter((p: any) => p.position?.includes('Forward') || p.position?.includes('Striker') || p.position?.includes('Wing')).length} Forwards
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Position filter tabs */}
      {data && !loading && (
        <div className="squad-animate-in stagger-2" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {positions.map(pos => {
            const cfg = pos === 'All' ? null : getPosCfg(pos);
            const isActive = posFilter === pos;
            return (
              <button key={pos}
                onClick={() => setPosFilter(pos)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                  border: `1px solid ${isActive && cfg ? cfg.color + '55' : 'rgba(255,255,255,0.08)'}`,
                  background: isActive ? (cfg ? cfg.color + '22' : 'rgba(59,130,246,0.2)') : 'rgba(255,255,255,0.04)',
                  color: isActive ? (cfg ? cfg.color : '#60a5fa') : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  boxShadow: isActive && cfg ? `0 4px 14px ${cfg.glow}` : 'none',
                }}
              >
                {pos === 'All' ? '🌍 All' : (cfg?.label + ' ' + pos)}
              </button>
            );
          })}
        </div>
      )}

      {/* MAP VIEW — Formation-style vertical pitch */}
      {data && !loading && viewMode === 'map' && (
        <div style={{
          borderRadius: 16, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(180deg, #064e3b 0%, #065f46 40%, #047857 60%, #065f46 100%)',
          border: '2px solid rgba(16,185,129,0.3)',
          padding: '16px 8px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.2)',
          minHeight: 480,
        }}>
          {/* Pitch markings */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: '50%', left: '5%', right: '5%', height: 1, background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', top: '10%', bottom: '10%', left: '50%', width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', top: '35%', bottom: '35%', left: '20%', right: '20%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {/* Rows: Forwards → Midfielders → Defenders → GK */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20, padding: '0 4px' }}>
            {[5, 4, 3, 2, 1].map(order => {
              const players = byOrder[order] || [];
              if (players.length === 0) return null;
              const rowLabels: Record<number, string> = { 5: '⚡ Forwards', 4: '🎯 Attacking', 3: '⚙️ Midfielders', 2: '🛡️ Defenders', 1: '🧤 Goalkeeper' };
              return (
                <div key={order} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{rowLabels[order]}</span>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {players.map((p: any, idx: number) => {
                      const cfg = getPosCfg(p.position);
                      const imgSrc = p.cutout || p.render || p.thumb;
                      return (
                        <div key={p.id} onClick={() => setSelected(p)}
                          className={`squad-map-player stagger-${(idx % 10) + 1}`}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            cursor: 'pointer', width: 72,
                          }}
                        >
                          <div style={{
                            width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', position: 'relative',
                            border: `2px solid ${cfg.color}`,
                            boxShadow: `0 4px 16px ${cfg.glow}, 0 0 0 3px rgba(0,0,0,0.4)`,
                            background: `${cfg.color}22`,
                            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          }}>
                            {imgSrc
                              ? <img src={imgSrc} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: cfg.color }}>{(p.name || '?')[0]}</div>
                            }
                            <div style={{
                              position: 'absolute', bottom: -1, right: -1, background: cfg.color,
                              borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#000'
                            }}>{cfg.label}</div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.2, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                            {p.lastName || p.name?.split(' ').pop()}
                          </span>
                          {p.number && <span style={{ fontSize: 8, color: cfg.color, fontWeight: 900, fontFamily: 'monospace' }}>#{p.number}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GRID VIEW — Player cards */}
      {data && !loading && viewMode === 'grid' && (
        <div className="squad-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}>
          {filtered.map((p: any, idx: number) => {
            const cfg = getPosCfg(p.position);
            const imgSrc = p.cutout || p.render || p.thumb;
            const age = p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 31557600000) : null;
            return (
              <div key={p.id} onClick={() => setSelected(p)}
                className={`squad-grid-card stagger-${idx > 9 ? 'more' : idx + 1}`}
                style={{
                  borderRadius: 16, overflow: 'hidden', cursor: 'pointer', position: 'relative',
                  background: `linear-gradient(160deg, rgba(15,23,42,0.95) 0%, rgba(10,15,30,1) 100%)`,
                  border: `1px solid ${cfg.color}30`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 0 0 ${cfg.glow}`,
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px) scale(1.02)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px rgba(0,0,0,0.4), 0 0 20px ${cfg.glow}`;
                  (e.currentTarget as HTMLElement).style.borderColor = cfg.color + '80';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0) scale(1)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.3)`;
                  (e.currentTarget as HTMLElement).style.borderColor = cfg.color + '30';
                }}
              >
                {/* Position badge */}
                <div style={{
                  position: 'absolute', top: 10, left: 10, zIndex: 2,
                  background: cfg.color, color: '#000',
                  fontSize: 9, fontWeight: 900, padding: '3px 7px', borderRadius: 8,
                  boxShadow: `0 2px 10px ${cfg.glow}`,
                }}>{cfg.label}</div>

                {/* Jersey number */}
                {p.number && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 2,
                    color: cfg.color, fontSize: 11, fontWeight: 900, fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.5)', padding: '2px 7px', borderRadius: 8,
                    border: `1px solid ${cfg.color}40`,
                  }}>#{p.number}</div>
                )}

                {/* Player image */}
                <div style={{ width: '100%', height: 140, background: `linear-gradient(180deg, ${cfg.color}15 0%, transparent 100%)`, position: 'relative', overflow: 'hidden' }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{
                        width: 70, height: 70, borderRadius: '50%', background: `${cfg.color}22`,
                        border: `2px solid ${cfg.color}55`, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 28, fontWeight: 900, color: cfg.color,
                      }}>{(p.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</div>
                    </div>
                  )}
                  {/* Gradient overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
                    background: 'linear-gradient(0deg, rgba(10,15,30,1) 0%, transparent 100%)'
                  }} />
                </div>

                {/* Info */}
                <div style={{ padding: '10px 12px 12px' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: '#f1f5f9', margin: 0, lineHeight: 1.2 }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', fontWeight: 600 }}>{p.position || '—'}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {p.club && (
                      <span style={{ fontSize: 9, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        🏟 {p.club}
                      </span>
                    )}
                    {age && (
                      <span style={{ fontSize: 9, color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                        {age}y
                      </span>
                    )}
                  </div>
                  {p.height && (
                    <p style={{ fontSize: 9, color: '#334155', margin: '6px 0 0', fontWeight: 600 }}>{p.height}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Player Detail Modal */}
      {selected && (
        <div className="modal-backdrop-animate"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
          onClick={() => setSelected(null)}
        >
          <div className="modal-content-animate" onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 480, borderRadius: 24, overflow: 'hidden',
            background: 'linear-gradient(160deg, #0d1117 0%, #111827 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.85)',
          }}>
            {(() => {
              const cfg = getPosCfg(selected.position);
              const imgSrc = selected.poster || selected.render || selected.cutout || selected.thumb;
              const age = selected.birthDate ? Math.floor((Date.now() - new Date(selected.birthDate).getTime()) / 31557600000) : null;
              return (
                <>
                  {/* Hero */}
                  <div style={{
                    position: 'relative', height: 240, overflow: 'hidden',
                    background: `linear-gradient(135deg, ${cfg.color}20 0%, rgba(9,13,22,0.95) 100%)`,
                  }}>
                    <button onClick={() => setSelected(null)} style={{
                      position: 'absolute', right: 14, top: 14, zIndex: 10,
                      background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '50%', width: 34, height: 34,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#94a3b8',
                    }}><X style={{ width: 16, height: 16 }} /></button>

                    {imgSrc && <img src={imgSrc} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: 0.85 }} />}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(9,13,22,1) 0%, rgba(9,13,22,0.2) 60%)' }} />

                    {/* Name overlay */}
                    <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ background: cfg.color, color: '#000', fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 10 }}>{cfg.label}</span>
                        {selected.number && <span style={{ fontSize: 12, color: cfg.color, fontWeight: 900, fontFamily: 'monospace' }}>#{selected.number}</span>}
                      </div>
                      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f8fafc', margin: '6px 0 0', lineHeight: 1 }}>{selected.name}</h2>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{selected.position}</p>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ padding: '20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: '🏟 Club', value: selected.club },
                      { label: '🌍 Nationality', value: selected.nationality },
                      { label: '🎂 Age', value: age ? `${age} yrs` : selected.birthDate },
                      { label: '📍 Birthplace', value: selected.birthLocation },
                      { label: '📏 Height', value: selected.height },
                      { label: '⚖️ Weight', value: selected.weight },
                      { label: '🦶 Foot', value: selected.side },
                      { label: '📋 Status', value: selected.status },
                    ].filter(r => r.value).map(row => (
                      <div key={row.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                        <p style={{ fontSize: 9, color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>{row.label}</p>
                        <p style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700, margin: '4px 0 0' }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Live Stream Modal ── */
function LiveStreamModal({ match, onClose }: { match: any, onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s forwards' }}>
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="animate-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>LIVE: {match.teamA} vs {match.teamB}</span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <iframe
          src="https://www.youtube.com/embed/live_stream?channel=UC4g128kE28b0Bov8r5xJjcw&autoplay=1&mute=1"
          style={{ width: '100%', height: '100%', border: 'none', maxWidth: '1200px', maxHeight: '100vh' }}
          allowFullScreen
          allow="autoplay; encrypted-media"
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */

export default function MatchesClient({ initialMatches, channels }: { initialMatches?: any[], channels?: any[] }) {
  const [wc26Games, setWc26Games] = useState<any[]>([]);
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'matches' | 'scorers' | 'squad'>('matches');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<any | null>(null);
  const [liveStreamMatch, setLiveStreamMatch] = useState<any | null>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadWC26 = async () => {
    try {
      const res = await fetch('/api/wc26');
      const data = await res.json();
      setWc26Games(data.games || []);
      setTopScorers(data.topScorers || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('WC26 fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWC26();
    const t = setInterval(loadWC26, 30000);
    return () => clearInterval(t);
  }, []);

  const getCountdown = (isoTime: string) => {
    try {
      const target = new Date(isoTime.endsWith('Z') ? isoTime : isoTime + 'Z').getTime();
      const diff = target - currentTime.getTime();
      if (diff <= 0) return null;
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      };
    } catch { return null; }
  };

  // Only show groups that actually have matches
  const uniqueGroups = ['All', ...Array.from(new Set(wc26Games.map(g => g.group).filter(Boolean))).sort()];

  const filtered = wc26Games.filter(g => {
    if (statusFilter === 'live' && g.status !== 'Live') return false;
    if (statusFilter === 'upcoming' && g.status !== 'Upcoming') return false;
    if (statusFilter === 'ended' && g.status !== 'Ended') return false;
    if (groupFilter !== 'All' && g.group !== groupFilter) return false;
    return true;
  });

  const liveCount = wc26Games.filter(g => g.status === 'Live').length;
  const upcomingCount = wc26Games.filter(g => g.status === 'Upcoming').length;
  const endedCount = wc26Games.filter(g => g.status === 'Ended').length;

  return (
    <>
      {liveStreamMatch && <LiveStreamModal match={liveStreamMatch} onClose={() => setLiveStreamMatch(null)} />}
      {selectedMatchForModal && (
        <MatchDetailModal
          game={selectedMatchForModal}
          onClose={() => setSelectedMatchForModal(null)}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-slide-up">

        {/* ── HERO ── */}
        <div style={{
          borderRadius: 20, padding: '24px 24px 20px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(59,130,246,0.1) 0%, transparent 55%), radial-gradient(circle at 85% 50%, rgba(139,92,246,0.1) 0%, transparent 55%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Trophy style={{ width: 20, height: 20, color: '#f59e0b' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '2px' }}>FIFA World Cup 2026</span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc', lineHeight: 1.1, margin: 0 }}>Live Match Center</h1>
              <p style={{ fontSize: 11, color: '#475569', marginTop: 6, margin: '6px 0 0' }}>
                Scores · Stadiums · Goal Analysis
                {lastUpdated && <span> · <span style={{ color: '#334155' }}>Updated {lastUpdated}</span></span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {liveCount > 0 && (
                <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444' }}>{liveCount} LIVE</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats — simplified and centered with beautiful icons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap', position: 'relative', justifyContent: 'center' }}>
            {[
              { label: 'Matches', value: wc26Games.length, color: '#3b82f6', icon: <Calendar style={{ width: 15, height: 15, color: '#3b82f6' }} />, bg: 'rgba(59,130,246,0.1)' },
              { label: 'Live', value: liveCount, color: '#ef4444', icon: <Radio style={{ width: 15, height: 15, color: '#ef4444' }} />, bg: 'rgba(239,68,68,0.1)' },
              { label: 'Upcoming', value: upcomingCount, color: '#10b981', icon: <Clock style={{ width: 15, height: 15, color: '#10b981' }} />, bg: 'rgba(16,185,129,0.1)' },
              { label: 'Ended', value: endedCount, color: '#94a3b8', icon: <CheckCircle style={{ width: 15, height: 15, color: '#94a3b8' }} />, bg: 'rgba(148,163,184,0.1)' },
              { label: 'Scorers', value: topScorers.length, color: '#f59e0b', icon: <Award style={{ width: 15, height: 15, color: '#f59e0b' }} />, bg: 'rgba(245,158,11,0.1)' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '120px'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: s.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {s.icon}
                </div>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: 'monospace', lineHeight: 1, margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '3px 0 0' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 5, border: '1px solid rgba(255,255,255,0.07)', width: 'fit-content', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            {[
              { key: 'matches', label: '⚽ Matches', activeClass: 'active-blue' },
              { key: 'scorers', label: '🏆 Top Scorers', activeClass: 'active-amber' },
              
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveSection(t.key as any)}
                className={`tab-btn${activeSection === t.key ? ` ${t.activeClass}` : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════ MATCHES ══════════ */}
        {activeSection === 'matches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Status */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', width: '100%', margin: '4px 0' }}>
              {([
                { key: 'all', label: `All — ${wc26Games.length} matches` },
                { key: 'live', label: `🔴 Live — ${liveCount}` },
                { key: 'upcoming', label: `⏳ Upcoming — ${upcomingCount}` },
                { key: 'ended', label: `✅ Ended — ${endedCount}` },
              ] as const).map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`filter-btn${statusFilter === f.key ? ` active active-${f.key}` : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Group filter — centered and wrapped */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', width: '100%', margin: '4px 0', padding: '0 8px' }}>
              {uniqueGroups.map(g => (
                <button
                  key={g}
                  onClick={() => setGroupFilter(g)}
                  className={`group-btn${groupFilter === g ? ' active' : ''}`}
                >
                  {g === 'All' ? '🌍 All' : g}
                </button>
              ))}
            </div>

            {/* Cards */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', padding: 56, color: '#475569', width: '100%' }}>
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p style={{ fontWeight: 600, fontSize: 14 }}>Loading FIFA World Cup 2026 data...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card-glass" style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No matches for this filter.</div>
            ) : (
              <div className="match-grid">
                {filtered.map((g: any) => {
                  const isLive = g.status === 'Live';
                  const isEnded = g.status === 'Ended';
                  const countdown = !isEnded && !isLive ? getCountdown(g.time) : null;
                  const homeWin = isEnded && g.scoreA > g.scoreB;
                  const awayWin = isEnded && g.scoreB > g.scoreA;
                  const isDraw = isEnded && g.scoreA === g.scoreB;
                  const isExpanded = expandedCard === g.id;
                  const hasEvents = g.scorersA?.length > 0 || g.scorersB?.length > 0;

                  return (
                    <div key={g.id} style={{
                      borderRadius: 16, overflow: 'hidden',
                      background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(10,15,30,0.98) 100%)',
                      border: `1px solid ${isLive ? 'rgba(239,68,68,0.35)' : isEnded ? 'rgba(255,255,255,0.07)' : 'rgba(59,130,246,0.2)'}`,
                      boxShadow: isLive ? '0 0 30px rgba(239,68,68,0.1)' : '0 4px 20px rgba(0,0,0,0.25)',
                      transition: 'box-shadow 0.3s',
                    }}>

                      {/* Top bar */}
                      <div style={{ padding: '10px 14px', background: isLive ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {g.type === 'group' ? `Group ${g.group}` : g.group || g.type.toUpperCase()} · MD{g.matchday}
                          </span>
                          {g.stadiumName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, color: '#334155', fontSize: 9 }}>
                              <MapPin style={{ width: 9, height: 9 }} />
                              <span>{g.stadiumName}{g.stadiumCity ? `, ${g.stadiumCity}` : ''}</span>
                              {g.stadiumCapacity > 0 && <span>· 👥 {(g.stadiumCapacity / 1000).toFixed(0)}K</span>}
                            </div>
                          )}
                        </div>
                        {isLive ? (
                          <span className="animate-pulse" style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> LIVE
                          </span>
                        ) : isEnded ? (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(71,85,105,0.4)', color: '#64748b' }}>✅ Full Time</span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                            ⏰ {g.localDate.split(' ')[1]}
                          </span>
                        )}
                      </div>

                      {/* Teams + Score */}
                      <div style={{ padding: '18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <TeamLogo name={g.teamA} initialFlagUrl={g.teamAFlag} size={54} />
                          <p style={{ fontSize: 12, fontWeight: 800, color: homeWin ? '#4ade80' : '#f1f5f9', textAlign: 'center', lineHeight: 1.2, margin: 0 }}>{g.teamA || 'TBD'}</p>
                          {g.teamACode && <p style={{ fontSize: 9, color: '#475569', fontWeight: 700, margin: 0 }}>{g.teamACode}</p>}
                          {homeWin && <span style={{ fontSize: 9, fontWeight: 800, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '2px 8px', borderRadius: 6 }}>WINNER 🏆</span>}
                        </div>

                        <div style={{ minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          {isEnded || isLive ? (
                            <>
                              <span style={{ fontSize: 30, fontWeight: 900, fontFamily: 'monospace', color: isLive ? '#ef4444' : '#f8fafc', lineHeight: 1, textShadow: isLive ? '0 0 20px rgba(239,68,68,0.5)' : 'none' }}>
                                {g.scoreA}–{g.scoreB}
                              </span>
                              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.5px', color: isDraw ? '#94a3b8' : homeWin ? '#4ade80' : '#60a5fa' }}>
                                {isDraw ? 'DRAW' : homeWin ? 'HOME WIN' : 'AWAY WIN'}
                              </span>
                            </>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#475569', letterSpacing: 3 }}>VS</span>
                          )}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <TeamLogo name={g.teamB} initialFlagUrl={g.teamBFlag} size={54} />
                          <p style={{ fontSize: 12, fontWeight: 800, color: awayWin ? '#60a5fa' : '#f1f5f9', textAlign: 'center', lineHeight: 1.2, margin: 0 }}>{g.teamB || 'TBD'}</p>
                          {g.teamBCode && <p style={{ fontSize: 9, color: '#475569', fontWeight: 700, margin: 0 }}>{g.teamBCode}</p>}
                          {awayWin && <span style={{ fontSize: 9, fontWeight: 800, color: '#60a5fa', background: 'rgba(96,165,250,0.12)', padding: '2px 8px', borderRadius: 6 }}>WINNER 🏆</span>}
                        </div>
                      </div>

                      {/* Countdown */}
                      {countdown && (
                        <div style={{ margin: '0 14px 14px', display: 'flex', justifyContent: 'center', gap: 8 }}>
                          {[
                            { v: countdown.days, l: 'Days', show: countdown.days > 0 },
                            { v: countdown.hours, l: 'Hours', show: true },
                            { v: countdown.mins, l: 'Min', show: true },
                            { v: countdown.secs, l: 'Sec', show: true },
                          ].filter(x => x.show).map((item, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 44, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '8px 6px' }}>
                              <span style={{ fontSize: 20, fontWeight: 900, color: '#3b82f6', fontFamily: 'monospace', lineHeight: 1 }}>{String(item.v).padStart(2, '0')}</span>
                              <span style={{ fontSize: 8, color: '#334155', textTransform: 'uppercase', fontWeight: 600, marginTop: 3 }}>{item.l}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* View details button */}
                      <button onClick={() => setSelectedMatchForModal(g)} style={{
                        width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer', padding: '11px', color: '#60a5fa', fontSize: 11, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        transition: 'all 0.2s', letterSpacing: '0.5px'
                      }}>
                        ⚡ View Match Details & Goals
                      </button>

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.15)' }}>
                        <span style={{ fontSize: 10, color: '#334155' }}>🗓️ {formatLocalTime(g.time, g.localDate)}</span>
                        {g.status === 'Live' && (
                          <button onClick={() => setLiveStreamMatch(g)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.4)' }}>
                            <Play style={{ width: 11, height: 11, fill: 'white' }} /> Play Live
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ TOP SCORERS ══════════ */}
        {activeSection === 'scorers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ borderRadius: 14, padding: '16px 20px', background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.06))', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Star style={{ width: 18, height: 18, color: '#f59e0b' }} />
                <div>
                  <p style={{ fontWeight: 800, fontSize: 15, color: '#fbbf24', margin: 0 }}>Top Goal Scorers</p>
                  <p style={{ fontSize: 11, color: '#78350f', margin: '2px 0 0' }}>FIFA World Cup 2026 · {topScorers.length} players</p>
                </div>
              </div>
            </div>

            {topScorers.length === 0 ? (
              <div className="card-glass" style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Goal data will appear as matches are played.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topScorers.map((s: any, i: number) => {
                  const isTop3 = i < 3;
                  const medals = ['🥇', '🥈', '🥉'];
                  const colors = ['#f59e0b', '#94a3b8', '#b45309'];
                  return (
                    <div key={s.name} style={{
                      borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                      background: isTop3 ? `linear-gradient(135deg, rgba(${i === 0 ? '245,158,11' : i === 1 ? '148,163,184' : '180,83,9'},0.07), rgba(10,15,30,0.9))` : 'rgba(15,23,42,0.6)',
                      border: `1px solid ${isTop3 ? `rgba(${i === 0 ? '245,158,11' : i === 1 ? '148,163,184' : '180,83,9'},0.2)` : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      {/* Rank badge */}
                      <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: isTop3 ? 20 : 13, flexShrink: 0, background: 'rgba(255,255,255,0.04)', color: isTop3 ? colors[i] : '#475569' }}>
                        {isTop3 ? medals[i] : `#${i + 1}`}
                      </div>

                      {/* Player avatar */}
                      <PlayerAvatar name={s.name} team={s.team} size={64} />

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 900, fontSize: 14, color: '#f1f5f9' }}>{s.name}</span>
                          <span style={{ fontSize: 10, color: '#64748b', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '1px 8px', borderRadius: 8 }}>{s.team}</span>
                        </div>
                        {s.minutes?.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                            {s.minutes.map((m: string, mi: number) => (
                              <span key={mi} style={{ fontSize: 9, color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 6, fontFamily: 'monospace' }}>
                                ⚽ {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Goals */}
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 30, fontWeight: 900, color: isTop3 ? colors[i] : '#94a3b8', fontFamily: 'monospace', lineHeight: 1, margin: 0 }}>{s.goals}</p>
                        <p style={{ fontSize: 8, color: '#475569', textTransform: 'uppercase', fontWeight: 700, margin: '2px 0 0' }}>GOALS</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ SQUAD EXPLORER ══════════ */}

        {activeSection === 'squad' && (
          <SquadExplorer />
        )}

      </div>
    </>
  );
}
