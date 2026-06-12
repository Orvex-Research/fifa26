import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings, AppSettings } from '@/lib/db';

const SESSION_COOKIE_NAME = 'sbs_admin_session';
const SESSION_VALUE = 'sbs_authenticated_session_2026';

function checkAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  return cookie?.value === SESSION_VALUE;
}

// GET: Returns current settings
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST: Updates settings (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!checkAdmin(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const newSettings: AppSettings = await req.json();
    if (!newSettings.supportEmail || !newSettings.creditText) {
      return NextResponse.json({ error: 'Support email and credit text are required' }, { status: 400 });
    }

    // Preserve existing settings if new ones are missing (specifically for featuredMatchId which might be added later)
    const existingSettings = await getSettings();
    const finalSettings = {
      ...existingSettings,
      ...newSettings,
    };

    await saveSettings(finalSettings);
    return NextResponse.json({ success: true, settings: finalSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save settings' }, { status: 500 });
  }
}
