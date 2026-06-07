'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, Address, erc20Abi } from 'viem';
import { Landmark, Plus, Coins, ShieldAlert, ArrowDownToLine, Zap, ShieldCheck } from 'lucide-react';
import { useModal, TransactionStep } from '@/contexts/ModalContext';
import { useCircleApp } from '@/contexts/CircleAppContext';
import { useGaslessWriteContract } from '@/hooks/useGaslessWriteContract';
import StarRating from './StarRating';
import CurrencySelector from './CurrencySelector';
import { CURRENCY_CONFIG, type CurrencySymbol } from '@/lib/stablefx';
import { useNotifications } from '@/contexts/NotificationContext';
import OracleRegistryManager from './OracleRegistryManager';
import dynamic from 'next/dynamic';

const FleetDashboard = dynamic(() => import('./FleetDashboard'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-24 border border-dashed border-[#DDDCD4] bg-[#EAE8E1]/30 rounded-sm font-bold uppercase tracking-widest text-[#718096] text-xs">
      Loading Fleet Operations Console...
    </div>
  )
});

interface Vehicle {
  id: number;
  contract_id: number;
  owner: string;
  plate_number: string;
  model: string;
  image_url: string;
  base_rate_per_hour: number;
  rate_per_km: number;
  speed_limit_kmh: number;
  speed_penalty_usdc: number;
  deposit_required: number;
}

interface Rental {
  id: number;
  contract_id: number;
  vehicle_id: number;
  renter: string;
  start_time: string;
  escrow_balance: number;
  status: string;
  crash_detected: boolean;
  current_odometer: number;
}

interface OwnerPortalProps {
  activeTab: string;
}

export default function OwnerPortal({ activeTab }: OwnerPortalProps) {
  const { isConnected, address } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [disputedRentals, setDisputedRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  // Listing Form State
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [baseRate, setBaseRate] = useState('5.00');
  const [ratePerKm, setRatePerKm] = useState('0.50');
  const [speedLimit, setSpeedLimit] = useState('100');
  const [speedPenalty, setSpeedPenalty] = useState('50.00');
  const [deposit, setDeposit] = useState('200.00');
  const [centerLat, setCenterLat] = useState('21.028511');
  const [centerLng, setCenterLng] = useState('105.804817');
  const [radiusMeters, setRadiusMeters] = useState('5000');
  const [geofencePenalty, setGeofencePenalty] = useState('30.00');
  const [acceptedCurrency, setAcceptedCurrency] = useState<CurrencySymbol>('USDC');
  const [listing, setListing] = useState(false);

  // Dispute settlement states
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [payoutOwner, setPayoutOwner] = useState('150.00');
  const [refundRenter, setRefundRenter] = useState('50.00');

  const { showModal, updateModal, hideModal } = useModal();
  const [nftMetadata, setNftMetadata] = useState<Record<number, any>>({});
  const nftAddress = process.env.NEXT_PUBLIC_VEHICLE_NFT_ADDRESS as Address;
  const [reputation, setReputation] = useState<{ average: number; count: number } | null>(null);
  
  const [resolvedClaims, setResolvedClaims] = useState<Rental[]>([]);
  const [newRate, setNewRate] = useState(500);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [updatingRate, setUpdatingRate] = useState(false);
  const [withdrawingPool, setWithdrawingPool] = useState(false);
  const [ownerView, setOwnerView] = useState<'single' | 'fleet' | 'oracle'>('single');

  const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || '0x3600000000000000000000000000000000000000';
  const { gaslessEnabled } = useCircleApp();
  const { writeContractAsync } = useGaslessWriteContract();
  const publicClient = usePublicClient();

  // On-chain earnings read
  const rentDriveArtifact = require('../contracts/RentDrive.json');
  const { data: onChainEarnings, refetch: refetchEarnings } = useReadContract({
    address: contractAddress,
    abi: rentDriveArtifact.abi,
    functionName: 'getEarnings',
    args: address ? [address] : undefined,
    query: { enabled: !!contractAddress && !!address },
  });

  // USDC wallet balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: usdcAddress as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const poolAddress = process.env.NEXT_PUBLIC_INSURANCE_POOL_ADDRESS as Address;
  const poolArtifact = require('../contracts/InsurancePool.json');

  const { data: poolBalance, refetch: refetchPoolBalance } = useReadContract({
    address: poolAddress,
    abi: poolArtifact.abi,
    functionName: 'getPoolBalance',
    query: { enabled: !!poolAddress },
  });

  const { data: totalPremiums, refetch: refetchTotalPremiums } = useReadContract({
    address: poolAddress,
    abi: poolArtifact.abi,
    functionName: 'totalPremiumsCollected',
    query: { enabled: !!poolAddress },
  });

  const { data: poolRateBps, refetch: refetchPoolRateBps } = useReadContract({
    address: poolAddress,
    abi: poolArtifact.abi,
    functionName: 'premiumRateBps',
    query: { enabled: !!poolAddress },
  });

  const { data: onChainAdmin } = useReadContract({
    address: contractAddress,
    abi: rentDriveArtifact.abi,
    functionName: 'admin',
    query: { enabled: !!contractAddress },
  });

  const formattedEarnings = onChainEarnings
    ? Number(formatUnits(onChainEarnings as bigint, 6)).toFixed(2)
    : '0.00';

  const formattedUsdcBalance = usdcBalance
    ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2)
    : '0.00';

  const { subscribeToEvent } = useNotifications();

  useEffect(() => {
    if (isConnected && address) {
      fetchData();
    }
  }, [isConnected, address, activeTab]);

  useEffect(() => {
    if (!isConnected || !address) return;

    const onEventTrigger = () => {
      fetchData();
      refetchEarnings();
      refetchBalance();
    };

    const unsubscribes = [
      subscribeToEvent('vehicle-listed', onEventTrigger),
      subscribeToEvent('rental-started', onEventTrigger),
      subscribeToEvent('telemetry-updated', onEventTrigger),
      subscribeToEvent('rental-completed', onEventTrigger),
      subscribeToEvent('crash-detected', onEventTrigger),
      subscribeToEvent('dispute-resolved', onEventTrigger),
      subscribeToEvent('earnings-withdrawn', onEventTrigger),
    ];

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isConnected, address, subscribeToEvent]);

  const fetchData = async () => {
    try {
      const [vehiclesRes, rentalsRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/rentals'),
      ]);
      const vehiclesData = await vehiclesRes.json();
      const rentalsData = await rentalsRes.json();

      if (vehiclesData.success && rentalsData.success) {
        const userVehicles = vehiclesData.vehicles.filter(
          (v: Vehicle) => v.owner.toLowerCase() === address?.toLowerCase()
        );
        setVehicles(userVehicles);

        const userVehicleIds = new Set(userVehicles.map((v: Vehicle) => v.id));
        const disputed = rentalsData.rentals.filter(
          (r: Rental) => r.status === 'Disputed' && userVehicleIds.has(r.vehicle_id)
        );
        setDisputedRentals(disputed);

        const resolved = rentalsData.rentals.filter(
          (r: Rental) => r.status === 'Resolved' && r.crash_detected && userVehicleIds.has(r.vehicle_id)
        );
        setResolvedClaims(resolved);

        // Fetch on-chain NFT metadata
        if (userVehicles.length > 0 && nftAddress && publicClient) {
          try {
            const nftArtifact = require('../contracts/VehicleNFT.json');
            const metadataMap: Record<number, any> = {};
            await Promise.all(
              userVehicles.map(async (v: Vehicle) => {
                try {
                  const tokenUri = await publicClient.readContract({
                    address: nftAddress,
                    abi: nftArtifact.abi,
                    functionName: 'tokenURI',
                    args: [BigInt(v.contract_id)],
                  }) as string;

                  if (tokenUri && tokenUri.startsWith('data:application/json;base64,')) {
                    const base64Str = tokenUri.split('base64,')[1];
                    const decoded = JSON.parse(atob(base64Str));
                    metadataMap[v.id] = decoded;
                  }
                } catch (e) {
                  console.error(`Failed to fetch NFT URI for token #${v.contract_id}:`, e);
                }
              })
            );
            setNftMetadata(metadataMap);
          } catch (e) {
            console.error('Error fetching NFT data:', e);
          }
        }

        // Fetch owner reputation
        if (address) {
          try {
            const repRes = await fetch(`/api/reviews?userAddress=${address}`);
            const repData = await repRes.json();
            if (repData.success && repData.reviews) {
              const reviews = repData.reviews;
              const count = reviews.length;
              const average = count > 0 
                ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count
                : 0;
              setReputation({ average, count });
            }
          } catch (repErr) {
            console.error('Failed to fetch owner reputation:', repErr);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching owner data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleListVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) return;

    setListing(true);

    const steps: TransactionStep[] = [
      { label: 'DEPLOY ON-CHAIN REGISTRATION', status: 'pending' },
      { label: 'STORE ASSET METADATA', status: 'idle' },
    ];

    showModal({
      type: 'transaction',
      title: 'REGISTERING VEHICLE ASSET',
      message: `Deploying on-chain registry for ${model} vehicle standard...`,
      txSteps: steps,
      preventClose: true,
    });

    try {
      const isContractActive = !!contractAddress && contractAddress.startsWith('0x');

      if (isContractActive) {
        console.log('Listing vehicle on-chain...');
        const rentDriveArtifact = require('../contracts/RentDrive.json');
        
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: rentDriveArtifact.abi,
          functionName: 'listVehicle',
          args: [
            parseUnits(baseRate, 6),
            parseUnits(ratePerKm, 6),
            BigInt(speedLimit),
            parseUnits(speedPenalty, 6),
            parseUnits(deposit, 6),
            `${model} | ${plateNumber} | ${imageUrl || 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&q=80&w=600'}`,
            BigInt(Math.round(Number(centerLat) * 1e6)),
            BigInt(Math.round(Number(centerLng) * 1e6)),
            BigInt(radiusMeters),
            parseUnits(geofencePenalty, 6),
            CURRENCY_CONFIG[acceptedCurrency].address,
          ],
        }, { txName: 'List Vehicle' });

        console.log('List Vehicle Tx Hash:', txHash);
        updateModal({
          txHash,
        });
        await publicClient?.waitForTransactionReceipt({ hash: txHash });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      steps[0].status = 'success';
      steps[1].status = 'pending';
      updateModal({
        txSteps: [...steps],
      });

      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: address,
          plateNumber,
          model,
          imageUrl,
          baseRate,
          ratePerKm,
          speedLimit,
          speedPenalty,
          deposit,
          geofence_center_lat: Number(centerLat),
          geofence_center_lng: Number(centerLng),
          geofence_radius_meters: Number(radiusMeters),
          geofence_violation_penalty: Number(geofencePenalty),
          accepted_currency: acceptedCurrency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        steps[1].status = 'success';
        updateModal({
          type: 'success',
          title: 'ASSET REGISTERED SUCCESSFULLY',
          message: `Your vehicle ${model} (${plateNumber}) is now listed in the Marketplace fleet index.`,
          txSteps: [...steps],
          preventClose: false,
          primaryAction: {
            label: 'DISMISS',
            onClick: () => {
              setModel('');
              setPlateNumber('');
              setImageUrl('');
              fetchData();
            },
          },
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Listing failed:', error);
      let humanMessage = error.message || error.toString();
      if (humanMessage.toLowerCase().includes('user rejected')) {
        humanMessage = 'The registration transaction signature request was cancelled.';
      }
      showModal({
        type: 'error',
        title: 'REGISTRATION FAILED',
        message: humanMessage,
        primaryAction: {
          label: 'DISMISS',
          onClick: () => {},
        },
      });
    } finally {
      setListing(false);
    }
  };

  const executeResolveDispute = async (rental: Rental) => {
    const ownerPayoutNum = Number(payoutOwner);
    const renterRefundNum = Number(refundRenter);

    setSettlingId(rental.id);
    showModal({
      type: 'loading',
      title: 'DISBURSING COLLATERAL ESCROW',
      message: `Initiating payout distribution split: ${ownerPayoutNum} USDC to owner, ${renterRefundNum} USDC to renter...`,
      preventClose: true,
    });

    try {
      const res = await fetch(`/api/rentals/${rental.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutToOwner: ownerPayoutNum,
          refundToRenter: renterRefundNum,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showModal({
          type: 'success',
          title: 'DISPUTE CLAIM RESOLVED',
          message: `Disbursement completed successfully. Payout of ${ownerPayoutNum} USDC to owner and ${renterRefundNum} USDC refund to renter settled.`,
          primaryAction: {
            label: 'DISMISS',
            onClick: () => {
              fetchData();
            },
          },
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to resolve dispute:', error);
      showModal({
        type: 'error',
        title: 'DISBURSEMENT FAILED',
        message: error.message || error.toString(),
        primaryAction: {
          label: 'DISMISS',
          onClick: () => {},
        },
      });
    } finally {
      setSettlingId(null);
    }
  };

  const handleResolveDispute = (rental: Rental) => {
    const totalHeld = Number(rental.escrow_balance);
    const ownerPayoutNum = Number(payoutOwner);
    const renterRefundNum = Number(refundRenter);

    if (ownerPayoutNum + renterRefundNum > totalHeld) {
      showModal({
        type: 'error',
        title: 'INVALID DISBURSEMENT SPLIT',
        message: `Payout + Refund cannot exceed total locked escrow (${totalHeld} USDC).`,
      });
      return;
    }

    showModal({
      type: 'confirm',
      title: 'CONFIRM ESCROW SETTLEMENT',
      message: `Are you sure you want to disburse ${ownerPayoutNum} USDC to your address and refund ${renterRefundNum} USDC to the renter? This action settles the claim and resolves the dispute status.`,
      primaryAction: {
        label: 'DISBURSE FUNDS',
        onClick: () => {
          executeResolveDispute(rental);
        },
      },
      secondaryAction: {
        label: 'CANCEL',
        onClick: () => {},
      },
    });
  };

  const handleSetPremiumRate = async () => {
    if (newRate < 200 || newRate > 1000) {
      showModal({ type: 'error', title: 'INVALID RATE', message: 'Rate must be between 2% (200 bps) and 10% (1000 bps).' });
      return;
    }
    setUpdatingRate(true);
    showModal({ type: 'loading', title: 'UPDATING PREMIUM RATE', message: `Setting premium rate to ${(newRate/100).toFixed(1)}%...`, preventClose: true });
    try {
      const txHash = await writeContractAsync({
        address: poolAddress,
        abi: poolArtifact.abi,
        functionName: 'setPremiumRate',
        args: [BigInt(newRate)],
      }, { txName: 'Set Premium Rate' });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      refetchPoolRateBps();
      showModal({ type: 'success', title: 'RATE UPDATED', message: `Premium rate successfully updated to ${(newRate/100).toFixed(1)}%.`, primaryAction: { label: 'DISMISS', onClick: () => {} } });
    } catch (err: any) {
      let msg = err.message || err.toString();
      showModal({ type: 'error', title: 'TRANSACTION FAILED', message: msg, primaryAction: { label: 'DISMISS', onClick: () => {} } });
    } finally {
      setUpdatingRate(false);
    }
  };

  const handleWithdrawPool = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      showModal({ type: 'error', title: 'INVALID AMOUNT', message: 'Please enter a valid USDC amount.' });
      return;
    }
    setWithdrawingPool(true);
    showModal({ type: 'loading', title: 'WITHDRAWING POOL FUNDS', message: `Transferring ${amt} USDC from Insurance Pool to your admin address...`, preventClose: true });
    try {
      const parsedAmt = parseUnits(withdrawAmount, 6);
      const txHash = await writeContractAsync({
        address: poolAddress,
        abi: poolArtifact.abi,
        functionName: 'withdraw',
        args: [parsedAmt],
      }, { txName: 'Withdraw Pool Funds' });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      refetchPoolBalance();
      showModal({ type: 'success', title: 'WITHDRAWAL SUCCESSFUL', message: `Successfully withdrew ${amt} USDC from the Insurance Pool.`, primaryAction: { label: 'DISMISS', onClick: () => {} } });
    } catch (err: any) {
      let msg = err.message || err.toString();
      showModal({ type: 'error', title: 'WITHDRAWAL FAILED', message: msg, primaryAction: { label: 'DISMISS', onClick: () => {} } });
    } finally {
      setWithdrawingPool(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-10 shadow-sm">
          <Landmark className="mx-auto h-12 w-12 text-[#5A6573] mb-5" />
          <h2 className="text-sm font-black tracking-widest text-[#1C2B3C] uppercase mb-3">OWNER PORTAL LOCKED</h2>
          <p className="text-[#5A6573] text-xs font-semibold leading-relaxed mb-8">
            Please authorize your active Web3 wallet to manage listed vehicles, track active lease earnings, and settle collision claims.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      
      {/* Operator Console Header with view toggles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-[#E0DDD5] pb-5">
        <div>
          <h2 className="text-xl font-black text-[#1C2B3C] uppercase tracking-wider">
            Operator Console
          </h2>
          <p className="text-[10px] text-[#718096] font-mono tracking-widest uppercase mt-1">
            Manage assets, claims, and telemetry analytics
          </p>
        </div>
        <div className="flex gap-1.5 rounded-sm bg-[#E7E5DD]/70 p-1 border border-[#DCDAD0]/80 self-end sm:self-auto">
          <button
            onClick={() => setOwnerView('single')}
            className={`px-4 py-2.5 rounded-sm text-[9.5px] font-black tracking-widest uppercase transition-all ${
              ownerView === 'single'
                ? 'bg-[#1C2B3C] text-white shadow-sm'
                : 'text-[#4A5568] hover:text-[#1C2B3C]'
            }`}
          >
            Asset Manager
          </button>
          <button
            onClick={() => setOwnerView('fleet')}
            className={`px-4 py-2.5 rounded-sm text-[9.5px] font-black tracking-widest uppercase transition-all ${
              ownerView === 'fleet'
                ? 'bg-[#1C2B3C] text-white shadow-sm'
                : 'text-[#4A5568] hover:text-[#1C2B3C]'
            }`}
          >
            Fleet Dashboard
          </button>
          <button
            onClick={() => setOwnerView('oracle')}
            className={`px-4 py-2.5 rounded-sm text-[9.5px] font-black tracking-widest uppercase transition-all ${
              ownerView === 'oracle'
                ? 'bg-[#1C2B3C] text-white shadow-sm'
                : 'text-[#4A5568] hover:text-[#1C2B3C]'
            }`}
          >
            AI Oracle Network
          </button>
        </div>
      </div>

      {ownerView === 'fleet' ? (
        <FleetDashboard />
      ) : ownerView === 'oracle' ? (
        <OracleRegistryManager />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Manage Fleet & Claims */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Earnings Widget — Real On-Chain Data */}
          <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-8 flex-1">
                <div>
                  <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">Pending On-Chain Earnings</span>
                  <h3 className="text-3xl font-black text-[#1C2B3C] mt-2 tracking-tight">
                    {formattedEarnings} USDC
                  </h3>
                  <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block mt-2">Wallet Balance: {formattedUsdcBalance} USDC</span>
                </div>

                {reputation && (
                  <div className="sm:ml-auto flex flex-col items-start sm:items-end sm:border-l sm:border-[#E0DDD5] sm:pl-8 py-1">
                    <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">Owner Reputation</span>
                    <div className="flex items-center gap-1.5 mt-2">
                      <StarRating rating={reputation.average} size={15} />
                      <span className="text-sm font-black text-[#1C2B3C] font-mono leading-none">
                        {reputation.average.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[8px] text-[#718096] font-extrabold uppercase mt-1">({reputation.count} {reputation.count === 1 ? 'review' : 'reviews'})</span>
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  if (Number(formattedEarnings) <= 0) {
                    showModal({ type: 'warning', title: 'NO PENDING EARNINGS', message: 'You have no pending earnings to withdraw at this time.' });
                    return;
                  }
                  setWithdrawing(true);
                  showModal({ type: 'loading', title: 'WITHDRAWING EARNINGS', message: `Transferring ${formattedEarnings} USDC to your wallet...`, preventClose: true });
                  try {
                    const txHash = await writeContractAsync({
                      address: contractAddress,
                      abi: rentDriveArtifact.abi,
                      functionName: 'withdrawEarnings',
                    }, { txName: 'Withdraw Earnings' });
                    await publicClient?.waitForTransactionReceipt({ hash: txHash });
                    refetchEarnings();
                    refetchBalance();
                    showModal({ type: 'success', title: 'EARNINGS WITHDRAWN', message: `Successfully transferred ${formattedEarnings} USDC to your wallet.`, primaryAction: { label: 'DISMISS', onClick: () => {} } });
                  } catch (error: any) {
                    let msg = error.message || error.toString();
                    if (msg.toLowerCase().includes('user rejected')) msg = 'Transaction was cancelled by the user.';
                    showModal({ type: 'error', title: 'WITHDRAWAL FAILED', message: msg, primaryAction: { label: 'DISMISS', onClick: () => {} } });
                  } finally {
                    setWithdrawing(false);
                  }
                }}
                disabled={withdrawing}
                className="flex items-center gap-2 rounded-sm bg-[#1C2B3C] px-5 py-3 text-[11px] font-bold tracking-widest text-[#F2F1EC] uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm disabled:opacity-50"
              >
                {gaslessEnabled ? <Zap className="h-4 w-4 fill-current text-emerald-400" /> : <ArrowDownToLine className="h-4 w-4" />}
                {withdrawing ? 'PROCESSING...' : gaslessEnabled ? 'WITHDRAW (GASLESS)' : 'WITHDRAW EARNINGS'}
              </button>
            </div>
          </div>

          {/* Admin Insurance Pool Dashboard */}
          {address?.toLowerCase() === (onChainAdmin as string)?.toLowerCase() && poolAddress && (
            <div className="rounded-sm border border-[#E0DDD5] bg-[#F2F1EC] p-8 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#1C2B3C] border-b border-[#E0DDD5] pb-3 flex items-center gap-2">
                <Coins className="h-4.5 w-4.5 text-[#1C2B3C]" />
                Insurance Pool Administration
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs bg-white p-6 border border-[#E0DDD5] rounded-sm">
                <div>
                  <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Pool Balance</span>
                  <span className="text-[#1C2B3C] font-black text-lg">
                    {poolBalance !== undefined ? Number(formatUnits(poolBalance as bigint, 6)).toFixed(2) : '0.00'} USDC
                  </span>
                </div>
                <div>
                  <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Total Premiums</span>
                  <span className="text-[#1C2B3C] font-extrabold text-lg">
                    {totalPremiums !== undefined ? Number(formatUnits(totalPremiums as bigint, 6)).toFixed(2) : '0.00'} USDC
                  </span>
                </div>
                <div>
                  <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Minimum Reserve</span>
                  <span className="text-amber-700 font-extrabold text-lg">
                    {totalPremiums !== undefined ? (Number(formatUnits(totalPremiums as bigint, 6)) * 0.1).toFixed(2) : '0.00'} USDC
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Premium Rate Controller */}
                <div className="bg-white p-5 border border-[#E0DDD5] rounded-sm flex flex-col justify-between">
                  <div>
                    <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Premium Rate ({(Number(poolRateBps || 500) / 100).toFixed(1)}%)</span>
                    <p className="text-[10px] text-[#718096] font-semibold mb-4">Set the premium rate between 2% (200 bps) and 10% (1000 bps).</p>
                    <input
                      type="range"
                      min={200}
                      max={1000}
                      step={50}
                      value={newRate}
                      onChange={(e) => setNewRate(Number(e.target.value))}
                      className="w-full accent-[#1C2B3C] mb-3"
                    />
                    <span className="block text-[11px] font-black text-[#1C2B3C] tracking-wide text-center uppercase mb-3">
                      Selected: {(newRate/100).toFixed(1)}% ({newRate} BPS)
                    </span>
                  </div>
                  <button
                    onClick={handleSetPremiumRate}
                    disabled={updatingRate}
                    className="w-full py-2.5 bg-[#1C2B3C] hover:bg-[#111A24] text-white text-[10px] font-bold tracking-widest uppercase rounded-sm border border-[#1C2B3C] transition-all"
                  >
                    Update Premium Rate
                  </button>
                </div>

                {/* Pool Withdrawal */}
                <div className="bg-white p-5 border border-[#E0DDD5] rounded-sm flex flex-col justify-between">
                  <div>
                    <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Withdraw Pool Reserves</span>
                    <p className="text-[10px] text-[#718096] font-semibold mb-4">
                      Withdraw excess funds. A minimum 10% reserve of all premiums ever collected must remain locked.
                    </p>
                    <input
                      type="number"
                      placeholder="0.00 USDC"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full rounded-sm border border-[#DDDCD4] bg-white px-3 py-2 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0] mb-4"
                    />
                  </div>
                  <button
                    onClick={handleWithdrawPool}
                    disabled={withdrawingPool}
                    className="w-full py-2.5 bg-[#1C2B3C] hover:bg-red-700 text-white text-[10px] font-bold tracking-widest uppercase rounded-sm border border-[#1C2B3C] hover:border-red-700 transition-all"
                  >
                    Withdraw Funds
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dispute Resolution Section */}
          {disputedRentals.length > 0 && (
            <div className="rounded-sm border border-red-300 bg-red-50/30 p-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] mb-6 flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-red-600" />
                ACTIVE ESCROW COLLISION CLAIMS
              </h3>
              
              <div className="space-y-6">
                {disputedRentals.map((rental) => {
                  const vehicle = vehicles.find((v) => v.id === rental.vehicle_id);
                  return (
                    <div key={rental.id} className="rounded-sm border border-red-200 bg-white p-6">
                      <div className="flex justify-between items-start text-xs mb-4 pb-3 border-b border-[#F2F1EC]">
                        <div>
                          <span className="font-bold text-[#1C2B3C] uppercase tracking-wide text-sm block">{vehicle?.model}</span>
                          <span className="text-[#718096] text-[10px] font-mono tracking-wider block mt-1">Renter: {rental.renter.substring(0, 10)}...</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[#718096] text-[9px] font-bold uppercase tracking-widest block">Locked Collateral</span>
                          <span className="font-extrabold text-[#1C2B3C] text-sm">{rental.escrow_balance} USDC</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Owner Payout (USDC)</label>
                          <input
                            type="number"
                            value={payoutOwner}
                            onChange={(e) => setPayoutOwner(e.target.value)}
                            className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-bold focus:border-[#1C2B3C] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Renter Refund (USDC)</label>
                          <input
                            type="number"
                            value={refundRenter}
                            onChange={(e) => setRefundRenter(e.target.value)}
                            className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-bold focus:border-[#1C2B3C] focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleResolveDispute(rental)}
                        disabled={settlingId === rental.id}
                        className="w-full py-3.5 rounded-sm bg-red-600 text-white font-bold text-[11px] tracking-widest uppercase hover:bg-red-700 transition-all border border-red-600"
                      >
                        {settlingId === rental.id ? 'SETTLING CLAIM ON-CHAIN...' : 'DISBURSE ESCROW COLLATERAL'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resolved Insurance Claims */}
          {resolvedClaims.length > 0 && (
            <div className="rounded-sm border border-emerald-300 bg-[#EAE8E1]/20 p-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] mb-6 flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 fill-current" />
                AUTOMATED INSURANCE CLAIM SETTLEMENTS
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {resolvedClaims.map((rental) => {
                  const vehicle = vehicles.find((v) => v.id === rental.vehicle_id);
                  const depositAmount = vehicle ? Number(vehicle.deposit_required) : 0;
                  const payoutAmount = (depositAmount * 0.8).toFixed(2);
                  const refundAmount = (depositAmount * 0.2).toFixed(2);

                  return (
                    <div key={rental.id} className="rounded-sm border border-emerald-200 bg-white p-6 relative">
                      <span className="absolute top-4 right-4 rounded-sm bg-emerald-50 border border-emerald-300 text-emerald-700 font-mono font-bold text-[8px] uppercase tracking-wider px-2 py-0.5">
                        Claim Paid
                      </span>
                      <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wide text-sm mb-1">{vehicle?.model || 'Leased Vehicle'}</h4>
                      <span className="block text-[8px] font-mono text-[#718096] mb-3">Rental Ref: #{rental.id} · Odometer: {(rental.current_odometer/1000).toFixed(2)} km</span>
                      
                      <div className="space-y-1.5 text-[10px] leading-relaxed border-t border-[#F2F1EC] pt-3">
                        <div className="flex justify-between">
                          <span className="text-[#718096] font-bold uppercase tracking-wider">POOL PAYOUT TO OWNER (80%):</span>
                          <span className="text-emerald-700 font-extrabold">{payoutAmount} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#718096] font-bold uppercase tracking-wider">RENTER REFUND FROM ESCROW (20%):</span>
                          <span className="text-[#3E5062] font-semibold">{refundAmount} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#718096] font-bold uppercase tracking-wider">SETTLEMENT STATE:</span>
                          <span className="text-[#718096] font-extrabold uppercase font-mono">AUTOMATED RESOLUTION</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fleet Listings */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#5A6573] mb-6">REGISTERED VEHICLES</h3>
            {vehicles.length === 0 ? (
              <div className="rounded-sm border border-dashed border-[#DDDCD4] bg-[#EAE8E1]/30 p-10 text-center text-[#718096] text-xs font-semibold">
                No active listings recorded. Use the new listing panel to register your first vehicle asset.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex gap-4 rounded-sm border border-[#E0DDD5] bg-white p-4 items-center">
                    <img src={v.image_url} alt={v.model} className="h-16 w-24 object-cover rounded-sm bg-[#F2F1EC] shrink-0 border border-[#DDDCD4]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-wide truncate">{v.model}</h4>
                        <span className="text-[10px] text-[#718096] font-mono tracking-wider font-bold shrink-0 ml-2">{v.plate_number}</span>
                      </div>
                      <span className="block text-[10px] text-[#3E5062] font-extrabold uppercase tracking-widest mt-1">
                        {v.rate_per_km} USDC/km · {v.deposit_required} USDC DEPOSIT
                      </span>

                      {/* Premium Ownership NFT Badge & Traits */}
                      {nftMetadata[v.id] ? (
                        <div className="mt-2 text-[10px] text-[#854d0e] bg-[#fef3c7] border border-[#fde68a] px-2.5 py-1.5 rounded-sm">
                          <div className="font-extrabold uppercase tracking-widest text-[#9a3412] flex items-center gap-1">
                            👑 OWNERSHIP NFT #{v.contract_id} VERIFIED
                          </div>
                          <div className="mt-1 font-mono text-[9px] text-[#78350f]">
                            URI: {nftMetadata[v.id].name}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 flex items-center gap-1.5 bg-[#F2F1EC] text-[#718096] px-2 py-0.5 rounded-sm text-[8px] font-bold tracking-wider w-fit border border-[#DDDCD4]">
                          <span>NFT #{v.contract_id} VERIFYING ON-CHAIN...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Listing registration */}
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 h-fit">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] mb-6 flex items-center gap-2.5 pb-2 border-b border-[#F2F1EC]">
            <Plus className="h-4.5 w-4.5 text-[#1C2B3C]" />
            REGISTER NEW VEHICLE
          </h3>

          <form onSubmit={handleListVehicle} className="space-y-4">
            <div>
              <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">VEHICLE BRAND & MODEL</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="TESLA MODEL S (2025)"
                className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">LICENSE PLATE</label>
                <input
                  type="text"
                  required
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="29A-999.99"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">ESCROW COLLATERAL ({acceptedCurrency})</label>
                <input
                  type="number"
                  required
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="200.00"
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">IMAGE URL</label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">BASE RATE ($/HR)</label>
                <input
                  type="number"
                  value={baseRate}
                  onChange={(e) => setBaseRate(e.target.value)}
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">DISTANCE RATE ($/KM)</label>
                <input
                  type="number"
                  value={ratePerKm}
                  onChange={(e) => setRatePerKm(e.target.value)}
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">SPEED LIMIT (KM/H)</label>
                <input
                  type="number"
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(e.target.value)}
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">VIOLATION PENALTY ($)</label>
                <input
                  type="number"
                  value={speedPenalty}
                  onChange={(e) => setSpeedPenalty(e.target.value)}
                  className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                />
              </div>
            </div>

            {/* Geofence Parameters */}
            <div className="pt-4 border-t border-[#F2F1EC] space-y-4">
              <span className="block text-[9px] text-[#1C2B3C] font-extrabold uppercase tracking-widest">GEOFENCING OPTIONS</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">GEOFENCE LATITUDE</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={centerLat}
                    onChange={(e) => setCenterLat(e.target.value)}
                    className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">GEOFENCE LONGITUDE</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={centerLng}
                    onChange={(e) => setCenterLng(e.target.value)}
                    className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">GEOFENCE RADIUS (M)</label>
                  <input
                    type="number"
                    required
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(e.target.value)}
                    className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">GEOFENCE PENALTY (USDC)</label>
                  <input
                    type="number"
                    required
                    value={geofencePenalty}
                    onChange={(e) => setGeofencePenalty(e.target.value)}
                    className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Accepted Currency */}
            <div className="pt-4 border-t border-[#F2F1EC] space-y-3">
              <span className="block text-[9px] text-[#1C2B3C] font-extrabold uppercase tracking-widest">SETTLEMENT CURRENCY</span>
              <p className="text-[9px] text-[#718096] font-semibold leading-relaxed">
                Select which stablecoin renters must deposit. You will receive settlement in this currency.
              </p>
              <CurrencySelector
                selected={acceptedCurrency}
                onChange={setAcceptedCurrency}
                size="md"
                showLabel={true}
              />
            </div>

            <button
              type="submit"
              disabled={listing}
              className="w-full mt-4 py-4 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] font-bold text-[11px] tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm flex items-center justify-center gap-1.5"
            >
              {gaslessEnabled && <Zap className="h-3.5 w-3.5 fill-current text-emerald-400" />}
              {listing ? 'DEPLOYING TO ARC NETWORK...' : gaslessEnabled ? 'REGISTER VEHICLE ASSET (GASLESS)' : 'REGISTER VEHICLE ASSET'}
            </button>
          </form>
        </div>

      </div>
      )}
    </div>
  );
}
