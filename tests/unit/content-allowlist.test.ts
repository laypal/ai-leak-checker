/**
 * @file content-allowlist.test.ts
 * @description Unit tests for `allowlistTransition`, the pure state
 * transition `src/content/index.ts` handleAllowlist calls. Covers the fix
 * for the bug where allowlisting one finding out of several left the
 * allowlisted finding's metadata in `pendingSubmission.findingMeta`, so a
 * later "Mask & Continue" still redacted it from the input text even though
 * the modal no longer warned about it.
 * @module tests/unit/content-allowlist
 *
 * @dependencies
 * - vitest (describe, it, expect)
 * - @/shared/utils/allowlist-edit (allowlistTransition)
 * - @/shared/types (Finding, DetectorType)
 *
 * @security
 * - Uses canonical safe example fixtures only (AKIAIOSFODNN7EXAMPLE); no real secrets.
 */
import { describe, it, expect } from 'vitest';
import { allowlistTransition, type FindingMetaLike } from '@/shared/utils/allowlist-edit';
import { DetectorType, type Finding } from '@/shared/types';

const findingA: Finding = {
  type: DetectorType.API_KEY_AWS,
  value: 'AKIAIOSFODNN7EXAMPLE',
  start: 0,
  end: 20,
  confidence: 0.95,
};
const findingB: Finding = {
  type: DetectorType.EMAIL,
  value: 'jane.doe@example.com',
  start: 21,
  end: 42,
  confidence: 0.9,
};

/** Mirrors how src/content/index.ts builds findingMeta from findings. */
function toFindingMeta(findings: Finding[]): FindingMetaLike[] {
  return findings.map(f => ({ type: f.type, start: f.start, end: f.end, confidence: f.confidence }));
}

describe('allowlistTransition', () => {
  it('drops the allowlisted finding from findings, findingMeta, and detectorTypes together', () => {
    const state = {
      findings: [findingA, findingB],
      findingMeta: toFindingMeta([findingA, findingB]),
      detectorTypes: [findingA.type, findingB.type],
      allowlist: [] as string[],
    };

    const result = allowlistTransition(state, findingA);

    expect(result.changed).toBe(true);
    expect(result.allowlist).toEqual(['AKIAIOSFODNN7EXAMPLE']);
    expect(result.remaining).toEqual([findingB]);
    // Regression: findingMeta must be pruned in lockstep with `remaining`,
    // otherwise "Mask & Continue" would still redact the allowlisted value.
    expect(result.findingMeta).toEqual(toFindingMeta([findingB]));
    expect(result.findingMeta.some(m => m.start === findingA.start && m.end === findingA.end)).toBe(false);
    expect(result.detectorTypes).toEqual([findingB.type]);
  });

  it('leaves findingMeta and detectorTypes untouched when the last finding is allowlisted', () => {
    const state = {
      findings: [findingA],
      findingMeta: toFindingMeta([findingA]),
      detectorTypes: [findingA.type],
      allowlist: [] as string[],
    };

    const result = allowlistTransition(state, findingA);

    expect(result.remaining).toEqual([]);
    expect(result.findingMeta).toEqual([]);
    expect(result.detectorTypes).toEqual([]);
  });

  it('returns the original arrays unchanged when the add is rejected (too short)', () => {
    const shortFinding: Finding = { ...findingA, value: 'abc' };
    const state = {
      findings: [shortFinding],
      findingMeta: toFindingMeta([shortFinding]),
      detectorTypes: [shortFinding.type],
      allowlist: [] as string[],
    };

    const result = allowlistTransition(state, shortFinding);

    expect(result.changed).toBe(false);
    expect(result.allowlist).toEqual([]);
    expect(result.remaining).toEqual([shortFinding]);
    expect(result.findingMeta).toEqual(state.findingMeta);
    expect(result.detectorTypes).toEqual(state.detectorTypes);
  });
});
