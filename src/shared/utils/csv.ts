/**
 * @file csv.ts
 * @description RFC 4180 CSV escaping helpers. Pure, no dependencies.
 */

/**
 * Escape a single CSV field per RFC 4180: quote and double embedded quotes
 * whenever the value contains a comma, quote, or newline.
 */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Join rows of raw field values into a CSV string with escaped fields. */
export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}
