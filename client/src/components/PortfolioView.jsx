import { useState, useEffect } from 'react';
import axios from 'axios';
import SignalBar from './SignalBar.jsx';

export default function PortfolioView({ riskTier }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`/api/portfolio/analysis?tier=${riskTier}`)
      .then(r => setData(r.data))
      .catch(() => {});
  }, [riskTier]);

  if (!data) return <div className="text-ink-500 text-sm py-12 text-center">Connect your Alpaca account in Settings to see your portfolio.</div>;

  return (
    <div className="space-y-4 fade-in">
      <h1 className="text-lg font-bold text-white">Portfolio</h1>
      {data.positions?.map(p => (
        <div key={p.symbol} className="card card-pad">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-white">{p.symbol}</div>
              <div className="text-xs text-ink-500">{p.qty} shares · avg ${parseFloat(p.avg_entry_price).toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className={`font-bold tnum ${parseFloat(p.unrealized_plpc) >= 0 ? 'bull' : 'bear'}`}>
                {parseFloat(p.unrealized_plpc) >= 0 ? '+' : ''}{(parseFloat(p.unrealized_plpc) * 100).toFixed(2)}%
              </div>
              <div className="text-xs text-ink-500">${parseFloat(p.market_value).toLocaleString()}</div>
            </div>
          </div>
          {p.engineScore?.scores && <SignalBar scores={p.engineScore.scores} />}
        </div>
      ))}
    </div>
  );
}
