/**
 * @fileoverview PII (Personally Identifiable Information) detection patterns
 * @module detectors/pii
 * 
 * Detects personal data including email addresses, phone numbers,
 * and UK-specific identifiers like National Insurance numbers.
 */

import { DetectorType, type Finding } from '@/shared/types';

/**
 * Email detection with RFC 5322 compliant pattern.
 * Intentionally conservative to reduce false positives.
 * 
 * @param text - Text to scan
 * @param filterDomains - Optional list of domains to filter (e.g., corporate domains to ignore)
 * @returns Array of email findings
 */
export function scanForEmails(
  text: string,
  filterDomains?: string[]
): Finding[] {
  const findings: Finding[] = [];

  // RFC 5322 simplified pattern - handles most real-world emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  let match: RegExpExecArray | null;

  while ((match = emailPattern.exec(text)) !== null) {
    const email = match[0].toLowerCase();

    // Apply domain filter if provided
    if (filterDomains) {
      const domain = email.split('@')[1];
      if (domain && filterDomains.some(d => domain.endsWith(d.toLowerCase()))) {
        continue;
      }
    }

    // Skip obvious non-personal emails
    if (isGenericEmail(email)) {
      continue;
    }

    findings.push({
      type: DetectorType.EMAIL,
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
      confidence: calculateEmailConfidence(email),
      context: text.slice(
        Math.max(0, match.index - 30),
        Math.min(text.length, match.index + match[0].length + 30)
      ),
    });
  }

  return findings;
}

/**
 * Check if an email appears to be generic/non-personal.
 */
function isGenericEmail(email: string): boolean {
  const genericPrefixes = [
    'noreply', 'no-reply', 'donotreply', 'do-not-reply',
    'info', 'support', 'help', 'admin', 'webmaster',
    'sales', 'marketing', 'contact', 'hello', 'hi',
    'team', 'example', 'test', 'demo',
  ];

  const prefix = email.split('@')[0]?.toLowerCase() ?? '';
  return genericPrefixes.some(g => prefix.startsWith(g));
}

/**
 * Calculate confidence for email detection.
 * Personal domains get higher confidence.
 */
function calculateEmailConfidence(email: string): number {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';

  // Personal email providers - higher confidence these are personal
  const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com'];
  if (personalDomains.some(d => domain === d)) {
    return 0.85;
  }

  // Co.uk domains are commonly personal
  if (domain.endsWith('.co.uk')) {
    return 0.75;
  }

  // Default confidence for other domains
  return 0.65;
}

/**
 * UK phone number detection.
 * Handles various formats: +44, 07xxx, 01xxx, 02xxx
 * 
 * @param text - Text to scan
 * @returns Array of phone findings
 */
export function scanForUKPhones(text: string): Finding[] {
  const findings: Finding[] = [];

  // UK phone patterns
  const patterns = [
    // International format: +44 7xxx xxx xxx or +44 (0) 7xxx xxx xxx
    // Mobile: +44 7 followed by 9 digits
    // Landline: +44 1 or 2 followed by 8-9 digits
    /\+44\s*\(?\s*0?\s*\)?\s*[1-9]\d{2,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
    
    // Mobile: 07xxx xxxxxx (with various separators)
    // 07 followed by 9 more digits = 11 digits total
    // Format: 07xxx xxxxxx (can be grouped as 07xxx xxxxxx or 07xx xxx xxxx)
    /\b07\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/g,
    
    // Landline: 01xxx xxxxxx or 02x xxxx xxxx
    // 01xxx or 011x or 012x or 013x or 014x or 015x or 016x or 017x or 018x or 019x
    // 020 or 023 or 024 or 028 or 029
    /\b0[12]\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
  ];

  const seen = new Set<number>(); // Track match positions to avoid duplicates

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      // Skip if we've already found a match at this position
      if (seen.has(match.index)) {
        continue;
      }
      seen.add(match.index);

      const value = match[0];

      // Validate it's a plausible phone number
      if (!isValidUKPhone(value)) {
        continue;
      }

      findings.push({
        type: DetectorType.PHONE_UK,
        value,
        start: match.index,
        end: match.index + value.length,
        confidence: 0.8,
        context: text.slice(
          Math.max(0, match.index - 30),
          Math.min(text.length, match.index + value.length + 30)
        ),
      });
    }
  }

  return findings;
}

/**
 * Validate a UK phone number format.
 */
function isValidUKPhone(phone: string): boolean {
  // Normalize to digits only
  const digits = phone.replace(/\D/g, '');

  // UK numbers should have 10-11 digits (with or without country code)
  if (digits.length < 10 || digits.length > 13) {
    return false;
  }

  // Check valid UK prefixes
  if (digits.startsWith('44')) {
    // International format - remove country code
    let local = digits.slice(2);
    // If local starts with 0 (from +44 (0) format), remove it
    if (local.startsWith('0')) {
      local = local.slice(1);
    }
    // Local should start with 1-9 (mobile 7xxx or landline 1xxx/2xxx)
    return /^[1-9]/.test(local);
  }

  // Local format - should start with 0 followed by valid area code
  if (digits.startsWith('0')) {
    // Valid UK area codes start with 01, 02, 03, 07
    return /^0[1237]/.test(digits);
  }

  return false;
}

/**
 * UK National Insurance number detection.
 * Format: AB 12 34 56 C or AB123456C
 * 
 * @param text - Text to scan
 * @returns Array of NI number findings
 */
export function scanForUKNationalInsurance(text: string): Finding[] {
  const findings: Finding[] = [];

  // NI number pattern with optional spaces
  // Format: 2 letters, 6 digits, 1 letter (A, B, C, or D)
  // First letter cannot be D, F, I, Q, U, or V
  // Second letter cannot be D, F, I, O, Q, U, or V
  // Match format first, validate letters later
  const niPattern = /\b[A-CEGHJ-PR-TW-Za-ceghj-pr-tw-z][A-CEGHJ-NPR-TW-Za-ceghj-npr-tw-z]\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Da-d]\b/gi;

  let match: RegExpExecArray | null;

  while ((match = niPattern.exec(text)) !== null) {
    const value = match[0];
    const normalized = value.replace(/\s/g, '').toUpperCase();

    // Validate first letter is not D, F, I, Q, U, or V
    const firstLetter = normalized[0];
    if (firstLetter && ['D', 'F', 'I', 'Q', 'U', 'V'].includes(firstLetter)) {
      continue;
    }

    // Validate second letter is not D, F, I, O, Q, U, or V
    const secondLetter = normalized[1];
    if (secondLetter && ['D', 'F', 'I', 'O', 'Q', 'U', 'V'].includes(secondLetter)) {
      continue;
    }

    // Skip if it looks like a test/example NI number
    if (isExampleNINumber(value)) {
      continue;
    }

    findings.push({
      type: DetectorType.UK_NI_NUMBER,
      value: normalized,
      start: match.index,
      end: match.index + value.length,
      confidence: 0.85,
      context: text.slice(
        Math.max(0, match.index - 30),
        Math.min(text.length, match.index + value.length + 30)
      ),
    });
  }

  return findings;
}

/**
 * Check if NI number is a known test/example value.
 */
function isExampleNINumber(ni: string): boolean {
  const normalized = ni.replace(/\s/g, '').toUpperCase();

  // Common example NI numbers used in documentation
  // Note: AB123456C is a valid test sample format, so we only filter obvious placeholders
  const examples = [
    'QQ123456A', // HMRC example
    'AA000000A', // Obvious placeholder
  ];

  return examples.includes(normalized);
}

/**
 * US Social Security Number detection.
 * Format: XXX-XX-XXXX
 * 
 * @param text - Text to scan
 * @returns Array of SSN findings
 */
export function scanForUSSSN(text: string): Finding[] {
  const findings: Finding[] = [];

  // SSN pattern: XXX-XX-XXXX (with optional dashes/spaces)
  // Must not start with 000, 666, or 9xx in first group
  // Must not have 00 in second group
  // Must not have 0000 in third group
  const ssnPattern = /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g;

  let match: RegExpExecArray | null;

  while ((match = ssnPattern.exec(text)) !== null) {
    const value = match[0];
    const normalized = value.replace(/\D/g, '');

    // Skip obvious test patterns
    if (isTestSSN(normalized)) {
      continue;
    }

    findings.push({
      type: DetectorType.US_SSN,
      value,
      start: match.index,
      end: match.index + value.length,
      confidence: 0.75, // Lower confidence - many false positives with 9-digit numbers
      context: text.slice(
        Math.max(0, match.index - 30),
        Math.min(text.length, match.index + value.length + 30)
      ),
    });
  }

  return findings;
}

/**
 * Check if SSN is a known test/advertising value.
 */
function isTestSSN(ssn: string): boolean {
  const testPatterns = [
    '123456789',
    '111111111',
    '999999999',
    /^987654321$/,
    /^(\d)\1{8}$/, // All same digit
  ];

  return testPatterns.some(p =>
    typeof p === 'string' ? ssn === p : p.test(ssn)
  );
}

/**
 * IBAN (International Bank Account Number) detection.
 * 
 * @param text - Text to scan
 * @returns Array of IBAN findings
 */
export function scanForIBAN(text: string): Finding[] {
  const findings: Finding[] = [];

  // IBAN pattern: 2 letter country code, 2 check digits, then BBAN (up to 30 alphanumeric)
  const ibanPattern = /\b[A-Z]{2}\d{2}[\s]?([A-Z0-9]{4}[\s]?){2,7}[A-Z0-9]{1,4}\b/gi;

  let match: RegExpExecArray | null;

  while ((match = ibanPattern.exec(text)) !== null) {
    const value = match[0];
    const normalized = value.replace(/\s/g, '').toUpperCase();

    // Validate IBAN checksum
    if (!validateIBANChecksum(normalized)) {
      continue;
    }

    findings.push({
      type: DetectorType.IBAN,
      value,
      start: match.index,
      end: match.index + value.length,
      confidence: 0.9,
      context: text.slice(
        Math.max(0, match.index - 30),
        Math.min(text.length, match.index + value.length + 30)
      ),
    });
  }

  return findings;
}

/**
 * Validate IBAN checksum using mod-97.
 */
function validateIBANChecksum(iban: string): boolean {
  if (iban.length < 15 || iban.length > 34) {
    return false;
  }

  // Move first 4 chars to end, convert letters to numbers
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged
    .split('')
    .map(c => (c >= 'A' && c <= 'Z' ? (c.charCodeAt(0) - 55).toString() : c))
    .join('');

  // Mod 97 check
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder === 1;
}
