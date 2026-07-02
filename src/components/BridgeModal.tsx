'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCircleApp, SUPPORTED_SOURCE_CHAINS } from '@/contexts/CircleAppContext';
import { useAccount } from 'wagmi';
import { X, ArrowRight, Wallet, CheckCircle, AlertTriangle, Loader2, ExternalLink, RefreshCw, HelpCircle } from 'lucide-react';
import { formatUnits } from 'viem';

export default function BridgeModal() {
  const { address, isConnected } = useAccount();
  const {
    bridgeModalOpen,
    setBridgeModalOpen,
    targetTopUpAmount,
    balances,
    isBridging,
    bridgeProgress,
    bridgeUSDC,
    resetBridge,
    estimateBridgeFee,
    refreshBalances
  } = useCircleApp();

  const [sourceChain, setSourceChain] = useState('BaseSepolia');
  const [amount, setAmount] = useState('');
  const [estimatingFee, setEstimatingFee] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  
  // Ref to debounce fee estimation
  const feeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync target amount when modal opens
  useEffect(() => {
    if (bridgeModalOpen && targetTopUpAmount) {
      setAmount(targetTopUpAmount);
    }
  }, [bridgeModalOpen, targetTopUpAmount]);

  // Handle fee estimation debouncing
  useEffect(() => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setEstimatedFee(null);
      return;
    }

    if (feeTimeoutRef.current) {
      clearTimeout(feeTimeoutRef.current);
    }

    setEstimatingFee(true);
    feeTimeoutRef.current = setTimeout(async () => {
      const fee = await estimateBridgeFee(sourceChain, amount);
      setEstimatedFee(fee);
      setEstimatingFee(false);
    }, 600);

    return () => {
      if (feeTimeoutRef.current) clearTimeout(feeTimeoutRef.current);
    };
  }, [amount, sourceChain, estimateBridgeFee]);

  const [isRendered, setIsRendered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (bridgeModalOpen) {
      setIsRendered(true);
      const frame = requestAnimationFrame(() => {
        setIsOpen(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsOpen(false);
      const timeout = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [bridgeModalOpen]);

  const handleClose = () => {
    if (isBridging) return; // Prevent closing while transaction is in progress
    setBridgeModalOpen(false);
    resetBridge();
  };

  if (!isRendered) return null;

  const handleBridge = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;
    await bridgeUSDC(sourceChain, amount);
  };

  // Get current Arc balance from unified balance breakdown
  const arcBalance = balances?.breakdown.find(b => b.chain.toLowerCase().includes('arc'))?.confirmedBalance || '0.00';
  
  // Get source chain balance
  const sourceChainDetails = SUPPORTED_SOURCE_CHAINS.find(c => c.id === sourceChain);
  const sourceChainBalance = balances?.breakdown.find(b => b.chain.toLowerCase().includes(sourceChain.toLowerCase().replace('sepolia', '')) || b.chain.toLowerCase().includes(sourceChain.toLowerCase()))?.confirmedBalance || '0.00';

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-premium-modal ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1C2B3C]/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal Card */}
      <div className={`relative w-full max-w-lg overflow-hidden rounded-sm border border-[#E0DDD5] bg-[#F2F1EC] text-[#1C2B3C] shadow-2xl transition-premium-modal flex flex-col max-h-[90vh] ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E0DDD5] px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#1C2B3C] text-white">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-widest uppercase">Circle App Kit Bridge</h3>
              <p className="text-[10px] text-[#5A6573] font-mono tracking-wider">CROSS-CHAIN USDC LIQUIDITY</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            disabled={isBridging}
            className="rounded-sm p-1.5 text-[#5A6573] hover:bg-[#E7E5DD] hover:text-[#1C2B3C] disabled:opacity-30 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Container (Scrollable) */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Unconnected Warning */}
          {!isConnected && (
            <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Wallet Disconnected</p>
                <p className="text-[11px] mt-1 text-amber-800">
                  Please connect your wallet in the navbar to bridge USDC and view your unified balance.
                </p>
              </div>
            </div>
          )}

          {isConnected && !bridgeProgress && (
            /* WIZARD FLOW INITIAL STATE */
            <div className="space-y-5">
              
              {/* Balance Summary Header */}
              <div className="grid grid-cols-2 gap-4 rounded-sm border border-[#E0DDD5] bg-white/50 p-4">
                <div>
                  <span className="text-[9px] font-mono text-[#5A6573] uppercase tracking-wider block">Arc USDC Balance</span>
                  <span className="text-lg font-black tracking-tight text-[#1C2B3C]">{arcBalance} USDC</span>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-[#5A6573] uppercase tracking-wider block">Unified USDC Balance</span>
                  <span className="text-lg font-black tracking-tight text-[#1C2B3C]">{balances?.totalConfirmedBalance || '0.00'} USDC</span>
                </div>
              </div>

              {/* Step 1: Select Source Chain */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-[#5A6573] uppercase block">
                  Select Source Chain
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SUPPORTED_SOURCE_CHAINS.map((chain) => {
                    const isSelected = sourceChain === chain.id;
                    return (
                      <button
                        key={chain.id}
                        onClick={() => setSourceChain(chain.id)}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-sm border transition-all ${
                          isSelected 
                            ? 'border-[#1C2B3C] bg-[#1C2B3C] text-white shadow-sm'
                            : 'border-[#E0DDD5] bg-white hover:border-[#1C2B3C]/50 hover:bg-[#F2F1EC]'
                        }`}
                      >
                        <span className="text-xl mb-1.5">{chain.icon}</span>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-center block leading-tight">
                          {chain.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#5A6573] px-1">
                  <span>Target: Arc Testnet</span>
                  <span>Source Balance: {sourceChainBalance} USDC</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold tracking-widest text-[#5A6573] uppercase">
                    Amount to Bridge
                  </label>
                  {targetTopUpAmount && (
                    <span className="text-[9px] font-mono bg-[#1C2B3C]/10 text-[#1C2B3C] px-1.5 py-0.5 rounded-sm font-bold uppercase">
                      Required: {targetTopUpAmount} USDC
                    </span>
                  )}
                </div>
                <div className="relative rounded-sm border border-[#E0DDD5] bg-white shadow-inner focus-within:border-[#1C2B3C] transition-all form-focus-ring">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50.00"
                    disabled={isBridging}
                    className="w-full bg-transparent px-4 py-3.5 text-base font-bold text-[#1C2B3C] outline-none disabled:opacity-50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setAmount(sourceChainBalance)}
                      className="text-[9px] font-mono font-bold border border-[#E0DDD5] hover:border-[#1C2B3C] px-1.5 py-0.5 rounded-sm bg-[#F2F1EC] text-[#5A6573] hover:text-[#1C2B3C] transition-all"
                    >
                      MAX
                    </button>
                    <span className="text-xs font-mono font-bold text-[#5A6573]">USDC</span>
                  </div>
                </div>
                <span className="text-[9px] text-[#718096] font-semibold mt-1 block px-1">💡 Bridge locks or burns stablecoins on the source chain and releases them on Arc.</span>
              </div>

              {/* Estimate Details */}
              <div className="rounded-sm border border-[#E0DDD5] bg-[#EAE8E1]/40 p-4 space-y-2 text-xs font-mono text-[#5A6573]">
                <div className="flex justify-between">
                  <span>Routing Speed</span>
                  <span className="font-bold text-[#1C2B3C] uppercase">FAST (CCTP V2)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Estimated Bridge Fee</span>
                  <span className="font-bold text-[#1C2B3C]">
                    {estimatingFee ? (
                      <Loader2 className="h-3 w-3 animate-spin inline" />
                    ) : estimatedFee ? (
                      `${estimatedFee} USDC`
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="border-t border-[#E0DDD5] pt-2 flex justify-between font-bold text-[#1C2B3C]">
                  <span>Total Deducted</span>
                  <span>
                    {amount && !isNaN(parseFloat(amount))
                      ? `${(parseFloat(amount) + parseFloat(estimatedFee || '0')).toFixed(4)} USDC`
                      : '0.00 USDC'}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleBridge}
                disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || estimatingFee}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-sm bg-[#1C2B3C] text-white text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm border border-[#1C2B3C]"
              >
                BRIDGE TO ARC NETWORK <ArrowRight className="h-4 w-4" />
              </button>
              
              <p className="text-[10px] text-center text-[#5A6573] leading-normal font-sans px-4">
                Circle Cross-Chain Transfer Protocol (CCTP) securely burns USDC on the source chain and mints it natively on Arc. Bridges complete in ~1-2 minutes.
              </p>
            </div>
          )}

          {isConnected && bridgeProgress && (
            /* BRIDGE PROGRESS STATUS VIEW */
            <div className="space-y-6">
              
              {/* Progress Title */}
              <div className="text-center space-y-1">
                {bridgeProgress.state === 'pending' && (
                  <>
                    <Loader2 className="h-9 w-9 animate-spin text-[#1C2B3C] mx-auto mb-2" />
                    <h4 className="text-sm font-bold tracking-widest uppercase">Bridging in Progress</h4>
                    <p className="text-[11px] text-[#5A6573]">
                      Moving {bridgeProgress.amount} USDC from {sourceChainDetails?.name} to Arc
                    </p>
                  </>
                )}
                {bridgeProgress.state === 'success' && (
                  <>
                    <CheckCircle className="h-9 w-9 text-[#2F855A] mx-auto mb-2" />
                    <h4 className="text-sm font-bold tracking-widest uppercase text-[#2F855A]">Bridge Successful!</h4>
                    <p className="text-[11px] text-[#5A6573]">
                      {bridgeProgress.amount} USDC has arrived on Arc Network
                    </p>
                  </>
                )}
                {bridgeProgress.state === 'error' && (
                  <>
                    <AlertTriangle className="h-9 w-9 text-[#C53030] mx-auto mb-2" />
                    <h4 className="text-sm font-bold tracking-widest uppercase text-[#C53030]">Bridge Failed</h4>
                    <p className="text-[11px] text-[#C53030] max-w-sm mx-auto">
                      {bridgeProgress.error || 'Transaction was reverted or timed out.'}
                    </p>
                  </>
                )}
              </div>

              {/* Bridge Steps Timeline */}
              <div className="rounded-sm border border-[#E0DDD5] bg-white p-4 space-y-4">
                {bridgeProgress.steps.map((step, idx) => {
                  const isPending = step.state === 'pending';
                  const isSuccess = step.state === 'success' || step.state === 'noop';
                  const isError = step.state === 'error';
                  const isIdle = step.state === 'idle';

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start justify-between gap-3 p-3 rounded-sm border transition-all ${
                        isPending ? 'bg-[#1C2B3C]/5 border-[#1C2B3C]' : 
                        isSuccess ? 'bg-[#F2F9F5] border-[#D1E7DD]/60' :
                        isError ? 'bg-[#FFF5F5] border-[#FEB2B2]/60' : 'bg-gray-50 border-gray-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex shrink-0 h-6 w-6 items-center justify-center rounded-full text-xs font-mono font-bold">
                          {isPending && <Loader2 className="h-4.5 w-4.5 animate-spin text-[#1C2B3C]" />}
                          {isSuccess && <span className="text-[#2F855A] font-bold">✓</span>}
                          {isError && <span className="text-[#C53030] font-bold">✗</span>}
                          {isIdle && <span className="text-gray-400 font-bold">{idx + 1}</span>}
                        </div>
                        <div>
                          <p className={`text-[11px] font-bold tracking-wide uppercase ${
                            isPending ? 'text-[#1C2B3C]' :
                            isSuccess ? 'text-[#2F855A]' :
                            isError ? 'text-[#C53030]' : 'text-gray-500'
                          }`}>
                            {step.name}
                          </p>
                          {isPending && idx === 2 && (
                            <p className="text-[9px] text-[#5A6573] mt-0.5 leading-normal">
                              Waiting for CCTP attestation (~60s consensus delay)...
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {step.txHash && (
                        <a
                          href={step.explorerUrl || `https://testnet.arcscan.app/tx/${step.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#1C2B3C] border border-[#E0DDD5] hover:border-[#1C2B3C] px-2 py-1 rounded-sm bg-white hover:bg-[#F2F1EC] transition-all"
                        >
                          EXPLORER <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Finish or Action Buttons */}
              <div className="space-y-3">
                {bridgeProgress.state === 'success' && (
                  <button
                    onClick={handleClose}
                    className="w-full py-4 rounded-sm bg-[#2F855A] hover:bg-[#225E3E] text-white text-[10px] font-bold tracking-widest uppercase border border-[#2F855A] transition-all shadow-sm"
                  >
                    CLOSE WIZARD & RENT
                  </button>
                )}
                
                {bridgeProgress.state === 'error' && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={resetBridge}
                      className="py-4 rounded-sm bg-white hover:bg-[#EAE8E1] text-[#1C2B3C] text-[10px] font-bold tracking-widest uppercase border border-[#DDDCD4] transition-all"
                    >
                      TRY AGAIN
                    </button>
                    <button
                      onClick={handleClose}
                      className="py-4 rounded-sm bg-[#1C2B3C] text-white text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] border border-[#1C2B3C] transition-all"
                    >
                      CLOSE WIZARD
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="border-t border-[#E0DDD5] bg-[#EAE8E1]/30 px-6 py-4 flex items-center justify-between text-[9px] font-mono text-[#5A6573]">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 cursor-pointer" onClick={() => refreshBalances()} />
            LAST SYNCED: {balances ? 'JUST NOW' : 'WAITING FOR SYNC'}
          </span>
          <span className="flex items-center gap-1">
            SECURED BY CIRCLE APP KIT
          </span>
        </div>

      </div>
    </div>
  );
}
