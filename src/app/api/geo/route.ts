import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    // Get client IP from various headers (works behind proxies/CDN)
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip'); // Cloudflare
    
    let ip = cfIp || (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || '8.8.8.8';
    
    // Strip IPv6 prefix if present
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    // Try primary HTTPS API first (ipapi.co allows HTTPS on free tier, 30k req/month limit)
    // Or we use ip-api.com over HTTP if testing locally
    let geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
      next: { revalidate: 3600 },
    });

    if (!geoRes.ok) {
      // Fallback to HTTP ip-api if allowed
      geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,timezone,city`, {
        next: { revalidate: 3600 },
      });
    }

    if (!geoRes.ok) throw new Error('Geo fetch failed');

    const geo = await geoRes.json();

    // Handle both API response formats
    const isIpApiCo = geo.error === undefined && geo.country_name !== undefined;
    const isIpApiCom = geo.status === 'success';

    if (!isIpApiCo && !isIpApiCom) {
      // Fallback: return unknown
      return NextResponse.json({
        ip,
        country: 'Unknown',
        countryCode: 'XX',
        timezone: 'UTC',
        city: '',
      });
    }

    return NextResponse.json({
      ip,
      country: isIpApiCo ? geo.country_name : geo.country,
      countryCode: isIpApiCo ? geo.country : geo.countryCode,
      timezone: geo.timezone,
      city: geo.city,
    });
  } catch (e) {
    console.error('Geo API error:', e);
    return NextResponse.json({
      ip: 'unknown',
      country: 'Unknown',
      countryCode: 'XX',
      timezone: 'UTC',
      city: '',
    });
  }
}
