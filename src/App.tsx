import React, { useState } from 'react';
import { PlannerProvider } from './context/PlannerContext';
import { LayoutShell, NavTab } from './components/LayoutShell';
import { DailyFocusView } from './views/DailyFocusView';
import { WeeklyPlannerView } from './views/WeeklyPlannerView';
import { MonthlyCalendarView } from './views/MonthlyCalendarView';
import { GoalsTimelineView } from './views/GoalsTimelineView';
import { InboxView } from './views/InboxView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsSyncView } from './views/SettingsSyncView';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('today');

  return (
    <LayoutShell activeTab={activeTab} onSelectTab={setActiveTab}>
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
