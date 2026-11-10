import React, { useState } from 'react';
import { Flame, Plus, Calendar, Clock, Target, AlertCircle, Repeat } from 'lucide-react';
import { Priority, RecurrenceType } from '../types/planner';
import { usePlanner } from '../context/PlannerContext';
import { RECURRENCE_OPTIONS } from '../lib/priorityConfig';
import { CategoryIcon, PriorityIcon } from './PlannerIcons';
import { CustomSelect, CustomTimePicker } from './CustomPickers';

interface QuickAddBarProps {
  defaultDate?: string | null;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({ defaultDate }) => {
  const { state, selectedDate, addTask } = usePlanner();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [categoryId, setCategoryId] = useState<string>(state.categories[0]?.id || 'work');
  const [goalId, setGoalId] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [isTopFocus, setIsTopFocus] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveDate = defaultDate === undefined ? selectedDate : defaultDate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = addTask({
      title,
      priority,
      category_id: categoryId,
      goal_id: goalId || undefined,
      scheduled_date: effectiveDate,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      recurrence,
      is_top_focus: isTopFocus,
    });

    if (!res.ok) {
      setErrorMsg(res.message || 'Không thể thêm công việc.');
      return;
    }

    setTitle('');
    setStartTime('');
    setEndTime('');
    setRecurrence('none');
    setIsTopFocus(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Thêm nhanh công việc mới... (Nhấn Enter để lưu ngay)"
              className="w-full pl-3.5 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm việc</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Chọn Danh mục */}
          <CustomSelect
            ariaLabel="Danh mục"
            headerTitle="Danh mục công việc"
            value={categoryId}
            onChange={(val) => setCategoryId(val)}
            options={state.categories.map((cat) => ({
              value: cat.id,
              label: cat.name,
              icon: (
                <CategoryIcon
                  categoryId={cat.id}
                  className="w-3.5 h-3.5 text-indigo-500 shrink-0"
                />
              ),
            }))}
          />

          {/* Chọn Mức độ ưu tiên */}
          <CustomSelect
            ariaLabel="Mức ưu tiên"
            headerTitle="Mức độ ưu tiên"
            value={priority}
            onChange={(val) => setPriority(val as Priority)}
            menuWidthClass="min-w-[180px]"
            options={[
              {
                value: 'urgent',
                label: 'Khẩn cấp',
                icon: <PriorityIcon priority="urgent" className="w-3.5 h-3.5 text-rose-500" />,
              },
              {
                value: 'high',
                label: 'Ưu tiên cao',
                icon: <PriorityIcon priority="high" className="w-3.5 h-3.5 text-amber-500" />,
              },
              {
                value: 'medium',
                label: 'Trung bình',
                icon: <PriorityIcon priority="medium" className="w-3.5 h-3.5 text-indigo-500" />,
              },
              {
                value: 'low',
                label: 'Thấp',
                icon: <PriorityIcon priority="low" className="w-3.5 h-3.5 text-emerald-500" />,
              },
            ]}
          />

          {/* Gắn Mục tiêu lớn */}
          <CustomSelect
            ariaLabel="Gắn mục tiêu"
            headerTitle="Gắn với Mục tiêu dài hạn"
            value={goalId}
            onChange={(val) => setGoalId(val)}
            className="max-w-[230px]"
            menuWidthClass="min-w-[280px] max-w-[360px]"
            options={[
              {
                value: '',
                label: '-- Không gắn mục tiêu --',
                icon: <Target className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
              },
              ...state.goals.map((g) => ({
                value: g.id,
                label: g.title,
                icon: <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
              })),
            ]}
          />

          {/* Khung giờ Time-blocking */}
          <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 rounded-xl px-2.5 py-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <CustomTimePicker
              ariaLabel="Giờ bắt đầu"
              value={startTime}
              onChange={(val) => setStartTime(val)}
              placeholder="Bắt đầu"
            />
            <span className="text-slate-400 font-bold">→</span>
            <CustomTimePicker
              ariaLabel="Giờ kết thúc"
              value={endTime}
              onChange={(val) => setEndTime(val)}
              placeholder="Kết thúc"
            />
          </div>

          {/* Chu kỳ lặp lại công việc (Recurrence) */}
          <CustomSelect
            ariaLabel="Lặp lại"
            headerTitle="Chu kỳ lặp lại tự động"
            value={recurrence}
            onChange={(val) => setRecurrence(val as RecurrenceType)}
            menuWidthClass="min-w-[210px]"
            options={RECURRENCE_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.label,
              icon: <Repeat className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
            }))}
          />

          {/* Nút đánh dấu Top 3 Tiêu điểm Ngày */}
          {effectiveDate !== null && (
            <button
              type="button"
              onClick={() => setIsTopFocus((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-medium transition ${
                isTopFocus
                  ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Top 3 Hôm nay</span>
            </button>
          )}

          {effectiveDate && (
            <span className="inline-flex items-center gap-1 text-slate-400 ml-auto">
              <Calendar className="w-3.5 h-3.5" />
              <span>Ngày: {effectiveDate}</span>
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>
    </div>
  );
};
