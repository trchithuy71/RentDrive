'use client';

import React, { ReactNode } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http } from 'wagmi';
import { arcTestnet } from 'viem/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Get project ID from env or fallback
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'cb4474775d710b77626922d56a2bb215'; // Public fallback

const config = getDefaultConfig({
  appName: 'RentDrive',
  projectId: projectId,
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'),
  },
  ssr: true,
});

import { CircleAppProvider } from '@/contexts/CircleAppContext';

export function Web3ContextProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={lightTheme({
          accentColor: '#1C2B3C', // Portage Navy
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
          <CircleAppProvider>
            {children}
          </CircleAppProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

