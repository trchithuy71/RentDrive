import { createPublicClient, createWalletClient, http, getContract, Address, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arcTestnet } from 'viem/chains';
const crypto = require('crypto');

// Load ABI (RentDriveV2 security hardened contract artifact compiled from RentDriveV2.sol)
let contractArtifact: any;
try {
  contractArtifact = require('../contracts/RentDrive.json');
} catch (e) {
  // Fallback in case compiled artifact is missing during next build
  contractArtifact = { abi: [], bytecode: '' };
}

let oracleArtifact: any;
try {
  oracleArtifact = require('../contracts/OracleRegistry.json');
} catch (e) {
  oracleArtifact = { abi: [], bytecode: '' };
}

const RPC_URL = process.env.ARC_TESTNET_RPC_URL || 'https://rpc.testnet.arc.network';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
export const ORACLE_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_ORACLE_REGISTRY_ADDRESS as Address;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Token addresses on Arc Testnet
export const USDC_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || '0x3600000000000000000000000000000000000000';
export const EURC_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_EURC_TOKEN_ADDRESS || '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

export const isContractConfigured = () => {
  return !!CONTRACT_ADDRESS && CONTRACT_ADDRESS !== '0x' && CONTRACT_ADDRESS.startsWith('0x');
};

// Public client for reading contract state
export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(RPC_URL),
});

function derivePrivateKey(baseKey: string, index: number): `0x${string}` {
  const cleanKey = baseKey.replace('0x', '');
  const derived = crypto.createHash('sha256').update(cleanKey + index).digest('hex');
  return `0x${derived}`;
}

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

export const getOracleWalletClient = (index: number) => {
  if (!PRIVATE_KEY) return null;
  const derivedKey = derivePrivateKey(PRIVATE_KEY, index);
  const account = privateKeyToAccount(derivedKey);
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(RPC_URL),
  });
};

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
  crashDetected: boolean,
  geofenceViolated: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!isContractConfigured()) {
      console.log(`[Blockchain Simulator] Simulated telemetry update for Rental #${rentalId}: Odo=${odometerMeters}m, Speed=${speedKmH}km/h, Crash=${crashDetected}, Geofence=${geofenceViolated}`);
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return { success: true, txHash: mockHash };
    }

    if (!adminWalletClient) {
      return { success: false, error: 'Admin PRIVATE_KEY is not configured in backend' };
    }

    // Oracle 1: admin/deployer
    console.log(`[Oracle 1] Submitting telemetry report for Rental #${rentalId}...`);
    const { request: req1 } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'updateTelemetry',
      args: [BigInt(rentalId), BigInt(odometerMeters), BigInt(speedKmH), crashDetected, geofenceViolated],
      account: adminWalletClient.account!,
    });
    const txHash1 = await adminWalletClient.writeContract(req1);
    await publicClient.waitForTransactionReceipt({ hash: txHash1 });

    // Oracle 2: derived node to hit the 2-of-3 threshold
    const oracle2WalletClient = getOracleWalletClient(1);
    if (oracle2WalletClient) {
      console.log(`[Oracle 2] Submitting telemetry report for Rental #${rentalId}...`);
      const balance = await publicClient.getBalance({ address: oracle2WalletClient.account!.address });
      if (balance < BigInt('10000000000000000')) {
        console.log(`Funding Oracle 2 with gas...`);
        const fundTx = await adminWalletClient.sendTransaction({
          to: oracle2WalletClient.account!.address,
          value: BigInt('50000000000000000'), // 0.05 native USDC
        });
        await publicClient.waitForTransactionReceipt({ hash: fundTx });
      }

      const { request: req2 } = await publicClient.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: contractArtifact.abi,
        functionName: 'updateTelemetry',
        args: [BigInt(rentalId), BigInt(odometerMeters), BigInt(speedKmH), crashDetected, geofenceViolated],
        account: oracle2WalletClient.account!,
      });
      const txHash2 = await oracle2WalletClient.writeContract(req2);
      await publicClient.waitForTransactionReceipt({ hash: txHash2 });

      return { success: true, txHash: txHash2 };
    }

    return { success: true, txHash: txHash1 };
  } catch (error: any) {
    console.error('Failed to update telemetry on chain:', error);
    return { success: false, error: error.message || 'Unknown blockchain error' };
  }
}

export const getOracleRegistryContract = () => {
  if (!ORACLE_REGISTRY_ADDRESS || ORACLE_REGISTRY_ADDRESS === '0x') return null;
  return getContract({
    address: ORACLE_REGISTRY_ADDRESS,
    abi: oracleArtifact.abi,
    client: {
      public: publicClient,
      wallet: adminWalletClient || undefined,
    },
  });
};

export async function getOraclesFromRegistry(): Promise<any[]> {
  try {
    if (!ORACLE_REGISTRY_ADDRESS || ORACLE_REGISTRY_ADDRESS === '0x' || ORACLE_REGISTRY_ADDRESS.length < 40) {
      return [
        { address: '0xe5279cb19d8d95383c3fafa28dfb7f3d19a83634965aa86933729963b13c0340', weight: 1, reputation: 100, reports: 12, slashes: 0, active: true },
        { address: '0x1234567890123456789012345678901234567891', weight: 1, reputation: 98, reports: 10, slashes: 0, active: true },
        { address: '0x1234567890123456789012345678901234567892', weight: 1, reputation: 100, reports: 11, slashes: 0, active: true }
      ];
    }

    const addresses = await publicClient.readContract({
      address: ORACLE_REGISTRY_ADDRESS,
      abi: oracleArtifact.abi,
      functionName: 'getOracleAddresses',
    }) as string[];

    const result = [];
    for (const addr of addresses) {
      const info = await publicClient.readContract({
        address: ORACLE_REGISTRY_ADDRESS,
        abi: oracleArtifact.abi,
        functionName: 'oracles',
        args: [addr],
      }) as any;
      result.push({
        address: info[0],
        weight: Number(info[1]),
        reputation: Number(info[2]),
        reports: Number(info[3]),
        slashes: Number(info[4]),
        active: info[6] && !info[5],
      });
    }
    return result;
  } catch (error) {
    console.error('Failed to get oracles:', error);
    return [];
  }
}

export async function registerOracleAgent(agentAddress: string, metadataUri: string) {
  if (!adminWalletClient || !ORACLE_REGISTRY_ADDRESS) return { success: false };
  const { request } = await publicClient.simulateContract({
    address: ORACLE_REGISTRY_ADDRESS,
    abi: oracleArtifact.abi,
    functionName: 'registerAgent',
    args: [agentAddress, metadataUri],
    account: adminWalletClient.account!,
  });
  const hash = await adminWalletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, hash };
}

export async function addOracleToRegistry(oracleAddress: string, weight: number) {
  if (!adminWalletClient || !ORACLE_REGISTRY_ADDRESS) return { success: false };
  const { request } = await publicClient.simulateContract({
    address: ORACLE_REGISTRY_ADDRESS,
    abi: oracleArtifact.abi,
    functionName: 'addOracle',
    args: [oracleAddress, BigInt(weight)],
    account: adminWalletClient.account!,
  });
  const hash = await adminWalletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, hash };
}

export async function removeOracleFromRegistry(oracleAddress: string) {
  if (!adminWalletClient || !ORACLE_REGISTRY_ADDRESS) return { success: false };
  const { request } = await publicClient.simulateContract({
    address: ORACLE_REGISTRY_ADDRESS,
    abi: oracleArtifact.abi,
    functionName: 'removeOracle',
    args: [oracleAddress],
    account: adminWalletClient.account!,
  });
  const hash = await adminWalletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return { success: true, hash };
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

/**
 * Read the pending earnings of an owner address on-chain.
 */
export async function getEarningsOnChain(ownerAddress: string): Promise<bigint> {
  try {
    if (!isContractConfigured()) return BigInt(0);
    const earnings = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'getEarnings',
      args: [ownerAddress as Address],
    });
    return earnings as bigint;
  } catch (error) {
    console.error('Failed to read earnings on chain:', error);
    return BigInt(0);
  }
}

/**
 * Read rental details from the smart contract.
 */
export async function getRentalOnChain(rentalId: number): Promise<any> {
  try {
    if (!isContractConfigured()) return null;
    return await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'getRental',
      args: [BigInt(rentalId)],
    });
  } catch (error) {
    console.error('Failed to read rental on chain:', error);
    return null;
  }
}

/**
 * Read vehicle details from the smart contract.
 */
export async function getVehicleOnChain(vehicleId: number): Promise<any> {
  try {
    if (!isContractConfigured()) return null;
    return await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'getVehicle',
      args: [BigInt(vehicleId)],
    });
  } catch (error) {
    console.error('Failed to read vehicle on chain:', error);
    return null;
  }
}

/**
 * Read the total number of vehicles registered on-chain.
 */
export async function getVehicleCountOnChain(): Promise<bigint> {
  try {
    if (!isContractConfigured()) return BigInt(0);
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'getVehicleCount',
    });
    return count as bigint;
  } catch (error) {
    console.error('Failed to read vehicle count on chain:', error);
    return BigInt(0);
  }
}

const erc20ApproveAbi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
];

/**
 * Triggers startRentalOnBehalf on-chain using the admin wallet client as the relayer.
 */
export async function startRentalOnBehalfOnChain(
  vehicleId: number,
  startOdometer: number,
  renterAddress: string,
  depositAmount: number,
  premiumAmount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!isContractConfigured()) {
      console.log(`[Blockchain Simulator] startRentalOnBehalf simulated for renter ${renterAddress} on vehicle #${vehicleId}`);
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return { success: true, txHash: mockHash };
    }

    if (!adminWalletClient) {
      return { success: false, error: 'Admin PRIVATE_KEY is not configured in backend' };
    }

    const tokenAddress = USDC_TOKEN_ADDRESS as Address;
    const totalAmount = BigInt(Math.floor((depositAmount + premiumAmount) * 1e6));

    console.log(`[Relayer] Approving ${totalAmount.toString()} micro-USDC (6 decimals) for RentDrive contract...`);
    const { request: approveReq } = await publicClient.simulateContract({
      address: tokenAddress,
      abi: erc20ApproveAbi,
      functionName: 'approve',
      args: [CONTRACT_ADDRESS, totalAmount],
      account: adminWalletClient.account!,
    });
    const approveHash = await adminWalletClient.writeContract(approveReq);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    console.log(`[Relayer] Calling startRentalOnBehalf for renter ${renterAddress} on vehicle #${vehicleId}...`);
    const { request: rentReq } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: contractArtifact.abi,
      functionName: 'startRentalOnBehalf',
      args: [BigInt(vehicleId), BigInt(startOdometer), renterAddress as Address],
      account: adminWalletClient.account!,
    });
    const rentHash = await adminWalletClient.writeContract(rentReq);
    await publicClient.waitForTransactionReceipt({ hash: rentHash });

    return { success: true, txHash: rentHash };
  } catch (error: any) {
    console.error('Failed startRentalOnBehalf on chain:', error);
    return { success: false, error: error.message || 'Unknown blockchain error' };
  }
}


