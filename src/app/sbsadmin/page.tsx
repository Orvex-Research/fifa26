'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, LogOut, Plus, Edit2, Trash2, 
  Tv, RefreshCw, Save, X, ArrowRight, Settings, Users, Eye, TrendingUp, Lock, Bell, BellOff
} from 'lucide-react';
import type { Channel } from '@/lib/db';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'channels' | 'settings' | 'notice'>('channels');
  
  // Data States
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Analytics
  const [liveViewers, setLiveViewers] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [topChannel, setTopChannel] = useState('—');

  // Settings Form States
  const [supportEmail, setSupportEmail] = useState('orvex.research@gmail.com');
  const [creditText, setCreditText] = useState('Made by Orvex Research');
  const [googleSearchCxId, setGoogleSearchCxId] = useState('');
  const [googleSearchEnabled, setGoogleSearchEnabled] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Notice States
  const [siteNotice, setSiteNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info');
  const [noticeEnabled, setNoticeEnabled] = useState(false);
  const [savingNotice, setSavingNotice] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState('');

  // Password Change States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // Form States (New / Edit Channel)
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [channelId, setChannelId] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelCategory, setChannelCategory] = useState('Sports');
  const [channelUrl, setChannelUrl] = useState('');
  const [channelLogoUrl, setChannelLogoUrl] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [logoErrors, setLogoErrors] = useState<Record<string,boolean>>({});

  // Check Auth State on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch realtime analytics
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const data = await res.json();
          setLiveViewers(data.totalLive);
          setTotalViews(data.totalViews);
          setTopChannel(data.topChannel);
        }
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
        if (data.authenticated) {
          fetchData();
        }
      }
    } catch (e) {
      console.error(e);
      setIsAuthenticated(false);
    }
  };

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const chRes = await fetch('/api/channels');
      const seRes = await fetch('/api/settings');
      if (chRes.ok && seRes.ok) {
        setChannels(await chRes.json());
        const settings = await seRes.json();
        setSupportEmail(settings.supportEmail);
        setCreditText(settings.creditText);
        setGoogleSearchCxId(settings.googleSearchCxId);
        setGoogleSearchEnabled(settings.googleSearchEnabled);
        setSiteNotice(settings.siteNotice || '');
        setNoticeType(settings.noticeType || 'info');
        setNoticeEnabled(!!settings.noticeEnabled);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportEmail,
          creditText,
          googleSearchCxId,
          googleSearchEnabled,
          siteNotice,
          noticeType,
          noticeEnabled,
        }),
      });
      if (res.ok) {
        alert('Settings updated successfully!');
      } else {
        alert('Failed to save settings.');
      }
    } catch (e) {
      alert('Error updating settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveNotice = async (overrideNotice?: string, overrideEnabled?: boolean) => {
    setSavingNotice(true);
    setNoticeMsg('');
    const noticeToSave = overrideNotice !== undefined ? overrideNotice : siteNotice;
    const enabledToSave = overrideEnabled !== undefined ? overrideEnabled : noticeEnabled;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportEmail,
          creditText,
          googleSearchCxId,
          googleSearchEnabled,
          siteNotice: noticeToSave,
          noticeType,
          noticeEnabled: enabledToSave,
        }),
      });
      if (res.ok) {
        setNoticeMsg('✅ Notice saved and ' + (enabledToSave ? 'published to all users!' : 'hidden (disabled).'));
      } else {
        setNoticeMsg('❌ Failed to save notice.');
      }
    } catch {
      setNoticeMsg('❌ Server error.');
    } finally {
      setSavingNotice(false);
      setTimeout(() => setNoticeMsg(''), 4000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    if (newPassword.length < 6) {
      setPasswordMsg('❌ Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('❌ Passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supportEmail, creditText, googleSearchCxId, googleSearchEnabled,
          adminPassword: newPassword,
        }),
      });
      if (res.ok) {
        setPasswordMsg('✅ Password changed successfully! Please log in again.');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        setPasswordMsg('❌ Failed to update password.');
      }
    } catch (e) {
      setPasswordMsg('❌ Server error.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (e) {
      setLoginError('Server error. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsAuthenticated(false);
    setChannels([]);
  };

  // Channels CRUD handlers
  const handleOpenAddChannel = () => {
    setEditingChannel(null);
    setChannelId(`ch_${Date.now()}`);
    setChannelName('');
    setChannelCategory('Sports');
    setChannelUrl('');
    setChannelLogoUrl('');
    setShowChannelForm(true);
  };

  const handleOpenEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setChannelId(channel.id);
    setChannelName(channel.name);
    setChannelCategory(channel.category);
    setChannelUrl(channel.url);
    setChannelLogoUrl(channel.logoUrl || '');
    setShowChannelForm(true);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId || !channelName || !channelCategory || !channelUrl) {
      alert('Please fill out all fields.');
      return;
    }
    const payload: Channel = {
      id: channelId,
      name: channelName,
      category: channelCategory,
      url: channelUrl,
      logoUrl: channelLogoUrl,
    };
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowChannelForm(false);
        fetchData();
        alert('Channel saved successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save channel.');
      }
    } catch (e) {
      alert('Error saving channel.');
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this channel?')) return;
    try {
      const res = await fetch(`/api/channels?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Failed to delete channel.');
      }
    } catch (e) {
      alert('Error deleting channel.');
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="card-glass" style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-slate-400 text-sm">Authenticating panel...</span>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="animate-slide-up" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card-glass" style={{ maxWidth: '400px', width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-title text-xl font-bold">Admin Console Access</h2>
              <p className="text-xs text-slate-400 mt-1">Enter password to unlock SBS Stream control panel</p>
            </div>
          </div>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Token / Password</label>
              <input
                type="password"
                placeholder="••••••••••••"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {loginError && <p className="text-xs text-red-400 font-medium mt-1">{loginError}</p>}
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="btn-primary"
              style={{ justifyContent: 'center', width: '100%' }}
            >
              {loggingIn ? 'Verifying...' : 'Unlock Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter channels based on search
  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(channelSearch.toLowerCase()) ||
      c.id.toLowerCase().includes(channelSearch.toLowerCase())
  );

  // ADMIN WORKSPACE SCREEN
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-slide-up">
      
      {/* Workspace Header */}
      <header className="header-glass">
        <div>
          <h2 className="font-title text-xl font-bold">Workspace Administrator</h2>
          <p className="text-xs text-slate-400">Stream control & analytics dashboard — Orvex Research</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchData} 
            disabled={loadingData}
            className="btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            Sync DB
          </button>
          <button 
            onClick={handleLogout} 
            className="btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '13px', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--accent-red)' }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Analytics / Metrics Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '20px' }}>
        {/* Total Channels */}
        <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px' }}>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Channels</h4>
            <p className="font-title text-2xl font-extrabold text-white mt-1">{channels.length}</p>
          </div>
        </div>

        {/* Live Watching Now */}
        <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">🔴 Live Watching Now</h4>
            <p className="font-title text-2xl font-extrabold text-red-400 mt-1">{liveViewers.toLocaleString()}</p>
          </div>
        </div>

        {/* Total Views */}
        <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px' }}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Views</h4>
            <p className="font-title text-2xl font-extrabold text-emerald-400 mt-1">{totalViews.toLocaleString()}</p>
          </div>
        </div>

        {/* Top Channel */}
        <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px' }}>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Top Channel Now</h4>
            <p className="font-title text-sm font-extrabold text-amber-400 mt-1 truncate">{topChannel}</p>
          </div>
        </div>
      </section>

      {/* Tabs Switcher */}
      <section style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)' }}>
        <button
          onClick={() => setActiveTab('channels')}
          style={{
            background: 'none', border: 'none', padding: '16px 24px',
            color: activeTab === 'channels' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'channels' ? '2px solid var(--accent-blue)' : 'none',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'color 0.2s',
          }}
        >
          <Tv className="w-4 h-4 inline mr-2" />Manage Channels ({channels.length})
        </button>
        <button
          onClick={() => setActiveTab('notice')}
          style={{
            background: 'none', border: 'none', padding: '16px 24px',
            color: activeTab === 'notice' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'notice' ? '2px solid var(--accent-blue)' : 'none',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'color 0.2s',
          }}
        >
          <Bell className="w-4 h-4 inline mr-2" />Notice Box
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            background: 'none', border: 'none', padding: '16px 24px',
            color: activeTab === 'settings' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'settings' ? '2px solid var(--accent-blue)' : 'none',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer', transition: 'color 0.2s',
          }}
        >
          <Settings className="w-4 h-4 inline mr-2" />General Settings
        </button>
      </section>

      {/* CHANNELS TAB */}
      {activeTab === 'channels' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '300px', width: '100%' }}>
              <input
                type="text"
                placeholder="Filter by name, category or ID..."
                className="input-field"
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
              />
            </div>
            <button onClick={handleOpenAddChannel} className="btn-primary">
              <Plus className="w-5 h-5" /> Add New Channel
            </button>
          </div>

          {/* Inline Form Add/Edit Channel */}
          {showChannelForm && (
            <div className="card-glass animate-slide-up" style={{ borderColor: 'var(--accent-blue)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="font-title text-base font-bold">
                  {editingChannel ? `Edit Channel: ${editingChannel.name}` : 'Create New Stream Channel'}
                </h3>
                <button onClick={() => setShowChannelForm(false)} className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSaveChannel} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Channel ID</label>
                  <input type="text" className="input-field" value={channelId} onChange={(e) => setChannelId(e.target.value)} disabled={!!editingChannel} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Channel Name</label>
                  <input type="text" className="input-field" placeholder="e.g. ESPN 2 HD" value={channelName} onChange={(e) => setChannelName(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Category</label>
                  <select className="input-field" value={channelCategory} onChange={(e) => setChannelCategory(e.target.value)}>
                    <option value="FIFA World Cup">FIFA World Cup</option>
                    <option value="Sports">Sports</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Movies">Movies</option>
                    <option value="Music">Music</option>
                    <option value="Cartoon">Cartoon</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="News">News</option>
                    <option value="Documentary">Documentary</option>
                    <option value="Pakistan">Pakistan</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Logo Image URL (Optional)</label>
                  <input type="url" className="input-field" placeholder="https://example.com/logo.png" value={channelLogoUrl} onChange={(e) => setChannelLogoUrl(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 1' }} className="md:col-span-4">
                  <label className="text-xs text-slate-400 font-bold uppercase">M3U8 Stream URL</label>
                  <input type="url" className="input-field" placeholder="https://example.com/stream/index.m3u8" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} required />
                </div>
                <div style={{ gridColumn: 'span 1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }} className="md:col-span-4">
                  <button type="button" onClick={() => setShowChannelForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary"><Save className="w-4 h-4" /> Save Channel</button>
                </div>
              </form>
            </div>
          )}

          {/* Channels Table with circular logos */}
          <div className="card-glass" style={{ padding: '0', overflowX: 'auto', border: '1px solid var(--border-glass)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Logo</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Name</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Stream URL</th>
                  <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChannels.slice(0, 200).map((ch) => (
                  <tr key={ch.id} style={{ borderBottom: '1px solid var(--border-glass)' }} className="hover:bg-white/2 cursor-default">
                    <td style={{ padding: '10px 20px' }}>
                      {/* Circular logo */}
                      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ch.logoUrl && !logoErrors[ch.id] ? (
                          <img
                            src={ch.logoUrl}
                            alt={ch.name}
                            onError={() => setLogoErrors(prev => ({ ...prev, [ch.id]: true }))}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {ch.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{ch.name}</td>
                    <td style={{ padding: '12px 20px', fontSize: '12px' }}>
                      <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300 font-medium">{ch.category}</span>
                    </td>
                    <td style={{ padding: '12px 20px', fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {ch.url}
                    </td>
                    <td style={{ padding: '12px 20px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleOpenEditChannel(ch)} className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 flex items-center justify-center cursor-pointer" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteChannel(ch.id)} className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex items-center justify-center cursor-pointer" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredChannels.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No channels found.</div>
            )}
          </div>
        </section>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* General Settings */}
          <div className="card-glass animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 className="font-title text-base font-bold"><Settings className="w-4 h-4 inline mr-2" />Branding & Search Engine</h3>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Support / Contact Email</label>
                  <input type="email" className="input-field" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="orvex.research@gmail.com" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Footer / Credit Text</label>
                  <input type="text" className="input-field" value={creditText} onChange={(e) => setCreditText(e.target.value)} placeholder="Made by Orvex Research" required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Google Custom Search CX ID</label>
                  <input type="text" className="input-field" value={googleSearchCxId} onChange={(e) => setGoogleSearchCxId(e.target.value)} placeholder="e.g. 81a94efacb321045a" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="text-xs text-slate-400 font-bold uppercase">Google Search Integration</label>
                  <select className="input-field" value={googleSearchEnabled ? 'true' : 'false'} onChange={(e) => setGoogleSearchEnabled(e.target.value === 'true')}>
                    <option value="false">Disabled (Local Channel Search Only)</option>
                    <option value="true">Enabled (Channel + Google Web Search)</option>
                  </select>
                </div>

              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <button type="submit" disabled={savingSettings} className="btn-primary">
                  <Save className="w-4 h-4" />{savingSettings ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Password Change Section */}
          <div className="card-glass animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderColor: 'rgba(239,68,68,0.15)' }}>
            <h3 className="font-title text-base font-bold" style={{ color: 'var(--accent-red)' }}>
              <Lock className="w-4 h-4 inline mr-2" />Change Admin Password
            </h3>
            <p className="text-xs text-slate-400">After changing, you will be logged out and must log in with the new password.</p>
            <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="text-xs text-slate-400 font-bold uppercase">New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="text-xs text-slate-400 font-bold uppercase">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'flex-end' }}>
                <div style={{ height: '20px' }}></div>
                <button type="submit" disabled={changingPassword} className="btn-primary" style={{ borderColor: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)' }}>
                  <Lock className="w-4 h-4" />{changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
            {passwordMsg && (
              <p className={`text-sm font-medium ${passwordMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{passwordMsg}</p>
            )}
          </div>
        </section>
      )}

      {/* NOTICE TAB */}
      {activeTab === 'notice' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Notice Management Section */}
          <div className="card-glass animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderColor: 'rgba(251,191,36,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="font-title text-base font-bold" style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {noticeEnabled ? <Bell className="w-4 h-4 inline" /> : <BellOff className="w-4 h-4 inline" />}
                  Site Notice / User Notification
                </h3>
                <p className="text-xs text-slate-400 mt-1">Write a notice that appears to ALL visitors on the homepage. Toggle to publish or hide.</p>
              </div>
              {/* Enable/Disable Toggle */}
              <button
                onClick={() => setNoticeEnabled(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                  background: noticeEnabled ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${noticeEnabled ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: noticeEnabled ? '#34d399' : '#64748b',
                  fontWeight: 700, fontSize: '12px', transition: 'all 0.2s',
                }}
              >
                <span style={{
                  width: 32, height: 18, borderRadius: '9px',
                  background: noticeEnabled ? '#10b981' : 'rgba(255,255,255,0.1)',
                  position: 'relative', display: 'inline-block', transition: 'background 0.2s',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <span style={{
                    position: 'absolute', top: 2, left: noticeEnabled ? 13 : 2,
                    width: 12, height: 12, borderRadius: '50%',
                    background: noticeEnabled ? '#fff' : '#64748b',
                    transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </span>
                {noticeEnabled ? 'Published' : 'Hidden'}
              </button>
            </div>

            {/* Notice type selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-xs text-slate-400 font-bold uppercase">Notice Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(["info", "warning", "success", "urgent"] as const).map(type => {
                  const colors: Record<string, string> = {
                    info: '#3b82f6', warning: '#f59e0b', success: '#10b981', urgent: '#ef4444'
                  };
                  const labels: Record<string, string> = {
                    info: 'ℹ️ Info', warning: '⚠️ Warning', success: '✅ Announcement', urgent: '🔴 Urgent'
                  };
                  const isActive = noticeType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setNoticeType(type)}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: isActive ? `${colors[type]}22` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? colors[type] + '55' : 'rgba(255,255,255,0.1)'}`,
                        color: isActive ? colors[type] : '#64748b',
                      }}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notice text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-xs text-slate-400 font-bold uppercase">Notice Message</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Write your notice here... e.g. 'FIFA World Cup 2026 matches are live now! Watch Argentina vs France at 8PM.'"
                value={siteNotice}
                onChange={(e) => setSiteNotice(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: '80px' }}
              />
              <p className="text-xs text-slate-500">{siteNotice.length}/500 characters</p>
            </div>

            {/* Live Preview */}
            {siteNotice.trim() && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-xs text-slate-400 font-bold uppercase">Preview</label>
                <div style={{
                  background: noticeType === 'info' ? 'linear-gradient(90deg,rgba(37,99,235,0.18),rgba(59,130,246,0.10))' :
                    noticeType === 'warning' ? 'linear-gradient(90deg,rgba(217,119,6,0.18),rgba(245,158,11,0.10))' :
                    noticeType === 'success' ? 'linear-gradient(90deg,rgba(5,150,105,0.18),rgba(16,185,129,0.10))' :
                    'linear-gradient(90deg,rgba(185,28,28,0.22),rgba(239,68,68,0.12))',
                  border: `1px solid ${noticeType === 'info' ? 'rgba(59,130,246,0.35)' : noticeType === 'warning' ? 'rgba(245,158,11,0.35)' : noticeType === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.45)'}`,
                  borderRadius: '10px', padding: '12px 16px',
                  fontSize: '13px', fontWeight: 600,
                  color: noticeType === 'info' ? '#93c5fd' : noticeType === 'warning' ? '#fcd34d' : noticeType === 'success' ? '#6ee7b7' : '#fca5a5',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, opacity: 0.7, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {noticeType === 'info' ? 'ℹ️ Notice' : noticeType === 'warning' ? '⚠️ Warning' : noticeType === 'success' ? '✅ Announcement' : '🔴 Important'}
                  </span>
                  {siteNotice}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              {noticeMsg && (
                <p className={`text-sm font-medium ${noticeMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{noticeMsg}</p>
              )}
              <button
                type="button"
                onClick={async () => {
                  setSiteNotice('');
                  setNoticeEnabled(false);
                  await handleSaveNotice('', false);
                }}
                disabled={savingNotice}
                className="btn-primary"
                style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
              >
                <Trash2 className="w-4 h-4" />Delete Notice
              </button>
              <button
                type="button"
                onClick={() => handleSaveNotice()}
                disabled={savingNotice}
                className="btn-primary"
                style={{ borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}
              >
                <Save className="w-4 h-4" />{savingNotice ? 'Saving...' : noticeEnabled ? 'Save & Publish' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
