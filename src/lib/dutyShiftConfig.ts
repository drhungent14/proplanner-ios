import { DutyShiftType } from '../types/planner';

export interface DutyShiftMeta {
  type: DutyShiftType;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  badgeClass: string;
  softClass: string;
  cellClass: string;
  bannerClass: string;
  isPrimaryDuty: boolean;
}

export const DUTY_SHIFT_ORDER: DutyShiftType[] = [
  'shift_24h',
  'shift_night',
  'shift_day',
  'off_morning',
  'off_afternoon',
];

export const DUTY_SHIFT_META: Record<DutyShiftType, DutyShiftMeta> = {
  shift_24h: {
    type: 'shift_24h',
    label: 'Trực 24h',
    shortLabel: 'Trực 24h',
    emoji: '🚨',
    description: 'Ca trực toàn thời gian 24 giờ tại bệnh viện/khoa',
    badgeClass:
      'bg-rose-600 text-white border border-rose-700 shadow-sm',
    softClass:
      'bg-rose-50/75 dark:bg-rose-950/35 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-100/80 dark:hover:bg-rose-900/50 hover:border-rose-300',
    cellClass:
      'bg-rose-50/95 dark:bg-rose-950/50 border-2 border-rose-500 dark:border-rose-500 ring-1 ring-rose-400/50',
    bannerClass:
      'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-700',
    isPrimaryDuty: true,
  },
  shift_night: {
    type: 'shift_night',
    label: 'Trực Đêm',
    shortLabel: 'Trực Đêm',
    emoji: '🌙',
    description: 'Ca trực ban đêm tại bệnh viện/khoa',
    badgeClass:
      'bg-purple-600 text-white border border-purple-700 shadow-sm',
    softClass:
      'bg-purple-50/75 dark:bg-purple-950/35 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60 hover:bg-purple-100/80 dark:hover:bg-purple-900/50 hover:border-purple-300',
    cellClass:
      'bg-purple-50/95 dark:bg-purple-950/50 border-2 border-purple-500 dark:border-purple-500 ring-1 ring-purple-400/50',
    bannerClass:
      'bg-gradient-to-r from-purple-700 to-indigo-700 text-white border-purple-800',
    isPrimaryDuty: true,
  },
  shift_day: {
    type: 'shift_day',
    label: 'Trực Ngày',
    shortLabel: 'Trực Ngày',
    emoji: '☀️',
    description: 'Ca trực ban ngày / trực hành chính / trực cuối tuần',
    badgeClass:
      'bg-amber-500 text-white border border-amber-600 shadow-sm',
    softClass:
      'bg-amber-50/75 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 hover:border-amber-300',
    cellClass:
      'bg-amber-50/95 dark:bg-amber-950/45 border-2 border-amber-500 dark:border-amber-500 ring-1 ring-amber-400/50',
    bannerClass:
      'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-600',
    isPrimaryDuty: true,
  },
  off_morning: {
    type: 'off_morning',
    label: 'Ra trực Sáng',
    shortLabel: 'Ra trực Sáng',
    emoji: '🌿',
    description: 'Buổi sáng ra trực nghỉ ngơi hồi sức sau ca trực',
    badgeClass:
      'bg-teal-600 text-white border border-teal-700 shadow-sm',
    softClass:
      'bg-teal-50/75 dark:bg-teal-950/35 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60 hover:bg-teal-100/80 dark:hover:bg-teal-900/50 hover:border-teal-300',
    cellClass:
      'bg-teal-50/85 dark:bg-teal-950/40 border-2 border-teal-400 dark:border-teal-600',
    bannerClass:
      'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-700',
    isPrimaryDuty: false,
  },
  off_afternoon: {
    type: 'off_afternoon',
    label: 'Ra trực Chiều',
    shortLabel: 'Ra trực Chiều',
    emoji: '🍃',
    description: 'Buổi chiều ra trực nghỉ ngơi hồi sức',
    badgeClass:
      'bg-emerald-600 text-white border border-emerald-700 shadow-sm',
    softClass:
      'bg-emerald-50/75 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 hover:border-emerald-300',
    cellClass:
      'bg-emerald-50/85 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-600',
    bannerClass:
      'bg-gradient-to-r from-emerald-600 to-green-600 text-white border-emerald-700',
    isPrimaryDuty: false,
  },
};
