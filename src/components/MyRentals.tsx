'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { Clock, ShieldCheck, ShieldAlert, BadgeAlert, RefreshCw } from 'lucide-react';
import { useModal, TransactionStep } from '@/contexts/ModalContext';

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
  status: string;
  crash_detected: boolean;
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

  const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  useEffect(() => {
    if (isConnected && address) {
      fetchData();
    }
  }, [isConnected, address, activeTab]);

  const fetchData = async () => {
    try {
      const [rentalsRes, vehiclesRes] = await Promise.all([
        fetch('/api/rentals'),
        fetch('/api/vehicles'),
      ]);
      const rentalsData = await rentalsRes.json();
      const vehiclesData = await vehiclesRes.json();

      if (rentalsData.success && vehiclesData.success) {
        const userRentals = rentalsData.rentals.filter(
          (r: Rental) => r.renter.toLowerCase() === address?.toLowerCase()
        );
        setRentals(userRentals);
        setVehicles(vehiclesData.vehicles);
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
      const isContractActive = !!contractAddress && contractAddress.startsWith('0x');

      if (isContractActive) {
        console.log(`Ending rental #${rental.contract_id} on-chain...`);
        const rentDriveArtifact = require('../contracts/RentDrive.json');
        
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: rentDriveArtifact.abi,
          functionName: 'endRental',
          args: [BigInt(rental.contract_id)],
        });
        
        console.log('End Rental Tx Hash:', txHash);
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
                  const isDisputed = rental.status === 'Disputed';
                  return (
                    <div
                      key={rental.id}
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
                            {rental.status}
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
                            {rental.escrow_balance} USDC
                          </span>
                        </div>
                      </div>

                      {/* Escrow Details with refined minimalist styling */}
                      <div className="grid grid-cols-3 gap-4 my-5 py-4 border-y border-[#F2F1EC] text-center text-xs">
                        <div>
                          <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Distance Fee</span>
                          <span className="text-[#1C2B3C] font-extrabold">{rental.distance_charges_accrued} USDC</span>
                        </div>
                        <div>
                          <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Violations</span>
                          <span className="text-[#3E5062] font-extrabold">{rental.speed_penalties_accrued} USDC</span>
                        </div>
                        <div>
                          <span className="block text-[#718096] font-bold text-[9px] tracking-wider uppercase mb-1">Total Cost</span>
                          <span className="text-[#1C2B3C] font-black">
                            {(Number(rental.distance_charges_accrued) + Number(rental.speed_penalties_accrued)).toFixed(2)} USDC
                          </span>
                        </div>
                      </div>

                      {isDisputed && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-sm bg-red-50 border border-red-200 p-4 text-red-800 text-xs leading-relaxed font-semibold">
                          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-600" />
                          <div>
                            <span className="font-extrabold block uppercase tracking-wider text-red-900 mb-0.5">COLLISION EVENT LOGGED</span>
                            Telemetry reported severe impact force. Escrow deposit locked pending insurance adjuster settlement.
                          </div>
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
                        className={`w-full py-3.5 rounded-sm font-bold text-[11px] tracking-widest uppercase transition-all duration-300 border ${
                          isDisputed
                            ? 'bg-[#EAE8E1] text-[#A0AEC0] border-[#DDDCD4] cursor-not-allowed'
                            : 'bg-[#1C2B3C] text-white hover:bg-red-700 hover:border-red-700 hover:text-white border-[#1C2B3C]'
                        }`}
                      >
                        {endingId === rental.id ? 'PROCESSING SETTLEMENT...' : 'CLOSE LEASE & REFUND ESCROW'}
                      </button>
                    </div>
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
                          <td className="p-4 font-bold text-orange-700">{rental.speed_penalties_accrued} USDC</td>
                          <td className="p-4">
                            <span className="inline-flex rounded-sm bg-[#EAE8E1] px-2.5 py-1 text-[9px] font-bold tracking-widest text-[#5A6573] border border-[#DDDCD4] uppercase">
                              {rental.status}
                            </span>
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
    </div>
  );
}
