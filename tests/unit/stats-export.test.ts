/**
 * @file stats-export.test.ts
 * @description Tests for CSV export of extension stats.
 */

import { describe, test, expect } from 'vitest';
import { DEFAULT_STATS, DetectorType, type Stats } from '@/shared/types';
import {
  statsToCsv,
  buildExportRows,
  buildExportFilename,
} from '@/shared/utils/stats-export';

const FIXED_DATE = new Date('2026-09-15T10:00:00Z');

function fixtureStats(): Stats {
  return {
    ...DEFAULT_STATS,
    byDetector: {
      ...DEFAULT_STATS.byDetector,
      [DetectorType.API_KEY_OPENAI]: 3,
    },
    bySite: {
      'chatgpt.com': 2,
      'weird,site.example': 1,
    },
  };
}

describe('statsToCsv', () => {
  test('builds exact CSV with detector and site rows, omitting zero counts', () => {
    const csv = statsToCsv(fixtureStats(), FIXED_DATE);
    expect(csv).toBe(
      'exported_at,detector_type,site,count\n' +
        '2026-09-15,api_key_openai,all,3\n' +
        '2026-09-15,all,chatgpt.com,2\n' +
        '2026-09-15,all,"weird,site.example",1'
    );
  });

  test('empty stats produce header line only', () => {
    expect(statsToCsv(DEFAULT_STATS, FIXED_DATE)).toBe(
      'exported_at,detector_type,site,count'
    );
  });
});

describe('buildExportRows', () => {
  test('each row has exactly the expected keys', () => {
    const rows = buildExportRows(fixtureStats(), FIXED_DATE);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row)).toEqual([
        'exported_at',
        'detector_type',
        'site',
        'count',
      ]);
    }
  });
});

describe('buildExportFilename', () => {
  test('formats as ai-leak-checker-stats-YYYY-MM-DD.csv', () => {
    expect(buildExportFilename(FIXED_DATE)).toBe(
      'ai-leak-checker-stats-2026-09-15.csv'
    );
  });
});
