import React, { useState } from 'react';
import {
  Cloud,
  Bell,
  Volume2,
  Sun,
  Moon,
  Check,
  X,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  RefreshCw,
  Copy,
  Database,
  ShieldCheck,
  Smartphone,
  Code2,
} from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { getTodayIso } from '../lib/seedData';
import { formatReminderDisplay } from '../lib/plannerEngine';
import {
  SUPABASE_SETUP_SQL,
  decodeQuickSyncToken,
  encodeQuickSyncToken,
  exportBackupJson,
  testSupabaseConnection,
} from '../lib/storageSync';
import {
  playNotificationChime,
  requestBrowserNotificationPermission,
} from '../lib/notificationService';
import { CustomTimePicker } from '../components/CustomPickers';

export const SettingsSyncView: React.FC = () => {
  const {
    state,
    updateSyncConfig,
    updateNotificationSettings,
    triggerCloudSync,
    importFromJsonString,
    resetToSeedData,
    clearAllData,
    isSyncing,
    syncStatusMessage,
  } = usePlanner();

  const [jsonInput, setJsonInput] = useState('');
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [quickSyncTokenInput, setQuickSyncTokenInput] = useState('');

  const isConfigured = Boolean(
    state.syncConfig.supabaseUrl?.trim() && state.syncConfig.supabaseAnonKey?.trim()
  );

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);
    const res = await testSupabaseConnection(state.syncConfig);
    setConnTestResult({ ok: res.ok, message: res.message });
    if (!res.tableReady && state.syncConfig.supabaseUrl && state.syncConfig.supabaseAnonKey) {
      setShowSqlModal(true);
    }
    setIsTestingConn(false);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setLocalMsg(
        'Đã sao chép Mã SQL khởi tạo bảng! Hãy dán vào Supabase SQL Editor và bấm RUN.'
      );
    } catch {
      setShowSqlModal(true);
    }
  };

  const handleCopyQuickSyncToken = async () => {
    if (!isConfigured) {
      setLocalMsg('Vui lòng nhập Supabase URL và Anon Key trước khi tạo Mã Ghép nối cho iPhone.');
      return;
    }
    const token = encodeQuickSyncToken(state.syncConfig);
    try {
      await navigator.clipboard.writeText(token);
      setLocalMsg(
        'Đã sao chép Mã Ghép nối Nhanh! Gửi mã này qua Zalo/Ghi chú sang iPhone và dán vào ô bên dưới.'
      );
    } catch {
      setQuickSyncTokenInput(token);
      setLocalMsg('Đã tạo Mã Ghép nối Nhanh trong ô văn bản bên dưới.');
    }
  };

  const handleApplyQuickSyncToken = () => {
    if (!quickSyncTokenInput.trim()) return;
    const res = decodeQuickSyncToken(quickSyncTokenInput);
    if (!res.ok) {
      setLocalMsg(res.error);
      return;
    }
    updateSyncConfig(res.config);
    setQuickSyncTokenInput('');
    setLocalMsg('Đã tự động điền cấu hình Supabase từ Mã Ghép nối thành công!');
  };

  const handleDownloadBackup = () => {
    const raw = exportBackupJson(state);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proplanner-backup-${getTodayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLocalMsg('Đã tải xuống file sao lưu JSON thành công!');
  };

  const handleImportJson = () => {
    if (!jsonInput.trim()) return;
    const res = importFromJsonString(jsonInput);
    setLocalMsg(res.message);
    if (res.ok) setJsonInput('');
  };

  const handleEnableBrowserNotif = async () => {
    const granted = await requestBrowserNotificationPermission();
    updateNotificationSettings({ browserEnabled: granted });
    setLocalMsg(
      granted
        ? 'Đã bật thông báo trình duyệt thành công!'
        : 'Trình duyệt đang chặn thông báo. Vui lòng cấp quyền trên thanh địa chỉ.'
    );
  };

  return (
    <div className="space-y-6">
      {localMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-600 text-white text-xs font-medium flex items-center justify-between shadow-sm">
          <span>{localMsg}</span>
          <button
            type="button"
            onClick={() => setLocalMsg(null)}
            className="p-1 rounded-lg hover:bg-white/15"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Phần 1: Cấu hình Đồng bộ Đám mây Supabase (Máy tính <-> iPhone) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Đồng bộ Đám mây Supabase (Web Máy tính ↔ App iPhone)
              </h3>
              {state.syncConfig.lastSyncedAt && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Đồng bộ gần nhất: {formatReminderDisplay(state.syncConfig.lastSyncedAt)}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isConfigured
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{isConfigured ? 'Đã nhập thông số kết nối' : 'Chưa nhập Supabase Key'}</span>
            </span>

            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sao chép Mã SQL tạo bảng</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSqlModal((v) => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 transition"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showSqlModal ? 'Ẩn SQL' : 'Xem SQL'}</span>
            </button>
          </div>
        </div>

        {/* Khung hiển thị trực tiếp đoạn mã SQL khởi tạo bảng trên Supabase */}
        {showSqlModal && (
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-700 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-300 inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Mã SQL khởi tạo bảng trên Supabase (SQL Editor → New Query → RUN)</span>
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold inline-flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Chép mã SQL</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Supabase Project URL</label>
            <input
              type="text"
              value={state.syncConfig.supabaseUrl}
              onChange={(e) => updateSyncConfig({ supabaseUrl: e.target.value })}
              placeholder="https://xxxx.supabase.co"
              spellCheck={false}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Supabase Anon Key</label>
            <input
              type="password"
              value={state.syncConfig.supabaseAnonKey}
              onChange={(e) => updateSyncConfig({ supabaseAnonKey: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR..."
              spellCheck={false}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Mã Hồ sơ Đồng bộ (Nhập giống nhau ở PC &amp; iPhone)
            </label>
            <input
              type="text"
              value={state.syncConfig.profileKey}
              onChange={(e) => updateSyncConfig({ profileKey: e.target.value })}
              placeholder="personal-main"
              spellCheck={false}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer border border-indigo-200/70 dark:border-indigo-800">
            <input
              type="checkbox"
              checked={state.syncConfig.autoSync}
              onChange={(e) => updateSyncConfig({ autoSync: e.target.checked })}
              className="accent-indigo-600"
            />
            <span>Tự động đồng bộ ngầm (Auto-Sync 2s &amp; Realtime)</span>
          </label>

          <button
            type="button"
            disabled={isTestingConn}
            onClick={handleTestConnection}
            data-testid="test-supabase-conn-btn"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isTestingConn ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => triggerCloudSync('auto')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Đồng bộ 2 chiều ngay</span>
          </button>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => triggerCloudSync('push')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium"
          >
            Đẩy từ Máy này lên Mây (Push)
          </button>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => triggerCloudSync('pull')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium"
          >
            Tải từ Mây về Máy này (Pull)
          </button>
        </div>

        {connTestResult && (
          <div
            className={`text-xs px-3.5 py-2.5 rounded-xl font-medium border ${
              connTestResult.ok
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            {connTestResult.message}
          </div>
        )}

        {syncStatusMessage && (
          <div className="text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-medium">
            {syncStatusMessage}
          </div>
        )}

        {/* Chuyển nhanh cấu hình sang iPhone bằng 1 dòng Mã Ghép nối */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleCopyQuickSyncToken}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold shrink-0 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sao chép Mã Ghép nối sang iPhone</span>
          </button>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={quickSyncTokenInput}
              onChange={(e) => setQuickSyncTokenInput(e.target.value)}
              placeholder="Hoặc dán Mã Ghép nối (PROPLANNER_SYNC::...) vào đây để tự điền nhanh..."
              spellCheck={false}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={handleApplyQuickSyncToken}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shrink-0 transition"
            >
              Áp dụng mã
            </button>
          </div>
        </div>
      </div>

      {/* Phần 1B: Đóng gói & Cài đặt File ProPlanner.ipa lên iPhone */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Xuất File <code className="font-mono text-indigo-600 dark:text-indigo-400">ProPlanner.ipa</code> &amp; Cài đặt lên iPhone
              </h3>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
            <span>Bundle ID: vn.proplanner.app</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center shrink-0">
                1
              </span>
              <span>Đẩy lên GitHub &amp; Build tự động</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Chạy file <code className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">Dong_Goi_IPA_Tu_Dong.bat</code> trong thư mục dự án. Máy chủ <code className="font-mono">macos-latest</code> của GitHub Actions (kịch bản <code className="font-mono">.github/workflows/build-ios-ipa.yml</code>) sẽ tự động chạy Xcode biên dịch ra file <code className="font-mono font-semibold">ProPlanner.ipa</code> đã nhúng sẵn kết nối Supabase của bạn.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center shrink-0">
                2
              </span>
              <span>Tải gói ProPlanner.ipa về máy tính</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Mở tab <strong>Actions</strong> trên kho GitHub của bạn → bấm vào lượt chạy <strong>Build ProPlanner iOS (.ipa)</strong> mới nhất → tải gói <strong>ProPlanner-iOS-IPA</strong> ở mục <em>Artifacts</em> và giải nén lấy file <code className="font-mono font-semibold">ProPlanner.ipa</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] flex items-center justify-center shrink-0">
                3
              </span>
              <span>Cài vào iPhone qua Sideloadly</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Mở phần mềm <strong>Sideloadly</strong> trên Windows (hoặc AltStore / TrollStore / ESign), cắm cáp iPhone, kéo file <code className="font-mono font-semibold">ProPlanner.ipa</code> vào và bấm <strong>Start</strong>. Khi mở trên iPhone, ứng dụng tự động đồng bộ 2 chiều với máy tính và bật thông báo gốc iOS.
            </p>
          </div>
        </div>
      </div>

      {/* Phần 2: Cấu hình Thông báo & Nhắc việc */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white">
            <Bell className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base">Hệ thống Thông báo &amp; Âm báo Nhắc việc</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={handleEnableBrowserNotif}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold inline-flex items-center gap-1.5"
          >
            {state.notificationSettings.browserEnabled && <Check className="w-3.5 h-3.5" />}
            <span>
              {state.notificationSettings.browserEnabled
                ? 'Đã bật Thông báo Trình duyệt'
                : 'Cấp quyền Thông báo Trình duyệt'}
            </span>
          </button>

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={state.notificationSettings.soundEnabled}
              onChange={(e) =>
                updateNotificationSettings({ soundEnabled: e.target.checked })
              }
            />
            <span>Phát chuông báo khi đến giờ nhắc việc</span>
          </label>

          <button
            type="button"
            onClick={() => playNotificationChime()}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Nghe thử chuông báo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <label className="font-semibold mb-1 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Giờ nhắc Lập kế hoạch sáng (Top 3 việc trong ngày)</span>
            </label>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CustomTimePicker
                ariaLabel="Giờ nhắc lập kế hoạch sáng"
                value={state.notificationSettings.morningPlanTime}
                onChange={(val) =>
                  updateNotificationSettings({ morningPlanTime: val || '08:00' })
                }
                placeholder="08:00"
              />
            </div>
          </div>
          <div>
            <label className="font-semibold mb-1 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Giờ nhắc Tổng kết tối (Đánh giá ngày &amp; tích thói quen)</span>
            </label>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CustomTimePicker
                ariaLabel="Giờ nhắc tổng kết tối"
                value={state.notificationSettings.eveningReviewTime}
                onChange={(val) =>
                  updateNotificationSettings({ eveningReviewTime: val || '21:00' })
                }
                placeholder="21:00"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Phần 3: Sao lưu / Khôi phục JSON & Dữ liệu mẫu */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="font-bold text-base">Sao lưu File JSON &amp; Quản lý Dữ liệu</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Xuất file Sao lưu (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetToSeedData();
              setLocalMsg('Đã khôi phục bộ dữ liệu mẫu ban đầu!');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi phục Dữ liệu Mẫu</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearAllData();
              setLocalMsg('Đã làm trống toàn bộ dữ liệu để bạn bắt đầu mới!');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa trắng dữ liệu để tự nhập mới</span>
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <label className="block font-semibold">
            Khôi phục từ nội dung JSON đã sao lưu:
          </label>
          <textarea
            rows={3}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Dán nội dung file .json sao lưu vào đây để khôi phục..."
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
          />
          <button
            type="button"
            onClick={handleImportJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            <Upload className="w-4 h-4" />
            <span>Nhập dữ liệu JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
