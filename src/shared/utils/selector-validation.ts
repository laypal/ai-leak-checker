/**
 * @fileoverview Structural validation for the site selector configuration (Task 7.2)
 * @module utils/selector-validation
 *
 * Catches the most common, silent selector breakage without needing live site
 * access: missing input/submit selectors, empty/duplicate entries, and shallow
 * fallback chains. Pure and deterministic so it can run in CI on every change.
 */

/** Minimum fallback-chain depth before we warn about fragility. */
const MIN_FALLBACK_DEPTH = 2;

/** Loose shape of a single site entry in selectors.json. */
interface SiteEntry {
  name?: string;
  enabled?: boolean;
  inputSelectors?: unknown;
  submitSelectors?: unknown;
}

/** Loose shape of the parsed selectors.json. */
interface SelectorConfigShape {
  version?: string;
  sites?: Record<string, SiteEntry>;
}

/** Result of validating a selector configuration. */
export interface SelectorValidationResult {
  /** True when there are no blocking errors. */
  ok: boolean;
  /** Blocking problems that should fail CI. */
  errors: string[];
  /** Non-blocking concerns (e.g. fragile single-selector chains). */
  warnings: string[];
}

/**
 * Validate a parsed selector configuration object.
 *
 * @param config - Parsed contents of selectors.json
 * @returns Validation result with errors and warnings
 */
export function validateSelectorConfig(config: unknown): SelectorValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const cfg = config as SelectorConfigShape;
  const sites = cfg?.sites;

  if (!sites || typeof sites !== 'object' || Object.keys(sites).length === 0) {
    errors.push('Config has no sites defined.');
    return { ok: false, errors, warnings };
  }

  const enabledSites = Object.entries(sites).filter(([, s]) => s?.enabled !== false);
  if (enabledSites.length === 0) {
    warnings.push('No enabled sites in config.');
  }

  for (const [host, site] of Object.entries(sites)) {
    if (site?.enabled === false) {
      continue;
    }

    validateSelectorList(host, 'input', site?.inputSelectors, errors, warnings);
    validateSelectorList(host, 'submit', site?.submitSelectors, errors, warnings);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * Validate a single named selector list for a site.
 */
function validateSelectorList(
  host: string,
  kind: 'input' | 'submit',
  list: unknown,
  errors: string[],
  warnings: string[]
): void {
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`${host}: missing ${kind} selector(s).`);
    return;
  }

  const seen = new Set<string>();
  for (const selector of list) {
    if (typeof selector !== 'string' || selector.trim().length === 0) {
      errors.push(`${host}: empty selector in ${kind} list.`);
      continue;
    }
    const normalized = selector.trim();
    if (seen.has(normalized)) {
      errors.push(`${host}: duplicate ${kind} selector "${normalized}".`);
    }
    seen.add(normalized);
  }

  if (list.length < MIN_FALLBACK_DEPTH) {
    warnings.push(
      `${host}: ${kind} fallback chain has only ${list.length} selector; ` +
        `consider adding fallbacks for resilience.`
    );
  }
}
