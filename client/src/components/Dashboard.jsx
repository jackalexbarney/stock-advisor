import { useState, useEffect } from 'react';
import axios from 'axios';
import StockCard from './StockCard.jsx';
import SignalBar from './SignalBar.jsx';

export default function Dashboard({ riskTier }) {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/recommendations')
      .then(r => setRecs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24 text-ink-500 text-sm">Loading today's picks…</div>;
  if (!recs?.buys) return (
    <div className="card card-pad text-center py-16">
      <div className="text-ink-500 text-sm mb-2">No recommendations yet</div>
      <div className="text-ink-600 text-xs">Engine runs at 6:30 AM ET on trading days</div>
    </div>
  );

  return (
    <div className="space-y-6 fade-in">
      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <h1 className="text-lg font-bold text-white">Today's Picks</h1>
          <span className="text-xs text-ink-500">{recs.date} · {riskTier} profile</span>
        </div>

        {/* Buy recommendations */}
        <div className="label-xs mb-3">Strong Buy</div>
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {recs.buys.slice(0, 6).map(r => <StockCard key={r.symbol} rec={r} action="buy" />)}
        </div>

        {/* Sell signals */}
        {recs.sells?.length > 0 && (
          <>
            <div className="label-xs mb-3">Consider Selling</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {recs.sells.map(r => <StockCard key={r.symbol} rec={r} action="sell" />)}
            </div>
          </>
        )}
      </div>

      {/* Signal breakdown */}
      {recs.buys[0] && (
        <div className="card card-pad">
          <div className="label-xs mb-3">Algorithm Breakdown — {recs.buys[0].symbol}</div>
          <SignalBar scores={recs.buys[0].scores} />
        </div>
      )}

      <p className="text-[10px] text-ink-600 text-center">
        Recommendations are algorithmic signals, not financial advice. Past performance does not guarantee future results.
      </p>
    </div>
  );
}
