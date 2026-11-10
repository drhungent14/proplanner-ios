import { PlannerState } from '../types/planner';

function shiftDays(baseIso: string, delta: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createInitialSeedState(todayIso = getTodayIso()): PlannerState {
  const monthKey = todayIso.slice(0, 7);

  return {
    version: 1,
    updated_at: new Date().toISOString(),
    darkMode: false,
    categories: [
      { id: 'work', name: 'Công việc & Sự nghiệp', color: '#4f46e5', icon: 'Briefcase' },
      { id: 'finance', name: 'Tài chính & Đầu tư', color: '#059669', icon: 'Wallet' },
      { id: 'study', name: 'Học tập & Kỹ năng', color: '#0284c7', icon: 'GraduationCap' },
      { id: 'health', name: 'Sức khỏe & Thể chất', color: '#e11d48', icon: 'HeartPulse' },
      { id: 'personal', name: 'Cá nhân & Gia đình', color: '#d97706', icon: 'Sparkles' },
    ],
    goals: [
      {
        id: 'goal-1',
        title: 'Ra mắt Hệ thống Phần mềm Quản lý & Đồng bộ Đa nền tảng',
        description: 'Hoàn thiện cả bản Web App trên máy tính và bản App cài trên iPhone có đồng bộ dữ liệu thời gian thực.',
        category_id: 'work',
        start_date: shiftDays(todayIso, -15),
        target_date: shiftDays(todayIso, 30),
        status: 'in_progress',
        progress_mode: 'auto_from_tasks',
        manual_progress: 60,
      },
      {
        id: 'goal-2',
        title: 'Đạt mục tiêu Quỹ Dự phòng & Tối ưu Ngân sách Quý 4',
        description: 'Kiểm soát chi tiêu hàng tháng, tăng tỷ lệ tiết kiệm và hoàn thành kế hoạch tài chính cá nhân.',
        category_id: 'finance',
        start_date: shiftDays(todayIso, -20),
        target_date: shiftDays(todayIso, 40),
        status: 'in_progress',
        progress_mode: 'auto_from_milestones',
        manual_progress: 50,
      },
      {
        id: 'goal-3',
        title: 'Nâng cấp Sức khỏe & Duy trì Kỷ luật Chạy bộ 100km/tháng',
        description: 'Rèn luyện thể lực mỗi sáng, ngủ trước 23:30 và theo dõi chỉ số sức khỏe định kỳ.',
        category_id: 'health',
        start_date: shiftDays(todayIso, -10),
        target_date: shiftDays(todayIso, 25),
        status: 'in_progress',
        progress_mode: 'auto_from_tasks',
        manual_progress: 40,
      },
    ],
    milestones: [
      {
        id: 'ms-1',
        goal_id: 'goal-1',
        title: 'Giai đoạn 1: Thiết kế kiến trúc & Hoàn thiện Web App trên máy tính',
        start_date: shiftDays(todayIso, -15),
        due_date: shiftDays(todayIso, 2),
        is_completed: true,
        order_index: 1,
      },
      {
        id: 'ms-2',
        goal_id: 'goal-1',
        title: 'Giai đoạn 2: Kết nối Cơ sở dữ liệu Đám mây Supabase Realtime',
        start_date: shiftDays(todayIso, 0),
        due_date: shiftDays(todayIso, 10),
        is_completed: false,
        order_index: 2,
      },
      {
        id: 'ms-3',
        goal_id: 'goal-1',
        title: 'Giai đoạn 3: Đóng gói App cài lên iPhone (.ipa / PWA) & Nhận thông báo',
        start_date: shiftDays(todayIso, 8),
        due_date: shiftDays(todayIso, 30),
        is_completed: false,
        order_index: 3,
      },
      {
        id: 'ms-4',
        goal_id: 'goal-2',
        title: 'Rà soát & chuẩn hóa bảng thu chi cố định hàng tháng',
        start_date: shiftDays(todayIso, -20),
        due_date: shiftDays(todayIso, -5),
        is_completed: true,
        order_index: 1,
      },
      {
        id: 'ms-5',
        goal_id: 'goal-2',
        title: 'Trích lập đủ 100% hạn mức quỹ đầu tư tháng này',
        start_date: shiftDays(todayIso, -4),
        due_date: shiftDays(todayIso, 20),
        is_completed: false,
        order_index: 2,
      },
    ],
    tasks: [
      {
        id: 'task-1',
        title: 'Kiểm thử toàn bộ giao diện Web App ProPlanner trên máy tính',
        notes: 'Rà soát kỹ các màn hình Ngày, Tuần, Tháng, Mục tiêu Timeline và Thống kê.',
        category_id: 'work',
        goal_id: 'goal-1',
        milestone_id: 'ms-1',
        status: 'todo',
        priority: 'urgent',
        scheduled_date: todayIso,
        start_time: '08:30',
        end_time: '10:30',
        estimated_minutes: 120,
        actual_minutes: 45,
        is_top_focus: true,
        recurrence: 'none',
        reminder_sent: false,
        subtasks: [
          { id: 'st-1', title: 'Kiểm tra bảng kéo-thả lịch tuần 7 ngày', is_completed: true },
          { id: 'st-2', title: 'Kiểm tra biểu đồ Timeline của Mục tiêu lớn', is_completed: true },
          { id: 'st-3', title: 'Thử nghiệm hẹn giờ thông báo nhắc việc', is_completed: false },
        ],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-2',
        title: 'Tổng kết thu chi tuần & cập nhật bảng kế hoạch tài chính',
        notes: 'Đối chiếu các khoản chi tiêu phát sinh trong tuần qua.',
        category_id: 'finance',
        goal_id: 'goal-2',
        milestone_id: 'ms-5',
        status: 'todo',
        priority: 'high',
        scheduled_date: todayIso,
        start_time: '14:00',
        end_time: '15:30',
        estimated_minutes: 90,
        actual_minutes: 0,
        is_top_focus: true,
        recurrence: 'weekly',
        reminder_sent: false,
        subtasks: [
          { id: 'st-4', title: 'Nhập sao kê ngân hàng', is_completed: false },
          { id: 'st-5', title: 'Cân đối hạn mức tuần tới', is_completed: false },
        ],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-3',
        title: 'Chạy bộ 5km buổi chiều & giãn cơ 15 phút',
        notes: 'Giữ nhịp tim vùng Zone 2 ổn định.',
        category_id: 'health',
        goal_id: 'goal-3',
        status: 'todo',
        priority: 'medium',
        scheduled_date: todayIso,
        start_time: '17:30',
        end_time: '18:30',
        estimated_minutes: 60,
        actual_minutes: 0,
        is_top_focus: true,
        recurrence: 'daily',
        reminder_sent: false,
        subtasks: [],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-4',
        title: 'Chuẩn bị tài liệu họp kế hoạch tuần mới',
        notes: 'Tập hợp các chỉ số KPI đã đạt được.',
        category_id: 'work',
        goal_id: 'goal-1',
        status: 'done',
        priority: 'high',
        scheduled_date: todayIso,
        start_time: '07:30',
        end_time: '08:15',
        estimated_minutes: 45,
        actual_minutes: 40,
        is_top_focus: false,
        recurrence: 'none',
        reminder_sent: true,
        subtasks: [],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-5',
        title: 'Thiết lập kết nối đồng bộ Supabase cho iPhone',
        notes: 'Tạo project Supabase miễn phí và dán URL/Key vào phần Cài đặt.',
        category_id: 'work',
        goal_id: 'goal-1',
        milestone_id: 'ms-2',
        status: 'todo',
        priority: 'high',
        scheduled_date: shiftDays(todayIso, 1),
        start_time: '09:00',
        end_time: '10:00',
        estimated_minutes: 60,
        is_top_focus: true,
        recurrence: 'none',
        reminder_sent: false,
        subtasks: [],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-6',
        title: 'Đọc 30 trang sách Quản trị Thời gian & Ghi chú',
        notes: 'Tóm tắt 3 ý tưởng áp dụng được ngay.',
        category_id: 'study',
        status: 'todo',
        priority: 'medium',
        scheduled_date: shiftDays(todayIso, 2),
        start_time: '20:30',
        end_time: '21:30',
        estimated_minutes: 60,
        is_top_focus: false,
        recurrence: 'none',
        reminder_sent: false,
        subtasks: [],
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-7',
        title: 'Ý tưởng: Tạo danh sách đồ dùng cần mua cho góc làm việc mới',
        notes: 'Đèn bàn chống cận, giá đỡ màn hình, kệ để điện thoại iPhone.',
        category_id: 'personal',
        status: 'todo',
        priority: 'low',
        scheduled_date: null, // Inbox task
        is_top_focus: false,
        recurrence: 'none',
        reminder_sent: false,
        subtasks: [],
        updated_at: new Date().toISOString(),
      },
    ],
    habits: [
      {
        id: 'habit-1',
        title: 'Uống đủ 2 lít nước & vận động 30 phút',
        category_id: 'health',
        goal_id: 'goal-3',
        frequency: [0, 1, 2, 3, 4, 5, 6],
        target_per_day: 1,
      },
      {
        id: 'habit-2',
        title: 'Rà soát Kế hoạch Ngày & Top 3 việc ưu tiên mỗi sáng',
        category_id: 'work',
        goal_id: 'goal-1',
        frequency: [1, 2, 3, 4, 5, 6],
        target_per_day: 1,
      },
      {
        id: 'habit-3',
        title: 'Đọc sách / Học kỹ năng mới 30 phút trước khi ngủ',
        category_id: 'study',
        frequency: [0, 1, 2, 3, 4, 5, 6],
        target_per_day: 1,
      },
      {
        id: 'habit-4',
        title: 'Ghi chép & kiểm tra chi tiêu cuối ngày',
        category_id: 'finance',
        goal_id: 'goal-2',
        frequency: [0, 1, 2, 3, 4, 5, 6],
        target_per_day: 1,
      },
    ],
    habitLogs: [
      { id: 'hl-1', habit_id: 'habit-1', date: shiftDays(todayIso, -2), completed: true },
      { id: 'hl-2', habit_id: 'habit-1', date: shiftDays(todayIso, -1), completed: true },
      { id: 'hl-3', habit_id: 'habit-1', date: todayIso, completed: true },
      { id: 'hl-4', habit_id: 'habit-2', date: shiftDays(todayIso, -3), completed: true },
      { id: 'hl-5', habit_id: 'habit-2', date: shiftDays(todayIso, -2), completed: true },
      { id: 'hl-6', habit_id: 'habit-2', date: shiftDays(todayIso, -1), completed: true },
      { id: 'hl-7', habit_id: 'habit-2', date: todayIso, completed: true },
      { id: 'hl-8', habit_id: 'habit-3', date: shiftDays(todayIso, -1), completed: true },
    ],
    periodPlans: [
      {
        id: 'pp-month-1',
        period_type: 'month',
        period_key: monthKey,
        focus_goals: [
          'Hoàn thành 100% Web App ProPlanner trên máy tính và kết nối đồng bộ iPhone',
          'Đạt kỷ luật 90% thói quen hàng ngày và hoàn thành mục tiêu tiết kiệm tháng',
          'Duy trì chạy bộ tối thiểu 4 buổi/tuần',
        ],
        reflection_notes: 'Tập trung ưu tiên hoàn thành Top 3 việc quan trọng nhất vào buổi sáng khi năng lượng cao nhất.',
      },
    ],
    dutyShifts: [
      {
        id: 'ds-seed-1',
        date: todayIso,
        type: 'shift_24h',
        note: 'Trực 24h tại Khoa — Bàn giao ca lúc 07:30 sáng',
      },
      {
        id: 'ds-seed-2',
        date: shiftDays(todayIso, 1),
        type: 'off_morning',
        note: 'Ra trực sáng nghỉ ngơi hồi sức',
      },
      {
        id: 'ds-seed-3',
        date: shiftDays(todayIso, 4),
        type: 'shift_night',
        note: 'Trực đêm — Chuẩn bị hồ sơ bệnh án',
      },
      {
        id: 'ds-seed-4',
        date: shiftDays(todayIso, 5),
        type: 'off_afternoon',
        note: 'Ra trực chiều',
      },
      {
        id: 'ds-seed-5',
        date: shiftDays(todayIso, 8),
        type: 'shift_day',
        note: 'Trực ngày',
      },
    ],
    syncConfig: {
      supabaseUrl:
        import.meta.env?.MODE === 'test'
          ? ''
          : (
              import.meta.env?.VITE_SUPABASE_URL ||
              'https://dtyscysyqpnnatordxhn.supabase.co'
            ).trim(),
      supabaseAnonKey:
        import.meta.env?.MODE === 'test'
          ? ''
          : (
              import.meta.env?.VITE_SUPABASE_ANON_KEY ||
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eXNjeXN5cXBubmF0b3JkeGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTE5ODAsImV4cCI6MjEwOTg4Nzk4MH0.AJlKgcW5S1c553Rjnqn3tFiYvCvOa30r8HFvyHpyiHE'
            ).trim(),
      profileKey: (import.meta.env?.VITE_SUPABASE_PROFILE_KEY || 'personal-main').trim(),
      autoSync: true,
    },
    notificationSettings: {
      browserEnabled: false,
      soundEnabled: true,
      morningPlanTime: '08:00',
      eveningReviewTime: '21:00',
    },
  };
}
