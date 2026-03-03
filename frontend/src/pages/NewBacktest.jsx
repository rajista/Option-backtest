import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { backtestAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import {
  CalendarIcon,
  Play,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Info,
} from 'lucide-react';
import { cn } from '../lib/utils';

// Position leg component
const PositionLeg = ({ leg, index, onUpdate, onRemove, onDuplicate }) => {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3" data-testid={`leg-${index}`}>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="outline" className="bg-cyan-500 text-white border-none">
          L{index + 1}
        </Badge>
        <span className="text-sm text-slate-500">ATM Point</span>
        <Select value={leg.atmPoint} onValueChange={(v) => onUpdate(index, 'atmPoint', v)}>
          <SelectTrigger className="w-20 h-8" data-testid={`leg-${index}-atm-point`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="point">Point</SelectItem>
            <SelectItem value="percent">%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-3 flex-wrap">
        {/* Lots */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Lots:</span>
          <Input
            type="number"
            value={leg.lots}
            onChange={(e) => onUpdate(index, 'lots', parseInt(e.target.value) || 1)}
            className="w-16 h-9"
            min={1}
            data-testid={`leg-${index}-lots`}
          />
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex items-center rounded-md overflow-hidden border border-slate-200">
          <button
            type="button"
            onClick={() => onUpdate(index, 'action', 'BUY')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              leg.action === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
            data-testid={`leg-${index}-buy-btn`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => onUpdate(index, 'action', 'SELL')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              leg.action === 'SELL' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
            data-testid={`leg-${index}-sell-btn`}
          >
            SELL
          </button>
        </div>

        {/* Strike Selection */}
        <Select value={leg.strikeType} onValueChange={(v) => onUpdate(index, 'strikeType', v)}>
          <SelectTrigger className="w-24 h-9" data-testid={`leg-${index}-strike-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ATM">ATM</SelectItem>
            <SelectItem value="ITM1">ITM 1</SelectItem>
            <SelectItem value="ITM2">ITM 2</SelectItem>
            <SelectItem value="ITM3">ITM 3</SelectItem>
            <SelectItem value="OTM1">OTM 1</SelectItem>
            <SelectItem value="OTM2">OTM 2</SelectItem>
            <SelectItem value="OTM3">OTM 3</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Strike Input */}
        {leg.strikeType === 'custom' && (
          <Input
            type="number"
            value={leg.customStrike}
            onChange={(e) => onUpdate(index, 'customStrike', parseInt(e.target.value) || 0)}
            className="w-24 h-9"
            placeholder="Strike"
            data-testid={`leg-${index}-custom-strike`}
          />
        )}

        {/* Call/Put Toggle */}
        <div className="flex items-center rounded-md overflow-hidden border border-slate-200">
          <button
            type="button"
            onClick={() => onUpdate(index, 'optionType', 'CALL')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              leg.optionType === 'CALL' ? 'bg-cyan-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
            data-testid={`leg-${index}-call-btn`}
          >
            CALL
          </button>
          <button
            type="button"
            onClick={() => onUpdate(index, 'optionType', 'PUT')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              leg.optionType === 'PUT' ? 'bg-cyan-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
            )}
            data-testid={`leg-${index}-put-btn`}
          >
            PUT
          </button>
        </div>

        {/* Target Profit */}
        <button
          type="button"
          onClick={() => onUpdate(index, 'hasTargetProfit', !leg.hasTargetProfit)}
          className={cn(
            'flex items-center gap-1 px-3 py-2 text-sm rounded-md border transition-colors',
            leg.hasTargetProfit ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          <Plus className="w-3 h-3" />
          Target Profit
        </button>

        {/* Stop Loss */}
        <button
          type="button"
          onClick={() => onUpdate(index, 'hasStopLoss', !leg.hasStopLoss)}
          className={cn(
            'flex items-center gap-1 px-3 py-2 text-sm rounded-md border transition-colors',
            leg.hasStopLoss ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          <Plus className="w-3 h-3" />
          Stop Loss
        </button>

        {/* Trail Stop Loss */}
        <button
          type="button"
          onClick={() => onUpdate(index, 'hasTrailSL', !leg.hasTrailSL)}
          className={cn(
            'flex items-center gap-1 px-3 py-2 text-sm rounded-md border transition-colors',
            leg.hasTrailSL ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-500 hover:border-slate-300'
          )}
        >
          <Plus className="w-3 h-3" />
          Trail Stop Loss
        </button>

        {/* Expiry */}
        <Select value={leg.expiry} onValueChange={(v) => onUpdate(index, 'expiry', v)}>
          <SelectTrigger className="w-28 h-9" data-testid={`leg-${index}-expiry`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(index)}>
            <Copy className="w-4 h-4 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemove(index)}>
            <Trash2 className="w-4 h-4 text-slate-400" />
          </Button>
        </div>
      </div>

      {/* Conditional inputs for Target/SL */}
      {(leg.hasTargetProfit || leg.hasStopLoss || leg.hasTrailSL) && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
          {leg.hasTargetProfit && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-emerald-600">Target:</Label>
              <Input
                type="number"
                value={leg.targetProfit}
                onChange={(e) => onUpdate(index, 'targetProfit', parseFloat(e.target.value) || 0)}
                className="w-20 h-8"
                placeholder="%"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          )}
          {leg.hasStopLoss && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-red-600">Stop Loss:</Label>
              <Input
                type="number"
                value={leg.stopLoss}
                onChange={(e) => onUpdate(index, 'stopLoss', parseFloat(e.target.value) || 0)}
                className="w-20 h-8"
                placeholder="%"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          )}
          {leg.hasTrailSL && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-amber-600">Trail SL:</Label>
              <Input
                type="number"
                value={leg.trailSL}
                onChange={(e) => onUpdate(index, 'trailSL', parseFloat(e.target.value) || 0)}
                className="w-20 h-8"
                placeholder="%"
              />
              <span className="text-xs text-slate-400">%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function NewBacktest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [selectedIndex, setSelectedIndex] = useState('NIFTY');
  const [instrumentType, setInstrumentType] = useState('options'); // futures, options
  const [tradeType, setTradeType] = useState('intraday'); // intraday, positional
  const [startDate, setStartDate] = useState(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState(new Date());
  
  // Entry/Exit time
  const [entryHour, setEntryHour] = useState('9');
  const [entryMinute, setEntryMinute] = useState('30');
  const [exitHour, setExitHour] = useState('15');
  const [exitMinute, setExitMinute] = useState('15');
  
  // ATM reference
  const [atmReference, setAtmReference] = useState('spot'); // spot, futures
  
  // Strategy settings
  const [rangeBreakout, setRangeBreakout] = useState(false);
  const [strategyTargetProfit, setStrategyTargetProfit] = useState(false);
  const [strategyTargetValue, setStrategyTargetValue] = useState(0);
  const [strategyStopLoss, setStrategyStopLoss] = useState(false);
  const [strategyStopValue, setStrategyStopValue] = useState(0);
  const [noReEntry, setNoReEntry] = useState(false);
  
  // Position legs
  const [legs, setLegs] = useState([
    {
      lots: 1,
      action: 'SELL',
      strikeType: 'ATM',
      customStrike: 0,
      optionType: 'CALL',
      expiry: 'weekly',
      atmPoint: 'point',
      hasTargetProfit: false,
      hasStopLoss: false,
      hasTrailSL: false,
      targetProfit: 50,
      stopLoss: 20,
      trailSL: 10,
    }
  ]);

  const addLeg = () => {
    setLegs([...legs, {
      lots: 1,
      action: 'SELL',
      strikeType: 'ATM',
      customStrike: 0,
      optionType: 'PUT',
      expiry: 'weekly',
      atmPoint: 'point',
      hasTargetProfit: false,
      hasStopLoss: false,
      hasTrailSL: false,
      targetProfit: 50,
      stopLoss: 20,
      trailSL: 10,
    }]);
  };

  const updateLeg = (index, field, value) => {
    const newLegs = [...legs];
    newLegs[index][field] = value;
    setLegs(newLegs);
  };

  const removeLeg = (index) => {
    if (legs.length > 1) {
      setLegs(legs.filter((_, i) => i !== index));
    }
  };

  const duplicateLeg = (index) => {
    setLegs([...legs, { ...legs[index] }]);
  };

  // Determine strategy type from legs
  const getStrategyType = () => {
    if (legs.length === 1) {
      const leg = legs[0];
      if (leg.action === 'BUY' && leg.optionType === 'CALL') return 'simple_call';
      if (leg.action === 'BUY' && leg.optionType === 'PUT') return 'simple_put';
      if (leg.action === 'SELL' && leg.optionType === 'CALL') return 'short_call';
      if (leg.action === 'SELL' && leg.optionType === 'PUT') return 'short_put';
    }
    if (legs.length === 2) {
      const l1 = legs[0], l2 = legs[1];
      // Straddle: Same action, ATM, one call one put
      if (l1.action === l2.action && l1.strikeType === 'ATM' && l2.strikeType === 'ATM') {
        if ((l1.optionType === 'CALL' && l2.optionType === 'PUT') || (l1.optionType === 'PUT' && l2.optionType === 'CALL')) {
          return l1.action === 'BUY' ? 'straddle' : 'short_straddle';
        }
      }
      // Strangle: Same action, OTM strikes
      if (l1.action === l2.action && l1.strikeType !== 'ATM' && l2.strikeType !== 'ATM') {
        if ((l1.optionType === 'CALL' && l2.optionType === 'PUT') || (l1.optionType === 'PUT' && l2.optionType === 'CALL')) {
          return l1.action === 'BUY' ? 'strangle' : 'short_strangle';
        }
      }
      // Bull Call Spread: Buy lower strike call, sell higher strike call
      if (l1.optionType === 'CALL' && l2.optionType === 'CALL' && l1.action !== l2.action) {
        return 'bull_call_spread';
      }
      // Bear Put Spread
      if (l1.optionType === 'PUT' && l2.optionType === 'PUT' && l1.action !== l2.action) {
        return 'bear_put_spread';
      }
    }
    if (legs.length === 4) {
      return 'iron_condor';
    }
    return 'custom';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a backtest name');
      return;
    }

    setLoading(true);

    try {
      const strategyType = getStrategyType();
      const config = {
        strategy_type: strategyType,
        index: selectedIndex,
        contract_type: legs[0].expiry,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        lots: legs.reduce((sum, leg) => sum + leg.lots, 0),
        entry_time: `${entryHour.padStart(2, '0')}:${entryMinute.padStart(2, '0')}`,
        exit_time: `${exitHour.padStart(2, '0')}:${exitMinute.padStart(2, '0')}`,
        stop_loss_percent: strategyStopLoss ? strategyStopValue : null,
        target_percent: strategyTargetProfit ? strategyTargetValue : null,
        trade_type: tradeType,
        legs: legs,
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

  const hours = Array.from({ length: 8 }, (_, i) => (i + 9).toString());
  const minutes = ['00', '15', '30', '45'];

  return (
    <div data-testid="new-backtest-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
          New Backtest
        </h1>
        <p className="text-slate-500 mt-1">
          Configure and run a backtest on historical options data
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Top Configuration Bar */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Index Selection */}
              <Select value={selectedIndex} onValueChange={setSelectedIndex}>
                <SelectTrigger className="w-36" data-testid="index-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NIFTY">Nifty</SelectItem>
                  <SelectItem value="BANKNIFTY">Banknifty</SelectItem>
                  <SelectItem value="FINNIFTY">Finnifty</SelectItem>
                </SelectContent>
              </Select>

              {/* Instrument Type */}
              <div className="flex items-center rounded-md overflow-hidden border border-slate-200">
                <button
                  type="button"
                  onClick={() => setInstrumentType('futures')}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    instrumentType === 'futures' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Futures
                </button>
                <button
                  type="button"
                  onClick={() => setInstrumentType('options')}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors',
                    instrumentType === 'options' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Options
                </button>
              </div>

              {/* Buy/Sell for futures or Call/Put for options */}
              {instrumentType === 'options' && (
                <div className="flex items-center rounded-md overflow-hidden border border-slate-200">
                  <button type="button" className="px-4 py-2 text-sm font-medium bg-cyan-500 text-white">
                    Call
                  </button>
                  <button type="button" className="px-4 py-2 text-sm font-medium bg-white text-slate-600">
                    Put
                  </button>
                </div>
              )}

              {/* Action */}
              <div className="flex items-center rounded-md overflow-hidden border border-slate-200">
                <button type="button" className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white">
                  Buy
                </button>
                <button type="button" className="px-4 py-2 text-sm font-medium bg-white text-slate-600">
                  Sell
                </button>
              </div>

              {/* Strike Selection */}
              <Select defaultValue="ATM">
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATM">ATM</SelectItem>
                  <SelectItem value="ITM1">ITM 1</SelectItem>
                  <SelectItem value="OTM1">OTM 1</SelectItem>
                </SelectContent>
              </Select>

              {/* Lots */}
              <Input
                type="number"
                defaultValue={1}
                className="w-16"
                min={1}
              />

              {/* Expiry */}
              <Select defaultValue="weekly">
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Side - Backtest Config */}
          <div className="lg:col-span-3 space-y-4">
            {/* Backtest Name */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Label className="whitespace-nowrap">Backtest Name:</Label>
                  <Input
                    placeholder="e.g., NIFTY Weekly Straddle"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="max-w-md"
                    data-testid="backtest-name-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Position Legs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Position Legs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {legs.map((leg, index) => (
                  <PositionLeg
                    key={index}
                    leg={leg}
                    index={index}
                    onUpdate={updateLeg}
                    onRemove={removeLeg}
                    onDuplicate={duplicateLeg}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addLeg}
                  className="w-full mt-2"
                  data-testid="add-position-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Position
                </Button>
              </CardContent>
            </Card>

            {/* ATM Reference & Options */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-8 flex-wrap">
                  {/* ATM Reference */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">Use Spot as ATM</span>
                    <Switch
                      checked={atmReference === 'futures'}
                      onCheckedChange={(v) => setAtmReference(v ? 'futures' : 'spot')}
                    />
                    <span className="text-sm text-slate-600">Use Futures as ATM</span>
                  </div>

                  {/* Square Off Options */}
                  <div className="flex items-center gap-4 ml-auto">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="squareOff" defaultChecked className="accent-cyan-500" />
                      Square Off One Leg
                      <Info className="w-4 h-4 text-slate-400" />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="squareOff" className="accent-cyan-500" />
                      Square Off All Legs
                      <Info className="w-4 h-4 text-slate-400" />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timing Settings */}
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Entry Time */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm">Entry Time:</Label>
                      <div className="flex items-center gap-1">
                        <Checkbox id="rangeBreakout" checked={rangeBreakout} onCheckedChange={setRangeBreakout} />
                        <label htmlFor="rangeBreakout" className="text-sm text-slate-600 flex items-center gap-1">
                          Range Breakout <Info className="w-3 h-3 text-slate-400" />
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={entryHour} onValueChange={setEntryHour}>
                        <SelectTrigger className="w-20" data-testid="entry-hour">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-slate-400">:</span>
                      <Select value={entryMinute} onValueChange={setEntryMinute}>
                        <SelectTrigger className="w-20" data-testid="entry-minute">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-slate-400">:</span>
                      <Select defaultValue="00">
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Exit Time */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm">Exit Time:</Label>
                      {/* Trade Type */}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name="tradeType"
                            checked={tradeType === 'intraday'}
                            onChange={() => setTradeType('intraday')}
                            className="accent-cyan-500"
                          />
                          Same Day
                        </label>
                        <label className="flex items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name="tradeType"
                            checked={tradeType === 'positional'}
                            onChange={() => setTradeType('positional')}
                            className="accent-cyan-500"
                          />
                          Next Day (BTST/STBT)
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={exitHour} onValueChange={setExitHour}>
                        <SelectTrigger className="w-20" data-testid="exit-hour">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-slate-400">:</span>
                      <Select value={exitMinute} onValueChange={setExitMinute}>
                        <SelectTrigger className="w-20" data-testid="exit-minute">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-slate-400">:</span>
                      <Select defaultValue="00">
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="00">00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strategy Level SL/Target */}
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => setStrategyTargetProfit(!strategyTargetProfit)}
                      className={cn(
                        'flex items-center gap-2 text-sm mb-3',
                        strategyTargetProfit ? 'text-emerald-600' : 'text-slate-500'
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Strategy Target Profit
                    </button>
                    {strategyTargetProfit && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={strategyTargetValue}
                          onChange={(e) => setStrategyTargetValue(parseFloat(e.target.value) || 0)}
                          className="w-24"
                          placeholder="Points"
                        />
                        <span className="text-sm text-slate-500">points</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setStrategyStopLoss(!strategyStopLoss)}
                      className={cn(
                        'flex items-center gap-2 text-sm mb-3',
                        strategyStopLoss ? 'text-red-600' : 'text-slate-500'
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Strategy Stop Loss
                    </button>
                    {strategyStopLoss && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={strategyStopValue}
                          onChange={(e) => setStrategyStopValue(parseFloat(e.target.value) || 0)}
                          className="w-24"
                          placeholder="Points"
                        />
                        <span className="text-sm text-slate-500">points</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* No Re-Entry Option */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-end gap-3">
                  <Switch checked={noReEntry} onCheckedChange={setNoReEntry} />
                  <span className="text-sm text-slate-600">No ReEntry/ReExecute/Journey After</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Summary & Run */}
          <div className="space-y-4">
            {/* Date Range */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Date Range</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
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
                <div>
                  <Label className="text-xs text-slate-500">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
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
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Index</span>
                  <span className="font-medium">{selectedIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Strategy</span>
                  <Badge variant="secondary">{getStrategyType().replace(/_/g, ' ')}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Legs</span>
                  <span className="font-data">{legs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Lots</span>
                  <span className="font-data">{legs.reduce((sum, leg) => sum + leg.lots, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trade Type</span>
                  <Badge variant="outline">{tradeType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entry</span>
                  <span className="font-data">{entryHour}:{entryMinute}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exit</span>
                  <span className="font-data">{exitHour}:{exitMinute}</span>
                </div>
              </CardContent>
            </Card>

            {/* Run Button */}
            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600"
              disabled={loading || !name.trim()}
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

            {/* Info */}
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>Banknifty</strong> data available from Mon Jan 02 2017</p>
              <p><strong>Nifty</strong> data available from Fri Feb 15 2019</p>
              <p>Lot sizes are variable based on historical dates</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
