'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { ModalInstance, ModalType, ModalAction, TransactionStep, ModalPriority } from '@/components/ui/modal/types';
import { modalManager } from '@/components/ui/modal/modal-manager';

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
  priority?: ModalPriority;
}

interface ModalContextType {
  isOpen: boolean;
  options: ModalOptions | null; // Legacy support
  activeModal: ModalInstance | null;
  stack: ModalInstance[];
  showModal: (opts: ModalOptions) => void;
  updateModal: (opts: Partial<ModalOptions>) => void;
  hideModal: () => void;
  pushModal: (opts: Omit<ModalInstance, 'id' | 'createdAt'>) => string;
  replaceModal: (opts: Omit<ModalInstance, 'id' | 'createdAt'>) => string;
  closeAll: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalInstance | null>(null);
  const [stack, setStack] = useState<ModalInstance[]>([]);

  useEffect(() => {
    // Synchronize React state with the class-based central ModalManager
    const unsubscribe = modalManager.subscribe(({ stack: newStack, active }) => {
      setStack(newStack);
      setActiveModal(active);
    });

    return () => unsubscribe();
  }, []);

  const hideModal = useCallback(() => {
    modalManager.close();
  }, []);

  const showModal = useCallback((opts: ModalOptions) => {
    modalManager.open({
      type: opts.type,
      title: opts.title,
      message: opts.message,
      customContent: opts.customContent,
      primaryAction: opts.primaryAction,
      secondaryAction: opts.secondaryAction,
      txHash: opts.txHash,
      txSteps: opts.txSteps,
      autoCloseMs: opts.autoCloseMs,
      preventClose: opts.preventClose,
      priority: opts.priority || 'P2_IMPORTANT',
    });
  }, []);

  const updateModal = useCallback((newOpts: Partial<ModalOptions>) => {
    const active = modalManager.getActive();
    if (!active) return;
    
    modalManager.replaceActive({
      ...active,
      ...newOpts,
    } as ModalInstance);
  }, []);

  const pushModal = useCallback((opts: Omit<ModalInstance, 'id' | 'createdAt'>) => {
    return modalManager.open(opts);
  }, []);

  const replaceModal = useCallback((opts: Omit<ModalInstance, 'id' | 'createdAt'>) => {
    return modalManager.replaceActive(opts);
  }, []);

  const closeAll = useCallback(() => {
    modalManager.closeAll();
  }, []);

  // Map activeModal to options for backward compatibility
  const options: ModalOptions | null = activeModal
    ? {
        type: activeModal.type,
        title: activeModal.title,
        message: activeModal.message,
        customContent: activeModal.customContent,
        primaryAction: activeModal.primaryAction,
        secondaryAction: activeModal.secondaryAction,
        txHash: activeModal.txHash,
        txSteps: activeModal.txSteps,
        autoCloseMs: activeModal.autoCloseMs,
        preventClose: activeModal.preventClose,
      }
    : null;

  const isOpen = activeModal !== null;

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        options,
        activeModal,
        stack,
        showModal,
        updateModal,
        hideModal,
        pushModal,
        replaceModal,
        closeAll,
      }}
    >
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
export type { ModalType, ModalAction, TransactionStep };
