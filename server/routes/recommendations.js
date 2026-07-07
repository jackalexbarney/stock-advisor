import { Router } from 'express';
import { loadLatestRecommendations } from '../data/store.js';
import { scoreStock, runDailyEngine } from '../algorithms/engine.js';

export const recommendationsRouter = Router();

// Track whether an engine run is in progress
let _engineRunning = false;

// GET /api/recommendations — today's buy/sell/hold list
recommendationsRouter.get('/', async (req, res) => {
  try {
    const recs = await loadLatestRecommendations();
    if (!recs) return res.json({ message: 'No recommendations yet — engine runs at 6:30 AM ET on trading days.' });
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

// POST /api/recommendations/run — manually trigger engine
// Returns immediately; engine runs asynchronously in background.
recommendationsRouter.post('/run', (req, res) => {
  if (_engineRunning) {
    return res.json({ ok: false, message: 'Engine run already in progress' });
  }
  _engineRunning = true;
  res.json({ ok: true, message: 'Engine run started — poll GET /api/recommendations for results (takes ~3-5 min)' });

  runDailyEngine()
    .then(recs => console.log(`[engine] Done: ${recs.buys.length} buys, ${recs.sells.length} sells`))
    .catch(e => console.error('[engine] run failed:', e.message))
    .finally(() => { _engineRunning = false; });
});

// GET /api/recommendations/status — is the engine running?
recommendationsRouter.get('/status', (req, res) => {
  res.json({ running: _engineRunning });
});
