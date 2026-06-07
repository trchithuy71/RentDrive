'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';

export interface SupportedSourceChain {
  id: string;
  name: string;
  icon: string;
}

export const SUPPORTED_SOURCE_CHAINS: SupportedSourceChain[] = [
  { id: 'EthereumSepolia', name: 'Ethereum Sepolia', icon: '🌐' },
  { id: 'BaseSepolia', name: 'Base Sepolia', icon: '🔵' },
  { id: 'ArbitrumSepolia', name: 'Arbitrum Sepolia', icon: '🌀' },
];

export interface ChainBalanceBreakdown {
  chain: string;
  confirmedBalance: string;
  pendingBalance?: string;
}

export interface UnifiedBalances {
  totalConfirmedBalance: string;
  totalPendingBalance?: string;
  breakdown: ChainBalanceBreakdown[];
}

export interface BridgeStepProgress {
  name: string;
  state: 'idle' | 'pending' | 'success' | 'error' | 'noop';
  txHash?: string;
  explorerUrl?: string;
}

export interface BridgeProgress {
  state: 'idle' | 'pending' | 'success' | 'error';
  amount: string;
  sourceChain: string;
  destinationChain: string;
  steps: BridgeStepProgress[];
  error?: string;
}

interface CircleAppContextType {
  sdkLoaded: boolean;
  adapter: any | null;
  kit: any | null;
  balances: UnifiedBalances | null;
  fetchingBalances: boolean;
  refreshBalances: () => Promise<void>;
  
  // Bridge Modal & Wizard Controls
  bridgeModalOpen: boolean;
  setBridgeModalOpen: (open: boolean) => void;
  targetTopUpAmount: string | null;
  openTopUpModal: (amountNeeded?: string) => void;
  
  // Bridge Action & Progress
  isBridging: boolean;
  bridgeProgress: BridgeProgress | null;
  bridgeUSDC: (sourceChainKey: string, amount: string) => Promise<boolean>;
  resetBridge: () => void;
  estimateBridgeFee: (sourceChainKey: string, amount: string) => Promise<string | null>;

  // Gasless Paymaster controls
  gaslessEnabled: boolean;
  setGaslessEnabled: (enabled: boolean) => void;
  receiptModalOpen: boolean;
  setReceiptModalOpen: (open: boolean) => void;
  receiptData: {
    txName: string;
    gasSaved: string;
    txHash: string;
  } | null;
  triggerReceiptModal: (txName: string, gasSaved: string, txHash: string) => void;
}

const CircleAppContext = createContext<CircleAppContextType | undefined>(undefined);

export function CircleAppProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, connector } = useAccount();
  
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [kit, setKit] = useState<any | null>(null);
  const [adapter, setAdapter] = useState<any | null>(null);
  const [balances, setBalances] = useState<UnifiedBalances | null>(null);
  const [fetchingBalances, setFetchingBalances] = useState(false);
  
  // Modal states
  const [bridgeModalOpen, setBridgeModalOpen] = useState(false);
  const [targetTopUpAmount, setTargetTopUpAmount] = useState<string | null>(null);
  
  // Bridge progress tracking
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeProgress, setBridgeProgress] = useState<BridgeProgress | null>(null);

  // Gasless Paymaster states
  const [gaslessEnabled, setGaslessEnabled] = useState(true); // Default to true for smooth demo!
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    txName: string;
    gasSaved: string;
    txHash: string;
  } | null>(null);

  const triggerReceiptModal = useCallback((txName: string, gasSaved: string, txHash: string) => {
    setReceiptData({ txName, gasSaved, txHash });
    setReceiptModalOpen(true);
  }, []);

  // Dynamic loader function
  const initSDK = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const appKitMod = await import('@circle-fin/app-kit');
      const adapterMod = await import('@circle-fin/adapter-viem-v2');
      
      const newKit = new appKitMod.AppKit();
      setKit(newKit);
      setSdkLoaded(true);
      return { kit: newKit, adapterMod };
    } catch (error) {
      console.error('Failed to initialize Circle App Kit SDK:', error);
    }
    return null;
  }, []);

  // Initialize the wallet adapter when connected
  useEffect(() => {
    let active = true;
    
    async function setupAdapter() {
      if (!isConnected || !connector) {
        setAdapter(null);
        setBalances(null);
        return;
      }
      
      try {
        const sdk = await initSDK();
        if (!sdk || !active) return;
        
        const provider = await connector.getProvider();
        const newAdapter = await sdk.adapterMod.createViemAdapterFromProvider({
          provider: provider as any,
        });
        
        if (active) {
          setAdapter(newAdapter);
        }
      } catch (error) {
        console.error('Error setting up Circle adapter:', error);
      }
    }
    
    setupAdapter();
    
    return () => {
      active = false;
    };
  }, [isConnected, connector, initSDK]);

  // Fetch balances helper
  const refreshBalances = useCallback(async () => {
    if (!sdkLoaded || !kit || !address) {
      return;
    }
    
    setFetchingBalances(true);
    try {
      // Query balances across all chains for this account
      const result = await kit.unifiedBalance.getBalances({
        token: 'USDC',
        sources: { account: address },
        includePending: true,
      });
      
      setBalances({
        totalConfirmedBalance: result.totalConfirmedBalance || '0.00',
        totalPendingBalance: result.totalPendingBalance,
        breakdown: result.breakdown.map((item: any) => ({
          chain: item.chain,
          confirmedBalance: item.confirmedBalance,
          pendingBalance: item.pendingBalance,
        })),
      });
    } catch (error) {
      console.error('Failed to query unified balances:', error);
    } finally {
      setFetchingBalances(false);
    }
  }, [sdkLoaded, kit, address]);

  // Automatically refresh balances when adapter is ready or address changes
  useEffect(() => {
    if (adapter && address) {
      refreshBalances();
    } else {
      setBalances(null);
    }
  }, [adapter, address, refreshBalances]);

  // Estimate bridge fee helper
  const estimateBridgeFee = useCallback(async (sourceChainKey: string, amount: string): Promise<string | null> => {
    if (!kit || !adapter) return null;
    
    try {
      const chainsMod = await import('@circle-fin/app-kit/chains');
      const sourceChainObj = (chainsMod as any)[sourceChainKey];
      const targetChainObj = (chainsMod as any)['ArcTestnet'];
      
      if (!sourceChainObj) {
        console.error(`Source chain ${sourceChainKey} not found in App Kit chains.`);
        return null;
      }

      const estimate = await kit.estimateBridge({
        from: { adapter, chain: sourceChainObj },
        to: { adapter, chain: targetChainObj },
        amount,
        token: 'USDC',
      });
      
      // Parse fee if present
      if (estimate && estimate.fees) {
        // Find total protocol/gas fees or return a combined display fee
        // Usually returns { fees: [{ amount, type, ... }] }
        let totalFee = 0;
        for (const fee of estimate.fees) {
          totalFee += parseFloat(fee.amount || '0');
        }
        return totalFee.toFixed(4);
      }
      return '0.00';
    } catch (e) {
      console.error('Failed to estimate bridge fee:', e);
      return null;
    }
  }, [kit, adapter]);

  // Bridge action handler
  const bridgeUSDC = useCallback(async (sourceChainKey: string, amount: string): Promise<boolean> => {
    if (!kit || !adapter) {
      console.error('Bridge invoked before SDK/Adapter was initialized');
      return false;
    }
    
    setIsBridging(true);
    
    // Setup initial progress
    setBridgeProgress({
      state: 'pending',
      amount,
      sourceChain: sourceChainKey,
      destinationChain: 'ArcTestnet',
      steps: [
        { name: 'Approve USDC', state: 'idle' },
        { name: 'Burn on Source Chain', state: 'idle' },
        { name: 'Poll Attestation & Mint on Arc', state: 'idle' },
      ],
    });
    
    try {
      const chainsMod = await import('@circle-fin/app-kit/chains');
      const sourceChainObj = (chainsMod as any)[sourceChainKey];
      const targetChainObj = (chainsMod as any)['ArcTestnet'];
      
      if (!sourceChainObj) {
        throw new Error(`Source chain ${sourceChainKey} not found`);
      }
      
      // Update progress callback mapping from SDK steps to our UI steps
      // AppKit runs bridge asynchronously, but we can subscribe to progress or watch execution steps
      const result = await kit.bridge({
        from: { adapter, chain: sourceChainObj },
        to: { adapter, chain: targetChainObj },
        amount,
        token: 'USDC',
      });
      
      // Map final SDK steps
      const uiSteps: BridgeStepProgress[] = result.steps.map((step: any) => ({
        name: step.name,
        state: step.state,
        txHash: step.txHash,
        explorerUrl: step.explorerUrl,
      }));
      
      if (result.state === 'success') {
        setBridgeProgress({
          state: 'success',
          amount,
          sourceChain: sourceChainKey,
          destinationChain: 'ArcTestnet',
          steps: uiSteps,
        });
        
        // Refresh balances
        refreshBalances();
        setIsBridging(false);
        return true;
      } else {
        const errorMsg = result.steps.find((s: any) => s.state === 'error')?.error?.message || 'Bridge transaction failed';
        setBridgeProgress((prev) => prev ? {
          ...prev,
          state: 'error',
          steps: uiSteps,
          error: errorMsg,
        } : null);
        
        setIsBridging(false);
        return false;
      }
    } catch (error: any) {
      console.error('Error in bridgeUSDC:', error);
      const errMsg = error.message || 'An unexpected error occurred during the bridge process.';
      setBridgeProgress((prev) => prev ? {
        ...prev,
        state: 'error',
        error: errMsg,
      } : {
        state: 'error',
        amount,
        sourceChain: sourceChainKey,
        destinationChain: 'ArcTestnet',
        steps: [
          { name: 'Approve USDC', state: 'error' },
          { name: 'Burn on Source Chain', state: 'idle' },
          { name: 'Poll Attestation & Mint on Arc', state: 'idle' },
        ],
        error: errMsg,
      });
      setIsBridging(false);
      return false;
    }
  }, [kit, adapter, refreshBalances]);

  const resetBridge = useCallback(() => {
    setBridgeProgress(null);
    setIsBridging(false);
  }, []);

  const openTopUpModal = useCallback((amountNeeded?: string) => {
    if (amountNeeded) {
      setTargetTopUpAmount(amountNeeded);
    } else {
      setTargetTopUpAmount(null);
    }
    setBridgeModalOpen(true);
  }, []);

  return (
    <CircleAppContext.Provider
      value={{
        sdkLoaded,
        adapter,
        kit,
        balances,
        fetchingBalances,
        refreshBalances,
        bridgeModalOpen,
        setBridgeModalOpen,
        targetTopUpAmount,
        openTopUpModal,
        isBridging,
        bridgeProgress,
        bridgeUSDC,
        resetBridge,
        estimateBridgeFee,
        gaslessEnabled,
        setGaslessEnabled,
        receiptModalOpen,
        setReceiptModalOpen,
        receiptData,
        triggerReceiptModal,
      }}
    >
      {children}
    </CircleAppContext.Provider>
  );
}

export function useCircleApp() {
  const context = useContext(CircleAppContext);
  if (context === undefined) {
    throw new Error('useCircleApp must be used within a CircleAppProvider');
  }
  return context;
}
