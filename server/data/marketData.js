/**
 * Market data fetcher via yahoo-finance2.
 */

import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// In-memory cache: { key -> { value, expires } }
const cache = new Map();
function fromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.value;
  return null;
}
function toCache(key, value, ttlMs = 60 * 60 * 1000) { // 1-hour default
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

export async function fetchPriceHistory(symbol, days = 250) {
  const key = `hist:${symbol}:${days}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
    const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await yf.historical(symbol, { period1, period2: new Date(), interval: '1d' });
    const data = result
      .filter(d => d.close != null)
      .map(d => ({ date: d.date.toISOString().split('T')[0], close: d.close }));
    toCache(key, data);
    return data;
  } catch (e) {
    console.warn(`[marketData] fetchPriceHistory failed for ${symbol}:`, e.message);
    return [];
  }
}

export async function fetchFundamentals(symbol) {
  const key = `fund:${symbol}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
    const summary = await yf.quoteSummary(symbol, {
      modules: ['financialData', 'defaultKeyStatistics', 'recommendationTrend'],
    });

    const fin   = summary.financialData ?? {};
    const stats = summary.defaultKeyStatistics ?? {};
    const trend = summary.recommendationTrend?.trend?.[0] ?? {};

    const data = {
      currentPrice:  fin.currentPrice  ?? null,
      targetPrice:   fin.targetMeanPrice ?? null,
      epsGrowth:     stats.earningsQuarterlyGrowth ?? null,
      revenueGrowth: fin.revenueGrowth  ?? null,
      forwardPE:     stats.forwardPE    ?? null,
      sectorPE:      null, // approximated below per sector ETF
      analystBuy:    (trend.strongBuy ?? 0) + (trend.buy ?? 0),
      analystSell:   (trend.strongSell ?? 0) + (trend.sell ?? 0),
    };

    toCache(key, data);
    return data;
  } catch (e) {
    console.warn(`[marketData] fetchFundamentals failed for ${symbol}:`, e.message);
    return null;
  }
}

export async function fetchOptionsData(symbol) {
  const key = `opts:${symbol}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
    const result = await yf.options(symbol);
    const chain = result.options?.[0];
    if (!chain) return null;

    const calls = chain.calls ?? [];
    const puts  = chain.puts  ?? [];
    const totalCallVol = calls.reduce((s, c) => s + (c.volume ?? 0), 0);
    const totalPutVol  = puts.reduce((s,  p) => s + (p.volume ?? 0), 0);
    const putCallRatio = totalCallVol > 0 ? totalPutVol / totalCallVol : 1;

    const avgOI = calls.reduce((s, c) => s + (c.openInterest ?? 0), 0) / Math.max(calls.length, 1);
    const unusualCallVolume = calls.some(c => (c.volume ?? 0) > avgOI * 3);
    const unusualPutVolume  = puts.some(p  => (p.volume ?? 0) > avgOI * 3);

    const data = { putCallRatio, unusualCallVolume, unusualPutVolume };
    toCache(key, data, 30 * 60 * 1000); // 30-min cache for options
    return data;
  } catch (e) {
    console.warn(`[marketData] fetchOptionsData failed for ${symbol}:`, e.message);
    return null;
  }
}

export async function fetchQuote(symbol) {
  try {
    return await yf.quote(symbol);
  } catch {
    return null;
  }
}
