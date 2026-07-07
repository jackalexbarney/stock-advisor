/**
 * File-based store for recommendations and learned weights.
 *
 * Recommendation files: data/recs-YYYY-MM-DD.json
 *   Each file contains { date, conservative, moderate, aggressive }
 *   where each tier has { buys, holds, sells, allScores }.
 *
 * "latest" symlink: data/recs-latest.json → always today's run.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.join(__dirname, '../../data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ── Recommendations ──────────────────────────────────────────────────────

export async function saveRecommendations(recs) {
  await ensureDir();
  const json = JSON.stringify(recs, null, 2);
  await fs.writeFile(path.join(DATA_DIR, `recs-${recs.date}.json`), json);
  await fs.writeFile(path.join(DATA_DIR, 'recs-latest.json'), json);
}

/**
 * Load the latest recommendations, optionally filtered to one tier.
 * Returns null if no data exists yet.
 */
export async function loadLatestRecommendations(tier = null) {
  try {
    const raw = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'recs-latest.json'), 'utf8'));
    return tier ? { date: raw.date, ...raw[tier] } : raw;
  } catch {
    return null;
  }
}

/**
 * Load recommendations for a specific date.
 */
export async function loadRecommendationsByDate(date, tier = null) {
  try {
    const raw = JSON.parse(await fs.readFile(path.join(DATA_DIR, `recs-${date}.json`), 'utf8'));
    return tier ? { date: raw.date, ...raw[tier] } : raw;
  } catch {
    return null;
  }
}

/**
 * List all available recommendation dates, newest first.
 */
export async function listRecommendationDates() {
  try {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);
    return files
      .filter(f => f.match(/^recs-\d{4}-\d{2}-\d{2}\.json$/))
      .map(f => f.replace('recs-', '').replace('.json', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// ── Learned weights ───────────────────────────────────────────────────────

export async function loadWeights(tier) {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, `weights-${tier}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export async function saveWeights(tier, weights) {
  await ensureDir();
  await fs.writeFile(path.join(DATA_DIR, `weights-${tier}.json`), JSON.stringify(weights, null, 2));
}
