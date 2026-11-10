import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Timer,
  Calendar,
  History,
  ListTodo,
  Repeat,
  X,
  Flame,
  AlertTriangle,
  Plus,
  Trash2,
  Bell,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Pencil,
  GripHorizontal,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import {
  calculateHabitStreak,
  getTasksForDate,
  getTimelineBlockMetrics,
  toLocalDatetimeInputValue,
} from '../lib/plannerEngine';
import { getTodayIso } from '../lib/seedData';
import { DUTY_SHIFT_META, DUTY_SHIFT_ORDER } from '../lib/dutyShiftConfig';
import { RECURRENCE_LABEL, RECURRENCE_OPTIONS } from '../lib/priorityConfig';
import { QuickAddBar } from '../components/QuickAddBar';
import { PomodoroWidget } from '../components/PomodoroWidget';
import {
  CategoryIcon,
  DutyShiftIcon,
  PriorityIcon,
  SectionIconBadge,
} from '../components/PlannerIcons';
import {
  CustomDateTimePicker,
  CustomSelect,
  CustomTimePicker,
} from '../components/CustomPickers';
import { DutyShiftType, Priority, RecurrenceType, Task } from '../types/planner';

const PRIORITY_BADGE: Record<Task['priority'], { label: string; cls: string }> = {
  urgent: {
    label: 'Khẩn cấp',
    cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
  },
  high: {
    label: 'Ưu tiên cao',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
  },
  medium: {
    label: 'Trung bình',
    cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300',
  },
  low: {
    label: 'Thấp',
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
};

function minutesToHHMM(totalMins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 55, Math.round(totalMins)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const DailyFocusView: React.FC = () => {
  const {
    state,
    selectedDate,
    setSelectedDate,
    addTask,
    toggleTaskStatus,
    updateTask,
    deleteTask,
    moveTaskToDate,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    toggleHabitForDate,
    addHabit,
    deleteHabit,
    setDutyShift,
  } = usePlanner();

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState<Record<string, string>>({});
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [feedbackAlert, setFeedbackAlert] = useState<string | null>(null);

  // Đồng hồ thời gian thực cho Vạch Đỏ Giờ Hiện Tại (chỉ lấy đến phút HH:mm)
  const [nowTime, setNowTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNowTime(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // Kéo di chuyển (Move) & Kéo giãn thời lượng (Resize) trực tiếp trên Lịch trình theo khung giờ
  const [timelineInteraction, setTimelineInteraction] = useState<{
    taskId: string;
    mode: 'move' | 'resize';
    startY: number;
    origStartMins: number;
    origDurationMins: number;
    previewStartMins: number;
    previewDurationMins: number;
  } | null>(null);

  // Kéo việc từ danh sách bên trái thả vào khung giờ bên phải
  const [draggedListTaskId, setDraggedListTaskId] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  // Click nhanh vào khung giờ trống để thêm việc ngay tại khung giờ đó
  const [quickSlotHour, setQuickSlotHour] = useState<number | null>(null);
  const [quickSlotTitle, setQuickSlotTitle] = useState('');
  const quickSlotInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quickSlotHour !== null) {
      quickSlotInputRef.current?.focus();
    }
  }, [quickSlotHour]);

  const todayIso = getTodayIso();
  const isViewingToday = selectedDate === todayIso;
  const isViewingFuture = selectedDate > todayIso;

  const { topFocus, scheduled, overdue } = getTasksForDate(
    state.tasks,
    selectedDate,
    todayIso
  );
  const completedToday = scheduled.filter((t) => t.status === 'done').length;

  const getCategory = (id: string) => state.categories.find((c) => c.id === id);
  const getGoal = (id?: string) => state.goals.find((g) => g.id === id);

  const handleToggleTopFocus = (task: Task) => {
    setFeedbackAlert(null);
    const res = updateTask(task.id, { is_top_focus: !task.is_top_focus });
    if (!res.ok && res.message) {
      setFeedbackAlert(res.message);
    }
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    addHabit({
      title: newHabitTitle.trim(),
      category_id: state.categories[0]?.id || 'health',
      frequency: [0, 1, 2, 3, 4, 5, 6],
      target_per_day: 1,
    });
    setNewHabitTitle('');
  };

  const HOUR_HEIGHT = 88; // 88px mỗi khung 1 giờ để hiển thị đầy đủ Tên việc, Mức ưu tiên, Thời lượng & Danh mục
  let minHour = 6;
  let maxHour = 23;

  // Xử lý kéo di chuyển (Move) & kéo giãn thời lượng (Resize) trên Lịch trình theo khung giờ (bước nhảy 15 phút)
  useEffect(() => {
    if (!timelineInteraction) return;

    const handleMove = (ev: MouseEvent) => {
      const deltaY = ev.clientY - timelineInteraction.startY;
      const deltaMins = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15;

      if (timelineInteraction.mode === 'move') {
        const clampedStart = Math.max(
          minHour * 60,
          Math.min(
            23 * 60 + 45 - timelineInteraction.origDurationMins,
            timelineInteraction.origStartMins + deltaMins
          )
        );
        setTimelineInteraction((prev) =>
          prev ? { ...prev, previewStartMins: clampedStart } : null
        );
      } else {
        const clampedDuration = Math.max(
          30,
          Math.min(
            24 * 60 - timelineInteraction.origStartMins,
            timelineInteraction.origDurationMins + deltaMins
          )
        );
        setTimelineInteraction((prev) =>
          prev ? { ...prev, previewDurationMins: clampedDuration } : null
        );
      }
    };

    const handleUp = () => {
      if (
        timelineInteraction.previewStartMins !== timelineInteraction.origStartMins ||
        timelineInteraction.previewDurationMins !== timelineInteraction.origDurationMins
      ) {
        const nextStart = minutesToHHMM(timelineInteraction.previewStartMins);
        const nextEnd = minutesToHHMM(
          timelineInteraction.previewStartMins + timelineInteraction.previewDurationMins
        );
        updateTask(timelineInteraction.taskId, {
          start_time: nextStart,
          end_time: nextEnd,
          estimated_minutes: timelineInteraction.previewDurationMins,
        });
      }
      setTimelineInteraction(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [timelineInteraction, minHour, updateTask]);

  const handleCreateQuickSlotTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSlotHour === null || !quickSlotTitle.trim()) return;
    const sh = String(quickSlotHour).padStart(2, '0');
    const eh = String(Math.min(23, quickSlotHour + 1)).padStart(2, '0');
    addTask({
      title: quickSlotTitle.trim(),
      scheduled_date: selectedDate,
      start_time: `${sh}:00`,
      end_time: `${eh}:00`,
      estimated_minutes: 60,
    });
    setQuickSlotTitle('');
    setQuickSlotHour(null);
  };

  const nowHHMM = `${String(nowTime.getHours()).padStart(2, '0')}:${String(
    nowTime.getMinutes()
  ).padStart(2, '0')}`;
  const nowDecimalHour = nowTime.getHours() + nowTime.getMinutes() / 60;

  const rawTimedTasks = scheduled
    .map((t) => {
      const metrics = getTimelineBlockMetrics(t.start_time, t.end_time);
      if (!metrics) return null;
      const startH = metrics.startHour;
      const endH = Math.min(24, startH + metrics.durationMinutes / 60);
      if (Math.floor(startH) < minHour) minHour = Math.max(0, Math.floor(startH));
      if (Math.ceil(endH) > maxHour) maxHour = Math.min(23, Math.ceil(endH));
      return {
        task: t,
        metrics,
        startH,
        endH,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.startH - b.startH || b.metrics.durationMinutes - a.metrics.durationMinutes);

  // Tính cột cho các việc trùng khung giờ để không đè lên nhau, còn việc đơn lẻ chiếm trọn 100% chiều ngang
  const positionedTimedTasks = rawTimedTasks.map((item, idx, arr) => {
    const overlapping = arr.filter(
      (other) => other.startH < item.endH && other.endH > item.startH
    );
    const colIndex = overlapping.findIndex((o) => o.task.id === item.task.id);
    const totalCols = Math.max(1, overlapping.length);
    return {
      ...item,
      colIndex: colIndex >= 0 ? colIndex : 0,
      totalCols,
    };
  });

  const timelineHours = Array.from(
    { length: maxHour - minHour + 1 },
    (_, idx) => minHour + idx
  );

  const dutyShifts = state.dutyShifts || [];
  const todayShift = dutyShifts.find((s) => s.date === selectedDate);
  const todayShiftMeta = todayShift ? DUTY_SHIFT_META[todayShift.type] : null;

  const [y, m, d] = selectedDate.split('-').map(Number);
  const tomorrowIso = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const tomorrowShift = dutyShifts.find((s) => s.date === tomorrowIso);
  const tomorrowShiftMeta = tomorrowShift ? DUTY_SHIFT_META[tomorrowShift.type] : null;

  return (
    <div className="space-y-6">
      {/* Thanh thông báo khi đang xem Ngày Tương Lai hoặc Ngày Quá Khứ (khác Hôm nay thực tế) */}
      {!isViewingToday && (
        <div className="bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200">
            <div className="p-1.5 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-300 shrink-0">
              {isViewingFuture ? (
                <Calendar className="w-4 h-4" />
              ) : (
                <History className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="font-bold">
                {isViewingFuture
                  ? `Bạn đang xem trước kế hoạch Ngày tương lai: ${selectedDate}`
                  : `Bạn đang xem lại lịch Ngày quá khứ: ${selectedDate}`}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 ml-1.5">
                (Hôm nay thực tế: {todayIso})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(todayIso)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shrink-0 shadow-xs"
          >
            Quay về Hôm nay ({todayIso})
          </button>
        </div>
      )}

      {/* Khung Banner Lịch Trực Bác Sĩ nổi bật trong ngày */}
      <div
        className={`rounded-2xl p-4 border shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          todayShiftMeta
            ? todayShiftMeta.bannerClass
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${
              todayShiftMeta
                ? 'bg-white/20 text-white'
                : 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
            }`}
          >
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm md:text-base inline-flex items-center gap-1.5">
                {todayShiftMeta && todayShift && (
                  <DutyShiftIcon type={todayShift.type} className="w-4 h-4" />
                )}
                <span>
                  {todayShiftMeta
                    ? `${
                        isViewingToday ? 'HÔM NAY' : `NGÀY ${selectedDate}`
                      }: ${todayShiftMeta.label.toUpperCase()}`
                    : isViewingToday
                    ? 'Hôm nay không có lịch trực viện'
                    : `Ngày ${selectedDate} không có lịch trực viện`}
                </span>
              </span>
              {tomorrowShiftMeta && tomorrowShiftMeta.isPrimaryDuty && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-300 text-slate-900 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Lưu ý: {isViewingToday ? 'Ngày mai' : 'Ngày kế tiếp'} ({tomorrowIso}) có{' '}
                    {tomorrowShiftMeta.label}!
                  </span>
                </span>
              )}
            </div>
            {todayShift?.note && (
              <p
                className={`text-xs mt-0.5 ${
                  todayShiftMeta ? 'text-white/90' : 'text-slate-500'
                }`}
              >
                {todayShift.note}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {DUTY_SHIFT_ORDER.map((type) => {
            const meta = DUTY_SHIFT_META[type];
            const isCurrent = todayShift?.type === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setDutyShift(selectedDate, isCurrent ? null : type, '', true)
                }
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-white text-slate-900 shadow ring-2 ring-white'
                    : todayShiftMeta
                    ? 'bg-black/20 hover:bg-black/30 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200'
                }`}
              >
                <DutyShiftIcon type={type} className="w-3.5 h-3.5" />
                <span>{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thanh nhập việc siêu tốc */}
      <QuickAddBar defaultDate={selectedDate} />

      {feedbackAlert && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium flex justify-between items-center">
          <span>{feedbackAlert}</span>
          <button
            type="button"
            onClick={() => setFeedbackAlert(null)}
            className="p-1 rounded-lg hover:bg-amber-200/50 ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cảnh báo việc quá hạn (Overdue): Chỉ hiển thị khi đang ở Ngày Hôm Nay thực tế và chỉ tính các việc < todayIso */}
      {isViewingToday && overdue.length > 0 && (
        <div className="bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>
                Công việc tồn đọng quá hạn ({overdue.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => overdue.forEach((t) => moveTaskToDate(t.id, todayIso))}
              className="text-xs font-semibold px-3 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
            >
              Chuyển tất cả sang Hôm nay
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {overdue.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-rose-200/70 dark:border-rose-900/60 text-xs"
              >
                <div className="truncate pr-2">
                  <span className="font-semibold">{t.title}</span>
                  <span className="text-rose-500 ml-2">({t.scheduled_date})</span>
                </div>
                <button
                  type="button"
                  onClick={() => moveTaskToDate(t.id, todayIso)}
                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold shrink-0 hover:underline"
                >
                  <span>Làm hôm nay</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Khung Top 3 Tiêu điểm Ngày */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SectionIconBadge tone="amber">
              <Flame className="w-4 h-4" />
            </SectionIconBadge>
            <h3 className="font-bold text-base">
              {isViewingToday
                ? 'Tiêu điểm hôm nay (Top 3)'
                : `Tiêu điểm ngày ${selectedDate} (Top 3)`}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Đã chọn {topFocus.length}/3 việc quan trọng nhất ngày {selectedDate}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[0, 1, 2].map((slotIdx) => {
            const task = topFocus[slotIdx];
            if (!task) {
              return (
                <div
                  key={slotIdx}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[110px]"
                >
                  <span className="text-xs font-semibold text-slate-400">
                    Vị trí ưu tiên #{slotIdx + 1} trống
                  </span>
                </div>
              );
            }
            const cat = getCategory(task.category_id);
            const goal = getGoal(task.goal_id);
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                className={`rounded-2xl p-4 border transition shadow-sm flex flex-col justify-between ${
                  isDone
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-gradient-to-br from-amber-50/80 via-white to-white dark:from-amber-950/25 dark:via-slate-900 dark:to-slate-900 border-amber-300/80 dark:border-amber-800/70'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span>Tiêu điểm #{slotIdx + 1}</span>
                    </span>
                    {cat && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white inline-flex items-center gap-1"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon categoryId={cat.id} className="w-3 h-3" />
                        <span>{cat.name}</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTaskStatus(task.id)}
                    className="flex items-start gap-2.5 text-left w-full group"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-5 h-5 text-amber-500 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`font-bold text-sm leading-snug ${
                        isDone ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {task.title}
                    </span>
                  </button>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {task.start_time
                        ? `${task.start_time}${task.end_time ? ` - ${task.end_time}` : ''}`
                        : 'Chưa gắn giờ'}
                    </span>
                  </span>
                  {goal && (
                    <span className="inline-flex items-center gap-1 truncate max-w-[150px] text-indigo-600 dark:text-indigo-400 font-medium">
                      <Target className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{goal.title}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lưới 2 cột: Cột trái = Danh sách Công việc & Thói quen; Cột phải = Lịch trình theo giờ & Pomodoro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái (7/12): Danh sách công việc trong ngày + Thói quen */}
        <div className="lg:col-span-7 space-y-6">
          {/* Danh sách công việc */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SectionIconBadge tone="indigo">
                  <ListTodo className="w-4 h-4" />
                </SectionIconBadge>
                <div>
                  <h3 className="font-bold text-base">Danh sách công việc trong ngày</h3>
                  <p className="text-xs text-slate-500">
                    Hoàn thành {completedToday}/{scheduled.length} đầu việc
                  </p>
                </div>
              </div>
              {scheduled.length > 0 && (
                <div className="w-28 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${Math.round((completedToday / scheduled.length) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {scheduled.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Chưa có công việc nào cho ngày {selectedDate}. Hãy nhập ở thanh phía trên!
              </div>
            ) : (
              <div className="space-y-2.5">
                {scheduled.map((task) => {
                  const isDone = task.status === 'done';
                  const isExpanded = expandedTaskId === task.id;
                  const cat = getCategory(task.category_id);
                  const goal = getGoal(task.goal_id);
                  const pBadge = PRIORITY_BADGE[task.priority];
                  const doneSubtasks = task.subtasks.filter((s) => s.is_completed).length;

                  return (
                    <div
                      key={task.id}
                      draggable={!isExpanded}
                      onDragStart={() => setDraggedListTaskId(task.id)}
                      onDragEnd={() => {
                        setDraggedListTaskId(null);
                        setDragOverHour(null);
                      }}
                      className={`rounded-xl border transition ${
                        isDone
                          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
                      }`}
                    >
                      <div className="p-3.5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleTaskStatus(task.id)}
                            className="mt-0.5 shrink-0"
                            aria-label={`Đánh dấu hoàn thành ${task.title}`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400 hover:text-indigo-600" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`font-semibold text-sm ${
                                  isDone ? 'line-through text-slate-400' : ''
                                }`}
                              >
                                {task.title}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${pBadge.cls}`}
                              >
                                <PriorityIcon priority={task.priority} className="w-3 h-3" />
                                <span>{pBadge.label}</span>
                              </span>
                              {cat && (
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-md text-white font-medium inline-flex items-center gap-1"
                                  style={{ backgroundColor: cat.color }}
                                >
                                  <CategoryIcon categoryId={cat.id} className="w-3 h-3" />
                                  <span>{cat.name}</span>
                                </span>
                              )}
                              {task.recurrence && task.recurrence !== 'none' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 font-semibold inline-flex items-center gap-1">
                                  <Repeat className="w-3 h-3" />
                                  <span>{RECURRENCE_LABEL[task.recurrence]}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {task.start_time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>
                                    {task.start_time}
                                    {task.end_time ? ` - ${task.end_time}` : ''}
                                  </span>
                                </span>
                              )}
                              {goal && (
                                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                                  <Target className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[200px]">{goal.title}</span>
                                </span>
                              )}
                              {task.subtasks.length > 0 && (
                                <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                  Bước nhỏ: {doneSubtasks}/{task.subtasks.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTopFocus(task)}
                            title="Ghim / Bỏ ghim khỏi Top 3 Tiêu điểm ngày"
                            className={`p-1.5 rounded-lg transition ${
                              task.is_top_focus
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Flame className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTaskId(isExpanded ? null : task.id)
                            }
                            title="Sửa công việc, bước nhỏ & hẹn giờ nhắc"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTaskId(isExpanded ? null : task.id)
                            }
                            title="Mở chi tiết, bước nhỏ & hẹn giờ nhắc"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTask(task.id)}
                            title="Xóa công việc"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Chi tiết mở rộng: Sửa Tên việc, Ưu tiên, Danh mục, Subtasks, Ghi chú, Khung giờ & Hẹn giờ nhắc */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3.5 text-xs bg-slate-50/60 dark:bg-slate-800/35 rounded-b-xl">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                Tên công việc
                              </label>
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) =>
                                  updateTask(task.id, { title: e.target.value })
                                }
                                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                Mức độ ưu tiên
                              </label>
                              <CustomSelect
                                fullWidth
                                value={task.priority}
                                onChange={(val) =>
                                  updateTask(task.id, {
                                    priority: val as Priority,
                                  })
                                }
                                className="bg-white dark:bg-slate-900"
                                menuWidthClass="min-w-[175px]"
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
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                Chu kỳ lặp lại
                              </label>
                              <CustomSelect
                                fullWidth
                                ariaLabel="Chu kỳ lặp lại"
                                value={task.recurrence || 'none'}
                                onChange={(val) =>
                                  updateTask(task.id, {
                                    recurrence: val as RecurrenceType,
                                  })
                                }
                                className="bg-white dark:bg-slate-900"
                                menuWidthClass="min-w-[195px]"
                                options={RECURRENCE_OPTIONS.map((opt) => ({
                                  value: opt.value,
                                  label: opt.label,
                                  icon: <Repeat className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
                                }))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                Giờ bắt đầu
                              </label>
                              <CustomTimePicker
                                fullWidth
                                value={task.start_time || ''}
                                onChange={(val) =>
                                  updateTask(task.id, { start_time: val || undefined })
                                }
                                placeholder="Chọn giờ bắt đầu"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                Giờ kết thúc
                              </label>
                              <CustomTimePicker
                                fullWidth
                                value={task.end_time || ''}
                                onChange={(val) =>
                                  updateTask(task.id, { end_time: val || undefined })
                                }
                                placeholder="Chọn giờ kết thúc"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                Hẹn giờ nhắc việc
                              </label>
                              <CustomDateTimePicker
                                ariaLabel="Hẹn giờ nhắc việc"
                                defaultDate={task.scheduled_date || selectedDate}
                                value={toLocalDatetimeInputValue(task.reminder_at)}
                                onChange={(val) =>
                                  updateTask(task.id, {
                                    reminder_at: val
                                      ? new Date(val).toISOString()
                                      : undefined,
                                    reminder_sent: false,
                                  })
                                }
                                placeholder="Đặt ngày & giờ nhắc..."
                                align="right"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Ghi chú chi tiết
                            </label>
                            <textarea
                              rows={2}
                              value={task.notes}
                              onChange={(e) =>
                                updateTask(task.id, { notes: e.target.value })
                              }
                              placeholder="Thêm ghi chú, đường dẫn tài liệu hoặc lưu ý..."
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                            />
                          </div>

                          {/* Các bước nhỏ (Subtasks) */}
                          <div className="space-y-1.5">
                            <span className="font-semibold text-[11px] text-slate-600 dark:text-slate-300">
                              Các bước thực hiện nhỏ (Checklist):
                            </span>
                            {task.subtasks.map((st) => (
                              <div
                                key={st.id}
                                className="flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200/70 dark:border-slate-800"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSubtask(task.id, st.id)}
                                  className="flex items-center gap-2 text-left"
                                >
                                  {st.is_completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-400" />
                                  )}
                                  <span
                                    className={
                                      st.is_completed ? 'line-through text-slate-400' : ''
                                    }
                                  >
                                    {st.title}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSubtask(task.id, st.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                value={newSubtaskText[task.id] || ''}
                                onChange={(e) =>
                                  setNewSubtaskText((prev) => ({
                                    ...prev,
                                    [task.id]: e.target.value,
                                  }))
                                }
                                placeholder="Thêm bước nhỏ..."
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  addSubtask(task.id, newSubtaskText[task.id] || '');
                                  setNewSubtaskText((prev) => ({ ...prev, [task.id]: '' }));
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium"
                              >
                                + Bước
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bảng tích Thói quen hàng ngày (Daily Habits) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SectionIconBadge tone="violet">
                  <Sparkles className="w-4 h-4" />
                </SectionIconBadge>
                <h3 className="font-bold text-base">Thói quen hàng ngày</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {state.habits.map((habit) => {
                const isDoneToday = state.habitLogs.some(
                  (l) => l.habit_id === habit.id && l.date === selectedDate && l.completed
                );
                const streak = calculateHabitStreak(
                  habit.id,
                  state.habitLogs,
                  selectedDate,
                  habit.frequency
                );

                return (
                  <div
                    key={habit.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition ${
                      isDoneToday
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleHabitForDate(habit.id, selectedDate)}
                      className="flex items-center gap-2.5 text-left min-w-0 flex-1"
                    >
                      {isDoneToday ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-semibold truncate ${
                          isDoneToday ? 'text-emerald-900 dark:text-emerald-200' : ''
                        }`}
                      >
                        {habit.title}
                      </span>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>{streak} ngày</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteHabit(habit.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500"
                        title="Xóa thói quen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleCreateHabit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                placeholder="Thêm thói quen lặp lại hàng ngày..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thói quen</span>
              </button>
            </form>
          </div>
        </div>

        {/* Cột phải (5/12): Đồng hồ Pomodoro + Lịch trình theo khung giờ (Time-blocking 06:00 - 23:00) */}
        <div className="lg:col-span-5 space-y-6">
          <PomodoroWidget />

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <SectionIconBadge tone="indigo">
                  <Clock className="w-4 h-4" />
                </SectionIconBadge>
                <h3 className="font-bold text-base">Lịch trình theo khung giờ</h3>
              </div>
              <span
                data-testid="timeline-now-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/70 text-[11px] font-mono font-bold text-rose-600 dark:text-rose-300"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Hiện tại {nowHHMM}</span>
              </span>
            </div>

            {/* Khung thêm nhanh công việc khi bấm trực tiếp vào một mốc giờ */}
            {quickSlotHour !== null && (
              <form
                onSubmit={handleCreateQuickSlotTask}
                data-testid="quick-slot-form"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70"
              >
                <span className="px-2 py-1 rounded-lg bg-indigo-600 text-white font-mono text-[11px] font-bold shrink-0">
                  {String(quickSlotHour).padStart(2, '0')}:00 -{' '}
                  {String(Math.min(23, quickSlotHour + 1)).padStart(2, '0')}:00
                </span>
                <input
                  ref={quickSlotInputRef}
                  type="text"
                  value={quickSlotTitle}
                  onChange={(e) => setQuickSlotTitle(e.target.value)}
                  placeholder="Nhập tên việc cho khung giờ này..."
                  spellCheck={false}
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shrink-0 transition"
                >
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickSlotHour(null);
                    setQuickSlotTitle('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Đóng"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            <div className="max-h-[680px] overflow-y-auto pr-1 select-none">
              <div
                className="relative"
                style={{ height: `${timelineHours.length * HOUR_HEIGHT}px` }}
              >
                {/* Lưới nền các mốc giờ hỗ trợ Click thêm việc & Kéo thả việc từ danh sách sang */}
                {timelineHours.map((hour) => {
                  const hourPrefix = String(hour).padStart(2, '0');
                  const nextHourPrefix = String(Math.min(23, hour + 1)).padStart(2, '0');
                  const isDropTarget = dragOverHour === hour;
                  const isSelectedQuickSlot = quickSlotHour === hour;

                  return (
                    <div
                      key={hour}
                      data-testid="timeline-hour-slot"
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverHour !== hour) setDragOverHour(hour);
                      }}
                      onDragLeave={() => {
                        if (dragOverHour === hour) setDragOverHour(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const taskId =
                          draggedListTaskId || e.dataTransfer.getData('text/plain');
                        if (taskId) {
                          updateTask(taskId, {
                            start_time: `${hourPrefix}:00`,
                            end_time: `${nextHourPrefix}:00`,
                            estimated_minutes: 60,
                          });
                        }
                        setDraggedListTaskId(null);
                        setDragOverHour(null);
                      }}
                      onClick={() => setQuickSlotHour(hour)}
                      className="group flex items-start gap-3 border-b border-slate-100 dark:border-slate-800/70 text-xs cursor-pointer"
                    >
                      <span className="w-12 font-mono text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-medium shrink-0 pt-2 transition-colors">
                        {hourPrefix}:00
                      </span>
                      <div
                        className={`flex-1 h-[calc(100%-10px)] my-1 rounded-lg border border-dashed transition-all flex items-center justify-end px-3 ${
                          isDropTarget
                            ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                            : isSelectedQuickSlot
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                            : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 group-hover:border-indigo-300/70 dark:group-hover:border-indigo-800/80 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-950/20'
                        }`}
                      >
                        <span className="opacity-0 group-hover:opacity-100 text-[10.5px] font-medium text-indigo-500 dark:text-indigo-400 transition-opacity inline-flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          <span>Thêm việc {hourPrefix}:00</span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Vạch Đỏ Giờ Hiện Tại (Live Now Indicator) */}
                {nowDecimalHour >= minHour && nowDecimalHour <= maxHour + 1 && (
                  <div
                    data-testid="timeline-now-indicator"
                    style={{
                      top: `${(nowDecimalHour - minHour) * HOUR_HEIGHT}px`,
                    }}
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                  >
                    <span className="w-12 pr-1.5 text-right font-mono text-[10px] font-extrabold text-rose-600 dark:text-rose-400 shrink-0">
                      {nowHHMM}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20 shrink-0 -ml-1" />
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-rose-500 via-rose-500/80 to-rose-400/30 shadow-sm" />
                  </div>
                )}

                {/* Lớp hiển thị các công việc thành 1 khối thống nhất (Time-block) trải dài theo đúng thời lượng */}
                <div
                  style={{ top: '0px', bottom: '0px', left: '60px', right: '0px' }}
                  className="absolute z-10 pointer-events-none"
                >
                  {positionedTimedTasks.map(({ task: t, metrics, startH, colIndex, totalCols }) => {
                    const cat = getCategory(t.category_id);
                    const pBadge = PRIORITY_BADGE[t.priority];
                    const isInteracting = timelineInteraction?.taskId === t.id;
                    const effectiveStartMins = isInteracting
                      ? timelineInteraction.previewStartMins
                      : Math.round(startH * 60);
                    const effectiveDurationMins = isInteracting
                      ? timelineInteraction.previewDurationMins
                      : metrics.durationMinutes;
                    const effectiveStartH = effectiveStartMins / 60;
                    const displayStartTime = isInteracting
                      ? minutesToHHMM(effectiveStartMins)
                      : t.start_time || minutesToHHMM(effectiveStartMins);
                    const displayEndTime = isInteracting
                      ? minutesToHHMM(effectiveStartMins + effectiveDurationMins)
                      : t.end_time;

                    const topPx = (effectiveStartH - minHour) * HOUR_HEIGHT + 3;
                    const heightPx = Math.max(
                      48,
                      (effectiveDurationMins / 60) * HOUR_HEIGHT - 6
                    );
                    const widthPct = 100 / totalCols;
                    const leftPct = colIndex * widthPct;
                    const showFooterRow = effectiveDurationMins >= 60;
                    const hoursCount = Math.floor(effectiveDurationMins / 60);
                    const minsCount = effectiveDurationMins % 60;
                    const durationLabel =
                      hoursCount > 0
                        ? `${hoursCount} giờ${minsCount > 0 ? ` ${minsCount} phút` : ''}`
                        : `${minsCount} phút`;

                    return (
                      <div
                        key={t.id}
                        data-testid="timeline-task-block"
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          setTimelineInteraction({
                            taskId: t.id,
                            mode: 'move',
                            startY: e.clientY,
                            origStartMins: Math.round(startH * 60),
                            origDurationMins: metrics.durationMinutes,
                            previewStartMins: Math.round(startH * 60),
                            previewDurationMins: metrics.durationMinutes,
                          });
                        }}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          backgroundColor: cat?.color || '#4f46e5',
                          opacity: t.status === 'done' ? 0.72 : 1,
                        }}
                        title={`${t.title} (${displayStartTime}${displayEndTime ? ` - ${displayEndTime}` : ''} • ${durationLabel}${cat ? ` • ${cat.name}` : ''}) — Kéo khối để đổi giờ, kéo cạnh dưới để chỉnh thời lượng`}
                        className={`group/block absolute pointer-events-auto rounded-xl px-3.5 ${
                          showFooterRow ? 'pt-2 pb-3' : 'py-1.5'
                        } text-white font-medium shadow-md border ${
                          isInteracting
                            ? 'border-white ring-2 ring-indigo-300 z-30 cursor-grabbing brightness-105'
                            : 'border-white/20 cursor-grab hover:brightness-105'
                        } flex flex-col justify-between overflow-hidden transition-shadow`}
                      >
                        <div className="space-y-1 min-w-0">
                          {/* Hàng 1: Mức độ ưu tiên (+ Thời lượng & Danh mục nếu việc ngắn < 60p) + Khung giờ */}
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                              <span className="text-[10px] font-bold bg-black/25 px-2 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1">
                                <PriorityIcon priority={t.priority} className="w-3 h-3" />
                                <span>{pBadge.label}</span>
                              </span>
                              {!showFooterRow && (
                                <span className="text-[10px] text-white/90 bg-black/15 px-1.5 py-0.5 rounded truncate inline-flex items-center gap-1">
                                  <Timer className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {durationLabel}
                                    {cat ? ` • ${cat.name}` : ''}
                                  </span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10.5px] font-mono font-semibold bg-black/25 px-2 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                {displayStartTime}
                                {displayEndTime
                                  ? ` - ${displayEndTime}`
                                  : ` (${effectiveDurationMins}p)`}
                              </span>
                            </span>
                          </div>

                          {/* Hàng 2: Tên công việc hiển thị trọn chiều ngang, cho phép xuống dòng tự nhiên không bị cắt mất */}
                          <p
                            className={`font-bold text-xs sm:text-[13px] leading-snug break-words line-clamp-2 ${
                              t.status === 'done' ? 'line-through opacity-85' : ''
                            }`}
                          >
                            {t.title}
                          </p>
                        </div>

                        {/* Hàng 3: Thời lượng & Danh mục cho các việc từ 60 phút trở lên */}
                        {showFooterRow && (
                          <div className="flex items-center justify-between gap-2 text-[11px] text-white/90 pt-1 border-t border-white/15 mt-auto shrink-0">
                            <span className="truncate inline-flex items-center gap-1">
                              <Timer className="w-3.5 h-3.5 shrink-0" />
                              <span>Thời lượng: {durationLabel}</span>
                            </span>
                            {cat && (
                              <span className="truncate font-medium inline-flex items-center gap-1">
                                <CategoryIcon categoryId={cat.id} className="w-3.5 h-3.5" />
                                <span>{cat.name}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Thanh kéo giãn thời lượng (Resize Handle) ở cạnh dưới khối công việc */}
                        <div
                          data-testid="timeline-resize-handle"
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            e.stopPropagation();
                            setTimelineInteraction({
                              taskId: t.id,
                              mode: 'resize',
                              startY: e.clientY,
                              origStartMins: Math.round(startH * 60),
                              origDurationMins: metrics.durationMinutes,
                              previewStartMins: Math.round(startH * 60),
                              previewDurationMins: metrics.durationMinutes,
                            });
                          }}
                          title="Kéo cạnh dưới để tăng/giảm thời lượng công việc (bước 15 phút)"
                          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors"
                        >
                          <GripHorizontal className="w-3.5 h-3 text-white/60 group-hover/block:text-white/95" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
