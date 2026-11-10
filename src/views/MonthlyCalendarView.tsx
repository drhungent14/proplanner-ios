import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MousePointer,
  Check,
  Flag,
  Sparkles,
  Stethoscope,
  Eraser,
  Plus,
  Trash2,
  Target,
  BookOpen,
  ClipboardList,
  Pencil,
  X,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { DUTY_SHIFT_META, DUTY_SHIFT_ORDER } from '../lib/dutyShiftConfig';
import { getMonthDutyStats } from '../lib/plannerEngine';
import { PRIORITY_STYLE } from '../lib/priorityConfig';
import { DutyShiftType } from '../types/planner';
import { DayTaskPopoverModal } from '../components/DayTaskPopoverModal';
import { DutyShiftIcon, SectionIconBadge } from '../components/PlannerIcons';

const PRIMARY_DUTY_TYPES: DutyShiftType[] = ['shift_24h', 'shift_night', 'shift_day'];
const OFF_DUTY_TYPES: DutyShiftType[] = ['off_morning', 'off_afternoon'];

export const MonthlyCalendarView: React.FC = () => {
  const {
    state,
    selectedDate,
    setSelectedDate,
    savePeriodPlan,
    setDutyShift,
  } = usePlanner();

  const [popoverDate, setPopoverDate] = useState<string | null>(null);

  const [year, month] = selectedDate.slice(0, 7).split('-').map(Number);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const existingPlan = state.periodPlans.find(
    (p) => p.period_type === 'month' && p.period_key === monthKey
  );

  const defaultMonthGoals = [
    'Hoàn thành 100% Web App ProPlanner trên máy tính',
    'Đồng bộ dữ liệu sang iPhone',
  ];

  const [focusGoalsList, setFocusGoalsList] = useState<string[]>(
    existingPlan?.focus_goals && existingPlan.focus_goals.length > 0
      ? existingPlan.focus_goals
      : defaultMonthGoals
  );
  const [newFocusGoalText, setNewFocusGoalText] = useState('');
  const [editingGoalIdx, setEditingGoalIdx] = useState<number | null>(null);
  const [editingGoalValue, setEditingGoalValue] = useState('');

  const [monthReflection, setMonthReflection] = useState(
    existingPlan?.reflection_notes || ''
  );
  const [savedToast, setSavedToast] = useState(false);
  const [shiftSavedToast, setShiftSavedToast] = useState(false);

  // Chế độ Chấm Lịch Trực Bác Sĩ Nhanh (1-Click trên lịch tháng)
  const [activeStampType, setActiveStampType] = useState<DutyShiftType | 'erase' | null>(
    null
  );
  const [autoPostShift, setAutoPostShift] = useState<boolean>(true);

  const dutyShifts = state.dutyShifts || [];
  const selectedDayShift = dutyShifts.find((s) => s.date === selectedDate);
  const [shiftNoteInput, setShiftNoteInput] = useState(selectedDayShift?.note || '');
  const focusGoalsCount = focusGoalsList.length;

  useEffect(() => {
    setFocusGoalsList(
      existingPlan?.focus_goals && existingPlan.focus_goals.length > 0
        ? existingPlan.focus_goals
        : [
            'Hoàn thành 100% Web App ProPlanner trên máy tính',
            'Đồng bộ dữ liệu sang iPhone',
          ]
    );
    setMonthReflection(existingPlan?.reflection_notes || '');
    setEditingGoalIdx(null);
    setNewFocusGoalText('');
  }, [monthKey, existingPlan]);

  useEffect(() => {
    setShiftNoteInput(selectedDayShift?.note || '');
  }, [selectedDate, selectedDayShift]);

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

  const calendarCells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(
      `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );
  }

  const changeMonth = (delta: number) => {
    const dt = new Date(year, month - 1 + delta, 1);
    const nextY = dt.getFullYear();
    const nextM = String(dt.getMonth() + 1).padStart(2, '0');
    setSelectedDate(`${nextY}-${nextM}-01`);
  };

  const persistMonthPlan = (nextGoals: string[], nextReflection: string) => {
    savePeriodPlan({
      period_type: 'month',
      period_key: monthKey,
      focus_goals: nextGoals.map((s) => s.trim()).filter(Boolean),
      reflection_notes: nextReflection,
    });
  };

  const handleSaveMonthPlan = () => {
    const pendingNew = newFocusGoalText.trim();
    const finalGoals = pendingNew
      ? [...focusGoalsList, pendingNew]
      : focusGoalsList;
    if (pendingNew) {
      setFocusGoalsList(finalGoals);
      setNewFocusGoalText('');
    }
    persistMonthPlan(finalGoals, monthReflection);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2000);
  };

  const handleAddMonthGoal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newFocusGoalText.trim();
    if (!trimmed) return;
    const next = [...focusGoalsList, trimmed];
    setFocusGoalsList(next);
    setNewFocusGoalText('');
    persistMonthPlan(next, monthReflection);
  };

  const handleDeleteMonthGoal = (idx: number) => {
    const next = focusGoalsList.filter((_, i) => i !== idx);
    setFocusGoalsList(next);
    if (editingGoalIdx === idx) setEditingGoalIdx(null);
    persistMonthPlan(next, monthReflection);
  };

  const handleSaveEditedGoal = (idx: number) => {
    const trimmed = editingGoalValue.trim();
    if (!trimmed) return;
    const next = focusGoalsList.map((g, i) => (i === idx ? trimmed : g));
    setFocusGoalsList(next);
    setEditingGoalIdx(null);
    persistMonthPlan(next, monthReflection);
  };

  const handleDayCellClick = (dateIso: string) => {
    setSelectedDate(dateIso);
    if (!activeStampType) {
      return;
    }

    const currentShift = dutyShifts.find((s) => s.date === dateIso);
    if (activeStampType === 'erase') {
      setDutyShift(dateIso, null);
      return;
    }

    // Nếu bấm lại đúng loại ca đang có trên ngày đó thì xóa ca (toggle off)
    if (currentShift?.type === activeStampType) {
      setDutyShift(dateIso, null);
    } else {
      setDutyShift(dateIso, activeStampType, currentShift?.note || '', autoPostShift);
    }
  };

  const monthStats = getMonthDutyStats(dutyShifts, monthKey);

  return (
    <div className="space-y-6">
      {/* Thanh tiêu đề Tháng & Thống kê nhanh số buổi trực */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <SectionIconBadge tone="indigo">
            <CalendarDays className="w-4 h-4" />
          </SectionIconBadge>
          <h3 className="font-bold text-base">
            Lịch Kế hoạch &amp; Lịch Trực Tháng {month}/{year}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold">
            <Stethoscope className="w-4 h-4" />
            <span>
              Tháng này: {monthStats.totalActiveShifts} ca trực (24h: {monthStats.shift24hCount} | Đêm:{' '}
              {monthStats.nightCount} | Ngày: {monthStats.dayCount})
            </span>
          </div>

          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            Tháng {month}/{year}
          </span>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thanh Công Cụ: Chấm Lịch Trực Bác Sĩ Nhanh (1-Click) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <SectionIconBadge tone="rose">
              <Stethoscope className="w-4 h-4" />
            </SectionIconBadge>
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Chấm Lịch Trực Bác Sĩ Nhanh (1-Click trên lịch)
            </h4>
            {activeStampType === null ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                Chế độ Xem lịch
              </span>
            ) : activeStampType === 'erase' ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                <span>Đang bật cọ: Xóa ca trực</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                <span>Đang chấm: {DUTY_SHIFT_META[activeStampType].label}</span>
              </span>
            )}
          </div>

          <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-xl cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={autoPostShift}
              onChange={(e) => setAutoPostShift(e.target.checked)}
              className="sr-only peer"
            />
            <span className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-checked:bg-indigo-600 rounded-full relative transition-colors shrink-0 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-3 after:h-3 after:bg-white after:rounded-full after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
            <span>Tự động điền &ldquo;Ra trực Sáng&rdquo; vào ngày hôm sau khi chấm Trực 24h / Đêm</span>
          </label>
        </div>

        <div className="bg-slate-50/90 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveStampType(null)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
                activeStampType === null
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Chế độ Xem ngày thường</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />

            {DUTY_SHIFT_ORDER.map((type) => {
              const meta = DUTY_SHIFT_META[type];
              const isSelected = activeStampType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setActiveStampType((prev) => (prev === type ? null : type))
                  }
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition inline-flex items-center gap-1.5 ${
                    isSelected
                      ? `${meta.badgeClass} ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900 shadow-sm`
                      : meta.softClass
                  }`}
                >
                  <DutyShiftIcon type={type} className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                  {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveStampType((prev) => (prev === 'erase' ? null : 'erase'))
            }
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${
              activeStampType === 'erase'
                ? 'bg-rose-600 text-white border-rose-700 ring-2 ring-offset-1 ring-rose-500 dark:ring-offset-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Xóa ca trực</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lưới Lịch Tháng (8/12) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
            <div>CN</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mt-2">
            {calendarCells.map((dateIso, idx) => {
              if (!dateIso) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[104px] rounded-xl bg-slate-50/40 dark:bg-slate-900/20"
                  />
                );
              }

              const dayNum = Number(dateIso.slice(8, 10));
              const dayTasks = state.tasks.filter(
                (t) => t.scheduled_date === dateIso && t.status !== 'cancelled'
              );
              const dayMilestones = state.milestones.filter(
                (m) => m.due_date === dateIso
              );
              const shift = dutyShifts.find((s) => s.date === dateIso);
              const shiftMeta = shift ? DUTY_SHIFT_META[shift.type] : null;
              const isSelected = dateIso === selectedDate;

              return (
                <button
                  key={dateIso}
                  type="button"
                  data-testid="monthly-day-cell"
                  onClick={() => handleDayCellClick(dateIso)}
                  onDoubleClick={() => {
                    setSelectedDate(dateIso);
                    if (!activeStampType) {
                      setPopoverDate(dateIso);
                    }
                  }}
                  title="Click đúp (2 lần) để mở Cửa sổ nổi quản lý công việc ngày này"
                  className={`min-h-[104px] p-2 rounded-xl text-left flex flex-col justify-between transition relative ${
                    shiftMeta
                      ? shiftMeta.cellClass
                      : isSelected
                      ? 'border-2 border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40'
                      : 'border border-slate-200/70 dark:border-slate-800 hover:border-indigo-300 bg-white dark:bg-slate-900'
                  } ${isSelected ? 'ring-2 ring-indigo-600 dark:ring-indigo-400' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-extrabold ${
                          shiftMeta?.isPrimaryDuty
                            ? 'text-slate-900 dark:text-white text-sm'
                            : isSelected
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {dayNum}
                      </span>
                      {shiftMeta && shift && (
                        <span
                          title={shiftMeta.label}
                          aria-label={`Biểu tượng ca trực: ${shiftMeta.label}`}
                          className="inline-flex items-center justify-center p-0.5 rounded bg-white/75 dark:bg-slate-900/65 select-none"
                        >
                          <DutyShiftIcon type={shift.type} className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {dayTasks.filter((t) => t.status === 'done').length}/{dayTasks.length}
                        </span>
                      )}
                      {!activeStampType && (
                        <span
                          role="button"
                          tabIndex={0}
                          data-testid="monthly-open-day-btn"
                          title={`Mở chi tiết & thêm việc ngày ${dateIso} (1 chạm)`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(dateIso);
                            setPopoverDate(dateIso);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedDate(dateIso);
                              setPopoverDate(dateIso);
                            }
                          }}
                          className="p-0.5 rounded-md bg-indigo-50/90 dark:bg-indigo-950/70 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mt-1 w-full overflow-hidden">
                    {dayMilestones.map((ms) => (
                      <div
                        key={ms.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold truncate flex items-center gap-1"
                      >
                        <Flag className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{ms.title}</span>
                      </div>
                    ))}
                    {dayTasks.slice(0, 3).map((t) => {
                      const prio = PRIORITY_STYLE[t.priority];
                      return (
                        <div
                          key={t.id}
                          data-testid="monthly-task-pill"
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate ${prio.monthPillClass} ${
                            t.status === 'done' ? 'opacity-60 line-through' : ''
                          }`}
                        >
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-medium pl-1">
                        +{dayTasks.length - 3} việc khác
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cột phải (4/12): Chỉnh sửa Ca Trực & Chi tiết ngày đang chọn + Trọng tâm của Tháng */}
        <div className="lg:col-span-4 space-y-6">
          {/* Khung Ca Trực Bác Sĩ của ngày đang chọn */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <SectionIconBadge tone="rose">
                  <Stethoscope className="w-4 h-4" />
                </SectionIconBadge>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    Lịch trực ngày {selectedDate}
                  </h4>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {selectedDayShift
                      ? `Đang phân công: ${DUTY_SHIFT_META[selectedDayShift.type].label}`
                      : 'Chưa phân ca trực ngày này'}
                  </p>
                </div>
              </div>

              {selectedDayShift && (
                <button
                  type="button"
                  onClick={() => setDutyShift(selectedDate, null)}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/70 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa ca trực</span>
                </button>
              )}
            </div>

            {/* Nhóm 1: 3 Ca trực chính cân đối (Grid 3 cột) */}
            <div className="space-y-1.5">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Ca trực chính
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PRIMARY_DUTY_TYPES.map((type) => {
                  const meta = DUTY_SHIFT_META[type];
                  const isCurrent = selectedDayShift?.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setDutyShift(
                          selectedDate,
                          isCurrent ? null : type,
                          shiftNoteInput,
                          autoPostShift
                        )
                      }
                      className={`px-2 py-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition border relative ${
                        isCurrent
                          ? `${meta.badgeClass} ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900`
                          : meta.softClass
                      }`}
                    >
                      <DutyShiftIcon type={type} className="w-4 h-4" />
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nhóm 2: 2 Chế độ nghỉ ra trực cân đối (Grid 2 cột) */}
            <div className="space-y-1.5">
              <span className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Chế độ nghỉ ra trực
              </span>
              <div className="grid grid-cols-2 gap-2">
                {OFF_DUTY_TYPES.map((type) => {
                  const meta = DUTY_SHIFT_META[type];
                  const isCurrent = selectedDayShift?.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setDutyShift(
                          selectedDate,
                          isCurrent ? null : type,
                          shiftNoteInput,
                          autoPostShift
                        )
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border ${
                        isCurrent
                          ? `${meta.badgeClass} ring-2 ring-offset-1 ring-indigo-500 dark:ring-offset-slate-900`
                          : meta.softClass
                      }`}
                    >
                      <DutyShiftIcon type={type} className="w-3.5 h-3.5" />
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDayShift && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <ClipboardList className="w-3.5 h-3.5 text-rose-500" />
                  <span>Ghi chú bàn giao (Khoa / Phòng / Giờ trực)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    spellCheck={false}
                    value={shiftNoteInput}
                    onChange={(e) => setShiftNoteInput(e.target.value)}
                    placeholder="VD: Trực Cấp cứu, bàn giao 7h30..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setDutyShift(
                        selectedDate,
                        selectedDayShift.type,
                        shiftNoteInput,
                        false
                      );
                      setShiftSavedToast(true);
                      window.setTimeout(() => setShiftSavedToast(false), 1800);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-white text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition shrink-0 ${
                      shiftSavedToast
                        ? 'bg-emerald-600'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {shiftSavedToast && <Check className="w-3.5 h-3.5" />}
                    <span>{shiftSavedToast ? 'Đã lưu' : 'Lưu'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trọng tâm của Tháng — Thiết kế danh sách thẻ mục tiêu đánh số chuyên nghiệp, không thanh cuộn, không gạch đỏ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <SectionIconBadge tone="indigo">
                  <Sparkles className="w-4 h-4" />
                </SectionIconBadge>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                      Trọng tâm của Tháng
                    </h4>
                    <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 shrink-0">
                      {String(month).padStart(2, '0')}/{year}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveMonthPlan}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold inline-flex items-center gap-1.5 shadow-sm transition shrink-0 ${
                  savedToast
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {savedToast && <Check className="w-3.5 h-3.5" />}
                <span>{savedToast ? 'Đã lưu' : 'Lưu'}</span>
              </button>
            </div>

            {/* Khu vực 1: Danh sách Mục tiêu trọng tâm đánh số 01, 02, 03 rõ ràng */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Target className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Mục tiêu trọng tâm trong tháng</span>
                </span>
                <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {focusGoalsCount} mục tiêu
                </span>
              </div>

              {focusGoalsList.length === 0 ? (
                <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  Chưa có mục tiêu trọng tâm cho tháng này. Hãy thêm mục tiêu bên dưới.
                </div>
              ) : (
                <div className="space-y-2">
                  {focusGoalsList.map((goalText, idx) => {
                    const isEditing = editingGoalIdx === idx;
                    return (
                      <div
                        key={`${idx}-${goalText}`}
                        className="group rounded-xl bg-slate-50/90 dark:bg-slate-800/55 hover:bg-indigo-50/40 dark:hover:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/75 hover:border-indigo-300/80 dark:hover:border-indigo-700/70 p-2.5 transition"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              spellCheck={false}
                              value={editingGoalValue}
                              onChange={(e) => setEditingGoalValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditedGoal(idx);
                                if (e.key === 'Escape') setEditingGoalIdx(null);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-500 text-xs font-medium text-slate-900 dark:text-slate-100 outline-none"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEditedGoal(idx)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold inline-flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Xong</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingGoalIdx(null)}
                                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2.5">
                            <div
                              onClick={() => {
                                setEditingGoalIdx(idx);
                                setEditingGoalValue(goalText);
                              }}
                              className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer"
                              title="Nhấn để chỉnh sửa mục tiêu này"
                            >
                              <span className="w-6 h-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-mono text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                                {String(idx + 1).padStart(2, '0')}
                              </span>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed break-words flex-1">
                                {goalText}
                              </p>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 opacity-65 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGoalIdx(idx);
                                  setEditingGoalValue(goalText);
                                }}
                                title="Sửa mục tiêu"
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMonthGoal(idx)}
                                title="Xóa mục tiêu"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ô thêm nhanh mục tiêu trọng tâm mới */}
              <form onSubmit={handleAddMonthGoal} className="flex items-center gap-1.5 pt-0.5">
                <input
                  type="text"
                  spellCheck={false}
                  value={newFocusGoalText}
                  onChange={(e) => setNewFocusGoalText(e.target.value)}
                  placeholder="Thêm mục tiêu trọng tâm tháng..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold inline-flex items-center gap-1 transition shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </form>
            </div>

            {/* Khu vực 2: Ghi chú & Tổng kết tháng */}
            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>Ghi chú &amp; Tổng kết tháng</span>
              </label>
              <textarea
                rows={3}
                spellCheck={false}
                value={monthReflection}
                onChange={(e) => setMonthReflection(e.target.value)}
                placeholder="Đánh giá kết quả đạt được, kinh nghiệm rút ra hoặc lưu ý quan trọng trong tháng..."
                className="w-full text-xs leading-relaxed p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 resize-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cửa sổ nổi (Popover) quản lý công việc ngay tại ô ngày vừa click trên Lịch Tháng (Cách 2) */}
      {popoverDate !== null && (
        <DayTaskPopoverModal
          dateIso={popoverDate}
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
