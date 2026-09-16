/**
 * @file download.ts
 * @description Browser-download trigger for popup UI (DOM allowed here,
 *              unlike the pure shared/utils modules).
 */

/** Trigger a browser download of `text` as `filename` via a Blob URL. */
export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
