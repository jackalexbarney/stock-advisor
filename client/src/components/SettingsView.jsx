export default function SettingsView({ riskTier, onRiskChange }) {
  return (
    <div className="space-y-6 fade-in max-w-lg">
      <h1 className="text-lg font-bold text-white">Settings</h1>

      <div className="card card-pad space-y-4">
        <div className="label-xs">Risk Profile</div>
        {['conservative','moderate','aggressive'].map(t => (
          <button key={t} onClick={() => onRiskChange(t)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition text-left ${riskTier === t ? 'border-accent bg-accent/10' : 'border-ink-700 hover:border-ink-500'}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${riskTier === t ? 'bg-accent' : 'bg-ink-600'}`} />
            <div>
              <div className="text-sm font-semibold text-white capitalize">{t}</div>
              <div className="text-[11px] text-ink-500">
                {t === 'conservative' && 'Blue chips, fundamentals-first, low volatility'}
                {t === 'moderate' && 'Balanced signals, growth + value mix'}
                {t === 'aggressive' && 'High momentum, sentiment-driven, smaller caps'}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="card card-pad space-y-3">
        <div className="label-xs">Alpaca Integration</div>
        <p className="text-xs text-ink-400">Add your Alpaca API keys to connect paper or live trading. Keys are stored only in your environment variables.</p>
        <div className="space-y-2">
          <input placeholder="ALPACA_KEY_ID" className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm text-ink-300 outline-none focus:border-accent" type="text" />
          <input placeholder="ALPACA_SECRET_KEY" className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm text-ink-300 outline-none focus:border-accent" type="password" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="paper" defaultChecked className="accent-accent" />
            <label htmlFor="paper" className="text-xs text-ink-400">Paper trading mode (recommended to start)</label>
          </div>
        </div>
        <button className="px-4 py-2 bg-accent hover:bg-accent-dim text-white text-sm font-semibold rounded-lg transition">
          Save Connection
        </button>
      </div>
    </div>
  );
}
