'use client';

import { useState, useEffect } from 'react';

export default function Preloader() {
  const [loading, setLoading] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Start fading out slightly before removing element from DOM
    const fadeTimer = setTimeout(() => {
      setFade(true);
    }, 1100);

    const removeTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!loading) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-primary)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? 'none' : 'auto',
        transition: 'opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
    >
      <div 
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          transform: fade ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        {/* Pulsing Orvex Logo */}
        <img 
          src="/logo.png" 
          alt="Orvex Logo" 
          className="preloader-logo"
          style={{ 
            width: '200px', 
            height: 'auto', 
            objectFit: 'contain'
          }} 
        />
        
        {/* Spinner */}
        <div 
          style={{
            width: '36px',
            height: '36px',
            border: '3px solid rgba(255, 255, 255, 0.05)',
            borderTopColor: 'var(--accent-blue)',
            borderRadius: '50%',
            animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.1, 1) infinite',
            marginTop: '10px',
            boxShadow: '0 0 10px rgba(37, 99, 235, 0.2)',
          }} 
        />
      </div>
    </div>
  );
}
