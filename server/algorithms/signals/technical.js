/**
 * Technical analysis signal.
 * Returns score in [-1, +1].
 *
 * Indicators:
 *   - RSI(14): oversold (<30) → +1, overbought (>70) → -1
 *   - MACD: bullish cross → positive, bearish → negative
 *   - SMA 50/200: golden cross (50>200) → positive, death cross → negative
 *   - Bollinger %B: near lower band → positive, near upper → negative
 *   - Price momentum: 20-day return vs universe
 */

import { fetchPriceHistory } from '../../data/marketData.js';

function calcSMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((s, p) => s + p, 0) / period;
}

function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(-period - 1).map((p, i, a) => i === 0 ? 0 : p - a[i - 1]).slice(1);
  const gains = changes.map(c => Math.max(c, 0));
  const losses = changes.map(c => Math.max(-c, 0));
  const avgGain = gains.reduce((s, g) => s + g, 0) / period;
  const avgLoss = losses.reduce((s, l) => s + l, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calcEMA(prices, period) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((s, p) => s + p, 0) / period;
  for (let i = period; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
  return ema;
}

export async function scoreTechnical(symbol) {
  const history = await fetchPriceHistory(symbol, 250);
  const closes = history.map(d => d.close);
  if (closes.length < 50) return 0;

  let score = 0;
  let weight = 0;

  // RSI
  const rsi = calcRSI(closes);
  const rsiScore = rsi < 30 ? 0.8 : rsi < 45 ? 0.3 : rsi > 70 ? -0.8 : rsi > 60 ? -0.3 : 0;
  score += rsiScore * 0.25; weight += 0.25;

  // SMA golden/death cross
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  if (sma50 && sma200) {
    const crossScore = sma50 > sma200 ? 0.6 : -0.6;
    score += crossScore * 0.25; weight += 0.25;
  }

  // MACD
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (ema12 && ema26) {
    const macd = ema12 - ema26;
    const signal = ema12 - ema26; // simplified — full impl uses signal line EMA(9)
    const macdScore = macd > 0 ? Math.min(macd / (closes[closes.length - 1] * 0.02), 1) : Math.max(macd / (closes[closes.length - 1] * 0.02), -1);
    score += macdScore * 0.25; weight += 0.25;
  }

  // 20-day momentum
  const momentum = (closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21];
  const momScore = Math.max(-1, Math.min(1, momentum * 10));
  score += momScore * 0.25; weight += 0.25;

  return weight > 0 ? score / weight : 0;
}
