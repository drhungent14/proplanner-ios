import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  CalendarDays,
  Bell,
  X,
} from 'lucide-react';
import { getTodayIso } from '../lib/seedData';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  headerTitle?: string;
  leadingIcon?: React.ReactNode;
  className?: string;
  menuWidthClass?: string;
  align?: 'left' | 'right';
  fullWidth?: boolean;
  variant?: 'default' | 'translucent';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  ariaLabel,
  headerTitle,
  leadingIcon,
  className = '',
  menuWidthClass = 'min-w-[220px] max-w-[320px]',
  align = 'left',
  fullWidth = false,
  variant = 'default',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const baseVariantClass =
    variant === 'translucent'
      ? 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
      : open
      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100'
      : 'bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200';

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'block w-full' : 'inline-block'}`}
    >
      {ariaLabel && (
        <input
          type="text"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition text-xs font-semibold select-none ${
          fullWidth ? 'w-full' : ''
        } ${baseVariantClass} ${className}`}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
          {selectedOption?.icon ?? leadingIcon}
          <span className="truncate">{selectedOption?.label}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
            variant === 'translucent' ? 'text-indigo-100' : 'text-slate-400'
          } ${open ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 ${menuWidthClass} w-max bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl p-1.5 z-50 space-y-0.5`}
        >
          {headerTitle && (
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
              {headerTitle}
            </div>
          )}
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left transition ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 font-medium'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 min-w-0 flex-1">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {opt.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const QUICK_TIMES = [
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '10:00',
  '11:30',
  '13:30',
  '14:00',
  '15:00',
  '16:30',
  '20:00',
];

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
);
const MINUTES_STEP_5 = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0')
);

interface CustomTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  fullWidth?: boolean;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  ariaLabel,
  placeholder = '--:--',
  className = '',
  align = 'left',
  fullWidth = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedTime =
    value && value.includes(':') ? value.trim().slice(0, 5) : '';
  const [curHour, curMin] = normalizedTime
    ? normalizedTime.split(':')
    : ['08', '00'];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'block w-full' : 'inline-block'}`}
    >
      {ariaLabel && (
        <input
          type="text"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {fullWidth ? (
        <div
          onClick={() => setOpen((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setOpen((v) => !v);
            }
          }}
          className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
            open
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-900'
              : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
          } ${className}`}
        >
          <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span
              className={
                normalizedTime
                  ? 'font-mono font-bold text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400 font-medium'
              }
            >
              {normalizedTime || placeholder}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            {normalizedTime && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                title="Xóa giờ"
                className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                open ? 'rotate-180 text-indigo-500' : ''
              }`}
            />
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono font-semibold transition select-none ${
              normalizedTime
                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            } ${open ? 'ring-2 ring-indigo-500/30' : ''} ${className}`}
          >
            <span>{normalizedTime || placeholder}</span>
          </button>

          {normalizedTime && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title="Xóa giờ"
              className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {open && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl p-3 z-50 space-y-2.5`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chọn Giờ : Phút</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-extrabold">
                {curHour}:{curMin}
              </span>
              {normalizedTime && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Mốc giờ nhanh
            </span>
            <div className="grid grid-cols-4 gap-1">
              {QUICK_TIMES.map((qt) => {
                const isSelected = normalizedTime === qt;
                return (
                  <button
                    key={qt}
                    type="button"
                    onClick={() => {
                      onChange(qt);
                      setOpen(false);
                    }}
                    className={`py-1 rounded-lg text-[11px] font-mono font-semibold border transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {qt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Đúng 2 cột dọc duy nhất: 1 cột GIỜ + 1 cột PHÚT (không lấy đến giây) */}
          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">
                Giờ (00–23)
              </span>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                {HOURS_24.map((h) => {
                  const active = normalizedTime !== '' && curHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onChange(`${h}:${curMin}`)}
                      className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition flex items-center justify-center ${
                        active
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {h} giờ
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 text-center">
                Phút (00–55)
              </span>
              <div className="max-h-40 overflow-y-auto flex flex-col gap-1 pr-1">
                {MINUTES_STEP_5.map((m) => {
                  const active = normalizedTime !== '' && curMin === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        onChange(`${curHour}:${m}`);
                        setOpen(false);
                      }}
                      className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold transition flex items-center justify-center ${
                        active
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m} phút
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  align?: 'left' | 'right';
}

function formatIsoToVN(dateIso: string): string {
  const parts = dateIso.split('-');
  if (parts.length !== 3) return dateIso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  ariaLabel,
  className = '',
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeValue = value || getTodayIso();
  const [initY, initM] = safeValue.slice(0, 7).split('-').map(Number);
  const [viewYear, setViewYear] = useState<number>(initY || 2026);
  const [viewMonth, setViewMonth] = useState<number>(initM || 11);

  useEffect(() => {
    const [y, m] = (value || getTodayIso()).slice(0, 7).split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const firstDay = new Date(viewYear, viewMonth - 1, 1);
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`
    );
  }

  const stepMonth = (delta: number) => {
    const dt = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth() + 1);
  };

  const todayIso = getTodayIso();

  return (
    <div ref={containerRef} className="relative inline-block">
      {ariaLabel && (
        <input
          type="text"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50/70 dark:hover:bg-slate-700 border transition text-xs font-bold text-slate-700 dark:text-slate-200 select-none ${
          open
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-900'
            : 'border-slate-200 dark:border-slate-700'
        } ${className}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-mono">{formatIsoToVN(safeValue)}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl p-3.5 z-50 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              Tháng {String(viewMonth).padStart(2, '0')} / {viewYear}
            </span>
            <button
              type="button"
              onClick={() => stepMonth(1)}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800">
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
            <div className="text-rose-500">CN</div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, idx) => {
              if (!iso) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }
              const dayNum = Number(iso.slice(8, 10));
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                onChange(todayIso);
                setOpen(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold transition"
            >
              Hôm nay ({formatIsoToVN(todayIso).slice(0, 5)})
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-200 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomDateTimePickerProps {
  value: string; // 'YYYY-MM-DDTHH:mm' or ''
  onChange: (localDateTimeValue: string) => void;
  defaultDate?: string;
  ariaLabel?: string;
  placeholder?: string;
  align?: 'left' | 'right';
}

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  value,
  onChange,
  defaultDate,
  ariaLabel,
  placeholder = 'Đặt ngày & giờ nhắc...',
  align = 'right',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const todayIso = getTodayIso();
  const fallbackDate = defaultDate || todayIso;

  const hasValue = Boolean(value && value.includes('T'));
  const [datePart, timePart] = hasValue
    ? value.split('T')
    : [fallbackDate, '08:00'];
  const [curHour, curMin] =
    timePart && timePart.includes(':') ? timePart.slice(0, 5).split(':') : ['08', '00'];

  const [initY, initM] = (datePart || fallbackDate).slice(0, 7).split('-').map(Number);
  const [viewYear, setViewYear] = useState<number>(initY || 2026);
  const [viewMonth, setViewMonth] = useState<number>(initM || 11);

  useEffect(() => {
    const [y, m] = (datePart || fallbackDate).slice(0, 7).split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m);
    }
  }, [datePart, fallbackDate]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const firstDay = new Date(viewYear, viewMonth - 1, 1);
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`
    );
  }

  const stepMonth = (delta: number) => {
    const dt = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth() + 1);
  };

  return (
    <div ref={containerRef} className="relative block w-full">
      {ariaLabel && (
        <input
          type="text"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      <div
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
          open
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-900'
            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
          <Bell
            className={`w-3.5 h-3.5 shrink-0 ${
              hasValue ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
            }`}
          />
          {hasValue ? (
            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 truncate">
              {formatIsoToVN(datePart)} &bull; {curHour}:{curMin}
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
              {placeholder}
            </span>
          )}
        </span>

        <span className="inline-flex items-center gap-1 shrink-0">
          {hasValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title="Xóa hẹn giờ nhắc"
              className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
              open ? 'rotate-180 text-indigo-500' : ''
            }`}
          />
        </span>
      </div>

      {open && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-2 w-[320px] sm:w-[440px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl p-3.5 z-50 space-y-3`}
        >
          {/* Header Hẹn giờ nhắc việc */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-500" />
              <span>Hẹn ngày &amp; giờ nhắc việc (24h)</span>
            </span>
            <div className="flex items-center gap-1.5">
              {hasValue && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:underline px-1.5 py-0.5"
                >
                  Xóa nhắc
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition"
              >
                Xong
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Cột trái (7/12): Lịch chọn ngày Tiếng Việt */}
            <div className="sm:col-span-7 space-y-2 sm:border-r sm:border-slate-100 sm:dark:border-slate-800 sm:pr-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Tháng {String(viewMonth).padStart(2, '0')} / {viewYear}
                </span>
                <button
                  type="button"
                  onClick={() => stepMonth(1)}
                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-slate-400 pb-1">
                <div>T2</div>
                <div>T3</div>
                <div>T4</div>
                <div>T5</div>
                <div>T6</div>
                <div>T7</div>
                <div className="text-rose-500">CN</div>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((iso, idx) => {
                  if (!iso) return <div key={`empty-${idx}`} className="h-7" />;
                  const dayNum = Number(iso.slice(8, 10));
                  const isSelected = iso === datePart;
                  const isToday = iso === todayIso;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => onChange(`${iso}T${curHour}:${curMin}`)}
                      className={`h-7 rounded-lg text-[11px] font-semibold flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : isToday
                          ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-400 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cột phải (5/12): Bảng chọn Giờ & Phút (Chỉ lấy đến phút, đúng 2 cột dọc: 1 cột Giờ + 1 cột Phút) */}
            <div className="sm:col-span-5 space-y-2">
              <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  Giờ : Phút
                </span>
                <span className="font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                  {curHour}:{curMin}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {['07:30', '08:00', '09:00', '14:00', '16:30', '20:00'].map((qt) => (
                  <button
                    key={qt}
                    type="button"
                    onClick={() => {
                      onChange(`${datePart}T${qt}`);
                      setOpen(false);
                    }}
                    className={`py-1 rounded-lg text-[10.5px] font-mono font-semibold border transition ${
                      hasValue && `${curHour}:${curMin}` === qt
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {qt}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[9.5px] font-bold uppercase text-slate-400 text-center mb-1">
                    Giờ (00–23)
                  </span>
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-0.5">
                    {HOURS_24.map((h) => {
                      const active = hasValue && curHour === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => onChange(`${datePart}T${h}:${curMin}`)}
                          className={`w-full py-1 px-1.5 rounded-lg text-[11px] font-mono font-semibold transition flex items-center justify-center ${
                            active
                              ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {h} giờ
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="block text-[9.5px] font-bold uppercase text-slate-400 text-center mb-1">
                    Phút (00–55)
                  </span>
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-0.5">
                    {MINUTES_STEP_5.map((m) => {
                      const active = hasValue && curMin === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            onChange(`${datePart}T${curHour}:${m}`);
                            setOpen(false);
                          }}
                          className={`w-full py-1 px-1.5 rounded-lg text-[11px] font-mono font-semibold transition flex items-center justify-center ${
                            active
                              ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800/70 hover:bg-indigo-50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {m} phút
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
