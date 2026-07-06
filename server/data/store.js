/**
 * Simple file-based store for recommendations and learned weights.
 * Production upgrade: swap for PostgreSQL or Redis.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function saveRecommendations(recs) {
  await ensureDir();
  const file = path.join(DATA_DIR, `recs-${recs.date}.json`);
  await fs.writeFile(file, JSON.stringify(recs, null, 2));
  // Also write "latest"
  await fs.writeFile(path.join(DATA_DIR, 'recs-latest.json'), JSON.stringify(recs, null, 2));
}

export async function loadLatestRecommendations() {
  try {
    const file = path.join(DATA_DIR, 'recs-latest.json');
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

export async function loadWeights(tier) {
  try {
    const file = path.join(DATA_DIR, `weights-${tier}.json`);
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

export async function saveWeights(tier, weights) {
  await ensureDir();
  const file = path.join(DATA_DIR, `weights-${tier}.json`);
  await fs.writeFile(file, JSON.stringify(weights, null, 2));
}
