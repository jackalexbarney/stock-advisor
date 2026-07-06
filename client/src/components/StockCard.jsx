import { useState, useEffect } from 'react';
import axios from 'axios';
import MiniChart from './MiniChart.jsx';

export default function StockCard({ rec, action }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get(`/api/watchlist/chart/${rec.symbol}?days=30`)
      .then(r => setHistory(r.data.history ?? []))
      .catch(() => {});
  }, [rec.symbol]);

  const score = rec.consensus ?? 0;
  const pct = Math.round(Math.abs(score) * 100);
  const isUp = action === 'buy';
  const borderColor = isUp ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
  const dotColor = isUp ? '#22c55e' : '#ef4444';

  return (
    <div className="rounded-xl border bg-ink-900 p-3 transition hover:border-ink-600"
      style={{ borderColor }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{rec.symbol}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase`}
              style={{ background: `${dotColor}22`, color: dotColor }}>
              {action === 'buy' ? 'Buy' : 'Sell'}
            </span>
          </div>
          <div className="text-[10px] text-ink-500 mt-0.5">Consensus: {(score * 100).toFixed(0)}%</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tnum" style={{ color: dotColor }}>
            {isUp ? '▲' : '▼'} {pct}
          </div>
          <div className="text-[9px] text-ink-500">signal strength</div>
        </div>
      </div>

      {history.length > 0 && (
        <MiniChart data={history} color={dotColor} />
      )}

      {/* Mini signal dots */}
      {rec.scores && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {Object.entries(rec.scores).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{
                background: val > 0.2 ? '#22c55e' : val < -0.2 ? '#ef4444' : '#6e7681'
              }} />
              <span className="text-[9px] text-ink-500 capitalize">{key.replace(/([A-Z])/g,' $1').trim()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
