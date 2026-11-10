import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CalendarRange,
  CheckSquare,
  Cloud,
  Inbox,
  BarChart3,
  Target,
  Settings,
  Bell,
  Moon,
  Sun,
  Smartphone,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import {
  checkAndFireReminders,
  checkDailyRoutineNotifications,
  playNotificationChime,
} from '../lib/notificationService';
import { formatReminderDisplay } from '../lib/plannerEngine';
import { getTodayIso } from '../lib/seedData';
import { CustomDatePicker } from './CustomPickers';

export type NavTab =
  | 'today'
  | 'week'
  | 'month'
  | 'goals'
  | 'inbox'
  | 'analytics'
  | 'settings';

interface LayoutShellProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMobilePreview?: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: NavTab; label: string; shortLabel: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'today', label: 'Hôm nay (Tiêu điểm)', shortLabel: 'Hôm nay', icon: CheckSquare },
  { id: 'week', label: 'Kế hoạch Tuần', shortLabel: 'Tuần', icon: CalendarRange },
  { id: 'month', label: 'Kế hoạch Tháng', shortLabel: 'Tháng', icon: CalendarDays },
  { id: 'goals', label: 'Mục tiêu & Lộ trình', shortLabel: 'Mục tiêu', icon: Target },
  { id: 'inbox', label: 'Hộp thư nháp', shortLabel: 'Nháp', icon: Inbox },
  { id: 'analytics', label: 'Thống kê & Tiến độ', shortLabel: 'Thống kê', icon: BarChart3 },
  { id: 'settings', label: 'Đồng bộ & Cài đặt', shortLabel: 'Cài đặt', icon: Settings },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeTab,
  onSelectTab,
  onOpenMobilePreview,
  children,
}) => {
  const {
    state,
    selectedDate,
    setSelectedDate,
    toggleDarkMode,
    markReminderSent,
    triggerCloudSync,
    isSyncing,
  } = usePlanner();
  const [showBellPopover, setShowBellPopover] = useState(false);
  const [recentAlert, setRecentAlert] = useState<string | null>(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('proplanner_sidebar_hidden') === '1';
    } catch {
      return false;
    }
  });
  const routineTrackerRef = useRef<{ morningDate?: string; eveningDate?: string }>({});

  const toggleSidebar = () => {
    setIsSidebarHidden((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('proplanner_sidebar_hidden', next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const inboxCount = state.tasks.filter(
    (t) => t.scheduled_date === null && t.status !== 'done' && t.status !== 'cancelled'
  ).length;

  const upcomingReminders = state.tasks.filter(
    (t) => t.reminder_at && !t.reminder_sent && t.status !== 'done'
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      const fired = checkAndFireReminders(
        state.tasks,
        now.toISOString(),
        state.notificationSettings,
        markReminderSent
      );
      if (fired.length > 0) {
        setRecentAlert(`🔔 Nhắc việc: ${fired.map((f) => f.title).join(', ')}`);
      }
      const routineAlert = checkDailyRoutineNotifications(
        now,
        state.notificationSettings,
        routineTrackerRef.current
      );
      if (routineAlert) {
        setRecentAlert(routineAlert);
      }
    }, 15000);
    return () => window.clearInterval(interval);
  }, [state.tasks, state.notificationSettings, markReminderSent]);

  const isCloudConfigured = Boolean(
    state.syncConfig.supabaseUrl && state.syncConfig.supabaseAnonKey
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar cho Máy tính (Desktop Web App) — Có thể ẩn/hiện để tối ưu không gian */}
      {!isSidebarHidden && (
        <aside
          data-testid="desktop-sidebar"
          className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 transition-all"
        >
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                P
              </div>
              <div>
                <h1 className="font-bold text-base tracking-tight leading-none">ProPlanner</h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleDarkMode}
                title="Đổi giao diện Sáng / Tối"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={toggleSidebar}
                title="Ẩn thanh điều hướng bên trái để mở rộng không gian"
                aria-label="Ẩn thanh điều hướng"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'inbox' && inboxCount > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      {inboxCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Trạng thái đồng bộ Máy tính <-> iPhone */}
          <div className="p-4 m-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-indigo-500" />
                <span>Trạng thái Đồng bộ</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isCloudConfigured
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {isCloudConfigured ? 'Cloud Online' : 'Lưu tại máy'}
              </span>
            </div>
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                onClick={() =>
                  isCloudConfigured ? triggerCloudSync('auto') : onSelectTab('settings')
                }
                disabled={isSyncing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudConfigured ? 'Đồng bộ ngay' : 'Kết nối iPhone'}</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Khung nội dung chính */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Thanh Header trên cùng */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between gap-3 pt-safe">
          <div className="flex items-center gap-2.5">
            {/* Nút Ẩn / Hiện cột điều hướng bên trái trên Desktop */}
            <button
              type="button"
              data-testid="toggle-sidebar-btn"
              onClick={toggleSidebar}
              title={
                isSidebarHidden
                  ? 'Hiện thanh điều hướng bên trái'
                  : 'Ẩn thanh điều hướng bên trái'
              }
              aria-label={
                isSidebarHidden
                  ? 'Hiện thanh điều hướng'
                  : 'Ẩn thanh điều hướng'
              }
              className="hidden md:inline-flex items-center justify-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 transition"
            >
              {isSidebarHidden ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            <div className="md:hidden w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              P
            </div>
            <div>
              <h2 className="font-bold text-sm md:text-base">
                {NAV_ITEMS.find((i) => i.id === activeTab)?.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Khi đang ẩn Sidebar trên Desktop thì hiển thị nút đổi Sáng/Tối ngay trên Header */}
            {isSidebarHidden && (
              <button
                type="button"
                onClick={toggleDarkMode}
                title="Đổi giao diện Sáng / Tối"
                className="hidden md:inline-flex p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              >
                {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            {/* Nút quay nhanh về Hôm nay khi đang xem ngày khác */}
            {selectedDate !== getTodayIso() && (
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayIso())}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                title="Quay về ngày hôm nay thực tế"
              >
                Hôm nay
              </button>
            )}

            {/* Bộ chọn ngày đang xem */}
            <CustomDatePicker
              ariaLabel="Ngày làm việc"
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              align="right"
            />

            {/* Nút Chuông Thông báo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBellPopover((v) => !v)}
                className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Trung tâm thông báo & nhắc việc"
              >
                <Bell className="w-4 h-4" />
                {upcomingReminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {upcomingReminders.length}
                  </span>
                )}
              </button>

              {showBellPopover && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4 z-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      Nhắc việc &amp; Chuông báo
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playNotificationChime();
                        setRecentAlert('🔔 Đã phát thử chuông báo nhắc việc!');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    >
                      Thử chuông
                    </button>
                  </div>
                  {upcomingReminders.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">
                      Chưa có lời nhắc nào đang chờ. Bạn có thể đặt giờ nhắc trong chi tiết từng công việc.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {upcomingReminders.map((t) => (
                        <li
                          key={t.id}
                          className="text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
                        >
                          <span className="font-medium truncate">{t.title}</span>
                          <span className="text-slate-400 text-[11px] shrink-0 ml-2 font-mono">
                            {formatReminderDisplay(t.reminder_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                    <span>
                      Sáng: {state.notificationSettings.morningPlanTime} • Tối:{' '}
                      {state.notificationSettings.eveningReviewTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBellPopover(false);
                        onSelectTab('settings');
                      }}
                      className="text-indigo-600 font-medium"
                    >
                      Cấu hình
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenMobilePreview ? onOpenMobilePreview() : onSelectTab('settings')
              }
              title="Mở giao diện di động tối ưu cho iPhone 12 Pro Max"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800 transition"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App iPhone 12 Pro Max</span>
            </button>
          </div>
        </header>

        {recentAlert && (
          <div className="mx-4 md:mx-6 mt-3 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-medium flex items-center justify-between shadow-sm">
            <span>{recentAlert}</span>
            <button
              type="button"
              onClick={() => setRecentAlert(null)}
              className="text-indigo-200 hover:text-white ml-4 p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>

      {/* Thanh điều hướng đáy chuẩn iPhone (Bottom Navigation Bar trên màn hình dọc) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="grid grid-cols-7 gap-0.5 px-1 py-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-medium transition ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-full">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
