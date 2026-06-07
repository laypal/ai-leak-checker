/**
 * @file scan-options.test.ts
 * @description Unit tests for buildScanOptions, which converts persisted user
 * Settings (storage shape) into engine ScanOptions. Regression coverage for the
 * bug where the content script ignored disabled detectors and always scanned
 * with every detector enabled at medium sensitivity.
 * @module tests/unit/scan-options
 *
 * @dependencies
 * - vitest (describe, it, expect)
 * - @/shared/detectors (buildScanOptions, scan)
 * - @/shared/types (Settings, DetectorType, DEFAULT_SETTINGS)
 *
 * @security
 * - Uses synthetic email/key strings only; no real secrets.
 */
import { describe, it, expect } from 'vitest';
import { buildScanOptions, scan } from '@/shared/detectors';
import { DetectorType, DEFAULT_SETTINGS, type Settings } from '@/shared/types';

/** Build a Settings object from DEFAULT_SETTINGS with overrides applied. */
function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('buildScanOptions', () => {
  it('returns a Set of only enabled detectors', () => {
    const settings = makeSettings({
      detectors: { ...DEFAULT_SETTINGS.detectors, [DetectorType.EMAIL]: false },
    });

    const options = buildScanOptions(settings);
    const enabled = options.enabledDetectors as Set<DetectorType>;

    expect(enabled).toBeInstanceOf(Set);
    expect(enabled.has(DetectorType.EMAIL)).toBe(false);
    expect(enabled.has(DetectorType.API_KEY_OPENAI)).toBe(true);
  });

  it('maps sensitivity to sensitivityLevel', () => {
    const options = buildScanOptions(makeSettings({ sensitivity: 'high' }));
    expect(options.sensitivityLevel).toBe('high');
  });

  it('passes the user allowlist through', () => {
    const options = buildScanOptions(makeSettings({ allowlist: ['acme-internal'] }));
    expect(options.allowlist).toEqual(['acme-internal']);
  });

  it('enables every detector when all are toggled on (default settings)', () => {
    const enabled = buildScanOptions(makeSettings()).enabledDetectors as Set<DetectorType>;
    for (const type of Object.values(DetectorType)) {
      expect(enabled.has(type)).toBe(true);
    }
  });
});

describe('buildScanOptions applied to scan (the reported bug)', () => {
  const EMAIL_TEXT = 'contact me at jane.doe@gmail.com';

  it('detects an email when the Email detector is enabled', () => {
    const options = buildScanOptions(makeSettings());
    const result = scan(EMAIL_TEXT, options);
    expect(result.findings.some(f => f.type === DetectorType.EMAIL)).toBe(true);
  });

  it('does NOT detect an email when the Email detector is disabled', () => {
    const settings = makeSettings({
      detectors: { ...DEFAULT_SETTINGS.detectors, [DetectorType.EMAIL]: false },
    });
    const result = scan(EMAIL_TEXT, buildScanOptions(settings));
    expect(result.findings.some(f => f.type === DetectorType.EMAIL)).toBe(false);
  });
});
