import { Metadata } from 'next';
import Link from 'next/link';
import { Play, Trophy, Globe, Zap, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Live - Stream Matches Free",
  description: "Watch FIFA World Cup 2026 live streams, real-time match schedules, and HD broadcasts. Get full access to matches, channels, and live score updates.",
  alternates: {
    canonical: '/',
  }
};

export default function HomePage() {
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
      <div className="animate-fade-in flex flex-col gap-12 pb-24">
        
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden mt-4 mx-4 md:mx-6 border border-white/10" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Background Gradient */}
          <div className="absolute inset-0 z-0" style={{
            background: 'radial-gradient(circle at center, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 1) 100%)',
          }} />
          
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center gap-6">
            <div className="inline-block px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs md:text-sm font-bold tracking-wider uppercase mb-2">
              The Biggest Event in Football History
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white font-title leading-tight drop-shadow-lg">
              Experience the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">World Cup 2026</span> Live
            </h1>
            <p className="text-base md:text-xl text-slate-300 max-w-2xl mx-auto mb-4 drop-shadow">
              Watch every match, goal, and unforgettable moment in crystal-clear HD. Access live TV channels globally, 100% free.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <Link href="/live" className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg hover:from-blue-500 hover:to-indigo-500 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                <Play className="w-6 h-6 fill-white" />
                Watch Live TV Now
              </Link>
              <Link href="/matches" className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all hover:scale-105 backdrop-blur-sm">
                <Trophy className="w-6 h-6 text-yellow-400" />
                View Match Schedule
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-4 md:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold font-title text-white mb-3">Why Watch With Us?</h2>
            <p className="text-slate-400">Everything you need for the ultimate football experience.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <div className="card-glass p-8 flex flex-col items-center text-center gap-4 hover:scale-[1.02] transition-transform cursor-default">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-2">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-title">Ultra HD Streaming</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Enjoy buffer-free, crystal-clear broadcasts across multiple global networks. Never miss a crucial moment.</p>
            </div>
            
            <div className="card-glass p-8 flex flex-col items-center text-center gap-4 hover:scale-[1.02] transition-transform cursor-default">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-2">
                <Globe className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-title">Global Channels</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Access sports networks from Bangladesh, USA, Brazil, Europe, and more. Find the broadcast in your language.</p>
            </div>

            <div className="card-glass p-8 flex flex-col items-center text-center gap-4 hover:scale-[1.02] transition-transform cursor-default">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-2">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white font-title">Live TV Dashboard</h3>
              <p className="text-slate-400 text-sm leading-relaxed">A modern, easy-to-use interface to switch between matches and networks instantly with our interactive player.</p>
            </div>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="px-4 md:px-6 max-w-4xl mx-auto">
          <div className="card-glass p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-white font-title mb-6 border-b border-white/10 pb-4">
              About the FIFA World Cup 2026
            </h2>
            <div className="space-y-6 text-slate-300 leading-relaxed">
              <p>
                The 2026 FIFA World Cup will be the 23rd FIFA World Cup, the quadrennial international men's soccer championship contested by the national teams of the member associations of FIFA. The tournament will be jointly hosted by 16 cities in three North American countries: Canada, Mexico, and the United States.
              </p>
              <p>
                For the first time, the tournament will expand to include 48 teams, an increase from the 32-team format used since 1998. This expansion brings more thrilling matches, unexpected rivalries, and a spectacular celebration of global football.
              </p>
              <p>
                Whether you're looking for the opening ceremony, group stage drama, or the grand finale, our platform provides comprehensive live coverage. We aggregate top sports channels so you can focus on the game.
              </p>
              <div className="mt-8 text-center pt-4">
                <Link href="/live" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600/20 text-blue-400 font-bold hover:bg-blue-600/30 transition-colors">
                  Go to Live Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
