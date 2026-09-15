/**
 * @file stats-export.ts
 * @description Builds a CSV export of lifetime usage stats. Never includes
 *              prompt content or finding values — only detector types,
 *              hostnames, counts, and the export date.
 */

import type { Stats } from '../types/storage';
import { rowsToCsv } from './csv';

/** One row of the stats CSV export. */
export interface StatsExportRow {
  exported_at: string;
  detector_type: string;
  site: string;
  count: number;
}

const EXPORT_HEADER = ['exported_at', 'detector_type', 'site', 'count'];

function toDateStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Build the typed export rows (detector counts, then site counts), zero-count entries omitted. */
export function buildExportRows(stats: Stats, now: Date): StatsExportRow[] {
  const exportedAt = toDateStamp(now);
  const rows: StatsExportRow[] = [];

  for (const [detector, count] of Object.entries(stats.byDetector)) {
    if (count > 0) {
      rows.push({ exported_at: exportedAt, detector_type: detector, site: 'all', count });
    }
  }

  for (const [site, count] of Object.entries(stats.bySite)) {
    if (count > 0) {
      rows.push({ exported_at: exportedAt, detector_type: 'all', site, count });
    }
  }

  return rows;
}

/** Generate CSV content from stats: detector counts, then site counts. */
export function statsToCsv(stats: Stats, now: Date): string {
  const dataRows = buildExportRows(stats, now).map((row) => [
    row.exported_at,
    row.detector_type,
    row.site,
    row.count.toString(),
  ]);
  return rowsToCsv([EXPORT_HEADER, ...dataRows]);
}

/** Build the download filename for a stats export taken at `now`. */
export function buildExportFilename(now: Date): string {
  return `ai-leak-checker-stats-${toDateStamp(now)}.csv`;
}
