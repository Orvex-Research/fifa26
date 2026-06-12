'use client';

import { useState, useEffect } from 'react';

export default function Footer() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.ok && res.json())
      .then((data) => data && setSettings(data))
      .catch((err) => console.error('Error loading footer settings:', err));
  }, []);

  return (
    <footer style={{
      marginTop: 'auto',
      padding: '40px 20px 30px 20px',
      borderTop: '1px solid var(--border-glass)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontSize: '12px',
      color: 'var(--text-muted)',
      width: '100%',
      maxWidth: '1200px',
      marginInline: 'auto'
    }}>
      {/* Small Circular Logo at the bottom */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)',
        boxShadow: '0 0 15px rgba(37, 99, 235, 0.2)'
      }}>
        <img src="/logo.png" alt="Orvex Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{settings?.creditText || 'Made by Orvex Research'}</span>
        <span>
          Support: <a href={`mailto:${settings?.supportEmail || 'orvex.research@gmail.com'}`} className="hover:text-white transition-colors" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            {settings?.supportEmail || 'orvex.research@gmail.com'}
          </a>
        </span>
      </div>
    </footer>
  );
}
