import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format currency (INR)
export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined) return '₹0';
  const num = Number(value);
  if (isNaN(num)) return '₹0';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format percentage
export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined) return '0%';
  const num = Number(value);
  if (isNaN(num)) return '0%';
  return `${num >= 0 ? '+' : ''}${num.toFixed(decimals)}%`;
}

// Format number with commas
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined) return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// Format date
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format datetime
export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get P&L color class
export function getPnLColor(value) {
  if (value > 0) return 'text-profit';
  if (value < 0) return 'text-loss';
  return 'text-slate-600';
}

// Get P&L background class
export function getPnLBgColor(value) {
  if (value > 0) return 'bg-emerald-50';
  if (value < 0) return 'bg-red-50';
  return 'bg-slate-50';
}

// Strategy display names
export const strategyNames = {
  simple_call: 'Long Call',
  simple_put: 'Long Put',
  short_call: 'Short Call',
  short_put: 'Short Put',
  straddle: 'Long Straddle',
  short_straddle: 'Short Straddle',
  strangle: 'Long Strangle',
  short_strangle: 'Short Strangle',
  bull_call_spread: 'Bull Call Spread',
  bear_put_spread: 'Bear Put Spread',
  iron_condor: 'Iron Condor',
};

// Get strategy name
export function getStrategyName(id) {
  return strategyNames[id] || id;
}
