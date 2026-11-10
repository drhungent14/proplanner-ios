import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PlannerProvider } from './context/PlannerContext';
import { LayoutShell, NavTab } from './components/LayoutShell';
import { MobileCompanionApp } from './components/MobileCompanionApp';
import { DailyFocusView } from './views/DailyFocusView';
import { WeeklyPlannerView } from './views/WeeklyPlannerView';
import { MonthlyCalendarView } from './views/MonthlyCalendarView';
import { GoalsTimelineView } from './views/GoalsTimelineView';
import { InboxView } from './views/InboxView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsSyncView } from './views/SettingsSyncView';

function detectIsMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // Trong môi trường chạy Unit Test (Vitest), giữ mặc định giao diện Desktop để kiểm thử toàn bộ 7 phân hệ
  if (
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test'
  ) {
    return false;
  }
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/iPhone|iPod|Android.*Mobile/i.test(ua)) {
    return true;
  }
  return window.innerWidth <= 768;
}

export function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => detectIsMobileDevice());
  const [forceMode, setForceMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');

  useEffect(() => {
    if (
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test'
    ) {
      return;
    }
    const handleResize = () => {
      setIsMobileViewport(detectIsMobileDevice());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showMobileCompanion =
    forceMode === 'mobile' || (forceMode === 'auto' && isMobileViewport);

  if (showMobileCompanion) {
    return (
      <MobileCompanionApp
        isDesktopPreviewFrame={!isMobileViewport && forceMode === 'mobile'}
        onSwitchToDesktop={() => setForceMode('desktop')}
      />
    );
  }

  return (
    <LayoutShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onOpenMobilePreview={() => setForceMode('mobile')}
    >
      {activeTab === 'today' && <DailyFocusView />}
      {activeTab === 'week' && <WeeklyPlannerView />}
      {activeTab === 'month' && <MonthlyCalendarView />}
      {activeTab === 'goals' && <GoalsTimelineView />}
      {activeTab === 'inbox' && <InboxView />}
      {activeTab === 'analytics' && <AnalyticsView />}
      {activeTab === 'settings' && <SettingsSyncView />}
    </LayoutShell>
  );
}

export default function App() {
  return (
    <PlannerProvider>
      <AppContent />
    </PlannerProvider>
  );
}
