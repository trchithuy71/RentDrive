import { createPublicClient, createWalletClient, http, getContract, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from 'viem/chains';

// Load ABI
let contractArtifact: any;
try {
  contractArtifact = require('../contracts/RentDrive.json');
} catch (e) {
  // Fallback in case compiled artifact is missing during next build
  contractArtifact = { abi: [], bytecode: '' };
}

const RPC_URL = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

export const isContractConfigured = () => {
  return !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x' && CONTRACT_ADDRESS.startsWith('0x');
};

// Public client for reading contract state
export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL),
});

// Admin wallet client for Oracle telemetry updates and dispute resolution
const getAdminWalletClient = () => {
  if (!PRIVATE_KEY) return null;
  const formattedKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
  const account = privateKeyToAccount(formattedKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  });
};

export const adminWalletClient = getAdminWalletClient();

// Expose smart contract helper
export const getRentDriveContract = () => {
  if (!isContractConfigured()) return null;
  return getContract({
    address: CONTRACT_ADDRESS,
    abi: contractArtifact.abi,
    client: {
      public: publicClient,
      wallet: adminWalletClient || undefined,
    },
  });
};

/**
 * Report telemetry data to the on-chain smart contract.
 * Executed by the platform admin/oracle account.
 */
export async function updateTelemetryOnChain(
  rentalId: number,
  odometerMeters: number,
  speedKmH: number,
  crashDetected: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!isContractConfigured()) {
      console.log(`[Blockchain Simulator] Simulated telemetry update for Rental #${rentalId}: Odo=${odometerMeters}m, Speed=${speedKmH}km/h, Crash=${crashDetected}`);
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return { success: true, txHash: mockHash };
    }

    if (!adminWalletClient) {
      return { success: false, error: 'Admin PRIVATE_KEY is not configured in backend' };
    }

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'updateTelemetry',
      args: [BigInt(rentalId), BigInt(odometerMeters), BigInt(speedKmH), crashDetected],
      account: adminWalletClient.account!,
    });

    const txHash = await adminWalletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (error: any) {
    console.error('Failed to update telemetry on chain:', error);
    return { success: false, error: error.message || 'Unknown blockchain error' };
  }
}

/**
 * Admin resolves a dispute (e.g. physical damage payout details)
 */
export async function resolveDisputeOnChain(
  rentalId: number,
  payoutToOwner: number, // in USDC (6 decimals)
  refundToRenter: number // in USDC (6 decimals)
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!isContractConfigured()) {
      console.log(`[Blockchain Simulator] Simulated dispute resolution for Rental #${rentalId}: PayoutToOwner=${payoutToOwner} USDC, RefundToRenter=${refundToRenter} USDC`);
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return { success: true, txHash: mockHash };
    }

    if (!adminWalletClient) {
      return { success: false, error: 'Admin PRIVATE_KEY is not configured in backend' };
    }

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'resolveDispute',
      args: [BigInt(rentalId), BigInt(payoutToOwner), BigInt(refundToRenter)],
      account: adminWalletClient.account!,
    });

    const txHash = await adminWalletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { success: true, txHash };
  } catch (error: any) {
    console.error('Failed to resolve dispute on chain:', error);
    return { success: false, error: error.message || 'Unknown blockchain error' };
  }
}
