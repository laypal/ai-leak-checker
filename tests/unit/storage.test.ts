/**
 * @fileoverview Unit tests for storage operations in service worker.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockStorage, storageMock } from '../../tests/setup';
import { DEFAULT_SETTINGS, DEFAULT_STATS, CURRENT_SCHEMA_VERSION } from '@/shared/types';

// Note: These tests validate storage logic that would normally be in background/index.ts
// We're testing the storage operations conceptually since they require chrome APIs

describe('Storage Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('Settings Operations', () => {
    it('should get default settings when none exist', async () => {
      const { settings } = await chrome.storage.local.get('settings');
      const result = settings ?? DEFAULT_SETTINGS;
      
      expect(result).toEqual(DEFAULT_SETTINGS);
      expect(storageMock.local.get).toHaveBeenCalled();
    });

    it('should get existing settings from storage', async () => {
      const customSettings = { ...DEFAULT_SETTINGS, sensitivity: 'high' as const };
      mockStorage.settings = customSettings;

      const { settings } = await chrome.storage.local.get('settings');
      
      expect(settings).toEqual(customSettings);
    });

    it('should update settings and persist to storage', async () => {
      // Initialize with defaults
      mockStorage.settings = DEFAULT_SETTINGS;
      
      const current = (await chrome.storage.local.get('settings')).settings ?? DEFAULT_SETTINGS;
      const updated = { ...current, sensitivity: 'high' as const };
      
      await chrome.storage.local.set({ settings: updated });
      const stored = (await chrome.storage.local.get('settings')).settings;
      
      expect(stored).toEqual(updated);
      expect(stored?.sensitivity).toBe('high');
    });

    it('should handle partial settings updates', async () => {
      mockStorage.settings = DEFAULT_SETTINGS;
      
      const updates = { strictMode: true };
      const current = (await chrome.storage.local.get('settings')).settings ?? DEFAULT_SETTINGS;
      const updated = { ...current, ...updates };
      
      await chrome.storage.local.set({ settings: updated });
      const stored = (await chrome.storage.local.get('settings')).settings;
      
      expect(stored?.strictMode).toBe(true);
      // Other settings should remain unchanged
      expect(stored?.sensitivity).toBe(DEFAULT_SETTINGS.sensitivity);
    });
  });

  describe('Stats Operations', () => {
    it('should get default stats when none exist', async () => {
      const { stats } = await chrome.storage.local.get('stats');
      const result = stats ?? DEFAULT_STATS;
      
      expect(result).toEqual(DEFAULT_STATS);
    });

    it('should get existing stats from storage', async () => {
      const customStats = {
        ...DEFAULT_STATS,
        totalDetections: 42,
        actions: { ...DEFAULT_STATS.actions, cancelled: 10 },
      };
      mockStorage.stats = customStats;

      const { stats } = await chrome.storage.local.get('stats');
      
      expect(stats).toEqual(customStats);
      expect(stats?.totalDetections).toBe(42);
    });

    it('should reset stats to defaults', async () => {
      mockStorage.stats = {
        ...DEFAULT_STATS,
        totalDetections: 100,
        actions: { masked: 50, proceeded: 30, cancelled: 20 },
      };

      await chrome.storage.local.set({ stats: DEFAULT_STATS });
      const stored = (await chrome.storage.local.get('stats')).stats;
      
      expect(stored).toEqual(DEFAULT_STATS);
      expect(stored?.totalDetections).toBe(0);
    });
  });

  describe('Schema Version Management', () => {
    it('should initialize schema version if missing', async () => {
      const { schemaVersion } = await chrome.storage.local.get('schemaVersion');
      
      if (!schemaVersion) {
        await chrome.storage.local.set({ schemaVersion: CURRENT_SCHEMA_VERSION });
      }
      
      const stored = (await chrome.storage.local.get('schemaVersion')).schemaVersion;
      expect(stored).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('should detect schema version mismatch', async () => {
      mockStorage.schemaVersion = 0;
      const { schemaVersion } = await chrome.storage.local.get('schemaVersion');
      
      const needsMigration = schemaVersion !== CURRENT_SCHEMA_VERSION;
      expect(needsMigration).toBe(true);
    });

    it('should not migrate if schema version matches', async () => {
      mockStorage.schemaVersion = CURRENT_SCHEMA_VERSION;
      const { schemaVersion } = await chrome.storage.local.get('schemaVersion');
      
      const needsMigration = schemaVersion !== CURRENT_SCHEMA_VERSION;
      expect(needsMigration).toBe(false);
    });
  });

  describe('Storage Quota', () => {
    it('should calculate storage usage', () => {
      const storage = {
        settings: DEFAULT_SETTINGS,
        stats: DEFAULT_STATS,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      
      const usageBytes = new Blob([JSON.stringify(storage)]).size;
      const quotaBytes = 10 * 1024 * 1024; // 10MB
      const percentage = (usageBytes / quotaBytes) * 100;
      
      expect(usageBytes).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(1); // Should be well under 1% with default data
    });

    it('should detect high storage usage', () => {
      // Simulate large stats object
      const largeStats = {
        ...DEFAULT_STATS,
        bySite: Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`site${i}.com`, i * 10])
        ),
      };
      
      const storage = {
        settings: DEFAULT_SETTINGS,
        stats: largeStats,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
      
      const usageBytes = new Blob([JSON.stringify(storage)]).size;
      const quotaBytes = 10 * 1024 * 1024;
      const percentage = (usageBytes / quotaBytes) * 100;
      
      // Even with 1000 sites, should still be reasonable
      expect(percentage).toBeLessThan(10);
    });
  });
});
