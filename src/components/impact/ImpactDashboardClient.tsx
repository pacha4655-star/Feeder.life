'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  Heart, 
  Award, 
  Share2, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import type { UserImpactSummary, AreaImpactAggregate, ContributionItem } from '@/lib/services/impact';
import ShareableImpactCard from './ShareableImpactCard';
import BadgesMilestonesSection from './BadgesMilestonesSection';
import AreaImpactSection from './AreaImpactSection';
import Link from 'next/link';

interface ImpactDashboardClientProps {
  initialUserData: UserImpactSummary;
  initialAreasData: AreaImpactAggregate[];
  user: any;
}

export default function ImpactDashboardClient({
  initialUserData,
  initialAreasData,
  user,
}: ImpactDashboardClientProps) {
  const [userData] = useState<UserImpactSummary>(initialUserData);
  const [areasData] = useState<AreaImpactAggregate[]>(initialAreasData);
  const [contributionFilter, setContributionFilter] = useState<string>('ALL');

  const streak = userData.streak;
  const isStreakActive = streak.streakStatus === 'ACTIVE';

  // Filter contributions
  const filteredContributions = userData.recentContributions.filter((c: ContributionItem) => {
    if (contributionFilter === 'ALL') return true;
    return c.type === contributionFilter;
  });

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-6 md:p-8 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Verified Welfare Impact</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {userData.userName}&apos;s Welfare Impact
            </h1>
            <p className="text-emerald-100 text-sm max-w-xl leading-relaxed">
              Every feeding log, volunteer shift, and SOS rescue contributes directly to verified animal care. Track your streak, earn transparent milestones, and view community results.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/nearby"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <Heart className="w-4 h-4 text-emerald-600 fill-emerald-600" />
              <span>Log Feeding</span>
            </Link>
            <Link
              href="/sos"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-900/60 hover:bg-emerald-900/80 border border-emerald-400/30 text-white rounded-xl font-bold text-sm shadow-sm transition-all active:scale-95"
            >
              <span>SOS Case Hub</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Streak Showcase Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${
                isStreakActive
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}
            >
              <Flame className={`w-9 h-9 ${isStreakActive ? 'animate-pulse fill-white' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {streak.currentStreak} Day{streak.currentStreak === 1 ? '' : 's'} Feeding Streak
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isStreakActive
                      ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {isStreakActive ? 'ACTIVE 🔥' : streak.streakStatus}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {isStreakActive
                  ? `Keep going! Your last feeding was verified ${streak.lastActivityDate ? `on ${new Date(streak.lastActivityDate).toLocaleDateString()}` : 'recently'}.`
                  : 'Log a feeding today to restart your consecutive feeding streak.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-zinc-100 dark:border-zinc-800">
            <div className="text-center md:text-right">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Best Streak</span>
              <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{streak.longestStreak} Days</p>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-center md:text-right">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">This Month</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{streak.monthlyActivityCount} Days</p>
            </div>
          </div>
        </div>

        {/* 7-Day Consistency Grid */}
        <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Past 7 Days Consistency</span>
            <span className="text-[11px] text-zinc-400">Server verified feeding logs</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {streak.weeklyActivity.map((active: boolean, idx: number) => {
              const label = dayLabels[idx] || `Day ${idx + 1}`;
              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'bg-zinc-50 dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800 text-zinc-400'
                  }`}
                  title={`${label}: ${active ? 'Fed animals' : 'No logs'}`}
                >
                  <span className="text-[11px] uppercase">{label}</span>
                  <div className="my-1">
                    {active ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-900" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 my-1" />
                    )}
                  </div>
                  <span className="text-[10px] opacity-75">{active ? 'Fed' : '-'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 4 Core Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Feeding Logs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">{userData.totalFeedingActivities}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">~{userData.totalAnimalsFed} animals served</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">SOS Rescues</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">{userData.totalSosResponses}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Verified emergency assists</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Adoptions / Lost</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {userData.totalAdoptionsSupported + userData.totalLostFoundReports}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Welfare cases assisted</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Badges Earned</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {userData.badges.filter((b) => b.isEarned).length} / {userData.badges.length}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Verified milestones</p>
        </div>
      </div>

      {/* Shareable Impact Card Preview Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Shareable Impact Certificate</h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Inspire your community with real, verified welfare metrics. Copy your link or share directly to social media.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <ShareableImpactCard impact={userData} />
          </div>
        </div>
      </div>

      {/* Badges and Milestones Section */}
      <BadgesMilestonesSection milestones={userData.milestones} badges={userData.badges} />

      {/* Area-Wise Community Impact Section */}
      <AreaImpactSection areas={areasData} />

      {/* Traceable Contribution Audit History */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Verified Contribution History</h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Immutable server trace of your completed welfare actions and logs.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { label: 'All', value: 'ALL' },
              { label: 'Feeding', value: 'FEEDING' },
              { label: 'SOS Response', value: 'SOS_RESPONSE' },
              { label: 'Adoptions', value: 'ADOPTION_APPLICATION' },
              { label: 'Lost & Found', value: 'LOST_FOUND' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setContributionFilter(f.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  contributionFilter === f.value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredContributions.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No records found for this category</p>
            <p className="text-xs text-zinc-400 mt-1">Start logging feeding updates or assisting rescues to see your verified history.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredContributions.map((item: ContributionItem) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'FEEDING'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                        : item.type === 'SOS_RESPONSE'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600'
                        : item.type === 'ADOPTION_APPLICATION'
                        ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600'
                    }`}
                  >
                    {item.type === 'FEEDING' ? (
                      <Heart className="w-4 h-4 fill-emerald-600" />
                    ) : item.type === 'SOS_RESPONSE' ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <Award className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.title}</span>
                      {item.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <p className="text-[10px] text-zinc-400">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
