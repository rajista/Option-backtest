import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backtestAPI, marketAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { format, subDays, subMonths } from 'date-fns';
import {
  CalendarIcon,
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  Clock,
  Target,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '../lib/utils';

const strategies = [
  { id: 'simple_call', name: 'Long Call', category: 'Simple', description: 'Buy a call option - bullish view', icon: TrendingUp },
  { id: 'simple_put', name: 'Long Put', category: 'Simple', description: 'Buy a put option - bearish view', icon: TrendingDown },
  { id: 'short_call', name: 'Short Call', category: 'Simple', description: 'Sell a call option - neutral/bearish', icon: TrendingDown },
  { id: 'short_put', name: 'Short Put', category: 'Simple', description: 'Sell a put option - neutral/bullish', icon: TrendingUp },
  { id: 'straddle', name: 'Long Straddle', category: 'Volatility', description: 'Buy ATM call + put - expect big move', icon: Layers },
  { id: 'short_straddle', name: 'Short Straddle', category: 'Volatility', description: 'Sell ATM call + put - expect low volatility', icon: Layers },
  { id: 'strangle', name: 'Long Strangle', category: 'Volatility', description: 'Buy OTM call + put - cheaper big move bet', icon: Layers },
  { id: 'short_strangle', name: 'Short Strangle', category: 'Volatility', description: 'Sell OTM call + put - collect premium', icon: Layers },
  { id: 'bull_call_spread', name: 'Bull Call Spread', category: 'Directional', description: 'Limited risk bullish strategy', icon: TrendingUp },
  { id: 'bear_put_spread', name: 'Bear Put Spread', category: 'Directional', description: 'Limited risk bearish strategy', icon: TrendingDown },
  { id: 'iron_condor', name: 'Iron Condor', category: 'Neutral', description: 'Profit from range-bound market', icon: Target },
];

const indices = [
  { symbol: 'NIFTY', name: 'Nifty 50', lotSize: 25 },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', lotSize: 15 },
];

export default function NewBacktest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [selectedIndex, setSelectedIndex] = useState('NIFTY');
  const [contractType, setContractType] = useState('weekly');
  const [startDate, setStartDate] = useState(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [lots, setLots] = useState(1);
  const [entryTime, setEntryTime] = useState('09:30');
  const [exitTime, setExitTime] = useState('15:15');
  const [useStopLoss, setUseStopLoss] = useState(false);
  const [stopLossPercent, setStopLossPercent] = useState(20);
  const [useTarget, setUseTarget] = useState(false);
  const [targetPercent, setTargetPercent] = useState(50);

  const currentIndex = indices.find(i => i.symbol === selectedIndex);
  const currentStrategy = strategies.find(s => s.id === selectedStrategy);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a backtest name');
      return;
    }
    if (!selectedStrategy) {
      toast.error('Please select a strategy');
      return;
    }

    setLoading(true);

    try {
      const config = {
        strategy_type: selectedStrategy,
        index: selectedIndex,
        contract_type: contractType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        lots: lots,
        entry_time: entryTime,
        exit_time: exitTime,
        stop_loss_percent: useStopLoss ? stopLossPercent : null,
        target_percent: useTarget ? targetPercent : null,
      };

      const response = await backtestAPI.run({ name, config });
      toast.success('Backtest completed successfully!');
      navigate(`/backtests/${response.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(strategies.map(s => s.category))];

  return (
    <div data-testid="new-backtest-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          New Backtest
        </h1>
        <p className="text-slate-500 mt-1">
          Configure and run a backtest on historical options data
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Strategy Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Backtest Name */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Backtest Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="name">Backtest Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., NIFTY Weekly Straddle January"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="backtest-name-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Strategy Selection */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Select Strategy</CardTitle>
                <CardDescription>Choose an options strategy to backtest</CardDescription>
              </CardHeader>
              <CardContent>
                {categories.map((category) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h3 className="text-sm font-medium text-slate-500 mb-3">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {strategies
                        .filter((s) => s.category === category)
                        .map((strategy) => {
                          const Icon = strategy.icon;
                          return (
                            <div
                              key={strategy.id}
                              onClick={() => setSelectedStrategy(strategy.id)}
                              className={cn(
                                'strategy-card',
                                selectedStrategy === strategy.id && 'selected'
                              )}
                              data-testid={`strategy-${strategy.id}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  'w-9 h-9 rounded-lg flex items-center justify-center',
                                  selectedStrategy === strategy.id ? 'bg-primary text-white' : 'bg-slate-100'
                                )}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900">{strategy.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{strategy.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Parameters */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Index & Contract Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Index</Label>
                    <Select value={selectedIndex} onValueChange={setSelectedIndex}>
                      <SelectTrigger data-testid="index-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {indices.map((index) => (
                          <SelectItem key={index.symbol} value={index.symbol}>
                            {index.name} (Lot: {index.lotSize})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contract Type</Label>
                    <Select value={contractType} onValueChange={setContractType}>
                      <SelectTrigger data-testid="contract-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="start-date-btn"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(startDate, 'dd MMM yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="end-date-btn"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(endDate, 'dd MMM yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          disabled={(date) => date > new Date() || date < startDate}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Lots */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Number of Lots</Label>
                    <span className="text-sm font-data text-slate-600">
                      {lots} × {currentIndex?.lotSize || 25} = {lots * (currentIndex?.lotSize || 25)} qty
                    </span>
                  </div>
                  <Slider
                    value={[lots]}
                    onValueChange={(v) => setLots(v[0])}
                    min={1}
                    max={20}
                    step={1}
                    data-testid="lots-slider"
                  />
                </div>

                {/* Entry/Exit Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entry Time</Label>
                    <Select value={entryTime} onValueChange={setEntryTime}>
                      <SelectTrigger data-testid="entry-time-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:15">09:15 (Market Open)</SelectItem>
                        <SelectItem value="09:30">09:30</SelectItem>
                        <SelectItem value="10:00">10:00</SelectItem>
                        <SelectItem value="10:30">10:30</SelectItem>
                        <SelectItem value="11:00">11:00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Time</Label>
                    <Select value={exitTime} onValueChange={setExitTime}>
                      <SelectTrigger data-testid="exit-time-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14:30">14:30</SelectItem>
                        <SelectItem value="15:00">15:00</SelectItem>
                        <SelectItem value="15:15">15:15</SelectItem>
                        <SelectItem value="15:25">15:25 (Near Close)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Management */}
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Risk Management</CardTitle>
                <CardDescription>Optional stop loss and target settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stop Loss */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <Label>Stop Loss</Label>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Exit if loss exceeds percentage</p>
                    {useStopLoss && (
                      <div className="mt-3">
                        <Slider
                          value={[stopLossPercent]}
                          onValueChange={(v) => setStopLossPercent(v[0])}
                          min={5}
                          max={50}
                          step={5}
                        />
                        <p className="text-sm font-data text-red-500 mt-1">-{stopLossPercent}%</p>
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={useStopLoss}
                    onCheckedChange={setUseStopLoss}
                    data-testid="stop-loss-switch"
                  />
                </div>

                {/* Target */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" />
                      <Label>Target Profit</Label>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Exit if profit exceeds percentage</p>
                    {useTarget && (
                      <div className="mt-3">
                        <Slider
                          value={[targetPercent]}
                          onValueChange={(v) => setTargetPercent(v[0])}
                          min={10}
                          max={100}
                          step={10}
                        />
                        <p className="text-sm font-data text-emerald-500 mt-1">+{targetPercent}%</p>
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={useTarget}
                    onCheckedChange={setUseTarget}
                    data-testid="target-switch"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Strategy</span>
                    <span className="font-medium">
                      {currentStrategy?.name || 'Not selected'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Index</span>
                    <span className="font-medium">{selectedIndex}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Contract</span>
                    <Badge variant="secondary">{contractType}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Period</span>
                    <span className="font-data text-xs">
                      {format(startDate, 'dd MMM')} - {format(endDate, 'dd MMM yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Lots</span>
                    <span className="font-data">{lots}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Quantity</span>
                    <span className="font-data">{lots * (currentIndex?.lotSize || 25)}</span>
                  </div>
                  {useStopLoss && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Stop Loss</span>
                      <span className="font-data text-red-500">-{stopLossPercent}%</span>
                    </div>
                  )}
                  {useTarget && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Target</span>
                      <span className="font-data text-emerald-500">+{targetPercent}%</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || !selectedStrategy}
                    data-testid="run-backtest-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Backtest
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
