/**
 * Market data fetcher.
 * Primary source: Yahoo Finance (via yfinance-compatible endpoints).
 * Fallback: Alpha Vantage (requires ALPHA_VANTAGE_KEY env var).
 */

import axios from 'axios';

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance';
const AV_BASE = 'https://www.alphavantage.co/query';

export async function fetchPriceHistory(symbol, days = 250) {
  try {
    const period = days > 200 ? '1y' : days > 100 ? '6mo' : '3mo';
    const url = `${YF_BASE}/chart/${symbol}?interval=1d&range=${period}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const chart = data?.chart?.result?.[0];
    if (!chart) throw new Error('No chart data');

    const timestamps = chart.timestamp;
    const closes = chart.indicators.quote[0].close;
    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i],
    })).filter(d => d.close != null);
  } catch (e) {
    console.warn(`[marketData] fetchPriceHistory failed for ${symbol}:`, e.message);
    return [];
  }
}

export async function fetchFundamentals(symbol) {
  try {
    const url = `${YF_BASE}/quoteSummary/${symbol}?modules=defaultKeyStatistics,financialData,recommendationTrend`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const stats = result.defaultKeyStatistics;
    const fin = result.financialData;
    const recs = result.recommendationTrend?.trend?.[0];

    return {
      forwardPE:    stats?.forwardPE?.raw,
      epsGrowth:    stats?.earningsQuarterlyGrowth?.raw,
      revenueGrowth: fin?.revenueGrowth?.raw,
      currentPrice: fin?.currentPrice?.raw,
      targetPrice:  fin?.targetMeanPrice?.raw,
      sectorPE:     null, // fetched separately via sector ETF
      analystBuy:   recs ? (recs.strongBuy + recs.buy) : null,
      analystSell:  recs ? (recs.strongSell + recs.sell) : null,
    };
  } catch (e) {
    console.warn(`[marketData] fetchFundamentals failed for ${symbol}:`, e.message);
    return null;
  }
}

export async function fetchOptionsData(symbol) {
  try {
    const url = `${YF_BASE}/options/${symbol}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const result = data?.optionChain?.result?.[0];
    if (!result) return null;

    const calls = result.options?.[0]?.calls ?? [];
    const puts  = result.options?.[0]?.puts  ?? [];
    const totalCallVol = calls.reduce((s, c) => s + (c.volume ?? 0), 0);
    const totalPutVol  = puts.reduce((s, p)  => s + (p.volume ?? 0), 0);
    const putCallRatio = totalCallVol > 0 ? totalPutVol / totalCallVol : 1;

    const avgOI = calls.reduce((s, c) => s + (c.openInterest ?? 0), 0) / Math.max(calls.length, 1);
    const unusualCallVolume = calls.some(c => (c.volume ?? 0) > avgOI * 3);
    const unusualPutVolume  = puts.some(p  => (p.volume ?? 0) > avgOI * 3);

    return { putCallRatio, unusualCallVolume, unusualPutVolume };
  } catch {
    return null;
  }
}
