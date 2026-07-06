import { Router } from 'express';
import { getAlpacaClient } from '../data/alpaca.js';

export const alpacaRouter = Router();

alpacaRouter.get('/account', async (req, res) => {
  try {
    const alpaca = getAlpacaClient();
    const account = await alpaca.getAccount();
    res.json(account);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

alpacaRouter.get('/orders', async (req, res) => {
  try {
    const alpaca = getAlpacaClient();
    const orders = await alpaca.getOrders({ status: 'all', limit: 50 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/alpaca/order — place a market order
// Body: { symbol, qty, side: 'buy'|'sell' }
alpacaRouter.post('/order', async (req, res) => {
  try {
    const { symbol, qty, side } = req.body;
    if (!symbol || !qty || !side) return res.status(400).json({ error: 'symbol, qty, side required' });
    const alpaca = getAlpacaClient();
    const order = await alpaca.createOrder({
      symbol: symbol.toUpperCase(),
      qty,
      side,
      type: 'market',
      time_in_force: 'day',
    });
    res.json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
