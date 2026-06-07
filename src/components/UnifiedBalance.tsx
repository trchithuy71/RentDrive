'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useCircleApp, SUPPORTED_SOURCE_CHAINS } from '@/contexts/CircleAppContext';
import { useAccount } from 'wagmi';
import { ChevronDown, Wallet, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

export default function UnifiedBalance() {
  const { isConnected } = useAccount();
  const { balances, fetchingBalances, refreshBalances, openTopUpModal } = useCircleApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isConnected) return null;

  // Find Arc USDC balance
  const arcBalance = balances?.breakdown.find(b => b.chain.toLowerCase().includes('arc'))?.confirmedBalance || '0.00';
  const totalBalance = balances?.totalConfirmedBalance || '0.00';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-sm bg-[#1C2B3C] text-white hover:bg-[#111A24] border border-[#1C2B3C] text-[10px] font-bold tracking-widest uppercase transition-all shadow-sm"
      >
        <Wallet className="h-3.5 w-3.5" />
        <span>Unified: {totalBalance} USDC</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-sm border border-[#E0DDD5] bg-[#F2F1EC] text-[#1C2B3C] shadow-xl z-50 animate-in fade-in slide-in-from-top-1 duration-200 overflow-hidden">
          
          {/* Header */}
          <div className="px-4 py-3 bg-[#EAE8E1]/40 border-b border-[#E0DDD5] flex justify-between items-center">
            <span className="text-[9px] font-mono text-[#5A6573] uppercase tracking-wider">USDC Balance Breakdown</span>
            <button
              onClick={() => refreshBalances()}
              disabled={fetchingBalances}
              className="text-[#5A6573] hover:text-[#1C2B3C] disabled:opacity-50 transition-colors"
              title="Refresh balances"
            >
              {fetchingBalances ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </button>
          </div>

          {/* Balance Rows */}
          <div className="p-3.5 space-y-2">
            
            {/* Arc Network Row (Highlight) */}
            <div className="flex justify-between items-center p-2.5 rounded-sm border border-[#1C2B3C] bg-white">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <div>
                  <span className="text-[9px] font-mono text-[#5A6573] uppercase tracking-wider block">Arc Testnet</span>
                  <span className="text-[10px] font-bold text-[#1C2B3C]">NATIVE GAS TOKEN</span>
                </div>
              </div>
              <span className="text-xs font-black tracking-tight text-[#1C2B3C]">{arcBalance} USDC</span>
            </div>

            {/* Other Source Chains */}
            {SUPPORTED_SOURCE_CHAINS.map((chain) => {
              // Extract the balance from breakdown matching this chain's substring
              const chainBalObj = balances?.breakdown.find(
                b => b.chain.toLowerCase().includes(chain.id.toLowerCase().replace('sepolia', '')) || b.chain.toLowerCase().includes(chain.id.toLowerCase())
              );
              const bal = chainBalObj?.confirmedBalance || '0.00';

              return (
                <div key={chain.id} className="flex justify-between items-center p-2 rounded-sm border border-[#E0DDD5]/80 bg-white/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{chain.icon}</span>
                    <span className="text-[9px] font-mono text-[#5A6573] uppercase tracking-wider">{chain.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#1C2B3C]">{bal} USDC</span>
                </div>
              );
            })}

          </div>

          {/* Action Footer */}
          <div className="p-3 bg-[#EAE8E1]/30 border-t border-[#E0DDD5] flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-mono text-[#5A6573] px-1">
              <span>Total Across Chains</span>
              <span className="font-bold text-[#1C2B3C]">{totalBalance} USDC</span>
            </div>
            <button
              onClick={() => {
                setDropdownOpen(false);
                openTopUpModal();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-sm bg-[#1C2B3C] text-white hover:bg-[#111A24] text-[9px] font-bold tracking-widest uppercase transition-all shadow-sm border border-[#1C2B3C]"
            >
              BRIDGE / TOP UP <ArrowRight className="h-3 w-3" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
