'use client';

import { ModalInstance, ModalPriority } from './types';

type ModalListener = (state: { stack: ModalInstance[]; active: ModalInstance | null }) => void;

class ModalManager {
  private stack: ModalInstance[] = [];
  private queue: ModalInstance[] = [];
  private listeners = new Set<ModalListener>();

  // Map priority levels to numbers for easy comparison (higher number = higher priority)
  private priorityMap: Record<ModalPriority, number> = {
    P0_CRITICAL: 4,
    P1_BLOCKING: 3,
    P2_IMPORTANT: 2,
    P3_INFORMATIONAL: 1,
  };

  private notify() {
    const active = this.getActive();
    this.listeners.forEach((listener) => listener({ stack: [...this.stack], active }));
  }

  public subscribe(listener: ModalListener) {
    this.listeners.add(listener);
    // Initial emission
    listener({ stack: [...this.stack], active: this.getActive() });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getActive(): ModalInstance | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  public open(opts: Omit<ModalInstance, 'id' | 'createdAt'>): string {
    const id = Math.random().toString(36).substring(2, 9);
    const newInstance: ModalInstance = {
      ...opts,
      id,
      createdAt: Date.now(),
    };

    // 1. Deduplicate check: Prevent duplicate modals with same type + title
    const isDuplicate =
      this.stack.some((m) => m.type === opts.type && m.title === opts.title) ||
      this.queue.some((m) => m.type === opts.type && m.title === opts.title);

    if (isDuplicate) {
      return this.stack.find((m) => m.type === opts.type && m.title === opts.title)?.id || id;
    }

    const active = this.getActive();
    if (!active) {
      // Stack is empty: immediately show modal
      this.stack.push(newInstance);
    } else {
      const activePriority = this.priorityMap[active.priority];
      const newPriority = this.priorityMap[newInstance.priority];

      if (newPriority >= activePriority) {
        // High priority modal: push current active modal down, display new one
        this.stack.push(newInstance);
      } else {
        // Lower priority modal: place in priority queue
        this.queue.push(newInstance);
        this.sortQueue();
      }
    }

    this.notify();
    return id;
  }

  public close(id?: string) {
    const active = this.getActive();
    if (!active) return;

    // If a specific ID is requested, close that modal, else close top active modal
    if (id && active.id !== id) {
      this.stack = this.stack.filter((m) => m.id !== id);
      this.queue = this.queue.filter((m) => m.id !== id);
    } else {
      // Pop the top modal
      const popped = this.stack.pop();
      if (popped && popped.onDismiss) {
        popped.onDismiss();
      }

      // If stack is empty, pull next modal from priority queue
      if (this.stack.length === 0 && this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) {
          this.stack.push(next);
        }
      }
    }

    this.notify();
  }

  public replaceActive(opts: Omit<ModalInstance, 'id' | 'createdAt'>): string {
    const id = Math.random().toString(36).substring(2, 9);
    const newInstance: ModalInstance = {
      ...opts,
      id,
      createdAt: Date.now(),
    };

    // Pop the current active modal without triggering queue refill
    this.stack.pop();
    this.stack.push(newInstance);

    this.notify();
    return id;
  }

  public closeAll() {
    this.stack.forEach((m) => {
      if (m.onDismiss) m.onDismiss();
    });
    this.stack = [];
    this.queue = [];
    this.notify();
  }

  private sortQueue() {
    this.queue.sort((a, b) => {
      const diff = this.priorityMap[b.priority] - this.priorityMap[a.priority];
      if (diff !== 0) return diff;
      return a.createdAt - b.createdAt; // FIFO for equal priorities
    });
  }
}

export const modalManager = new ModalManager();
export default modalManager;
