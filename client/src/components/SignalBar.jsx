const SIGNAL_LABELS = {
  technical: 'Technical',
  fundamental: 'Fundamental',
  sentiment: 'Sentiment',
  options: 'Options Flow',
  relativeStrength: 'Rel. Strength',
};

export default function SignalBar({ scores }) {
  if (!scores) return null;
  return (
    <div className="space-y-2">
      {Object.entries(scores).map(([key, val]) => {
        const pct = Math.round(((val + 1) / 2) * 100);
        const color = val > 0.2 ? '#22c55e' : val < -0.2 ? '#ef4444' : '#6e7681';
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="text-[10px] text-ink-400 w-28 flex-shrink-0">{SIGNAL_LABELS[key] ?? key}</span>
            <div className="flex-1 h-1.5 rounded bg-ink-700 overflow-hidden">
              <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[10px] tnum w-8 text-right" style={{ color }}>
              {val >= 0 ? '+' : ''}{(val * 100).toFixed(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
