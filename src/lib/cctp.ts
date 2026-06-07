import { Address, Hex, pad } from 'viem';

export interface CctpNetwork {
  name: string;
  chainId: number;
  domainId: number;
  usdcAddress: Address;
  tokenMessenger: Address;
  messageTransmitter: Address;
  rpcUrl: string;
}

export const CCTP_NETWORKS: Record<number, CctpNetwork> = {
  11155111: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    domainId: 0,
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    tokenMessenger: '0x9f3B8679c73C23f8b5994FE35A967EE0665c824C',
    messageTransmitter: '0x7865fAFC2db0F93Fe19d854195c68ad401c10dD0',
    rpcUrl: 'https://rpc.ankr.com/eth_sepolia',
  },
  84532: {
    name: 'Base Sepolia',
    chainId: 84532,
    domainId: 6,
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    tokenMessenger: '0x9f3B8679c73C23f8b5994FE35A967EE0665c824C',
    messageTransmitter: '0x7865fAFC2db0F93Fe19d854195c68ad401c10dD0',
    rpcUrl: 'https://sepolia.base.org',
  },
  421614: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    domainId: 3,
    usdcAddress: '0x75faf114eafb1BD239ee39414c6F1c23f8dD0A35',
    tokenMessenger: '0x9f3B8679c73C23f8b5994FE35A967EE0665c824C',
    messageTransmitter: '0x7865fAFC2db0F93Fe19d854195c68ad401c10dD0',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  },
};

export const ARC_CCTP_DOMAIN = 26;

// Estimate cross-chain transaction fees upfront in USDC terms
export function estimateCrossChainFees(chainId: number, depositAmount: number) {
  const network = CCTP_NETWORKS[chainId];
  if (!network) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  // Static gas estimators in USDC terms (simulating real network prices)
  const sourceGasFee = chainId === 11155111 ? 1.5 : chainId === 421614 ? 0.25 : 0.15;
  const cctpFee = 0.0; // Testnet is fee-less
  const targetGasFee = 0.005; // Arc Testnet transaction gas
  const totalFee = sourceGasFee + cctpFee + targetGasFee + depositAmount;

  return {
    sourceGasFee,
    cctpFee,
    targetGasFee,
    depositAmount,
    totalFee,
  };
}

export function padAddressToBytes32(address: Address): Hex {
  return pad(address, { size: 32 });
}
