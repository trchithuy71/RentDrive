'use client';

import { ReactNode } from 'react';

export type ModalPriority = 'P0_CRITICAL' | 'P1_BLOCKING' | 'P2_IMPORTANT' | 'P3_INFORMATIONAL';

export type ModalType =
  | 'confirm'
  | 'loading'
  | 'success'
  | 'error'
  | 'warning'
  | 'transaction'
  | 'system'
  | 'custom';

export type ModalActionVariant = 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';

export interface ModalAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: ModalActionVariant;
  disabled?: boolean;
}

export type TransactionStepStatus = 'idle' | 'pending' | 'success' | 'failed';

export interface TransactionStep {
  label: string;
  status: TransactionStepStatus;
  estimatedTimeSeconds?: number;
}

export interface ModalInstance {
  id: string;
  type: ModalType;
  priority: ModalPriority;
  title: string;
  message?: string;
  customContent?: ReactNode;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  txHash?: string;
  txSteps?: TransactionStep[];
  autoCloseMs?: number;
  preventClose?: boolean;
  variant?: 'neutral' | 'warning' | 'destructive';
  rawError?: any;
  onDismiss?: () => void;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface ModalState {
  stack: ModalInstance[];
  queue: ModalInstance[];
}
