import { Metadata } from 'next';
import { getChannels, getMatches } from '@/lib/db';
import DashboardClient from '@/components/DashboardClient';


// Disable static rendering cache to ensure matches & channels are loaded dynamically in real time
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Live Dashboard - Watch Matches",
  description: "Access the live dashboard to watch ongoing FIFA World Cup 2026 matches and broadcasts.",
  alternates: {
    canonical: '/',
  }
};

export default async function HomePage() {
  try {
    const channels = await getChannels();
    const matches = await getMatches();

    // Strip URLs to keep them hidden and secure from the page source code / initial payload
    // Also filter out channels marked as offline permanently
    const safeChannels = channels
      .filter(c => !c.isOffline)
      .map(({ url, ...safeDetail }) => safeDetail);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "FIFA World Cup 2026 Live",
      "url": "https://fifa26.eu.cc",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://fifa26.eu.cc/matches?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <DashboardClient 
          initialChannels={safeChannels} 
          initialMatches={matches} 
        />
      </>
    );
  } catch (error) {
    console.error('Failed to load homepage data:', error);
    return (
      <div className="card-glass" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 className="font-title text-red-500 font-bold mb-2">Error Loading Dashboard</h2>
        <p className="text-slate-400 text-sm">Failed to connect to the database. Please reload or check your database settings.</p>
      </div>
    );
  }
}
