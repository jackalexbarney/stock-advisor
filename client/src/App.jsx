import { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import PortfolioView from './components/PortfolioView.jsx';
import WatchlistView from './components/WatchlistView.jsx';
import SettingsView from './components/SettingsView.jsx';

const NAV = [
  { id: 'dashboard', label: 'Today\'s Picks' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'watchlist', label: 'Watchlist' },
  { id: 'settings',  label: 'Settings' },
];

export default function App() {
  const [view, setView] = useState('dashboard');
  const [riskTier, setRiskTier] = useState('moderate');

  return (
    <div className="min-h-screen bg-ink-950 text-ink-300">
      {/* Top nav */}
      <header className="border-b border-ink-700 bg-ink-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"/>
            </svg>
            <span className="font-bold text-white text-sm tracking-tight">Stock Advisor</span>
          </div>
          <nav className="flex gap-1">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setView(n.id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition ${view === n.id ? 'bg-accent/15 text-accent font-semibold' : 'text-ink-400 hover:text-ink-200'}`}>
                {n.label}
              </button>
            ))}
          </nav>
          {/* Risk tier badge */}
          <div className="flex items-center gap-1">
            {['conservative','moderate','aggressive'].map(t => (
              <button key={t} onClick={() => setRiskTier(t)}
                className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded border transition ${riskTier === t ? 'border-accent text-accent bg-accent/10' : 'border-ink-700 text-ink-500 hover:border-ink-500'}`}>
                {t.slice(0,3)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {view === 'dashboard'  && <Dashboard riskTier={riskTier} />}
        {view === 'portfolio'  && <PortfolioView riskTier={riskTier} />}
        {view === 'watchlist'  && <WatchlistView />}
        {view === 'settings'   && <SettingsView riskTier={riskTier} onRiskChange={setRiskTier} />}
      </main>
    </div>
  );
}
