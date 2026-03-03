import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, backtestAPI } from '../lib/api';
import { formatCurrency, formatPercent, formatDateTime, getStrategyName, getPnLColor } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Activity,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const hasData = stats && stats.total_backtests > 0;

  return (
    <div data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Overview of your backtesting performance
          </p>
        </div>
        <Link to="/backtest/new">
          <Button data-testid="new-backtest-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Backtest
          </Button>
        </Link>
      </div>

      {!hasData ? (
        /* Empty state */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              No backtests yet
            </h3>
            <p className="text-slate-500 text-center max-w-sm mb-6">
              Create your first backtest to start analyzing options strategies on Nifty and Bank Nifty
            </p>
            <Link to="/backtest/new">
              <Button data-testid="create-first-backtest-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create your first backtest
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="card-hover" data-testid="stat-total-backtests">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Backtests</p>
                    <p className="text-2xl font-semibold mt-1 font-data">
                      {stats.total_backtests}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover" data-testid="stat-total-pnl">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total P&L</p>
                    <p className={`text-2xl font-semibold mt-1 font-data ${getPnLColor(stats.total_pnl)}`}>
                      {formatCurrency(stats.total_pnl)}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stats.total_pnl >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {stats.total_pnl >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover" data-testid="stat-win-rate">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Avg Win Rate</p>
                    <p className="text-2xl font-semibold mt-1 font-data">
                      {stats.avg_win_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover" data-testid="stat-best-strategy">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Best Strategy</p>
                    <p className="text-lg font-semibold mt-1 truncate max-w-[140px]">
                      {stats.best_strategy?.name || '-'}
                    </p>
                    <p className={`text-sm font-data ${getPnLColor(stats.best_strategy?.pnl)}`}>
                      {formatCurrency(stats.best_strategy?.pnl || 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Backtests */}
          <Card data-testid="recent-backtests-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Backtests</CardTitle>
              <Link to="/backtests">
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Index</TableHead>
                    <TableHead className="text-right">Trades</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">Win Rate</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent_backtests.map((bt) => (
                    <TableRow key={bt.id} data-testid={`backtest-row-${bt.id}`}>
                      <TableCell>
                        <Link
                          to={`/backtests/${bt.id}`}
                          className="font-medium hover:underline"
                        >
                          {bt.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getStrategyName(bt.config.strategy_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-data">{bt.config.index}</TableCell>
                      <TableCell className="text-right font-data">
                        {bt.statistics.total_trades}
                      </TableCell>
                      <TableCell className={`text-right font-data ${getPnLColor(bt.statistics.total_pnl)}`}>
                        {formatCurrency(bt.statistics.total_pnl)}
                      </TableCell>
                      <TableCell className="text-right font-data">
                        {bt.statistics.win_rate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDateTime(bt.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
