# Doctor Duty Shifts (Lịch Trực Bác Sĩ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a specialized Doctor Duty Shifts (`DutyShift`) system with 5 shift types (`Trực 24h`, `Trực Đêm`, `Trực Ngày`, `Ra trực Sáng`, `Ra trực Chiều`), 1-click quick assignment on the Monthly Calendar, optional auto-fill of `Ra trực Sáng` the next day, and prominent visual highlighting across Monthly, Weekly, and Daily views.

**Architecture:** Extend `PlannerState` with `dutyShifts: DutyShift[]` (backward-compatible with existing localStorage/JSON backups), add pure helper functions in `plannerEngine.ts` and metadata/styling constants in `src/lib/dutyShiftConfig.ts`, expose `setDutyShift` in `PlannerContext.tsx`, and render prominent shift badges/highlights in `MonthlyCalendarView.tsx`, `WeeklyPlannerView.tsx`, and `DailyFocusView.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, `lucide-react`, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-09-duty-shifts-design.md`

## Global Constraints

- 5 Shift Types: `shift_24h` (Trực 24h), `shift_night` (Trực Đêm), `shift_day` (Trực Ngày), `off_morning` (Ra trực Sáng), `off_afternoon` (Ra trực Chiều).
- Backward Compatibility: Existing `localStorage` states or JSON backups without `dutyShifts` must default to `dutyShifts: []` without crashing.
- Auto Post-Shift Option: Setting `shift_24h` or `shift_night` on date $D$ with `autoAddPostShift = true` automatically sets `off_morning` on date $D+1$ only if date $D+1$ does not already have a primary duty shift (`shift_24h`, `shift_night`, `shift_day`).

## Review Focus

1. **Legacy state in `localStorage` or JSON import missing `dutyShifts` array:** `loadLocalState` and `importBackupJson` must normalize `dutyShifts` to `[]` so old data saved before this feature never throws `Cannot read properties of undefined (reading 'find')`.
2. **Auto post-shift (`Ra trực Sáng`) when the next day already has a main duty shift:** `applyDutyShiftChange` must not overwrite an existing `shift_24h`, `shift_night`, or `shift_day` on $D+1$ when auto-adding `off_morning`.
3. **Toggling off the same shift type in 1-click stamp mode:** Clicking a calendar day that already has the currently selected stamp shift type must remove the shift (toggle off) cleanly.

---

### Task 1: Duty Shift Types, Metadata, Engine Logic, Backward-Compatible Storage & Context

**Files:**
- Modify: `src/types/planner.ts`
- Create: `src/lib/dutyShiftConfig.ts`
- Modify: `src/lib/plannerEngine.ts`
- Modify: `src/lib/seedData.ts`
- Modify: `src/lib/storageSync.ts`
- Modify: `src/context/PlannerContext.tsx`
- Test: `src/lib/__tests__/plannerEngine.test.ts`

**Interfaces:**
- Produces:
  - `DutyShiftType = 'shift_24h' | 'shift_night' | 'shift_day' | 'off_morning' | 'off_afternoon'`
  - `DutyShift { id: string; date: string; type: DutyShiftType; note?: string }`
  - `applyDutyShiftChange(shifts: DutyShift[], date: string, type: DutyShiftType | null, note?: string, autoAddPostShift?: boolean): DutyShift[]`
  - `getMonthDutyStats(shifts: DutyShift[], yearMonth: string): { totalActiveShifts: number; shift24hCount: number; nightCount: number; dayCount: number; postShiftCount: number }`

- [ ] **Step 1: Write failing tests for `applyDutyShiftChange` and `getMonthDutyStats` in `src/lib/__tests__/plannerEngine.test.ts`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `dutyShiftConfig.ts`, update `planner.ts`, `plannerEngine.ts`, `seedData.ts`, `storageSync.ts`, and `PlannerContext.tsx`**
- [ ] **Step 4: Run test to verify it passes and commit**

---

### Task 2: Prominent Duty Highlighting & 1-Click Stamp Mode in Monthly, Weekly & Daily Views

**Files:**
- Modify: `src/views/MonthlyCalendarView.tsx`
- Modify: `src/views/WeeklyPlannerView.tsx`
- Modify: `src/views/DailyFocusView.tsx`
- Test: `src/views/__tests__/WeeklyMonthlyView.test.tsx`

**Interfaces:**
- Consumes: `usePlanner().setDutyShift`, `DUTY_SHIFT_META`, `getMonthDutyStats`
- Produces: 1-click Duty Stamp Toolbar + highlighted cells in `MonthlyCalendarView`, highlighted day columns + shift selector in `WeeklyPlannerView`, and Today/Tomorrow Duty Banner in `DailyFocusView`.

- [ ] **Step 1: Write failing UI test for 1-click Duty Stamp Toolbar and prominent duty badges in `WeeklyMonthlyView.test.tsx`**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement duty highlighting & controls in `MonthlyCalendarView.tsx`, `WeeklyPlannerView.tsx`, and `DailyFocusView.tsx`**
- [ ] **Step 4: Run full test suite & production build and commit**
