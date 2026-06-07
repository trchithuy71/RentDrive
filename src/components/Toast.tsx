'use client';

import React, { useEffect } from 'react';
import { useNotifications, ToastItem } from '@/contexts/NotificationContext';
import { X, Car, Play, Activity, Flag, AlertOctagon, Scale, Coins, Info, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const { id, type, title, message, duration = 6000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Determine styles & icons based on event type
  let icon = <Info className="h-5 w-5 text-blue-500" />;
  let cardClass = 'border-l-4 border-l-blue-500 bg-white';

  switch (type) {
    case 'VehicleListed':
      icon = <Car className="h-5 w-5 text-emerald-600" />;
      cardClass = 'border-l-4 border-l-emerald-600 bg-white';
      break;
    case 'RentalStarted':
      icon = <Play className="h-5 w-5 text-indigo-600 fill-indigo-600" />;
      cardClass = 'border-l-4 border-l-indigo-600 bg-white';
      break;
    case 'TelemetryUpdated':
      icon = <Activity className="h-5 w-5 text-slate-500" />;
      cardClass = 'border-l-4 border-l-slate-400 bg-white';
      break;
    case 'RentalCompleted':
      icon = <Flag className="h-5 w-5 text-emerald-700" />;
      cardClass = 'border-l-4 border-l-emerald-700 bg-white';
      break;
    case 'CrashEscrowFrozen':
      icon = <ShieldAlert className="h-5 w-5 text-red-600 animate-bounce" />;
      cardClass = 'border-l-4 border-l-red-600 bg-red-50/90 border border-red-200 animate-pulse';
      break;
    case 'DisputeResolved':
      icon = <Scale className="h-5 w-5 text-amber-600" />;
      cardClass = 'border-l-4 border-l-amber-600 bg-white';
      break;
    case 'EarningsWithdrawn':
      icon = <Coins className="h-5 w-5 text-amber-500" />;
      cardClass = 'border-l-4 border-l-amber-500 bg-white';
      break;
    case 'warning':
      icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
      cardClass = 'border-l-4 border-l-amber-500 bg-white';
      break;
    case 'error':
      icon = <AlertOctagon className="h-5 w-5 text-red-500" />;
      cardClass = 'border-l-4 border-l-red-500 bg-white';
      break;
  }

  return (
    <div
      className={`
        pointer-events-auto flex w-full items-start gap-3 rounded-sm p-4.5 shadow-lg
        border border-[#DDDCD4] transition-all duration-300 transform translate-y-0
        animate-[slideIn_0.3s_ease-out]
        ${cardClass}
      `}
    >
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1C2B3C]">{title}</h4>
        <p className="mt-1 text-[11px] font-semibold text-[#5A6573] leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-[#718096] hover:text-[#1C2B3C] rounded-sm p-0.5 hover:bg-[#F2F1EC] transition-all"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
