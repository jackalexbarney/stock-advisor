/**
 * Reddit data fetcher.
 * Uses snoowrap (Reddit API wrapper) or falls back to JSON endpoint.
 * Targets: r/investing, r/wallstreetbets, r/stocks
 */

import axios from 'axios';

const SUBREDDITS = ['investing', 'wallstreetbets', 'stocks'];
const TICKER_REGEX = /\b([A-Z]{2,5})\b/g;

// Common false-positive tickers to exclude
const EXCLUDE = new Set(['I','A','AI','IT','AT','TO','GO','BE','DO','OR','IF','ON','SO','US','CEO','CFO','CTO','IPO','ETF','EPS','GDP','SEC','FDA','FED']);

export async function fetchRedditMentions(symbol) {
  const posts = [];
  for (const sub of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${symbol}&sort=top&t=day&limit=25`;
      const { data } = await axios.get(url, {
        timeout: 8000,
        headers: { 'User-Agent': 'StockAdvisor/1.0' },
      });
      const items = data?.data?.children?.map(c => c.data) ?? [];
      posts.push(...items.filter(p => {
        const text = `${p.title} ${p.selftext}`;
        return text.toUpperCase().includes(symbol);
      }));
    } catch {}
  }
  return posts;
}

export async function fetchTrendingTickers() {
  try {
    const url = 'https://www.reddit.com/r/wallstreetbets/hot.json?limit=50';
    const { data } = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'StockAdvisor/1.0' },
    });

    const posts = data?.data?.children?.map(c => c.data) ?? [];
    const counts = {};
    for (const post of posts) {
      const text = `${post.title} ${post.selftext ?? ''}`;
      const matches = text.match(TICKER_REGEX) ?? [];
      for (const ticker of matches) {
        if (!EXCLUDE.has(ticker)) counts[ticker] = (counts[ticker] ?? 0) + 1;
      }
    }

    return Object.entries(counts)
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ticker]) => ticker);
  } catch {
    return [];
  }
}
