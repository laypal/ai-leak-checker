/**
 * @file placeholders.ts
 * @fileoverview Built-in allowlist classifiers for placeholder / example values
 * @module utils/placeholders
 * @description Recognises values that *look* sensitive to the detectors but are
 * well-known non-secrets: documentation placeholders, redacted keys, example
 * email addresses, and structured product/SKU codes. Applied as a suppression
 * filter so they cover every detector type uniformly.
 *
 * Design principle: a real cryptographic secret effectively never contains
 * English placeholder words ("placeholder", "your_", "replace") or long runs of
 * redaction characters ("xxxx"), so suppressing on these markers is low-risk.
 *
 * @dependencies None — pure functions over strings (no imports).
 * @security Suppression is conservative: strong markers match at any length,
 *   weak markers only on short values (≤40 chars) to avoid hiding real long
 *   secrets that coincidentally embed a dev word. Never relax this without a
 *   corpus re-run (see docs/detection/FALSE_POSITIVES.md).
 */

/**
 * Strong markers: compound/distinctive substrings that genuine cryptographic
 * secrets effectively never contain, so they are safe to match at any length.
 */
const STRONG_PLACEHOLDER_MARKERS = [
  'your_',
  'your-',
  'placeholder',
  'replace',
  'changeme',
  'change_me',
  'redacted',
  'example',
  'lorem',
  'ipsum',
  'foobar',
  'test-key',
  'test-secret',
  'default-key',
  'default-secret',
];

/**
 * Weak markers: short English dev words that could appear by chance inside a
 * long random secret. To avoid suppressing real secrets (a false negative,
 * which is worse than a false positive), these are only honoured for short
 * values, where genuine high-entropy secrets are rare.
 */
const WEAK_PLACEHOLDER_MARKERS = [
  'dummy',
  'demo',
  'sample',
  'mock',
  'temp',
  'random',
  'fake',
];

/**
 * Maximum length at which weak markers are trusted. Real provider keys, tokens
 * and JWTs are typically longer than this.
 */
const WEAK_MARKER_MAX_LENGTH = 40;

/**
 * Determine whether a detected secret value is actually a placeholder/example.
 *
 * @param value - The detected value
 * @returns true if the value is a recognised placeholder and should be suppressed
 */
export function isPlaceholderSecret(value: string): boolean {
  if (!value || value.length < 4) {
    return false;
  }

  const lower = value.toLowerCase();

  if (STRONG_PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker))) {
    return true;
  }

  // Runs of 4+ redaction characters (e.g. AKIAXXXXXXXXXXXXXXXX, sk-xxxxxxxx).
  if (/x{4,}/i.test(value)) {
    return true;
  }

  // Weak dev-word markers only apply to short values to avoid false negatives
  // on long real secrets that happen to contain the substring.
  if (
    value.length <= WEAK_MARKER_MAX_LENGTH &&
    WEAK_PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker))
  ) {
    return true;
  }

  return false;
}

/**
 * Email domains that are reserved (RFC 2606) or conventionally used as
 * placeholders in documentation and examples.
 */
const EXAMPLE_EMAIL_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'test.org',
  'sample.com',
  'sample.net',
  'sample.org',
  'domain.com',
  'email.com',
  'yourdomain.com',
  'mydomain.com',
]);

/**
 * Reserved top-level domains (RFC 2606 / RFC 6761) that never resolve to real mail.
 */
const RESERVED_EMAIL_TLDS = ['.example', '.test', '.invalid', '.localhost'];

/**
 * Determine whether an email address uses a reserved/example domain.
 *
 * @param value - The detected email address
 * @returns true if the email is an example/placeholder address
 */
export function isExampleEmail(value: string): boolean {
  const at = value.lastIndexOf('@');
  if (at < 0 || at === value.length - 1) {
    return false;
  }

  const domain = value.slice(at + 1).toLowerCase();

  if (EXAMPLE_EMAIL_DOMAINS.has(domain)) {
    return true;
  }

  return RESERVED_EMAIL_TLDS.some((tld) => domain.endsWith(tld));
}

/**
 * Structured product / SKU / build codes such as `CODE-12345-67890`.
 * These are uppercase letters and digits in hyphen-delimited segments, a shape
 * that genuine API keys/tokens (mixed-case, no internal hyphen segmentation)
 * effectively never take.
 */
const PRODUCT_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;

/**
 * Determine whether a value is a structured uppercase product code.
 *
 * @param value - The detected value
 * @returns true if the value matches the product-code shape
 */
export function isProductCode(value: string): boolean {
  return PRODUCT_CODE_PATTERN.test(value);
}
