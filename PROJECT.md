# Stock Advisor

Multi-signal consensus stock recommendation engine.

## Algorithm Signals
1. **Technical** — RSI, MACD, SMA 50/200 crossovers, Bollinger Bands, momentum
2. **Fundamental** — P/E vs sector, EPS/revenue growth, analyst targets
3. **Sentiment** — Reddit (r/investing, r/wallstreetbets, r/stocks), news NLP
4. **Options Flow** — put/call ratio, unusual activity, IV rank
5. **Relative Strength** — vs SPY and sector ETF

## Risk Tiers
- **Conservative**: fundamentals-weighted, large cap only
- **Moderate**: balanced signals, growth + value
- **Aggressive**: sentiment + momentum, includes smaller caps and options plays

## Broker
- Alpaca (paper trading by default, switch to live when ready)

## Agents
- Dev: algorithm engine, Alpaca integration, API routes
- Design: UI/UX, dark theme, charts, mobile
- Marketing: naming, positioning
- QA: backtesting, signal validation, edge cases

## Stack
- Backend: Node.js + Express
- Frontend: React + Vite + Tailwind
- Deploy: Render
- Data: Yahoo Finance (free), NewsAPI, Reddit API, Alpaca
