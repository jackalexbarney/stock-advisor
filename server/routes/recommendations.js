import { Router } from 'express';
import { loadLatestRecommendations, loadRecommendationsByDate, listRecommendationDates } from '../data/store.js';
import { scoreStock, runDailyEngine } from '../algorithms/engine.js';

export const recommendationsRouter = Router();

let _engineRunning = false;

// GET /api/recommendations?tier=moderate
// Returns today's picks for the specified tier (conservative/moderate/aggressive)
recommendationsRouter.get('/', async (req, res) => {
  try {
    const tier = req.query.tier ?? 'moderate';
    const recs = await loadLatestRecommendations(tier);
    if (!recs) return res.json({ message: 'No recommendations yet — engine runs at 6:30 AM ET on trading days.' });
    res.json(recs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/recommendations/status
recommendationsRouter.get('/status', (req, res) => {
  res.json({ running: _engineRunning });
});

// GET /api/recommendations/history — list all available dates
recommendationsRouter.get('/history', async (req, res) => {
  try {
    const dates = await listRecommendationDates();
    res.json({ dates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/recommendations/history/:date?tier=moderate
recommendationsRouter.get('/history/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const tier = req.query.tier ?? null; // null = all tiers
    const recs = await loadRecommendationsByDate(date, tier);
    if (!recs) return res.status(404).json({ error: `No data for ${date}` });
    res.json(recs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/recommendations/score/:symbol?tier=moderate
recommendationsRouter.get('/score/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const tier = req.query.tier ?? 'moderate';
    const result = await scoreStock(symbol.toUpperCase(), tier);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/recommendations/run — trigger engine (returns immediately)
recommendationsRouter.post('/run', (req, res) => {
  if (_engineRunning) {
    return res.json({ ok: false, message: 'Engine run already in progress' });
  }
  _engineRunning = true;
  res.json({ ok: true, message: 'Engine run started — poll GET /api/recommendations for results (~3-5 min)' });

  runDailyEngine()
    .then(r => console.log(`[engine] Done: ${r.moderate.buys.length} buys (mod), ${r.aggressive.buys.length} buys (agg)`))
    .catch(e => console.error('[engine] run failed:', e.message))
    .finally(() => { _engineRunning = false; });
});
