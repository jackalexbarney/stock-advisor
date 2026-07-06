# Agent Inbox

## [P0] Dev Agent
- Implement `updateWeights()` in engine.js — self-learning gradient step after tracking predictions vs actual
- Add options play recommendations (calls/puts with strike/expiry suggestions) alongside stock picks
- Add backtesting endpoint: `/api/backtest/:symbol?days=90` — run signals on historical data, compare vs buy-and-hold
- Wire up Reddit sentiment with PRAW (snoowrap) when env vars are present
- Add `/api/recommendations/options` route for options-specific recommendations

## [P0] Design Agent  
- Design the full UI: dark theme (#080b10 canvas), accent blue (#2563eb), bull green / bear red
- Dashboard: top picks with signal breakdown bars, options callout section
- Portfolio: holdings with P&L, engine score per position, sell signals highlighted
- Watchlist: ticker grid with sparklines, trending from Reddit badge
- Mobile-first layouts for all views

## [P1] Marketing Agent
- Brainstorm 10+ name options for this product (stock recommendation SaaS)
- Key brand attributes: data-driven, trustworthy, modern, algorithmic edge
- Consider: domain availability, memorability, avoiding obvious stock clichés

## [P1] QA Agent
- Backtest signal accuracy on S&P 500 over 90/180/365 day windows
- Validate consensus scores sum to correct weighted average
- Test edge cases: illiquid stocks, suspended trading, API failures
- Verify Alpaca paper trading order placement end-to-end
