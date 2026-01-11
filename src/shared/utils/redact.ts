/**
 * @fileoverview Redaction utilities for masking sensitive data
 * @module utils/redact
 * 
 * Provides functions to replace sensitive data with masked versions
 * before sending to AI services.
 */

import { type Finding, type RedactionStyle, DetectorType } from '@/shared/types';
import { maskCreditCard } from './luhn';

/**
 * Redaction markers by type.
 */
const REDACTION_MARKERS: Record<DetectorType, string> = {
  [DetectorType.API_KEY_OPENAI]: '[REDACTED_OPENAI_KEY]',
  [DetectorType.API_KEY_AWS]: '[REDACTED_AWS_KEY]',
  [DetectorType.API_KEY_GITHUB]: '[REDACTED_GITHUB_TOKEN]',
  [DetectorType.API_KEY_STRIPE]: '[REDACTED_STRIPE_KEY]',
  [DetectorType.API_KEY_SLACK]: '[REDACTED_SLACK_TOKEN]',
  [DetectorType.API_KEY_GOOGLE]: '[REDACTED_GOOGLE_KEY]',
  [DetectorType.API_KEY_ANTHROPIC]: '[REDACTED_ANTHROPIC_KEY]',
  [DetectorType.API_KEY_SENDGRID]: '[REDACTED_SENDGRID_KEY]',
  [DetectorType.API_KEY_TWILIO]: '[REDACTED_TWILIO_KEY]',
  [DetectorType.API_KEY_MAILCHIMP]: '[REDACTED_MAILCHIMP_KEY]',
  [DetectorType.API_KEY_HEROKU]: '[REDACTED_HEROKU_KEY]',
  [DetectorType.API_KEY_NPM]: '[REDACTED_NPM_TOKEN]',
  [DetectorType.API_KEY_PYPI]: '[REDACTED_PYPI_TOKEN]',
  [DetectorType.API_KEY_DOCKER]: '[REDACTED_DOCKER_TOKEN]',
  [DetectorType.API_KEY_SUPABASE]: '[REDACTED_SUPABASE_KEY]',
  [DetectorType.API_KEY_FIREBASE]: '[REDACTED_FIREBASE_KEY]',
  [DetectorType.API_KEY_GENERIC]: '[REDACTED_API_KEY]',
  [DetectorType.PRIVATE_KEY]: '[REDACTED_PRIVATE_KEY]',
  [DetectorType.PASSWORD]: '[REDACTED_PASSWORD]',
  [DetectorType.CREDIT_CARD]: '[REDACTED_CARD]',
  [DetectorType.EMAIL]: '[REDACTED_EMAIL]',
  [DetectorType.PHONE_UK]: '[REDACTED_PHONE]',
  [DetectorType.UK_NI_NUMBER]: '[REDACTED_NI_NUMBER]',
  [DetectorType.US_SSN]: '[REDACTED_SSN]',
  [DetectorType.IBAN]: '[REDACTED_IBAN]',
  [DetectorType.HIGH_ENTROPY]: '[REDACTED_SECRET]',
};

/**
 * Redact all findings from text.
 * Replaces sensitive data with type-specific markers.
 * 
 * @param text - Original text
 * @param findings - Array of findings to redact
 * @param style - Redaction style (default: 'marker')
 * @returns Text with findings replaced by redaction markers
 * 
 * @example
 * redact('key: sk-abc123...', findings) // 'key: [REDACTED_OPENAI_KEY]'
 */
export function redact(
  text: string,
  findings: Finding[],
  style: RedactionStyle = 'marker'
): string {
  if (findings.length === 0) {
    return text;
  }

  // Sort findings by start position (descending) to replace from end
  // This preserves positions as we modify the string
  const sorted = [...findings].sort((a, b) => b.start - a.start);

  let result = text;

  for (const finding of sorted) {
    const replacement = getRedactionText(finding, style);
    result = result.slice(0, finding.start) + replacement + result.slice(finding.end);
  }

  return result;
}

/**
 * Get the replacement text for a finding based on redaction style.
 */
function getRedactionText(finding: Finding, style: RedactionStyle): string {
  switch (style) {
    case 'marker':
      return REDACTION_MARKERS[finding.type] ?? '[REDACTED]';

    case 'mask':
      return mask(finding.value, finding.type);

    case 'remove':
      return '';

    case 'hash':
      // Simple hash representation (not cryptographically secure)
      return `[${finding.type.toUpperCase()}:${hashValue(finding.value).slice(0, 8)}]`;

    default:
      return REDACTION_MARKERS[finding.type] ?? '[REDACTED]';
  }
}

/**
 * Mask a value while preserving some structure.
 * Shows type-appropriate partial content.
 * 
 * @param value - Value to mask
 * @param type - Detector type for context-aware masking
 * @returns Masked string
 * 
 * @example
 * mask('sk-abc123XYZ', 'api_key_openai') // 'sk-ab****YZ'
 * mask('user@example.com', 'email') // 'us***@***.com'
 */
export function mask(value: string, type: DetectorType): string {
  switch (type) {
    case DetectorType.EMAIL:
      return maskEmail(value);

    case DetectorType.CREDIT_CARD:
      return maskCreditCard(value);

    case DetectorType.PHONE_UK:
      return maskPhone(value);

    case DetectorType.UK_NI_NUMBER:
    case DetectorType.US_SSN:
      return maskNationalId(value);

    case DetectorType.IBAN:
      return maskIBAN(value);

    case DetectorType.PRIVATE_KEY:
      return '[PRIVATE_KEY]';

    default:
      return maskGeneric(value);
  }
}

/**
 * Mask an email address.
 * Preserves first 2 chars of local part and domain TLD.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***@***.***';
  }

  const maskedLocal = local.length > 2
    ? local.slice(0, 2) + '***'
    : '***';

  const parts = domain.split('.');
  const tld = parts.pop() ?? '***';
  const maskedDomain = '***.' + tld;

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask a phone number.
 * Shows only last 4 digits.
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '*'.repeat(digits.length);
  }
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Mask a national ID (NI number, SSN).
 * Shows only last 2 characters.
 */
function maskNationalId(id: string): string {
  const clean = id.replace(/\s/g, '');
  if (clean.length < 3) {
    return '*'.repeat(clean.length);
  }
  return '*'.repeat(clean.length - 2) + clean.slice(-2);
}

/**
 * Mask an IBAN.
 * Shows country code and last 4 characters.
 */
function maskIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  if (clean.length < 6) {
    return '*'.repeat(clean.length);
  }
  return clean.slice(0, 2) + '*'.repeat(clean.length - 6) + clean.slice(-4);
}

/**
 * Generic masking for API keys and tokens.
 * Shows prefix and last 4 characters.
 */
function maskGeneric(value: string): string {
  if (value.length < 8) {
    return '*'.repeat(value.length);
  }

  // Try to detect prefix (like sk-, ghp_, etc.)
  const prefixMatch = value.match(/^([a-zA-Z]{2,4}[-_])/);
  if (prefixMatch?.[1]) {
    const prefix = prefixMatch[1];
    const rest = value.slice(prefix.length);
    return prefix + '*'.repeat(Math.max(0, rest.length - 4)) + rest.slice(-4);
  }

  // No prefix - show first 4 and last 4
  return value.slice(0, 4) + '*'.repeat(Math.max(0, value.length - 8)) + value.slice(-4);
}

/**
 * Simple string hash for redaction markers.
 * Not cryptographically secure - just for display purposes.
 */
function hashValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Create a redaction map for reversible redactions.
 * Maps redaction markers to original values.
 * WARNING: Do not persist this map - it contains sensitive data.
 * 
 * @param text - Original text
 * @param findings - Findings to create map for
 * @returns Map from marker to original value
 */
export function createRedactionMap(
  text: string,
  findings: Finding[]
): Map<string, string> {
  const map = new Map<string, string>();
  
  for (const finding of findings) {
    const marker = REDACTION_MARKERS[finding.type] ?? '[REDACTED]';
    map.set(marker, finding.value);
  }
  
  return map;
}
