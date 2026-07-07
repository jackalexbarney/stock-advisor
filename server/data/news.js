/**
 * News headline fetcher.
 * Primary: NewsAPI (requires NEWSAPI_KEY env var)
 * Fallback: Yahoo Finance search (no key needed)
 */

import axios from 'axios';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

export async function fetchNewsHeadlines(symbol) {
  const results = [];

  // Primary: NewsAPI
  if (NEWSAPI_KEY) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(symbol)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWSAPI_KEY}`;
      const { data } = await axios.get(url, { timeout: 8000 });
      const articles = data?.articles ?? [];
      results.push(...articles.map(a => ({
        title: a.title ?? '',
        description: a.description ?? '',
        source: 'newsapi',
      })));
    } catch {}
  }

  // Fallback / supplement: Yahoo Finance news search
  try {
    const search = await yf.search(symbol, { newsCount: 15, quotesCount: 0 });
    const news = search?.news ?? [];
    results.push(...news.map(n => ({
      title: n.title ?? '',
      description: '',
      source: 'yahoo',
    })));
  } catch {}

  return results;
}
