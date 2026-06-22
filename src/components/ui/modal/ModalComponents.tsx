'use client';

import React, { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { ModalAction, ModalPriority, TransactionStep } from './types';

// Header component
export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  priority?: ModalPriority;
}

export function ModalHeader({ title, subtitle, priority }: ModalHeaderProps) {
  return (
    <div className="border-b border-[#E0DDD5] pb-4 mb-4 relative">
      <div className="flex items-center justify-between gap-4">
        <h3 id="modal-title" className="text-sm md:text-base font-black text-[#1C2B3C] uppercase tracking-widest leading-none">
          {title}
        </h3>
        {priority && priority !== 'P3_INFORMATIONAL' && (
          <span className={`rounded-sm px-2 py-0.5 text-[8px] font-bold tracking-widest uppercase border ${
            priority === 'P0_CRITICAL'
              ? 'bg-red-50 text-red-700 border-red-200'
              : priority === 'P1_BLOCKING'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-[#1C2B3C] text-white border-[#1C2B3C]'
          }`}>
            {priority.split('_')[0]}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] text-[#718096] font-mono uppercase tracking-widest mt-1.5 leading-none">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Body component
export function ModalBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`text-xs text-[#5A6573] font-semibold leading-relaxed mb-6 ${className}`}>{children}</div>;
}

// Footer component
export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-[#E0DDD5]">{children}</div>;
}

// Actions component
export interface ModalActionsProps {
  primary?: ModalAction;
  secondary?: ModalAction;
  hideModal: () => void;
  isLoading?: boolean;
}

export function ModalActions({ primary, secondary, hideModal, isLoading = false }: ModalActionsProps) {
  return (
    <div className="w-full flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-[#E0DDD5]">
      {secondary && (
        <button
          onClick={() => {
            if (secondary.onClick) secondary.onClick();
            hideModal();
          }}
          disabled={secondary.disabled || isLoading}
          className="flex-1 py-3.5 rounded-sm bg-[#EAE8E1] hover:bg-[#DDDCD4] text-[#1C2B3C] font-bold text-xs tracking-widest uppercase border border-[#DDDCD4] transition-all disabled:opacity-40"
        >
          {secondary.label}
        </button>
      )}
      {primary && (
        <button
          onClick={async () => {
            if (primary.onClick) {
              await primary.onClick();
            }
            hideModal();
          }}
          disabled={primary.disabled || isLoading}
          className={`flex-1 py-3.5 rounded-sm font-bold text-xs tracking-widest uppercase border transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${
            primary.variant === 'destructive'
              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
              : 'bg-[#1C2B3C] text-white border-[#1C2B3C] hover:bg-[#111A24]'
          }`}
        >
          {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
          {primary.label}
        </button>
      )}
    </div>
  );
}

// Icon component
export interface ModalIconProps {
  type: 'success' | 'warning' | 'error' | 'info';
}

export function ModalIcon({ type }: ModalIconProps) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-600',
    error: 'bg-red-50 border-red-200 text-red-600',
    info: 'bg-[#F2F1EC] border-[#DDDCD4] text-[#1C2B3C]',
  };

  const icons = {
    success: <CheckCircle2 className="h-6 w-6 stroke-[2]" />,
    warning: <AlertTriangle className="h-6 w-6 stroke-[2]" />,
    error: <AlertCircle className="h-6 w-6 stroke-[2]" />,
    info: <Info className="h-6 w-6 stroke-[2]" />,
  };

  return (
    <div className={`h-12 w-12 rounded-full border flex items-center justify-center mb-5 mx-auto ${styles[type]} shadow-sm`}>
      {icons[type]}
    </div>
  );
}

// Sequential progress tracker component
export interface ModalProgressProps {
  steps: TransactionStep[];
}

export function ModalProgress({ steps }: ModalProgressProps) {
  return (
    <div className="space-y-3.5 rounded-sm bg-white p-4.5 border border-[#E0DDD5] my-4 shadow-sm animate-pulse-subtle">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-3">
            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] border transition-colors ${
              step.status === 'success'
                ? 'bg-[#1C2B3C] border-[#1C2B3C] text-white'
                : step.status === 'pending'
                ? 'bg-white border-[#1C2B3C] text-[#1C2B3C]'
                : step.status === 'failed'
                ? 'bg-red-100 border-red-400 text-red-700'
                : 'bg-white border-[#DDDCD4] text-[#718096]'
            }`}>
              {step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : idx + 1}
            </span>
            <span className={step.status === 'pending' ? 'text-[#1C2B3C]' : 'text-[#718096]'}>
              {step.label}
            </span>
          </div>
          {step.status === 'pending' && (
            <RefreshCw className="h-3.5 w-3.5 text-[#1C2B3C] animate-spin" />
          )}
        </div>
      ))}
    </div>
  );
}
