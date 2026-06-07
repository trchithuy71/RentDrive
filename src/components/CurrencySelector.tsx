'use client';

import React from 'react';
import { CURRENCY_CONFIG, type CurrencySymbol } from '@/lib/stablefx';

interface CurrencySelectorProps {
  selected: CurrencySymbol;
  onChange: (currency: CurrencySymbol) => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  disabled?: boolean;
}

export default function CurrencySelector({
  selected,
  onChange,
  size = 'md',
  showLabel = true,
  disabled = false,
}: CurrencySelectorProps) {
  const currencies: CurrencySymbol[] = ['USDC', 'EURC'];

  return (
    <div className="inline-flex items-center rounded-sm border border-[#DDDCD4] bg-[#F2F1EC] p-0.5 gap-0.5">
      {currencies.map((currency) => {
        const config = CURRENCY_CONFIG[currency];
        const isActive = selected === currency;
        const sizeClasses = size === 'sm'
          ? 'px-2.5 py-1 text-[9px]'
          : 'px-3.5 py-1.5 text-[10px]';

        return (
          <button
            key={currency}
            onClick={() => !disabled && onChange(currency)}
            disabled={disabled}
            className={`
              ${sizeClasses}
              rounded-sm font-bold tracking-widest uppercase transition-all duration-200
              flex items-center gap-1.5
              ${isActive
                ? 'text-white shadow-sm'
                : 'bg-transparent text-[#718096] hover:text-[#1C2B3C] hover:bg-white/60'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={isActive ? {
              backgroundColor: config.color,
              borderColor: config.color,
            } : {}}
          >
            <span className={`
              ${size === 'sm' ? 'text-[10px]' : 'text-xs'}
              font-black
            `}>
              {config.icon}
            </span>
            {showLabel && <span>{currency}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Inline currency badge for vehicle cards.
 */
export function CurrencyBadge({
  currency,
  size = 'sm',
}: {
  currency: CurrencySymbol;
  size?: 'sm' | 'md';
}) {
  const config = CURRENCY_CONFIG[currency];
  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[8px]'
    : 'px-2 py-1 text-[9px]';

  return (
    <span
      className={`${sizeClasses} inline-flex items-center gap-1 rounded-sm font-extrabold tracking-widest uppercase border`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      <span className="font-black">{config.icon}</span>
      {currency}
    </span>
  );
}

/**
 * FX rate display widget showing live conversion rate.
 */
export function FXRateDisplay({
  rate,
  from,
  to,
  source,
}: {
  rate: number;
  from: CurrencySymbol;
  to: CurrencySymbol;
  source: 'stablefx_api' | 'fallback';
}) {
  const fromConfig = CURRENCY_CONFIG[from];
  const toConfig = CURRENCY_CONFIG[to];

  return (
    <div className="inline-flex items-center gap-2 rounded-sm bg-[#F2F1EC] border border-[#DDDCD4] px-3 py-1.5">
      <span className="text-[9px] font-bold tracking-wider uppercase text-[#718096]">FX:</span>
      <span className="text-[10px] font-extrabold text-[#1C2B3C]">
        1 {from} = {rate.toFixed(4)} {to}
      </span>
      <span
        className={`text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm ${
          source === 'stablefx_api'
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : 'text-amber-700 bg-amber-50 border border-amber-200'
        }`}
      >
        {source === 'stablefx_api' ? 'LIVE' : 'EST.'}
      </span>
    </div>
  );
}
