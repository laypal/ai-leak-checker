/**
 * @file site-match.ts
 * @description Pure hostname matching helpers for the per-site pause feature
 *              (siteAllowlist). No chrome.* or DOM dependencies, so this is
 *              unit-testable and shared by the popup and content script.
 *
 * @security
 *   - Operates only on hostnames (never prompt content). No network or storage.
 */

/**
 * Normalize a hostname for comparison: lowercase, trimmed, with a single
 * leading "www." stripped. Returns '' for empty/invalid input.
 */
export function normalizeHost(host: string): string {
  if (!host || typeof host !== 'string') return '';
  const trimmed = host.trim().toLowerCase();
  return trimmed.startsWith('www.') ? trimmed.slice(4) : trimmed;
}

/**
 * True when `host` is present in `siteAllowlist` under normalized, exact-match
 * comparison. No subdomain globbing. Empty host or empty list => false.
 */
export function isHostExcluded(host: string, siteAllowlist: string[]): boolean {
  const target = normalizeHost(host);
  if (!target || !Array.isArray(siteAllowlist) || siteAllowlist.length === 0) {
    return false;
  }
  return siteAllowlist.some((h) => normalizeHost(h) === target);
}

/**
 * Toggle a host's membership in a siteAllowlist. Returns a NEW array that is
 * always normalized and deduped: with the normalized host removed if already
 * present (normalized comparison) or appended if absent. For an empty/invalid
 * host, returns the normalized+deduped list with membership unchanged.
 */
export function toggleSiteExclusion(host: string, list: string[]): string[] {
  const source = Array.isArray(list) ? list : [];
  const deduped = Array.from(new Set(source.map(normalizeHost).filter(Boolean)));
  const target = normalizeHost(host);
  if (!target) return deduped;
  return deduped.includes(target)
    ? deduped.filter((h) => h !== target)
    : [...deduped, target];
}
