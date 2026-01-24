/**
 * @file storage.ts
 * @description Type definitions for extension storage schema.
 *              Defines settings, stats, and persistence structures.
 *
 * @version 1.0.0
 */

import { DetectorType } from './detection';
import type { DetectorType as DetectorTypeType } from './detection';
import type { SelectorConfig } from './selectors';

// =============================================================================
// Settings Schema
// =============================================================================

/**
 * User-configurable settings.
 */
export interface Settings {
  /** Enabled/disabled state for each detector */
  detectors: Record<DetectorTypeType, boolean>;

  /** Global sensitivity level */
  sensitivity: 'low' | 'medium' | 'high';

  /** Whether to block without override option */
  strictMode: boolean;

  /** User-defined strings to ignore */
  allowlist: string[];

  /** Sites to exclude from scanning */
  siteAllowlist: string[];

  /** Redaction style preference */
  redactionStyle: 'bracket' | 'asterisk' | 'placeholder';

  /** Show badge indicator on icon */
  showBadge: boolean;

  /** Play sound on detection */
  soundEnabled: boolean;

  /** Enable keyboard shortcuts */
  keyboardShortcutsEnabled: boolean;

  /** Theme preference */
  theme: 'system' | 'light' | 'dark';

  /** First run completed */
  onboardingComplete: boolean;

  /**
   * Grace period (ms) before checking selector health and activating fallback.
   * Must exceed retry window (30000ms) to avoid race conditions.
   * 
   * @default 32000
   * @minimum 30000
   * @maximum 120000
   */
  fallbackDelayMs: number;
}

/**
 * Default settings for new installations.
 */
export const DEFAULT_SETTINGS: Settings = {
  detectors: Object.values(DetectorType).reduce(
    (acc, type) => {
      acc[type] = true;
      return acc;
    },
    {} as Record<DetectorTypeType, boolean>
  ),
  sensitivity: 'medium',
  strictMode: false,
  allowlist: [],
  siteAllowlist: [],
  redactionStyle: 'bracket',
  showBadge: true,
  soundEnabled: false,
  keyboardShortcutsEnabled: true,
  theme: 'system',
  onboardingComplete: false,
  fallbackDelayMs: 32000,
};

// =============================================================================
// Statistics Schema
// =============================================================================

/**
 * Anonymized usage statistics.
 * Note: No prompt content or PII is ever stored.
 */
export interface Stats {
  /** Total number of scans performed */
  totalScans: number;

  /** Total detections across all types */
  totalDetections: number;

  /** Detections by detector type */
  byDetector: Record<DetectorTypeType, number>;

  /** Detections by site domain */
  bySite: Record<string, number>;

  /** User actions taken */
  actions: {
    masked: number;
    proceeded: number;
    cancelled: number;
  };

  /** Last scan timestamp (ISO 8601) */
  lastScanAt: string | null;

  /** First install timestamp (ISO 8601) */
  installedAt: string;

  /** Stats reset timestamp (ISO 8601) */
  lastResetAt: string | null;
}

/**
 * Default stats for new installations.
 */
export const DEFAULT_STATS: Stats = {
  totalScans: 0,
  totalDetections: 0,
  byDetector: Object.values(DetectorType).reduce(
    (acc, type) => {
      acc[type] = 0;
      return acc;
    },
    {} as Record<DetectorTypeType, number>
  ),
  bySite: {},
  actions: {
    masked: 0,
    proceeded: 0,
    cancelled: 0,
  },
  lastScanAt: null,
  installedAt: new Date().toISOString(),
  lastResetAt: null,
};

// =============================================================================
// Cache Schema
// =============================================================================

/**
 * Cached selector configuration.
 */
export interface SelectorCache {
  /** Cached selector config */
  data: SelectorConfig;

  /** When cache was fetched */
  fetchedAt: string;

  /** Cache expiry timestamp */
  expiresAt: string;
}

// =============================================================================
// Full Storage Schema
// =============================================================================

/**
 * Complete storage schema with versioning.
 */
export interface StorageSchema {
  /** Schema version for migrations */
  schemaVersion: number;

  /** User settings */
  settings: Settings;

  /** Usage statistics */
  stats: Stats;

  /** Selector cache (optional) */
  selectorCache?: SelectorCache;
}

/**
 * Current schema version.
 * Increment when making breaking changes.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Default storage state.
 */
export const DEFAULT_STORAGE: StorageSchema = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
};

// =============================================================================
// Storage Keys
// =============================================================================

/**
 * Keys used in chrome.storage.local.
 */
export const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schemaVersion',
  SETTINGS: 'settings',
  STATS: 'stats',
  SELECTOR_CACHE: 'selectorCache',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// =============================================================================
// Migration Types
// =============================================================================

/**
 * Migration function signature.
 */
export type MigrationFn = (data: unknown) => Promise<StorageSchema>;

/**
 * Migration registry.
 */
export interface MigrationRegistry {
  [fromVersion: number]: MigrationFn;
}

// =============================================================================
// Export Types
// =============================================================================

/**
 * CSV export row structure.
 */
export interface StatsExportRow {
  date: string;
  detectorType: string;
  site: string;
  count: number;
}

/**
 * Generate CSV content from stats.
 */
export function statsToCSV(stats: Stats): string {
  const headers = ['Date', 'Detector Type', 'Site', 'Count'];
  const rows: string[][] = [headers];

  // Add detector counts
  for (const [detector, count] of Object.entries(stats.byDetector)) {
    if (count !== undefined && count > 0 && typeof detector === 'string') {
      rows.push([
        new Date().toISOString().split('T')[0] ?? '',
        detector,
        'all',
        count.toString(),
      ]);
    }
  }

  // Add site counts
  for (const [site, count] of Object.entries(stats.bySite)) {
    if (count !== undefined && count > 0 && typeof site === 'string') {
      rows.push([
        new Date().toISOString().split('T')[0] ?? '',
        'all',
        site,
        count.toString(),
      ]);
    }
  }

  return rows.map((row) => row.join(',')).join('\n');
}
