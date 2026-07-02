'use client';

import React, { useState } from 'react';
import { useModal, TransactionStep } from '@/contexts/ModalContext';
import { Sparkles, Terminal, Activity, HelpCircle, HardDrive, ShieldCheck, CheckSquare, AlertTriangle, Play } from 'lucide-react';

export default function ModalPlayground() {
  const { showModal, updateModal, hideModal } = useModal();
  const [retryCount, setRetryCount] = useState(0);

  // 1. Confirmation Modal
  const triggerConfirm = () => {
    showModal({
      type: 'confirm',
      title: 'CONFIRM DISCONNECT WALLET',
      message: 'Are you sure you want to terminate your current session? You will need to re-approve the signature standard to access active vehicle escrows.',
      primaryAction: {
        label: 'DISCONNECT',
        variant: 'destructive',
        onClick: () => {
          showModal({
            type: 'success',
            title: 'SESSION TERMINATED',
            message: 'Your active wallet session has been successfully closed.',
          });
        },
      },
      secondaryAction: {
        label: 'CANCEL',
        onClick: () => {},
      },
    });
  };

  // 2. Loading Modal
  const triggerLoading = () => {
    showModal({
      type: 'loading',
      title: 'PROCESSING SECURITY DEPOSIT',
      message: 'Encrypting telemetry parameters and locking collateral USDC standard within Arc escrow. Please authorize transaction signature.',
      preventClose: true,
    });

    // Auto close after 3 seconds for demonstration
    setTimeout(() => {
      hideModal();
    }, 3000);
  };

  // 3. Success Notification
  const triggerSuccess = () => {
    showModal({
      type: 'success',
      title: 'ESCROW DEPOSIT COLLATERAL LOCKED',
      message: 'Signature verified and 200.00 USDC securely locked inside RentDrive.sol contract escrow standard. Your P2P lease is officially active!',
      primaryAction: {
        label: 'VIEW DASHBOARD',
        onClick: () => {},
      },
      autoCloseMs: 6000,
    });
  };

  // 4. Warning Modal
  const triggerWarning = () => {
    showModal({
      type: 'warning',
      title: 'UNAUTHORIZED HIGH-SPEED ZONE DETECTED',
      message: 'Your current coordinate vector intersects with an unmonitored highway segment. Odometer billing will proceed at base rate. Speed violations continue to incur immediate penalties.',
      primaryAction: {
        label: 'I UNDERSTAND',
        onClick: () => {},
      },
    });
  };

  // 5. Error & Retry Flow Modal
  const triggerErrorRetry = () => {
    const startLoadingFlow = () => {
      showModal({
        type: 'loading',
        title: 'ESTABLISHING ORACLE HANDSHAKE',
        message: 'Synchronizing with onboard OBD-II telematics device...',
        preventClose: true,
      });

      // Simulate failure after 2 seconds
      setTimeout(() => {
        showModal({
          type: 'error',
          title: 'TELEMATICS ORACLE CONNECTION TIMEOUT',
          message: 'The virtual vehicle gateway failed to respond within the standard 8000ms window. This might be due to low signal coverage in Hanoi coordinates.',
          primaryAction: {
            label: 'RETRY CONNECTION',
            onClick: () => {
              setRetryCount(prev => prev + 1);
              startLoadingFlow(); // Recursively call loading to restart retry
            },
          },
          secondaryAction: {
            label: 'CANCEL',
            onClick: () => {},
          },
        });
      }, 2000);
    };

    startLoadingFlow();
  };

  // 6. Dynamic Transaction Step Visualizer (Dynamic on-chain simulate)
  const triggerTransactionFlow = () => {
    // Initial State: Steps listed, first is pending
    const steps: TransactionStep[] = [
      { label: 'APPROVE USDC ALLOWANCE', status: 'pending' },
      { label: 'LOCK ESCROW COLLATERAL', status: 'idle' },
      { label: 'REGISTER ODOMETER STANDARD', status: 'idle' },
    ];

    showModal({
      type: 'transaction',
      title: 'PROVISIONING LEASE TRANSACTION',
      message: 'Executing multi-stage stablecoin lease logic standard on Arc network. Please confirm each popup in your connected wallet.',
      txSteps: steps,
      preventClose: true,
    });

    // Step 1 Success, Step 2 Pending
    setTimeout(() => {
      steps[0].status = 'success';
      steps[1].status = 'pending';
      updateModal({
        txSteps: [...steps],
      });
    }, 2500);

    // Step 2 Success, Step 3 Pending
    setTimeout(() => {
      steps[1].status = 'success';
      steps[2].status = 'pending';
      updateModal({
        txSteps: [...steps],
        txHash: '0x3a48e7152002cb19aa018e8103c80da92cd1188373bcf3cb7e28ea969a531cfb', // Mock tx hash
      });
    }, 5000);

    // Step 3 Success, complete
    setTimeout(() => {
      steps[2].status = 'success';
      updateModal({
        title: 'LEASE ACTIVATION COMPLETED',
        message: 'On-chain deployment finalized successfully. Telemetry feed streams are now active.',
        txSteps: [...steps],
        preventClose: false,
        primaryAction: {
          label: 'LAUNCH SIMULATOR',
          onClick: () => {},
        },
      });
    }, 7500);
  };

  // 7. Global Error Mapping simulation
  const triggerGlobalError = (errorType: 'wallet' | 'balance' | 'network') => {
    if (errorType === 'wallet') {
      showModal({
        type: 'error',
        title: 'USER REJECTED TRANSACTION SIGNATURE',
        message: 'The on-chain request standard was cancelled. Under Arc escrow conditions, lease agreements cannot deploy without a valid signature standard.',
        primaryAction: {
          label: 'RE-TRY DEPLOYMENT',
          onClick: triggerTransactionFlow,
        },
      });
    } else if (errorType === 'balance') {
      showModal({
        type: 'error',
        title: 'INSUFFICIENT USDC GAS BALANCE',
        message: 'Your current account balance holds less than the required 200.00 USDC collateral deposit standard. Please fund your wallet using the Arc testnet faucet.',
        primaryAction: {
          label: 'LAUNCH FAUCET',
          onClick: () => {
            window.open('https://faucet.circle.com', '_blank');
          },
        },
        secondaryAction: {
          label: 'CANCEL',
          onClick: () => {},
        },
      });
    } else {
      showModal({
        type: 'error',
        title: 'NETWORK DISCONNECTED STANDARD',
        message: 'Arc RPC endpoint (https://rpc.testnet.arc.network) failed to respond. Please verify your internet adapter standard or VPN status.',
        primaryAction: {
          label: 'REFRESH GATEWAY',
          onClick: () => {
            window.location.reload();
          },
        },
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 animate-fade-in">
      {/* Portage style sandbox banner */}
      <div className="relative mb-14 rounded-sm overflow-hidden bg-[#EAE8E1] border border-[#DDDCD4] p-10 shadow-sm">
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#1C2B3C] px-3 py-1.5 text-[9px] font-bold tracking-widest text-[#F2F1EC] uppercase">
          <Terminal className="h-3.5 w-3.5" /> DESIGN SYSTEM VALIDATION
        </span>
        <h1 className="mt-6 text-3xl md:text-4xl font-black tracking-tight text-[#1C2B3C] leading-none uppercase">
          UNIFIED MODAL PLAYGROUND
        </h1>
        <p className="mt-4 text-[#5A6573] text-xs font-semibold leading-relaxed max-w-2xl">
          Test, audit, and preview the state transitions of the Portage modal layout specification. This tool ensures visual consistency, micro-animations, and UX guidelines are perfectly mapped across all user transaction states.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core variants */}
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-3 border-b border-[#F2F1EC] flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> CORE USER INTERACTIONS
          </h3>
          
          <div className="space-y-4">
            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Action Confirmation</span>
              <button
                onClick={triggerConfirm}
                className="w-full py-3 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all"
              >
                PROMPT CONFIRMATION
              </button>
            </div>

            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Loading / Processing standard</span>
              <button
                onClick={triggerLoading}
                className="w-full py-3 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all"
              >
                TRIGGER LOADER (3s)
              </button>
            </div>

            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Success Feedback banner</span>
              <button
                onClick={triggerSuccess}
                className="w-full py-3 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all"
              >
                TRIGGER SUCCESS ALERT
              </button>
            </div>

            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">System Warning warning</span>
              <button
                onClick={triggerWarning}
                className="w-full py-3 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all"
              >
                TRIGGER WARNING
              </button>
            </div>
          </div>
        </div>

        {/* Web3 & Async blocks */}
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-3 border-b border-[#F2F1EC] flex items-center gap-2">
            <Activity className="h-4 w-4" /> ASYNC & WEB3 FLOWS
          </h3>

          <div className="space-y-4">
            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Multi-Step transaction</span>
              <button
                onClick={triggerTransactionFlow}
                className="w-full py-3 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all flex items-center justify-center gap-2"
              >
                <Play className="h-3 w-3 fill-current" /> RUN TRANSACTION SIMULATOR
              </button>
              <span className="block text-[8px] text-[#718096] font-mono mt-1 uppercase text-center">Interactive step transition logic standard</span>
            </div>

            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Async Error & Retry flow</span>
              <button
                onClick={triggerErrorRetry}
                className="w-full py-3 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] text-[10px] font-bold tracking-widest uppercase hover:bg-[#111A24] transition-all"
              >
                TRIGGER TIMEOUT WITH RETRY
              </button>
              {retryCount > 0 && (
                <span className="block text-[9px] text-red-700 font-bold uppercase text-center mt-1">Retry attempt standard counter: {retryCount}</span>
              )}
            </div>
          </div>
        </div>

        {/* Global Errors */}
        <div className="rounded-sm border border-[#E0DDD5] bg-white p-8 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-3 border-b border-[#F2F1EC] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> EXCEPTION & ERROR HANDLERS
          </h3>

          <div className="space-y-4">
            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Signature rejected error</span>
              <button
                onClick={() => triggerGlobalError('wallet')}
                className="w-full py-3 rounded-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold tracking-widest uppercase transition-all"
              >
                WALLET USER REJECTION
              </button>
            </div>

            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Insufficient funds check</span>
              <button
                onClick={() => triggerGlobalError('balance')}
                className="w-full py-3 rounded-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold tracking-widest uppercase transition-all"
              >
                INSUFFICIENT FUNDS
              </button>
            </div>

            <div>
              <span className="block text-[8px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">RPC Gateway Disconnect standard</span>
              <button
                onClick={() => triggerGlobalError('network')}
                className="w-full py-3 rounded-sm bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold tracking-widest uppercase transition-all"
              >
                RPC NETWORK DISCONNECTED
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Best practices guide section */}
      <div className="mt-14 rounded-sm border border-[#E0DDD5] bg-white p-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#1C2B3C] pb-3 border-b border-[#F2F1EC] mb-6 flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5" /> ARCHITECTURAL BEST PRACTICES & MAINTENANCE
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-[#5A6573] font-medium">
          <div>
            <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider mb-2">1. Dynamic State Transitions</h4>
            <p className="mb-4">
              Use 'updateModal(newOptions)' to seamlessly morph loading modals into success or error states without closing and reopening wrappers. This dramatically minimizes screen-flash friction for users during blockchain transaction validations.
            </p>

            <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider mb-2">2. Accessibility Standards</h4>
            <p>
              The unified Portage modal traps focus inside the viewport when open and returns active focus back to the preceding HTML element on exit. Ensure 'preventClose' is only activated when vital async blockchain writes are pending execution.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider mb-2">3. Responsive Layout Adjustments</h4>
            <p className="mb-4">
              All modal panels dynamically resize for mobile touchscreens ('max-w-lg' standard scales down elegantly on viewpoints less than 768px). Keyboard layouts support instant 'ESC' key terminations for non-blocking alerts.
            </p>

            <h4 className="font-bold text-[#1C2B3C] uppercase tracking-wider mb-2">4. Error Mapping Resolution</h4>
            <p>
              Always sanitize machine-level blockchain stack errors (such as 'user rejected transaction' or 'code: -32603') into human-readable guidelines. Leverage localized mapping logic prior to invoking 'showModal()'.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
