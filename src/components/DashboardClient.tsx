'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Play } from 'lucide-react';
import dynamic from 'next/dynamic';
const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false });
import MatchesClient from './MatchesClient';
import SiteNoticeBanner from './SiteNoticeBanner';
import type { Channel, Match } from '@/lib/db';

const CATEGORY_COLORS: Record<string, [string, string]> = {
  'FIFA World Cup': ['#1e3a8a', '#3b82f6'],
  'Sports': ['#1e3a8a', '#3b82f6'],
  'Movies': ['#701a75', '#d946ef'],
  'Bangladesh': ['#064e3b', '#10b981'],
  'Music': ['#831843', '#ec4899'],
  'Cartoon': ['#7c2d12', '#f97316'],
  'News': ['#1e293b', '#475569'],
  'Documentary': ['#115e59', '#0d9488'],
  'Entertainment': ['#1e1b4b', '#8b5cf6'],
  'Pakistan': ['#134e4a', '#14b8a6'],
};

const getCategoryGradient = (category: string) => {
  const [c1, c2] = CATEGORY_COLORS[category] || ['#4f46e5', '#7c3aed'];
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
};

// Inline SVG badge - renders category gradient + initials, no file loading needed
function ChannelLogoBadge({ name, category, id }: { name: string; category: string; id: string }) {
  const [c1, c2] = CATEGORY_COLORS[category] || ['#4f46e5', '#7c3aed'];
  const cleanName = name.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '').trim();
  const words = cleanName.split(/\s+/).filter((w: string) => /[a-zA-Z0-9]/.test(w));
  let initials = 'TV';
  if (words.length >= 2) initials = (words[0][0] + words[1][0]).toUpperCase();
  else if (words.length === 1) initials = words[0].slice(0, 2).toUpperCase();
  const gradId = `g_${id}`;
  const fontSize = initials.length === 1 ? 72 : 58;

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${gradId})`} />
      <rect width="160" height="60" fill="rgba(255,255,255,0.08)" />
      <text x="80" y="74" fontFamily="Arial Black, Arial, sans-serif" fontSize={fontSize} fontWeight="900" fill="white" textAnchor="middle" opacity="0.95">{initials}</text>
    </svg>
  );
}

interface DashboardClientProps {
  initialChannels: Omit<Channel, 'url'>[];
  initialMatches: Match[];
}

export default function DashboardClient({ initialChannels, initialMatches }: DashboardClientProps) {
  const [channels, setChannels] = useState(initialChannels);
  const [matches] = useState(initialMatches);
  const [selectedChannel, setSelectedChannel] = useState<Omit<Channel, 'url'> | null>(null);
  const [obfuscatedUrl, setObfuscatedUrl] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loadingStream, setLoadingStream] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<any>(null);
  const [searchMode, setSearchMode] = useState<'channels' | 'google'>('channels');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const searchParams = useSearchParams();
  const playParam = searchParams.get('play');

  // Ping for active viewers feature removed since there's no continuous player connection here.

  // Load app settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Google CSE script loader
  useEffect(() => {
    if (settings?.googleSearchEnabled && settings?.googleSearchCxId) {
      const scriptId = 'google-cse-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://cse.google.com/cse.js?cx=${settings.googleSearchCxId}`;
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [settings]);

  // Categories list extracted dynamically
  const categories = ['All', ...Array.from(new Set(initialChannels.map((c) => c.category)))];

  // Live Matches currently happening
  const liveMatches = matches.filter((m) => m.status === 'Live');

  // Filter channels based on search query and category
  const filteredChannels = channels.filter((channel) => {
    const matchesCategory = selectedCategory === 'All' || channel.category === selectedCategory;
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle Channel Click (Fetch secure encrypted stream URL)
  const handleSelectChannel = async (channel: Omit<Channel, 'url'>) => {
    if (selectedChannel?.id === channel.id && obfuscatedUrl) return;

    setLoadingStream(true);
    setSelectedChannel(channel);
    setObfuscatedUrl('');

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelId: channel.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to load stream url');
      }

      const data = await response.json();
      setObfuscatedUrl(data.stream);
    } catch (e) {
      console.error('Stream loading error:', e);
      // Do not use alert() as it blocks rendering or causes issues with bots
      // Do not clear selectedChannel to avoid infinite auto-play loop
      // Do not delete the channel from the list
    } finally {
      setLoadingStream(false);
    }
  };

  // Auto-play from query parameter ?play=channel_id
  useEffect(() => {
    if (playParam) {
      const channel = channels.find(c => c.id === playParam);
      if (channel) {
        handleSelectChannel(channel);
      }
    }
  }, [playParam, channels]);

  // Auto-play first channel on mount if no play query parameter is provided
  useEffect(() => {
    // Only auto-play if we haven't selected a channel yet
    if (channels.length > 0 && !playParam && !selectedChannel) {
      handleSelectChannel(channels[0]);
    }
  }, [channels, playParam, selectedChannel]);


  // Tune into match channel directly
  const handleTuneIn = (channelId: string) => {
    const targetChannel = channels.find(c => c.id === channelId);
    if (targetChannel) {
      handleSelectChannel(targetChannel);

      // Scroll to video player
      const playerEl = document.getElementById('main-player-section');
      if (playerEl) {
        playerEl.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      alert('The stream channel for this match is offline.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-slide-up">

      {/* Site Notice Banner moved below TV name */}

      <section
        id="main-player-section"
        className="sticky top-[64px] md:top-[76px] z-40 -mx-4 md:-mx-6 px-4 md:px-6 py-2 border-b border-white/5 sticky-player-cover"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch' }}
      >
        {selectedChannel && (
          <div
            className="card-glass p-1 w-full"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              maxWidth: '1100px',
              margin: '0 auto'
            }}
          >
            {loadingStream ? (
              <div className="w-full rounded-2xl flex flex-col items-center justify-center gap-3" style={{ aspectRatio: '16/9', maxHeight: '65vh', background: '#000' }}>
                <div className="w-10 h-10 border-4 border-slate-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              obfuscatedUrl && (
                <div style={{ aspectRatio: '16/9', maxHeight: '65vh', width: '100%', overflow: 'hidden', borderRadius: '16px', background: '#000' }}>
                  <VideoPlayer
                    obfuscatedUrl={obfuscatedUrl}
                    channelName={selectedChannel.name}
                    onError={() => {
                      fetch('/api/channels/report-offline', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ channelId: selectedChannel.id }),
                      }).catch(() => {});
                      
                      // Prevent Googlebot or adblockers from triggering a loop of channel deletions
                      // setChannels(prev => prev.filter(c => c.id !== selectedChannel.id));
                      // setSelectedChannel(null);
                    }}
                  />
                </div>
              )
            )}

            {/* Compact footer bar below player */}
            <div className="flex items-center justify-center px-2 py-1.5 mt-1 text-xs text-slate-400 relative">
              <span className="font-bold text-white truncate max-w-[200px] md:max-w-[500px] text-sm text-center">
                {selectedChannel.name}
              </span>
              
              {/* Live indicator positioned absolutely to the right so it doesn't break centering */}
              <span className="absolute right-2 flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-red-400">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', display: 'inline-block', boxShadow: '0 0 5px #ef4444' }} />
                LIVE
              </span>
            </div>

            {/* Site Notice Banner — placed small below the TV name */}
            <div className="mt-2 mx-auto w-full max-w-[800px]">
              <SiteNoticeBanner />
            </div>
          </div>
        )}
      </section>

      {/* Main Switchable Search Panels */}
      {searchMode === 'google' ? (
        <section className="card-glass animate-slide-up" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="font-title text-base font-bold text-slate-300">Google Programmable Search</h3>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
            <div className="gcse-search"></div>
          </div>
        </section>
      ) : (
        <>


          {/* Category selector */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="font-title text-base font-bold text-slate-300">Browse Categories</h3>
            <div className="category-list">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {/* Channel Grid */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-title text-base font-bold text-slate-300">
                {selectedCategory} Channels ({filteredChannels.length})
              </h3>
            </div>

            {filteredChannels.length > 0 ? (
              <div className="channel-grid">
                {filteredChannels.map((channel) => {
                  const isActive = selectedChannel?.id === channel.id;

                  return (
                    <div
                      key={channel.id}
                      onClick={() => handleSelectChannel(channel)}
                      className={`card-glass channel-card ${isActive ? 'border-blue-500' : ''}`}
                      style={{
                        borderColor: isActive ? 'var(--accent-blue)' : undefined,
                        boxShadow: isActive ? 'var(--shadow-accent)' : undefined
                      }}
                    >
                      {/* Channel logo container */}
                      <div className="channel-logo-container" style={{ background: 'none', padding: 0, overflow: 'hidden' }}>
                        {channel.logoUrl && !imageErrors[channel.id] ? (
                          <img 
                            src={channel.logoUrl} 
                            alt={channel.name} 
                            onError={() => setImageErrors(prev => ({...prev, [channel.id]: true}))}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#0f172a' }} 
                          />
                        ) : (
                          <ChannelLogoBadge name={channel.name} category={channel.category} id={channel.id} />
                        )}
                        {/* Play overlay on hover */}
                        <div className="channel-logo-overlay">
                          <Play className="w-10 h-10 text-white fill-white" />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <h4 className="font-title text-xs md:text-sm font-bold truncate text-white">{channel.name}</h4>
                        <span className="text-[8px] md:text-[10px] text-slate-400 font-bold uppercase tracking-wider">{channel.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-glass" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No channels found matching the query.
              </div>
            )}
          </section>
        </>
      )}

    </div>
  );
}
