'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi';
import { Address, parseUnits, erc20Abi } from 'viem';
import { ArrowLeft, Zap, ShieldCheck, Flame, Loader2, Compass, CheckCircle2, XCircle } from 'lucide-react';
import { CCTP_NETWORKS, estimateCrossChainFees, padAddressToBytes32, type CctpNetwork } from '@/lib/cctp';
import { useModal } from '@/contexts/ModalContext';

interface CrossChainRentalProps {
  vehicle: any;
  onClose: () => void;
  onSuccess: (rentalId: number) => void;
}

export default function CrossChainRental({ vehicle, onClose, onSuccess }: CrossChainRentalProps) {
  const { address: userAddress, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { showModal, hideModal } = useModal();

  const [selectedChainId, setSelectedChainId] = useState<number>(11155111); // Default Ethereum Sepolia
  const [step, setStep] = useState<'ESTIMATE' | 'APPROVING' | 'BURNING' | 'TRACKING' | 'SUCCESS' | 'FAILED'>('ESTIMATE');
  const [fees, setFees] = useState<any>(null);
  
  // Tracking state
  const [trackingTxHash, setTrackingTxHash] = useState<string>('');
  const [trackingStatus, setTrackingStatus] = useState<any>(null);
  const [loadingText, setLoadingText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const activeNetwork = CCTP_NETWORKS[selectedChainId];

  // Update fee estimation when chain selection changes
  useEffect(() => {
    try {
      const deposit = Number(vehicle.deposit_required);
      const feeEst = estimateCrossChainFees(selectedChainId, deposit);
      setFees(feeEst);
    } catch (e) {
      console.error(e);
    }
  }, [selectedChainId, vehicle]);

  // Polling helper for status
  useEffect(() => {
    if (step !== 'TRACKING' || !trackingTxHash) return;

    let intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/cctp/status?txHash=${trackingTxHash}`);
        const data = await res.json();
        if (data.success && data.transfer) {
          setTrackingStatus(data.transfer);
          if (data.transfer.status === 'SUCCESS') {
            setStep('SUCCESS');
            clearInterval(intervalId);
          } else if (data.transfer.status === 'FAILED') {
            setStep('FAILED');
            setErrorMsg(data.transfer.error || 'CCTP transfer failed.');
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Polling tracking status error:', err);
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [step, trackingTxHash]);

  const handleCrossChainRent = async () => {
    if (!isConnected || !userAddress || !walletClient) {
      showModal({
        type: 'error',
        title: 'WALLET CONNECTION REQUIRED',
        message: 'Please connect your active Ethereum wallet to authorize the cross-chain deposit.',
        primaryAction: { label: 'DISMISS', onClick: () => {} }
      });
      return;
    }

    try {
      // 1. Ensure wallet is connected to the selected source chain
      if (chainId !== selectedChainId) {
        setLoadingText(`Switching network to ${activeNetwork.name}...`);
        await switchChainAsync({ chainId: selectedChainId });
      }

      setStep('APPROVING');
      setLoadingText(`Approving USDC spending on ${activeNetwork.name}...`);

      const depositAmount = parseUnits(vehicle.deposit_required.toString(), 6);

      // A. Standard ERC-20 Approve for Token Messenger on source chain
      const approveHash = await walletClient.writeContract({
        address: activeNetwork.usdcAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [activeNetwork.tokenMessenger, depositAmount],
      });

      setLoadingText('Waiting for approval confirmation...');
      await publicClient?.waitForTransactionReceipt({ hash: approveHash });

      // B. Token Messenger depositForBurn
      setStep('BURNING');
      setLoadingText(`Burning USDC on ${activeNetwork.name} for transfer...`);

      const destinationDomain = 26; // Arc Testnet Domain ID
      const recipientBytes32 = padAddressToBytes32(userAddress); // Relayer is us, or user directly

      const tokenMessengerAbi = [
        {
          name: 'depositForBurn',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'destinationDomain', type: 'uint32' },
            { name: 'mintRecipient', type: 'bytes32' },
            { name: 'burnToken', type: 'address' },
          ],
          outputs: [{ name: 'nonce', type: 'uint64' }],
        },
      ];

      const burnHash = await walletClient.writeContract({
        address: activeNetwork.tokenMessenger,
        abi: tokenMessengerAbi,
        functionName: 'depositForBurn',
        args: [depositAmount, destinationDomain, recipientBytes32, activeNetwork.usdcAddress],
      });

      setLoadingText('Confirming burn transaction on-chain...');
      await publicClient?.waitForTransactionReceipt({ hash: burnHash });

      // C. Submit to our API Route for cross-chain tracking
      setStep('TRACKING');
      setTrackingTxHash(burnHash);
      setLoadingText('Registering cross-chain task...');

      const premiumRate = 0.02; // Simulated premium
      const premiumAmount = Number(vehicle.deposit_required) * premiumRate;

      await fetch('/api/cctp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: burnHash,
          sourceChain: activeNetwork.name,
          renterAddress: userAddress,
          vehicleId: vehicle.id,
          startOdometer: 100000,
          depositAmount: Number(vehicle.deposit_required),
          premiumAmount: premiumAmount,
        }),
      });

    } catch (err: any) {
      console.error('Cross-chain rental failed:', err);
      setStep('ESTIMATE');
      let humanMessage = err.message || err.toString();
      if (humanMessage.toLowerCase().includes('user rejected')) {
        humanMessage = 'The transaction signature was cancelled by the user.';
      }
      showModal({
        type: 'error',
        title: 'CROSS-CHAIN LEASE FAILED',
        message: humanMessage,
        primaryAction: { label: 'DISMISS', onClick: () => {} }
      });
    }
  };

  const getStatusStepClass = (stepName: string) => {
    if (!trackingStatus) return 'text-[#718096]';
    const current = trackingStatus.status;
    const stages = ['BURNING', 'ATTESTING', 'MINTING', 'ACTIVATING', 'SUCCESS'];
    const currentIdx = stages.indexOf(current);
    const stepIdx = stages.indexOf(stepName);

    if (currentIdx === stepIdx) return 'text-[#1C2B3C] font-black animate-pulse';
    if (currentIdx > stepIdx) return 'text-emerald-600 font-bold';
    return 'text-[#DDDCD4]';
  };

  return (
    <div className="rounded-sm border border-[#DDDCD4] bg-white p-6 shadow-sm max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#DDDCD4]">
        <button onClick={onClose} className="p-2 hover:bg-[#F2F1EC] rounded-sm transition-all">
          <ArrowLeft className="h-4 w-4 text-[#1C2B3C]" />
        </button>
        <div>
          <h3 className="text-xs font-black tracking-widest text-[#1C2B3C] uppercase">CROSS-CHAIN LEASE CONSOLE</h3>
          <p className="text-[10px] font-bold text-[#718096] uppercase font-mono mt-0.5">Circle CCTP V2 Auto-Relayer</p>
        </div>
      </div>

      {step === 'ESTIMATE' && (
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-[#718096] uppercase tracking-wider mb-2 font-mono">
              Select Source Blockchain
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.values(CCTP_NETWORKS).map((net) => (
                <button
                  key={net.chainId}
                  onClick={() => setSelectedChainId(net.chainId)}
                  className={`py-3.5 px-2.5 rounded-sm border text-[10px] font-bold tracking-wider uppercase transition-all flex flex-col items-center justify-center gap-1.5 ${
                    selectedChainId === net.chainId
                      ? 'border-[#1C2B3C] bg-[#1C2B3C] text-white shadow-sm'
                      : 'border-[#DDDCD4] bg-[#F2F1EC] hover:bg-[#EAE8E1] text-[#1C2B3C]'
                  }`}
                >
                  <Compass className="h-4 w-4" />
                  {net.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-sm bg-[#F2F1EC] p-4 border border-[#DDDCD4]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#718096] mb-3 pb-1 border-b border-[#DDDCD4] font-mono">
              Upfront Fee Estimation (USDC)
            </div>
            {fees ? (
              <div className="space-y-2 text-[10px] font-bold uppercase font-mono">
                <div className="flex justify-between text-[#718096]">
                  <span>Source Gas Fee ({activeNetwork.name}):</span>
                  <span className="text-[#1C2B3C]">{fees.sourceGasFee.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between text-[#718096]">
                  <span>Circle CCTP Bridge Fee:</span>
                  <span className="text-emerald-600">FREE (TESTNET)</span>
                </div>
                <div className="flex justify-between text-[#718096]">
                  <span>Arc Target Gas Fee (Relayer):</span>
                  <span className="text-[#1C2B3C]">{fees.targetGasFee.toFixed(3)} USDC</span>
                </div>
                <div className="flex justify-between text-[#718096] pt-1.5 border-t border-[#DDDCD4]/60">
                  <span>Required Deposit:</span>
                  <span className="text-[#1C2B3C]">{fees.depositAmount.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between text-[#1C2B3C] pt-2 border-t border-[#DDDCD4] text-xs font-black">
                  <span>TOTAL ESTIMATED COST:</span>
                  <span>{fees.totalFee.toFixed(3)} USDC</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-[#718096]" />
              </div>
            )}
          </div>

          <button
            onClick={handleCrossChainRent}
            className="w-full py-4 rounded-sm bg-[#1C2B3C] hover:bg-[#111A24] text-[#F2F1EC] font-black text-xs tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-1.5 border border-[#1C2B3C]"
          >
            <Zap className="h-4 w-4 text-emerald-400 fill-current" />
            INITIATE ONE-CLICK RENTAL
          </button>
        </div>
      )}

      {/* Processing States */}
      {(step === 'APPROVING' || step === 'BURNING') && (
        <div className="text-center py-10 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#1C2B3C] mx-auto" />
          <h4 className="text-xs font-black tracking-wider uppercase text-[#1C2B3C]">
            {step === 'APPROVING' ? 'USDC SPEND AUTHORIZATION' : 'CCTP USDC BURN'}
          </h4>
          <p className="text-[10px] text-[#718096] uppercase font-bold max-w-sm mx-auto leading-relaxed">
            {loadingText}
          </p>
        </div>
      )}

      {step === 'TRACKING' && (
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-[#1C2B3C] mx-auto" />
            <h4 className="text-xs font-black tracking-wider uppercase text-[#1C2B3C]">
              CCTP ATTESTATION IN PROGRESS
            </h4>
            <p className="text-[9px] text-[#718096] font-mono tracking-wider break-all bg-[#F2F1EC] p-2 rounded-sm border border-[#DDDCD4]">
              Source Hash: {trackingTxHash}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2.5">
            <div className="h-2 w-full bg-[#F2F1EC] rounded-sm overflow-hidden border border-[#DDDCD4]">
              <div
                className="h-full bg-[#1C2B3C] transition-all duration-500 rounded-sm"
                style={{ width: `${trackingStatus?.progress || 15}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-black tracking-wider font-mono uppercase">
              <span className={getStatusStepClass('BURNING')}>1. BURN</span>
              <span className={getStatusStepClass('ATTESTING')}>2. ATTEST</span>
              <span className={getStatusStepClass('MINTING')}>3. MINT</span>
              <span className={getStatusStepClass('ACTIVATING')}>4. ESCROW</span>
            </div>
          </div>

          <div className="rounded-sm bg-[#EAE8E1]/60 p-4 border border-[#DDDCD4] text-[10px] uppercase font-bold text-center text-[#1C2B3C]">
            {trackingStatus?.message || 'Connecting to relayers...'}
          </div>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="text-center py-10 space-y-6">
          <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
          <div>
            <h4 className="text-sm font-black tracking-wider uppercase text-emerald-600">
              CROSS-CHAIN LEASE ACTIVE!
            </h4>
            <p className="text-[10px] text-[#718096] uppercase font-bold mt-2">
              Your rental contract has been fully funded and activated on Arc Testnet.
            </p>
          </div>

          <div className="rounded-sm bg-[#F2F1EC] p-4 border border-[#DDDCD4] text-left space-y-2 text-[10px] font-mono font-bold uppercase">
            <div className="flex justify-between">
              <span className="text-[#718096]">Lease ID:</span>
              <span className="text-[#1C2B3C]">#{trackingStatus?.rentalId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#718096]">Arc Mint Hash:</span>
              <a
                href={`https://testnet.arcscan.app/tx/${trackingStatus?.targetTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#1C2B3C] underline hover:opacity-80 break-all"
              >
                {trackingStatus?.targetTxHash?.substring(0, 16)}...
              </a>
            </div>
          </div>

          <button
            onClick={() => {
              if (trackingStatus?.rentalId) {
                onSuccess(trackingStatus.rentalId);
              }
              onClose();
            }}
            className="w-full py-3.5 rounded-sm bg-[#1C2B3C] hover:bg-[#111A24] text-white text-xs font-black tracking-widest uppercase transition-all shadow-md"
          >
            ENTER DASHBOARD
          </button>
        </div>
      )}

      {step === 'FAILED' && (
        <div className="text-center py-10 space-y-6">
          <XCircle className="h-16 w-16 text-red-600 mx-auto animate-pulse" />
          <div>
            <h4 className="text-sm font-black tracking-wider uppercase text-red-600">
              CCTP DEPOSIT TIMEOUT
            </h4>
            <p className="text-[10px] text-[#718096] uppercase font-bold mt-2">
              The transaction failed or exceeded the verification timeout limit.
            </p>
          </div>

          <div className="rounded-sm bg-red-50 p-4 border border-red-200 text-left text-[9px] uppercase font-bold text-red-700">
            Error: {errorMsg}
          </div>

          <button
            onClick={() => setStep('ESTIMATE')}
            className="w-full py-3.5 rounded-sm bg-[#1C2B3C] hover:bg-[#111A24] text-white text-xs font-black tracking-widest uppercase transition-all"
          >
            RETRY TRANSACTION
          </button>
        </div>
      )}
    </div>
  );
}
