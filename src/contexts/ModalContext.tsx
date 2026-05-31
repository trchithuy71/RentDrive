'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type ModalType =
  | 'confirm'
  | 'loading'
  | 'success'
  | 'error'
  | 'warning'
  | 'transaction'
  | 'custom';

export interface ModalAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'destructive';
}

export interface TransactionStep {
  label: string;
  status: 'idle' | 'pending' | 'success' | 'failed';
}

export interface ModalOptions {
  type: ModalType;
  title: string;
  message?: string;
  customContent?: ReactNode;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  txHash?: string;
  txSteps?: TransactionStep[];
  autoCloseMs?: number;
  preventClose?: boolean;
}

interface ModalContextType {
  isOpen: boolean;
  options: ModalOptions | null;
  showModal: (opts: ModalOptions) => void;
  updateModal: (opts: Partial<ModalOptions>) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ModalOptions | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const hideModal = useCallback(() => {
    setIsOpen(false);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  }, [timeoutId]);

  const showModal = useCallback((opts: ModalOptions) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    setOptions(opts);
    setIsOpen(true);

    if (opts.autoCloseMs) {
      const id = setTimeout(() => {
        setIsOpen(false);
      }, opts.autoCloseMs);
      setTimeoutId(id);
    }
  }, [timeoutId]);

  const updateModal = useCallback((newOpts: Partial<ModalOptions>) => {
    setOptions((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...newOpts };
      
      // Handle auto-close reset on updates
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      
      if (updated.autoCloseMs) {
        const id = setTimeout(() => {
          setIsOpen(false);
        }, updated.autoCloseMs);
        setTimeoutId(id);
      }
      
      return updated;
    });
  }, [timeoutId]);

  return (
    <ModalContext.Provider value={{ isOpen, options, showModal, updateModal, hideModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
