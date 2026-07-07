/**
 * File-based store for recommendations and learned weights.
 * Persists to GitHub after each engine run so data survives Render restarts.
 *
 * Recommendation files: data/recs-YYYY-MM-DD.json
 *   Each file contains { date, conservative, moderate, aggressive }
 *   where each tier has { buys, holds, sells, allScores }.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_REPO   = 'jackalexbarney/stock-advisor';
const GITHUB_BRANCH = 'main';
const GH_DATA_DIR   = 'data'; // files stored at repo root /data/

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// ── GitHub helpers ────────────────────────────────────────────────────────

async function githubGetSha(filePath) {
  if (!GITHUB_TOKEN) return null;
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    return j.sha ?? null;
  } catch { return null; }
}

async function githubWrite(filePath, content, message) {
  if (!GITHUB_TOKEN) return;
  try {
    const sha = await githubGetSha(filePath);
    const body = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch: GITHUB_BRANCH,
    };
    if (sha) body.sha = sha;
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    if (!r.ok) {
      const err = await r.text();
      console.warn('[store] GitHub write failed:', r.status, err.slice(0, 200));
    }
  } catch (e) {
    console.warn('[store] GitHub write error:', e.message);
  }
}

async function githubRead(filePath) {
  try {
    const r = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`,
      { cache: 'no-store' }
    );
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

// ── Recommendations ──────────────────────────────────────────────────────

export async function saveRecommendations(recs) {
  await ensureDir();
  const json = JSON.stringify(recs, null, 2);
  const dateName = `recs-${recs.date}.json`;

  // Write locally
  await fs.writeFile(path.join(DATA_DIR, dateName), json);
  await fs.writeFile(path.join(DATA_DIR, 'recs-latest.json'), json);

  // Persist to GitHub asynchronously (don't block engine completion)
  const msg = `auto: daily recs ${recs.date}`;
  Promise.all([
    githubWrite(`${GH_DATA_DIR}/${dateName}`, json, msg),
    githubWrite(`${GH_DATA_DIR}/recs-latest.json`, json, msg),
  ]).catch(e => console.warn('[store] GitHub persist error:', e.message));
}

/**
 * Load the latest recommendations, optionally filtered to one tier.
 * Falls back to GitHub if local file is missing (e.g. after Render restart).
 */
export async function loadLatestRecommendations(tier = null) {
  try {
    let raw;
    try {
      raw = JSON.parse(await fs.readFile(path.join(DATA_DIR, 'recs-latest.json'), 'utf8'));
    } catch {
      // Local file missing — try GitHub (happens after Render restart)
      const text = await githubRead(`${GH_DATA_DIR}/recs-latest.json`);
      if (!text) return null;
      raw = JSON.parse(text);
      // Cache locally so subsequent reads are fast
      await ensureDir();
      await fs.writeFile(path.join(DATA_DIR, 'recs-latest.json'), text).catch(() => {});
    }
    return tier ? { date: raw.date, ...raw[tier] } : raw;
  } catch {
    return null;
  }
}

/**
 * Load recommendations for a specific date.
 * Falls back to GitHub if local file is missing.
 */
export async function loadRecommendationsByDate(date, tier = null) {
  try {
    let raw;
    const dateName = `recs-${date}.json`;
    try {
      raw = JSON.parse(await fs.readFile(path.join(DATA_DIR, dateName), 'utf8'));
    } catch {
      const text = await githubRead(`${GH_DATA_DIR}/${dateName}`);
      if (!text) return null;
      raw = JSON.parse(text);
      await ensureDir();
      await fs.writeFile(path.join(DATA_DIR, dateName), text).catch(() => {});
    }
    return tier ? { date: raw.date, ...raw[tier] } : raw;
  } catch {
    return null;
  }
}

/**
 * List all available recommendation dates, newest first.
 * Falls back to GitHub API listing if no local files exist.
 */
export async function listRecommendationDates() {
  try {
    await ensureDir();
    const files = await fs.readdir(DATA_DIR);
    const local = files
      .filter(f => f.match(/^recs-\d{4}-\d{2}-\d{2}\.json$/))
      .map(f => f.replace('recs-', '').replace('.json', ''))
      .sort()
      .reverse();
    if (local.length > 0) return local;
  } catch {}

  // No local files — list from GitHub
  if (!GITHUB_TOKEN) return [];
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${GH_DATA_DIR}?ref=${GITHUB_BRANCH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    if (!r.ok) return [];
    const items = await r.json();
    return items
      .filter(f => f.name.match(/^recs-\d{4}-\d{2}-\d{2}\.json$/))
      .map(f => f.name.replace('recs-', '').replace('.json', ''))
      .sort()
      .reverse();
  } catch { return []; }
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
  await fs.writeFile(
    path.join(DATA_DIR, `weights-${tier}.json`),
    JSON.stringify(weights, null, 2)
  );
}
