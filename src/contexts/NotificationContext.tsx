'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface NotificationItem {
  id: string;
  type: 'VehicleListed' | 'RentalStarted' | 'TelemetryUpdated' | 'RentalCompleted' | 'CrashEscrowFrozen' | 'DisputeResolved' | 'EarningsWithdrawn' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  txHash?: string;
}

export interface ToastItem {
  id: string;
  type: NotificationItem['type'];
  title: string;
  message: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  toasts: ToastItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'> & { txHash?: string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeToast: (id: string) => void;
  triggerCrashAlert: () => void;
  // Callback registry to allow components to listen for specific events
  subscribeToEvent: (eventType: string, callback: () => void) => () => void;
  emitEvent: (eventType: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API helper for crash warning siren
const playCrashSiren = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play two-tone alarm
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // High-low-high-low siren sound
    playTone(880, now, 0.4);
    playTone(554, now + 0.45, 0.4);
    playTone(880, now + 0.9, 0.4);
    playTone(554, now + 1.35, 0.4);
  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [listeners, setListeners] = useState<Record<string, Array<() => void>>>({});

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('rentdrive_notifications');
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse notifications from localStorage:', e);
      }
    }
  }, []);

  // Save to localStorage when notifications change
  const saveNotifications = (items: NotificationItem[]) => {
    setNotifications(items);
    localStorage.setItem('rentdrive_notifications', JSON.stringify(items));
  };

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addNotification = useCallback((item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'> & { txHash?: string }) => {
    const id = Math.random().toString(36).substring(2, 11);
    const timestamp = Date.now();
    const newNotification: NotificationItem = {
      ...item,
      id,
      timestamp,
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev];
      localStorage.setItem('rentdrive_notifications', JSON.stringify(updated));
      return updated;
    });

    // Add toast notification
    setToasts((prev) => [...prev, {
      id,
      type: item.type,
      title: item.title,
      message: item.message,
    }]);

    // Handle crash warning sound
    if (item.type === 'CrashEscrowFrozen') {
      playCrashSiren();
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem('rentdrive_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem('rentdrive_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, []);

  const triggerCrashAlert = useCallback(() => {
    playCrashSiren();
  }, []);

  const subscribeToEvent = useCallback((eventType: string, callback: () => void) => {
    setListeners((prev) => ({
      ...prev,
      [eventType]: [...(prev[eventType] || []), callback],
    }));

    return () => {
      setListeners((prev) => {
        const list = prev[eventType] || [];
        return {
          ...prev,
          [eventType]: list.filter((cb) => cb !== callback),
        };
      });
    };
  }, []);

  const emitEvent = useCallback((eventType: string) => {
    const list = listeners[eventType] || [];
    list.forEach((callback) => {
      try {
        callback();
      } catch (err) {
        console.error(`Error in event listener for ${eventType}:`, err);
      }
    });
  }, [listeners]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeToast,
        triggerCrashAlert,
        subscribeToEvent,
        emitEvent,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
