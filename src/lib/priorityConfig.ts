import { Priority, RecurrenceType } from '../types/planner';

export const PRIORITY_STYLE: Record<
  Priority,
  { label: string; cardClass: string; monthPillClass: string; badgeClass: string; dotClass: string }
> = {
  urgent: {
    label: 'Khẩn cấp',
    cardClass:
      'bg-rose-50/95 dark:bg-rose-950/40 border-rose-200/90 dark:border-rose-800/70 text-rose-950 dark:text-rose-100 hover:border-rose-300 dark:hover:border-rose-700',
    monthPillClass:
      'bg-rose-100/95 dark:bg-rose-950/75 text-rose-900 dark:text-rose-100 border border-rose-200/90 dark:border-rose-800/80 font-semibold',
    badgeClass: 'bg-rose-600 text-white',
    dotClass: 'bg-rose-500',
  },
  high: {
    label: 'Ưu tiên cao',
    cardClass:
      'bg-amber-50/95 dark:bg-amber-950/35 border-amber-200/90 dark:border-amber-800/70 text-amber-950 dark:text-amber-100 hover:border-amber-300 dark:hover:border-amber-700',
    monthPillClass:
      'bg-amber-100/95 dark:bg-amber-950/70 text-amber-900 dark:text-amber-100 border border-amber-200/90 dark:border-amber-800/80 font-semibold',
    badgeClass: 'bg-amber-600 text-white',
    dotClass: 'bg-amber-500',
  },
  medium: {
    label: 'Trung bình',
    cardClass:
      'bg-indigo-50/90 dark:bg-indigo-950/35 border-indigo-200/85 dark:border-indigo-800/70 text-indigo-950 dark:text-indigo-100 hover:border-indigo-300 dark:hover:border-indigo-700',
    monthPillClass:
      'bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-100 border border-indigo-200/85 dark:border-indigo-800/80 font-semibold',
    badgeClass: 'bg-indigo-600 text-white',
    dotClass: 'bg-indigo-500',
  },
  low: {
    label: 'Thấp',
    cardClass:
      'bg-slate-50/95 dark:bg-slate-800/65 border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600',
    monthPillClass:
      'bg-slate-100/95 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 font-medium',
    badgeClass: 'bg-slate-600 text-white',
    dotClass: 'bg-slate-400',
  },
};

export const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; shortLabel: string }[] = [
  { value: 'none', label: 'Không lặp lại', shortLabel: 'Không lặp' },
  { value: 'daily', label: 'Hàng ngày', shortLabel: 'Hàng ngày' },
  { value: 'weekdays', label: 'Thứ 2 – Thứ 6', shortLabel: 'T2–T6' },
  { value: 'weekly', label: 'Hàng tuần', shortLabel: 'Hàng tuần' },
  { value: 'monthly', label: 'Hàng tháng', shortLabel: 'Hàng tháng' },
];

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  none: 'Không lặp',
  daily: 'Hàng ngày',
  weekdays: 'T2–T6',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};
