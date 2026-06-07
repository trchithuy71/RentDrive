'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isAtTopRef = useRef(true);

  const PULL_THRESHOLD = 70; // px
  const MAX_PULL = 120; // px

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        isAtTopRef.current = window.scrollY === 0;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isAtTopRef.current || refreshing) return;
    startYRef.current = e.touches[0].screenY;
    setPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing || !isAtTopRef.current) return;
    
    const currentY = e.touches[0].screenY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Apply resistance
      const resistance = 0.4;
      const distance = Math.min(diff * resistance, MAX_PULL);
      
      // Prevent browser default pull-to-refresh
      if (e.cancelable) {
        e.preventDefault();
      }
      
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling || refreshing) return;
    setPulling(false);

    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD); // lock at spinner height
      
      try {
        await onRefresh();
      } catch (err) {
        console.error('Pull-to-refresh trigger failed:', err);
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full min-h-full transition-transform duration-200 ease-out"
      style={{
        transform: pullDistance > 0 ? `translate3d(0, ${pullDistance}px, 0)` : 'none'
      }}
    >
      {/* Pull down indicator */}
      {pullDistance > 0 && (
        <div
          className="absolute left-0 right-0 -top-12 flex justify-center items-center h-10 transition-opacity duration-150"
          style={{
            opacity: Math.min(pullDistance / PULL_THRESHOLD, 1)
          }}
        >
          <div className="bg-white border border-[#DDDCD4] rounded-full p-2.5 shadow-md flex items-center justify-center">
            <RefreshCw
              className={`h-4.5 w-4.5 text-[#1C2B3C] ${
                refreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: !refreshing ? `rotate(${pullDistance * 3}deg)` : undefined
              }}
            />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
