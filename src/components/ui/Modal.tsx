'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useModal } from '@/contexts/ModalContext';
import { ModalErrorBoundary } from './modal/ModalErrorBoundary';
import {
  ConfirmationModalView,
  LoadingModalView,
  SuccessModalView,
  ErrorModalView,
  WarningModalView,
  TransactionModalView,
  SystemModalView,
} from './modal/ModalVariants';

export default function Modal() {
  const { isOpen, activeModal, stack, hideModal } = useModal();
  const [isRendered, setIsRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Synchronize CSS mount states for transitions
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      const timeout = setTimeout(() => setIsRendered(false), 200); // exit animation buffer
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Focus trap logic inside modal
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const first = focusableElements[0] as HTMLElement;
      const last = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    // Auto-focus first element
    const focusable = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    window.addEventListener('keydown', handleFocusTrap);
    return () => window.removeEventListener('keydown', handleFocusTrap);
  }, [isOpen, activeModal]);

  // Escape to close handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !activeModal?.preventClose) {
        hideModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeModal, hideModal]);

  if (!isRendered || !activeModal) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node) && !activeModal.preventClose) {
      hideModal();
    }
  };

  // Render variant router
  const renderContent = () => {
    switch (activeModal.type) {
      case 'confirm':
        return <ConfirmationModalView instance={activeModal} hideModal={hideModal} />;
      case 'loading':
        return <LoadingModalView instance={activeModal} hideModal={hideModal} />;
      case 'success':
        return <SuccessModalView instance={activeModal} hideModal={hideModal} />;
      case 'error':
        return <ErrorModalView instance={activeModal} hideModal={hideModal} />;
      case 'warning':
        return <WarningModalView instance={activeModal} hideModal={hideModal} />;
      case 'transaction':
        return <TransactionModalView instance={activeModal} hideModal={hideModal} />;
      case 'system':
        return <SystemModalView instance={activeModal} hideModal={hideModal} />;
      case 'custom':
        return (
          <div className="flex flex-col text-left py-2">
            <h3 id="modal-title" className="text-base font-black text-[#1C2B3C] uppercase tracking-widest mb-4 pb-2 border-b border-[#E0DDD5]">
              {activeModal.title}
            </h3>
            {activeModal.customContent}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C2B3C]/40 backdrop-blur-sm transition-premium-modal overflow-y-auto ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ contentVisibility: 'auto' }}
    >
      <div className="relative w-full max-w-lg select-none">
        
        {/* Visual Stack Layers Indicators */}
        {stack.length > 1 && (
          <>
            {/* Third layer (deepest stacked modal hint) */}
            {stack.length > 2 && (
              <div className="absolute inset-x-4 -top-4 -z-20 h-full rounded-sm border border-[#DDDCD4]/60 bg-[#EAE8E1] shadow-md translate-y-1.5 scale-[0.93] opacity-40 transition-transform duration-200" />
            )}
            {/* Second layer (middle stacked modal hint) */}
            <div className="absolute inset-x-2 -top-2 -z-10 h-full rounded-sm border border-[#DDDCD4] bg-[#F2F1EC] shadow-lg translate-y-1 scale-[0.96] opacity-75 transition-transform duration-200" />
          </>
        )}

        {/* Core Active Modal Card Container */}
        <div
          ref={containerRef}
          className={`w-full rounded-sm border border-[#DDDCD4] bg-[#F2F1EC] p-6 md:p-8 shadow-2xl transition-premium-modal max-h-[85vh] md:max-h-[90vh] overflow-y-auto scrollbar-thin relative ${
            isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header Close button */}
          {!activeModal.preventClose && (
            <button
              onClick={hideModal}
              className="absolute top-4 right-4 p-1.5 text-[#718096] hover:text-[#1C2B3C] rounded-sm hover:bg-[#EAE8E1] transition-all focus:ring-2 focus:ring-[#1C2B3C] outline-none"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <ModalErrorBoundary>{renderContent()}</ModalErrorBoundary>
        </div>
      </div>
    </div>
  );
}
