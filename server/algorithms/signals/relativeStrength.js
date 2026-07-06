/**
 * Relative strength signal — returns score in [-1, +1].
 * Compares stock's return vs S&P 500 (SPY) over the past ~90 trading days.
 */

import { fetchPriceHistory } from '../../data/marketData.js';

// Return over the full available window (first→last close)
function windowReturn(history) {
  if (!history || history.length < 2) return 0;
  const closes = history.map(d => d.close);
  const start = closes[0];
  const end   = closes[closes.length - 1];
  return start ? (end - start) / start : 0;
}

export async function scoreRelativeStrength(symbol, sectorEtf = null) {
  // 180 calendar days ≈ 90 trading days
  const [stockHist, spyHist] = await Promise.all([
    fetchPriceHistory(symbol, 180),
    fetchPriceHistory('SPY', 180),
  ]);

  if (!stockHist.length || !spyHist.length) return 0;

  const stockReturn = windowReturn(stockHist);
  const spyReturn   = windowReturn(spyHist);
  const alpha = stockReturn - spyReturn;

  // Scale: +10% alpha → ~+0.5 score, -10% → ~-0.5
  return Math.max(-1, Math.min(1, alpha * 5));
}
