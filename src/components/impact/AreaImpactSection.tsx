'use client';

import React from 'react';
import { MapPin, Users, Heart, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import type { AreaImpactAggregate } from '@/lib/services/impact';

interface AreaImpactSectionProps {
  areas: AreaImpactAggregate[];
  isLoading?: boolean;
}

export default function AreaImpactSection({ areas, isLoading }: AreaImpactSectionProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!areas || areas.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm text-center">
        <MapPin className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">No Area Activity Logged Yet</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          As feeders and volunteers log activities across your city, neighborhood aggregates will appear here with strict location privacy preservation.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Area-Wise Welfare Impact</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Neighborhood aggregations with privacy-safe anonymization. Exact animal locations and private residences are strictly protected.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-semibold self-start sm:self-center">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Privacy Protected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map((area, index) => (
          <div
            key={area.areaName}
            className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 hover:border-emerald-200 dark:hover:border-emerald-900 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                    #{index + 1}
                  </span>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{area.areaName}</h3>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                  {area.totalFeedings} Feedings
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 text-center">
                <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                    <Heart className="w-2.5 h-2.5 text-rose-500" />
                    <span>Fed</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{area.totalAnimalsFed}</span>
                </div>

                <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                    <Users className="w-2.5 h-2.5 text-blue-500" />
                    <span>Feeders</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{area.activeFeeders}</span>
                </div>

                <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                    <span>SOS Done</span>
                  </div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{area.sosResolved}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 text-[11px] text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp className="w-3 h-3" /> Active Zone
              </span>
              <span>Updated live</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
