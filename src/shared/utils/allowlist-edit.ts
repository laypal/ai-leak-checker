/**
 * @file allowlist-edit.ts
 * @description Pure helpers for editing the user's value allowlist
 * (`Settings.allowlist`, see src/shared/types/storage.ts). No chrome/DOM
 * access — safe to call from the popup, content script, or tests.
 * @module shared/utils/allowlist-edit
 *
 * @dependencies
 *   - Finding, DetectorType (../types/detection)
 *
 * @security
 *   - Pure functions only; never persists or transmits values itself.
 */

import type { Finding, DetectorType } from '@/shared/types';

/** Hard cap on stored allowlist entries; mirrors the popup's count indicator. */
export const MAX_ALLOWLIST_ENTRIES = 100;

/** Minimum trimmed length for a new allowlist entry. */
const MIN_ENTRY_LENGTH = 4;

export type AddAllowlistResult =
  | { ok: true; list: string[] }
  | { ok: false; reason: 'empty' | 'too_short' | 'duplicate' | 'limit' };

/**
 * Add a trimmed value to an allowlist, returning a new array.
 *
 * @param list - Current allowlist (not mutated).
 * @param raw - Raw user input to add.
 * @returns The new list on success, or a rejection reason.
 */
export function addAllowlistEntry(list: string[], raw: string): AddAllowlistResult {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return { ok: false, reason: 'empty' };
  }
  if (trimmed.length < MIN_ENTRY_LENGTH) {
    return { ok: false, reason: 'too_short' };
  }
  if (list.includes(trimmed)) {
    return { ok: false, reason: 'duplicate' };
  }
  if (list.length >= MAX_ALLOWLIST_ENTRIES) {
    return { ok: false, reason: 'limit' };
  }

  return { ok: true, list: [...list, trimmed] };
}

/**
 * Remove an exact-match entry from an allowlist, returning a new array.
 *
 * @param list - Current allowlist (not mutated).
 * @param value - Exact value to remove.
 * @returns The new list, unchanged aside from the removed entry.
 */
export function removeAllowlistEntry(list: string[], value: string): string[] {
  return list.filter(entry => entry !== value);
}

/** Result of {@link applyAllowlistToFindings}. */
export interface ApplyAllowlistResult {
  /** New allowlist, or the original list unchanged when the add was rejected. */
  list: string[];
  /** Findings still pending after removing the allowlisted one. */
  remaining: Finding[];
  /** Whether the allowlist was actually updated. */
  changed: boolean;
}

/**
 * Decide the effect of allowlisting one finding out of a pending set: add its
 * value to the allowlist and drop it from the remaining findings shown in the
 * modal. Pure — the content script performs the actual settings persistence.
 *
 * @param findings - Findings currently pending in the modal.
 * @param list - Current allowlist.
 * @param finding - The finding the user chose to allowlist.
 * @returns The new allowlist, the remaining findings, and whether it changed.
 */
export function applyAllowlistToFindings(
  findings: Finding[],
  list: string[],
  finding: Finding
): ApplyAllowlistResult {
  const result = addAllowlistEntry(list, finding.value);
  if (!result.ok) {
    return { list, remaining: findings, changed: false };
  }

  return {
    list: result.list,
    remaining: findings.filter(f => f !== finding),
    changed: true,
  };
}

/**
 * Minimal finding metadata (no `.value`) — matches the shape the content
 * script keeps on `pendingSubmission.findingMeta` so redaction never needs
 * to re-store raw values.
 */
export interface FindingMetaLike {
  type: DetectorType;
  start: number;
  end: number;
  confidence: number;
}

/** Input state for {@link allowlistTransition}. */
export interface AllowlistTransitionState {
  /** Findings currently pending in the modal (with raw `.value`). */
  findings: Finding[];
  /** Metadata mirror of `findings`, kept in `pendingSubmission` for redaction. */
  findingMeta: FindingMetaLike[];
  /** Detector types mirror of `findings`, kept in `pendingSubmission`. */
  detectorTypes: string[];
  /** Current user allowlist. */
  allowlist: string[];
}

/** Result of {@link allowlistTransition}. */
export interface AllowlistTransitionResult {
  /** Whether the allowlist was actually updated. */
  changed: boolean;
  /** New allowlist, or the original list unchanged when the add was rejected. */
  allowlist: string[];
  /** Findings still pending after removing the allowlisted one. */
  remaining: Finding[];
  /** `findingMeta` filtered to match `remaining` (the allowlisted entry removed). */
  findingMeta: FindingMetaLike[];
  /** `detectorTypes` filtered to match `remaining`. */
  detectorTypes: string[];
}

/**
 * Compute the full content-script state transition for allowlisting one
 * finding: updates the allowlist and drops the finding from every parallel
 * array the content script keeps (`findings`, `findingMeta`, `detectorTypes`)
 * so a subsequent "Mask & Continue" only redacts what's still pending.
 *
 * Without filtering `findingMeta` too, an allowlisted finding could still be
 * masked from the input text even though the modal no longer warns about it.
 *
 * @param state - Current pending findings/metadata and allowlist.
 * @param finding - The finding the user chose to allowlist.
 * @returns The new allowlist and the three arrays with that finding removed;
 *   `changed: false` returns `state`'s arrays untouched when the add is rejected.
 */
export function allowlistTransition(
  state: AllowlistTransitionState,
  finding: Finding
): AllowlistTransitionResult {
  const applied = applyAllowlistToFindings(state.findings, state.allowlist, finding);

  if (!applied.changed) {
    return {
      changed: false,
      allowlist: state.allowlist,
      remaining: state.findings,
      findingMeta: state.findingMeta,
      detectorTypes: state.detectorTypes,
    };
  }

  const findingMeta = state.findingMeta.filter(
    m => !(m.type === finding.type && m.start === finding.start && m.end === finding.end)
  );

  return {
    changed: true,
    allowlist: applied.list,
    remaining: applied.remaining,
    findingMeta,
    detectorTypes: applied.remaining.map(f => f.type),
  };
}
