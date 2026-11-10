export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused';
export type ProgressMode = 'auto_from_tasks' | 'auto_from_milestones' | 'manual';
export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type DutyShiftType =
  | 'shift_24h'
  | 'shift_night'
  | 'shift_day'
  | 'off_morning'
  | 'off_afternoon';

export interface DutyShift {
  id: string;
  date: string; // YYYY-MM-DD
  type: DutyShiftType;
  note?: string;
}

export interface LifeArea {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  start_date: string;
  due_date: string;
  is_completed: boolean;
  order_index: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category_id: string;
  start_date: string;
  target_date: string;
  status: GoalStatus;
  progress_mode: ProgressMode;
  manual_progress: number;
}

export interface Subtask {
  id: string;
  title: string;
  is_completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  category_id: string;
  goal_id?: string;
  milestone_id?: string;
  status: TaskStatus;
  priority: Priority;
  scheduled_date: string | null; // YYYY-MM-DD or null for Inbox
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  estimated_minutes?: number;
  actual_minutes?: number;
  is_top_focus: boolean;
  recurrence: RecurrenceType;
  reminder_at?: string; // ISO string or HH:mm
  reminder_sent: boolean;
  subtasks: Subtask[];
  updated_at: string;
}

export interface Habit {
  id: string;
  title: string;
  category_id: string;
  goal_id?: string;
  frequency: number[]; // 0=Sun..6=Sat
  target_per_day: number;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface PeriodPlan {
  id: string;
  period_type: 'month' | 'week';
  period_key: string; // e.g., '2026-11' or '2026-W46'
  focus_goals: string[];
  reflection_notes: string;
}

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  profileKey: string; // Shared profile ID between PC and iPhone (default 'personal-main')
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface NotificationSettings {
  browserEnabled: boolean;
  soundEnabled: boolean;
  morningPlanTime: string; // e.g. '08:00'
  eveningReviewTime: string; // e.g. '21:00'
}

export interface PlannerState {
  version: number;
  updated_at: string;
  darkMode: boolean;
  categories: LifeArea[];
  goals: Goal[];
  milestones: Milestone[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  periodPlans: PeriodPlan[];
  dutyShifts: DutyShift[];
  syncConfig: SyncConfig;
  notificationSettings: NotificationSettings;
}

export interface DailyTrendPoint {
  date: string;
  label: string;
  completed: number;
  total: number;
  rate: number;
}

export interface CategoryDistributionItem {
  categoryId: string;
  name: string;
  color: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueCount: number;
  bestHabitStreak: number;
  averageGoalProgress: number;
  last7DaysTrend: DailyTrendPoint[];
  categoryDistribution: CategoryDistributionItem[];
}
