import { Router } from 'express';
import { loadLatestRecommendations } from '../data/store.js';
import { scoreStock, runDailyEngine } from '../algorithms/engine.js';

export const recommendationsRouter = Router();

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

// POST /api/recommendations/run — manually trigger engine (admin)
recommendationsRouter.post('/run', async (req, res) => {
  try {
    const recs = await runDailyEngine();
    res.json({ ok: true, buys: recs.buys.length, sells: recs.sells.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
