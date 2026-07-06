/**
 * Technical analysis signal — returns score in [-1, +1].
 *
 * Indicators:
 *   - RSI(14): oversold <30 → bullish, overbought >70 → bearish
 *   - MACD with proper signal line (EMA9 of MACD line)
 *   - SMA 50/200 golden/death cross
 *   - Bollinger Bands %B
 *   - 20-day price momentum
 */

import { fetchPriceHistory } from '../../data/marketData.js';

function calcSMA(prices, period) {
  if (prices.length < period) return null;
  return prices.slice(-period).reduce((s, p) => s + p, 0) / period;
}

function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = prices.slice(-(period + 1)).map((p, i, a) => i === 0 ? 0 : p - a[i - 1]).slice(1);
  const gains = changes.map(c => Math.max(c, 0));
  const losses = changes.map(c => Math.max(-c, 0));
  const avgGain = gains.reduce((s, g) => s + g, 0) / period;
  const avgLoss = losses.reduce((s, l) => s + l, 0) / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calcEMA(prices, period) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((s, p) => s + p, 0) / period;
  for (let i = period; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
  return ema;
}

function calcMACDLine(prices) {
  // Returns array of MACD values (EMA12 - EMA26) over time
  if (prices.length < 26) return [];
  const k12 = 2 / 13, k26 = 2 / 27;
  let ema12 = prices.slice(0, 12).reduce((s, p) => s + p, 0) / 12;
  let ema26 = prices.slice(0, 26).reduce((s, p) => s + p, 0) / 26;
  const macdLine = [];
  for (let i = 26; i < prices.length; i++) {
    ema12 = prices[i] * k12 + ema12 * (1 - k12);
    ema26 = prices[i] * k26 + ema26 * (1 - k26);
    macdLine.push(ema12 - ema26);
  }
  return macdLine;
}

function calcBollingerB(prices, period = 20) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const sma = slice.reduce((s, p) => s + p, 0) / period;
  const std = Math.sqrt(slice.reduce((s, p) => s + (p - sma) ** 2, 0) / period);
  if (std === 0) return 0.5;
  const upper = sma + 2 * std;
  const lower = sma - 2 * std;
  const current = prices[prices.length - 1];
  return (current - lower) / (upper - lower); // 0 = at lower band, 1 = at upper
}

export async function scoreTechnical(symbol) {
  const history = await fetchPriceHistory(symbol, 250);
  const closes = history.map(d => d.close);
  if (closes.length < 50) return 0;

  let score = 0;

  // RSI (weight 0.25)
  const rsi = calcRSI(closes);
  const rsiScore = rsi < 30 ? 0.9 : rsi < 40 ? 0.4 : rsi < 50 ? 0.1 :
                   rsi > 70 ? -0.9 : rsi > 65 ? -0.4 : rsi > 55 ? -0.1 : 0;
  score += rsiScore * 0.25;

  // SMA golden/death cross (weight 0.25)
  const sma50  = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  if (sma50 && sma200) {
    const spread = (sma50 - sma200) / sma200; // % above/below
    const crossScore = Math.max(-1, Math.min(1, spread * 20));
    score += crossScore * 0.25;
  }

  // MACD with proper signal line (weight 0.25)
  const macdLine = calcMACDLine(closes);
  if (macdLine.length >= 9) {
    const k9 = 2 / 10;
    let signalLine = macdLine.slice(0, 9).reduce((s, v) => s + v, 0) / 9;
    for (let i = 9; i < macdLine.length; i++) {
      signalLine = macdLine[i] * k9 + signalLine * (1 - k9);
    }
    const macdVal = macdLine[macdLine.length - 1];
    const histogram = macdVal - signalLine;
    const price = closes[closes.length - 1];
    const normalizedHistogram = histogram / (price * 0.01); // normalize by 1% of price
    score += Math.max(-1, Math.min(1, normalizedHistogram)) * 0.25;
  }

  // Bollinger %B (weight 0.15): low %B = oversold = bullish
  const bolB = calcBollingerB(closes);
  if (bolB !== null) {
    const bolScore = bolB < 0.2 ? 0.7 : bolB < 0.35 ? 0.3 : bolB > 0.8 ? -0.7 : bolB > 0.65 ? -0.3 : 0;
    score += bolScore * 0.15;
  }

  // 20-day momentum (weight 0.10)
  if (closes.length >= 21) {
    const momentum = (closes[closes.length - 1] - closes[closes.length - 21]) / closes[closes.length - 21];
    score += Math.max(-1, Math.min(1, momentum * 8)) * 0.10;
  }

  return Math.max(-1, Math.min(1, score));
}
