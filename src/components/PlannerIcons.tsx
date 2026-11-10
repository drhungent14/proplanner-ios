import React from 'react';
import {
  Flame,
  Zap,
  Flag,
  Leaf,
  ShieldAlert,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Briefcase,
  Wallet,
  GraduationCap,
  HeartPulse,
  Sparkles,
  Folder,
} from 'lucide-react';
import { DutyShiftType, Priority } from '../types/planner';

interface IconProps {
  className?: string;
}

export const PriorityIcon: React.FC<{ priority: Priority; className?: string }> = ({
  priority,
  className = 'w-3.5 h-3.5 shrink-0',
}) => {
  switch (priority) {
    case 'urgent':
      return <Flame className={className} />;
    case 'high':
      return <Zap className={className} />;
    case 'medium':
      return <Flag className={className} />;
    case 'low':
    default:
      return <Leaf className={className} />;
  }
};

export const DutyShiftIcon: React.FC<{ type: DutyShiftType; className?: string }> = ({
  type,
  className = 'w-3.5 h-3.5 shrink-0',
}) => {
  switch (type) {
    case 'shift_24h':
      return <ShieldAlert className={className} />;
    case 'shift_night':
      return <Moon className={className} />;
    case 'shift_day':
      return <Sun className={className} />;
    case 'off_morning':
      return <Sunrise className={className} />;
    case 'off_afternoon':
    default:
      return <Sunset className={className} />;
  }
};

export const CategoryIcon: React.FC<{
  iconName?: string;
  categoryId?: string;
  className?: string;
}> = ({ iconName, categoryId, className = 'w-3.5 h-3.5 shrink-0' }) => {
  const key = iconName || categoryId || '';
  switch (key) {
    case 'Briefcase':
    case 'work':
      return <Briefcase className={className} />;
    case 'Wallet':
    case 'finance':
      return <Wallet className={className} />;
    case 'GraduationCap':
    case 'study':
      return <GraduationCap className={className} />;
    case 'HeartPulse':
    case 'health':
      return <HeartPulse className={className} />;
    case 'Sparkles':
    case 'personal':
      return <Sparkles className={className} />;
    default:
      return <Folder className={className} />;
  }
};

export const SectionIconBadge: React.FC<{
  children: React.ReactNode;
  tone?: 'indigo' | 'amber' | 'emerald' | 'rose' | 'violet' | 'slate';
  size?: 'sm' | 'md';
}> = ({ children, tone = 'indigo', size = 'md' }) => {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    indigo:
      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/70',
    amber:
      'bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/70',
    emerald:
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/70',
    rose:
      'bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/70',
    violet:
      'bg-violet-50 text-violet-600 dark:bg-violet-950/80 dark:text-violet-400 border-violet-200/60 dark:border-violet-800/70',
    slate:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60 dark:border-slate-700',
  };

  return (
    <div
      className={`${
        size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-8 h-8 rounded-xl'
      } border flex items-center justify-center shrink-0 ${toneClasses[tone]}`}
    >
      {children}
    </div>
  );
};
