import fs from 'fs';
import path from 'path';

export interface Channel {
  id: string;
  name: string;
  category: string;
  url: string;
  logoUrl?: string;
  views?: number;
  isOffline?: boolean;
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  time: string; // ISO String
  status: 'Upcoming' | 'Live' | 'Ended';
  channelId: string;
  stage: string;
}

export interface AppSettings {
  supportEmail: string;
  creditText: string;
  googleSearchCxId: string;
  googleSearchEnabled: boolean;
  featuredMatchId?: string;  // Which match to show in the countdown
  featuredChannelName?: string; // Channel name for the featured match
  adminPassword?: string; // Custom admin password
  siteNotice?: string;   // Public notice shown to all users
  noticeType?: 'info' | 'warning' | 'success' | 'urgent'; // Notice style
  noticeEnabled?: boolean; // Toggle notice visibility
}

interface DbData {
  channels: Channel[];
  matches: Match[];
  settings?: AppSettings;
}

const LOCAL_DB_PATH = path.join(process.cwd(), 'src', 'data', 'db.json');

// Helper to check if Vercel KV is configured
function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Low-level fetch wrapper for Vercel KV REST API
async function kvRequest(action: string, args: any[] = []): Promise<any> {
  const url = `${process.env.KV_REST_API_URL}/${action}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vercel KV API Error: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.result;
}

// Read database
export async function readDb(): Promise<DbData> {
  if (isKvConfigured()) {
    try {
      const channelsRaw = await kvRequest('get', ['live_tv_channels']);
      const matchesRaw = await kvRequest('get', ['live_tv_matches']);
      const settingsRaw = await kvRequest('get', ['live_tv_settings']);

      const channels: Channel[] = channelsRaw ? JSON.parse(channelsRaw) : [];
      const matches: Match[] = matchesRaw ? JSON.parse(matchesRaw) : [];
      const settings: AppSettings | undefined = settingsRaw ? JSON.parse(settingsRaw) : undefined;

      // If KV is empty but we have local seed data, seed the KV once
      if (channels.length === 0 && fs.existsSync(LOCAL_DB_PATH)) {
        const fileContent = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
        const localData: DbData = JSON.parse(fileContent);
        await writeDb(localData);
        return localData;
      }

      return { channels, matches, settings };
    } catch (e) {
      console.error('Failed to read from Vercel KV, falling back to local file:', e);
    }
  }

  // Local JSON fallback (or if Vercel KV failed)
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const fileContent = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(fileContent) as DbData;
    }
  } catch (e) {
    console.error('Failed to read local DB:', e);
  }

  return { channels: [], matches: [] };
}

// Write database
export async function writeDb(data: DbData): Promise<void> {
  if (isKvConfigured()) {
    try {
      await kvRequest('set', ['live_tv_channels', JSON.stringify(data.channels)]);
      await kvRequest('set', ['live_tv_matches', JSON.stringify(data.matches)]);
      if (data.settings) {
        await kvRequest('set', ['live_tv_settings', JSON.stringify(data.settings)]);
      }
      return;
    } catch (e) {
      console.error('Failed to write to Vercel KV, writing to local file:', e);
    }
  }

  // Local file writing
  try {
    const dataDir = path.dirname(LOCAL_DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write local DB:', e);
    throw e;
  }
}

// Helper methods
export async function getChannels(): Promise<Channel[]> {
  const db = await readDb();
  return db.channels;
}

export async function saveChannels(channels: Channel[]): Promise<void> {
  const db = await readDb();
  db.channels = channels;
  await writeDb(db);
}

export async function getMatches(): Promise<Match[]> {
  const db = await readDb();
  return db.matches;
}

export async function saveMatches(matches: Match[]): Promise<void> {
  const db = await readDb();
  db.matches = matches;
  await writeDb(db);
}

export const DEFAULT_SETTINGS: AppSettings = {
  supportEmail: 'orvex.research@gmail.com',
  creditText: 'Made by Orvex Research',
  googleSearchCxId: '',
  googleSearchEnabled: false,
  featuredMatchId: '',
  featuredChannelName: '',
  siteNotice: '',
  noticeType: 'info',
  noticeEnabled: false,
};

export async function getSettings(): Promise<AppSettings> {
  const db = await readDb();
  return db.settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await readDb();
  db.settings = { ...db.settings, ...settings };
  await writeDb(db);
}

// ---------------------------------------------------------
// REAL-TIME ANALYTICS TRACKING (IN-MEMORY)
// ---------------------------------------------------------

interface ActiveSession {
  lastSeen: number;
  channelId: string;
}

// Memory mapping of sessionId -> ActiveSession
const activeSessions = new Map<string, ActiveSession>();

export async function pingSession(sessionId: string, channelId: string) {
  activeSessions.set(sessionId, {
    lastSeen: Date.now(),
    channelId,
  });
}

export async function getAnalytics() {
  const now = Date.now();
  let totalLive = 0;
  const channelCounts: Record<string, number> = {};

  // Clean up old sessions (older than 10 seconds)
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 10000) {
      activeSessions.delete(id);
    } else {
      totalLive++;
      channelCounts[session.channelId] = (channelCounts[session.channelId] || 0) + 1;
    }
  }

  const db = await readDb();
  const totalViews = db.channels.reduce((sum, ch) => sum + (ch.views || 0), 0);

  return {
    totalLive,
    totalViews,
    channelCounts,
  };
}

export async function incrementChannelViews(channelId: string) {
  const db = await readDb();
  const channel = db.channels.find(c => c.id === channelId);
  if (channel) {
    channel.views = (channel.views || 0) + 1;
    await writeDb(db);
  }
}
