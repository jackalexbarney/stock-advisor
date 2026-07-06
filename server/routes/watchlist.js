import { Router } from 'express';
import { fetchPriceHistory } from '../data/marketData.js';
import { getStockUniverse } from '../data/universe.js';

export const watchlistRouter = Router();

const POPULAR = ['AAPL','MSFT','NVDA','TSLA','META','GOOGL','AMZN','SPY','QQQ','COIN'];

watchlistRouter.get('/popular', async (req, res) => {
  try {
    const universe = await getStockUniverse();
    res.json({ tickers: POPULAR, universe: universe.slice(0, 50) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

watchlistRouter.get('/chart/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days ?? '90');
    const history = await fetchPriceHistory(symbol.toUpperCase(), days);
    res.json({ symbol, history });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
