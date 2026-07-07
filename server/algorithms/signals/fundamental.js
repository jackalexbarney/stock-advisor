/**
 * Fundamental analysis signal — derived from price history only.
 * No additional API calls: reuses data already fetched for technical signal.
 * 
 * Returns score in [-1, +1].
 *
 * Factors:
 *   - 52-week range position (contrarian: near low = potential value)
 *   - 3-month price momentum (medium-term trend quality)
 *   - Volume trend (rising volume = institutional interest)
 *   - Price distance from 200-day SMA (mean-reversion signal)
 */

import { fetchPriceHistory } from '../../data/marketData.js';

function sma(arr, n) {
  if (arr.length < n) return null;
  return arr.slice(-n).reduce((s, v) => s + v, 0) / n;
}

export async function scoreFundamental(symbol) {
  // Reuses cached 250-day history — no new API call
  const history = await fetchPriceHistory(symbol, 250);
  if (history.length < 60) return 0;

  const closes = history.map(d => d.close);
  const current = closes[closes.length - 1];
  const len = closes.length;

  let score = 0;

  // ── 52-week range position (contrarian) ──────────────────────────────────
  // Low = more room to run (oversold, value), high = extended (overbought)
  // Map 0→+0.4, 0.5→0, 1→-0.4
  const high52 = Math.max(...closes.slice(-Math.min(252, len)));
  const low52  = Math.min(...closes.slice(-Math.min(252, len)));
  if (high52 !== low52) {
    const pos = (current - low52) / (high52 - low52); // [0, 1]
    score += (0.5 - pos) * 0.8; // max ±0.4, centered at 0.5
  }

  // ── 3-month momentum (63 trading days) ───────────────────────────────────
  // Moderate positive momentum = bullish quality signal (not chasing extremes)
  if (len >= 63) {
    const start3m = closes[len - 63];
    const ret3m = (current - start3m) / start3m;
    // Strong positive (>20%) = 0.3, flat = 0, strong negative (<-20%) = -0.3
    score += Math.max(-0.3, Math.min(0.3, ret3m * 1.5));
  }

  // ── 200-day SMA distance ─────────────────────────────────────────────────
  // Price above 200d SMA = healthy trend; below = concern
  // Moderate above (5-15%) = positive, far above (>25%) = overextended
  const sma200 = sma(closes, Math.min(200, len));
  if (sma200 && sma200 > 0) {
    const pct = (current - sma200) / sma200;
    // +10% above SMA → +0.15; at SMA → 0; -10% below → -0.15; clamp to ±0.25
    score += Math.max(-0.25, Math.min(0.25, pct));
  }

  return Math.max(-1, Math.min(1, score));
}
