/**
 * Fundamental analysis signal.
 * Returns score in [-1, +1].
 *
 * Uses yf.quote() data (no crumb required):
 *   - EPS forward vs trailing growth
 *   - 52-week range position (contrarian — near low = bullish)
 *   - Analyst rating (averageAnalystRating: 1=Strong Buy, 5=Strong Sell)
 *   - Forward P/E (absolute level — high PE = growth stock premium, penalize extremes)
 */

import { fetchFundamentals } from '../../data/marketData.js';

export async function scoreFundamental(symbol) {
  const data = await fetchFundamentals(symbol);
  if (!data) return 0;

  let score = 0;
  let usedWeights = 0;

  // ── EPS growth (forward vs trailing) ─────────────────────────────────
  // Positive = EPS expected to grow → bullish
  if (data.epsGrowth != null) {
    const s = Math.max(-1, Math.min(1, data.epsGrowth * 3));
    score += s * 0.35;
    usedWeights += 0.35;
  }

  // ── 52-week range position (contrarian) ──────────────────────────────
  // 0 = at 52-wk low (oversold, bullish), 1 = at 52-wk high (extended, neutral/bearish)
  // Map: 0→+0.5, 0.5→0, 1→-0.3  (we're mildly bullish on dips, not strongly bearish on highs)
  if (data.range52 != null) {
    const s = Math.max(-0.5, 0.5 - data.range52);
    score += s * 0.30;
    usedWeights += 0.30;
  }

  // ── Analyst rating ────────────────────────────────────────────────────
  // averageAnalystRating string: "1.8 - Buy", "3.0 - Hold", "4.2 - Underperform"
  // Numeric: 1 = Strong Buy, 5 = Strong Sell → map to [-1, +1]
  if (data.analystRating) {
    const num = parseFloat(data.analystRating);
    if (!isNaN(num)) {
      const s = Math.max(-1, Math.min(1, (3 - num) / 2)); // 1→+1, 3→0, 5→-1
      score += s * 0.35;
      usedWeights += 0.35;
    }
  }

  // Normalize by weights actually used (graceful when some data is missing)
  return usedWeights > 0 ? Math.max(-1, Math.min(1, score / usedWeights)) : 0;
}
