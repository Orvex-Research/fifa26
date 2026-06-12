import { NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/db';

// Public stats endpoint — returns aggregate totals only (no sensitive data)
export async function GET() {
  try {
    const analytics = await getAnalytics();
    return NextResponse.json({
      totalViews: analytics.totalViews,
      totalLive: analytics.totalLive,
    });
  } catch {
    return NextResponse.json({ totalViews: 0, totalLive: 0 });
  }
}
