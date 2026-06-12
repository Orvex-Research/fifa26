import { Metadata } from 'next';
import { getMatches, getChannels } from '@/lib/db';
import MatchesClient from '@/components/MatchesClient';

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Match Schedule & Results",
  description: "View the full FIFA World Cup 2026 match schedule, results, and find out where to watch live.",
  alternates: {
    canonical: '/matches',
  }
};

export default async function MatchesPage() {
  try {
    const matches = await getMatches();
    const channels = await getChannels();

    // Strip URLs to keep them secured
    const safeChannels = channels.map(({ url, ...safeDetail }) => safeDetail);

    return (
      <MatchesClient 
        initialMatches={matches} 
        channels={safeChannels} 
      />
    );
  } catch (error) {
    console.error('Failed to load matches page:', error);
    return (
      <div className="card-glass" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 className="font-title text-red-500 font-bold mb-2">Error Loading Match Schedule</h2>
        <p className="text-slate-400 text-sm">Failed to retrieve matches. Please check your data connection.</p>
      </div>
    );
  }
}
