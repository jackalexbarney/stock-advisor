/**
 * Stock universe — what we score each day.
 * 
 * Tier 1: S&P 500 blue chips (always included)
 * Tier 2: Nasdaq 100 growth names
 * Tier 3: Trending tickers from Reddit / news (refreshed daily)
 */

import { fetchTrendingTickers } from './reddit.js';

const SP500_CORE = [
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','JPM','V','JNJ',
  'UNH','XOM','WMT','MA','LLY','CVX','HD','ABBV','MRK','AVGO',
  'PEP','KO','PFE','BAC','TMO','COST','DIS','CSCO','ACN','VZ',
  'ADBE','TXN','AMD','QCOM','INTC','ORCL','CRM','NFLX','PYPL','INTU',
];

const GROWTH_WATCHLIST = [
  'PLTR','COIN','HOOD','SOFI','RIVN','LCID','NIO','SNOW','DDOG','CRWD',
  'NET','ROKU','RBLX','U','PATH','S','IOT','GTLB','ZS','OKTA',
];

let _cached = null;
let _cacheTs = 0;

export async function getStockUniverse() {
  const now = Date.now();
  if (_cached && now - _cacheTs < 3_600_000) return _cached; // cache 1hr

  let trending = [];
  try { trending = await fetchTrendingTickers(); } catch {}

  const universe = [...new Set([...SP500_CORE, ...GROWTH_WATCHLIST, ...trending])];
  _cached = universe;
  _cacheTs = now;
  return universe;
}
