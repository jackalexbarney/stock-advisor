import { useState, useEffect } from 'react';
import axios from 'axios';
import MiniChart from './MiniChart.jsx';

const POPULAR = ['AAPL','MSFT','NVDA','TSLA','META','GOOGL','AMZN','COIN','PLTR','AMD'];

export default function WatchlistView() {
  const [charts, setCharts] = useState({});

  useEffect(() => {
    POPULAR.forEach(sym => {
      axios.get(`/api/watchlist/chart/${sym}?days=30`)
        .then(r => setCharts(prev => ({ ...prev, [sym]: r.data.history ?? [] })))
        .catch(() => {});
    });
  }, []);

  return (
    <div className="fade-in">
      <h1 className="text-lg font-bold text-white mb-4">Watchlist</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {POPULAR.map(sym => {
          const hist = charts[sym] ?? [];
          const last = hist[hist.length - 1]?.close;
          const first = hist[0]?.close;
          const change = first && last ? ((last - first) / first * 100) : null;
          return (
            <div key={sym} className="card card-pad">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-sm">{sym}</span>
                {change != null && (
                  <span className={`text-xs tnum ${change >= 0 ? 'bull' : 'bear'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                )}
              </div>
              {last && <div className="tnum text-xs text-ink-400 mb-1">${last.toFixed(2)}</div>}
              <MiniChart data={hist} height={36} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
