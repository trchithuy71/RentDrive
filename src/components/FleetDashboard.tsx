'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { Coins, Car, ShieldAlert, BadgeAlert, TrendingUp, Download, Play, CheckSquare, Square, Zap, Landmark, Star, ShieldCheck } from 'lucide-react';
import { useModal, TransactionStep } from '@/contexts/ModalContext';
import { useCircleApp } from '@/contexts/CircleAppContext';
import { useGaslessWriteContract } from '@/hooks/useGaslessWriteContract';
import RevenueChart from './RevenueChart';

interface FleetVehicle {
  id: number;
  contractId: number;
  model: string;
  plateNumber: string;
  isActive: boolean;
  rentalCount: number;
  revenue: number;
  currency: string;
  utilizationRate: number;
  speedViolations: number;
}

interface AnalyticsData {
  totalVehicles: number;
  activeRentals: number;
  totalRevenueUsdc: number;
  totalRevenueEurc: number;
  speedPenaltiesCount: number;
  geofencePenaltiesCount: number;
  averageRating: number;
  chartData: any[];
  vehiclesMetrics: FleetVehicle[];
}

export default function FleetDashboard() {
  const { isConnected, address } = useAccount();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<number>>(new Set());
  const [withdrawing, setWithdrawing] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const { showModal, updateModal, hideModal } = useModal();
  const { gaslessEnabled } = useCircleApp();
  const { writeContractAsync } = useGaslessWriteContract();
  const publicClient = usePublicClient();

  const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
  const rentDriveArtifact = require('../contracts/RentDrive.json');

  useEffect(() => {
    if (isConnected && address) {
      fetchAnalytics();
    }
  }, [isConnected, address]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?owner=${address}`);
      const data = await res.json();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to load fleet analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectVehicle = (id: number) => {
    setSelectedVehicleIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const toggleSelectAll = () => {
    if (!analytics) return;
    if (selectedVehicleIds.size === analytics.vehiclesMetrics.length) {
      setSelectedVehicleIds(new Set());
    } else {
      setSelectedVehicleIds(new Set(analytics.vehiclesMetrics.map((v) => v.id)));
    }
  };

  const handleBulkStatusChange = async (activate: boolean) => {
    if (selectedVehicleIds.size === 0 || !analytics) return;

    const selectedList = analytics.vehiclesMetrics.filter((v) => selectedVehicleIds.has(v.id));
    setBulkUpdating(true);

    const steps: TransactionStep[] = selectedList.map((v, i) => ({
      label: `Update ${v.model} Status (${i + 1}/${selectedList.length})`,
      status: 'idle' as const,
    }));
    steps.push({ label: 'Sync Status to Fleet Registry', status: 'idle' as const });

    showModal({
      type: 'transaction',
      title: activate ? 'BULK ACTIVATING ASSETS' : 'BULK DEACTIVATING ASSETS',
      message: `Updating state for ${selectedList.length} fleet vehicles...`,
      txSteps: steps,
      preventClose: true,
    });

    try {
      // 1. Write on-chain transaction for each vehicle
      for (let i = 0; i < selectedList.length; i++) {
        const vehicle = selectedList[i];
        steps[i].status = 'pending';
        updateModal({ txSteps: [...steps] });

        if (contractAddress && contractAddress.startsWith('0x')) {
          const txHash = await writeContractAsync({
            address: contractAddress,
            abi: rentDriveArtifact.abi,
            functionName: 'setVehicleActive',
            args: [BigInt(vehicle.contractId), activate],
          }, { txName: `Set ${vehicle.model} Active` });
          
          await publicClient?.waitForTransactionReceipt({ hash: txHash });
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }

        steps[i].status = 'success';
        updateModal({ txSteps: [...steps] });
      }

      // 2. Sync to DB
      steps[steps.length - 1].status = 'pending';
      updateModal({ txSteps: [...steps] });

      const res = await fetch('/api/vehicles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleIds: Array.from(selectedVehicleIds),
          isActive: activate,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        steps[steps.length - 1].status = 'success';
        updateModal({
          type: 'success',
          title: 'FLEET UPDATE COMPLETED',
          message: `Successfully ${activate ? 'activated' : 'deactivated'} ${selectedList.length} vehicles.`,
          txSteps: [...steps],
          preventClose: false,
          primaryAction: {
            label: 'DISMISS',
            onClick: () => {
              setSelectedVehicleIds(new Set());
              fetchAnalytics();
            },
          },
        });
      } else {
        throw new Error(resData.error || 'Failed to sync statuses');
      }

    } catch (err: any) {
      console.error('Bulk toggle error:', err);
      showModal({
        type: 'error',
        title: 'BULK STATE CHANGE FAILED',
        message: err.message || 'Unknown transaction failure',
        primaryAction: { label: 'DISMISS', onClick: () => {} },
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleWithdrawAll = async () => {
    if (!analytics) return;
    const totalUsdc = analytics.totalRevenueUsdc;
    const totalEurc = analytics.totalRevenueEurc;

    if (totalUsdc === 0 && totalEurc === 0) {
      showModal({
        type: 'warning',
        title: 'NO EARNINGS TO WITHDRAW',
        message: 'Your fleet currently has 0.00 pending earnings in the smart contract escrow.',
      });
      return;
    }

    setWithdrawing(true);
    showModal({
      type: 'loading',
      title: 'WITHDRAWING ALL FLEET EARNINGS',
      message: `Initiating contract withdrawal for ${totalUsdc} USDC and ${totalEurc} EURC...`,
      preventClose: true,
    });

    try {
      if (contractAddress && contractAddress.startsWith('0x')) {
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: rentDriveArtifact.abi,
          functionName: 'withdrawEarnings',
        }, { txName: 'Withdraw Fleet Earnings' });

        await publicClient?.waitForTransactionReceipt({ hash: txHash });
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }

      showModal({
        type: 'success',
        title: 'FLEET EARNINGS SETTLED',
        message: `Successfully transferred pending USDC & EURC earnings directly to your operator wallet address.`,
        primaryAction: {
          label: 'DISMISS',
          onClick: () => {
            fetchAnalytics();
          },
        },
      });
    } catch (error: any) {
      console.error('Unified withdrawal error:', error);
      let humanMsg = error.message || error.toString();
      if (humanMsg.toLowerCase().includes('user rejected')) {
        humanMsg = 'Transaction signature request cancelled by user.';
      }
      showModal({
        type: 'error',
        title: 'WITHDRAWAL FAILED',
        message: humanMsg,
        primaryAction: { label: 'DISMISS', onClick: () => {} },
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/rentals');
      const data = await res.json();
      if (!data.success || !data.rentals || !analytics) return;

      const ownedVehicleIds = new Set(analytics.vehiclesMetrics.map((v) => v.id));
      const ownerRentals = data.rentals.filter((r: any) => ownedVehicleIds.has(r.vehicle_id));

      const headers = ['Rental ID', 'Vehicle ID', 'Renter Address', 'Start Time', 'End Time', 'Odometer Travelled (m)', 'Escrow Balance', 'Distance Cost', 'Speed Penalties', 'Geofence Penalties', 'Status'];
      const rows = ownerRentals.map((r: any) => {
        const matchingVehicle = analytics.vehiclesMetrics.find((v) => v.id === r.vehicle_id);
        const modelName = matchingVehicle ? matchingVehicle.model : `Vehicle #${r.vehicle_id}`;
        return [
          r.id,
          modelName,
          r.renter,
          new Date(r.start_time).toLocaleString(),
          r.end_time ? new Date(r.end_time).toLocaleString() : 'Active',
          r.current_odometer - r.start_odometer,
          r.escrow_balance,
          r.distance_charges_accrued,
          r.speed_penalties_accrued,
          r.geofence_penalties_accrued || 0,
          r.status,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.map((val) => `"${val}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `fleet_rentals_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showModal({
        type: 'success',
        title: 'CSV EXPORT COMPLETE',
        message: `Successfully generated and downloaded spreadsheet logs for ${rows.length} fleet rentals.`,
      });

    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1C2B3C] border-t-transparent mx-auto mb-4" />
          <span className="text-[10px] font-black uppercase tracking-widest text-[#5A6573]">
            GENERATING FLEET ANALYTICS METRICS...
          </span>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Aggregate Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-[#DDDCD4] rounded-sm p-6 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black text-[#718096] uppercase tracking-widest block">Total Fleet Size</span>
            <span className="text-3xl font-black text-[#1C2B3C] block mt-2">{analytics.totalVehicles} Vehicles</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600">
            <Car className="h-3.5 w-3.5" />
            <span>NFT PROVEN OWNERSHIP</span>
          </div>
        </div>

        <div className="bg-white border border-[#DDDCD4] rounded-sm p-6 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black text-[#718096] uppercase tracking-widest block">Active Leases</span>
            <span className="text-3xl font-black text-[#1C2B3C] block mt-2">{analytics.activeRentals} Active</span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold text-[#5A6573]">
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{(analytics.activeRentals / (analytics.totalVehicles || 1) * 100).toFixed(0)}% Fleet Utilization</span>
          </div>
        </div>

        <div className="bg-white border border-[#DDDCD4] rounded-sm p-6 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black text-[#718096] uppercase tracking-widest block">Combined Escrow</span>
            <div className="mt-2 space-y-1 font-mono">
              <span className="text-lg font-black text-[#1C2B3C] block leading-none">
                {analytics.totalRevenueUsdc.toFixed(2)} USDC
              </span>
              <span className="text-lg font-black text-emerald-600 block leading-none">
                {analytics.totalRevenueEurc.toFixed(2)} EURC
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold text-indigo-600">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>LIVE FX CALCULATED</span>
          </div>
        </div>

        <div className="bg-white border border-[#DDDCD4] rounded-sm p-6 flex flex-col justify-between">
          <div>
            <span className="text-[8px] font-black text-[#718096] uppercase tracking-widest block">Average Rating</span>
            <div className="flex items-center gap-1.5 mt-2.5">
              <Star className="h-6 w-6 text-amber-500 fill-amber-500" />
              <span className="text-3xl font-black text-[#1C2B3C] leading-none font-mono">
                {analytics.averageRating.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[9px] font-bold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>EXCELLENT FLEET QUALITY</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <RevenueChart data={analytics.chartData} />

      {/* Actions and Violations Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bulk Toggles and Table */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-[#DDDCD4] rounded-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1C2B3C]">
                  Fleet Registry Compare
                </h4>
                <span className="text-[9px] text-[#718096] font-mono tracking-widest uppercase">
                  Bulk control and utilization table
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-sm bg-white hover:bg-[#EAE8E1] border border-[#DDDCD4] text-[9.5px] font-bold uppercase tracking-wider text-[#1C2B3C]"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button
                  onClick={handleWithdrawAll}
                  disabled={withdrawing}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-sm bg-[#1C2B3C] text-white hover:bg-slate-800 text-[9.5px] font-bold uppercase tracking-wider"
                >
                  {gaslessEnabled ? <Zap className="h-3.5 w-3.5 fill-current text-emerald-400" /> : <Landmark className="h-3.5 w-3.5" />}
                  WITHDRAW ALL
                </button>
              </div>
            </div>

            {/* Bulk actions status bar */}
            {selectedVehicleIds.size > 0 && (
              <div className="bg-[#F2F1EC] border border-[#DDDCD4] px-4 py-3 rounded-sm flex items-center justify-between mb-4 animate-[fadeIn_0.2s_ease-out]">
                <span className="text-[10px] font-bold text-[#1C2B3C] uppercase tracking-wider">
                  {selectedVehicleIds.size} vehicles selected for batch operations
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkStatusChange(true)}
                    disabled={bulkUpdating}
                    className="px-3.5 py-2 text-[9px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-sm uppercase tracking-widest"
                  >
                    Activate Selected
                  </button>
                  <button
                    onClick={() => handleBulkStatusChange(false)}
                    disabled={bulkUpdating}
                    className="px-3.5 py-2 text-[9px] font-black text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-sm uppercase tracking-widest"
                  >
                    Deactivate Selected
                  </button>
                </div>
              </div>
            )}

            {/* Performance table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10.5px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DDDCD4] bg-[#F2F1EC]/60 text-[9px] font-black uppercase tracking-wider text-[#718096]">
                    <th className="py-3 px-3 w-8">
                      <button onClick={toggleSelectAll} className="p-0.5 hover:bg-[#EAE8E1] rounded-sm text-[#1C2B3C]">
                        {selectedVehicleIds.size === analytics.vehiclesMetrics.length ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Vehicle / Plate</th>
                    <th className="py-3 px-3">On-Chain Status</th>
                    <th className="py-3 px-3">Util %</th>
                    <th className="py-3 px-3">Total Trips</th>
                    <th className="py-3 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F1EC]">
                  {analytics.vehiclesMetrics.map((v) => {
                    const isChecked = selectedVehicleIds.has(v.id);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <button onClick={() => toggleSelectVehicle(v.id)} className="text-[#1C2B3C]">
                            {isChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="py-3 px-3 font-semibold">
                          <span className="block text-[#1C2B3C] font-extrabold uppercase">{v.model}</span>
                          <span className="text-[9px] text-[#718096] font-mono font-bold tracking-widest">{v.plateNumber}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[8.5px] font-black uppercase border ${
                            v.isActive 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}>
                            {v.isActive ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                            {v.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3 px-3 w-28">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#F2F1EC] h-2 rounded-full overflow-hidden border border-[#DDDCD4]/60">
                              <div className="bg-[#1C2B3C] h-full" style={{ width: `${v.utilizationRate}%` }} />
                            </div>
                            <span className="font-mono font-black text-[9.5px] text-[#1C2B3C]">{v.utilizationRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-[#1C2B3C]">{v.rentalCount} leases</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-[#1C2B3C]">
                          {v.revenue.toFixed(2)} {v.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Violations and geofence summary */}
        <div className="space-y-6">
          <div className="bg-[#1C2B3C] text-white rounded-sm p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Violations Summary
              </h4>
              <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-1">
                Fleet telematics breach status
              </p>
              
              <div className="mt-8 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-sm bg-amber-500/20 flex items-center justify-center">
                      <BadgeAlert className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-300 block uppercase">Speed Alerts</span>
                      <span className="text-sm font-black font-mono">{analytics.speedPenaltiesCount} Incidents</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase font-mono">WARNING FIRED</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-sm bg-red-500/20 flex items-center justify-center">
                      <ShieldAlert className="h-5 w-5 text-red-400 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-300 block uppercase">Geofence Violations</span>
                      <span className="text-sm font-black font-mono">{analytics.geofencePenaltiesCount} Incidents</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-red-400 uppercase font-mono">PENALTY BILLING</span>
                </div>
              </div>
            </div>
            
            <div className="mt-10 bg-slate-800/60 p-4 border border-slate-700/80 rounded-sm">
              <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">AUTOMATED ACTIONS ACTIVE</span>
              <p className="text-[9.5px] font-semibold text-slate-300 leading-relaxed">
                Telemetry alerts are directly integrated on-chain. Exceeding set speed thresholds or boundaries auto-deducts penalties from locked renter escrows.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
