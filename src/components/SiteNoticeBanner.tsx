'use client';

import { useEffect, useState } from 'react';
import { Info, AlertTriangle, CheckCircle, Megaphone } from 'lucide-react';

const TYPE_CONFIG = {
  info: {
    bg: 'linear-gradient(90deg, rgba(37,99,235,0.15) 0%, rgba(59,130,246,0.08) 100%)',
    border: 'rgba(59,130,246,0.3)',
    color: '#93c5fd',
    accent: '#3b82f6',
    icon: Info,
    label: 'Notice',
  },
  warning: {
    bg: 'linear-gradient(90deg, rgba(217,119,6,0.15) 0%, rgba(245,158,11,0.08) 100%)',
    border: 'rgba(245,158,11,0.3)',
    color: '#fcd34d',
    accent: '#f59e0b',
    icon: AlertTriangle,
    label: 'Warning',
  },
  success: {
    bg: 'linear-gradient(90deg, rgba(5,150,105,0.15) 0%, rgba(16,185,129,0.08) 100%)',
    border: 'rgba(16,185,129,0.3)',
    color: '#6ee7b7',
    accent: '#10b981',
    icon: CheckCircle,
    label: 'Announcement',
  },
  urgent: {
    bg: 'linear-gradient(90deg, rgba(185,28,28,0.18) 0%, rgba(239,68,68,0.10) 100%)',
    border: 'rgba(239,68,68,0.4)',
    color: '#fca5a5',
    accent: '#ef4444',
    icon: Megaphone,
    label: 'Important',
  },
};

export default function SiteNoticeBanner() {
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
  const [noticeEnabled, setNoticeEnabled] = useState<boolean | null>(null); // null = loading
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) {
          setNoticeEnabled(false);
          return;
        }
        const data = await res.json();
        const msg = data.siteNotice || '';
        const type = data.noticeType || 'info';
        const enabled = !!data.noticeEnabled;

        setNotice(msg);
        setNoticeType(type);
        setNoticeEnabled(enabled);
        // Animate in after state is set
        setTimeout(() => setVisible(true), 80);
      } catch {
        setNoticeEnabled(false);
      }
    };
    load();
  }, []);

  // Still loading — render nothing to avoid layout shift
  if (noticeEnabled === null) return null;

  const cfg = TYPE_CONFIG[noticeType] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  // ── MINIMIZED bar — notice is OFF or empty ──
  if (!noticeEnabled || !notice.trim()) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '6px',
          opacity: visible ? 0.5 : 0,
          transition: 'opacity 0.4s ease',
          height: '26px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '9px', color: '#334155', fontWeight: 600, letterSpacing: '0.5px', userSelect: 'none' }}>
          NO ACTIVE NOTICE
        </span>
      </div>
    );
  }

  // ── FULL notice banner — notice is ON and has content ──
  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: '7px',
        padding: '5px 10px 5px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        boxShadow: `0 2px 16px ${cfg.accent}18`,
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '32px',
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: cfg.accent, borderRadius: '7px 0 0 7px',
      }} />

      {/* Icon */}
      <div style={{
        width: 18, height: 18, borderRadius: '5px',
        background: `${cfg.accent}20`, border: `1px solid ${cfg.accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: 10, height: 10, color: cfg.accent }} />
      </div>

      {/* Label badge */}
      <span style={{
        fontSize: '8px', fontWeight: 800, color: cfg.accent,
        textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {cfg.label}
      </span>

      {/* Divider */}
      <span style={{ width: 1, height: 14, background: `${cfg.accent}30`, flexShrink: 0 }} />

      {/* Message */}
      <p style={{
        fontSize: '11px', fontWeight: 600, color: cfg.color,
        lineHeight: 1.3, margin: 0, wordBreak: 'break-word', flex: 1,
      }}>
        {notice}
      </p>
    </div>
  );
}
