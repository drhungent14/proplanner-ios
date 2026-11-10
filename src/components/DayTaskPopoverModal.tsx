import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Check,
  X,
  CalendarDays,
  Clock,
  Repeat,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { DUTY_SHIFT_META } from '../lib/dutyShiftConfig';
import { sortTasksByPriorityAndTime } from '../lib/plannerEngine';
import {
  PRIORITY_STYLE,
  RECURRENCE_LABEL,
  RECURRENCE_OPTIONS,
} from '../lib/priorityConfig';
import { DutyShiftIcon, PriorityIcon } from './PlannerIcons';
import { CustomSelect, CustomTimePicker } from './CustomPickers';
import { Priority, RecurrenceType, Task } from '../types/planner';

interface DayTaskPopoverModalProps {
  dateIso: string | null; // null = Chờ xếp lịch (Backlog)
  onClose: () => void;
  onChangeDate: (nextDateIso: string) => void;
}

const VI_WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const PRIORITY_OPTIONS: { key: Priority; label: string }[] = [
  { key: 'urgent', label: 'Khẩn cấp' },
  { key: 'high', label: 'Ưu tiên cao' },
  { key: 'medium', label: 'Trung bình' },
  { key: 'low', label: 'Thấp' },
];

function formatVietnameseDate(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayName = VI_WEEKDAYS[dt.getUTCDay()];
  return `${dayName}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function stepDateIso(dateIso: string, delta: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export const DayTaskPopoverModal: React.FC<DayTaskPopoverModalProps> = ({
  dateIso,
  onClose,
  onChangeDate,
}) => {
  const {
    state,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
  } = usePlanner();

  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceType>('none');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType>('none');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setEditingTaskId(null);
  }, [dateIso]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !editingTaskId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, editingTaskId]);

  const dayTasks = sortTasksByPriorityAndTime(
    state.tasks.filter(
      (t) => t.scheduled_date === dateIso && t.status !== 'cancelled'
    )
  );
  const doneCount = dayTasks.filter((t) => t.status === 'done').length;
  const completionPct =
    dayTasks.length > 0 ? Math.round((doneCount / dayTasks.length) * 100) : 0;

  const shift = dateIso
    ? (state.dutyShifts || []).find((s) => s.date === dateIso)
    : undefined;
  const shiftMeta = shift ? DUTY_SHIFT_META[shift.type] : null;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    addTask({
      title: trimmed,
      scheduled_date: dateIso,
      priority: newPriority,
      start_time: newStartTime || undefined,
      end_time: newEndTime || undefined,
      recurrence: newRecurrence,
    });
    setNewTitle('');
    setNewStartTime('');
    setNewEndTime('');
    setNewRecurrence('none');
    inputRef.current?.focus();
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditStartTime(task.start_time || '');
    setEditEndTime(task.end_time || '');
    setEditPriority(task.priority);
    setEditRecurrence(task.recurrence || 'none');
  };

  const saveEditingTask = (taskId: string) => {
    if (!editTitle.trim()) return;
    updateTask(taskId, {
      title: editTitle.trim(),
      start_time: editStartTime || undefined,
      end_time: editEndTime || undefined,
      priority: editPriority,
      recurrence: editRecurrence,
    });
    setEditingTaskId(null);
  };

  return (
    <div
      data-testid="day-task-popover"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header chuyên nghiệp: Tên ngày + Ca trực + Thanh tiến độ + Điều hướng ngày */}
        <div
          className={`px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 ${
            shiftMeta
              ? shiftMeta.cellClass
              : 'bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  {dateIso ? formatVietnameseDate(dateIso) : 'Danh sách Chờ xếp lịch'}
                </h4>
                {shiftMeta && shift && (
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 shadow-2xs ${shiftMeta.badgeClass}`}
                  >
                    <DutyShiftIcon type={shift.type} className="w-3.5 h-3.5" />
                    <span>{shiftMeta.label}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Hoàn thành <strong className="text-slate-700 dark:text-slate-200">{doneCount}/{dayTasks.length}</strong> công việc ({completionPct}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {dateIso && (
                <>
                  <button
                    type="button"
                    onClick={() => onChangeDate(stepDateIso(dateIso, -1))}
                    title="Ngày hôm trước"
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Hôm trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeDate(stepDateIso(dateIso, 1))}
                    title="Ngày kế tiếp"
                    className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition"
                  >
                    <span className="hidden sm:inline">Kế tiếp</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                title="Đóng bảng quản lý ngày"
                className="p-1.5 rounded-xl bg-white/90 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 dark:border-slate-700 transition ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {dayTasks.length > 0 && (
            <div className="w-full h-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Nội dung chính: Khung thêm công việc chuyên nghiệp + Danh sách việc trong ngày */}
        <div className="p-6 space-y-5">
          <form
            onSubmit={handleAddTask}
            className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3"
          >
            <div>
              <input
                ref={inputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nhập tên công việc cho ngày đang chọn rồi nhấn Enter..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${PRIORITY_STYLE[newPriority].cardClass} placeholder:text-slate-500 dark:placeholder:text-slate-400`}
              />
            </div>

            {/* Hàng chọn Mức độ ưu tiên đồng bộ icon */}
            <div className="flex flex-wrap items-center gap-1.5">
              {PRIORITY_OPTIONS.map((item) => {
                const active = newPriority === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setNewPriority(item.key)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition ${
                      active
                        ? `${PRIORITY_STYLE[item.key].cardClass} ring-2 ring-offset-1 ring-indigo-500 scale-[1.02]`
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <PriorityIcon priority={item.key} className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Hàng chọn Khung giờ (Giờ bắt đầu -> Giờ kết thúc) đồng bộ Lịch trình theo khung giờ + Nút Thêm */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
                <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500">Khung giờ:</span>
                <CustomTimePicker
                  ariaLabel="Giờ bắt đầu"
                  value={newStartTime}
                  onChange={(val) => setNewStartTime(val)}
                  placeholder="Bắt đầu"
                />
                <span className="text-slate-400 font-bold">→</span>
                <CustomTimePicker
                  ariaLabel="Giờ kết thúc"
                  value={newEndTime}
                  onChange={(val) => setNewEndTime(val)}
                  placeholder="Kết thúc"
                />
              </div>

              <CustomSelect
                ariaLabel="Lặp lại công việc"
                headerTitle="Chu kỳ lặp lại tự động"
                value={newRecurrence}
                onChange={(val) => setNewRecurrence(val as RecurrenceType)}
                className="bg-white dark:bg-slate-900"
                menuWidthClass="min-w-[200px]"
                options={RECURRENCE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                  icon: <Repeat className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
                }))}
              />

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition ml-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm vào ngày</span>
              </button>
            </div>
          </form>

          {/* Danh sách việc trong ngày */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {dayTasks.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Chưa có công việc nào trong ngày này. Nhập tên việc và khung giờ bên trên để lên lịch!
              </div>
            ) : (
              dayTasks.map((task) => {
                const isDone = task.status === 'done';
                const isEditing = editingTaskId === task.id;
                const prio = PRIORITY_STYLE[task.priority];

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-2xl border ${prio.cardClass} text-xs transition ${
                      isDone ? 'opacity-60' : 'shadow-sm hover:shadow'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditingTask(task.id);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                          placeholder="Tên công việc"
                          className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-400 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-0.5">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              <CustomTimePicker
                                ariaLabel="Sửa giờ bắt đầu"
                                value={editStartTime}
                                onChange={(val) => setEditStartTime(val)}
                                placeholder="Bắt đầu"
                              />
                              <span className="text-slate-400">→</span>
                              <CustomTimePicker
                                ariaLabel="Sửa giờ kết thúc"
                                value={editEndTime}
                                onChange={(val) => setEditEndTime(val)}
                                placeholder="Kết thúc"
                              />
                            </div>
                            <CustomSelect
                              value={editPriority}
                              onChange={(val) => setEditPriority(val as Priority)}
                              className="bg-white dark:bg-slate-900"
                              menuWidthClass="min-w-[170px]"
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
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => saveEditingTask(task.id)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold inline-flex items-center gap-0.5"
                            >
                              <Check className="w-3 h-3" />
                              <span>Lưu sửa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTaskStatus(task.id)}
                          className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 opacity-50 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <p
                              className={`font-semibold text-[13px] leading-snug break-words ${
                                isDone ? 'line-through opacity-75' : ''
                              }`}
                            >
                              {task.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none inline-flex items-center gap-1 ${prio.badgeClass}`}
                              >
                                <PriorityIcon priority={task.priority} className="w-3 h-3" />
                                <span>{prio.label}</span>
                              </span>
                              {task.start_time && (
                                <span className="text-[10.5px] font-mono font-semibold bg-white/75 dark:bg-slate-900/65 px-2 py-0.5 rounded-md leading-none inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-indigo-500" />
                                  <span>
                                    {task.start_time}
                                    {task.end_time ? ` - ${task.end_time}` : ''}
                                  </span>
                                </span>
                              )}
                              {task.recurrence && task.recurrence !== 'none' && (
                                <span className="text-[10px] font-semibold bg-violet-600 text-white px-1.5 py-0.5 rounded-md leading-none inline-flex items-center gap-1">
                                  <Repeat className="w-3 h-3" />
                                  <span>{RECURRENCE_LABEL[task.recurrence]}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditingTask(task)}
                            title="Sửa công việc"
                            className="p-1.5 rounded-lg opacity-75 hover:opacity-100 hover:bg-white/60 dark:hover:bg-slate-800 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            title="Xóa công việc"
                            className="p-1.5 rounded-lg opacity-75 hover:opacity-100 hover:text-rose-700 hover:bg-white/60 dark:hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
