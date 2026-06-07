'use client';

import React from 'react';
import { useCircleApp } from '@/contexts/CircleAppContext';
import { X, CheckCircle, ExternalLink, ShieldCheck, Zap } from 'lucide-react';
import { useAccount } from 'wagmi';

export default function GaslessReceiptModal() {
  const { address } = useAccount();
  const {
    receiptModalOpen,
    setReceiptModalOpen,
    receiptData
  } = useCircleApp();

  if (!receiptModalOpen || !receiptData) return null;

  const handleClose = () => {
    setReceiptModalOpen(false);
  };

  const truncatedHash = receiptData.txHash 
    ? `${receiptData.txHash.slice(0, 8)}...${receiptData.txHash.slice(-8)}`
    : '';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1C2B3C]/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-sm border border-[#E0DDD5] bg-[#F2F1EC] text-[#1C2B3C] shadow-2xl transition-all duration-300 transform scale-100 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E0DDD5] px-6 py-4.5 bg-gradient-to-r from-[#1C2B3C]/5 to-[#2F855A]/5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#2F855A] text-white">
              <Zap className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-widest uppercase">Gasless Receipt</h3>
              <p className="text-[10px] text-[#2F855A] font-mono tracking-wider font-bold">SPONSORED BY CIRCLE PAYMASTER</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="rounded-sm p-1.5 text-[#5A6573] hover:bg-[#E7E5DD] hover:text-[#1C2B3C] transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Status Alert */}
          <div className="text-center space-y-2 py-4">
            <CheckCircle className="h-12 w-12 text-[#2F855A] mx-auto" />
            <h4 className="text-base font-black tracking-tight text-[#1C2B3C] uppercase">Transaction Confirmed</h4>
            <p className="text-xs text-[#5A6573] font-mono leading-none">
              TYPE: {receiptData.txName.toUpperCase()}
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="rounded-sm border border-[#E0DDD5] bg-white p-4 space-y-3 font-mono text-xs shadow-inner">
            <div className="flex justify-between items-center pb-2 border-b border-[#E0DDD5]">
              <span className="text-[#5A6573]">Gas Sponsored</span>
              <span className="font-bold text-[#2F855A] flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> 100% COVERED
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#5A6573]">Network Gas Price</span>
              <span className="font-bold text-[#1C2B3C]">{receiptData.gasSaved} USDC</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#5A6573]">Your Gas Payment</span>
              <span className="font-bold text-[#2F855A]">0.00 USDC0</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E0DDD5]">
              <span className="text-[#5A6573]">Surcharge (10%)</span>
              <span className="font-bold text-[#2F855A]">$0.00 (Waived)</span>
            </div>

            <div className="flex justify-between pt-1 font-sans font-bold text-[#1C2B3C] text-sm">
              <span>Saved Gas Fees</span>
              <span className="text-[#2F855A] font-mono font-black">+{receiptData.gasSaved} USDC</span>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-sm border border-[#E0DDD5] bg-[#EAE8E1]/40 p-4 space-y-2.5 text-[11px] font-mono text-[#5A6573]">
            <div className="flex justify-between">
              <span>Chain Network</span>
              <span className="font-bold text-[#1C2B3C]">Arc Testnet (5042002)</span>
            </div>
            {address && (
              <div className="flex justify-between">
                <span>Renter Wallet</span>
                <span className="font-bold text-[#1C2B3C]" title={address}>
                  {address.slice(0, 6)}...{address.slice(-6)}
                </span>
              </div>
            )}
            {receiptData.txHash && (
              <div className="flex justify-between items-center">
                <span>Transaction Hash</span>
                <a
                  href={`https://testnet.arcscan.app/tx/${receiptData.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-bold text-[#1C2B3C] underline hover:text-[#2F855A] transition-all"
                >
                  {truncatedHash} <ExternalLink className="h-3 w-3 inline" />
                </a>
              </div>
            )}
            <div className="flex justify-between">
              <span>Paymaster Type</span>
              <span className="font-bold text-[#1C2B3C]">Circle Permissionless v0.8</span>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleClose}
            className="w-full py-3.5 rounded-sm bg-[#1C2B3C] hover:bg-[#111A24] text-white text-[10px] font-bold tracking-widest uppercase transition-all shadow-sm border border-[#1C2B3C]"
          >
            CONFIRM RECEIPT
          </button>

        </div>

        {/* Footer */}
        <div className="border-t border-[#E0DDD5] bg-[#EAE8E1]/30 px-6 py-4.5 flex items-center justify-center text-[9px] font-mono text-[#5A6573]">
          <span className="text-center">
            GASLESS INFRASTRUCTURE POWERED BY CIRCLE PAYMASTER
          </span>
        </div>

      </div>
    </div>
  );
}
