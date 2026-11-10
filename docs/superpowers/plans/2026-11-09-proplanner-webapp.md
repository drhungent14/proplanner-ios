# ProPlanner (Web App & iPhone Sync) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of ProPlanner — a full-featured Vietnamese personal planning Web App (Daily, Weekly, Monthly, Goals with Gantt Timeline, Habits, Notifications, Analytics, and Hybrid Local + Supabase Cloud Sync) ready for desktop browsers and iPhone PWA/Capacitor packaging.

**Architecture:** Single-page React 18 + TypeScript application bundled with Vite and styled with Tailwind CSS. A deterministic domain engine (`plannerEngine.ts`) handles goal progress rollups, habit streaks, reminders, and analytics, while a hybrid storage layer (`storageSync.ts`) persists optimistically to `localStorage` and synchronizes bidirectionally with Supabase PostgreSQL/Realtime.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, `lucide-react`, `@supabase/supabase-js`, `@capacitor/core`, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-planner-app-design.md`

## Global Constraints

- Development OS: Windows (`powershell`).
- UI Language: 100% natural, professional Vietnamese across all views, labels, and notifications.
- Offline-First Hybrid Sync: App must work immediately on first launch with zero server setup (using local persistence + rich initial seed data) and sync with Supabase when `supabaseUrl` and `supabaseAnonKey` are configured.
- Hierarchy Rollup: Tasks and Milestones linked to a Goal must automatically recalculate the Goal's completion percentage (`0` to `100`).
- Top 3 Daily Focus Limit: At most 3 uncompleted tasks scheduled for a given date may have `is_top_focus = true`.
- Responsive Dual Layout: Desktop shows a left sidebar and multi-column workspace; mobile/iPhone viewport shows a bottom navigation bar with `safe-area-inset` padding and `manifest.json` / Apple meta tags.

## Review Focus

1. **Goal with 0 linked tasks or milestones in auto progress mode:** `computeGoalProgress` must return `0` (not `NaN` or division-by-zero crash).
2. **Exceeding Top 3 daily focus tasks on the same date:** `canMarkTopFocus(tasks, date, taskId)` must reject a 4th top-focus task on the same `scheduled_date` while allowing toggling an existing one off or setting top-focus on a different date.
3. **Habit streak calculation across non-consecutive or today-not-yet-completed dates:** `calculateHabitStreak` must count consecutive completed days up to today (or yesterday if today is not yet checked) without resetting to 0 simply because today isn't checked off yet.
4. **Importing malformed or partial JSON backup:** `importBackupJson` must validate schema keys and return an explicit error result rather than corrupting local state or crashing the UI.
5. **Invalid time-blocking range (`end_time <= start_time`):** Task normalization/validation must guard against end times earlier than start times when rendering the hourly timeline block height.

---

### Task 1: Project Scaffolding, Domain Types, Seed Data & Core Computation Engine

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `public/manifest.json`
- Create: `capacitor.config.ts`
- Create: `src/index.css`
- Create: `src/types/planner.ts`
- Create: `src/lib/plannerEngine.ts`
- Create: `src/lib/seedData.ts`
- Test: `src/lib/__tests__/plannerEngine.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `src/types/planner.ts`: `Priority`, `TaskStatus`, `GoalStatus`, `ProgressMode`, `RecurrenceType`, `LifeArea`, `Milestone`, `Goal`, `Subtask`, `Task`, `Habit`, `HabitLog`, `PeriodPlan`, `SyncConfig`, `PlannerState`, `AnalyticsSummary`
  - `src/lib/plannerEngine.ts`:
    - `computeGoalProgress(goal: Goal, milestones: Milestone[], tasks: Task[]): number`
    - `canMarkTopFocus(tasks: Task[], scheduledDate: string, taskId?: string): boolean`
    - `calculateHabitStreak(habitId: string, logs: HabitLog[], referenceDate: string): number`
    - `getTasksForDate(tasks: Task[], date: string): { topFocus: Task[]; scheduled: Task[]; overdue: Task[] }`
    - `getDueReminders(tasks: Task[], nowIso: string): Task[]`
    - `computeAnalyticsSummary(state: PlannerState, referenceDate: string): AnalyticsSummary`
    - `getTimelineBlockMetrics(startTime?: string, endTime?: string): { startHour: number; durationMinutes: number } | null`
  - `src/lib/seedData.ts`:
    - `createInitialSeedState(todayIso?: string): PlannerState`

- [ ] **Step 1: Scaffold Vite + React + TypeScript + Tailwind + Vitest project and write failing engine tests**

Create `package.json`, config files, `src/types/planner.ts`, and `src/lib/__tests__/plannerEngine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  computeGoalProgress,
  canMarkTopFocus,
  calculateHabitStreak,
  getTasksForDate,
  getTimelineBlockMetrics,
} from '../plannerEngine';

describe('plannerEngine', () => {
  it('returns 0 instead of NaN when auto goal has 0 tasks and 0 milestones', () => {
    const goal = {
      id: 'g1', title: 'Mục tiêu A', description: '', category_id: 'work',
      start_date: '2026-11-01', target_date: '2026-12-31',
      status: 'in_progress' as const, progress_mode: 'auto_from_tasks' as const, manual_progress: 0,
    };
    expect(computeGoalProgress(goal, [], [])).toBe(0);
  });

  it('enforces max 3 top focus tasks per scheduled_date', () => {
    const tasks = [1, 2, 3].map((n) => ({
      id: `t${n}`, title: `Việc ${n}`, notes: '', category_id: 'work',
      status: 'todo' as const, priority: 'high' as const,
      scheduled_date: '2026-11-09', is_top_focus: true,
      recurrence: 'none' as const, reminder_sent: false, subtasks: [], updated_at: '2026-11-09T00:00:00Z',
    }));
    expect(canMarkTopFocus(tasks, '2026-11-09', 't4')).toBe(false);
    expect(canMarkTopFocus(tasks, '2026-11-09', 't1')).toBe(true);
    expect(canMarkTopFocus(tasks, '2026-11-10', 't4')).toBe(true);
  });

  it('calculates habit streak across yesterday and today without dropping streak when today is unchecked', () => {
    const logs = [
      { id: '1', habit_id: 'h1', date: '2026-11-07', completed: true },
      { id: '2', habit_id: 'h1', date: '2026-11-08', completed: true },
    ];
    expect(calculateHabitStreak('h1', logs, '2026-11-09')).toBe(2);
  });

  it('clamps invalid time-blocking range where end_time <= start_time to minimum 30 minutes', () => {
    const metrics = getTimelineBlockMetrics('10:00', '09:00');
    expect(metrics).toEqual({ startHour: 10, durationMinutes: 30 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/plannerEngine.test.ts`
Expected: FAIL with module `../plannerEngine` not found.

- [ ] **Step 3: Implement `src/lib/plannerEngine.ts` and `src/lib/seedData.ts`**

Implement all pure functions in `src/lib/plannerEngine.ts` and realistic Vietnamese sample data in `src/lib/seedData.ts` (5 life areas: Công việc, Tài chính, Học tập, Sức khỏe, Cá nhân; sample Goals with Milestones, weekly/daily tasks, and habits).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/plannerEngine.test.ts`
Expected: PASS (all tests green).

---

### Task 2: Hybrid Storage, JSON Backup & Supabase Cloud Sync Layer

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/lib/storageSync.ts`
- Create: `src/context/PlannerContext.tsx`
- Test: `src/lib/__tests__/storageSync.test.ts`

**Interfaces:**
- Consumes: `PlannerState`, `SyncConfig`, `createInitialSeedState` from Task 1
- Produces:
  - `src/lib/storageSync.ts`:
    - `loadLocalState(): PlannerState`
    - `saveLocalState(state: PlannerState): void`
    - `exportBackupJson(state: PlannerState): string`
    - `importBackupJson(rawJson: string): { ok: true; state: PlannerState } | { ok: false; error: string }`
    - `syncWithSupabase(state: PlannerState, config: SyncConfig): Promise<{ ok: boolean; state?: PlannerState; message: string }>`
  - `src/context/PlannerContext.tsx`:
    - `PlannerProvider` and `usePlanner()` hook exposing state + CRUD actions (`addTask`, `updateTask`, `deleteTask`, `toggleTaskStatus`, `moveTaskToDate`, `addGoal`, `updateGoal`, `deleteGoal`, `addMilestone`, `toggleMilestone`, `toggleHabitForDate`, `addHabit`, `savePeriodPlan`, `triggerCloudSync`, `resetToSeedData`, `clearAllData`)

- [ ] **Step 1: Write failing tests for local storage persistence and malformed JSON backup import**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { exportBackupJson, importBackupJson, saveLocalState, loadLocalState } from '../storageSync';
import { createInitialSeedState } from '../seedData';

describe('storageSync', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips state through localStorage and JSON backup', () => {
    const seed = createInitialSeedState('2026-11-09');
    saveLocalState(seed);
    expect(loadLocalState().goals.length).toBeGreaterThan(0);

    const raw = exportBackupJson(seed);
    const imported = importBackupJson(raw);
    expect(imported.ok).toBe(true);
  });

  it('rejects malformed or incomplete backup JSON safely', () => {
    expect(importBackupJson('not-json').ok).toBe(false);
    expect(importBackupJson('{"tasks": "invalid"}').ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/storageSync.test.ts`
Expected: FAIL with module `../storageSync` not found.

- [ ] **Step 3: Implement `supabase/schema.sql`, `src/lib/storageSync.ts`, and `src/context/PlannerContext.tsx`**

Include complete SQL schema in `supabase/schema.sql` (table `planner_states` with `id`, `payload JSONB`, `updated_at TIMESTAMPTZ` + Row Level Security policy and realtime publication) so syncing the full structured graph between PC and iPhone requires zero complex migrations.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/storageSync.test.ts`
Expected: PASS.

---

### Task 3: Responsive App Shell, Notification Service, Pomodoro Widget & Quick Add Bar

**Files:**
- Create: `src/lib/notificationService.ts`
- Create: `src/components/LayoutShell.tsx`
- Create: `src/components/QuickAddBar.tsx`
- Create: `src/components/PomodoroWidget.tsx`
- Test: `src/components/__tests__/QuickAddBar.test.tsx`

**Interfaces:**
- Consumes: `usePlanner()` from `src/context/PlannerContext.tsx`, `getDueReminders` from `src/lib/plannerEngine.ts`
- Produces:
  - `NavTab`: `'today' | 'week' | 'month' | 'goals' | 'inbox' | 'analytics' | 'settings'`
  - `LayoutShell({ activeTab, onSelectTab, children })`
  - `QuickAddBar({ defaultDate?: string })`
  - `PomodoroWidget()`

- [ ] **Step 1: Write failing test for `QuickAddBar` creating a task with priority and top-focus flag**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlannerProvider } from '../../context/PlannerContext';
import { QuickAddBar } from '../QuickAddBar';

describe('QuickAddBar', () => {
  it('submits a new task when typing a title and pressing Enter or clicking Thêm việc', () => {
    render(
      <PlannerProvider>
        <QuickAddBar defaultDate="2026-11-09" />
      </PlannerProvider>
    );
    const input = screen.getByPlaceholderText(/Thêm nhanh công việc/i);
    fireEvent.change(input, { target: { value: 'Hoàn thành báo cáo quý' } });
    fireEvent.submit(input.closest('form')!);
    expect((input as HTMLInputElement).value).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/QuickAddBar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `notificationService.ts`, `LayoutShell.tsx`, `QuickAddBar.tsx`, and `PomodoroWidget.tsx`**

Implement responsive navigation (Desktop sidebar + iPhone bottom tab bar), reminder polling + Web Notification API + Web Audio chime in `notificationService.ts`, `QuickAddBar.tsx`, and `PomodoroWidget.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/QuickAddBar.test.tsx`
Expected: PASS.

---

### Task 4: Daily Focus View (Today), Habit Strip & Quick Inbox View

**Files:**
- Create: `src/views/DailyFocusView.tsx`
- Create: `src/views/InboxView.tsx`
- Test: `src/views/__tests__/DailyFocusView.test.tsx`

**Interfaces:**
- Consumes: `usePlanner()`, `QuickAddBar`, `PomodoroWidget`, `getTasksForDate`, `getTimelineBlockMetrics`
- Produces: `DailyFocusView`, `InboxView`

- [ ] **Step 1: Write failing test for `DailyFocusView` rendering Top 3 Priorities, Time-blocking schedule, and Habits**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlannerProvider } from '../../context/PlannerContext';
import { DailyFocusView } from '../DailyFocusView';

describe('DailyFocusView', () => {
  it('renders Top 3 Tiêu Điểm section, Time-blocking timeline, and Thói quen hàng ngày', () => {
    render(
      <PlannerProvider>
        <DailyFocusView />
      </PlannerProvider>
    );
    expect(screen.getByText(/Tiêu điểm hôm nay \(Top 3\)/i)).toBeTruthy();
    expect(screen.getByText(/Lịch trình theo khung giờ/i)).toBeTruthy();
    expect(screen.getByText(/Thói quen hàng ngày/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/__tests__/DailyFocusView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `DailyFocusView.tsx` and `InboxView.tsx`**

Include task detail modal/drawer (subtasks checklist, reminder time picker, time-block start/end time, goal/milestone selector, notes) and 1-click scheduling in `InboxView.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/views/__tests__/DailyFocusView.test.tsx`
Expected: PASS.

---

### Task 5: Weekly Planner (7-Day Drag & Drop Board) & Monthly Calendar View

**Files:**
- Create: `src/views/WeeklyPlannerView.tsx`
- Create: `src/views/MonthlyCalendarView.tsx`
- Test: `src/views/__tests__/WeeklyMonthlyView.test.tsx`

**Interfaces:**
- Consumes: `usePlanner()`
- Produces: `WeeklyPlannerView`, `MonthlyCalendarView`

- [ ] **Step 1: Write failing test for `WeeklyPlannerView` and `MonthlyCalendarView`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlannerProvider } from '../../context/PlannerContext';
import { WeeklyPlannerView } from '../WeeklyPlannerView';
import { MonthlyCalendarView } from '../MonthlyCalendarView';

describe('Weekly and Monthly Views', () => {
  it('renders 7 days of the week plus Backlog column and Weekly Focus notes', () => {
    render(
      <PlannerProvider>
        <WeeklyPlannerView />
      </PlannerProvider>
    );
    expect(screen.getByText(/Kế hoạch Tuần/i)).toBeTruthy();
    expect(screen.getByText(/Trọng tâm Tuần/i)).toBeTruthy();
  });

  it('renders Monthly Calendar grid and Trọng tâm của Tháng panel', () => {
    render(
      <PlannerProvider>
        <MonthlyCalendarView />
      </PlannerProvider>
    );
    expect(screen.getByText(/Trọng tâm của Tháng/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/__tests__/WeeklyMonthlyView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `WeeklyPlannerView.tsx` and `MonthlyCalendarView.tsx`**

Support HTML5 drag-and-drop (`onDragStart`, `onDragOver`, `onDrop`) plus quick day-picker dropdown on every card (for mobile touch friendliness) in `WeeklyPlannerView.tsx`, and interactive calendar grid + day inspection in `MonthlyCalendarView.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/views/__tests__/WeeklyMonthlyView.test.tsx`
Expected: PASS.

---

### Task 6: Goals & Timeline (Gantt Roadmap), Analytics Dashboard, Cloud Sync Settings & App Wiring

**Files:**
- Create: `src/views/GoalsTimelineView.tsx`
- Create: `src/views/AnalyticsView.tsx`
- Create: `src/views/SettingsSyncView.tsx`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Test: `src/views/__tests__/GoalsAnalyticsView.test.tsx`

**Interfaces:**
- Consumes: All views, `PlannerProvider`, `LayoutShell`, `computeGoalProgress`, `computeAnalyticsSummary`
- Produces: Complete `App` entry point and production build

- [ ] **Step 1: Write failing test for `GoalsTimelineView`, `AnalyticsView`, and full `App` navigation**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';

describe('Goals, Analytics, and App shell', () => {
  it('renders the full application and switches to Goals & Timeline view', () => {
    render(<App />);
    expect(screen.getByText(/ProPlanner/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/views/__tests__/GoalsAnalyticsView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `GoalsTimelineView.tsx`, `AnalyticsView.tsx`, `SettingsSyncView.tsx`, `App.tsx`, and `main.tsx`**

Include interactive Goal & Milestone creator, visual horizontal Gantt/Timeline chart showing each Goal and Milestone bar positioned along the timeline with current date marker, Analytics charts, and Cloud Sync / iPhone setup screen.

- [ ] **Step 4: Run full test suite and production build to verify everything passes**

Run: `npx vitest run && npm run build`
Expected: All test suites PASS and Vite production bundle builds with 0 errors.
