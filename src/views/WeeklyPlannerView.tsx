import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Clock,
  Repeat,
  Inbox,
  CheckCircle2,
  Circle,
  GripVertical,
  Plus,
  Sparkles,
  BookOpen,
  Pencil,
  Trash2,
  Check,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { DUTY_SHIFT_META } from '../lib/dutyShiftConfig';
import { PRIORITY_STYLE, RECURRENCE_LABEL } from '../lib/priorityConfig';
import { getTodayIso } from '../lib/seedData';
import { Priority, Task } from '../types/planner';
import { DayTaskPopoverModal } from '../components/DayTaskPopoverModal';
import {
  DutyShiftIcon,
  PriorityIcon,
  SectionIconBadge,
} from '../components/PlannerIcons';
import { CustomSelect, CustomTimePicker } from '../components/CustomPickers';

export { PRIORITY_STYLE };

function getMondayOfWeek(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

function addDays(dateIso: string, delta: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

const DAY_NAMES = [
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

export const WeeklyPlannerView: React.FC = () => {
  const {
    state,
    selectedDate,
    setSelectedDate,
    moveTaskToDate,
    toggleTaskStatus,
    updateTask,
    deleteTask,
    savePeriodPlan,
  } = usePlanner();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Cửa sổ nổi (Popover) quản lý công việc khi click vào ô ngày (Cách 2)
  const [popoverDate, setPopoverDate] = useState<string | 'backlog' | null>(null);

  // Trạng thái mở rộng thanh công cụ (TB + Sửa/Xóa) khi click đúp vào thẻ việc
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Trạng thái đang sửa công việc trực tiếp trên thẻ
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditStartTime(task.start_time || '');
    setEditEndTime(task.end_time || '');
    setEditPriority(task.priority);
  };

  const saveEditingTask = (taskId: string) => {
    if (!editTitle.trim()) return;
    updateTask(taskId, {
      title: editTitle.trim(),
      start_time: editStartTime || undefined,
      end_time: editEndTime || undefined,
      priority: editPriority,
    });
    setEditingTaskId(null);
  };

  const mondayIso = getMondayOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(mondayIso, i);
    return {
      iso,
      dayName: DAY_NAMES[i],
      shortDate: iso.slice(8, 10) + '/' + iso.slice(5, 7),
    };
  });

  const weekKey = `week-${mondayIso}`;
  const existingPlan = state.periodPlans.find(
    (p) => p.period_type === 'week' && p.period_key === weekKey
  );

  const [focusText, setFocusText] = useState(
    existingPlan?.focus_goals.join('\n') ||
      'Hoàn thành các cột mốc chính của dự án\nDuy trì 100% thói quen sức khỏe'
  );
  const [reflectionText, setReflectionText] = useState(
    existingPlan?.reflection_notes || ''
  );
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setFocusText(
      existingPlan?.focus_goals.join('\n') ||
        'Hoàn thành các cột mốc chính của dự án\nDuy trì 100% thói quen sức khỏe'
    );
    setReflectionText(existingPlan?.reflection_notes || '');
  }, [weekKey, existingPlan]);

  const handleSaveWeekPlan = () => {
    savePeriodPlan({
      period_type: 'week',
      period_key: weekKey,
      focus_goals: focusText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      reflection_notes: reflectionText,
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  };

  const backlogTasks = state.tasks.filter(
    (t) => t.scheduled_date === null && t.status !== 'cancelled'
  );

  const weekIsoSet = new Set(weekDays.map((w) => w.iso));
  const weekTasks = state.tasks.filter(
    (t) =>
      t.scheduled_date &&
      weekIsoSet.has(t.scheduled_date) &&
      t.status !== 'cancelled'
  );
  const weekDoneCount = weekTasks.filter((t) => t.status === 'done').length;
  const weekProgressPct =
    weekTasks.length > 0 ? Math.round((weekDoneCount / weekTasks.length) * 100) : 0;
  const weekShiftCount = (state.dutyShifts || []).filter((s) =>
    weekIsoSet.has(s.date)
  ).length;

  return (
    <div className="space-y-4">
      {/* Thanh điều khiển tuần & Thống kê nhanh */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <SectionIconBadge tone="indigo">
            <CalendarRange className="w-4 h-4" />
          </SectionIconBadge>
          <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
            Kế hoạch Tuần ({weekDays[0].shortDate} – {weekDays[6].shortDate})
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              Hoàn thành {weekDoneCount}/{weekTasks.length} ({weekProgressPct}%)
            </span>
            {weekShiftCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                {weekShiftCount} lịch trực
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(mondayIso, -7))}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            title="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayIso())}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold transition"
          >
            Tuần hiện tại
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(mondayIso, 7))}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            title="Tuần sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Khung Trọng tâm Tuần & Tổng kết Tuần — Gọn gàng, tinh tế */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <SectionIconBadge tone="indigo" size="sm">
                <Sparkles className="w-3.5 h-3.5" />
              </SectionIconBadge>
              <span>Trọng tâm Tuần</span>
            </span>
            <button
              type="button"
              onClick={handleSaveWeekPlan}
              className={`text-[11px] px-2.5 py-1 rounded-lg text-white font-bold inline-flex items-center gap-1 shadow-2xs transition ${
                savedNotice ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {savedNotice && <Check className="w-3 h-3" />}
              <span>{savedNotice ? 'Đã lưu' : 'Lưu kế hoạch tuần'}</span>
            </button>
          </div>
          <textarea
            rows={2}
            spellCheck={false}
            value={focusText}
            onChange={(e) => setFocusText(e.target.value)}
            placeholder="Mỗi dòng 1 mục tiêu trọng tâm trong tuần này..."
            className="w-full text-xs leading-relaxed px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 resize-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
          />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between min-h-[26px]">
            <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <SectionIconBadge tone="emerald" size="sm">
                <BookOpen className="w-3.5 h-3.5" />
              </SectionIconBadge>
              <span>Đánh giá &amp; Ghi chú cuối tuần (Weekly Review)</span>
            </span>
          </div>
          <textarea
            rows={2}
            spellCheck={false}
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="Những việc đã làm tốt tuần này, điều cần cải thiện cho tuần sau..."
            className="w-full text-xs leading-relaxed px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 resize-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
          />
        </div>
      </div>

      {/* Khay Chờ xếp lịch (Backlog) nằm ngang gọn gàng */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (draggedTaskId) {
            moveTaskToDate(draggedTaskId, null);
            setDraggedTaskId(null);
          }
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-4 py-2.5 space-y-2.5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SectionIconBadge tone="slate" size="sm">
              <Inbox className="w-3.5 h-3.5" />
            </SectionIconBadge>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Chờ xếp lịch
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              {backlogTasks.length} việc
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPopoverDate('backlog')}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-600 hover:text-white border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1.5 transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm việc chờ</span>
          </button>
        </div>

        {backlogTasks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {backlogTasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const isExpanded = expandedTaskId === task.id;
              const prio = PRIORITY_STYLE[task.priority];
              return (
                <div
                  key={task.id}
                  draggable={!isEditing}
                  onDragStart={() => setDraggedTaskId(task.id)}
                  onDoubleClick={() =>
                    setExpandedTaskId((prev) => (prev === task.id ? null : task.id))
                  }
                  title="Click đúp để hiện mức ưu tiên & nút Sửa / Xóa"
                  className={`p-3 rounded-xl border ${prio.cardClass} shadow-2xs text-xs space-y-2 cursor-grab active:cursor-grabbing select-none`}
                >
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Tên công việc"
                        className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-indigo-400 text-xs"
                      />
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => saveEditingTask(task.id)}
                          className="px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold inline-flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" />
                          <span>Lưu sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="px-1.5 py-1 rounded bg-slate-200 dark:bg-slate-700 text-[11px]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words flex-1">
                          {task.title}
                        </span>
                      </div>

                      <CustomSelect
                        fullWidth
                        ariaLabel={`Chuyển ngày cho ${task.title}`}
                        headerTitle="Chọn ngày trong tuần"
                        value=""
                        onChange={(val) => {
                          if (val) moveTaskToDate(task.id, val);
                        }}
                        className="bg-white/90 dark:bg-slate-900 py-1 text-[11px]"
                        menuWidthClass="min-w-[190px]"
                        options={[
                          { value: '', label: 'Xếp vào ngày...' },
                          ...weekDays.map((wd) => ({
                            value: wd.iso,
                            label: `${wd.dayName} (${wd.shortDate})`,
                            icon: <CalendarRange className="w-3.5 h-3.5 text-indigo-500" />,
                          })),
                        ]}
                      />

                      {isExpanded && (
                        <div
                          data-testid="weekly-task-footer"
                          className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60"
                        >
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none inline-flex items-center gap-1 ${prio.badgeClass}`}
                          >
                            <PriorityIcon priority={task.priority} className="w-3 h-3" />
                            <span>{prio.label}</span>
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditingTask(task)}
                              title="Sửa công việc"
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              title="Xóa công việc"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bảng 7 Cột ngày trong tuần (Thứ Hai -> Chủ Nhật) — Đồng bộ chiều cao Header, màu sắc tinh tế */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
        {weekDays.map((wd) => {
          const dayTasks = state.tasks.filter(
            (t) => t.scheduled_date === wd.iso && t.status !== 'cancelled'
          );
          const doneCount = dayTasks.filter((t) => t.status === 'done').length;
          const isAllDone = dayTasks.length > 0 && doneCount === dayTasks.length;
          const isSelected = wd.iso === selectedDate;
          const isToday = wd.iso === getTodayIso();
          const shift = (state.dutyShifts || []).find((s) => s.date === wd.iso);
          const shiftMeta = shift ? DUTY_SHIFT_META[shift.type] : null;
          const progressPct =
            dayTasks.length > 0 ? Math.round((doneCount / dayTasks.length) * 100) : 0;

          return (
            <div
              key={wd.iso}
              data-testid="weekly-day-column"
              onClick={() => {
                setSelectedDate(wd.iso);
              }}
              onDoubleClick={() => {
                setSelectedDate(wd.iso);
                setPopoverDate(wd.iso);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedTaskId) {
                  moveTaskToDate(draggedTaskId, wd.iso);
                  setDraggedTaskId(null);
                }
              }}
              title={`Click đúp (2 lần) vào cột để mở Cửa sổ nổi thêm & quản lý công việc ${wd.dayName} (${wd.shortDate})`}
              className={`rounded-2xl p-3 flex flex-col justify-between min-h-[380px] transition cursor-pointer relative bg-white dark:bg-slate-900 ${
                isToday
                  ? 'border-2 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/15 shadow-md'
                  : isSelected
                  ? 'border-2 border-indigo-400/80 dark:border-indigo-500/80 shadow-sm'
                  : 'border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
              }`}
            >
              <div className="flex-1 flex flex-col space-y-2.5">
                {/* Header cột ngày: Đồng bộ cố định 3 hàng ngang bằng nhau trên cả 7 cột */}
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 space-y-2">
                  {/* Hàng 1: Tên Thứ + Nút đếm & Nút + */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                        {wd.dayName}
                      </span>
                      {isToday && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white leading-none whitespace-nowrap shrink-0">
                          Hôm nay
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                          isAllDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                        }`}
                      >
                        {doneCount}/{dayTasks.length}
                      </span>
                      <button
                        type="button"
                        data-testid="weekly-open-day-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDate(wd.iso);
                          setPopoverDate(wd.iso);
                        }}
                        title={`Mở nhanh & thêm việc ${wd.dayName} (${wd.shortDate})`}
                        className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Hàng 2: Ngày/Tháng + Thanh tiến độ ngang */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono font-bold shrink-0 ${
                        isToday
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {wd.shortDate}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isAllDone ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Hàng 3: Huy hiệu Ca trực Bác sĩ (Cố định chiều cao h-7 để cả 7 cột thẳng hàng tuyệt đối) */}
                  {shiftMeta && shift ? (
                    <div
                      title={shiftMeta.label}
                      className={`w-full h-7 px-2.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${shiftMeta.softClass}`}
                    >
                      <DutyShiftIcon type={shift.type} className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{shiftMeta.label}</span>
                    </div>
                  ) : (
                    <div className="w-full h-7 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-800/70 text-[10.5px] font-medium text-slate-400 dark:text-slate-500 flex items-center">
                      <span className="truncate">Không có ca trực</span>
                    </div>
                  )}
                </div>

                {/* Danh sách thẻ công việc trong ngày (Bố cục 2 tầng để tên việc rộng 100% không bị gãy chữ) */}
                {dayTasks.length === 0 ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDate(wd.iso);
                      setPopoverDate(wd.iso);
                    }}
                    className="flex-1 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 flex flex-col items-center justify-center p-3 text-center group/empty transition"
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 group-hover/empty:bg-indigo-100 dark:group-hover/empty:bg-indigo-950 text-slate-400 group-hover/empty:text-indigo-600 dark:group-hover/empty:text-indigo-400 flex items-center justify-center mb-1.5 transition">
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 group-hover/empty:text-indigo-600 dark:group-hover/empty:text-indigo-400 transition">
                      Trống &bull; Thêm việc
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayTasks.map((task) => {
                      const isDone = task.status === 'done';
                      const isEditing = editingTaskId === task.id;
                      const isExpanded = expandedTaskId === task.id;
                      const prio = PRIORITY_STYLE[task.priority];

                      return (
                        <div
                          key={task.id}
                          data-testid="weekly-task-card"
                          draggable={!isEditing}
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setExpandedTaskId((prev) => (prev === task.id ? null : task.id));
                          }}
                          title="Click đúp để hiện mức ưu tiên & nút Sửa / Xóa"
                          className={`group rounded-xl border ${prio.cardClass} p-2.5 text-xs space-y-1.5 transition cursor-grab active:cursor-grabbing select-none ${
                            isDone
                              ? 'opacity-60'
                              : 'shadow-2xs hover:shadow-sm'
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditingTask(task.id);
                                  if (e.key === 'Escape') setEditingTaskId(null);
                                }}
                                placeholder="Tên công việc"
                                className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-indigo-400 text-slate-900 dark:text-slate-100 text-xs"
                              />
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1 bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5">
                                  <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
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
                                    align="right"
                                  />
                                </div>
                                <CustomSelect
                                  fullWidth
                                  value={editPriority}
                                  onChange={(val) => setEditPriority(val as Priority)}
                                  className="bg-white/90 dark:bg-slate-900 py-1 text-[11px]"
                                  menuWidthClass="min-w-[165px]"
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
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => saveEditingTask(task.id)}
                                  className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold inline-flex items-center gap-0.5"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Lưu sửa</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-1.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px]"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Tầng 1 của thẻ việc: Checkbox + Khung giờ (không gãy dòng) + Nút ••• */}
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskStatus(task.id);
                                    }}
                                    className="shrink-0"
                                    title={isDone ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Circle className="w-4 h-4 opacity-55 hover:opacity-100 transition" />
                                    )}
                                  </button>

                                  {task.start_time && !isExpanded ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/70 border border-black/5 dark:border-white/5 whitespace-nowrap">
                                      <Clock className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                      <span>
                                        {task.start_time}
                                        {task.end_time ? ` - ${task.end_time}` : ''}
                                      </span>
                                    </span>
                                  ) : (
                                    <span
                                      className={`w-2 h-2 rounded-full ${prio.dotClass} shrink-0`}
                                      title={prio.label}
                                    />
                                  )}
                                </div>

                                <button
                                  type="button"
                                  data-testid="weekly-task-toggle-actions"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedTaskId((prev) =>
                                      prev === task.id ? null : task.id
                                    );
                                  }}
                                  title="Mở tùy chọn công việc (1 chạm)"
                                  className="p-0.5 rounded opacity-55 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 shrink-0 transition"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Tầng 2 của thẻ việc: Tên công việc chiếm trọn 100% chiều ngang thẻ, dễ đọc tuyệt đối */}
                              <p
                                className={`w-full text-[12px] font-semibold leading-snug break-words ${
                                  isDone ? 'line-through opacity-75' : ''
                                }`}
                              >
                                {task.title}
                              </p>

                              {/* Tầng 3 (Footer): Hiển thị khi bấm 1 chạm vào ••• hoặc click đúp vào thẻ việc */}
                              {isExpanded && (
                                <div
                                  data-testid="weekly-task-footer"
                                  className="space-y-1.5 pt-1.5 border-t border-black/10 dark:border-white/10"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 flex-wrap min-w-0">
                                      <span
                                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md leading-none inline-flex items-center gap-1 ${prio.badgeClass}`}
                                      >
                                        <PriorityIcon priority={task.priority} className="w-3 h-3" />
                                        <span>{prio.label}</span>
                                      </span>
                                      {task.start_time && (
                                        <span className="text-[10px] font-mono font-semibold bg-white/80 dark:bg-slate-900/70 px-1.5 py-0.5 rounded-md leading-none inline-flex items-center gap-1 whitespace-nowrap">
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

                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => startEditingTask(task)}
                                        title="Sửa công việc"
                                        className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-white/60 dark:hover:bg-slate-800 transition"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteTask(task.id)}
                                        title="Xóa công việc"
                                        className="p-1 rounded-md opacity-70 hover:opacity-100 hover:text-rose-700 hover:bg-white/60 dark:hover:bg-slate-800 transition"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Chọn nhanh chuyển ngày (Hỗ trợ cảm ứng iPhone không cần kéo thả) */}
                                  <CustomSelect
                                    fullWidth
                                    ariaLabel={`Đổi ngày cho ${task.title}`}
                                    headerTitle="Chuyển sang ngày khác"
                                    value={task.scheduled_date || 'backlog'}
                                    onChange={(val) => {
                                      moveTaskToDate(task.id, val === 'backlog' ? null : val);
                                    }}
                                    className="bg-white/90 dark:bg-slate-900 py-1 text-[10.5px]"
                                    menuWidthClass="min-w-[190px]"
                                    options={[
                                      {
                                        value: 'backlog',
                                        label: 'Đưa về Chờ xếp lịch',
                                        icon: <Inbox className="w-3.5 h-3.5 text-slate-400" />,
                                      },
                                      ...weekDays.map((dItem) => ({
                                        value: dItem.iso,
                                        label: `${dItem.dayName} (${dItem.shortDate})`,
                                        icon: <CalendarRange className="w-3.5 h-3.5 text-indigo-500" />,
                                      })),
                                    ]}
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cửa sổ nổi (Popover) quản lý công việc ngay tại ngày vừa click (Cách 2) */}
      {popoverDate !== null && (
        <DayTaskPopoverModal
          dateIso={popoverDate === 'backlog' ? null : popoverDate}
          onClose={() => setPopoverDate(null)}
          onChangeDate={(nextIso) => {
            setSelectedDate(nextIso);
            setPopoverDate(nextIso);
          }}
        />
      )}
    </div>
  );
};
