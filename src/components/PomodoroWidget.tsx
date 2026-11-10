import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer, CheckCircle2 } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { playNotificationChime } from '../lib/notificationService';
import { CustomSelect } from './CustomPickers';

export const PomodoroWidget: React.FC = () => {
  const { state, selectedDate, updateTask } = usePlanner();
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [activeTaskId, setActiveTaskId] = useState<string>('');

  const todayTasks = state.tasks.filter(
    (t) => t.scheduled_date === selectedDate && t.status !== 'done' && t.status !== 'cancelled'
  );

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playNotificationChime();
          if (mode === 'focus' && activeTaskId) {
            const target = state.tasks.find((t) => t.id === activeTaskId);
            if (target) {
              updateTask(activeTaskId, {
                actual_minutes: (target.actual_minutes || 0) + 25,
              });
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, mode, activeTaskId, state.tasks, updateTask]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const switchMode = (nextMode: 'focus' | 'break') => {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(nextMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-100">
          <Timer className="w-4 h-4" />
          <span>Đồng hồ Tập trung (Pomodoro)</span>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => switchMode('focus')}
            className={`px-2 py-0.5 rounded-md transition ${
              mode === 'focus' ? 'bg-white/25 font-semibold' : 'hover:bg-white/10 text-indigo-200'
            }`}
          >
            25p Tập trung
          </button>
          <button
            type="button"
            onClick={() => switchMode('break')}
            className={`px-2 py-0.5 rounded-md transition ${
              mode === 'break' ? 'bg-white/25 font-semibold' : 'hover:bg-white/10 text-indigo-200'
            }`}
          >
            5p Nghỉ
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between my-3">
        <div className="text-3xl font-bold tracking-tight font-mono">
          {mins}:{secs}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning((r) => !r)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-700 font-semibold text-xs shadow hover:bg-indigo-50 transition"
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
          </button>
          <button
            type="button"
            onClick={() => switchMode(mode)}
            title="Đặt lại đồng hồ"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-xs">
        <CustomSelect
          fullWidth
          variant="translucent"
          ariaLabel="Chọn việc đang tập trung"
          headerTitle="Chọn công việc tính giờ Pomodoro"
          value={activeTaskId}
          onChange={(val) => setActiveTaskId(val)}
          menuWidthClass="min-w-[260px] max-w-[340px]"
          options={[
            {
              value: '',
              label: '-- Chọn công việc để tính giờ tập trung --',
              icon: <CheckCircle2 className="w-3.5 h-3.5 opacity-80 shrink-0" />,
            },
            ...todayTasks.map((t) => ({
              value: t.id,
              label: t.title,
              badge: `${t.actual_minutes || 0}p`,
              icon: <Timer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
            })),
          ]}
        />
      </div>
    </div>
  );
};
