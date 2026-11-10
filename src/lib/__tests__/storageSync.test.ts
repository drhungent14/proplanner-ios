import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportBackupJson,
  importBackupJson,
  saveLocalState,
  loadLocalState,
  encodeQuickSyncToken,
  decodeQuickSyncToken,
} from '../storageSync';
import { createInitialSeedState } from '../seedData';

describe('storageSync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips state through localStorage and JSON backup', () => {
    const seed = createInitialSeedState('2026-11-09');
    saveLocalState(seed);
    const loaded = loadLocalState();
    expect(loaded.goals.length).toBeGreaterThan(0);
    expect(loaded.tasks.length).toBeGreaterThan(0);

    const raw = exportBackupJson(seed);
    const imported = importBackupJson(raw);
    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.state.goals.length).toBe(seed.goals.length);
    }
  });

  it('rejects malformed or incomplete backup JSON safely', () => {
    const bad1 = importBackupJson('not-json');
    expect(bad1.ok).toBe(false);

    const bad2 = importBackupJson('{"tasks": "invalid"}');
    expect(bad2.ok).toBe(false);
  });

  it('fills in default syncConfig and notificationSettings when importing partial valid JSON', () => {
    const partial = JSON.stringify({
      categories: [],
      goals: [],
      milestones: [],
      tasks: [],
      habits: [],
      habitLogs: [],
      periodPlans: [],
    });
    const res = importBackupJson(partial);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.syncConfig).toBeDefined();
      expect(res.state.syncConfig.profileKey).toBe('personal-main');
      expect(res.state.notificationSettings).toBeDefined();
    }
  });

  it('encodes and decodes Quick Sync Token for 1-click iPhone pairing', () => {
    const token = encodeQuickSyncToken({
      supabaseUrl: 'https://demo.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      profileKey: 'bs-hung-main',
      autoSync: true,
    });
    expect(token.startsWith('PROPLANNER_SYNC::')).toBe(true);
    const decoded = decodeQuickSyncToken(token);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.config.supabaseUrl).toBe('https://demo.supabase.co');
      expect(decoded.config.supabaseAnonKey).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(decoded.config.profileKey).toBe('bs-hung-main');
    }
  });
});
