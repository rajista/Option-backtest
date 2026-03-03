# Options Backtesting Dashboard - PRD

## Original Problem Statement
Build an options backtesting dashboard using nsepython library for Nifty and Bank Nifty on weekly and monthly contracts, with user defined time range, lots etc and advanced statistics and trade history.

## User Requirements
- **Strategies**: Both simple (Long/Short Call/Put) and spread strategies (Bull Call Spread, Bear Put Spread, Iron Condor, Straddle, Strangle)
- **Data Source**: Free nsepython library (MOCKED due to API limitations)
- **Statistics**: Both basic (P&L, Win Rate, Max Drawdown) and advanced (Sharpe Ratio, Sortino Ratio, VaR, Profit Factor, Expectancy)
- **Authentication**: JWT-based login/registration
- **UI**: Modern light theme

## Architecture

### Backend (FastAPI + MongoDB)
- `/api/auth/register` - User registration with JWT
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user
- `/api/backtest/run` - Execute backtest with config
- `/api/backtests` - CRUD for saved backtests
- `/api/market/indices` - Available indices
- `/api/market/strategies` - Available strategies
- `/api/dashboard/stats` - Dashboard summary

### Frontend (React + Tailwind + Shadcn/UI)
- Login/Register pages
- Dashboard with stats overview
- New Backtest page with strategy builder
- Backtest Results page with charts
- Backtest History page

## User Personas
1. **Retail Options Traders**: Want to test strategies before live trading
2. **Algo Traders**: Need comprehensive statistics for strategy optimization
3. **Learning Traders**: Explore different options strategies

## What's Been Implemented (March 3, 2026)

### Backend
- [x] JWT authentication (register/login/me)
- [x] Backtest engine with 11 strategies
- [x] Comprehensive statistics calculation (Sharpe, Sortino, VaR, etc.)
- [x] MongoDB persistence for users and backtests
- [x] MOCKED options data generation (simulates realistic price movements)

### Frontend
- [x] Auth pages (Login/Register)
- [x] Dashboard with stats cards
- [x] New Backtest page with strategy selection
- [x] Date range picker, lots configuration
- [x] Risk management (Stop Loss, Target)
- [x] Results page with Equity Curve & Daily P&L charts
- [x] Trade history table
- [x] Backtest history with search/filter

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (Important)
- [ ] Real nsepython API integration for live options chain data
- [ ] Greeks calculation (Delta, Gamma, Theta, Vega)
- [ ] Multiple leg positions in single backtest

### P2 (Nice to Have)
- [ ] Export backtest results to CSV/PDF
- [ ] Compare multiple backtests side-by-side
- [ ] Strategy templates/presets
- [ ] Email notifications for backtest completion
- [ ] Mobile responsive improvements

## Next Tasks
1. Integrate real nsepython API for historical options data
2. Add Greeks analysis to statistics
3. Implement strategy comparison feature
4. Add CSV export functionality
