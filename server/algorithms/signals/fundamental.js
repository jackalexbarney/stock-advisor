/**
 * Fundamental analysis signal.
 * Returns score in [-1, +1].
 *
 * Factors:
 *   - Forward P/E vs sector median (cheaper = positive)
 *   - EPS growth rate (YoY)
 *   - Revenue growth rate (YoY)
 *   - Analyst consensus target vs current price (upside)
 *   - Profit margin trend
 */

import { fetchFundamentals } from '../../data/marketData.js';

export async function scoreFundamental(symbol) {
  const data = await fetchFundamentals(symbol);
  if (!data) return 0;

  let score = 0;

  // Analyst upside
  if (data.targetPrice && data.currentPrice) {
    const upside = (data.targetPrice - data.currentPrice) / data.currentPrice;
    score += Math.max(-1, Math.min(1, upside * 4)) * 0.30;
  }

  // EPS growth
  if (data.epsGrowth != null) {
    score += Math.max(-1, Math.min(1, data.epsGrowth * 5)) * 0.25;
  }

  // Revenue growth
  if (data.revenueGrowth != null) {
    score += Math.max(-1, Math.min(1, data.revenueGrowth * 5)) * 0.20;
  }

  // P/E vs sector (lower relative P/E = more attractive)
  if (data.forwardPE && data.sectorPE) {
    const peRatio = data.sectorPE / Math.max(data.forwardPE, 1);
    score += Math.max(-0.5, Math.min(0.5, (peRatio - 1) * 0.5)) * 0.25;
  }

  return Math.max(-1, Math.min(1, score));
}
