'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { Address, formatUnits, parseUnits, erc20Abi } from 'viem';
import { ArrowRightLeft, ShieldCheck, Zap, RefreshCw, AlertTriangle, CheckCircle, Info, Landmark } from 'lucide-react';
import { CURRENCY_CONFIG, type CurrencySymbol, formatCurrency } from '@/lib/stablefx';
import { useModal } from '@/contexts/ModalContext';
import { useCircleApp } from '@/contexts/CircleAppContext';
import { CurrencyBadge, FXRateDisplay } from './CurrencySelector';

export default function SwapConsole() {
  const { isConnected, address } = useAccount();
  const { showModal, hideModal } = useModal();
  const { balances, refreshBalances, gaslessEnabled } = useCircleApp();

  const [fromToken, setFromToken] = useState<CurrencySymbol>('USDC');
  const [toToken, setToToken] = useState<CurrencySymbol>('EURC');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  
  // Rate engine state
  const [fxRate, setFxRate] = useState<number>(0.92);
  const [fxSource, setFxSource] = useState<'stablefx_api' | 'fallback'>('fallback');
  const [fetchingRate, setFetchingRate] = useState(false);

  // Swap transaction state
  const [swapping, setSwapping] = useState(false);
  const [slippage, setSlippage] = useState<number>(200); // 200 bps = 2%
  const [showSettings, setShowSettings] = useState(false);

  // Contract read for local wallet balance
  const tokenInAddress = CURRENCY_CONFIG[fromToken].address;
  const { data: tokenInBalance, refetch: refetchTokenInBalance } = useReadContract({
    address: tokenInAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const formattedTokenInBalance = tokenInBalance
    ? Number(formatUnits(tokenInBalance as bigint, CURRENCY_CONFIG[fromToken].decimals)).toFixed(2)
    : '0.00';

  useEffect(() => {
    fetchRate();
  }, [fromToken, toToken]);

  // Handle live conversion
  useEffect(() => {
    if (!amountIn || isNaN(parseFloat(amountIn))) {
      setAmountOut('');
      return;
    }
    const calculated = parseFloat(amountIn) * fxRate;
    setAmountOut(calculated.toFixed(4));
  }, [amountIn, fxRate]);

  const fetchRate = async () => {
    setFetchingRate(true);
    try {
      const res = await fetch(`/api/fx-rate?from=${fromToken}&to=${toToken}`);
      const data = await res.json();
      if (data.success) {
        setFxRate(data.rate);
        setFxSource(data.source);
      }
    } catch (e) {
      console.error('Failed to fetch rate:', e);
      // Fallback
      setFxRate(fromToken === 'USDC' ? 0.92 : 1.087);
      setFxSource('fallback');
    } finally {
      setFetchingRate(false);
    }
  };

  const handleSwitchTokens = () => {
    const prevFrom = fromToken;
    setFromToken(toToken);
    setToToken(prevFrom);
    setAmountIn('');
    setAmountOut('');
  };

  const handleSwap = async () => {
    if (!isConnected || !address) {
      showModal({
        type: 'error',
        title: 'CONNECT WALLET REQUIRED',
        message: 'Please link your active Web3 wallet to authorize stablecoin swaps.',
      });
      return;
    }

    const val = parseFloat(amountIn);
    if (isNaN(val) || val <= 0) {
      showModal({
        type: 'error',
        title: 'INVALID AMOUNT',
        message: 'Please enter a valid swap amount.',
      });
      return;
    }

    const userBalanceVal = parseFloat(formattedTokenInBalance);
    if (val > userBalanceVal) {
      showModal({
        type: 'error',
        title: 'INSUFFICIENT BALANCE',
        message: `You only have ${formattedTokenInBalance} ${fromToken} in your wallet.`,
      });
      return;
    }

    setSwapping(true);
    showModal({
      type: 'loading',
      title: 'EXECUTING STABLEFX SWAP',
      message: `Routing your ${amountIn} ${fromToken} -> ${toToken} order through Circle App Kit...`,
      preventClose: true,
    });

    try {
      // Execute swap API call
      const res = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIn: fromToken,
          tokenOut: toToken,
          amountIn,
          recipientAddress: address,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Refetch balances
        await Promise.all([
          refetchTokenInBalance(),
          refreshBalances(),
        ]);

        showModal({
          type: 'success',
          title: 'SWAP EXECUTION SUCCESSFUL',
          message: `Swapped ${amountIn} ${fromToken} successfully into ${parseFloat(data.amountOut).toFixed(2)} ${toToken}!`,
          primaryAction: {
            label: 'DISMISS',
            onClick: () => {
              setAmountIn('');
              setAmountOut('');
              hideModal();
            },
          },
        });
      } else {
        throw new Error(data.error || 'Failed to complete swap transaction');
      }
    } catch (e: any) {
      console.error('Swap failed:', e);
      showModal({
        type: 'error',
        title: 'SWAP TRANSACTION FAILED',
        message: e.message || 'The swap request timed out or was rejected.',
        primaryAction: {
          label: 'DISMISS',
          onClick: () => {},
        },
      });
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      
      {/* Header */}
      <div className="mb-8 border-b border-[#E0DDD5] pb-5">
        <h2 className="text-xl font-black text-[#1C2B3C] uppercase tracking-wider">
          Stablecoin Swap Console
        </h2>
        <p className="text-[10px] text-[#718096] font-mono tracking-widest uppercase mt-1">
          Swap seamlessly between USDC and EURC on Arc Testnet
        </p>
      </div>

      {/* Main card */}
      <div className="rounded-sm border border-[#E0DDD5] bg-white p-6 shadow-sm space-y-5">
        
        {/* Token In Block */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#718096] uppercase tracking-wider">
            <span>Pay From (Token In)</span>
            <span>Balance: {formattedTokenInBalance} {fromToken}</span>
          </div>
          <div className="relative rounded-sm border border-[#E0DDD5] bg-white p-3.5 flex items-center justify-between focus-within:border-[#1C2B3C] transition-all">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.00"
              disabled={swapping}
              className="bg-transparent text-lg font-black text-[#1C2B3C] outline-none w-2/3"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAmountIn(formattedTokenInBalance)}
                className="text-[9px] font-mono font-bold border border-[#E0DDD5] px-1.5 py-0.5 rounded-sm bg-[#F2F1EC] text-[#5A6573] hover:text-[#1C2B3C] hover:border-[#1C2B3C] transition-all"
              >
                MAX
              </button>
              <CurrencyBadge currency={fromToken} size="md" />
            </div>
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center -my-2.5 relative z-10">
          <button
            onClick={handleSwitchTokens}
            disabled={swapping}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C2B3C] text-white hover:bg-[#111A24] border border-[#1C2B3C] shadow-md transition-all hover:scale-105"
            title="Switch Tokens"
          >
            <ArrowRightLeft className="h-4.5 w-4.5 rotate-90" />
          </button>
        </div>

        {/* Token Out Block */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#718096] uppercase tracking-wider">
            <span>Receive (Token Out)</span>
            <span>Estimated output</span>
          </div>
          <div className="relative rounded-sm border border-[#E0DDD5] bg-[#F2F1EC] p-3.5 flex items-center justify-between">
            <input
              type="text"
              readOnly
              value={amountOut}
              placeholder="0.00"
              className="bg-transparent text-lg font-black text-[#5A6573] outline-none w-2/3 cursor-default"
            />
            <CurrencyBadge currency={toToken} size="md" />
          </div>
        </div>

        {/* FX rate display info */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#F2F1EC]">
          <span className="text-[10px] text-[#718096] font-bold uppercase tracking-wider">FX Rate:</span>
          {fetchingRate ? (
            <span className="text-[10px] font-mono text-[#718096]">Loading rate...</span>
          ) : (
            <FXRateDisplay rate={fxRate} from={fromToken} to={toToken} source={fxSource} />
          )}
        </div>

        {/* Slippage & Advanced Settings */}
        <div className="border-t border-[#F2F1EC] pt-3.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-[10px] font-bold text-[#1C2B3C] uppercase tracking-wider hover:opacity-80 flex items-center gap-1.5"
          >
            <Info className="h-3.5 w-3.5" />
            Swap Parameters {showSettings ? '[-]' : '[+]'}
          </button>

          {showSettings && (
            <div className="mt-3.5 p-3 rounded-sm border border-[#E0DDD5] bg-[#F2F1EC]/40 space-y-3.5 text-[10px] font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#718096] uppercase font-bold">Slippage Tolerance:</span>
                <div className="flex gap-1.5">
                  {[100, 200, 300].map((bps) => (
                    <button
                      key={bps}
                      onClick={() => setSlippage(bps)}
                      className={`px-2 py-1 rounded-sm border text-[9px] font-black ${
                        slippage === bps
                          ? 'bg-[#1C2B3C] text-white border-[#1C2B3C]'
                          : 'bg-white text-[#718096] border-[#E0DDD5] hover:text-[#1C2B3C]'
                      }`}
                    >
                      {(bps / 100).toFixed(1)}%
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[9px] text-[#718096] leading-relaxed">
                Tighter slippage reduces exposure to front-running and MEV sandwich attacks but increases the chance of swap failure during volatile market conditions.
              </p>
            </div>
          )}
        </div>

        {/* Gas sponsorship notice */}
        {gaslessEnabled && (
          <div className="rounded-sm bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-emerald-800 text-[10px] font-mono">
            <Zap className="h-4.5 w-4.5 text-emerald-600 fill-current shrink-0 mt-0.5" />
            <div>
              <p className="font-black uppercase tracking-wider text-emerald-900">GAS FEE SPONSORED</p>
              <p className="text-[9.5px] mt-0.5 leading-relaxed">
                This swap transaction fee is 100% sponsored by the Circle Paymaster Service on Arc Testnet.
              </p>
            </div>
          </div>
        )}

        {/* Aggregator Disclosure best practices */}
        <div className="rounded-sm bg-[#EAE8E1]/30 border border-[#DDDCD4]/60 p-3.5 flex items-start gap-2.5 text-[#718096] text-[9.5px] leading-relaxed">
          <Info className="h-4.5 w-4.5 text-[#5A6573] shrink-0 mt-0.5" />
          <div>
            Trades are routed through a third-party aggregator (currently LiFi), which may vary by route and is subject to change. Swaps are subject to the aggregator's terms of service.
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSwap}
          disabled={swapping || !amountIn || parseFloat(amountIn) <= 0}
          className="w-full py-4 rounded-sm bg-[#1C2B3C] text-white text-[11px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {swapping ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              SWAPPING TOKENS...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-4 w-4" />
              CONFIRM & EXECUTE SWAP
            </>
          )}
        </button>

      </div>

    </div>
  );
}
