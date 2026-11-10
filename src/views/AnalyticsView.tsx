import React from 'react';
import {
  CheckCircle2,
  Flame,
  Target,
  AlertTriangle,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { computeAnalyticsSummary } from '../lib/plannerEngine';
import { CategoryIcon, SectionIconBadge } from '../components/PlannerIcons';

export const AnalyticsView: React.FC = () => {
  const { state, selectedDate } = usePlanner();
  const summary = computeAnalyticsSummary(state, selectedDate);

  return (
    <div className="space-y-6">
      {/* 4 Thẻ chỉ số KPI tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Tỷ lệ hoàn thành</p>
            <p className="text-2xl font-bold">{summary.completionRate}%</p>
            <p className="text-[11px] text-slate-400">
              {summary.completedTasks}/{summary.totalTasks} đầu việc đã xong
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Tiến độ Mục tiêu TB</p>
            <p className="text-2xl font-bold">{summary.averageGoalProgress}%</p>
            <p className="text-[11px] text-slate-400">
              Trên tổng số {state.goals.length} mục tiêu lớn
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Chuỗi Streak cao nhất</p>
            <p className="text-2xl font-bold">{summary.bestHabitStreak} ngày</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Việc quá hạn tồn đọng</p>
            <p className="text-2xl font-bold">{summary.overdueCount}</p>
          </div>
        </div>
      </div>

      {/* Biểu đồ xu hướng 7 ngày & Phân bổ Danh mục */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Biểu đồ cột xu hướng 7 ngày (7/12) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <SectionIconBadge tone="indigo">
              <TrendingUp className="w-4 h-4" />
            </SectionIconBadge>
            <h4 className="font-bold text-base">
              Biểu đồ hiệu suất 7 ngày gần nhất
            </h4>
          </div>

          <div className="grid grid-cols-7 gap-2 items-end h-48 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
            {summary.last7DaysTrend.map((pt) => (
              <div
                key={pt.date}
                className="flex flex-col items-center justify-end h-full gap-1.5"
              >
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  {pt.completed}/{pt.total}
                </span>
                <div className="w-full max-w-[38px] bg-slate-100 dark:bg-slate-800 rounded-t-xl h-32 flex items-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-violet-500 rounded-t-xl transition-all"
                    style={{ height: `${Math.max(8, pt.rate)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-medium text-center">
                  {pt.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Phân bổ theo Danh mục cuộc sống (5/12) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <SectionIconBadge tone="emerald">
              <PieChart className="w-4 h-4" />
            </SectionIconBadge>
            <h4 className="font-bold text-base">
              Phân bổ thời gian theo Mảng cuộc sống
            </h4>
          </div>

          <div className="space-y-3">
            {summary.categoryDistribution.map((item) => (
              <div key={item.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-2">
                    <span
                      className="w-5 h-5 rounded-md inline-flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: item.color }}
                    >
                      <CategoryIcon categoryId={item.categoryId} className="w-3 h-3" />
                    </span>
                    <span>{item.name}</span>
                  </span>
                  <span className="text-slate-500">
                    {item.completedTasks}/{item.totalTasks} việc ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
