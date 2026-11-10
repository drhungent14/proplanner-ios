import React, { useState } from 'react';
import {
  Inbox,
  CalendarPlus,
  Trash2,
  Target,
  CheckCircle2,
  Circle,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { QuickAddBar } from '../components/QuickAddBar';
import { getTodayIso } from '../lib/seedData';
import { CustomDatePicker, CustomSelect } from '../components/CustomPickers';

export const InboxView: React.FC = () => {
  const { state, selectedDate, moveTaskToDate, toggleTaskStatus, deleteTask, updateTask } =
    usePlanner();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const inboxTasks = state.tasks.filter(
    (t) => t.scheduled_date === null && t.status !== 'cancelled'
  );

  const todayIso = getTodayIso();

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
            <Inbox className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base">Hộp thư nháp (Quick Inbox)</h3>
        </div>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
          {inboxTasks.length} mục chờ
        </span>
      </div>

      {/* Thêm việc thẳng vào Hộp thư nháp (scheduled_date = null) */}
      <QuickAddBar defaultDate={null} />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-3 shadow-sm">
        {inboxTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Hộp thư nháp đang trống! Mọi công việc đã được sắp xếp vào lịch trình.
          </div>
        ) : (
          inboxTasks.map((task) => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button type="button" onClick={() => toggleTaskStatus(task.id)}>
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  {editingId === task.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-indigo-400 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editTitle.trim()) {
                            updateTask(task.id, { title: editTitle.trim() });
                          }
                          setEditingId(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Lưu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p
                        className={`font-semibold text-sm ${
                          isDone ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.notes && (
                        <p className="text-xs text-slate-500 mt-0.5">{task.notes}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(task.id);
                      setEditTitle(task.title);
                    }}
                    title="Sửa công việc"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Gắn mục tiêu */}
                  <CustomSelect
                    ariaLabel="Chọn mục tiêu cho việc nháp"
                    headerTitle="Gắn với Mục tiêu dài hạn"
                    value={task.goal_id || ''}
                    onChange={(val) =>
                      updateTask(task.id, { goal_id: val || undefined })
                    }
                    className="max-w-[180px]"
                    menuWidthClass="min-w-[260px] max-w-[340px]"
                    options={[
                      {
                        value: '',
                        label: '-- Gắn mục tiêu --',
                        icon: <Target className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
                      },
                      ...state.goals.map((g) => ({
                        value: g.id,
                        label: g.title,
                        icon: <Target className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
                      })),
                    ]}
                  />

                  {/* Đẩy vào Hôm nay */}
                  <button
                    type="button"
                    onClick={() => moveTaskToDate(task.id, todayIso)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Làm hôm nay</span>
                  </button>

                  {/* Chọn ngày bất kỳ */}
                  <CustomDatePicker
                    ariaLabel="Chọn ngày thực hiện"
                    value={selectedDate}
                    onChange={(val) => moveTaskToDate(task.id, val)}
                    align="right"
                  />

                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
