import {
  AnalyticsSummary,
  CategoryDistributionItem,
  DailyTrendPoint,
  DutyShift,
  DutyShiftType,
  Goal,
  HabitLog,
  Milestone,
  PlannerState,
  RecurrenceType,
  Task,
} from '../types/planner';
import { getTodayIso } from './seedData';

const PRIORITY_WEIGHT: Record<Task['priority'], number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function sortTasksByPriorityAndTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    if (a.is_top_focus !== b.is_top_focus) return a.is_top_focus ? -1 : 1;
    const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (pw !== 0) return pw;
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
    if (a.start_time) return -1;
    if (b.start_time) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function computeGoalProgress(
  goal: Goal,
  milestones: Milestone[],
  tasks: Task[]
): number {
  if (goal.status === 'completed') return 100;
  if (goal.progress_mode === 'manual') {
    return Math.max(0, Math.min(100, Math.round(goal.manual_progress || 0)));
  }

  const goalMilestones = milestones.filter((m) => m.goal_id === goal.id);
  const goalTasks = tasks.filter(
    (t) => t.goal_id === goal.id && t.status !== 'cancelled'
  );

  if (goal.progress_mode === 'auto_from_milestones') {
    if (goalMilestones.length === 0) {
      if (goalTasks.length === 0) return 0;
      const doneCount = goalTasks.filter((t) => t.status === 'done').length;
      return Math.round((doneCount / goalTasks.length) * 100);
    }
    const completedMilestones = goalMilestones.filter((m) => m.is_completed).length;
    return Math.round((completedMilestones / goalMilestones.length) * 100);
  }

  // auto_from_tasks: combine tasks + milestones if both exist, or tasks if present
  const totalUnits = goalTasks.length + goalMilestones.length;
  if (totalUnits === 0) return 0;

  const completedUnits =
    goalTasks.filter((t) => t.status === 'done').length +
    goalMilestones.filter((m) => m.is_completed).length;

  return Math.round((completedUnits / totalUnits) * 100);
}

export function canMarkTopFocus(
  tasks: Task[],
  scheduledDate: string | null,
  taskId?: string
): boolean {
  if (!scheduledDate) return false;
  const activeTopFocusForDate = tasks.filter(
    (t) =>
      t.scheduled_date === scheduledDate &&
      t.is_top_focus &&
      t.status !== 'cancelled' &&
      t.id !== taskId
  );
  return activeTopFocusForDate.length < 3;
}

function addDaysIso(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function getDayOfWeekIso(dateIso: string): number {
  const [y, m, d] = dateIso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function getNextRecurrenceDate(
  currentDateIso: string | null,
  recurrence: RecurrenceType
): string | null {
  if (!currentDateIso || recurrence === 'none') return null;

  if (recurrence === 'daily') {
    return addDaysIso(currentDateIso, 1);
  }

  if (recurrence === 'weekdays') {
    let next = addDaysIso(currentDateIso, 1);
    let dow = getDayOfWeekIso(next);
    if (dow === 6) {
      next = addDaysIso(next, 2);
    } else if (dow === 0) {
      next = addDaysIso(next, 1);
    }
    return next;
  }

  if (recurrence === 'weekly') {
    return addDaysIso(currentDateIso, 7);
  }

  if (recurrence === 'monthly') {
    const [y, m, d] = currentDateIso.split('-').map(Number);
    const targetYear = m === 12 ? y + 1 : y;
    const targetMonth = m === 12 ? 1 : m + 1;
    const maxDayInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    const clampedDay = Math.min(d, maxDayInTargetMonth);
    return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
  }

  return null;
}

export function formatTimeHHMM(timeStr?: string): string {
  if (!timeStr) return '';
  return timeStr.trim().slice(0, 5);
}

export function toLocalDatetimeInputValue(isoOrLocal?: string): string {
  if (!isoOrLocal) return '';
  const trimmed = isoOrLocal.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }
  const dt = new Date(trimmed);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function formatReminderDisplay(isoOrLocal?: string): string {
  const localVal = toLocalDatetimeInputValue(isoOrLocal);
  return localVal ? localVal.replace('T', ' ') : '';
}

export function calculateHabitStreak(
  habitId: string,
  logs: HabitLog[],
  referenceDate: string,
  frequency?: number[]
): number {
  const completedDates = new Set(
    logs
      .filter((l) => l.habit_id === habitId && l.completed)
      .map((l) => l.date)
  );

  const activeFreq =
    Array.isArray(frequency) && frequency.length > 0 && frequency.length < 7
      ? new Set(frequency)
      : null;

  let cursor = referenceDate;
  if (!completedDates.has(cursor)) {
    let prev = addDaysIso(referenceDate, -1);
    if (activeFreq) {
      let guard = 0;
      while (guard < 7 && !activeFreq.has(getDayOfWeekIso(prev)) && !completedDates.has(prev)) {
        prev = addDaysIso(prev, -1);
        guard += 1;
      }
    }
    if (!completedDates.has(prev)) {
      return 0;
    }
    cursor = prev;
  }

  let streak = 0;
  let safety = 0;
  while (safety < 3660) {
    safety += 1;
    if (completedDates.has(cursor)) {
      streak += 1;
      cursor = addDaysIso(cursor, -1);
    } else if (activeFreq && !activeFreq.has(getDayOfWeekIso(cursor))) {
      cursor = addDaysIso(cursor, -1);
    } else {
      break;
    }
  }
  return streak;
}

export function getTasksForDate(
  tasks: Task[],
  date: string,
  todayIso: string = getTodayIso()
): { topFocus: Task[]; scheduled: Task[]; overdue: Task[] } {
  const active = tasks.filter((t) => t.status !== 'cancelled');
  const forDate = sortTasksByPriorityAndTime(
    active.filter((t) => t.scheduled_date === date)
  );
  const topFocus = forDate.filter((t) => t.is_top_focus).slice(0, 3);
  const scheduled = forDate;

  // Công việc tồn đọng quá hạn (Overdue) LUÔN phải so sánh với ngày hiện tại thực tế (todayIso),
  // tuyệt đối không so sánh với ngày tương lai (date > todayIso) khiến các việc của hôm nay/tương lai bị báo quá hạn sai.
  const overdue = sortTasksByPriorityAndTime(
    active.filter(
      (t) =>
        t.scheduled_date !== null &&
        t.scheduled_date < todayIso &&
        t.scheduled_date !== date &&
        t.status !== 'done'
    )
  );

  return { topFocus, scheduled, overdue };
}

export function getTimelineBlockMetrics(
  startTime?: string,
  endTime?: string
): { startHour: number; durationMinutes: number } | null {
  if (!startTime || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(startTime.trim())) return null;
  const [sh, sm] = startTime.trim().split(':').map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm)) return null;

  const startTotalMinutes = sh * 60 + sm;
  let durationMinutes = 60;

  if (endTime && /^\d{1,2}:\d{2}(:\d{2})?$/.test(endTime.trim())) {
    const [eh, em] = endTime.trim().split(':').map(Number);
    if (!Number.isNaN(eh) && !Number.isNaN(em)) {
      const endTotalMinutes = eh * 60 + em;
      durationMinutes = Math.max(30, endTotalMinutes - startTotalMinutes);
    }
  }

  return {
    startHour: sh + sm / 60,
    durationMinutes,
  };
}

export function getDueReminders(tasks: Task[], nowIso: string): Task[] {
  const nowTime = new Date(nowIso).getTime();
  if (Number.isNaN(nowTime)) return [];

  return tasks.filter((t) => {
    if (t.status === 'done' || t.status === 'cancelled' || t.reminder_sent) {
      return false;
    }
    if (!t.reminder_at) return false;
    const reminderTime = new Date(t.reminder_at).getTime();
    if (Number.isNaN(reminderTime)) return false;
    return reminderTime <= nowTime;
  });
}

export function computeAnalyticsSummary(
  state: PlannerState,
  referenceDate: string,
  todayIso: string = getTodayIso()
): AnalyticsSummary {
  const validTasks = state.tasks.filter((t) => t.status !== 'cancelled');
  const totalTasks = validTasks.length;
  const completedTasks = validTasks.filter((t) => t.status === 'done').length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Không bao giờ lấy mốc tương lai (> todayIso) để tính việc quá hạn
  const overdueCutoff = referenceDate < todayIso ? referenceDate : todayIso;
  const overdueCount = validTasks.filter(
    (t) =>
      t.scheduled_date !== null &&
      t.scheduled_date < overdueCutoff &&
      t.status !== 'done'
  ).length;

  let bestHabitStreak = 0;
  for (const habit of state.habits) {
    const s = calculateHabitStreak(
      habit.id,
      state.habitLogs,
      referenceDate,
      habit.frequency
    );
    if (s > bestHabitStreak) bestHabitStreak = s;
  }

  const averageGoalProgress =
    state.goals.length > 0
      ? Math.round(
          state.goals.reduce(
            (acc, g) =>
              acc + computeGoalProgress(g, state.milestones, state.tasks),
            0
          ) / state.goals.length
        )
      : 0;

  const last7DaysTrend: DailyTrendPoint[] = [];
  const weekdayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  for (let i = 6; i >= 0; i--) {
    const dIso = addDaysIso(referenceDate, -i);
    const [y, m, d] = dIso.split('-').map(Number);
    const dow = weekdayNames[new Date(y, m - 1, d).getDay()];
    const dayTasks = validTasks.filter((t) => t.scheduled_date === dIso);
    const dayDone = dayTasks.filter((t) => t.status === 'done').length;
    const dayTotal = dayTasks.length;
    last7DaysTrend.push({
      date: dIso,
      label: `${dow} (${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')})`,
      completed: dayDone,
      total: dayTotal,
      rate: dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0,
    });
  }

  const categoryDistribution: CategoryDistributionItem[] = state.categories.map(
    (cat) => {
      const catTasks = validTasks.filter((t) => t.category_id === cat.id);
      const catCompleted = catTasks.filter((t) => t.status === 'done').length;
      return {
        categoryId: cat.id,
        name: cat.name,
        color: cat.color,
        totalTasks: catTasks.length,
        completedTasks: catCompleted,
        percentage:
          totalTasks > 0 ? Math.round((catTasks.length / totalTasks) * 100) : 0,
      };
    }
  );

  return {
    totalTasks,
    completedTasks,
    completionRate,
    overdueCount,
    bestHabitStreak,
    averageGoalProgress,
    last7DaysTrend,
    categoryDistribution,
  };
}

export function applyDutyShiftChange(
  shifts: DutyShift[],
  date: string,
  type: DutyShiftType | null,
  note = '',
  autoAddPostShift = false
): DutyShift[] {
  const safeShifts = Array.isArray(shifts) ? [...shifts] : [];
  if (type === null) {
    return safeShifts.filter((s) => s.date !== date);
  }

  const existingIdx = safeShifts.findIndex((s) => s.date === date);
  const entry: DutyShift = {
    id: existingIdx >= 0 ? safeShifts[existingIdx].id : `ds-${date}`,
    date,
    type,
    note: note.trim() || (existingIdx >= 0 ? safeShifts[existingIdx].note : undefined),
  };

  if (existingIdx >= 0) {
    safeShifts[existingIdx] = entry;
  } else {
    safeShifts.push(entry);
  }

  // Nếu chọn Trực 24h hoặc Trực Đêm và bật tự động điền Ra trực Sáng vào ngày hôm sau
  if (autoAddPostShift && (type === 'shift_24h' || type === 'shift_night')) {
    const nextDate = addDaysIso(date, 1);
    const nextExisting = safeShifts.find((s) => s.date === nextDate);
    const hasPrimaryNextDay =
      nextExisting &&
      (nextExisting.type === 'shift_24h' ||
        nextExisting.type === 'shift_night' ||
        nextExisting.type === 'shift_day');

    if (!hasPrimaryNextDay) {
      const nextEntry: DutyShift = {
        id: nextExisting ? nextExisting.id : `ds-${nextDate}`,
        date: nextDate,
        type: 'off_morning',
        note: nextExisting?.note || 'Ra trực buổi sáng',
      };
      const nextIdx = safeShifts.findIndex((s) => s.date === nextDate);
      if (nextIdx >= 0) {
        safeShifts[nextIdx] = nextEntry;
      } else {
        safeShifts.push(nextEntry);
      }
    }
  }

  return safeShifts.sort((a, b) => a.date.localeCompare(b.date));
}

export function getMonthDutyStats(
  shifts: DutyShift[],
  yearMonth: string
): {
  totalActiveShifts: number;
  shift24hCount: number;
  nightCount: number;
  dayCount: number;
  postShiftCount: number;
} {
  const monthShifts = (Array.isArray(shifts) ? shifts : []).filter((s) =>
    s.date.startsWith(yearMonth)
  );
  const shift24hCount = monthShifts.filter((s) => s.type === 'shift_24h').length;
  const nightCount = monthShifts.filter((s) => s.type === 'shift_night').length;
  const dayCount = monthShifts.filter((s) => s.type === 'shift_day').length;
  const postShiftCount = monthShifts.filter(
    (s) => s.type === 'off_morning' || s.type === 'off_afternoon'
  ).length;

  return {
    totalActiveShifts: shift24hCount + nightCount + dayCount,
    shift24hCount,
    nightCount,
    dayCount,
    postShiftCount,
  };
}
