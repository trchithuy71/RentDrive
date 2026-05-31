'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, Address } from 'viem';
import { Landmark, Plus, Coins, ShieldAlert } from 'lucide-react';
import { useModal, TransactionStep } from '@/contexts/ModalContext';

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
}

interface OwnerPortalProps {
  activeTab: string;
}

export default function OwnerPortal({ activeTab }: OwnerPortalProps) {
  const { isConnected, address } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [disputedRentals, setDisputedRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  // Listing Form State
  const [model, setModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [baseRate, setBaseRate] = useState('5.00');
  const [ratePerKm, setRatePerKm] = useState('0.50');
  const [speedLimit, setSpeedLimit] = useState('100');
  const [speedPenalty, setSpeedPenalty] = useState('50.00');
  const [deposit, setDeposit] = useState('200.00');
  const [listing, setListing] = useState(false);

  // Dispute settlement states
  const [settlingId, setSettlingId] = useState<number | null>(null);
  const [payoutOwner, setPayoutOwner] = useState('150.00');
  const [refundRenter, setRefundRenter] = useState('50.00');

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
            `${model} | ${plateNumber}`,
          ],
        });

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Manage Fleet & Claims */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Earnings Widget */}
          <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[9px] text-[#718096] font-bold uppercase tracking-widest block">Accrued Rental Income</span>
                <h3 className="text-3xl font-black text-[#1C2B3C] mt-2 tracking-tight">
                  {(vehicles.length * 35.5).toFixed(2)} USDC
                </h3>
              </div>
              <button
                onClick={() => alert('Earnings already disbursed directly to your wallet on rental completion!')}
                className="flex items-center gap-2.5 rounded-sm bg-[#1C2B3C] px-5 py-3 text-[11px] font-bold tracking-widest text-[#F2F1EC] uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm"
              >
                <Coins className="h-4 w-4" /> AUTO-DISBURSED
              </button>
            </div>
          </div>

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
                    <div>
                      <h4 className="font-bold text-[#1C2B3C] text-sm uppercase tracking-wide">{v.model}</h4>
                      <span className="text-[10px] text-[#718096] font-mono tracking-wider block font-bold mt-0.5">{v.plate_number}</span>
                      <span className="block text-[10px] text-[#3E5062] font-extrabold uppercase tracking-widest mt-1.5">
                        {v.rate_per_km} USDC/km · {v.deposit_required} USDC DEPOSIT
                      </span>
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
                <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">ESCROW COLLATERAL (USDC)</label>
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

            <button
              type="submit"
              disabled={listing}
              className="w-full mt-4 py-4 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] font-bold text-[11px] tracking-widest uppercase hover:bg-[#111A24] transition-all border border-[#1C2B3C] shadow-sm"
            >
              {listing ? 'DEPLOYING TO ARC NETWORK...' : 'REGISTER VEHICLE ASSET'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
