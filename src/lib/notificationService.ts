import { Capacitor, registerPlugin } from '@capacitor/core';
import { NotificationSettings, Task } from '../types/planner';
import { getDueReminders } from './plannerEngine';

interface LocalNotificationItem {
  id: number;
  title: string;
  body: string;
  schedule?: {
    at?: Date;
    on?: { hour: number; minute: number };
    repeats?: boolean;
    allowWhileIdle?: boolean;
  };
  sound?: string;
}

interface CapacitorLocalNotificationsPlugin {
  checkPermissions(): Promise<{ display: string }>;
  requestPermissions(): Promise<{ display: string }>;
  getPending(): Promise<{ notifications: { id: number }[] }>;
  cancel(options: { notifications: { id: number }[] }): Promise<void>;
  schedule(options: { notifications: LocalNotificationItem[] }): Promise<void>;
}

const NativeLocalNotifications = registerPlugin<CapacitorLocalNotificationsPlugin>(
  'LocalNotifications'
);

function hashTaskIdToNotificationId(taskId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < taskId.length; i++) {
    hash ^= taskId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 800000) + 10000;
}

export function isRunningOnNativeIos(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function syncNativeIosNotifications(
  tasks: Task[],
  settings: NotificationSettings
): Promise<void> {
  if (!isRunningOnNativeIos()) return;

  try {
    const perm = await NativeLocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      if (!settings.browserEnabled) return;
      const req = await NativeLocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }

    const pending = await NativeLocalNotifications.getPending();
    if (pending?.notifications?.length > 0) {
      await NativeLocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const toSchedule: LocalNotificationItem[] = [];
    const nowMs = Date.now();

    for (const task of tasks) {
      if (!task.reminder_at || task.reminder_sent || task.status === 'done') continue;
      const fireAt = new Date(task.reminder_at);
      if (Number.isNaN(fireAt.getTime()) || fireAt.getTime() <= nowMs) continue;

      toSchedule.push({
        id: hashTaskIdToNotificationId(task.id),
        title: `🔔 Nhắc việc: ${task.title}`,
        body: task.start_time
          ? `Khung giờ: ${task.start_time}${task.end_time ? ` - ${task.end_time}` : ''}`
          : 'Đã đến giờ thực hiện công việc trong kế hoạch của bạn!',
        schedule: {
          at: fireAt,
          allowWhileIdle: true,
        },
      });
    }

    if (settings.morningPlanTime) {
      const [mh, mm] = settings.morningPlanTime.split(':').map(Number);
      if (!Number.isNaN(mh) && !Number.isNaN(mm)) {
        toSchedule.push({
          id: 900001,
          title: '☀️ Nhắc Lập Kế Hoạch Sáng',
          body: `Đến giờ lập kế hoạch sáng (${settings.morningPlanTime})! Hãy chọn Top 3 việc tiêu điểm hôm nay.`,
          schedule: {
            on: { hour: mh, minute: mm },
            repeats: true,
          },
        });
      }
    }

    if (settings.eveningReviewTime) {
      const [eh, em] = settings.eveningReviewTime.split(':').map(Number);
      if (!Number.isNaN(eh) && !Number.isNaN(em)) {
        toSchedule.push({
          id: 900002,
          title: '🌙 Nhắc Tổng Kết Cuối Ngày',
          body: `Đến giờ tổng kết tối (${settings.eveningReviewTime})! Hãy rà soát công việc & tích thói quen hôm nay.`,
          schedule: {
            on: { hour: eh, minute: em },
            repeats: true,
          },
        });
      }
    }

    if (toSchedule.length > 0) {
      await NativeLocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch {
    // Bỏ qua nếu thiết bị chưa cấp quyền thông báo gốc
  }
}

export function playNotificationChime(): void {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      if (typeof ctx.close === 'function') {
        void ctx.close().catch(() => {});
      }
    };
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Ignore audio context restriction errors
  }
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (isRunningOnNativeIos()) {
    try {
      const res = await NativeLocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function fireTaskNotification(
  task: Task,
  options: { browserEnabled: boolean; soundEnabled: boolean }
): void {
  if (options.soundEnabled) {
    playNotificationChime();
  }
  if (
    options.browserEnabled &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(`🔔 Nhắc việc: ${task.title}`, {
        body: task.start_time
          ? `Khung giờ: ${task.start_time}${task.end_time ? ` - ${task.end_time}` : ''}`
          : 'Đã đến giờ thực hiện công việc trong kế hoạch của bạn!',
      });
    } catch {
      // Ignore notification constructor errors
    }
  }
}

export function checkAndFireReminders(
  tasks: Task[],
  nowIso: string,
  options: { browserEnabled: boolean; soundEnabled: boolean },
  onMarkSent: (taskId: string) => void
): Task[] {
  const due = getDueReminders(tasks, nowIso);
  for (const task of due) {
    fireTaskNotification(task, options);
    onMarkSent(task.id);
  }
  return due;
}

export function checkDailyRoutineNotifications(
  now: Date,
  settings: NotificationSettings,
  firedTracker: { morningDate?: string; eveningDate?: string }
): string | null {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayIso = `${y}-${m}-${d}`;
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentHm = `${hh}:${mm}`;

  const emitRoutineAlert = (title: string, body: string) => {
    if (settings.soundEnabled) {
      playNotificationChime();
    }
    if (
      settings.browserEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, { body });
      } catch {
        // Ignore notification errors
      }
    }
  };

  if (
    settings.morningPlanTime &&
    currentHm === settings.morningPlanTime &&
    firedTracker.morningDate !== todayIso
  ) {
    firedTracker.morningDate = todayIso;
    const msg = `☀️ Đến giờ lập kế hoạch sáng (${settings.morningPlanTime})! Hãy chọn Top 3 việc tiêu điểm hôm nay.`;
    emitRoutineAlert('☀️ Nhắc Lập Kế Hoạch Sáng', msg);
    return msg;
  }

  if (
    settings.eveningReviewTime &&
    currentHm === settings.eveningReviewTime &&
    firedTracker.eveningDate !== todayIso
  ) {
    firedTracker.eveningDate = todayIso;
    const msg = `🌙 Đến giờ tổng kết tối (${settings.eveningReviewTime})! Hãy rà soát công việc & tích thói quen hôm nay.`;
    emitRoutineAlert('🌙 Nhắc Tổng Kết Cuối Ngày', msg);
    return msg;
  }

  return null;
}
