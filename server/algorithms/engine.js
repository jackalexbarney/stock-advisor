/**
 * Multi-signal consensus recommendation engine.
 *
 * Signals:
 *   1. Technical  — RSI, MACD, SMA crossovers, Bollinger Bands, momentum
 *   2. Fundamental — P/E vs sector, EPS growth, revenue trend, analyst target
 *   3. Sentiment   — Reddit (r/investing, r/wallstreetbets, r/stocks) NLP score
 *   4. Options flow — unusual activity, IV rank, put/call ratio
 *   5. Relative strength — vs S&P 500 and sector ETF
 *
 * Each signal returns a score in [-1, +1].
 * Weighted average by risk tier → consensus score.
 * Buy when consensus > BUY_THRESHOLD, sell when < SELL_THRESHOLD.
 *
 * Self-learning: after N days, compare prediction vs actual return.
 * Adjust signal weights via simple gradient step.
 */

import { scoreTechnical } from './signals/technical.js';
import { scoreFundamental } from './signals/fundamental.js';
import { scoreSentiment } from './signals/sentiment.js';
import { scoreOptionsFlow } from './signals/options.js';
import { scoreRelativeStrength } from './signals/relativeStrength.js';
import { getStockUniverse } from '../data/universe.js';
import { saveRecommendations, loadWeights, saveWeights } from '../data/store.js';
import { getAlpacaClient } from '../data/alpaca.js';

const BUY_THRESHOLD = 0.35;
const SELL_THRESHOLD = -0.25;

// Default signal weights per risk tier
const DEFAULT_WEIGHTS = {
  conservative: { technical: 0.15, fundamental: 0.40, sentiment: 0.10, options: 0.10, relativeStrength: 0.25 },
  moderate:     { technical: 0.25, fundamental: 0.25, sentiment: 0.20, options: 0.15, relativeStrength: 0.15 },
  aggressive:   { technical: 0.20, fundamental: 0.10, sentiment: 0.35, options: 0.20, relativeStrength: 0.15 },
};

export async function scoreStock(symbol, tier = 'moderate') {
  const weights = await loadWeights(tier) ?? DEFAULT_WEIGHTS[tier];

  const [technical, fundamental, sentiment, options, relativeStrength] = await Promise.allSettled([
    scoreTechnical(symbol),
    scoreFundamental(symbol),
    scoreSentiment(symbol),
    scoreOptionsFlow(symbol),
    scoreRelativeStrength(symbol),
  ]);

  const scores = {
    technical:      technical.status === 'fulfilled' ? technical.value : 0,
    fundamental:    fundamental.status === 'fulfilled' ? fundamental.value : 0,
    sentiment:      sentiment.status === 'fulfilled' ? sentiment.value : 0,
    options:        options.status === 'fulfilled' ? options.value : 0,
    relativeStrength: relativeStrength.status === 'fulfilled' ? relativeStrength.value : 0,
  };

  const consensus = Object.entries(weights).reduce((sum, [key, w]) => sum + (scores[key] ?? 0) * w, 0);

  return { symbol, consensus, scores, weights, tier };
}

export async function runDailyEngine() {
  const universe = await getStockUniverse();
  const tiers = ['conservative', 'moderate', 'aggressive'];

  const results = await Promise.all(
    universe.map(symbol => scoreStock(symbol, 'moderate').catch(() => null))
  );

  const valid = results.filter(Boolean).sort((a, b) => b.consensus - a.consensus);

  const recommendations = {
    date: new Date().toISOString().split('T')[0],
    buys:  valid.filter(r => r.consensus >= BUY_THRESHOLD).slice(0, 10),
    holds: valid.filter(r => r.consensus >= SELL_THRESHOLD && r.consensus < BUY_THRESHOLD).slice(0, 20),
    sells: valid.filter(r => r.consensus < SELL_THRESHOLD).slice(0, 5),
    allScores: valid,
  };

  await saveRecommendations(recommendations);
  console.log(`[engine] ${recommendations.buys.length} buys, ${recommendations.sells.length} sells generated`);
  return recommendations;
}

/** 
 * Self-learning: compare stored predictions vs actual price returns.
 * Nudge weights toward signals that were most accurate.
 * Called weekly after market close.
 */
export async function updateWeights(tier = 'moderate') {
  // TODO: load stored predictions, compute accuracy per signal,
  // gradient-step weights, clamp to [0.05, 0.60], normalize to sum=1.
  console.log(`[engine] Weight update for ${tier} tier (stub — implement after first week of data)`);
}
