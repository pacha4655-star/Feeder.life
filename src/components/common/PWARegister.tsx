'use client';

import { useEffect } from 'react';

/**
 * PWARegister handles graceful unregistration of legacy service workers
 * and purges stale application cache instances to enforce Online-Only Mode.
 */
export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Unregister all existing Service Workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Legacy ServiceWorker unregistered successfully.');
            }
          });
        }
      }).catch(() => {});
    }

    // 2. Clear legacy Cache Storage to eliminate stale offline pages
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        for (const cacheName of cacheNames) {
          caches.delete(cacheName);
        }
      }).catch(() => {});
    }

    // 3. Clear legacy offline IndexedDB queue database if present
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('feeder_offline_db');
      } catch {}
    }
  }, []);

  return null;
}
