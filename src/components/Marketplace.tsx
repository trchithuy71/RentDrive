'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, Address, erc20Abi } from 'viem';
import { Car, ShieldCheck, Flame, ShieldAlert, Zap, ArrowRightLeft } from 'lucide-react';
import StarRating from './StarRating';
import { CurrencyBadge, FXRateDisplay } from './CurrencySelector';
import { CURRENCY_CONFIG, type CurrencySymbol } from '@/lib/stablefx';
import { useModal, TransactionStep } from '@/contexts/ModalContext';
import { useCircleApp } from '@/contexts/CircleAppContext';
import { useGaslessWriteContract } from '@/hooks/useGaslessWriteContract';
import PullToRefresh from './PullToRefresh';
import CrossChainRental from './CrossChainRental';

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
  accepted_currency?: string;
}

interface MarketplaceProps {
  onRentalStarted: () => void;
}

export default function Marketplace({ onRentalStarted }: MarketplaceProps) {
  const { isConnected, address } = useAccount();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showCrossChain, setShowCrossChain] = useState(false);
  const [renting, setRenting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [vehicleRatings, setVehicleRatings] = useState<Record<number, { average: number; count: number }>>({});

  const { showModal, updateModal, hideModal } = useModal();
  const { balances, openTopUpModal, gaslessEnabled } = useCircleApp();
  const { writeContractAsync } = useGaslessWriteContract();
  const publicClient = usePublicClient();

  const poolAddress = process.env.NEXT_PUBLIC_INSURANCE_POOL_ADDRESS as Address;
  const poolArtifact = require('../contracts/InsurancePool.json');

  const { data: premiumRateBps } = useReadContract({
    address: poolAddress,
    abi: poolArtifact.abi,
    functionName: 'premiumRateBps',
    query: { enabled: !!poolAddress },
  });

  const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
  const usdcAddress = process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS || '0x3600000000000000000000000000000000000000';
  const eurcAddress = process.env.NEXT_PUBLIC_EURC_TOKEN_ADDRESS || '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

  // FX Rate State
  const [fxRate, setFxRate] = useState<number>(0.92);
  const [fxSource, setFxSource] = useState<'stablefx_api' | 'fallback'>('fallback');

  const rentDriveArtifact = require('../contracts/RentDrive.json');
  const { data: onChainVehicleCount } = useReadContract({
    address: contractAddress,
    abi: rentDriveArtifact.abi,
    functionName: 'getVehicleCount',
    query: { enabled: !!contractAddress },
  });

  useEffect(() => {
    fetchVehicles();
    fetchFxRate();
    const fxInterval = setInterval(fetchFxRate, 60_000); // refresh FX rate every 60s
    return () => clearInterval(fxInterval);
  }, []);

  const fetchFxRate = async () => {
    try {
      const res = await fetch('/api/fx-rate?from=USDC&to=EURC');
      const data = await res.json();
      if (data.success) {
        setFxRate(data.rate);
        setFxSource(data.source);
      }
    } catch (e) {
      console.error('Failed to fetch FX rate:', e);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles);
        
        // Fetch and calculate ratings
        try {
          const [reviewsRes, rentalsRes] = await Promise.all([
            fetch('/api/reviews'),
            fetch('/api/rentals')
          ]);
          const reviewsData = await reviewsRes.json();
          const rentalsData = await rentalsRes.json();
          
          if (reviewsData.success && rentalsData.success) {
            const rentalToVehicle: Record<number, number> = {};
            rentalsData.rentals.forEach((r: any) => {
              rentalToVehicle[r.id] = r.vehicle_id;
            });
            
            const ratingSums: Record<number, number> = {};
            const ratingCounts: Record<number, number> = {};
            
            reviewsData.reviews.forEach((rev: any) => {
              const vId = rentalToVehicle[rev.rental_id];
              if (vId) {
                ratingSums[vId] = (ratingSums[vId] || 0) + rev.rating;
                ratingCounts[vId] = (ratingCounts[vId] || 0) + 1;
              }
            });
            
            const ratingsMap: Record<number, { average: number; count: number }> = {};
            Object.keys(ratingCounts).forEach((vIdStr) => {
              const vId = Number(vIdStr);
              ratingsMap[vId] = {
                average: ratingSums[vId] / ratingCounts[vId],
                count: ratingCounts[vId]
              };
            });
            setVehicleRatings(ratingsMap);
          }
        } catch (ratingErr) {
          console.error('Failed to fetch ratings:', ratingErr);
        }
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

    // Check Arc USDC balance
    const arcBalanceStr = balances?.breakdown.find(b => b.chain.toLowerCase().includes('arc'))?.confirmedBalance || '0.00';
    const arcBalanceVal = parseFloat(arcBalanceStr);
    const premiumAmount = (Number(vehicle.deposit_required) * Number(premiumRateBps || 500)) / 10_000;
    const requiredVal = vehicle.deposit_required + premiumAmount;
    
    if (arcBalanceVal < requiredVal) {
      const totalBalanceVal = parseFloat(balances?.totalConfirmedBalance || '0.00');
      const neededAmount = (requiredVal - arcBalanceVal).toFixed(2);
      
      if (totalBalanceVal >= requiredVal) {
        // Offer one-click bridge top-up
        showModal({
          type: 'warning',
          title: 'INSUFFICIENT ARC BALANCE',
          message: `You need ${requiredVal} USDC on Arc Testnet to rent this vehicle, but you only have ${arcBalanceStr} USDC. However, your total Unified Balance across all chains is ${balances?.totalConfirmedBalance} USDC.`,
          primaryAction: {
            label: `BRIDGE ${neededAmount} USDC NOW`,
            onClick: () => {
              hideModal();
              openTopUpModal(neededAmount);
            }
          },
          secondaryAction: {
            label: 'CANCEL',
            onClick: () => {
              hideModal();
              setRenting(false);
            }
          }
        });
      } else {
        // Offer general top-up / deposit instructions
        showModal({
          type: 'error',
          title: 'INSUFFICIENT USDC FUNDS',
          message: `You need ${requiredVal} USDC on Arc Testnet to rent this vehicle, but you only have ${arcBalanceStr} USDC (Unified: ${balances?.totalConfirmedBalance || '0.00'} USDC). Please fund your wallet or bridge from another chain.`,
          primaryAction: {
            label: 'OPEN BRIDGE WIZARD',
            onClick: () => {
              hideModal();
              openTopUpModal();
            }
          },
          secondaryAction: {
            label: 'CANCEL',
            onClick: () => {
              hideModal();
              setRenting(false);
            }
          }
        });
      }
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
        // 1. Approve token transfer (deposit + premium) — use vehicle's accepted token
        const vehicleCurrency = selectedVehicle?.accepted_currency || 'USDC';
        const tokenAddress = vehicleCurrency === 'EURC' ? eurcAddress : usdcAddress;
        const premiumAmount = (Number(vehicle.deposit_required) * Number(premiumRateBps || 500)) / 10_000;
        const totalAmount = Number(vehicle.deposit_required) + premiumAmount;
        const depositAmount = parseUnits(totalAmount.toFixed(6), 6);
        
        console.log(`Approving ${totalAmount.toFixed(2)} ${vehicleCurrency} to RentDrive Contract: ${contractAddress}`);
        const approveHash = await writeContractAsync({
          address: tokenAddress as Address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [contractAddress, depositAmount],
        }, { txName: `Approve ${vehicleCurrency}` });
        
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
        }, { txName: 'Start Rental Escrow' });

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
        const vehicleCurrency = vehicle.accepted_currency || 'USDC';
        steps[2].status = 'success';
        updateModal({
          title: 'LEASE ACTIVATION COMPLETED',
          message: `Successfully locked ${vehicle.deposit_required} ${vehicleCurrency} in escrow standard. Your active rental lease of ${vehicle.model} has been recorded.`,
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
    <PullToRefresh onRefresh={async () => { await fetchVehicles(); }}>
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

      <h2 className="text-sm font-bold uppercase tracking-widest text-[#1C2B3C] mb-8 flex items-center justify-between pb-2 border-b border-[#E0DDD5]">
        <div className="flex items-center gap-2.5">
          <Car className="h-4 w-4 text-[#1C2B3C]" />
          AVAILABLE FLEET
        </div>
        <span className="text-[10px] text-[#5A6573] font-mono tracking-wider font-bold uppercase">
          On-Chain Registry Count: {onChainVehicleCount !== undefined && onChainVehicleCount !== null ? onChainVehicleCount.toString() : '...'} (DB Count: {vehicles.length})
        </span>
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
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                  <span className="rounded-sm bg-[#1C2B3C] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#F2F1EC] border border-[#3E5062]/50 shadow-sm uppercase">
                    {vehicle.deposit_required} {vehicle.accepted_currency || 'USDC'} DEPOSIT
                  </span>
                  <CurrencyBadge currency={(vehicle.accepted_currency || 'USDC') as CurrencySymbol} size="sm" />
                </div>
              </div>

              {/* Specs and details with high-contrast text */}
              <div className="flex flex-1 flex-col p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#1C2B3C] tracking-wide uppercase transition-colors">
                    {vehicle.model}
                  </h3>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="rounded-sm bg-[#F2F1EC] px-2.5 py-1 text-[9px] font-bold tracking-widest text-[#5A6573] border border-[#E0DDD5]">
                      {vehicle.plate_number}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
                      <ShieldCheck className="h-3 w-3 text-amber-600 fill-current" /> NFT #{vehicle.contract_id}
                    </span>
                  </div>
                </div>

                {/* Rating display */}
                <div className="flex items-center gap-1.5 mb-2">
                  <StarRating rating={vehicleRatings[vehicle.id]?.average || 0} size={13} />
                  <span className="text-[9px] text-[#718096] font-extrabold uppercase tracking-wide">
                    {vehicleRatings[vehicle.id]
                      ? `${vehicleRatings[vehicle.id].average.toFixed(1)} (${vehicleRatings[vehicle.id].count} ${vehicleRatings[vehicle.id].count === 1 ? 'review' : 'reviews'})`
                      : 'No reviews'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6 my-4 py-5 border-y border-[#E5E3DB] text-xs">
                  <div>
                    <span className="block text-[9px] text-[#718096] uppercase tracking-widest font-bold">BASE RATE</span>
                    <span className="text-[#1C2B3C] font-extrabold">{vehicle.base_rate_per_hour} {vehicle.accepted_currency || 'USDC'} / hour</span>
                    {vehicle.accepted_currency === 'EURC' && (
                      <span className="block text-[8px] text-[#A0AEC0] font-semibold">≈ {(vehicle.base_rate_per_hour / fxRate).toFixed(2)} USDC</span>
                    )}
                    {(vehicle.accepted_currency || 'USDC') === 'USDC' && (
                      <span className="block text-[8px] text-[#A0AEC0] font-semibold">≈ {(vehicle.base_rate_per_hour * fxRate).toFixed(2)} EURC</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[9px] text-[#718096] uppercase tracking-widest font-bold">DISTANCE RATE</span>
                    <span className="text-[#1C2B3C] font-extrabold">{vehicle.rate_per_km} {vehicle.accepted_currency || 'USDC'} / km</span>
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
                    <span className="text-[#1C2B3C] font-extrabold">{vehicle.speed_penalty_usdc} {vehicle.accepted_currency || 'USDC'}</span>
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
          {showCrossChain ? (
            <div className="w-full max-w-lg">
              <CrossChainRental
                vehicle={selectedVehicle}
                onClose={() => setShowCrossChain(false)}
                onSuccess={() => {
                  setSelectedVehicle(null);
                  setShowCrossChain(false);
                  onRentalStarted();
                }}
              />
            </div>
          ) : (
            <div className="w-full max-w-lg rounded-sm border border-[#DDDCD4] bg-[#F2F1EC] p-8 shadow-2xl relative">
              <h3 className="text-lg font-black text-[#1C2B3C] uppercase tracking-wider mb-6 pb-2 border-b border-[#E0DDD5]">ESCROW AGREEMENT</h3>
            
            <div className="space-y-4 rounded-sm bg-white p-6 border border-[#E0DDD5] mb-8">
              {/* FX Rate Display */}
              <div className="flex items-center justify-between text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5" /> STABLEFX RATE:
                </span>
                <FXRateDisplay rate={fxRate} from="USDC" to="EURC" source={fxSource} />
              </div>
              {/* Payment Currency */}
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">PAYMENT CURRENCY:</span>
                <CurrencyBadge currency={(selectedVehicle.accepted_currency || 'USDC') as CurrencySymbol} size="md" />
              </div>
              {gaslessEnabled && (
                <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5 bg-emerald-50/50 p-1.5 rounded-sm">
                  <span className="text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5 fill-current text-emerald-600 animate-pulse" /> GAS SPONSORSHIP:
                  </span>
                  <span className="text-emerald-700 font-extrabold uppercase font-mono text-[10px] bg-emerald-100/70 px-1.5 py-0.5 rounded-sm">
                    100% FREE (CIRCLE PAYMASTER)
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">RENTER IDENTIFICATION:</span>
                <span className="text-[#1C2B3C] font-mono font-bold text-xs">{address ? `${address.substring(0,8)}...${address.substring(34)}` : 'NOT CONNECTED'}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">COLLATERAL DEPOSIT:</span>
                <span className="text-[#1C2B3C] font-extrabold">
                  {selectedVehicle.deposit_required} {selectedVehicle.accepted_currency || 'USDC'} (LOCKED)
                  {selectedVehicle.accepted_currency === 'EURC' && (
                    <span className="text-[9px] text-[#A0AEC0] ml-1">≈ {(selectedVehicle.deposit_required / fxRate).toFixed(2)} USDC</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">AUTOMATED INSURANCE PREMIUM:</span>
                <span className="text-[#1C2B3C] font-extrabold text-amber-700">
                  {((Number(selectedVehicle.deposit_required) * Number(premiumRateBps || 500)) / 10_000).toFixed(2)} {selectedVehicle.accepted_currency || 'USDC'} ({(Number(premiumRateBps || 500) / 100).toFixed(1)}% rate)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">TOTAL START AMOUNT:</span>
                <span className="text-[#1C2B3C] font-black">
                  {(Number(selectedVehicle.deposit_required) + (Number(selectedVehicle.deposit_required) * Number(premiumRateBps || 500)) / 10_000).toFixed(2)} {selectedVehicle.accepted_currency || 'USDC'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">MICRO-BILLING RATE:</span>
                <span className="text-[#1C2B3C] font-extrabold">{selectedVehicle.rate_per_km} {selectedVehicle.accepted_currency || 'USDC'}/km + {selectedVehicle.base_rate_per_hour} {selectedVehicle.accepted_currency || 'USDC'}/hour</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-[#F2F1EC] pb-2.5">
                <span className="text-[#718096] font-bold uppercase tracking-wider">SPEED ENFORCEMENT:</span>
                <span className="text-[#1C2B3C] font-extrabold">&gt;{selectedVehicle.speed_limit_kmh} km/h = -{selectedVehicle.speed_penalty_usdc} {selectedVehicle.accepted_currency || 'USDC'} Penalty</span>
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
              <div className="space-y-3">
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="flex-1 py-3.5 rounded-sm bg-[#EAE8E1] hover:bg-[#DDDCD4] text-[#1C2B3C] font-bold text-xs tracking-widest uppercase transition-all border border-[#DDDCD4]"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => handleRent(selectedVehicle)}
                    className="flex-1 py-3.5 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] font-bold text-xs tracking-widest uppercase transition-all hover:bg-[#111A24] shadow-md shadow-[#1C2B3C]/10 border border-[#1C2B3C] flex items-center justify-center gap-1.5"
                  >
                    {gaslessEnabled && <Zap className="h-3.5 w-3.5 fill-current text-emerald-400" />}
                    {gaslessEnabled ? 'CONFIRM & DEPLOY (GASLESS)' : 'CONFIRM & DEPLOY'}
                  </button>
                </div>

                <button
                  onClick={() => setShowCrossChain(true)}
                  className="w-full py-3.5 rounded-sm bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white font-bold text-xs tracking-widest uppercase transition-all hover:opacity-95 shadow-md flex items-center justify-center gap-1.5 border border-indigo-700"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-white animate-pulse" />
                  RENT FROM ETHEREUM / BASE / ARBITRUM (CCTP)
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      )}
      </div>
    </PullToRefresh>
  );
}
