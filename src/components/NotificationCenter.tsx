'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNotifications, NotificationItem } from '@/contexts/NotificationContext';
import { Bell, BellOff, Trash2, CheckCheck, ExternalLink, Car, Play, Activity, Flag, ShieldAlert, Scale, Coins, Info, AlertTriangle, X } from 'lucide-react';
import { Address } from 'viem';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getEventIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'VehicleListed':
        return <Car className="h-4 w-4 text-emerald-600" />;
      case 'RentalStarted':
        return <Play className="h-4 w-4 text-indigo-600 fill-indigo-600" />;
      case 'TelemetryUpdated':
        return <Activity className="h-4 w-4 text-slate-500" />;
      case 'RentalCompleted':
        return <Flag className="h-4 w-4 text-emerald-700" />;
      case 'CrashEscrowFrozen':
        return <ShieldAlert className="h-4 w-4 text-red-600" />;
      case 'DisputeResolved':
        return <Scale className="h-4 w-4 text-amber-600" />;
      case 'EarningsWithdrawn':
        return <Coins className="h-4 w-4 text-amber-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-11 w-11 rounded-sm bg-white hover:bg-[#EAE8E1] border border-[#DDDCD4] transition-all text-[#1C2B3C]"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <>
            <Bell className="h-5 w-5 animate-[swing_1s_ease-in-out_infinite]" />
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white border-2 border-[#F2F1EC] shadow-sm">
              {unreadCount}
            </span>
          </>
        ) : (
          <Bell className="h-5 w-5 text-[#5A6573]" />
        )}
      </button>

      {/* Notification Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-90 md:w-96 rounded-sm bg-white border border-[#DDDCD4] shadow-xl z-[9999] overflow-hidden animate-[fadeIn_0.2s_ease-out]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-[#F2F1EC] border-b border-[#DDDCD4]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1C2B3C]">
                Event Monitor Log
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-800 text-[8px] font-black uppercase px-2 py-0.5 rounded-sm">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllAsRead}
                    className="text-[9px] font-bold text-[#5A6573] hover:text-[#1C2B3C] uppercase tracking-wider flex items-center gap-1 transition-colors"
                    title="Mark all as read"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark Read
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-[9px] font-bold text-red-600 hover:text-red-800 uppercase tracking-wider flex items-center gap-1 transition-colors"
                    title="Clear log"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </>
              )}
              <button onClick={() => setIsOpen(false)} className="text-[#718096] hover:text-[#1C2B3C] p-0.5 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Log List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[#F2F1EC]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <BellOff className="h-10 w-10 text-[#DDDCD4] mb-3" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#718096]">
                  Log is Empty
                </span>
                <p className="text-[10px] text-[#A0AEC0] font-semibold mt-1 max-w-[200px]">
                  On-chain lease activity and telematics events will log here automatically.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`
                    flex gap-3 px-5 py-4 cursor-pointer transition-colors relative
                    ${notification.read ? 'bg-white hover:bg-[#F9F9F6]' : 'bg-slate-50/70 hover:bg-[#F2F1EC]/60'}
                  `}
                >
                  {/* Unread indicator dot */}
                  {!notification.read && (
                    <span className="absolute top-4.5 left-2 h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  )}

                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5 flex h-7.5 w-7.5 items-center justify-center rounded-sm bg-[#F2F1EC] border border-[#DDDCD4]/60">
                    {getEventIcon(notification.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-[#1C2B3C] truncate">
                        {notification.title}
                      </span>
                      <span className="text-[8px] font-semibold text-[#A0AEC0] whitespace-nowrap">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-[10.5px] font-semibold text-[#5A6573] leading-relaxed mt-1">
                      {notification.message}
                    </p>
                    
                    {/* Tx Hash Link */}
                    {notification.txHash && (
                      <a
                        href={`https://explorer.testnet.arc.network/tx/${notification.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[8.5px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest mt-1.5 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        VIEW TRANSACTION <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
