import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import { recommendationsRouter } from './routes/recommendations.js';
import { portfolioRouter } from './routes/portfolio.js';
import { watchlistRouter } from './routes/watchlist.js';
import { alpacaRouter } from './routes/alpaca.js';
import { runDailyEngine } from './algorithms/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/recommendations', recommendationsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/alpaca', alpacaRouter);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// Serve React frontend static build
const CLIENT_DIST = path.join(__dirname, '../client/dist');
app.use(express.static(CLIENT_DIST));

// Catch-all: serve index.html for client-side routing
app.get('*', (_, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

// Run algorithm engine daily at 6:30 AM ET (before market open)
cron.schedule('30 10 * * 1-5', async () => {
  console.log('[cron] Running daily recommendation engine...');
  try { await runDailyEngine(); }
  catch (e) { console.error('[cron] Engine error:', e.message); }
}, { timezone: 'America/New_York' });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
