import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

const FALLBACK_PASSWORD = process.env.ADMIN_PASSWORD || 'sbsadmin123';
const SESSION_COOKIE_NAME = 'sbs_admin_session';
const SESSION_VALUE = 'sbs_authenticated_session_2026';

// Check if admin is logged in
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = cookie?.value === SESSION_VALUE;
  
  return NextResponse.json({ authenticated: isAuthenticated });
}

// Log in
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const db = await readDb();
    const ADMIN_PASSWORD = db.settings?.adminPassword || FALLBACK_PASSWORD;

    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true, message: 'Logged in successfully' });
      
      // Set secure HttpOnly cookie
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: SESSION_VALUE,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, message: 'Incorrect password' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }
}

// Log out
export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    maxAge: 0, // expire immediately
    path: '/',
  });
  return response;
}
