/**
 * Relative strength signal.
 * Returns score in [-1, +1].
 *
 * Compares stock's 90-day return vs:
 *   - S&P 500 (SPY)
 *   - Relevant sector ETF
 */

import { fetchPriceHistory } from '../../data/marketData.js';

const SECTOR_ETFS = {
  Technology: 'XLK', Healthcare: 'XLV', Financials: 'XLF',
  Energy: 'XLE', ConsumerDiscretionary: 'XLY', Industrials: 'XLI',
  Utilities: 'XLU', Materials: 'XLB', RealEstate: 'XLRE',
  CommunicationServices: 'XLC', ConsumerStaples: 'XLP',
};

function returnOver(history, days) {
  const closes = history.map(d => d.close);
  if (closes.length < days) return 0;
  const start = closes[closes.length - days];
  const end = closes[closes.length - 1];
  return start ? (end - start) / start : 0;
}

export async function scoreRelativeStrength(symbol, sectorEtf = 'SPY') {
  const [stockHist, spyHist, sectorHist] = await Promise.allSettled([
    fetchPriceHistory(symbol, 95),
    fetchPriceHistory('SPY', 95),
    sectorEtf !== 'SPY' ? fetchPriceHistory(sectorEtf, 95) : Promise.resolve(null),
  ]);

  if (stockHist.status !== 'fulfilled' || spyHist.status !== 'fulfilled') return 0;

  const stockReturn = returnOver(stockHist.value, 90);
  const spyReturn = returnOver(spyHist.value, 90);
  const spyAlpha = stockReturn - spyReturn;

  let score = Math.max(-1, Math.min(1, spyAlpha * 5));

  if (sectorHist.status === 'fulfilled' && sectorHist.value) {
    const sectorReturn = returnOver(sectorHist.value, 90);
    const sectorAlpha = stockReturn - sectorReturn;
    score = (score + Math.max(-1, Math.min(1, sectorAlpha * 5))) / 2;
  }

  return score;
}
