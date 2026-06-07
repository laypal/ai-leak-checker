/**
 * @file content-site-exclusion.test.ts
 * @description Verifies the content-script scan gate: when the current host is
 * in siteAllowlist, scanning is short-circuited to an empty result so no modal
 * fires. Mirrors the production glue (scanWithSettings) while using the real
 * isHostExcluded helper and real engine.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { scan } from '@/shared/detectors';
import { isHostExcluded } from '@/shared/utils/site-match';
import type { DetectionResult } from '@/shared/types';

// Mirror of production scanWithSettings gate (src/content/index.ts).
function simulateScanWithSettings(
  text: string,
  host: string,
  siteAllowlist: string[]
): DetectionResult {
  if (isHostExcluded(host, siteAllowlist)) {
    return scan('');
  }
  return scan(text);
}

const SECRET = 'My key is sk-abcdefghijklmnopqrstuvwxyz0123456789ABCD';

describe('content scan gate (siteAllowlist)', () => {
  it('returns no sensitive data when the host is excluded', () => {
    const result = simulateScanWithSettings(SECRET, 'chatgpt.com', ['chatgpt.com']);
    expect(result.hasSensitiveData).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('detects normally when the host is NOT excluded', () => {
    const result = simulateScanWithSettings(SECRET, 'chatgpt.com', []);
    expect(result.hasSensitiveData).toBe(true);
  });

  it('engages live after the host is added to the allowlist', () => {
    let allowlist: string[] = [];
    expect(simulateScanWithSettings(SECRET, 'claude.ai', allowlist).hasSensitiveData).toBe(true);
    allowlist = ['claude.ai']; // mirrors applySettings({ siteAllowlist:[host] })
    expect(simulateScanWithSettings(SECRET, 'claude.ai', allowlist).hasSensitiveData).toBe(false);
  });
});
