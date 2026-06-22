'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { Clock, ShieldCheck, ShieldAlert, BadgeAlert, RefreshCw, Zap } from 'lucide-react';
import { useModal, TransactionStep } from '@/contexts/ModalContext';
import { useCircleApp } from '@/contexts/CircleAppContext';
import { useGaslessWriteContract } from '@/hooks/useGaslessWriteContract';
import ReviewModal from './ReviewModal';
import StarRating from './StarRating';
import { useNotifications } from '@/contexts/NotificationContext';
import PullToRefresh from './PullToRefresh';

const STATUS_MAP = ['Requested', 'Active', 'Completed', 'Disputed', 'Resolved'];

interface ActiveRentalCardProps {
  rental: Rental;
  vehicle: Vehicle | undefined;
  contractAddress: Address;
  abi: any;
  endingId: number | null;
  handleEndRental: (rental: Rental) => void;
}

function ActiveRentalCard({
  rental,
  vehicle,
  contractAddress,
  abi,
  endingId,
  handleEndRental,
}: ActiveRentalCardProps) {
  const { gaslessEnabled } = useCircleApp();
  const { data: onChainRental } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'getRental',
    args: [BigInt(rental.contract_id)],
    query: { enabled: !!contractAddress && !!rental.contract_id },
  });

  const escrowVal = onChainRental ? (onChainRental as any)[5] : undefined;
  const speedPenaltiesVal = onChainRental ? (onChainRental as any)[6] : undefined;
  const distanceChargesVal = onChainRental ? (onChainRental as any)[7] : undefined;
  const statusVal = onChainRental ? (onChainRental as any)[8] : undefined;
  const crashDetectedVal = onChainRental ? (onChainRental as any)[9] : undefined;
  const geofencePenaltiesVal = onChainRental ? (onChainRental as any)[10] : undefined;

  const displayEscrow = escrowVal !== undefined 
    ? Number(formatUnits(escrowVal as bigint, 18)).toFixed(2) 
    : Number(rental.escrow_balance).toFixed(2);

  const displaySpeedPenalties = speedPenaltiesVal !== undefined 
    ? Number(formatUnits(speedPenaltiesVal as bigint, 18)).toFixed(2) 
    : Number(rental.speed_penalties_accrued).toFixed(2);

  const displayDistanceCharges = distanceChargesVal !== undefined 
    ? Number(formatUnits(distanceChargesVal as bigint, 18)).toFixed(2) 
    : Number(rental.distance_charges_accrued).toFixed(2);

  const displayGeofencePenalties = geofencePenaltiesVal !== undefined
    ? Number(formatUnits(geofencePenaltiesVal as bigint, 18)).toFixed(2)
    : Number(rental.geofence_penalties_accrued || 0).toFixed(2);

  const totalCost = (Number(displayDistanceCharges) + Number(displaySpeedPenalties) + Number(displayGeofencePenalties)).toFixed(2);
  const displayStatus = statusVal !== undefined ? STATUS_MAP[statusVal as number] : rental.status;
  const isCrashDetected = crashDetectedVal !== undefined ? (crashDetectedVal as boolean) : rental.crash_detected;
  const isDisputed = displayStatus === 'Disputed' || isCrashDetected;

  return (
    <div
      className={`relative rounded-sm border bg-white p-6 transition-all duration-300 ${
        isDisputed ? 'border-red-400' : 'border-[#E0DDD5]'
      }`}
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className={`inline-flex items-center rounded-sm px-2.5 py-1 text-[9px] font-bold tracking-widest uppercase border ${
            isDisputed 
              ? 'bg-red-50 text-red-700 border-red-200' 
              : 'bg-[#1C2B3C] text-white border-[#1C2B3C]'
          }`}>
            On-Chain: {displayStatus} (DB: {rental.status})
          </span>
          <h4 className="text-lg font-black text-[#1C2B3C] mt-3 uppercase tracking-wide">
            {vehicle?.model || 'Leased Vehicle'}
          </h4>
          <span className="text-[10px] text-[#5A6573] font-mono tracking-wider font-bold">
            Live Odometer: {(rental.current_odometer / 1000).toFixed(2)} km
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[8px] text-[#718096] uppercase tracking-widest font-extrabold mb-1">Locked Escrow</span>
          <span className="text-xl font-black text-[#1C2B3C] tracking-tight">
            {displayEscrow} USDC
          </span>
        </div>
      </div>

      {/* Escrow Details with refined minimalist styling */}
      <div className="grid grid-cols-4 gap-4 my-5 py-4 border-y border-[#F2F1EC] text-center text-[10px]">
        <div>
          <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Distance Fee</span>
          <span className="text-[#1C2B3C] font-extrabold">{displayDistanceCharges} USDC</span>
        </div>
        <div>
          <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Speed Pen.</span>
          <span className="text-[#3E5062] font-extrabold">{displaySpeedPenalties} USDC</span>
        </div>
        <div>
          <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Geofence Pen.</span>
          <span className="text-red-700 font-extrabold">{displayGeofencePenalties} USDC</span>
        </div>
        <div>
          <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Total Cost</span>
          <span className="text-[#1C2B3C] font-black">
            {totalCost} USDC
          </span>
        </div>
      </div>

      {isDisputed && (
        <div className="mb-5 flex items-start gap-2.5 rounded-sm bg-red-50 border border-red-200 p-4 text-red-800 text-xs leading-relaxed font-semibold">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-600" />
          <div>
            <span className="font-extrabold block uppercase tracking-wider text-red-900 mb-0.5">COLLISION EVENT LOGGED</span>
            Telemetry reported severe impact force or escrow is locked in disputed state pending adjuster settlement.
          </div>
        </div>
      )}

      {rental.gateway_deposit !== undefined && Number(rental.gateway_deposit) > 0 && (
        <div className="mb-5 bg-[#F2F1EC]/60 border border-[#DDDCD4] rounded-sm p-4 text-[10px] space-y-2 text-[#1C2B3C]">
          <div className="flex justify-between items-center pb-1 border-b border-[#E0DDD5]">
            <span className="font-extrabold uppercase tracking-wider text-[#718096]">Circle Gateway Escrow</span>
            <span className="bg-[#1C2B3C] text-white text-[8px] font-mono px-2 py-0.5 rounded-sm uppercase font-extrabold tracking-wider">
              Nanopayments Engaged
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#718096] uppercase font-bold">Renter Balance:</span>
            <span className="font-extrabold">{Number(rental.gateway_deposit).toFixed(4)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#718096] uppercase font-bold">Streamed Micro-Charges:</span>
            <span className="font-extrabold text-[#1C2B3C] font-mono">{Number(rental.nanopayments_accumulated || 0).toFixed(6)} USDC</span>
          </div>
          {rental.gas_saved_usdc !== undefined && Number(rental.gas_saved_usdc) > 0 && (
            <div className="flex justify-between text-emerald-700 border-t border-[#E0DDD5]/45 pt-1.5 font-bold">
              <span className="uppercase text-[9px]">Gas Saved via Off-Chain Stream:</span>
              <span>{Number(rental.gas_saved_usdc).toFixed(4)} USDC Saved</span>
            </div>
          )}
        </div>
      )}

      {!isDisputed && (
        <div className="mb-5 flex items-center gap-2 rounded-sm bg-[#F2F1EC] border border-[#DDDCD4] p-3.5 text-[#3E5062] text-[10px] font-bold uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#1C2B3C]" />
          <span>OBD-II hardware online: speed & coordinates active</span>
        </div>
      )}

      <button
        onClick={() => handleEndRental(rental)}
        disabled={endingId !== null || isDisputed}
        className={`w-full py-3.5 rounded-sm font-bold text-[11px] tracking-widest uppercase transition-all duration-300 border flex items-center justify-center gap-1.5 ${
          isDisputed
            ? 'bg-[#EAE8E1] text-[#A0AEC0] border-[#DDDCD4] cursor-not-allowed'
            : 'bg-[#1C2B3C] text-white hover:bg-red-700 hover:border-red-700 hover:text-white border-[#1C2B3C]'
        }`}
      >
        {gaslessEnabled && !isDisputed && <Zap className="h-3.5 w-3.5 fill-current text-emerald-400" />}
        {endingId === rental.id ? 'PROCESSING SETTLEMENT...' : (gaslessEnabled && !isDisputed) ? 'CLOSE LEASE (GASLESS)' : 'CLOSE LEASE & REFUND ESCROW'}
      </button>
    </div>
  );
}

interface Rental {
  id: number;
  contract_id: number;
  vehicle_id: number;
  renter: string;
  start_time: string;
  end_time: string | null;
  start_odometer: number;
  current_odometer: number;
  escrow_balance: number;
  speed_penalties_accrued: number;
  distance_charges_accrued: number;
  geofence_penalties_accrued?: number;
  status: string;
  crash_detected: boolean;
  gateway_deposit?: number;
  nanopayments_accumulated?: number;
  gas_saved_usdc?: number;
}

interface Vehicle {
  id: number;
  model: string;
  plate_number: string;
  base_rate_per_hour: number;
  rate_per_km: number;
  deposit_required: number;
}

interface MyRentalsProps {
  activeTab: string;
}

export default function MyRentals({ activeTab }: MyRentalsProps) {
  const { isConnected, address } = useAccount();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [endingId, setEndingId] = useState<number | null>(null);

  const { showModal, updateModal, hideModal } = useModal();
  const [selectedReviewRental, setSelectedReviewRental] = useState<Rental | null>(null);
  const [reviewedRentalIds, setReviewedRentalIds] = useState<Set<number>>(new Set());

  const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
  const { gaslessEnabled } = useCircleApp();
  const { writeContractAsync } = useGaslessWriteContract();
  const publicClient = usePublicClient();

  const { subscribeToEvent } = useNotifications();

  useEffect(() => {
    if (isConnected && address) {
      fetchData();
    }
  }, [isConnected, address, activeTab]);

  useEffect(() => {
    if (!isConnected || !address) return;

    const unsubscribes = [
      subscribeToEvent('rental-started', fetchData),
      subscribeToEvent('telemetry-updated', fetchData),
      subscribeToEvent('rental-completed', fetchData),
      subscribeToEvent('crash-detected', fetchData),
      subscribeToEvent('speed-penalty', fetchData),
      subscribeToEvent('geofence-penalty', fetchData),
    ];

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isConnected, address, subscribeToEvent]);

  const fetchData = async () => {
    try {
      const [rentalsRes, vehiclesRes, reviewsRes] = await Promise.all([
        fetch('/api/rentals'),
        fetch('/api/vehicles'),
        fetch('/api/reviews'),
      ]);
      const rentalsData = await rentalsRes.json();
      const vehiclesData = await vehiclesRes.json();
      const reviewsData = await reviewsRes.json();

      if (rentalsData.success && vehiclesData.success) {
        const userRentals = rentalsData.rentals.filter(
          (r: Rental) => r.renter.toLowerCase() === address?.toLowerCase()
        );
        setRentals(userRentals);
        setVehicles(vehiclesData.vehicles);

        if (reviewsData.success && address) {
          const userReviewed = reviewsData.reviews
            .filter((rev: any) => rev.reviewer.toLowerCase() === address.toLowerCase())
            .map((rev: any) => rev.rental_id);
          setReviewedRentalIds(new Set(userReviewed));
        }
      }
    } catch (e) {
      console.error('Error fetching rentals:', e);
    } finally {
      setLoading(false);
    }
  };

  const executeEndRental = async (rental: Rental) => {
    setEndingId(rental.id);
    const steps: TransactionStep[] = [
      { label: 'TRIGGER ESCROW DISBURSEMENT', status: 'pending' },
      { label: 'CLOSE AGREEMENT IN REGISTRY', status: 'idle' },
    ];

    showModal({
      type: 'transaction',
      title: 'SETTLING LEASE ESCROW',
      message: 'Processing final odometer distance fees and speed violation checks on-chain...',
      txSteps: steps,
      preventClose: true,
    });

    try {
      // Reconcile outstanding off-chain nanopayments with on-chain escrow
      try {
        console.log(`[Circle Gateway] Reconciling outstanding nanopayments on-chain for lease #${rental.id}...`);
        await fetch('/api/nanopay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'settle', rentalId: rental.id }),
        });
      } catch (npErr) {
        console.warn('Nanopayment reconciliation skipped or failed:', npErr);
      }

      const isContractActive = !!contractAddress && contractAddress.startsWith('0x');

      if (isContractActive) {
        console.log(`Ending rental #${rental.contract_id} on-chain...`);
        const rentDriveArtifact = require('../contracts/RentDrive.json');
        
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: rentDriveArtifact.abi,
          functionName: 'endRental',
          args: [BigInt(rental.contract_id)],
        }, { txName: 'End Rental & Settle' });
        
        console.log('End Rental Tx Hash:', txHash);
        updateModal({
          txHash,
        });
        await publicClient?.waitForTransactionReceipt({ hash: txHash });
      } else {
        throw new Error('RentDrive smart contract is not configured or deployed.');
      }

      steps[0].status = 'success';
      steps[1].status = 'pending';
      updateModal({
        txSteps: [...steps],
      });

      const res = await fetch(`/api/rentals/${rental.id}/end`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        steps[1].status = 'success';
        updateModal({
          type: 'success',
          title: 'LEASE SETTLED SUCCESSFULLY',
          message: `Your rental lease is closed. Refunded amount: ${data.summary.refundAmount} USDC, total distance fee settled: ${data.summary.distanceFee} USDC, total penalty settled: ${data.summary.penaltyFee} USDC.`,
          txSteps: [...steps],
          preventClose: false,
          primaryAction: {
            label: 'WRITE REVIEW NOW',
            onClick: () => {
              hideModal();
              setSelectedReviewRental(rental);
            },
          },
          secondaryAction: {
            label: 'DISMISS',
            onClick: () => {
              hideModal();
              fetchData();
            },
          },
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to end rental:', error);
      let humanMessage = error.message || error.toString();
      if (humanMessage.toLowerCase().includes('user rejected')) {
        humanMessage = 'The escrow settlement signature request was cancelled by the user.';
      }
      showModal({
        type: 'error',
        title: 'SETTLEMENT TRANSACTION FAILED',
        message: humanMessage,
        primaryAction: {
          label: 'DISMISS',
          onClick: () => {},
        },
      });
    } finally {
      setEndingId(null);
    }
  };

  const handleEndRental = (rental: Rental) => {
    showModal({
      type: 'confirm',
      title: 'CLOSE LEASE AGREEMENT',
      message: 'Are you sure you want to end this lease and trigger the final smart contract settlement? Your mileage charges will be calculated and settled instantly.',
      primaryAction: {
        label: 'PROCEED SETTLEMENT',
        onClick: () => {
          executeEndRental(rental);
        },
      },
      secondaryAction: {
        label: 'CANCEL',
        onClick: () => {},
      },
    });
  };

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-10 shadow-sm">
          <BadgeAlert className="mx-auto h-12 w-12 text-[#5A6573] mb-5" />
          <h2 className="text-sm font-black tracking-widest text-[#1C2B3C] uppercase mb-3">CONNECT WALLET REQUIRED</h2>
          <p className="text-[#5A6573] text-xs font-semibold leading-relaxed mb-8">
            Please authorize your active Web3 wallet to check your rental leases, active deposits, and live telemetry tracking.
          </p>
        </div>
      </div>
    );
  }

  const activeRentals = rentals.filter((r) => r.status === 'Active' || r.status === 'Disputed');
  const pastRentals = rentals.filter((r) => r.status === 'Completed' || r.status === 'Resolved');

  return (
    <PullToRefresh onRefresh={async () => { await fetchData(); }}>
      <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#E0DDD5]">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#1C2B3C] flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-[#1C2B3C]" />
          Lease & Escrow Dashboard
        </h2>
        <button
          onClick={fetchData}
          className="p-2.5 rounded-sm bg-white border border-[#E0DDD5] text-[#5A6573] hover:text-[#1C2B3C] transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-sm border border-[#E0DDD5] bg-white h-64 w-full" />
      ) : (
        <div className="space-y-12">
          {/* Active rentals section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#5A6573] mb-6">ACTIVE AGREEMENTS</h3>
            {activeRentals.length === 0 ? (
              <div className="rounded-sm border border-dashed border-[#DDDCD4] bg-[#EAE8E1]/30 p-10 text-center text-[#718096] text-xs font-semibold">
                No active agreements found. Lease a vehicle from the Marketplace to initialize an escrow.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {activeRentals.map((rental) => {
                  const vehicle = vehicles.find((v) => v.id === rental.vehicle_id);
                  const rentDriveArtifact = require('../contracts/RentDrive.json');
                  return (
                    <ActiveRentalCard
                      key={rental.id}
                      rental={rental}
                      vehicle={vehicle}
                      contractAddress={contractAddress}
                      abi={rentDriveArtifact.abi}
                      endingId={endingId}
                      handleEndRental={handleEndRental}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Past rentals */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#5A6573] mb-6">HISTORICAL LEASE LOG</h3>
            {pastRentals.length === 0 ? (
              <div className="rounded-sm border border-[#E0DDD5] bg-[#EAE8E1]/20 p-10 text-center text-[#718096] text-xs font-semibold">
                No past transactions recorded.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-sm border border-[#E0DDD5] bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E0DDD5] bg-[#F2F1EC] text-[#718096] text-[9px] font-bold tracking-widest uppercase">
                      <th className="p-4">VEHICLE SPECIFICATION</th>
                      <th className="p-4">START TIMEFRAME</th>
                      <th className="p-4">DISTANCE SUM</th>
                      <th className="p-4">PENALTY DISBURSEMENTS</th>
                      <th className="p-4">LEASE STATE</th>
                      <th className="p-4">FEEDBACK</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F1EC] text-[#1C2B3C] font-medium">
                    {pastRentals.map((rental) => {
                      const vehicle = vehicles.find((v) => v.id === rental.vehicle_id);
                      return (
                        <tr key={rental.id} className="hover:bg-[#F2F1EC]/40">
                          <td className="p-4 font-bold uppercase tracking-wide">{vehicle?.model || 'Unknown'}</td>
                          <td className="p-4">{new Date(rental.start_time).toLocaleString()}</td>
                          <td className="p-4 font-bold">{rental.distance_charges_accrued} USDC</td>
                          <td className="p-4 font-bold text-orange-700">
                            {rental.speed_penalties_accrued} USDC (Speed) / {rental.geofence_penalties_accrued || 0} USDC (Geofence)
                          </td>
                          <td className="p-4">
                            <span className="inline-flex rounded-sm bg-[#EAE8E1] px-2.5 py-1 text-[9px] font-bold tracking-widest text-[#5A6573] border border-[#DDDCD4] uppercase">
                              {rental.status}
                            </span>
                          </td>
                          <td className="p-4">
                            {reviewedRentalIds.has(rental.id) ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 border border-green-200 rounded-sm">
                                Reviewed
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedReviewRental(rental)}
                                className="px-3 py-1.5 bg-[#1C2B3C] text-white rounded-sm text-[9px] font-bold uppercase tracking-widest hover:bg-[#111A24] border border-[#1C2B3C] transition-all"
                              >
                                Write Review
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReviewRental && (
        <ReviewModal
          rental={selectedReviewRental}
          vehicle={vehicles.find((v) => v.id === selectedReviewRental.vehicle_id)}
          onClose={() => setSelectedReviewRental(null)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
      </div>
    </PullToRefresh>
  );
}
