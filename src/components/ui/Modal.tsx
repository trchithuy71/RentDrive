'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useModal, ModalOptions } from '@/contexts/ModalContext';
import { X, CheckCircle, AlertTriangle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

export default function Modal() {
  const { isOpen, options, hideModal } = useModal();
  const [isRendered, setIsRendered] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Smooth animation enter/exit states
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus within modal
      setTimeout(() => {
        if (modalRef.current) {
          const focusable = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            (focusable[0] as HTMLElement).focus();
          }
        }
      }, 50);
    } else {
      const id = setTimeout(() => setIsRendered(false), 200); // Wait for fade-out transition
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Accessibility: Keyboard handlers (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !options?.preventClose) {
        hideModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, options, hideModal]);

  if (!isRendered || !options) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node) && !options.preventClose) {
      hideModal();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2B3C]/40 backdrop-blur-sm transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        ref={modalRef}
        className={`w-full max-w-lg rounded-sm border border-[#DDDCD4] bg-[#F2F1EC] p-8 shadow-2xl transition-transform duration-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header Close button */}
        {!options.preventClose && (
          <button
            onClick={hideModal}
            className="absolute top-4 right-4 p-1.5 text-[#718096] hover:text-[#1C2B3C] rounded-sm hover:bg-[#EAE8E1] transition-all"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Modal Content Variant Router */}
        <ModalContent options={options} hideModal={hideModal} />
      </div>
    </div>
  );
}

function ModalContent({ options, hideModal }: { options: ModalOptions; hideModal: () => void }) {
  const { type, title, message, customContent, primaryAction, secondaryAction, txHash, txSteps } = options;

  switch (type) {
    case 'loading':
      return (
        <div className="flex flex-col items-center text-center py-4">
          <div className="relative h-14 w-14 mb-6">
            {/* Elegant luxury Portage custom orbit animation loader */}
            <div className="absolute inset-0 rounded-full border-[3px] border-[#E0DDD5]" />
            <div className="absolute inset-0 rounded-full border-[3px] border-[#1C2B3C] border-t-transparent animate-spin" />
          </div>
          <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-3">{title}</h3>
          {message && <p className="text-[#5A6573] text-xs font-semibold leading-relaxed max-w-sm">{message}</p>}
        </div>
      );

    case 'success':
      return (
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-14 w-14 rounded-full bg-[#1C2B3C] text-white flex items-center justify-center mb-6 shadow-md shadow-[#1C2B3C]/10">
            <CheckCircle className="h-7 w-7 stroke-[2]" />
          </div>
          <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-3">{title}</h3>
          {message && <p className="text-[#5A6573] text-xs font-semibold leading-relaxed max-w-sm mb-6">{message}</p>}
          
          <div className="w-full mt-2">
            {primaryAction ? (
              <button
                onClick={() => {
                  primaryAction.onClick();
                  hideModal();
                }}
                className="w-full py-3.5 rounded-sm bg-[#1C2B3C] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] border border-[#1C2B3C] shadow-sm transition-all"
              >
                {primaryAction.label}
              </button>
            ) : (
              <button
                onClick={hideModal}
                className="w-full py-3.5 rounded-sm bg-[#1C2B3C] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] border border-[#1C2B3C] shadow-sm transition-all"
              >
                DISMISS
              </button>
            )}
          </div>
        </div>
      );

    case 'error':
      return (
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-14 w-14 rounded-full bg-red-100 border border-red-200 text-red-700 flex items-center justify-center mb-6">
            <AlertCircle className="h-7 w-7 stroke-[2]" />
          </div>
          <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-3">{title}</h3>
          {message && <p className="text-red-700/90 bg-red-50 border border-red-200 rounded-sm p-4 text-xs font-semibold leading-relaxed max-w-sm mb-6 text-left">{message}</p>}

          <div className="w-full flex gap-4">
            {secondaryAction && (
              <button
                onClick={() => {
                  secondaryAction.onClick();
                  hideModal();
                }}
                className="flex-1 py-3.5 rounded-sm bg-[#EAE8E1] hover:bg-[#DDDCD4] text-[#1C2B3C] font-bold text-xs tracking-widest uppercase border border-[#DDDCD4] transition-all"
              >
                {secondaryAction.label}
              </button>
            )}
            <button
              onClick={() => {
                if (primaryAction) primaryAction.onClick();
                hideModal();
              }}
              className="flex-1 py-3.5 rounded-sm bg-[#1C2B3C] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] border border-[#1C2B3C] shadow-sm transition-all"
            >
              {primaryAction?.label || 'DISMISS'}
            </button>
          </div>
        </div>
      );

    case 'warning':
      return (
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-14 w-14 rounded-full bg-orange-100 border border-orange-200 text-orange-700 flex items-center justify-center mb-6">
            <AlertTriangle className="h-7 w-7 stroke-[2]" />
          </div>
          <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-3">{title}</h3>
          {message && <p className="text-[#5A6573] text-xs font-semibold leading-relaxed max-w-sm mb-6">{message}</p>}

          <div className="w-full flex gap-4">
            {secondaryAction && (
              <button
                onClick={() => {
                  secondaryAction.onClick();
                  hideModal();
                }}
                className="flex-1 py-3.5 rounded-sm bg-[#EAE8E1] hover:bg-[#DDDCD4] text-[#1C2B3C] font-bold text-xs tracking-widest uppercase border border-[#DDDCD4] transition-all"
              >
                {secondaryAction.label}
              </button>
            )}
            <button
              onClick={() => {
                if (primaryAction) primaryAction.onClick();
                hideModal();
              }}
              className="flex-1 py-3.5 rounded-sm bg-[#1C2B3C] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] border border-[#1C2B3C] shadow-sm transition-all"
            >
              {primaryAction?.label || 'DISMISS'}
            </button>
          </div>
        </div>
      );

    case 'transaction':
      return (
        <div className="flex flex-col py-2">
          <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-4 pb-2 border-b border-[#E0DDD5]">
            {title}
          </h3>
          {message && <p className="text-[#5A6573] text-xs font-semibold leading-relaxed mb-6">{message}</p>}

          {/* Sequential Step Progress Tracker */}
          {txSteps && txSteps.length > 0 && (
            <div className="space-y-4 mb-6 rounded-sm bg-white p-5 border border-[#E0DDD5]">
              {txSteps.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] border ${
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
          )}

          {/* Transaction Link */}
          {txHash && (
            <div className="mb-6 rounded-sm bg-[#F2F1EC] p-4 border border-[#DDDCD4] text-[10px] uppercase font-bold flex items-center justify-between">
              <div>
                <span className="text-[#718096] block mb-0.5">TRANSACTION IDENTIFIER</span>
                <span className="text-[#1C2B3C] font-mono text-[10px] break-all tracking-normal font-bold">
                  {txHash.substring(0, 24)}...{txHash.substring(txHash.length - 12)}
                </span>
              </div>
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[#1C2B3C] hover:underline shrink-0"
              >
                ARCSCAN <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="w-full">
            {primaryAction ? (
              <button
                onClick={() => {
                  primaryAction.onClick();
                  hideModal();
                }}
                className="w-full py-3.5 rounded-sm bg-[#1C2B3C] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] border border-[#1C2B3C] shadow-sm transition-all"
              >
                {primaryAction.label}
              </button>
            ) : (
              <button
                onClick={hideModal}
                className="w-full py-3.5 rounded-sm bg-[#1C2B3C] text-white text-xs font-bold tracking-widest uppercase hover:bg-[#111A24] border border-[#1C2B3C] shadow-sm transition-all"
              >
                DISMISS
              </button>
            )}
          </div>
        </div>
      );

    case 'confirm':
      return (
        <div className="flex flex-col py-2">
          <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-4 pb-2 border-b border-[#E0DDD5]">
            {title}
          </h3>
          {message && <p className="text-[#5A6573] text-xs font-semibold leading-relaxed mb-8">{message}</p>}

          <div className="flex gap-4">
            {secondaryAction && (
              <button
                onClick={() => {
                  secondaryAction.onClick();
                  hideModal();
                }}
                className="flex-1 py-3.5 rounded-sm bg-[#EAE8E1] hover:bg-[#DDDCD4] text-[#1C2B3C] font-bold text-xs tracking-widest uppercase border border-[#DDDCD4] transition-all"
              >
                {secondaryAction.label}
              </button>
            )}
            <button
              onClick={() => {
                if (primaryAction) primaryAction.onClick();
                hideModal();
              }}
              className={`flex-1 py-3.5 rounded-sm font-bold text-xs tracking-widest uppercase border transition-all ${
                primaryAction?.variant === 'destructive'
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-[#1C2B3C] text-white border-[#1C2B3C] hover:bg-[#111A24]'
              }`}
            >
              {primaryAction?.label || 'CONFIRM'}
            </button>
          </div>
        </div>
      );

    case 'custom':
      return (
        <div className="flex flex-col py-2">
          <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-4 pb-2 border-b border-[#E0DDD5]">
            {title}
          </h3>
          {customContent}
        </div>
      );

    default:
      return null;
  }
}
