/**
 * @file allowlist-edit.test.ts
 * @description Unit tests for the pure allowlist-edit helpers used by the
 * popup allowlist editor and the modal "Don't warn about this" action.
 * @module tests/unit/allowlist-edit
 *
 * @dependencies
 * - vitest (describe, it, expect)
 * - @/shared/utils/allowlist-edit (addAllowlistEntry, removeAllowlistEntry, applyAllowlistToFindings)
 * - @/shared/types (Finding, DetectorType)
 *
 * @security
 * - Uses canonical safe example fixtures only (AKIAIOSFODNN7EXAMPLE); no real secrets.
 */
import { describe, it, expect } from 'vitest';
import {
  addAllowlistEntry,
  removeAllowlistEntry,
  applyAllowlistToFindings,
  MAX_ALLOWLIST_ENTRIES,
} from '@/shared/utils/allowlist-edit';
import { DetectorType, type Finding } from '@/shared/types';

describe('addAllowlistEntry', () => {
  it('trims and adds a valid value', () => {
    const result = addAllowlistEntry([], '  acme-internal  ');
    expect(result).toEqual({ ok: true, list: ['acme-internal'] });
  });

  it('does not mutate the input list', () => {
    const original = ['existing'];
    addAllowlistEntry(original, 'new-value');
    expect(original).toEqual(['existing']);
  });

  it('rejects an empty value', () => {
    expect(addAllowlistEntry([], '')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a whitespace-only value', () => {
    expect(addAllowlistEntry([], '   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a value under 4 characters after trimming', () => {
    expect(addAllowlistEntry([], ' ab ')).toEqual({ ok: false, reason: 'too_short' });
  });

  it('accepts a value exactly 4 characters', () => {
    expect(addAllowlistEntry([], 'abcd')).toEqual({ ok: true, list: ['abcd'] });
  });

  it('rejects an exact-match duplicate', () => {
    expect(addAllowlistEntry(['abcd'], 'abcd')).toEqual({ ok: false, reason: 'duplicate' });
  });

  it('allows a different-case value that is not an exact duplicate', () => {
    const result = addAllowlistEntry(['ABCD'], 'abcd');
    expect(result).toEqual({ ok: true, list: ['ABCD', 'abcd'] });
  });

  it('rejects the 101st entry with limit', () => {
    const full = Array.from({ length: MAX_ALLOWLIST_ENTRIES }, (_, i) => `entry-${i}`);
    expect(addAllowlistEntry(full, 'one-more')).toEqual({ ok: false, reason: 'limit' });
  });

  it('accepts the 100th entry (at the boundary)', () => {
    const almostFull = Array.from({ length: MAX_ALLOWLIST_ENTRIES - 1 }, (_, i) => `entry-${i}`);
    const result = addAllowlistEntry(almostFull, 'last-one');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.list).toHaveLength(MAX_ALLOWLIST_ENTRIES);
    }
  });
});

describe('removeAllowlistEntry', () => {
  it('removes the exact value, leaving others untouched', () => {
    const result = removeAllowlistEntry(['a', 'b', 'c'], 'b');
    expect(result).toEqual(['a', 'c']);
  });

  it('does not mutate the input list', () => {
    const original = ['a', 'b'];
    removeAllowlistEntry(original, 'a');
    expect(original).toEqual(['a', 'b']);
  });

  it('is a no-op when the value is not present', () => {
    expect(removeAllowlistEntry(['a', 'b'], 'z')).toEqual(['a', 'b']);
  });
});

function makeFinding(value: string): Finding {
  return {
    type: DetectorType.API_KEY_AWS,
    value,
    start: 0,
    end: value.length,
    confidence: 0.9,
  };
}

describe('applyAllowlistToFindings', () => {
  it('adds the finding value to the allowlist and drops it from remaining', () => {
    const target = makeFinding('AKIAIOSFODNN7EXAMPLE');
    const other = makeFinding('AKIAIOSFODNN7OTHER1');
    const result = applyAllowlistToFindings([target, other], [], target);

    expect(result.changed).toBe(true);
    expect(result.list).toEqual(['AKIAIOSFODNN7EXAMPLE']);
    expect(result.remaining).toEqual([other]);
  });

  it('leaves list and remaining unchanged when the add is rejected', () => {
    const short = makeFinding('abc');
    const result = applyAllowlistToFindings([short], [], short);

    expect(result.changed).toBe(false);
    expect(result.list).toEqual([]);
    expect(result.remaining).toEqual([short]);
  });
});
