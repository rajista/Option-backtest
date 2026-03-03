import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { backtestAPI } from '../lib/api';
import { formatCurrency, formatDateTime, getStrategyName, getPnLColor } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  Trash2,
  Eye,
  Plus,
  Loader2,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

export default function BacktestHistory() {
  const [backtests, setBacktests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterIndex, setFilterIndex] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    loadBacktests();
  }, []);

  const loadBacktests = async () => {
    try {
      const response = await backtestAPI.getAll();
      setBacktests(response.data);
    } catch (err) {
      toast.error('Failed to load backtests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await backtestAPI.delete(id);
      setBacktests(backtests.filter((b) => b.id !== id));
      toast.success('Backtest deleted');
    } catch (err) {
      toast.error('Failed to delete backtest');
    }
  };

  // Filter and sort
  const filteredBacktests = backtests
    .filter((bt) => {
      const matchesSearch = bt.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndex = filterIndex === 'all' || bt.config.index === filterIndex;
      return matchesSearch && matchesIndex;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'pnl') {
        return b.statistics.total_pnl - a.statistics.total_pnl;
      }
      if (sortBy === 'winrate') {
        return b.statistics.win_rate - a.statistics.win_rate;
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div data-testid="backtest-history-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Backtest History
          </h1>
          <p className="text-slate-500 mt-1">
            View and manage your saved backtests
          </p>
        </div>
        <Link to="/backtest/new">
          <Button data-testid="new-backtest-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Backtest
          </Button>
        </Link>
      </div>

      {backtests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-slate-500 mb-4">No backtests found</p>
            <Link to="/backtest/new">
              <Button>Create your first backtest</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search backtests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="search-input"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <Select value={filterIndex} onValueChange={setFilterIndex}>
                  <SelectTrigger className="w-[130px]" data-testid="filter-index-select">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Index" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Indices</SelectItem>
                    <SelectItem value="NIFTY">NIFTY</SelectItem>
                    <SelectItem value="BANKNIFTY">BANKNIFTY</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[130px]" data-testid="sort-select">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest</SelectItem>
                    <SelectItem value="pnl">Highest P&L</SelectItem>
                    <SelectItem value="winrate">Win Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Index</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Sharpe</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBacktests.map((bt) => (
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
                    <TableCell>
                      <Badge variant="outline">{bt.config.contract_type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-data">
                      {bt.statistics.total_trades}
                    </TableCell>
                    <TableCell className={`text-right font-data ${getPnLColor(bt.statistics.total_pnl)}`}>
                      {formatCurrency(bt.statistics.total_pnl)}
                    </TableCell>
                    <TableCell className="text-right font-data">
                      {bt.statistics.win_rate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-data">
                      {bt.statistics.sharpe_ratio}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {formatDateTime(bt.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/backtests/${bt.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`view-btn-${bt.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`delete-btn-${bt.id}`}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Backtest</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{bt.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(bt.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredBacktests.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No backtests match your search
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
