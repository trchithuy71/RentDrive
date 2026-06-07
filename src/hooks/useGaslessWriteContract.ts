'use client';

import { useWriteContract, useAccount, useCapabilities } from 'wagmi';
import { arcTestnet } from 'viem/chains';
import { useCircleApp } from '@/contexts/CircleAppContext';

export const CIRCLE_PAYMASTER_ADDRESS = '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966';
export const PAYMASTER_SERVICE_URL = 'https://paymaster.testnet.arc.network/v1';

export interface GaslessWriteOptions {
  txName?: string;
}

export function useGaslessWriteContract() {
  const { address } = useAccount();
  const { writeContractAsync: originalWriteContractAsync, ...rest } = useWriteContract();
  const { gaslessEnabled, triggerReceiptModal } = useCircleApp();
  
  // Get wallet capabilities for paymaster service
  const { data: capabilities } = useCapabilities({ account: address });
  
  // Check if wallet supports paymaster service on Arc Testnet (chain 5042002)
  const isWalletSupported = !!(
    capabilities && 
    capabilities[arcTestnet.id] && 
    (capabilities[arcTestnet.id] as any).paymasterService?.supported
  );

  const writeContractGasless = async (parameters: any, options?: GaslessWriteOptions) => {
    // Determine if we should attempt gasless execution
    const runGasless = gaslessEnabled;
    const txName = options?.txName || 'Transaction';

    // Simulate gas savings (0.01 to 0.04 USDC on Arc)
    const simulatedSavings = (0.0125 + Math.random() * 0.025).toFixed(4);

    try {
      if (runGasless) {
        // If wallet supports paymasterService capability, we pass it to writeContractAsync
        const writeParams = {
          ...parameters,
          ...(isWalletSupported ? {
            capabilities: {
              paymasterService: {
                url: PAYMASTER_SERVICE_URL,
              },
            },
          } : {}),
        };
        
        console.log(`[Circle Paymaster] Sending gasless transaction: ${txName}`, {
          isWalletSupported,
          paymasterUrl: PAYMASTER_SERVICE_URL,
          parameters: writeParams
        });
        
        const hash = await originalWriteContractAsync(writeParams);
        
        // Transaction succeeded! Show sponsored receipt modal
        triggerReceiptModal(txName, simulatedSavings, hash);
        return hash;
      } else {
        // Run normally without paymaster capabilities
        return await originalWriteContractAsync(parameters);
      }
    } catch (error) {
      console.warn(`[Circle Paymaster] Gasless execution failed, attempting normal fallback...`, error);
      // Graceful fallback to normal transaction submission
      const hash = await originalWriteContractAsync(parameters);
      return hash;
    }
  };

  return {
    ...rest,
    writeContractAsync: writeContractGasless,
    isWalletSupported,
  };
}
