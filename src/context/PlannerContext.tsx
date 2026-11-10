import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  DutyShiftType,
  Goal,
  Habit,
  Milestone,
  NotificationSettings,
  PeriodPlan,
  PlannerState,
  SyncConfig,
  Task,
} from '../types/planner';
import {
  applyDutyShiftChange,
  canMarkTopFocus,
  getNextRecurrenceDate,
} from '../lib/plannerEngine';
import { createInitialSeedState, getTodayIso } from '../lib/seedData';
import {
  importBackupJson,
  loadLocalState,
  saveLocalState,
  subscribeToRealtimeSync,
  syncWithSupabase,
} from '../lib/storageSync';
import { syncNativeIosNotifications } from '../lib/notificationService';

interface PlannerContextValue {
  state: PlannerState;
  selectedDate: string;
  setSelectedDate: (dateIso: string) => void;
  syncStatusMessage: string | null;
  isSyncing: boolean;
  toggleDarkMode: () => void;
  addTask: (partial: Partial<Task> & { title: string }) => { ok: boolean; message?: string };
  updateTask: (id: string, updates: Partial<Task>) => { ok: boolean; message?: string };
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  moveTaskToDate: (id: string, targetDate: string | null) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  markReminderSent: (taskId: string) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addMilestone: (milestone: Omit<Milestone, 'id'>) => void;
  toggleMilestone: (id: string) => void;
  deleteMilestone: (id: string) => void;
  addHabit: (habit: Omit<Habit, 'id'>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitForDate: (habitId: string, dateIso: string) => void;
  savePeriodPlan: (plan: Omit<PeriodPlan, 'id'>) => void;
  setDutyShift: (
    dateIso: string,
    type: DutyShiftType | null,
    note?: string,
    autoAddPostShift?: boolean
  ) => void;
  updateSyncConfig: (config: Partial<SyncConfig>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  triggerCloudSync: (direction?: 'auto' | 'push' | 'pull') => Promise<{ ok: boolean; message: string }>;
  importFromJsonString: (raw: string) => { ok: boolean; message: string };
  resetToSeedData: () => void;
  clearAllData: () => void;
}

const PlannerContext = createContext<PlannerContextValue | undefined>(undefined);

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlannerState>(() => loadLocalState());
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIso());
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [localMutationCount, setLocalMutationCount] = useState<number>(0);
  const latestStateRef = useRef<PlannerState>(state);
  latestStateRef.current = state;

  const commitState = useCallback((updater: (prev: PlannerState) => PlannerState) => {
    setState((prev) => {
      const next = {
        ...updater(prev),
        updated_at: new Date().toISOString(),
      };
      saveLocalState(next);
      return next;
    });
    setLocalMutationCount((c) => c + 1);
  }, []);

  // Tự động đồng bộ ngầm (Auto-Sync Debounce 2s) khi có thay đổi cục bộ
  useEffect(() => {
    if (localMutationCount === 0) return;
    const cfg = latestStateRef.current.syncConfig;
    if (!cfg.autoSync || !cfg.supabaseUrl?.trim() || !cfg.supabaseAnonKey?.trim()) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsSyncing(true);
      try {
        const current = latestStateRef.current;
        const res = await syncWithSupabase(current, current.syncConfig, 'push');
        if (res.ok && res.state) {
          setState((prev) => ({
            ...prev,
            syncConfig: {
              ...prev.syncConfig,
              lastSyncedAt: res.state?.syncConfig.lastSyncedAt,
            },
          }));
          setSyncStatusMessage('☁️ Đã tự động đồng bộ ngầm lên Đám mây!');
        }
      } finally {
        setIsSyncing(false);
      }
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [localMutationCount]);

  // Đăng ký kênh Supabase Realtime & đồng bộ khởi đầu khi bật Auto-Sync
  useEffect(() => {
    const { supabaseUrl, supabaseAnonKey, profileKey, autoSync } = state.syncConfig;
    if (!autoSync || !supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
      return;
    }

    const unsubscribe = subscribeToRealtimeSync(
      state.syncConfig,
      (remoteState, remoteUpdatedAt) => {
        const remoteMs = new Date(remoteUpdatedAt).getTime();
        const localMs = new Date(latestStateRef.current.updated_at).getTime();
        if (!Number.isNaN(remoteMs) && remoteMs > localMs) {
          const merged: PlannerState = {
            ...remoteState,
            syncConfig: {
              ...latestStateRef.current.syncConfig,
              lastSyncedAt: new Date().toISOString(),
            },
          };
          saveLocalState(merged);
          setState(merged);
          setSyncStatusMessage('🔄 Đã tự động cập nhật dữ liệu mới từ thiết bị kia!');
        }
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [
    state.syncConfig.supabaseUrl,
    state.syncConfig.supabaseAnonKey,
    state.syncConfig.profileKey,
    state.syncConfig.autoSync,
  ]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (state.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [state.darkMode]);

  // Tự động đồng bộ lịch hẹn giờ thông báo gốc trên iPhone (Capacitor Local Notifications)
  useEffect(() => {
    void syncNativeIosNotifications(state.tasks, state.notificationSettings);
  }, [state.tasks, state.notificationSettings]);

  const toggleDarkMode = useCallback(() => {
    commitState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, [commitState]);

  const addTask = useCallback(
    (partial: Partial<Task> & { title: string }): { ok: boolean; message?: string } => {
      const title = partial.title.trim();
      if (!title) return { ok: false, message: 'Vui lòng nhập tên công việc.' };

      const scheduledDate =
        partial.scheduled_date === undefined ? selectedDate : partial.scheduled_date;
      const wantsTopFocus = Boolean(partial.is_top_focus);

      if (wantsTopFocus && !canMarkTopFocus(state.tasks, scheduledDate)) {
        return {
          ok: false,
          message: 'Mỗi ngày chỉ có tối đa 3 việc thuộc Tiêu điểm (Top 3) để đảm bảo sự tập trung!',
        };
      }

      const newTask: Task = {
        id: uid('task'),
        title,
        notes: partial.notes || '',
        category_id: partial.category_id || state.categories[0]?.id || 'work',
        goal_id: partial.goal_id || undefined,
        milestone_id: partial.milestone_id || undefined,
        status: partial.status || 'todo',
        priority: partial.priority || 'medium',
        scheduled_date: scheduledDate,
        start_time: partial.start_time,
        end_time: partial.end_time,
        estimated_minutes: partial.estimated_minutes ?? 60,
        actual_minutes: partial.actual_minutes ?? 0,
        is_top_focus: wantsTopFocus,
        recurrence: partial.recurrence || 'none',
        reminder_at: partial.reminder_at,
        reminder_sent: false,
        subtasks: partial.subtasks || [],
        updated_at: new Date().toISOString(),
      };

      commitState((prev) => ({
        ...prev,
        tasks: [newTask, ...prev.tasks],
      }));
      return { ok: true };
    },
    [commitState, selectedDate, state.categories, state.tasks]
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>): { ok: boolean; message?: string } => {
      const existing = state.tasks.find((t) => t.id === id);
      if (!existing) return { ok: false, message: 'Không tìm thấy công việc.' };

      const targetDate =
        updates.scheduled_date !== undefined ? updates.scheduled_date : existing.scheduled_date;
      const targetTopFocus =
        updates.is_top_focus !== undefined ? updates.is_top_focus : existing.is_top_focus;

      if (targetTopFocus && !canMarkTopFocus(state.tasks, targetDate, id)) {
        return {
          ok: false,
          message: 'Ngày này đã đủ 3 việc Tiêu điểm (Top 3). Hãy bỏ chọn 1 việc trước!',
        };
      }

      commitState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                ...updates,
                updated_at: new Date().toISOString(),
              }
            : t
        ),
      }));
      return { ok: true };
    },
    [commitState, state.tasks]
  );

  const deleteTask = useCallback(
    (id: string) => {
      commitState((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
    },
    [commitState]
  );

  const toggleTaskStatus = useCallback(
    (id: string) => {
      commitState((prev) => {
        const target = prev.tasks.find((t) => t.id === id);
        if (!target) return prev;

        const nextStatus: Task['status'] = target.status === 'done' ? 'todo' : 'done';
        const nowIso = new Date().toISOString();

        const updatedTasks = prev.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status: nextStatus,
                updated_at: nowIso,
              }
            : t
        );

        // Nếu công việc có lặp lại định kỳ (recurrence !== 'none') và vừa được tích hoàn thành,
        // tự động tạo công việc cho kỳ kế tiếp (nếu chưa tồn tại)
        if (
          nextStatus === 'done' &&
          target.recurrence &&
          target.recurrence !== 'none' &&
          target.scheduled_date
        ) {
          const nextDate = getNextRecurrenceDate(target.scheduled_date, target.recurrence);
          if (nextDate) {
            const alreadySpawned = updatedTasks.some(
              (t) =>
                t.id !== target.id &&
                t.title === target.title &&
                t.recurrence === target.recurrence &&
                t.scheduled_date === nextDate &&
                t.status !== 'done' &&
                t.status !== 'cancelled'
            );

            if (!alreadySpawned) {
              const spawnedTask: Task = {
                ...target,
                id: uid('task'),
                status: 'todo',
                scheduled_date: nextDate,
                actual_minutes: 0,
                is_top_focus:
                  target.is_top_focus && canMarkTopFocus(updatedTasks, nextDate),
                reminder_sent: false,
                reminder_at: undefined,
                subtasks: target.subtasks.map((st) => ({
                  ...st,
                  id: uid('st'),
                  is_completed: false,
                })),
                updated_at: nowIso,
              };
              return {
                ...prev,
                tasks: [spawnedTask, ...updatedTasks],
              };
            }
          }
        }

        return {
          ...prev,
          tasks: updatedTasks,
        };
      });
    },
    [commitState]
  );

  const moveTaskToDate = useCallback(
    (id: string, targetDate: string | null) => {
      commitState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== id) return t;
          const keepTopFocus =
            t.is_top_focus && canMarkTopFocus(prev.tasks, targetDate, id);
          return {
            ...t,
            scheduled_date: targetDate,
            is_top_focus: keepTopFocus,
            updated_at: new Date().toISOString(),
          };
        }),
      }));
    },
    [commitState]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      commitState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((st) =>
                  st.id === subtaskId ? { ...st, is_completed: !st.is_completed } : st
                ),
                updated_at: new Date().toISOString(),
              }
            : t
        ),
      }));
    },
    [commitState]
  );

  const addSubtask = useCallback(
    (taskId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      commitState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: [
                  ...t.subtasks,
                  { id: uid('st'), title: trimmed, is_completed: false },
                ],
                updated_at: new Date().toISOString(),
              }
            : t
        ),
      }));
    },
    [commitState]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      commitState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.filter((st) => st.id !== subtaskId),
                updated_at: new Date().toISOString(),
              }
            : t
        ),
      }));
    },
    [commitState]
  );

  const markReminderSent = useCallback(
    (taskId: string) => {
      commitState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, reminder_sent: true } : t
        ),
      }));
    },
    [commitState]
  );

  const addGoal = useCallback(
    (goal: Omit<Goal, 'id'>) => {
      commitState((prev) => ({
        ...prev,
        goals: [...prev.goals, { ...goal, id: uid('goal') }],
      }));
    },
    [commitState]
  );

  const updateGoal = useCallback(
    (id: string, updates: Partial<Goal>) => {
      commitState((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }));
    },
    [commitState]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      commitState((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== id),
        milestones: prev.milestones.filter((m) => m.goal_id !== id),
        tasks: prev.tasks.map((t) =>
          t.goal_id === id ? { ...t, goal_id: undefined, milestone_id: undefined } : t
        ),
      }));
    },
    [commitState]
  );

  const addMilestone = useCallback(
    (milestone: Omit<Milestone, 'id'>) => {
      commitState((prev) => ({
        ...prev,
        milestones: [...prev.milestones, { ...milestone, id: uid('ms') }],
      }));
    },
    [commitState]
  );

  const toggleMilestone = useCallback(
    (id: string) => {
      commitState((prev) => ({
        ...prev,
        milestones: prev.milestones.map((m) =>
          m.id === id ? { ...m, is_completed: !m.is_completed } : m
        ),
      }));
    },
    [commitState]
  );

  const deleteMilestone = useCallback(
    (id: string) => {
      commitState((prev) => ({
        ...prev,
        milestones: prev.milestones.filter((m) => m.id !== id),
        tasks: prev.tasks.map((t) =>
          t.milestone_id === id ? { ...t, milestone_id: undefined } : t
        ),
      }));
    },
    [commitState]
  );

  const addHabit = useCallback(
    (habit: Omit<Habit, 'id'>) => {
      commitState((prev) => ({
        ...prev,
        habits: [...prev.habits, { ...habit, id: uid('habit') }],
      }));
    },
    [commitState]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      commitState((prev) => ({
        ...prev,
        habits: prev.habits.filter((h) => h.id !== id),
        habitLogs: prev.habitLogs.filter((l) => l.habit_id !== id),
      }));
    },
    [commitState]
  );

  const toggleHabitForDate = useCallback(
    (habitId: string, dateIso: string) => {
      commitState((prev) => {
        const existing = prev.habitLogs.find(
          (l) => l.habit_id === habitId && l.date === dateIso
        );
        if (existing) {
          return {
            ...prev,
            habitLogs: prev.habitLogs.map((l) =>
              l.id === existing.id ? { ...l, completed: !l.completed } : l
            ),
          };
        }
        return {
          ...prev,
          habitLogs: [
            ...prev.habitLogs,
            { id: uid('hl'), habit_id: habitId, date: dateIso, completed: true },
          ],
        };
      });
    },
    [commitState]
  );

  const savePeriodPlan = useCallback(
    (plan: Omit<PeriodPlan, 'id'>) => {
      commitState((prev) => {
        const idx = prev.periodPlans.findIndex(
          (p) => p.period_type === plan.period_type && p.period_key === plan.period_key
        );
        if (idx >= 0) {
          const updated = [...prev.periodPlans];
          updated[idx] = { ...updated[idx], ...plan };
          return { ...prev, periodPlans: updated };
        }
        return {
          ...prev,
          periodPlans: [...prev.periodPlans, { ...plan, id: uid('pp') }],
        };
      });
    },
    [commitState]
  );

  const setDutyShift = useCallback(
    (
      dateIso: string,
      type: DutyShiftType | null,
      note = '',
      autoAddPostShift = false
    ) => {
      commitState((prev) => ({
        ...prev,
        dutyShifts: applyDutyShiftChange(
          prev.dutyShifts || [],
          dateIso,
          type,
          note,
          autoAddPostShift
        ),
      }));
    },
    [commitState]
  );

  const updateSyncConfig = useCallback(
    (config: Partial<SyncConfig>) => {
      commitState((prev) => ({
        ...prev,
        syncConfig: { ...prev.syncConfig, ...config },
      }));
    },
    [commitState]
  );

  const updateNotificationSettings = useCallback(
    (settings: Partial<NotificationSettings>) => {
      commitState((prev) => ({
        ...prev,
        notificationSettings: { ...prev.notificationSettings, ...settings },
      }));
    },
    [commitState]
  );

  const triggerCloudSync = useCallback(
    async (
      direction: 'auto' | 'push' | 'pull' = 'auto'
    ): Promise<{ ok: boolean; message: string }> => {
      setIsSyncing(true);
      try {
        const res = await syncWithSupabase(state, state.syncConfig, direction);
        setSyncStatusMessage(res.message);
        if (res.ok && res.state) {
          setState(res.state);
        }
        return { ok: res.ok, message: res.message };
      } finally {
        setIsSyncing(false);
      }
    },
    [state]
  );

  const importFromJsonString = useCallback((raw: string): { ok: boolean; message: string } => {
    const res = importBackupJson(raw);
    if (!res.ok) {
      return { ok: false, message: res.error };
    }
    saveLocalState(res.state);
    setState(res.state);
    return { ok: true, message: 'Khôi phục dữ liệu từ file JSON thành công!' };
  }, []);

  const resetToSeedData = useCallback(() => {
    const seed = createInitialSeedState(getTodayIso());
    saveLocalState(seed);
    setState(seed);
  }, []);

  const clearAllData = useCallback(() => {
    const seed = createInitialSeedState(getTodayIso());
    const empty: PlannerState = {
      ...seed,
      goals: [],
      milestones: [],
      tasks: [],
      habits: [],
      habitLogs: [],
      periodPlans: [],
      dutyShifts: [],
      updated_at: new Date().toISOString(),
    };
    saveLocalState(empty);
    setState(empty);
  }, []);

  return (
    <PlannerContext.Provider
      value={{
        state,
        selectedDate,
        setSelectedDate,
        syncStatusMessage,
        isSyncing,
        toggleDarkMode,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        moveTaskToDate,
        toggleSubtask,
        addSubtask,
        deleteSubtask,
        markReminderSent,
        addGoal,
        updateGoal,
        deleteGoal,
        addMilestone,
        toggleMilestone,
        deleteMilestone,
        addHabit,
        deleteHabit,
        toggleHabitForDate,
        savePeriodPlan,
        setDutyShift,
        updateSyncConfig,
        updateNotificationSettings,
        triggerCloudSync,
        importFromJsonString,
        resetToSeedData,
        clearAllData,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return ctx;
}
