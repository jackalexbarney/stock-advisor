/**
 * Multi-signal consensus recommendation engine.
 *
 * Signals:
 *   1. Technical  — RSI, MACD, SMA crossovers, Bollinger Bands, momentum
 *   2. Fundamental — 52-wk range, 3-month momentum, 200d SMA distance (price-history derived)
 *   3. Sentiment   — Reddit NLP + Yahoo Finance news search
 *   4. Options flow — put/call ratio, unusual activity
 *   5. Relative strength — vs S&P 500 over 180 calendar days
 *
 * Each signal returns a score in [-1, +1].
 * Signals are tier-independent; only the weighted average differs per tier.
 * Buy when consensus > BUY_THRESHOLD, sell when < SELL_THRESHOLD.
 */

import { scoreTechnical } from './signals/technical.js';
import { scoreFundamental } from './signals/fundamental.js';
import { scoreSentiment } from './signals/sentiment.js';
import { scoreOptionsFlow } from './signals/options.js';
import { scoreRelativeStrength } from './signals/relativeStrength.js';
import { getStockUniverse } from '../data/universe.js';
import { saveRecommendations, loadLatestRecommendations, loadWeights } from '../data/store.js';

const BUY_THRESHOLD  =  0.28;
const SELL_THRESHOLD = -0.25;

// Default signal weights per risk tier
export const DEFAULT_WEIGHTS = {
  conservative: { technical: 0.15, fundamental: 0.40, sentiment: 0.10, options: 0.10, relativeStrength: 0.25 },
  moderate:     { technical: 0.25, fundamental: 0.25, sentiment: 0.20, options: 0.15, relativeStrength: 0.15 },
  aggressive:   { technical: 0.20, fundamental: 0.10, sentiment: 0.35, options: 0.20, relativeStrength: 0.15 },
};

/**
 * Fetch all 5 raw signal scores for a symbol.
 * These are tier-independent — apply weights afterward.
 */
async function fetchSignals(symbol) {
  const [technical, fundamental, sentiment, options, relativeStrength] = await Promise.allSettled([
    scoreTechnical(symbol),
    scoreFundamental(symbol),
    scoreSentiment(symbol),
    scoreOptionsFlow(symbol),
    scoreRelativeStrength(symbol),
  ]);

  return {
    technical:        technical.status        === 'fulfilled' ? technical.value        : 0,
    fundamental:      fundamental.status      === 'fulfilled' ? fundamental.value      : 0,
    sentiment:        sentiment.status        === 'fulfilled' ? sentiment.value        : 0,
    options:          options.status          === 'fulfilled' ? options.value          : 0,
    relativeStrength: relativeStrength.status === 'fulfilled' ? relativeStrength.value : 0,
  };
}

/** Apply tier weights to a raw signal score object → consensus score. */
function applyWeights(scores, weights) {
  return Object.entries(weights).reduce((sum, [key, w]) => sum + (scores[key] ?? 0) * w, 0);
}

/**
 * Score a single stock for a given tier.
 * Used by the /score/:symbol endpoint (real-time, single stock).
 */
export async function scoreStock(symbol, tier = 'moderate') {
  const weights = await loadWeights(tier) ?? DEFAULT_WEIGHTS[tier];
  const scores  = await fetchSignals(symbol);
  const consensus = applyWeights(scores, weights);
  return { symbol, consensus, scores, weights, tier };
}

/** Run up to `limit` async tasks concurrently. */
async function pLimit(items, fn, limit = 5) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]).catch(() => null);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Build buy/hold/sell lists for one tier from pre-fetched signal scores.
 */
function buildTierRecs(rawScores, weights) {
  const scored = rawScores
    .map(({ symbol, scores }) => ({
      symbol,
      scores,
      weights,
      consensus: applyWeights(scores, weights),
    }))
    .sort((a, b) => b.consensus - a.consensus);

  return {
    buys:      scored.filter(r => r.consensus >= BUY_THRESHOLD).slice(0, 10),
    holds:     scored.filter(r => r.consensus >= SELL_THRESHOLD && r.consensus < BUY_THRESHOLD).slice(0, 20),
    sells:     scored.filter(r => r.consensus < SELL_THRESHOLD).slice(0, 5),
    allScores: scored,
  };
}

/**
 * Run the full engine: score all stocks once, apply all three tier weightings.
 * Stored result includes conservative, moderate, and aggressive recommendations.
 */
export async function runDailyEngine() {
  const universe = await getStockUniverse();
  const date = new Date().toISOString().split('T')[0];

  // Fetch raw signals for all stocks (API calls happen here, rate-limited by queue)
  const rawResults = await pLimit(
    universe,
    async (symbol) => {
      const scores = await fetchSignals(symbol);
      return { symbol, scores };
    },
    5,
  );

  const valid = rawResults.filter(Boolean);

  // Load any learned weights, fall back to defaults
  const [wCon, wMod, wAgg] = await Promise.all([
    loadWeights('conservative').then(w => w ?? DEFAULT_WEIGHTS.conservative),
    loadWeights('moderate').then(w => w ?? DEFAULT_WEIGHTS.moderate),
    loadWeights('aggressive').then(w => w ?? DEFAULT_WEIGHTS.aggressive),
  ]);

  const result = {
    date,
    conservative: buildTierRecs(valid, wCon),
    moderate:     buildTierRecs(valid, wMod),
    aggressive:   buildTierRecs(valid, wAgg),
  };

  await saveRecommendations(result);

  const m = result.moderate;
  console.log(`[engine] ${date}: ${m.buys.length} buys, ${m.sells.length} sells (moderate)`);
  return result;
}

export async function updateWeights(tier = 'moderate') {
  console.log(`[engine] Weight update for ${tier} tier (stub — implement after first week of data)`);
}
