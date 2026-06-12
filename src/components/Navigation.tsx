'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tv, Trophy } from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const navItems = [
    { name: 'Live TV', path: '/', icon: Tv },
    { name: 'FIFA Matches', path: '/matches', icon: Trophy },
  ];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleActivity = () => {
      setIsVisible(true);
      clearTimeout(timeoutId);
      
      if (!isHovered) {
        timeoutId = setTimeout(() => {
          setIsVisible(false);
        }, 3000); // Auto-hide after 3 seconds of inactivity
      }
    };

    // Initialize timer
    timeoutId = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [isHovered]);

  // Reset visibility when navigating to a new path
  useEffect(() => {
    setIsVisible(true);
  }, [pathname]);

  return (
    <>
      {/* Top Header Logo Bar */}
      <header className="top-navbar animate-fade-in">
        <Link href="/" className="top-navbar-logo">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            overflow: 'hidden',
            border: '2px solid var(--accent-blue)',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)',
            background: 'rgba(255,255,255,0.05)',
          }}>
            <img src="/logo.png" alt="Orvex Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span className="logo-text">FIFA World Cup 2026 Live</span>
        </Link>
      </header>

      {/* Floating Bottom Nav Dock */}
      <nav 
        className="bottom-nav-dock animate-fade-in"
        onMouseEnter={() => {
          setIsHovered(true);
          setIsVisible(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        style={{
          transform: isVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(80px)',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`bottom-nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
