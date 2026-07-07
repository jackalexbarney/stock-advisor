/**
 * Market data fetcher via yahoo-finance2.
 * Serial request queue (1.1s gap) to stay under Yahoo Finance rate limits.
 * 
 * NOTE: yf.quoteSummary() and yf.options() require the Yahoo Finance "crumb"
 * cookie, which gets rate-limited on shared-IP environments. We use yf.quote()
 * and yf.historical() which use different endpoints (no crumb needed).
 */

import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ── Serial request queue — 1100ms between Yahoo Finance calls ─────────────
let _lastAt = 0;
let _q = Promise.resolve();
function enqueue(fn) {
  const p = _q.then(async () => {
    const gap = 1100 - (Date.now() - _lastAt);
    if (gap > 0) await new Promise(r => setTimeout(r, gap));
    _lastAt = Date.now();
    return fn();
  });
  _q = p.catch(() => {});
  return p;
}

// ── Retry with exponential backoff on 429/crumb errors ───────────────────
async function yfCall(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await enqueue(fn);
    } catch (err) {
      const is429 = err?.message?.includes('429') ||
                    err?.message?.includes('crumb') ||
                    err?.status === 429;
      if (is429 && i < attempts - 1) {
        await new Promise(r => setTimeout(r, 4000 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
}

// ── In-memory cache ───────────────────────────────────────────────────────
const cache = new Map();
function fromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.value;
  return null;
}
function toCache(key, value, ttlMs) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

const TTL_HIST  = 6  * 60 * 60 * 1000; // 6h  — daily bars
const TTL_FUND  = 24 * 60 * 60 * 1000; // 24h — fundamentals
const TTL_OPTS  =      60 * 60 * 1000; // 1h  — options

export async function fetchPriceHistory(symbol, days = 250) {
  const key = `hist:${symbol}:${days}`;
  const hit = fromCache(key);
  if (hit) return hit;

  try {
    const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await yfCall(() =>
      yf.historical(symbol, { period1, period2: new Date(), interval: '1d' })
    );
    const data = result
      .filter(d => d.close != null)
      .map(d => ({ date: d.date.toISOString().split('T')[0], close: d.close }));
    toCache(key, data, TTL_HIST);
    return data;
  } catch (e) {
    console.warn(`[marketData] fetchPriceHistory failed for ${symbol}:`, e.message);
    return [];
  }
}

/**
 * Fundamentals via yf.quote() — uses /v7/finance/quote endpoint (no crumb needed).
 * Fields available: regularMarketPrice, forwardPE, trailingPE, priceToBook,
 * epsForwardAnnual, epsTrailingTwelveMonths, fiftyTwoWeekHigh, fiftyTwoWeekLow,
 * averageAnalystRating, marketCap.
 */
export async function fetchFundamentals(symbol) {
  const key = `fund:${symbol}`;
  const hit = fromCache(key);
  if (hit) return hit;

  try {
    const q = await yfCall(() => yf.quote(symbol));

    const epsForward  = q.epsForwardAnnual  ?? null;
    const epsTrailing = q.epsTrailingTwelveMonths ?? null;
    const epsGrowth = (epsForward != null && epsTrailing != null && Math.abs(epsTrailing) > 0.01)
      ? (epsForward - epsTrailing) / Math.abs(epsTrailing)
      : null;

    const high52  = q.fiftyTwoWeekHigh ?? null;
    const low52   = q.fiftyTwoWeekLow  ?? null;
    const current = q.regularMarketPrice ?? null;
    const range52 = (high52 && low52 && high52 !== low52)
      ? (current - low52) / (high52 - low52)   // 0=at 52-wk low, 1=at 52-wk high
      : null;

    const data = {
      currentPrice:  current,
      targetPrice:   null,         // not available via quote endpoint
      epsGrowth,
      revenueGrowth: null,         // not available via quote endpoint
      forwardPE:     q.forwardPE   ?? null,
      trailingPE:    q.trailingPE  ?? null,
      sectorPE:      null,
      range52,                     // 52-week position [0, 1] — lower = more upside
      analystRating: q.averageAnalystRating ?? null,  // e.g. "1.8 - Buy"
    };

    toCache(key, data, TTL_FUND);
    return data;
  } catch (e) {
    console.warn(`[marketData] fetchFundamentals failed for ${symbol}:`, e.message);
    return null;
  }
}

/**
 * Options data. Uses yf.options() which requires the crumb — may fail on
 * rate-limited IPs. Score returns 0 on failure (graceful degradation).
 */
export async function fetchOptionsData(symbol) {
  const key = `opts:${symbol}`;
  const hit = fromCache(key);
  if (hit) return hit;

  try {
    const result = await yfCall(() => yf.options(symbol));
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
    toCache(key, data, TTL_OPTS);
    return data;
  } catch (e) {
    console.warn(`[marketData] fetchOptionsData failed for ${symbol}:`, e.message);
    return null;
  }
}

export async function fetchQuote(symbol) {
  try {
    return await yfCall(() => yf.quote(symbol));
  } catch {
    return null;
  }
}
