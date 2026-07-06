/**
 * Options flow signal.
 * Returns score in [-1, +1].
 *
 * Factors:
 *   - Put/call ratio: low (calls dominate) → bullish; high → bearish
 *   - IV rank: high IV → note premium selling opportunity
 *   - Unusual options activity: large sweeps vs open interest
 */

import { fetchOptionsData } from '../../data/marketData.js';

export async function scoreOptionsFlow(symbol) {
  try {
    const data = await fetchOptionsData(symbol);
    if (!data) return 0;

    let score = 0;

    // Put/call ratio: below 0.7 = bullish, above 1.2 = bearish
    if (data.putCallRatio != null) {
      const pcScore = data.putCallRatio < 0.5 ? 0.8
        : data.putCallRatio < 0.7 ? 0.4
        : data.putCallRatio < 1.0 ? 0.1
        : data.putCallRatio < 1.2 ? -0.3
        : -0.7;
      score += pcScore * 0.50;
    }

    // Unusual call activity
    if (data.unusualCallVolume) score += 0.3;
    if (data.unusualPutVolume) score -= 0.3;

    return Math.max(-1, Math.min(1, score));
  } catch {
    return 0;
  }
}
