import { Router } from 'express';
import { getAlpacaClient } from '../data/alpaca.js';
import { scoreStock } from '../algorithms/engine.js';

export const portfolioRouter = Router();

// GET /api/portfolio — current positions from Alpaca
portfolioRouter.get('/', async (req, res) => {
  try {
    const alpaca = getAlpacaClient();
    const [positions, account] = await Promise.all([
      alpaca.getPositions(),
      alpaca.getAccount(),
    ]);
    res.json({ positions, account });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portfolio/analysis — score existing holdings against engine
portfolioRouter.get('/analysis', async (req, res) => {
  try {
    const alpaca = getAlpacaClient();
    const positions = await alpaca.getPositions();
    const tier = req.query.tier ?? 'moderate';

    const scored = await Promise.all(
      positions.map(async p => {
        const score = await scoreStock(p.symbol, tier).catch(() => null);
        return { ...p, engineScore: score };
      })
    );

    res.json({ positions: scored });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
