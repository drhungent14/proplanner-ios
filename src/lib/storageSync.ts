import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PlannerState, SyncConfig } from '../types/planner';
import { createInitialSeedState } from './seedData';

const STORAGE_KEY = 'proplanner_state_v1';

let cachedClientKey = '';
let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(config: SyncConfig): SupabaseClient | null {
  const url = config.supabaseUrl?.trim();
  const key = config.supabaseAnonKey?.trim();
  if (!url || !key) return null;
  const composite = `${url}::${key}`;
  if (cachedClient && cachedClientKey === composite) {
    return cachedClient;
  }
  try {
    cachedClient = createClient(url, key);
    cachedClientKey = composite;
    return cachedClient;
  } catch {
    return null;
  }
}

export function isValidPlannerState(obj: unknown): obj is PlannerState {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.goals) &&
    Array.isArray(candidate.milestones) &&
    Array.isArray(candidate.tasks) &&
    Array.isArray(candidate.habits) &&
    Array.isArray(candidate.habitLogs) &&
    Array.isArray(candidate.periodPlans)
  );
}

export const SUPABASE_SETUP_SQL = `-- Cấu trúc Cơ sở dữ liệu Đám mây Supabase cho ProPlanner (Đồng bộ Máy tính & iPhone)
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> Dán toàn bộ đoạn mã này và nhấn RUN.

create table if not exists public.planner_states (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_states enable row level security;

drop policy if exists "Allow public read-write by profile id" on public.planner_states;
create policy "Allow public read-write by profile id"
  on public.planner_states
  for all
  using (true)
  with check (true);

alter publication supabase_realtime add table public.planner_states;`;

export function loadLocalState(): PlannerState {
  const isTest = import.meta.env?.MODE === 'test';
  const envUrl = isTest
    ? ''
    : (
        import.meta.env?.VITE_SUPABASE_URL || 'https://dtyscysyqpnnatordxhn.supabase.co'
      ).trim();
  const envKey = isTest
    ? ''
    : (
        import.meta.env?.VITE_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eXNjeXN5cXBubmF0b3JkeGhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTE5ODAsImV4cCI6MjEwOTg4Nzk4MH0.AJlKgcW5S1c553Rjnqn3tFiYvCvOa30r8HFvyHpyiHE'
      ).trim();
  const envProfile = (import.meta.env?.VITE_SUPABASE_PROFILE_KEY || 'personal-main').trim();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createInitialSeedState();
      saveLocalState(seed);
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (isValidPlannerState(parsed)) {
      return {
        ...parsed,
        dutyShifts: Array.isArray(parsed.dutyShifts) ? parsed.dutyShifts : [],
        syncConfig: {
          ...parsed.syncConfig,
          supabaseUrl: parsed.syncConfig?.supabaseUrl || envUrl,
          supabaseAnonKey: parsed.syncConfig?.supabaseAnonKey || envKey,
          profileKey: parsed.syncConfig?.profileKey || envProfile || 'personal-main',
        },
      };
    }
  } catch {
    // Fallback to seed state if corrupted
  }
  const fallback = createInitialSeedState();
  saveLocalState(fallback);
  return fallback;
}

export function saveLocalState(state: PlannerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export function exportBackupJson(state: PlannerState): string {
  return JSON.stringify(state, null, 2);
}

export function importBackupJson(
  rawJson: string
): { ok: true; state: PlannerState } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson);
    if (!isValidPlannerState(parsed)) {
      return {
        ok: false,
        error: 'Cấu trúc file JSON không hợp lệ hoặc thiếu dữ liệu công việc/mục tiêu.',
      };
    }
    const defaults = createInitialSeedState();
    return {
      ok: true,
      state: {
        ...defaults,
        ...parsed,
        dutyShifts: Array.isArray(parsed.dutyShifts) ? parsed.dutyShifts : [],
        syncConfig: {
          ...defaults.syncConfig,
          ...(parsed.syncConfig || {}),
        },
        notificationSettings: {
          ...defaults.notificationSettings,
          ...(parsed.notificationSettings || {}),
        },
        updated_at: new Date().toISOString(),
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Không thể đọc định dạng JSON. Vui lòng kiểm tra lại file sao lưu.',
    };
  }
}

export async function syncWithSupabase(
  localState: PlannerState,
  config: SyncConfig,
  direction: 'auto' | 'push' | 'pull' = 'auto'
): Promise<{ ok: boolean; state?: PlannerState; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return {
      ok: false,
      message: 'Chưa cấu hình Supabase URL và Anon Key trong phần Cài đặt.',
    };
  }

  const profileId = (config.profileKey || 'personal-main').trim();

  const buildRemotePayload = (stateToPush: PlannerState): PlannerState => ({
    ...stateToPush,
    syncConfig: {
      ...stateToPush.syncConfig,
      supabaseAnonKey: '',
    },
  });

  try {
    if (direction === 'push') {
      const nowIso = new Date().toISOString();
      const nextState: PlannerState = {
        ...localState,
        updated_at: nowIso,
        syncConfig: {
          ...config,
          lastSyncedAt: nowIso,
        },
      };
      const { error } = await client.from('planner_states').upsert({
        id: profileId,
        payload: buildRemotePayload(nextState),
        updated_at: nowIso,
      });
      if (error) {
        return { ok: false, message: `Lỗi đẩy dữ liệu lên Supabase: ${error.message}` };
      }
      saveLocalState(nextState);
      return {
        ok: true,
        state: nextState,
        message: 'Đã đẩy toàn bộ dữ liệu lên Đám mây thành công!',
      };
    }

    const { data, error: fetchError } = await client
      .from('planner_states')
      .select('payload, updated_at')
      .eq('id', profileId)
      .maybeSingle();

    if (fetchError) {
      return {
        ok: false,
        message: `Không thể kết nối bảng planner_states: ${fetchError.message}`,
      };
    }

    if (direction === 'pull') {
      if (!data?.payload || !isValidPlannerState(data.payload)) {
        return {
          ok: false,
          message: 'Chưa có dữ liệu trên Đám mây cho mã đồng bộ này.',
        };
      }
      const nowIso = new Date().toISOString();
      const pulled: PlannerState = {
        ...data.payload,
        dutyShifts: Array.isArray(data.payload.dutyShifts) ? data.payload.dutyShifts : [],
        syncConfig: {
          ...config,
          lastSyncedAt: nowIso,
        },
      };
      saveLocalState(pulled);
      return {
        ok: true,
        state: pulled,
        message: 'Đã tải dữ liệu mới nhất từ Đám mây về máy!',
      };
    }

    // direction === 'auto': compare timestamps
    if (data?.payload && isValidPlannerState(data.payload)) {
      const remoteTime = new Date(data.updated_at || data.payload.updated_at).getTime();
      const localTime = new Date(localState.updated_at).getTime();

      if (remoteTime > localTime) {
        const merged: PlannerState = {
          ...data.payload,
          dutyShifts: Array.isArray(data.payload.dutyShifts) ? data.payload.dutyShifts : [],
          syncConfig: {
            ...config,
            lastSyncedAt: new Date().toISOString(),
          },
        };
        saveLocalState(merged);
        return {
          ok: true,
          state: merged,
          message: 'Đã đồng bộ bản cập nhật mới hơn từ thiết bị kia!',
        };
      }
    }

    const nowIso = new Date().toISOString();
    const pushedState: PlannerState = {
      ...localState,
      updated_at: nowIso,
      syncConfig: {
        ...config,
        lastSyncedAt: nowIso,
      },
    };
    const { error: upsertErr } = await client.from('planner_states').upsert({
      id: profileId,
      payload: buildRemotePayload(pushedState),
      updated_at: nowIso,
    });

    if (upsertErr) {
      return { ok: false, message: `Lỗi lưu đám mây: ${upsertErr.message}` };
    }

    saveLocalState(pushedState);
    return {
      ok: true,
      state: pushedState,
      message: 'Đã đồng bộ 2 chiều Máy tính ↔ iPhone thành công!',
    };
  } catch (err) {
    return {
      ok: false,
      message: `Lỗi kết nối mạng: ${err instanceof Error ? err.message : 'Không xác định'}`,
    };
  }
}

export function subscribeToRealtimeSync(
  config: SyncConfig,
  onRemoteUpdate: (remotePayload: PlannerState, updatedAtIso: string) => void
): (() => void) | null {
  const client = getSupabaseClient(config);
  if (!client || typeof client.channel !== 'function') return null;

  const profileId = (config.profileKey || 'personal-main').trim();
  const channelName = `planner_sync_${profileId}`;

  try {
    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_states',
          filter: `id=eq.${profileId}`,
        },
        (changePayload: { new?: { payload?: unknown; updated_at?: string } }) => {
          const nextRow = changePayload?.new;
          if (nextRow?.payload && isValidPlannerState(nextRow.payload)) {
            const normalized: PlannerState = {
              ...nextRow.payload,
              dutyShifts: Array.isArray(nextRow.payload.dutyShifts)
                ? nextRow.payload.dutyShifts
                : [],
            };
            onRemoteUpdate(
              normalized,
              nextRow.updated_at || normalized.updated_at || new Date().toISOString()
            );
          }
        }
      )
      .subscribe();

    return () => {
      try {
        void client.removeChannel(channel);
      } catch {
        // Ignore cleanup errors
      }
    };
  } catch {
    return null;
  }
}

export async function testSupabaseConnection(
  config: SyncConfig
): Promise<{ ok: boolean; tableReady: boolean; hasRemoteRecord: boolean; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return {
      ok: false,
      tableReady: false,
      hasRemoteRecord: false,
      message: 'Vui lòng nhập đầy đủ Supabase Project URL và Supabase Anon Key trước khi kiểm tra.',
    };
  }

  const profileId = (config.profileKey || 'personal-main').trim();

  try {
    const { data, error } = await client
      .from('planner_states')
      .select('id, updated_at')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      const msgLower = error.message.toLowerCase();
      if (
        msgLower.includes('relation') ||
        msgLower.includes('does not exist') ||
        msgLower.includes('schema cache') ||
        error.code === '42P01' ||
        error.code === 'PGRST205'
      ) {
        return {
          ok: false,
          tableReady: false,
          hasRemoteRecord: false,
          message:
            'Đã kết nối tới Supabase nhưng chưa có bảng "planner_states". Hãy bấm "Sao chép Mã SQL tạo bảng" bên dưới rồi chạy trong Supabase SQL Editor.',
        };
      }
      return {
        ok: false,
        tableReady: false,
        hasRemoteRecord: false,
        message: `Kết nối thất bại: ${error.message}`,
      };
    }

    if (data?.id) {
      return {
        ok: true,
        tableReady: true,
        hasRemoteRecord: true,
        message: `Kết nối Supabase thành công! Đã tìm thấy hồ sơ "${profileId}" trên Đám mây — sẵn sàng đồng bộ 2 chiều.`,
      };
    }

    return {
      ok: true,
      tableReady: true,
      hasRemoteRecord: false,
      message: `Kết nối bảng "planner_states" thành công! Hồ sơ "${profileId}" chưa có dữ liệu trên mây — hãy bấm "Đẩy từ Máy này lên Mây (Push)" để khởi tạo lần đầu.`,
    };
  } catch (err) {
    return {
      ok: false,
      tableReady: false,
      hasRemoteRecord: false,
      message: `Không thể kết nối tới Supabase URL: ${
        err instanceof Error ? err.message : 'Lỗi mạng'
      }`,
    };
  }
}

export function encodeQuickSyncToken(config: SyncConfig): string {
  const payload = {
    u: (config.supabaseUrl || '').trim(),
    k: (config.supabaseAnonKey || '').trim(),
    p: (config.profileKey || 'personal-main').trim(),
  };
  return `PROPLANNER_SYNC::${ window.btoa(unescape(encodeURIComponent(JSON.stringify(payload)))) }`;
}

export function decodeQuickSyncToken(
  rawToken: string
): { ok: true; config: Partial<SyncConfig> } | { ok: false; error: string } {
  const trimmed = rawToken.trim();
  const prefix = 'PROPLANNER_SYNC::';
  const body = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
  try {
    const jsonStr = decodeURIComponent(escape(window.atob(body)));
    const parsed = JSON.parse(jsonStr) as { u?: string; k?: string; p?: string };
    if (!parsed.u || !parsed.k) {
      return {
        ok: false,
        error: 'Mã cấu hình nhanh thiếu Supabase URL hoặc Anon Key.',
      };
    }
    return {
      ok: true,
      config: {
        supabaseUrl: parsed.u.trim(),
        supabaseAnonKey: parsed.k.trim(),
        profileKey: (parsed.p || 'personal-main').trim(),
        autoSync: true,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Mã cấu hình nhanh không hợp lệ. Vui lòng sao chép lại từ máy tính.',
    };
  }
}
