import { describe, it, expect } from 'vitest';
import {
  computeGoalProgress,
  canMarkTopFocus,
  calculateHabitStreak,
  getTasksForDate,
  getTimelineBlockMetrics,
  computeAnalyticsSummary,
  getDueReminders,
  applyDutyShiftChange,
  getMonthDutyStats,
  getNextRecurrenceDate,
  toLocalDatetimeInputValue,
  formatReminderDisplay,
} from '../plannerEngine';
import { checkDailyRoutineNotifications } from '../notificationService';
import { createInitialSeedState } from '../seedData';

describe('plannerEngine', () => {
  it('returns 0 instead of NaN when auto goal has 0 tasks and 0 milestones', () => {
    const goal = {
      id: 'g1',
      title: 'Mục tiêu A',
      description: '',
      category_id: 'work',
      start_date: '2026-11-01',
      target_date: '2026-12-31',
      status: 'in_progress' as const,
      progress_mode: 'auto_from_tasks' as const,
      manual_progress: 0,
    };
    expect(computeGoalProgress(goal, [], [])).toBe(0);
  });

  it('computes goal progress from linked tasks and milestones accurately', () => {
    const goal = {
      id: 'g1',
      title: 'Mục tiêu B',
      description: '',
      category_id: 'work',
      start_date: '2026-11-01',
      target_date: '2026-12-31',
      status: 'in_progress' as const,
      progress_mode: 'auto_from_tasks' as const,
      manual_progress: 0,
    };
    const tasks = [
      {
        id: 't1',
        title: 'T1',
        notes: '',
        category_id: 'work',
        goal_id: 'g1',
        status: 'done' as const,
        priority: 'high' as const,
        scheduled_date: '2026-11-09',
        is_top_focus: false,
        recurrence: 'none' as const,
        reminder_sent: false,
        subtasks: [],
        updated_at: '2026-11-09T00:00:00Z',
      },
      {
        id: 't2',
        title: 'T2',
        notes: '',
        category_id: 'work',
        goal_id: 'g1',
        status: 'todo' as const,
        priority: 'medium' as const,
        scheduled_date: '2026-11-09',
        is_top_focus: false,
        recurrence: 'none' as const,
        reminder_sent: false,
        subtasks: [],
        updated_at: '2026-11-09T00:00:00Z',
      },
    ];
    expect(computeGoalProgress(goal, [], tasks)).toBe(50);
  });

  it('enforces max 3 top focus tasks per scheduled_date', () => {
    const tasks = [1, 2, 3].map((n) => ({
      id: `t${n}`,
      title: `Việc ${n}`,
      notes: '',
      category_id: 'work',
      status: 'todo' as const,
      priority: 'high' as const,
      scheduled_date: '2026-11-09',
      is_top_focus: true,
      recurrence: 'none' as const,
      reminder_sent: false,
      subtasks: [],
      updated_at: '2026-11-09T00:00:00Z',
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
    const logsWithToday = [
      ...logs,
      { id: '3', habit_id: 'h1', date: '2026-11-09', completed: true },
    ];
    expect(calculateHabitStreak('h1', logsWithToday, '2026-11-09')).toBe(3);
  });

  it('clamps invalid time-blocking range where end_time <= start_time to minimum 30 minutes', () => {
    const metrics = getTimelineBlockMetrics('10:00', '09:00');
    expect(metrics).toEqual({ startHour: 10, durationMinutes: 30 });
  });

  it('partitions tasks for date and computes analytics summary from seed state', () => {
    const seed = createInitialSeedState('2026-11-09');
    const daily = getTasksForDate(seed.tasks, '2026-11-09', '2026-11-09');
    expect(daily.topFocus.length).toBeLessThanOrEqual(3);
    expect(daily.overdue).toHaveLength(0);

    // Khi mở xem ngày tương lai (ví dụ 2026-11-18) trong khi hôm nay là 2026-11-09,
    // các việc của 2026-11-09, 2026-11-10, 2026-11-11 tuyệt đối KHÔNG bị tính là quá hạn!
    const futureView = getTasksForDate(seed.tasks, '2026-11-18', '2026-11-09');
    expect(futureView.overdue).toHaveLength(0);

    const summary = computeAnalyticsSummary(seed, '2026-11-18', '2026-11-09');
    expect(summary.overdueCount).toBe(0);
    expect(summary.totalTasks).toBeGreaterThan(0);
    expect(summary.last7DaysTrend).toHaveLength(7);
  });

  it('finds due reminders that have not been sent yet', () => {
    const tasks = [
      {
        id: 'r1',
        title: 'Họp đầu tuần',
        notes: '',
        category_id: 'work',
        status: 'todo' as const,
        priority: 'urgent' as const,
        scheduled_date: '2026-11-09',
        is_top_focus: true,
        recurrence: 'none' as const,
        reminder_at: '2026-11-09T09:00:00.000Z',
        reminder_sent: false,
        subtasks: [],
        updated_at: '2026-11-09T08:00:00Z',
      },
    ];
    expect(getDueReminders(tasks, '2026-11-09T09:05:00.000Z')).toHaveLength(1);
    expect(getDueReminders(tasks, '2026-11-09T08:55:00.000Z')).toHaveLength(0);
  });

  it('adds shift_24h and auto-fills off_morning on the next day without overwriting an existing primary shift', () => {
    const afterAdd = applyDutyShiftChange([], '2026-11-10', 'shift_24h', 'Trực Cấp cứu', true);
    expect(afterAdd.find((s) => s.date === '2026-11-10')?.type).toBe('shift_24h');
    expect(afterAdd.find((s) => s.date === '2026-11-11')?.type).toBe('off_morning');

    // Nếu ngày 2026-11-11 đã có ca trực chính (ví dụ shift_day), không ghi đè khi chấm lại
    const withPrimaryOn11 = applyDutyShiftChange(afterAdd, '2026-11-11', 'shift_day', '', false);
    const reApply10 = applyDutyShiftChange(withPrimaryOn11, '2026-11-10', 'shift_night', '', true);
    expect(reApply10.find((s) => s.date === '2026-11-11')?.type).toBe('shift_day');

    const stats = getMonthDutyStats(reApply10, '2026-11');
    expect(stats.totalActiveShifts).toBe(2);
    expect(stats.nightCount).toBe(1);
    expect(stats.dayCount).toBe(1);
  });

  it('computes next recurrence date accurately for daily, weekdays, weekly, and monthly', () => {
    expect(getNextRecurrenceDate('2026-11-10', 'daily')).toBe('2026-11-11');
    // 2026-11-06 is Friday -> next weekday is Monday 2026-11-09
    expect(getNextRecurrenceDate('2026-11-06', 'weekdays')).toBe('2026-11-09');
    expect(getNextRecurrenceDate('2026-11-10', 'weekly')).toBe('2026-11-17');
    expect(getNextRecurrenceDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(getNextRecurrenceDate('2026-11-10', 'none')).toBeNull();
  });

  it('preserves local timezone in toLocalDatetimeInputValue without shifting 7 hours to UTC', () => {
    const localInput = '2026-11-10T08:30';
    const storedIso = new Date(localInput).toISOString();
    expect(toLocalDatetimeInputValue(storedIso)).toBe('2026-11-10T08:30');
    expect(formatReminderDisplay(storedIso)).toBe('2026-11-10 08:30');
  });

  it('fires morning planning and evening review routine alerts once per day at configured times', () => {
    const tracker: { morningDate?: string; eveningDate?: string } = {};
    const settings = {
      browserEnabled: false,
      soundEnabled: false,
      morningPlanTime: '08:00',
      eveningReviewTime: '21:00',
    };
    const morningDate = new Date(2026, 10, 10, 8, 0, 0);
    const msg1 = checkDailyRoutineNotifications(morningDate, settings, tracker);
    expect(msg1).toContain('08:00');
    // Không phát trùng lần 2 trong cùng buổi sáng
    expect(checkDailyRoutineNotifications(morningDate, settings, tracker)).toBeNull();

    const eveningDate = new Date(2026, 10, 10, 21, 0, 0);
    const msg2 = checkDailyRoutineNotifications(eveningDate, settings, tracker);
    expect(msg2).toContain('21:00');
  });
});
