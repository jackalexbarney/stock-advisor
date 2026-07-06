/**
 * Social/news sentiment signal.
 * Returns score in [-1, +1].
 *
 * Sources:
 *   - Reddit: r/investing, r/wallstreetbets, r/stocks
 *   - News headlines via NewsAPI
 *
 * NLP: Simple VADER-style lexicon scoring (positive/negative word counts + boosters).
 * Weighted by post score (upvotes) and recency.
 */

import { fetchRedditMentions } from '../../data/reddit.js';
import { fetchNewsHeadlines } from '../../data/news.js';

// Simplified sentiment lexicon
const POSITIVE = new Set(['buy', 'bullish', 'moon', 'strong', 'beat', 'surge', 'growth', 'profit', 'outperform', 'upgrade', 'record', 'breakout', 'long']);
const NEGATIVE = new Set(['sell', 'bearish', 'crash', 'weak', 'miss', 'drop', 'loss', 'underperform', 'downgrade', 'short', 'dump', 'fraud', 'investigation']);

function scoreText(text) {
  const words = text.toLowerCase().split(/\W+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE.has(w)) pos++;
    if (NEGATIVE.has(w)) neg++;
  }
  const total = pos + neg;
  return total === 0 ? 0 : (pos - neg) / total;
}

export async function scoreSentiment(symbol) {
  const [redditPosts, news] = await Promise.allSettled([
    fetchRedditMentions(symbol),
    fetchNewsHeadlines(symbol),
  ]);

  let totalScore = 0;
  let totalWeight = 0;

  if (redditPosts.status === 'fulfilled') {
    for (const post of redditPosts.value ?? []) {
      const postScore = scoreText(`${post.title} ${post.selftext ?? ''}`);
      const weight = Math.log1p(post.score ?? 1); // weight by upvotes
      totalScore += postScore * weight;
      totalWeight += weight;
    }
  }

  if (news.status === 'fulfilled') {
    for (const article of news.value ?? []) {
      const articleScore = scoreText(`${article.title} ${article.description ?? ''}`);
      totalScore += articleScore * 2; // news weighted 2x vs individual posts
      totalWeight += 2;
    }
  }

  return totalWeight > 0 ? Math.max(-1, Math.min(1, totalScore / totalWeight)) : 0;
}
