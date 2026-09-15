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

  // Edge-case inputs: buildScanOptions + scan must stay robust and never emit a
  // spurious EMAIL finding, whether the detector is on or off.
  const emailDisabled = makeSettings({
    detectors: { ...DEFAULT_SETTINGS.detectors, [DetectorType.EMAIL]: false },
  });
  const edgeCases: Array<[label: string, text: string]> = [
    ['empty string', ''],
    ['whitespace only', '   \n\t  '],
    ['special characters only', '!@#$%^&*()_+-=[]{}|;:,.<>?'],
    ['very long non-email text', 'lorem ipsum '.repeat(5000)],
    ['UUID', '550e8400-e29b-41d4-a716-446655440000'],
  ];

  it.each(edgeCases)('does not throw and finds no email for %s (enabled)', (_label, text) => {
    const run = (): boolean =>
      scan(text, buildScanOptions(makeSettings())).findings.some(
        f => f.type === DetectorType.EMAIL
      );
    expect(run).not.toThrow();
    expect(run()).toBe(false);
  });

  it.each(edgeCases)('does not throw and finds no email for %s (disabled)', (_label, text) => {
    const run = (): boolean =>
      scan(text, buildScanOptions(emailDisabled)).findings.some(
        f => f.type === DetectorType.EMAIL
      );
    expect(run).not.toThrow();
    expect(run()).toBe(false);
  });
});

describe('buildScanOptions applied to scan with a user allowlist entry (EXT-7.3)', () => {
  // Canonical safe AWS example key (push-protection-safe fixture).
  const AWS_EXAMPLE_KEY = 'AKIAIOSFODNN7EXAMPLE';
  const text = `Config: ${AWS_EXAMPLE_KEY}`;

  it('raises no finding for a value present in settings.allowlist', () => {
    const settings = makeSettings({ allowlist: [AWS_EXAMPLE_KEY] });
    const result = scan(text, {
      ...buildScanOptions(settings),
      disableBuiltinAllowlist: true,
    });
    expect(result.findings.some(f => f.value === AWS_EXAMPLE_KEY)).toBe(false);
  });

  it('still detects the same value when the allowlist is empty', () => {
    const settings = makeSettings({ allowlist: [] });
    const result = scan(text, {
      ...buildScanOptions(settings),
      disableBuiltinAllowlist: true,
    });
    expect(result.findings.some(f => f.value === AWS_EXAMPLE_KEY)).toBe(true);
  });
});
