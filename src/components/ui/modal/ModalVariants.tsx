'use client';

import React, { useState } from 'react';
import { ExternalLink, HelpCircle, RefreshCw } from 'lucide-react';
import { ModalInstance } from './types';
import { ModalHeader, ModalBody, ModalActions, ModalIcon, ModalProgress } from './ModalComponents';
import { interpretError } from './error-interpreter';

interface VariantProps {
  instance: ModalInstance;
  hideModal: () => void;
}

// 1. CONFIRMATION MODAL
export function ConfirmationModalView({ instance, hideModal }: VariantProps) {
  const { title, message, primaryAction, secondaryAction, variant } = instance;
  const isDestructive = variant === 'destructive';
  const iconType = isDestructive ? 'error' : variant === 'warning' ? 'warning' : 'info';

  return (
    <div className="flex flex-col text-center">
      <ModalIcon type={iconType} />
      <ModalHeader title={title} priority={instance.priority} />
      <ModalBody>
        <p className="text-[#5A6573] text-xs font-semibold leading-relaxed max-w-sm mx-auto">
          {message}
        </p>
      </ModalBody>
      <ModalActions
        primary={primaryAction}
        secondary={secondaryAction}
        hideModal={hideModal}
      />
    </div>
  );
}

// 2. LOADING / PROCESSING MODAL
export function LoadingModalView({ instance, hideModal }: VariantProps) {
  const { title, message, txSteps } = instance;

  return (
    <div className="flex flex-col text-center py-3">
      <div className="relative h-14 w-14 mb-6 mx-auto">
        <div className="absolute inset-0 rounded-full border-[3px] border-[#E0DDD5]" />
        <div className="absolute inset-0 rounded-full border-[3px] border-[#1C2B3C] border-t-transparent animate-spin" />
      </div>
      <ModalHeader title={title} subtitle="operation in progress" />
      <ModalBody>
        {message && (
          <p className="text-[#5A6573] text-xs font-semibold max-w-sm mx-auto mb-4">
            {message}
          </p>
        )}
        {txSteps && txSteps.length > 0 && <ModalProgress steps={txSteps} />}
      </ModalBody>
    </div>
  );
}

// 3. SUCCESS MODAL
export function SuccessModalView({ instance, hideModal }: VariantProps) {
  const { title, message, primaryAction, secondaryAction } = instance;

  return (
    <div className="flex flex-col text-center">
      <ModalIcon type="success" />
      <ModalHeader title={title} subtitle="operation completed successfully" />
      <ModalBody>
        <p className="text-[#5A6573] text-xs font-semibold max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </ModalBody>
      <ModalActions
        primary={primaryAction}
        secondary={secondaryAction}
        hideModal={hideModal}
      />
    </div>
  );
}

// 4. ERROR MODAL (WITH INTERPRETER ENGINE)
export function ErrorModalView({ instance, hideModal }: VariantProps) {
  const { title: customTitle, message: customMsg, rawError, primaryAction, secondaryAction } = instance;

  // Intercept and convert to user-friendly interpretation
  const interpretation = interpretError(rawError || customMsg);

  return (
    <div className="flex flex-col text-center">
      <ModalIcon type={interpretation.severity === 'destructive' ? 'error' : 'warning'} />
      
      <ModalHeader
        title={customTitle || interpretation.title}
        subtitle={`error identifier: ${interpretation.code}`}
      />

      <ModalBody className="text-left bg-red-50/50 border border-red-200/60 rounded-sm p-4.5 my-2">
        <p className="text-red-950 text-xs font-bold leading-relaxed mb-2.5">
          {customMsg || interpretation.message}
        </p>
        <div className="flex gap-2 text-[10px] text-red-800 font-semibold bg-white border border-red-200/50 p-2.5 rounded-sm">
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <span className="font-extrabold uppercase block text-[8px] tracking-wider text-red-500 mb-0.5">RECOVERY STEP</span>
            {interpretation.suggestion}
          </div>
        </div>
      </ModalBody>

      <ModalActions
        primary={primaryAction || { label: 'Dismiss', onClick: hideModal }}
        secondary={secondaryAction}
        hideModal={hideModal}
      />
    </div>
  );
}

// 5. WARNING MODAL
export function WarningModalView({ instance, hideModal }: VariantProps) {
  const { title, message, primaryAction, secondaryAction } = instance;
  const [acknowledged, setAcknowledged] = useState(false);

  // Auto-disable primary action unless user checks the safety acknowledgement box
  const enabledPrimary = primaryAction
    ? {
        ...primaryAction,
        disabled: !acknowledged,
      }
    : undefined;

  return (
    <div className="flex flex-col text-center">
      <ModalIcon type="warning" />
      <ModalHeader title={title} priority={instance.priority} />
      
      <ModalBody>
        <p className="text-[#5A6573] text-xs font-semibold leading-relaxed max-w-sm mx-auto mb-5">
          {message}
        </p>

        <label className="flex items-start gap-3 text-left p-3.5 bg-[#F2F1EC] border border-[#DDDCD4] rounded-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 h-3.5 w-3.5 rounded-sm border-[#DDDCD4] text-[#1C2B3C] focus:ring-[#1C2B3C]"
          />
          <div className="text-[10px] font-bold text-[#1C2B3C] uppercase tracking-wider">
            I acknowledge the risks involved and wish to proceed.
          </div>
        </label>
      </ModalBody>

      <ModalActions
        primary={enabledPrimary}
        secondary={secondaryAction}
        hideModal={hideModal}
      />
    </div>
  );
}

// 6. WEB3 TRANSACTION MODAL
export function TransactionModalView({ instance, hideModal }: VariantProps) {
  const { title, message, txHash, txSteps, primaryAction, secondaryAction } = instance;
  const activeStep = txSteps?.find((s) => s.status === 'pending');

  return (
    <div className="flex flex-col text-left py-2">
      <ModalHeader title={title} subtitle="web3 blockchain execution" />
      
      <ModalBody>
        {message && (
          <p className="text-[#5A6573] text-xs font-semibold leading-relaxed mb-4">
            {message}
          </p>
        )}

        {txSteps && txSteps.length > 0 && <ModalProgress steps={txSteps} />}

        {txHash && (
          <div className="my-5 rounded-sm bg-[#F2F1EC] p-4 border border-[#DDDCD4] text-[10px] uppercase font-bold flex items-center justify-between shadow-sm font-mono">
            <div>
              <span className="text-[#718096] block mb-0.5 font-sans tracking-widest text-[8px] font-black">Transaction ID</span>
              <span className="text-[#1C2B3C] font-mono break-all tracking-normal text-[10px] font-bold">
                {txHash.substring(0, 16)}...{txHash.substring(txHash.length - 12)}
              </span>
            </div>
            <a
              href={`https://testnet.arcscan.app/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[#1C2B3C] hover:underline shrink-0 font-sans tracking-widest text-[9px] font-bold"
            >
              ARCSCAN <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </ModalBody>

      <ModalActions
        primary={primaryAction}
        secondary={secondaryAction}
        hideModal={hideModal}
        isLoading={!!activeStep}
      />
    </div>
  );
}

// 7. SYSTEM LEVEL MODAL
export function SystemModalView({ instance, hideModal }: VariantProps) {
  const { title, message, primaryAction } = instance;

  return (
    <div className="flex flex-col text-center">
      <ModalIcon type="info" />
      <ModalHeader title={title} priority={instance.priority} subtitle="global announcement" />
      <ModalBody>
        <p className="text-[#5A6573] text-xs font-semibold max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </ModalBody>
      <ModalActions
        primary={primaryAction || { label: 'Acknowledge', onClick: hideModal }}
        hideModal={hideModal}
      />
    </div>
  );
}
