import React, { useState } from 'react';
import {
  Target,
  Plus,
  Flag,
  Check,
  Zap,
  AlertTriangle,
  MapPin,
  X,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Layers,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { computeGoalProgress } from '../lib/plannerEngine';
import { getTodayIso } from '../lib/seedData';
import { CategoryIcon, SectionIconBadge } from '../components/PlannerIcons';
import { CustomDatePicker, CustomSelect } from '../components/CustomPickers';
import { ProgressMode } from '../types/planner';

function parseTimeMs(dateIso: string): number {
  const t = new Date(dateIso).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

function formatShortDayMonth(dateIso: string): string {
  const parts = dateIso.split('-');
  if (parts.length !== 3) return dateIso;
  return `${parts[2]}/${parts[1]}`;
}

function formatMsToDayMonth(ms: number): string {
  const dt = new Date(ms);
  const d = String(dt.getUTCDate()).padStart(2, '0');
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

function getDaysRemainingInfo(
  targetIso: string,
  referenceIso: string,
  isCompleted: boolean
): { label: string; badgeCls: string } {
  if (isCompleted) {
    return {
      label: 'Đã hoàn tất',
      badgeCls:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60',
    };
  }
  const diffDays = Math.round(
    (parseTimeMs(targetIso) - parseTimeMs(referenceIso)) / 86400000
  );
  if (diffDays < 0) {
    return {
      label: `Quá hạn ${Math.abs(diffDays)} ngày`,
      badgeCls:
        'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/60',
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Hạn hôm nay',
      badgeCls:
        'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60',
    };
  }
  return {
    label: `Còn ${diffDays} ngày`,
    badgeCls:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
  };
}

export const GoalsTimelineView: React.FC = () => {
  const {
    state,
    selectedDate,
    addGoal,
    deleteGoal,
    updateGoal,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
  } = usePlanner();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);

  // Form tạo mục tiêu mới
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(state.categories[0]?.id || 'work');
  const [startDate, setStartDate] = useState(selectedDate);
  const [targetDate, setTargetDate] = useState(selectedDate);
  const [progressMode, setProgressMode] = useState<ProgressMode>('auto_from_tasks');

  // Form thêm cột mốc (Milestone) ngay trong từng dòng Mục tiêu trên Gantt Roadmap
  const [addingMsGoalId, setAddingMsGoalId] = useState<string | null>(null);
  const [msTitleByGoal, setMsTitleByGoal] = useState<Record<string, string>>({});
  const [msDueByGoal, setMsDueByGoal] = useState<Record<string, string>>({});

  const filteredGoals = state.goals.filter(
    (g) => filterCategory === 'all' || g.category_id === filterCategory
  );

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addGoal({
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId,
      start_date: startDate,
      target_date: targetDate >= startDate ? targetDate : startDate,
      status: 'in_progress',
      progress_mode: progressMode,
      manual_progress: 0,
    });
    setTitle('');
    setDescription('');
    setShowNewGoalForm(false);
  };

  const handleAddMilestone = (goalId: string, goalStart: string, goalTarget: string) => {
    const msTitle = (msTitleByGoal[goalId] || '').trim();
    if (!msTitle) return;
    const due = msDueByGoal[goalId] || goalTarget;
    addMilestone({
      goal_id: goalId,
      title: msTitle,
      start_date: goalStart,
      due_date: due,
      is_completed: false,
      order_index: state.milestones.filter((m) => m.goal_id === goalId).length + 1,
    });
    setMsTitleByGoal((prev) => ({ ...prev, [goalId]: '' }));
    setAddingMsGoalId(null);
  };

  const todayIso = getTodayIso();

  // Tính phạm vi trục thời gian Gantt Timeline
  const allDatesMs = [
    ...filteredGoals.flatMap((g) => [parseTimeMs(g.start_date), parseTimeMs(g.target_date)]),
    parseTimeMs(todayIso),
  ];
  const minMs =
    allDatesMs.length > 0 ? Math.min(...allDatesMs) - 5 * 86400000 : Date.now() - 15 * 86400000;
  const maxMs =
    allDatesMs.length > 0 ? Math.max(...allDatesMs) + 5 * 86400000 : Date.now() + 30 * 86400000;
  const spanMs = Math.max(86400000, maxMs - minMs);

  const getPositionStyle = (startIso: string, endIso: string) => {
    const s = parseTimeMs(startIso);
    const e = Math.max(s + 86400000, parseTimeMs(endIso));
    const leftPct = Math.max(0, Math.min(95, ((s - minMs) / spanMs) * 100));
    const widthPct = Math.max(5, Math.min(100 - leftPct, ((e - s) / spanMs) * 100));
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  const todayMarkerLeftPct = Math.max(
    0,
    Math.min(100, ((parseTimeMs(todayIso) - minMs) / spanMs) * 100)
  );

  // Tạo thước đo 7 mốc ngày (Date Scale Ticks) chia đều trên đỉnh biểu đồ Gantt
  const axisTickCount = 7;
  const axisTicks = Array.from({ length: axisTickCount }, (_, idx) => {
    const ratio = idx / (axisTickCount - 1);
    const tickMs = minMs + ratio * spanMs;
    return {
      leftPct: ratio * 100,
      label: formatMsToDayMonth(tickMs),
    };
  });

  return (
    <div className="space-y-6">
      {/* Thanh công cụ Mục tiêu */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base">Mục tiêu &amp; Lộ trình (Goals &amp; Timeline)</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect
            ariaLabel="Lọc danh mục mục tiêu"
            headerTitle="Lọc theo danh mục"
            value={filterCategory}
            onChange={(val) => setFilterCategory(val)}
            align="right"
            options={[
              {
                value: 'all',
                label: `Tất cả danh mục (${state.goals.length})`,
                icon: <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
              },
              ...state.categories.map((cat) => ({
                value: cat.id,
                label: cat.name,
                icon: (
                  <CategoryIcon
                    categoryId={cat.id}
                    className="w-3.5 h-3.5 text-indigo-500 shrink-0"
                  />
                ),
              })),
            ]}
          />

          <button
            type="button"
            onClick={() => setShowNewGoalForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mục tiêu mới</span>
          </button>
        </div>
      </div>

      {/* Form thêm mục tiêu mới */}
      {showNewGoalForm && (
        <form
          onSubmit={handleCreateGoal}
          className="bg-white dark:bg-slate-900 border-2 border-indigo-500/70 rounded-2xl p-5 space-y-4 shadow-md"
        >
          <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
            Thiết lập Mục tiêu Dài hạn mới
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Tên mục tiêu *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Đạt chứng chỉ IELTS 7.5 / Tiết kiệm 100 triệu..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Danh mục cuộc sống</label>
              <CustomSelect
                value={categoryId}
                onChange={(val) => setCategoryId(val)}
                className="w-full py-2"
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
            </div>

            <div>
              <label className="block font-semibold mb-1">Cách tính % tiến độ</label>
              <CustomSelect
                value={progressMode}
                onChange={(val) => setProgressMode(val as ProgressMode)}
                className="w-full py-2"
                menuWidthClass="min-w-[270px]"
                options={[
                  {
                    value: 'auto_from_tasks',
                    label: 'Tự động từ Công việc & Cột mốc hoàn thành',
                  },
                  {
                    value: 'auto_from_milestones',
                    label: 'Chỉ tính theo các Cột mốc (Milestones)',
                  },
                  {
                    value: 'manual',
                    label: 'Tự kéo thanh % thủ công',
                  },
                ]}
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Ngày bắt đầu</label>
              <CustomDatePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
                align="left"
                className="w-full py-2"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Hạn hoàn thành (Deadline)</label>
              <CustomDatePicker
                value={targetDate}
                onChange={(val) => setTargetDate(val)}
                align="left"
                className="w-full py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Mô tả &amp; Động lực thực hiện</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tại sao mục tiêu này quan trọng với bạn? Kết quả mong đợi là gì?"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewGoalForm(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Lưu Mục tiêu
            </button>
          </div>
        </form>
      )}

      {/* Biểu đồ Lộ trình Timeline (Gantt Chart) chuẩn 2 phân khu trực quan, chuyên nghiệp */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Header & Chú thích màu sắc trực quan */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm sm:text-base">
              Biểu đồ Lộ trình Timeline (Gantt Roadmap)
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Đã hoàn thành</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Đang thực hiện</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Giai đoạn kế tiếp</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Hôm nay: {formatShortDayMonth(todayIso)} ({todayIso})</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[820px] rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-slate-50/40 dark:bg-slate-950/40">
            {/* Hàng Tiêu Đề Bảng Gantt (Table Header: Cột Tên hạng mục | Cột Thước đo thời gian) */}
            <div className="grid grid-cols-12 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
              <div className="col-span-5 px-4 py-3 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span>Hạng mục Mục tiêu &amp; Các giai đoạn (Milestones)</span>
                <span className="text-[11px] font-semibold text-slate-400">Tiến độ</span>
              </div>

              <div className="col-span-7 relative px-3 py-3 select-none">
                {/* Các mốc chia ngày trên thước đo */}
                <div className="relative h-5">
                  {axisTicks.map((tick, idx) => (
                    <span
                      key={idx}
                      style={{
                        left: `${tick.leftPct}%`,
                        transform:
                          idx === 0
                            ? 'translateX(0%)'
                            : idx === axisTicks.length - 1
                            ? 'translateX(-100%)'
                            : 'translateX(-50%)',
                      }}
                      className="absolute top-0.5 text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400"
                    >
                      {tick.label}
                    </span>
                  ))}

                  {/* Nhãn định vị Ngày Hôm Nay thực tế trên đỉnh thước đo */}
                  <div
                    style={{
                      left: `${todayMarkerLeftPct}%`,
                      transform: 'translateX(-50%)',
                    }}
                    className="absolute -top-1 z-20 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-sm whitespace-nowrap inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{formatShortDayMonth(todayIso)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Danh sách từng Khối Mục tiêu & Các Cột mốc con */}
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {filteredGoals.map((goal, goalIdx) => {
                const cat = state.categories.find((c) => c.id === goal.category_id);
                const goalColor = cat?.color || '#4f46e5';
                const pct = computeGoalProgress(goal, state.milestones, state.tasks);
                const barStyle = getPositionStyle(goal.start_date, goal.target_date);
                const goalMilestones = state.milestones
                  .filter((m) => m.goal_id === goal.id)
                  .sort((a, b) => a.order_index - b.order_index);
                const doneMsCount = goalMilestones.filter((m) => m.is_completed).length;
                const remainingInfo = getDaysRemainingInfo(
                  goal.target_date,
                  todayIso,
                  pct === 100 || goal.status === 'completed'
                );

                return (
                  <div
                    key={goal.id}
                    data-testid="gantt-goal-group"
                    className="bg-white dark:bg-slate-900"
                  >
                    {/* Dòng chính: Mục tiêu lớn (Goal Row) */}
                    <div className="grid grid-cols-12 items-center bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition">
                      {/* Cột trái (5/12): Thông tin Mục tiêu rõ ràng, không cắt chữ */}
                      <div className="col-span-5 px-4 py-3.5 border-r border-slate-200/80 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs inline-flex items-center gap-1"
                              style={{ backgroundColor: goalColor }}
                            >
                              <CategoryIcon categoryId={goal.category_id} className="w-3 h-3" />
                              <span>
                                Mục tiêu #{goalIdx + 1} • {cat?.name || 'Chung'}
                              </span>
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${remainingInfo.badgeCls}`}
                            >
                              {(pct === 100 || goal.status === 'completed') && (
                                <Check className="w-3 h-3" />
                              )}
                              <span>{remainingInfo.label}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="text-xs font-extrabold px-2.5 py-0.5 rounded-full text-white shadow-2xs"
                              style={{ backgroundColor: goalColor }}
                            >
                              {pct}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setAddingMsGoalId((prev) =>
                                  prev === goal.id ? null : goal.id
                                )
                              }
                              title="Thêm giai đoạn (Milestone) mới cho mục tiêu này"
                              className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800 text-[10px] font-bold inline-flex items-center gap-0.5 transition"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Giai đoạn</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGoal(goal.id)}
                              title="Xóa mục tiêu"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="font-bold text-xs sm:text-[13.5px] text-slate-900 dark:text-white leading-snug">
                          {goal.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>
                              {formatShortDayMonth(goal.start_date)} →{' '}
                              {formatShortDayMonth(goal.target_date)}/{goal.target_date.slice(0, 4)}
                            </span>
                          </span>
                          {goalMilestones.length > 0 && (
                            <span className="font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
                              <Flag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>
                                {doneMsCount}/{goalMilestones.length} giai đoạn hoàn thành
                              </span>
                            </span>
                          )}
                        </div>

                        {goal.progress_mode === 'manual' && (
                          <div className="pt-1">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={goal.manual_progress}
                              onChange={(e) =>
                                updateGoal(goal.id, {
                                  manual_progress: Number(e.target.value),
                                })
                              }
                              className="w-full accent-indigo-600 h-1.5"
                            />
                          </div>
                        )}
                      </div>

                      {/* Cột phải (7/12): Lưới thời gian & Thanh Gantt Mục tiêu có phân lớp Kế hoạch vs Thực tế */}
                      <div className="col-span-7 relative h-full min-h-[76px] px-3 flex items-center">
                        {/* Các đường gióng dọc (Vertical Grid Lines) */}
                        <div className="absolute inset-y-0 left-3 right-3 pointer-events-none">
                          {axisTicks.map((tick, idx) => (
                            <div
                              key={idx}
                              style={{ left: `${tick.leftPct}%` }}
                              className="absolute top-0 bottom-0 border-l border-dashed border-slate-200/80 dark:border-slate-800"
                            />
                          ))}
                          {/* Vạch đỏ Ngày Đang Chọn */}
                          <div
                            style={{ left: `${todayMarkerLeftPct}%` }}
                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500/85 z-20"
                          />
                        </div>

                        {/* Khung đường ray toàn trục */}
                        <div className="relative w-full h-9">
                          {/* Thanh kế hoạch của Mục tiêu (từ start_date -> target_date) */}
                          <div
                            data-testid="gantt-goal-bar"
                            style={{
                              ...barStyle,
                              borderColor: goalColor,
                            }}
                            className="absolute top-0.5 bottom-0.5 rounded-xl bg-slate-200/75 dark:bg-slate-800 border-2 overflow-hidden shadow-xs flex items-center"
                          >
                            {/* Phần ruột tô đậm thể hiện đúng % Tiến độ hoàn thành thực tế */}
                            <div
                              style={{
                                width: `${pct}%`,
                                backgroundColor: goalColor,
                              }}
                              className="h-full transition-all duration-300 opacity-90"
                            />

                            {/* Nhãn hiển thị nổi trên thanh Mục tiêu */}
                            <div className="absolute inset-0 px-2.5 flex items-center justify-between text-[11px] font-extrabold pointer-events-none">
                              <span
                                className={`truncate drop-shadow-2xs ${
                                  pct >= 30
                                    ? 'text-white'
                                    : 'text-slate-800 dark:text-slate-100'
                                }`}
                              >
                                {pct}% hoàn thành
                              </span>
                              <span
                                className={`text-[10px] font-mono hidden sm:inline px-1.5 py-0.5 rounded ${
                                  pct >= 85
                                    ? 'bg-black/20 text-white'
                                    : 'bg-white/85 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {formatShortDayMonth(goal.start_date)} –{' '}
                                {formatShortDayMonth(goal.target_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hàng thêm nhanh Giai đoạn (Milestone) ngay dưới dòng Mục tiêu khi bấm "+ Giai đoạn" */}
                    {addingMsGoalId === goal.id && (
                      <div className="px-6 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 border-t border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center gap-2 text-xs">
                        <Flag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <input
                          type="text"
                          spellCheck={false}
                          value={msTitleByGoal[goal.id] || ''}
                          onChange={(e) =>
                            setMsTitleByGoal((prev) => ({
                              ...prev,
                              [goal.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMilestone(goal.id, goal.start_date, goal.target_date);
                            }
                            if (e.key === 'Escape') setAddingMsGoalId(null);
                          }}
                          placeholder="Nhập tên giai đoạn / cột mốc mới..."
                          className="flex-1 min-w-[220px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-xs outline-none"
                          autoFocus
                        />
                        <CustomDatePicker
                          value={msDueByGoal[goal.id] || goal.target_date}
                          onChange={(val) =>
                            setMsDueByGoal((prev) => ({
                              ...prev,
                              [goal.id]: val,
                            }))
                          }
                          align="right"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleAddMilestone(goal.id, goal.start_date, goal.target_date)
                          }
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition"
                        >
                          Lưu giai đoạn
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingMsGoalId(null)}
                          className="p-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Các dòng Cột mốc con (Milestone Rows) gióng ngang 1-1 với trục thời gian */}
                    {goalMilestones.map((ms, msIdx) => {
                      const msStyle = getPositionStyle(ms.start_date, ms.due_date);
                      const isLastMs = msIdx === goalMilestones.length - 1;
                      const isOverdueMs =
                        !ms.is_completed && ms.due_date < todayIso;
                      const isCurrentMs =
                        !ms.is_completed &&
                        ms.start_date <= todayIso &&
                        ms.due_date >= todayIso;

                      return (
                        <div
                          key={ms.id}
                          className="group/ms grid grid-cols-12 items-center border-t border-slate-100 dark:border-slate-800/70 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition"
                        >
                          {/* Cột trái (5/12): Nhánh cây + Nút tích + Tên đầy đủ của Cột mốc */}
                          <div className="col-span-5 pl-6 pr-4 py-2.5 border-r border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => toggleMilestone(ms.id)}
                              className="flex items-start gap-2 text-left min-w-0 flex-1 group"
                              title="Click để đánh dấu Hoàn thành / Chưa hoàn thành cột mốc này"
                            >
                              <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none mt-0.5">
                                {isLastMs ? '└─' : '├─'}
                              </span>
                              {ms.is_completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
                              )}
                              <span
                                className={`text-xs leading-snug break-words ${
                                  ms.is_completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                                }`}
                              >
                                {ms.title}
                              </span>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                                  ms.is_completed
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                    : isOverdueMs
                                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {formatShortDayMonth(ms.due_date)}
                              </span>
                              <button
                                type="button"
                                onClick={() => deleteMilestone(ms.id)}
                                title="Xóa giai đoạn này"
                                className="p-0.5 rounded text-slate-400 hover:text-rose-600 opacity-0 group-hover/ms:opacity-100 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Cột phải (7/12): Thanh thời gian của Cột mốc trên lưới Gantt */}
                          <div className="col-span-7 relative h-full min-h-[42px] px-3 flex items-center">
                            {/* Đường gióng dọc & Vạch đỏ Hôm nay */}
                            <div className="absolute inset-y-0 left-3 right-3 pointer-events-none">
                              {axisTicks.map((tick, idx) => (
                                <div
                                  key={idx}
                                  style={{ left: `${tick.leftPct}%` }}
                                  className="absolute top-0 bottom-0 border-l border-dashed border-slate-200/70 dark:border-slate-800/80"
                                />
                              ))}
                              <div
                                style={{ left: `${todayMarkerLeftPct}%` }}
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500/85 z-20"
                              />
                            </div>

                            <div className="relative w-full h-6">
                              <button
                                type="button"
                                onClick={() => toggleMilestone(ms.id)}
                                style={msStyle}
                                title={`${ms.title} (${ms.start_date} → ${ms.due_date}) — Bấm để đổi trạng thái`}
                                className={`absolute top-0.5 bottom-0.5 rounded-lg px-2 text-[10.5px] font-bold flex items-center justify-between gap-1 shadow-2xs transition hover:brightness-105 cursor-pointer overflow-hidden ${
                                  ms.is_completed
                                    ? 'bg-emerald-500 text-white border border-emerald-600'
                                    : isOverdueMs
                                    ? 'bg-rose-500 text-white border border-rose-600'
                                    : isCurrentMs
                                    ? 'bg-indigo-600 text-white border border-indigo-700 ring-2 ring-indigo-400/30'
                                    : 'bg-indigo-100 dark:bg-indigo-950/90 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700'
                                }`}
                              >
                                <span className="truncate inline-flex items-center gap-1">
                                  {ms.is_completed ? (
                                    <>
                                      <Check className="w-3 h-3 shrink-0" />
                                      <span>Đã xong</span>
                                    </>
                                  ) : isOverdueMs ? (
                                    <>
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>Quá hạn</span>
                                    </>
                                  ) : isCurrentMs ? (
                                    <>
                                      <Zap className="w-3 h-3 shrink-0" />
                                      <span>Đang chạy</span>
                                    </>
                                  ) : (
                                    <span>GĐ {msIdx + 1}</span>
                                  )}
                                </span>
                                <span className="font-mono text-[9.5px] opacity-90 shrink-0 hidden sm:inline">
                                  {formatShortDayMonth(ms.start_date)}→
                                  {formatShortDayMonth(ms.due_date)}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
