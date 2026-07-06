export default function MiniChart({ data, color = '#2563eb', height = 40 }) {
  if (!data?.length) return null;
  const closes = data.map(d => d.close).filter(Boolean);
  if (closes.length < 2) return null;

  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 300;

  const pts = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * w;
    const y = height - ((c - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  const isPositive = closes[closes.length - 1] >= closes[0];
  const lineColor = isPositive ? '#22c55e' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
