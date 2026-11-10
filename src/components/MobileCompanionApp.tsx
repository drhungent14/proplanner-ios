import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Flame,
  Inbox,
  Laptop,
  Moon,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Target,
  Trash2,
  UploadCloud,
  DownloadCloud,
  X,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { DutyShiftType, Priority, Task } from '../types/planner';
import {
  calculateHabitStreak,
  canMarkTopFocus,
  computeGoalProgress,
  formatTimeHHMM,
  getMonthDutyStats,
  getTasksForDate,
} from '../lib/plannerEngine';
import { getTodayIso } from '../lib/seedData';
import {
  checkAndFireReminders,
  checkDailyRoutineNotifications,
  playNotificationChime,
} from '../lib/notificationService';

export type MobileTab = 'today' | 'schedule' | 'inbox_goals' | 'sync';
type TodaySubView = 'focus' | 'timeline' | 'habits';

interface MobileCompanionAppProps {
  /** Khi xem thử trên màn hình máy tính, cho phép quay lại giao diện Web Desktop đầy đủ */
  onSwitchToDesktop?: () => void;
  /** Hiển thị khung mô phỏng kích thước chuẩn iPhone 12 Pro Max (428x926) khi mở trên màn hình PC lớn */
  isDesktopPreviewFrame?: boolean;
}

const DUTY_SHIFT_META: Record<
  DutyShiftType,
  {
    label: string;
    shortBadge: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    dotClass: string;
  }
> = {
  shift_24h: {
    label: 'Trực 24h',
    shortBadge: '24h',
    bgClass: 'bg-rose-500/15 dark:bg-rose-500/20',
    textClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
  shift_night: {
    label: 'Trực Đêm',
    shortBadge: 'Đêm',
    bgClass: 'bg-purple-500/15 dark:bg-purple-500/20',
    textClass: 'text-purple-700 dark:text-purple-300',
    borderClass: 'border-purple-300 dark:border-purple-800',
    dotClass: 'bg-purple-500',
  },
  shift_day: {
    label: 'Trực Ngày',
    shortBadge: 'Ngày',
    bgClass: 'bg-sky-500/15 dark:bg-sky-500/20',
    textClass: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-300 dark:border-sky-800',
    dotClass: 'bg-sky-500',
  },
  off_morning: {
    label: 'Ra trực Sáng',
    shortBadge: 'RaS',
    bgClass: 'bg-amber-500/15 dark:bg-amber-500/20',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  off_afternoon: {
    label: 'Ra trực Chiều',
    shortBadge: 'RaC',
    bgClass: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
};

const QUICK_TIME_PRESETS = [
  { label: 'Không giờ', start: '', end: '' },
  { label: '07:00', start: '07:00', end: '08:00' },
  { label: '08:00', start: '08:00', end: '09:00' },
  { label: '09:00', start: '09:00', end: '10:00' },
  { label: '10:00', start: '10:00', end: '11:00' },
  { label: '11:00', start: '11:00', end: '12:00' },
  { label: '13:30', start: '13:30', end: '14:30' },
  { label: '14:00', start: '14:00', end: '15:00' },
  { label: '15:00', start: '15:00', end: '16:00' },
  { label: '16:00', start: '16:00', end: '17:00' },
  { label: '19:00', start: '19:00', end: '20:00' },
  { label: '20:00', start: '20:00', end: '21:00' },
  { label: '21:00', start: '21:00', end: '22:00' },
];

function addDaysIso(dateIso: string, delta: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function getWeekDaysAround(centerDateIso: string): {
  iso: string;
  dayName: string;
  dayNum: string;
}[] {
  const [y, m, d] = centerDateIso.split('-').map(Number);
  const current = new Date(Date.UTC(y, m - 1, d));
  const dow = current.getUTCDay(); // 0=CN..6=T7
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayIso = addDaysIso(centerDateIso, diffToMonday);
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return labels.map((dayName, idx) => {
    const iso = addDaysIso(mondayIso, idx);
    return {
      iso,
      dayName,
      dayNum: iso.slice(8, 10),
    };
  });
}

function formatVietnameseDateHeader(dateIso: string): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  const names = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${names[dow]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

export const MobileCompanionApp: React.FC<MobileCompanionAppProps> = ({
  onSwitchToDesktop,
  isDesktopPreviewFrame = false,
}) => {
  const {
    state,
    selectedDate,
    setSelectedDate,
    toggleDarkMode,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    moveTaskToDate,
    toggleHabitForDate,
    toggleMilestone,
    setDutyShift,
    triggerCloudSync,
    updateNotificationSettings,
    markReminderSent,
    isSyncing,
    syncStatusMessage,
  } = usePlanner();

  const todayIso = getTodayIso();
  const tomorrowIso = addDaysIso(todayIso, 1);

  const [activeTab, setActiveTab] = useState<MobileTab>('today');
  const [todaySubView, setTodaySubView] = useState<TodaySubView>('focus');
  const [inboxOrGoals, setInboxOrGoals] = useState<'inbox' | 'goals'>('inbox');

  // Trạng thái Bottom Sheet Thêm Nhanh (Quick Capture)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickTargetDate, setQuickTargetDate] = useState<'today' | 'tomorrow' | 'selected' | 'inbox'>('selected');
  const [quickStartTime, setQuickStartTime] = useState('');
  const [quickEndTime, setQuickEndTime] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('high');
  const [quickTopFocus, setQuickTopFocus] = useState(false);
  const [quickCategoryId, setQuickCategoryId] = useState<string>(state.categories[0]?.id || 'work');
  const [quickError, setQuickError] = useState<string | null>(null);

  // Trạng thái Bottom Sheet Chỉnh Sửa Nhanh Công ViệcKhi Chạm Vào Việc
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Trạng thái bật bảng đổi nhanh Ca Trực ngay trên Tab Hôm nay
  const [showShiftPickerSheet, setShowShiftPickerSheet] = useState(false);
  const [autoPostShift, setAutoPostShift] = useState(true);

  // Đồng hồ thời gian thực
  const [nowTime, setNowTime] = useState<Date>(() => new Date());
  const [toastAlert, setToastAlert] = useState<string | null>(null);
  const routineTrackerRef = useRef<{ morningDate?: string; eveningDate?: string }>({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setNowTime(now);
      const fired = checkAndFireReminders(
        state.tasks,
        now.toISOString(),
        state.notificationSettings,
        markReminderSent
      );
      if (fired.length > 0) {
        setToastAlert(`🔔 Nhắc việc: ${fired.map((f) => f.title).join(', ')}`);
      }
      const routine = checkDailyRoutineNotifications(
        now,
        state.notificationSettings,
        routineTrackerRef.current
      );
      if (routine) {
        setToastAlert(routine);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [state.tasks, state.notificationSettings, markReminderSent]);

  const currentHHMM = `${String(nowTime.getHours()).padStart(2, '0')}:${String(
    nowTime.getMinutes()
  ).padStart(2, '0')}`;

  // Dữ liệu ngày đang chọn
  const { topFocus, scheduled, overdue } = useMemo(
    () => getTasksForDate(state.tasks, selectedDate, todayIso),
    [state.tasks, selectedDate, todayIso]
  );

  const regularTasks = useMemo(
    () => scheduled.filter((t) => !t.is_top_focus),
    [scheduled]
  );

  const completedTodayCount = useMemo(
    () => scheduled.filter((t) => t.status === 'done').length,
    [scheduled]
  );
  const totalTodayCount = scheduled.length;
  const progressPct =
    totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 0;

  const currentDutyShift = useMemo(
    () => (state.dutyShifts || []).find((s) => s.date === selectedDate),
    [state.dutyShifts, selectedDate]
  );

  const inboxTasks = useMemo(
    () =>
      state.tasks.filter(
        (t) => t.scheduled_date === null && t.status !== 'done' && t.status !== 'cancelled'
      ),
    [state.tasks]
  );

  const weekDays = useMemo(() => getWeekDaysAround(selectedDate), [selectedDate]);

  // Lịch tháng cho Tab 2 (Lịch Trực)
  const [calendarMonthIso, setCalendarMonthIso] = useState<string>(() =>
    selectedDate.slice(0, 7)
  );
  const monthStats = useMemo(
    () => getMonthDutyStats(state.dutyShifts || [], calendarMonthIso),
    [state.dutyShifts, calendarMonthIso]
  );

  const monthGridDays = useMemo(() => {
    const [y, m] = calendarMonthIso.split('-').map(Number);
    const firstDay = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const startDow = firstDay.getUTCDay(); // 0=Sun..6=Sat
    const leadingBlanks = startDow === 0 ? 6 : startDow - 1;
    const cells: (string | null)[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  }, [calendarMonthIso]);

  const openQuickAdd = (presetStartTime = '', presetTopFocus = false) => {
    setQuickTitle('');
    setQuickTargetDate(selectedDate === todayIso ? 'today' : 'selected');
    setQuickStartTime(presetStartTime);
    if (presetStartTime) {
      const [hh, mm] = presetStartTime.split(':').map(Number);
      const endH = Math.min(23, hh + 1);
      setQuickEndTime(`${String(endH).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}`);
    } else {
      setQuickEndTime('');
    }
    setQuickPriority(presetTopFocus ? 'urgent' : 'high');
    setQuickTopFocus(presetTopFocus);
    setQuickError(null);
    setIsQuickAddOpen(true);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) {
      setQuickError('Vui lòng nhập tên công việc');
      return;
    }

    const resolvedDate =
      quickTargetDate === 'today'
        ? todayIso
        : quickTargetDate === 'tomorrow'
        ? tomorrowIso
        : quickTargetDate === 'inbox'
        ? null
        : selectedDate;

    const res = addTask({
      title: trimmed,
      scheduled_date: resolvedDate,
      start_time: quickStartTime || undefined,
      end_time: quickEndTime || undefined,
      priority: quickPriority,
      is_top_focus: resolvedDate ? quickTopFocus : false,
      category_id: quickCategoryId,
    });

    if (!res.ok) {
      setQuickError(res.message || 'Không thể lưu công việc');
      return;
    }

    setIsQuickAddOpen(false);
    setToastAlert('✅ Đã thêm công việc mới!');
    window.setTimeout(() => setToastAlert(null), 2500);
  };

  const handleMoveAllOverdueToToday = () => {
    overdue.forEach((t) => moveTaskToDate(t.id, todayIso));
    setSelectedDate(todayIso);
    setToastAlert(`⚡ Đã gom ${overdue.length} việc tồn về Hôm nay!`);
    window.setTimeout(() => setToastAlert(null), 2500);
  };

  const shiftMeta = currentDutyShift ? DUTY_SHIFT_META[currentDutyShift.type] : null;

  // Khung bao ngoài: Nếu mở xem thử trên PC thì hiển thị đúng chuẩn kích thước iPhone 12 Pro Max (428 x 926 px)
  const shellContent = (
    <div
      data-testid="iphone-companion-app"
      className={`relative flex flex-col bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 select-none ${
        isDesktopPreviewFrame
          ? 'w-[428px] h-[926px] rounded-[48px] shadow-2xl border-[10px] border-slate-900 dark:border-slate-800 overflow-hidden mx-auto my-4'
          : 'min-h-screen w-full max-w-[460px] mx-auto'
      }`}
    >
      {/* Tai thỏ mô phỏng (chỉ hiển thị khi đang bật chế độ xem thử khung iPhone 12 Pro Max trên PC) */}
      {isDesktopPreviewFrame && (
        <div className="bg-slate-900 text-white px-7 pt-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold shrink-0">
          <span>{currentHHMM}</span>
          <div className="w-36 h-4 bg-black rounded-full mx-auto" />
          <span>5G • 100%</span>
        </div>
      )}

      {/* HEADER GỌN CHUẨN iOS (Tối ưu vùng Safe Area Top 47px của iPhone 12 Pro Max) */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 px-4 pt-safe pb-2.5 shrink-0">
        <div className="flex items-center justify-between pt-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                ProPlanner iOS
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Cloud
              </span>
            </div>
            <h1 className="text-lg font-extrabold tracking-tight leading-tight mt-0.5">
              {formatVietnameseDateHeader(selectedDate)}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedDate !== todayIso && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className="px-2.5 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-xs active:scale-95 transition"
              >
                Hôm nay
              </button>
            )}

            <button
              type="button"
              onClick={() => void triggerCloudSync('auto')}
              disabled={isSyncing}
              title="Đồng bộ đám mây ngay"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              title="Đổi chế độ Sáng / OLED Tối"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 active:scale-95 transition"
            >
              {state.darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* THANH LƯỚT NHANH 7 NGÀY TRONG TUẦN (Chỉ hiện ở Tab Hôm nay) */}
        {activeTab === 'today' && (
          <div className="grid grid-cols-7 gap-1 mt-2.5">
            {weekDays.map((wd) => {
              const isSelected = wd.iso === selectedDate;
              const isToday = wd.iso === todayIso;
              const dayShift = (state.dutyShifts || []).find((s) => s.date === wd.iso);
              const dayTaskCount = state.tasks.filter(
                (t) => t.scheduled_date === wd.iso && t.status !== 'cancelled'
              ).length;

              return (
                <button
                  key={wd.iso}
                  type="button"
                  onClick={() => setSelectedDate(wd.iso)}
                  className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-100/70 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-semibold opacity-80">{wd.dayName}</span>
                  <span className="text-sm font-extrabold leading-tight my-0.5">{wd.dayNum}</span>
                  <div className="flex items-center gap-1 h-1.5">
                    {dayShift && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-amber-300' : DUTY_SHIFT_META[dayShift.type].dotClass
                        }`}
                      />
                    )}
                    {dayTaskCount > 0 && (
                      <span
                        className={`w-1 h-1 rounded-full ${
                          isSelected ? 'bg-white/90' : 'bg-slate-400 dark:bg-slate-500'
                        }`}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Thông báo nhanh (Toast) */}
      {(toastAlert || syncStatusMessage) && (
        <div className="mx-4 mt-2.5 px-3.5 py-2 rounded-2xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-between shadow-md">
          <span className="truncate">{toastAlert || syncStatusMessage}</span>
          {toastAlert && (
            <button
              type="button"
              onClick={() => setToastAlert(null)}
              className="ml-2 p-0.5 rounded-full hover:bg-white/20"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* VÙNG NỘI DUNG CUỘN MƯỢT (Tối ưu chiều cao 926px của iPhone 12 Pro Max) */}
      <main className="flex-1 overflow-y-auto px-4 pt-3 pb-28 space-y-3.5">
        {/* =====================================================================
            TAB 1: HÔM NAY (TRẠM ĐIỀU HÀNH NHANH TRONG NGÀY)
           ===================================================================== */}
        {activeTab === 'today' && (
          <>
            {/* THẺ HERO: CA TRỰC Y KHOA + TIẾN ĐỘ TRONG NGÀY */}
            <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                {/* Nút chạm 1 phát để đổi Ca trực ngay */}
                <button
                  type="button"
                  onClick={() => setShowShiftPickerSheet((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition active:scale-95 ${
                    shiftMeta
                      ? `${shiftMeta.bgClass} ${shiftMeta.textClass} ${shiftMeta.borderClass}`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Stethoscope className="w-4 h-4 shrink-0" />
                  <span>{shiftMeta ? `Ca trực: ${shiftMeta.label}` : '+ Gán ca trực hôm nay'}</span>
                </button>

                {/* Tiến độ hoàn thành */}
                <div className="text-right">
                  <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    {completedTodayCount}/{totalTodayCount} việc ({progressPct}%)
                  </div>
                  <div className="w-28 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1 ml-auto">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Khung chọn nhanh Ca trực ngay tại chỗ khi bấm vào nút Ca trực */}
              {showShiftPickerSheet && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold">Chọn nhanh ca trực ngày {selectedDate}:</span>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoPostShift}
                        onChange={(e) => setAutoPostShift(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Tự điền Ra trực hôm sau</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.keys(DUTY_SHIFT_META) as DutyShiftType[]).map((sType) => {
                      const meta = DUTY_SHIFT_META[sType];
                      const active = currentDutyShift?.type === sType;
                      return (
                        <button
                          key={sType}
                          type="button"
                          onClick={() => {
                            setDutyShift(selectedDate, sType, '', autoPostShift);
                            setShowShiftPickerSheet(false);
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                            active
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : `${meta.bgClass} ${meta.textClass} ${meta.borderClass}`
                          }`}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setDutyShift(selectedDate, null);
                        setShowShiftPickerSheet(false);
                      }}
                      className="py-2 px-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                    >
                      Không trực
                    </button>
                  </div>
                </div>
              )}

              {/* Cảnh báo việc quá hạn (Nếu có) với nút Gom 1 chạm */}
              {overdue.length > 0 && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-300/60 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold truncate">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">Có {overdue.length} việc tồn từ ngày trước</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMoveAllOverdueToToday}
                    className="px-2.5 py-1 rounded-xl bg-amber-500 text-white font-bold text-[11px] shrink-0 active:scale-95 transition"
                  >
                    Gom về Hôm nay
                  </button>
                </div>
              )}
            </div>

            {/* SEGMENTED CONTROL CHUẨN iOS: TIÊU ĐIỂM | LỊCH GIỜ | THÓI QUEN */}
            <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTodaySubView('focus')}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  todaySubView === 'focus'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🎯 Việc cần làm ({totalTodayCount})
              </button>
              <button
                type="button"
                onClick={() => setTodaySubView('timeline')}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  todaySubView === 'timeline'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                ⏰ Lịch giờ ({currentHHMM})
              </button>
              <button
                type="button"
                onClick={() => setTodaySubView('habits')}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  todaySubView === 'habits'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                💪 Thói quen ({state.habits.length})
              </button>
            </div>

            {/* -----------------------------------------------------------------
                CHẾ ĐỘ 1.1: TIÊU ĐIỂM TOP 3 & DANH SÁCH VIỆC CẦN LÀM (1-CHẠM)
               ----------------------------------------------------------------- */}
            {todaySubView === 'focus' && (
              <div className="space-y-3.5">
                {/* KHỐI TOP 3 VIỆC QUAN TRỌNG NHẤT TRONG NGÀY */}
                <section className="p-3.5 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <h2 className="text-xs font-extrabold uppercase tracking-wider">
                        Top 3 Tiêu Điểm Trong Ngày ({topFocus.length}/3)
                      </h2>
                    </div>
                    {topFocus.length < 3 && (
                      <button
                        type="button"
                        onClick={() => openQuickAdd('', true)}
                        className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold transition"
                      >
                        + Thêm Top 3
                      </button>
                    )}
                  </div>

                  {topFocus.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => openQuickAdd('', true)}
                      className="w-full py-3.5 px-3 rounded-2xl border border-dashed border-white/35 text-xs text-indigo-100 font-medium text-center"
                    >
                      Chạm để chọn tối đa 3 việc quan trọng nhất phải hoàn thành hôm nay
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {topFocus.map((task) => {
                        const isDone = task.status === 'done';
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-2xl transition ${
                              isDone
                                ? 'bg-white/10 text-indigo-200'
                                : 'bg-white text-slate-900 shadow-xs'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTaskStatus(task.id)}
                              aria-label={`Hoàn thành ${task.title}`}
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition active:scale-90 ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-indigo-600 text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingTask(task)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p
                                className={`text-sm font-bold leading-snug ${
                                  isDone ? 'line-through opacity-75' : ''
                                }`}
                              >
                                {task.title}
                              </p>
                              {task.start_time && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-0.5 ${
                                    isDone ? 'text-indigo-200' : 'text-indigo-600'
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {formatTimeHHMM(task.start_time)}
                                  {task.end_time ? ` - ${formatTimeHHMM(task.end_time)}` : ''}
                                </span>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* KHỐI CÁC CÔNG VIỆC KHÁC TRONG NGÀY */}
                <section className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Danh sách công việc ({regularTasks.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => openQuickAdd('', false)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      + Thêm việc
                    </button>
                  </div>

                  {regularTasks.length === 0 ? (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-xs text-slate-400">
                        Chưa có công việc phụ nào trong ngày này.
                      </p>
                      <button
                        type="button"
                        onClick={() => openQuickAdd('', false)}
                        className="px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-xs font-bold"
                      >
                        + Tạo việc mới ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {regularTasks.map((task) => {
                        const isDone = task.status === 'done';
                        const cat = state.categories.find((c) => c.id === task.category_id);
                        return (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                              isDone
                                ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 opacity-60'
                                : 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTaskStatus(task.id)}
                              aria-label={`Đánh dấu ${task.title}`}
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition active:scale-90 ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 dark:border-slate-600 text-transparent'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingTask(task)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p
                                className={`text-sm font-semibold leading-snug ${
                                  isDone ? 'line-through text-slate-400' : ''
                                }`}
                              >
                                {task.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {task.start_time && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                    <Clock className="w-3 h-3" />
                                    {formatTimeHHMM(task.start_time)}
                                    {task.end_time ? `-${formatTimeHHMM(task.end_time)}` : ''}
                                  </span>
                                )}
                                {cat && (
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: `${cat.color}20`,
                                      color: cat.color,
                                    }}
                                  >
                                    {cat.name}
                                  </span>
                                )}
                                {task.priority === 'urgent' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                    Khẩn cấp
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* -----------------------------------------------------------------
                CHẾ ĐỘ 1.2: DÒNG THỜI GIAN DỌC TINH GỌN CHO iPHONE 12 PRO MAX
               ----------------------------------------------------------------- */}
            {todaySubView === 'timeline' && (
              <section className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                      Giờ hiện tại: {currentHHMM}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openQuickAdd('08:00', false)}
                    className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 text-xs font-bold"
                  >
                    + Chèn khung giờ
                  </button>
                </div>

                {/* Dòng thời gian gọn từ 06:00 đến 22:00 dành riêng cho màn hình dọc iPhone */}
                <div className="space-y-1.5 pt-1">
                  {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((hour) => {
                    const hourLabel = `${String(hour).padStart(2, '0')}:00`;
                    const isCurrentHour =
                      selectedDate === todayIso && nowTime.getHours() === hour;
                    const slotTasks = scheduled.filter((t) => {
                      if (!t.start_time) return false;
                      const h = Number(t.start_time.split(':')[0]);
                      return h === hour;
                    });

                    return (
                      <div
                        key={hour}
                        className={`flex items-start gap-2.5 p-2 rounded-2xl border transition ${
                          isCurrentHour
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                            : slotTasks.length > 0
                            ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="w-12 shrink-0 pt-1">
                          <span
                            className={`text-xs font-mono font-bold ${
                              isCurrentHour
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {hourLabel}
                          </span>
                          {isCurrentHour && (
                            <span className="block text-[9px] font-extrabold text-rose-500 uppercase">
                              Hiện tại
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {slotTasks.length > 0 ? (
                            slotTasks.map((st) => {
                              const done = st.status === 'done';
                              return (
                                <div
                                  key={st.id}
                                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl ${
                                    st.is_top_focus
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setEditingTask(st)}
                                    className="flex-1 min-w-0 text-left"
                                  >
                                    <p
                                      className={`text-xs font-bold truncate ${
                                        done ? 'line-through opacity-60' : ''
                                      }`}
                                    >
                                      {st.is_top_focus ? '⭐ ' : ''}
                                      {st.title}
                                    </p>
                                    <span className="text-[10px] opacity-80 font-mono">
                                      {formatTimeHHMM(st.start_time)} -{' '}
                                      {formatTimeHHMM(st.end_time) || '...'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleTaskStatus(st.id)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                                      done
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : st.is_top_focus
                                        ? 'border-white/60 text-transparent'
                                        : 'border-slate-300 dark:border-slate-600 text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <button
                              type="button"
                              onClick={() => openQuickAdd(hourLabel, false)}
                              className="w-full text-left py-1 px-2 rounded-lg text-[11px] text-slate-400 hover:text-indigo-500 transition"
                            >
                              + Chạm để thêm việc lúc {hourLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* -----------------------------------------------------------------
                CHẾ ĐỘ 1.3: THÓI QUEN HÀNG NGÀY (1-CHẠM CHECK-IN)
               ----------------------------------------------------------------- */}
            {todaySubView === 'habits' && (
              <section className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Duy trì thói quen ngày {selectedDate}
                </h2>
                <div className="space-y-2">
                  {state.habits.map((habit) => {
                    const isChecked = state.habitLogs.some(
                      (l) => l.habit_id === habit.id && l.date === selectedDate && l.completed
                    );
                    const streak = calculateHabitStreak(
                      habit.id,
                      state.habitLogs,
                      selectedDate,
                      habit.frequency
                    );

                    return (
                      <button
                        key={habit.id}
                        type="button"
                        onClick={() => toggleHabitForDate(habit.id, selectedDate)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition active:scale-[0.99] ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-400/60 dark:border-emerald-700'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 dark:border-slate-600 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{habit.title}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Chạm để đánh dấu hoàn thành hôm nay
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-extrabold">
                          <Flame className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{streak} ngày</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* =====================================================================
            TAB 2: LỊCH TRỰC & LỊCH THÁNG GỌN CHO BÁC SĨ
           ===================================================================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-3.5">
            {/* Thống kê nhanh số ca trực trong tháng */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tổng trực</span>
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  {monthStats.totalActiveShifts}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-200 dark:border-rose-900/60 text-center">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase block">
                  Trực 24h
                </span>
                <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                  {monthStats.shift24hCount}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-200 dark:border-purple-900/60 text-center">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase block">
                  Trực Đêm
                </span>
                <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
                  {monthStats.nightCount}
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-200 dark:border-amber-900/60 text-center">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">
                  Ra trực
                </span>
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {monthStats.postShiftCount}
                </span>
              </div>
            </div>

            {/* Lưới lịch tháng gọn chuẩn iPhone 12 Pro Max */}
            <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = calendarMonthIso.split('-').map(Number);
                    const prevM = m === 1 ? 12 : m - 1;
                    const prevY = m === 1 ? y - 1 : y;
                    setCalendarMonthIso(`${prevY}-${String(prevM).padStart(2, '0')}`);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-extrabold">
                  Tháng {calendarMonthIso.slice(5, 7)} / {calendarMonthIso.slice(0, 4)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = calendarMonthIso.split('-').map(Number);
                    const nextM = m === 12 ? 1 : m + 1;
                    const nextY = m === 12 ? y + 1 : y;
                    setCalendarMonthIso(`${nextY}-${String(nextM).padStart(2, '0')}`);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthGridDays.map((iso, idx) => {
                  if (!iso) {
                    return <div key={`blank-${idx}`} className="h-12" />;
                  }
                  const isSel = iso === selectedDate;
                  const isTod = iso === todayIso;
                  const shift = (state.dutyShifts || []).find((s) => s.date === iso);
                  const sMeta = shift ? DUTY_SHIFT_META[shift.type] : null;
                  const dayTasks = state.tasks.filter(
                    (t) => t.scheduled_date === iso && t.status !== 'cancelled'
                  );

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDate(iso)}
                      className={`h-12 rounded-2xl flex flex-col items-center justify-between p-1 border transition active:scale-95 ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : isTod
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800'
                      }`}
                    >
                      <span className="text-xs font-extrabold leading-none">
                        {Number(iso.slice(8, 10))}
                      </span>
                      {sMeta ? (
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md leading-tight ${
                            isSel ? 'bg-white/25 text-white' : `${sMeta.bgClass} ${sMeta.textClass}`
                          }`}
                        >
                          {sMeta.shortBadge}
                        </span>
                      ) : dayTasks.length > 0 ? (
                        <span
                          className={`text-[9px] font-bold ${
                            isSel ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {dayTasks.length} việc
                        </span>
                      ) : (
                        <span className="h-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khung gán nhanh Ca trực 1-chạm cho ngày đang chọn */}
            <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold">
                  Gán nhanh Ca trực ({selectedDate}):
                </span>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={autoPostShift}
                    onChange={(e) => setAutoPostShift(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Tự điền Ra trực hôm sau</span>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(DUTY_SHIFT_META) as DutyShiftType[]).map((sType) => {
                  const meta = DUTY_SHIFT_META[sType];
                  const active = currentDutyShift?.type === sType;
                  return (
                    <button
                      key={sType}
                      type="button"
                      onClick={() => setDutyShift(selectedDate, sType, '', autoPostShift)}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition active:scale-95 ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : `${meta.bgClass} ${meta.textClass} ${meta.borderClass}`
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setDutyShift(selectedDate, null)}
                  className="py-2.5 px-2 rounded-2xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                >
                  Xóa ca trực
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: HỘP NHÁP (INBOX) & MỤC TIÊU TRỌNG TÂM
           ===================================================================== */}
        {activeTab === 'inbox_goals' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setInboxOrGoals('inbox')}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  inboxOrGoals === 'inbox'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                📥 Hộp thư nháp ({inboxTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setInboxOrGoals('goals')}
                className={`py-2 rounded-xl text-xs font-bold transition ${
                  inboxOrGoals === 'goals'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                🏆 Mục tiêu ({state.goals.length})
              </button>
            </div>

            {inboxOrGoals === 'inbox' ? (
              <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase">
                    Việc chợt nhớ chưa xếp ngày
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      openQuickAdd('', false);
                      setQuickTargetDate('inbox');
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    + Thêm vào nháp
                  </button>
                </div>

                {inboxTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Hộp thư nháp trống! Mọi ý tưởng đã được sắp xếp gọn gàng.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inboxTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold">{t.title}</p>
                          <button
                            type="button"
                            onClick={() => deleteTask(t.id)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => moveTaskToDate(t.id, todayIso)}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Làm Hôm nay
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTaskToDate(t.id, tomorrowIso)}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold active:scale-95 transition"
                          >
                            Để Ngày mai
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {state.goals.map((goal) => {
                  const pct = computeGoalProgress(goal, state.milestones, state.tasks);
                  const goalMilestones = state.milestones.filter((m) => m.goal_id === goal.id);
                  return (
                    <div
                      key={goal.id}
                      className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-extrabold">{goal.title}</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-xs font-extrabold">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {goalMilestones.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {goalMilestones.map((ms) => (
                            <button
                              key={ms.id}
                              type="button"
                              onClick={() => toggleMilestone(ms.id)}
                              className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-left text-xs"
                            >
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                  ms.is_completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-slate-300 dark:border-slate-600 text-transparent'
                                }`}
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                              <span
                                className={`flex-1 font-medium ${
                                  ms.is_completed ? 'line-through text-slate-400' : ''
                                }`}
                              >
                                {ms.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 4: ĐỒNG BỘ ĐÁM MÂY SUPABASE & CÀI ĐẶT iPHONE 12 PRO MAX
           ===================================================================== */}
        {activeTab === 'sync' && (
          <div className="space-y-3.5">
            {/* Thẻ trạng thái Cloud */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  <span className="text-sm font-extrabold">Đồng bộ Đám mây Realtime</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 text-[11px] font-bold">
                  Hồ sơ: {state.syncConfig.profileKey || 'personal-main'}
                </span>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed">
                Mọi thay đổi trên chiếc iPhone 12 Pro Max này sẽ tự động đồng bộ 2 chiều với bản Web
                trên máy tính của bạn.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void triggerCloudSync('pull')}
                  disabled={isSyncing}
                  className="py-2.5 px-3 rounded-2xl bg-white text-indigo-700 text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <DownloadCloud className="w-4 h-4" />
                  Kéo từ Máy tính về
                </button>
                <button
                  type="button"
                  onClick={() => void triggerCloudSync('push')}
                  disabled={isSyncing}
                  className="py-2.5 px-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <UploadCloud className="w-4 h-4" />
                  Đẩy lên Đám mây
                </button>
              </div>
            </div>

            {/* Cài đặt nhanh trên iPhone */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Tùy chỉnh nhanh cho iPhone 12 Pro Max
              </h3>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold">Giao diện Tối (OLED Dark Mode)</p>
                  <p className="text-[11px] text-slate-500">
                    Tiết kiệm pin tối đa cho màn hình Super Retina XDR
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold ${
                    state.darkMode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {state.darkMode ? 'Đang Bật' : 'Đang Tắt'}
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold">Chuông & Thông báo nhắc việc</p>
                  <p className="text-[11px] text-slate-500">
                    Sáng: {state.notificationSettings.morningPlanTime} • Tối:{' '}
                    {state.notificationSettings.eveningReviewTime}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playNotificationChime();
                    setToastAlert('🔔 Đã phát thử chuông báo trên iPhone!');
                  }}
                  className="px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 text-xs font-bold"
                >
                  Thử chuông
                </button>
              </div>

              {onSwitchToDesktop && (
                <button
                  type="button"
                  onClick={onSwitchToDesktop}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Laptop className="w-4 h-4" />
                  Chuyển sang Giao diện Máy tính Đầy đủ (Web Mode)
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =======================================================================
          BOTTOM SHEET 1: GHI NHANH CÔNG VIỆC 1-CHẠM (QUICK CAPTURE)
         ======================================================================= */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center">
          <form
            onSubmit={handleQuickAddSubmit}
            className="w-full max-w-[428px] bg-white dark:bg-slate-900 rounded-t-[32px] p-5 pb-safe space-y-4 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Ghi nhanh 1-Chạm
              </span>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 text-xs font-bold">
                {quickError}
              </div>
            )}

            <input
              type="text"
              autoFocus
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Nhập tên công việc, ca mổ, hội chẩn..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Chọn Ngày 1 chạm */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Ngày thực hiện</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickTargetDate('today')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    quickTargetDate === 'today'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTargetDate('tomorrow')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    quickTargetDate === 'tomorrow'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Ngày mai
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTargetDate('inbox')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    quickTargetDate === 'inbox'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Hộp thư nháp
                </button>
              </div>
            </div>

            {/* Chọn Khung giờ 1 chạm */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Khung giờ nhanh (Chạm để chọn)
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_TIME_PRESETS.map((preset) => {
                  const active = quickStartTime === preset.start;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setQuickStartTime(preset.start);
                        setQuickEndTime(preset.end);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mức ưu tiên & Top 3 */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setQuickTopFocus((v) => !v)}
                className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-extrabold border flex items-center justify-center gap-1.5 ${
                  quickTopFocus
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Star className="w-4 h-4" />
                Đưa vào Top 3 Tiêu điểm
              </button>

              <button
                type="button"
                onClick={() =>
                  setQuickPriority((p) => (p === 'urgent' ? 'high' : 'urgent'))
                }
                className={`py-2.5 px-3.5 rounded-2xl text-xs font-extrabold border ${
                  quickPriority === 'urgent'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                🔥 Khẩn cấp
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold shadow-lg active:scale-[0.99] transition"
            >
              Lưu Công Việc Ngay
            </button>
          </form>
        </div>
      )}

      {/* =======================================================================
          BOTTOM SHEET 2: CHỈNH NHANH CÔNG VIỆC KHI CHẠM VÀO THẺ VIỆC
         ======================================================================= */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center">
          <div className="w-full max-w-[428px] bg-white dark:bg-slate-900 rounded-t-[32px] p-5 pb-safe space-y-4 shadow-2xl border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-extrabold leading-snug">{editingTask.title}</h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Đổi nhanh giờ bắt đầu */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Đổi nhanh giờ thực hiện
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_TIME_PRESETS.map((preset) => {
                  const active = (editingTask.start_time || '') === preset.start;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        updateTask(editingTask.id, {
                          start_time: preset.start || undefined,
                          end_time: preset.end || undefined,
                        });
                        setEditingTask({
                          ...editingTask,
                          start_time: preset.start || undefined,
                          end_time: preset.end || undefined,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Các thao tác 1 chạm */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextFocus = !editingTask.is_top_focus;
                  if (
                    nextFocus &&
                    !canMarkTopFocus(state.tasks, editingTask.scheduled_date, editingTask.id)
                  ) {
                    setToastAlert('⚠️ Ngày này đã đủ 3 việc Tiêu điểm!');
                    return;
                  }
                  updateTask(editingTask.id, { is_top_focus: nextFocus });
                  setEditingTask(null);
                }}
                className="py-2.5 px-3 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Star className="w-4 h-4" />
                {editingTask.is_top_focus ? 'Bỏ khỏi Top 3' : 'Đưa vào Top 3'}
              </button>

              <button
                type="button"
                onClick={() => {
                  moveTaskToDate(editingTask.id, tomorrowIso);
                  setEditingTask(null);
                  setToastAlert('📅 Đã dời công việc sang Ngày mai!');
                }}
                className="py-2.5 px-3 rounded-2xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                Dời sang Ngày mai
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  toggleTaskStatus(editingTask.id);
                  setEditingTask(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {editingTask.status === 'done' ? 'Đánh dấu Chưa xong' : 'Hoàn thành việc này'}
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteTask(editingTask.id);
                  setEditingTask(null);
                }}
                className="py-3 px-4 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-extrabold flex items-center justify-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          THANH ĐIỀU HƯỚNG ĐÁY CHUẨN iPHONE 12 PRO MAX (4 TAB + NÚT "+" GIỮA)
         ======================================================================= */}
      <nav
        aria-label="Điều hướng iPhone"
        className={`${
          isDesktopPreviewFrame ? 'absolute' : 'fixed'
        } bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-3 pt-1.5 pb-safe`}
      >
        <div className="max-w-[428px] mx-auto grid grid-cols-5 items-center">
          {/* Tab 1: Hôm nay */}
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center py-1 rounded-2xl transition active:scale-95 ${
              activeTab === 'today'
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 font-medium'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">Hôm nay</span>
          </button>

          {/* Tab 2: Lịch trực */}
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`flex flex-col items-center justify-center py-1 rounded-2xl transition active:scale-95 ${
              activeTab === 'schedule'
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 font-medium'
            }`}
          >
            <Calendar className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">Lịch trực</span>
          </button>

          {/* Nút Trung Tâm: + Ghi nhanh 1-Chạm */}
          <div className="flex justify-center -mt-5">
            <button
              type="button"
              onClick={() => openQuickAdd('', false)}
              aria-label="Ghi nhanh công việc"
              className="w-13 h-13 p-3.5 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 flex items-center justify-center active:scale-90 transition"
            >
              <Plus className="w-6 h-6 stroke-[2.8]" />
            </button>
          </div>

          {/* Tab 3: Nháp & Mục tiêu */}
          <button
            type="button"
            onClick={() => setActiveTab('inbox_goals')}
            className={`relative flex flex-col items-center justify-center py-1 rounded-2xl transition active:scale-95 ${
              activeTab === 'inbox_goals'
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 font-medium'
            }`}
          >
            <Inbox className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">Nháp & Đích</span>
            {inboxTasks.length > 0 && (
              <span className="absolute top-0.5 right-3 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {inboxTasks.length}
              </span>
            )}
          </button>

          {/* Tab 4: Đồng bộ */}
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`flex flex-col items-center justify-center py-1 rounded-2xl transition active:scale-95 ${
              activeTab === 'sync'
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-400 dark:text-slate-500 font-medium'
            }`}
          >
            <Cloud className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">Đồng bộ</span>
          </button>
        </div>
      </nav>
    </div>
  );

  if (isDesktopPreviewFrame) {
    return (
      <div className="min-h-screen bg-slate-900/95 text-white py-4 px-4 flex flex-col items-center">
        <div className="w-full max-w-[900px] flex items-center justify-between mb-2 px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-xs font-extrabold">
              📱 iPhone 12 Pro Max (428 × 926 px)
            </span>
            <span className="text-xs text-slate-300">
              Giao diện di động tinh gọn, thao tác 1 ngón cái, đồng bộ thời gian thực với bản Web
            </span>
          </div>
          {onSwitchToDesktop && (
            <button
              type="button"
              onClick={onSwitchToDesktop}
              className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-extrabold hover:bg-slate-100 transition"
            >
              ← Quay lại Bản Web Máy Tính
            </button>
          )}
        </div>
        {shellContent}
      </div>
    );
  }

  return shellContent;
};
