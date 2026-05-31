'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, Address, erc20Abi } from 'viem';
import { Car, ShieldCheck, Flame, ShieldAlert } from 'lucide-react';
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

interface MarketplaceProps {
  onRentalStarted: () => void;
}

export default function Marketplace({ onRentalStarted }: MarketplaceProps) {
  const { isConnected, address } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [renting, setRenting] = useState(false);
  const [txHash, setTxHash] = useState('');

  const { showModal, updateModal, hideModal } = useModal();

  const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || '0x3600000000000000000000000000000000000000';

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles);
      }
    } catch (e) {
      console.error('Failed to fetch vehicles:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRent = async (vehicle: Vehicle) => {
    if (!isConnected || !address) {
      showModal({
        type: 'error',
        title: 'CONNECT WALLET REQUIRED',
        message: 'Please link your active Web3 wallet to authorize smart contract deposits.',
      });
      return;
    }

    setRenting(true);
    setTxHash('');

    // Setup unified transaction steps
    const steps: TransactionStep[] = [
      { label: 'APPROVE USDC ALLOWANCE', status: 'pending' },
      { label: 'LOCK ESCROW COLLATERAL', status: 'idle' },
      { label: 'REGISTER ODOMETER STANDARD', status: 'idle' },
    ];

    showModal({
      type: 'transaction',
      title: 'PROVISIONING LEASE TRANSACTION',
      message: `Initiating smart contract escrow flow for vehicle: ${vehicle.model}. Please authorize each popup request standard inside your Web3 wallet.`,
      txSteps: steps,
      preventClose: true,
    });

    try {
      const isContractActive = !!contractAddress && contractAddress.startsWith('0x');

      if (isContractActive) {
        // 1. Approve USDC transfer
        const depositAmount = parseUnits(vehicle.deposit_required.toString(), 6);
        
        console.log(`Approving ${vehicle.deposit_required} USDC to RentDrive Contract: ${contractAddress}`);
        const approveHash = await writeContractAsync({
          address: usdcAddress as Address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractAddress, depositAmount],
        });
        
        console.log('Approval Tx Hash:', approveHash);
        await publicClient?.waitForTransactionReceipt({ hash: approveHash });

        // Update steps to move to on-chain execution
        steps[0].status = 'success';
        steps[1].status = 'pending';
        updateModal({
          txSteps: [...steps],
        });

        // 2. Call startRental on RentDrive contract
        const rentDriveArtifact = require('../contracts/RentDrive.json');
        
        const startOdometerMeters = 100000; // Simulated start odometer (100km)
        console.log(`Calling startRental on-chain for vehicle #${vehicle.contract_id}`);
        
        const rentHash = await writeContractAsync({
          address: contractAddress,
          abi: rentDriveArtifact.abi,
          functionName: 'startRental',
          args: [BigInt(vehicle.contract_id), BigInt(startOdometerMeters)],
        });

        console.log('Rent Tx Hash:', rentHash);
        setTxHash(rentHash);
        updateModal({
          txHash: rentHash,
        });

        await publicClient?.waitForTransactionReceipt({ hash: rentHash });
      } else {
        // Simulated local execution
        await new Promise((resolve) => setTimeout(resolve, 1500));
        steps[0].status = 'success';
        steps[1].status = 'pending';
        updateModal({
          txSteps: [...steps],
        });

        await new Promise((resolve) => setTimeout(resolve, 1500));
        const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setTxHash(mockHash);
        updateModal({
          txHash: mockHash,
        });
      }

      // Update to register in database step
      steps[1].status = 'success';
      steps[2].status = 'pending';
      updateModal({
        txSteps: [...steps],
      });

      // 3. Register in Database
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          renter: address,
          startOdometer: 100000,
        }),
      });

      const data = await res.json();
      if (data.success) {
        steps[2].status = 'success';
        updateModal({
          title: 'LEASE ACTIVATION COMPLETED',
          message: `Successfully locked ${vehicle.deposit_required} USDC in escrow standard. Your active rental lease of ${vehicle.model} has been recorded.`,
          txSteps: [...steps],
          preventClose: false,
          primaryAction: {
            label: 'LAUNCH TELEMATICS',
            onClick: () => {
              setSelectedVehicle(null);
              setRenting(false);
              onRentalStarted();
            },
          },
        });
      } else {
        throw new Error(data.error || 'Failed to register in database');
      }

    } catch (error: any) {
      console.error('Rental failed:', error);
      
      let humanMessage = error.message || error.toString();
      if (humanMessage.toLowerCase().includes('user rejected')) {
        humanMessage = 'The transaction signature request was cancelled by the user. Collateral assets remain untouched.';
      }

      showModal({
        type: 'error',
        title: 'TRANSACTION EXECUTION FAILED',
        message: humanMessage,
        primaryAction: {
          label: 'DISMISS',
          onClick: () => {
            setRenting(false);
          },
        },
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Portage-inspired high-end minimalist Hero Banner */}
      <div className="relative mb-14 rounded-sm overflow-hidden bg-[#EAE8E1] border border-[#DDDCD4] p-10 md:p-14 shadow-sm">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#1C2B3C] px-3 py-1.5 text-[9px] font-bold tracking-widest text-[#F2F1EC] uppercase">
            <ShieldCheck className="h-3.5 w-3.5" /> ARC NETWORK DEPIN SPECIFICATION
          </span>
          <h1 className="mt-6 text-4xl md:text-5xl font-black tracking-tight text-[#1C2B3C] leading-none uppercase font-sans">
            DECENTRALIZED P2P RENTALS <br />
            <span className="text-[#5A6573] font-normal italic tracking-normal">with telemetry protection</span>
          </h1>
          <p className="mt-6 text-[#4A5568] text-sm leading-relaxed max-w-2xl font-medium">
            Experience friction-free custody. Your security deposit remains locked in a verified smart contract escrow on the Arc Testnet. Real-time telemetry automates per-kilometer micro-billing and speed limit enforcement without intermediate authorities.
          </p>
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-widest text-[#1C2B3C] mb-8 flex items-center gap-2.5 pb-2 border-b border-[#E0DDD5]">
        <Car className="h-4 w-4 text-[#1C2B3C]" />
        AVAILABLE FLEET
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-sm border border-[#E0DDD5] bg-[#EAE8E1]/40 p-5 h-96" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="group relative flex flex-col overflow-hidden rounded-sm border border-[#E0DDD5] bg-white transition-all duration-300 hover:border-[#1C2B3C] hover:shadow-md"
            >
              {/* Image Container with strict flat borders */}
              <div className="relative h-56 overflow-hidden bg-[#F2F1EC] border-b border-[#E0DDD5]">
                <img
                  src={vehicle.image_url}
                  alt={vehicle.model}
                  className="h-full w-full object-cover grayscale-[20%] transition-transform duration-700 group-hover:scale-102 group-hover:grayscale-0"
                />
                <div className="absolute top-4 right-4 rounded-sm bg-[#1C2B3C] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#F2F1EC] border border-[#3E5062]/50 shadow-sm uppercase">
                  {vehicle.deposit_required} USDC DEPOSIT
                </div>
              </div>

              {/* Specs and details with high-contrast text */}
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1C2B3C] tracking-wide uppercase transition-colors">
                    {vehicle.model}
                  </h3>
                  <span className="rounded-sm bg-[#F2F1EC] px-2.5 py-1 text-[9px] font-bold tracking-widest text-[#5A6573] border border-[#E0DDD5]">
                    {vehicle.plate_number}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 my-4 py-5 border-y border-[#E5E3DB] text-xs">
                  <div>
                    <span className="block text-[9px] text-[#718096] uppercase tracking-widest font-bold">BASE RATE</span>
                    <span className="text-[#1C2B3C] font-extrabold">{vehicle.base_rate_per_hour} USDC / hour</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#718096] uppercase tracking-widest font-bold">DISTANCE RATE</span>
                    <span className="text-[#1C2B3C] font-extrabold">{vehicle.rate_per_km} USDC / km</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#718096] uppercase tracking-widest font-bold">SPEED LIMIT</span>
                    <span className="text-[#1C2B3C] font-extrabold flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-[#3E5062]" />
                      {vehicle.speed_limit_kmh} km/h
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#718096] uppercase tracking-widest font-bold">SPEED PENALTY</span>
                    <span className="text-[#1C2B3C] font-extrabold">{vehicle.speed_penalty_usdc} USDC</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedVehicle(vehicle)}
                  className="mt-4 w-full py-3.5 rounded-sm bg-[#1C2B3C] text-white text-[11px] font-bold tracking-widest uppercase transition-all duration-300 hover:bg-[#111A24] shadow-sm border border-[#1C2B3C]"
                >
                  VIEW ESCROW TERMS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Drawer / Modal in high-end Portage design layout */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C2B3C]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-sm border border-[#DDDCD4] bg-[#F2F1EC] p-8 shadow-2xl relative">
            <h3 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wider mb-6 pb-2 border-b border-[#E0DDD5]">ESCROW AGREEMENT</h3>
            
            <div className="space-y-4 rounded-sm bg-white p-6 border border-[#E0DDD5] mb-8">
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">RENTER IDENTIFICATION:</span>
                <span className="text-[#1C2B3C] font-mono font-bold text-xs">{address ? `${address.substring(0,8)}...${address.substring(34)}` : 'NOT CONNECTED'}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">COLLATERAL DEPOSIT:</span>
                <span className="text-[#1C2B3C] font-extrabold">{selectedVehicle.deposit_required} USDC (LOCKED)</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">MICRO-BILLING RATE:</span>
                <span className="text-[#1C2B3C] font-extrabold">{selectedVehicle.rate_per_km} USDC/km + {selectedVehicle.base_rate_per_hour} USDC/hour</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">SPEED ENFORCEMENT:</span>
                <span className="text-[#1C2B3C] font-extrabold">&gt;{selectedVehicle.speed_limit_kmh} km/h = -{selectedVehicle.speed_penalty_usdc} USDC Penalty</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#718096] font-bold uppercase tracking-wider">IMPACT CRASH SENSOR:</span>
                <span className="text-red-600 font-extrabold uppercase tracking-wide">AUTO-FREEZE TRIGGER ENABLED</span>
              </div>
            </div>

             {renting ? (
              <div className="py-6 text-center">
                <div className="flex justify-center mb-5">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1C2B3C] border-t-transparent" />
                </div>
                <p className="text-[11px] tracking-wider uppercase text-[#1C2B3C] font-bold">
                  PROVISIONING ESCROW DEPOSIT...
                </p>
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="flex-1 py-3.5 rounded-sm bg-[#EAE8E1] hover:bg-[#DDDCD4] text-[#1C2B3C] font-bold text-xs tracking-widest uppercase transition-all border border-[#DDDCD4]"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleRent(selectedVehicle)}
                  className="flex-1 py-3.5 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] font-bold text-xs tracking-widest uppercase transition-all hover:bg-[#111A24] shadow-md shadow-[#1C2B3C]/10 border border-[#1C2B3C]"
                >
                  CONFIRM & DEPLOY
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
