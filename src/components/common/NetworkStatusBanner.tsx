'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-[92vw] sm:max-w-md w-full px-4 pointer-events-none"
      >
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 text-zinc-950 font-bold text-xs sm:text-sm shadow-xl border border-amber-300 backdrop-blur-md animate-bounce">
          <WifiOff className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>You&apos;re offline. Reconnect to continue using Feeder.</span>
        </div>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-[92vw] sm:max-w-sm w-full px-4 pointer-events-none"
      >
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xl border border-emerald-400 backdrop-blur-md transition-all">
          <Wifi className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>You&apos;re back online.</span>
        </div>
      </div>
    );
  }

  return null;
}
