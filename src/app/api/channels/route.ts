import { NextRequest, NextResponse } from 'next/server';
import { getChannels, saveChannels, Channel } from '@/lib/db';

const SESSION_COOKIE_NAME = 'sbs_admin_session';
const SESSION_VALUE = 'sbs_authenticated_session_2026';

function checkAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return cookie?.value === SESSION_VALUE;
}

// GET: returns all channels *without* stream URLs (safe details only)
export async function GET(req: NextRequest) {
  try {
    const channels = await getChannels();
    const isAdminUser = checkAdmin(req);
    
    // Admin user gets full channel details (including raw URLs) to manage in the admin panel.
    const safeChannels = channels.map(c => {
      const { url, ...safeDetail } = c;
      return isAdminUser ? c : safeDetail;
    }).filter(c => isAdminUser || !c.isOffline);

    return NextResponse.json(safeChannels);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch channels' }, { status: 500 });
  }
}

// POST: Add or update a channel (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const channelData: Channel = await req.json();
    if (!channelData.id || !channelData.name || !channelData.category || !channelData.url) {
      return NextResponse.json({ error: 'Missing required channel parameters' }, { status: 400 });
    }

    const channels = await getChannels();
    const index = channels.findIndex(c => c.id === channelData.id);

    if (index > -1) {
      // Update
      channels[index] = { ...channels[index], ...channelData };
    } else {
      // Add new
      channels.push(channelData);
    }

    await saveChannels(channels);
    return NextResponse.json({ success: true, channel: channelData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save channel' }, { status: 500 });
  }
}

// DELETE: Delete a channel (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
    }

    const channels = await getChannels();
    const filtered = channels.filter(c => c.id !== id);

    if (filtered.length === channels.length) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    await saveChannels(filtered);
    return NextResponse.json({ success: true, message: 'Channel deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete channel' }, { status: 500 });
  }
}
