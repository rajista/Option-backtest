import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { backtestAPI } from '../lib/api';
import { formatCurrency, formatPercent, formatDate, getStrategyName, getPnLColor, cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Trash2,
  Download,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Percent,
  BarChart3,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  Layers,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

export default function BacktestResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [backtest, setBacktest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBacktest();
  }, [id]);

  const loadBacktest = async () => {
    try {
      const response = await backtestAPI.getById(id);
      setBacktest(response.data);
    } catch (err) {
      toast.error('Failed to load backtest');
      navigate('/backtests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await backtestAPI.delete(id);
      toast.success('Backtest deleted');
      navigate('/backtests');
    } catch (err) {
      toast.error('Failed to delete backtest');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!backtest) {
    return null;
  }

  const { config, statistics, trades } = backtest;

  // Prepare chart data
  const equityCurveData = statistics.cumulative_pnl?.map((pnl, idx) => ({
    trade: idx + 1,
    pnl: pnl,
    date: trades[idx]?.date || '',
  })) || [];

  const dailyPnLData = trades.map((trade, idx) => ({
    date: trade.date,
    pnl: trade.pnl,
    trade: idx + 1,
  }));

  // Stats for display
  const statCards = [
    { label: 'Total P&L', value: formatCurrency(statistics.total_pnl), icon: statistics.total_pnl >= 0 ? TrendingUp : TrendingDown, color: getPnLColor(statistics.total_pnl) },
    { label: 'Win Rate', value: `${statistics.win_rate}%`, icon: Target, color: statistics.win_rate >= 50 ? 'text-emerald-600' : 'text-amber-600' },
    { label: 'Sharpe Ratio', value: statistics.sharpe_ratio, icon: BarChart3, color: statistics.sharpe_ratio >= 1 ? 'text-emerald-600' : 'text-slate-600' },
    { label: 'Max Drawdown', value: formatCurrency(statistics.max_drawdown), icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Profit Factor', value: statistics.profit_factor === '∞' ? '∞' : statistics.profit_factor, icon: Activity, color: 'text-blue-600' },
    { label: 'Sortino Ratio', value: statistics.sortino_ratio, icon: BarChart3, color: statistics.sortino_ratio >= 1 ? 'text-emerald-600' : 'text-slate-600' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="text-sm text-slate-500">Trade {label}</p>
          <p className={cn('font-data font-semibold', getPnLColor(payload[0].value))}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div data-testid="backtest-results-page">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <Link to="/backtests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {backtest.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary">{getStrategyName(config.strategy_type)}</Badge>
              <Badge variant="outline">{config.index}</Badge>
              <Badge variant="outline">{config.contract_type}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-500" data-testid="delete-backtest-btn">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Backtest</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this backtest? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Config Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Period</p>
              <p className="font-medium font-data">{config.start_date} to {config.end_date}</p>
            </div>
            <div>
              <p className="text-slate-500">Entry Time</p>
              <p className="font-medium font-data">{config.entry_time}</p>
            </div>
            <div>
              <p className="text-slate-500">Exit Time</p>
              <p className="font-medium font-data">{config.exit_time}</p>
            </div>
            <div>
              <p className="text-slate-500">Lots</p>
              <p className="font-medium font-data">{config.lots}</p>
            </div>
            {config.stop_loss_percent && (
              <div>
                <p className="text-slate-500">Stop Loss</p>
                <p className="font-medium font-data text-red-500">-{config.stop_loss_percent}%</p>
              </div>
            )}
            {config.target_percent && (
              <div>
                <p className="text-slate-500">Target</p>
                <p className="font-medium font-data text-emerald-500">+{config.target_percent}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statCards.map((stat) => (
          <Card key={stat.label} className="card-hover">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between mb-2">
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <p className={cn('text-xl font-semibold font-data', stat.color)}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Trade Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Total Trades</span>
              <span className="font-data font-medium">{statistics.total_trades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Winning Trades</span>
              <span className="font-data font-medium text-emerald-600">{statistics.winning_trades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Losing Trades</span>
              <span className="font-data font-medium text-red-500">{statistics.losing_trades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Average P&L</span>
              <span className={cn('font-data font-medium', getPnLColor(statistics.average_pnl))}>
                {formatCurrency(statistics.average_pnl)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">P&L Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Max Profit</span>
              <span className="font-data font-medium text-emerald-600">{formatCurrency(statistics.max_profit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Max Loss</span>
              <span className="font-data font-medium text-red-500">{formatCurrency(statistics.max_loss)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Avg Win</span>
              <span className="font-data font-medium text-emerald-600">{formatCurrency(statistics.avg_win)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Avg Loss</span>
              <span className="font-data font-medium text-red-500">{formatCurrency(statistics.avg_loss)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Risk Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Max Drawdown %</span>
              <span className="font-data font-medium text-red-500">{statistics.max_drawdown_percent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Value at Risk (95%)</span>
              <span className="font-data font-medium text-amber-600">{formatCurrency(statistics.var_95)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Expectancy</span>
              <span className={cn('font-data font-medium', getPnLColor(statistics.expectancy))}>
                {formatCurrency(statistics.expectancy)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="equity" className="mb-6">
        <TabsList>
          <TabsTrigger value="equity" data-testid="equity-tab">Equity Curve</TabsTrigger>
          <TabsTrigger value="daily" data-testid="daily-tab">Daily P&L</TabsTrigger>
        </TabsList>

        <TabsContent value="equity">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Equity Curve</CardTitle>
              <CardDescription>Cumulative P&L over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurveData}>
                    <defs>
                      <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="trade"
                      tick={{ fontSize: 12 }}
                      stroke="#94A3B8"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#94A3B8"
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#64748B" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke="#10B981"
                      strokeWidth={2}
                      fill="url(#colorPnl)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Daily P&L</CardTitle>
              <CardDescription>Profit/Loss per trade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyPnLData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="trade"
                      tick={{ fontSize: 12 }}
                      stroke="#94A3B8"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#94A3B8"
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#64748B" />
                    <Bar
                      dataKey="pnl"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Trade History</CardTitle>
          <CardDescription>Detailed breakdown of all trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Strike</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Exit Price</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                  <TableHead>Exit Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade, idx) => (
                  <TableRow
                    key={idx}
                    className={trade.pnl >= 0 ? 'trade-profit' : 'trade-loss'}
                    data-testid={`trade-row-${idx}`}
                  >
                    <TableCell className="font-data">{idx + 1}</TableCell>
                    <TableCell className="font-data">{trade.date}</TableCell>
                    <TableCell className="font-data">{trade.strike}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{trade.option_type}</Badge>
                    </TableCell>
                    <TableCell className="font-data">{trade.entry_time}</TableCell>
                    <TableCell className="font-data">{trade.exit_time}</TableCell>
                    <TableCell className="font-data">{formatCurrency(trade.entry_price)}</TableCell>
                    <TableCell className="font-data">{formatCurrency(trade.exit_price)}</TableCell>
                    <TableCell className={cn('text-right font-data font-medium', getPnLColor(trade.pnl))}>
                      {formatCurrency(trade.pnl)}
                    </TableCell>
                    <TableCell className={cn('text-right font-data', getPnLColor(trade.pnl_percent))}>
                      {formatPercent(trade.pnl_percent)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={trade.exit_reason === 'Stop Loss' ? 'destructive' : trade.exit_reason === 'Target' ? 'default' : 'secondary'}
                      >
                        {trade.exit_reason}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
