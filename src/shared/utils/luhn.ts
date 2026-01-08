/**
 * @fileoverview Luhn algorithm implementation for credit card validation
 * @module utils/luhn
 * 
 * The Luhn algorithm (mod 10) is used to validate credit card numbers,
 * IMEI numbers, and other identification sequences.
 */

/**
 * Validate a number string using the Luhn algorithm.
 * 
 * @param value - Numeric string to validate (spaces/dashes allowed)
 * @returns true if the string passes Luhn validation
 * 
 * @example
 * luhnValidate('4532015112830366') // true (valid test card)
 * luhnValidate('1234567890123456') // false (invalid)
 */
export function luhnValidate(value: string): boolean {
  // Remove spaces and dashes, keep only digits
  const digits = value.replace(/[\s-]/g, '');

  // Must be all digits
  if (!/^\d+$/.test(digits)) {
    return false;
  }

  // Typical card number length check
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]!, 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Extract potential credit card numbers from text.
 * Returns candidates that pass Luhn validation.
 * 
 * @param text - Input text to search
 * @returns Array of valid card number matches with positions
 */
export function extractCreditCards(
  text: string
): Array<{ value: string; start: number; end: number; issuer: string }> {
  const results: Array<{ value: string; start: number; end: number; issuer: string }> = [];

  // Match potential card numbers (13-19 digits, with optional spaces/dashes)
  // Covers formats: 4532015112830366, 4532-0151-1283-0366, 4532 0151 1283 0366
  const cardPattern = /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}|\d{13,19})\b/g;
  let match: RegExpExecArray | null;

  while ((match = cardPattern.exec(text)) !== null) {
    const candidate = match[1]!;
    const normalized = candidate.replace(/[\s-]/g, '');

    if (luhnValidate(normalized)) {
      results.push({
        value: candidate,
        start: match.index,
        end: match.index + candidate.length,
        issuer: identifyCardIssuer(normalized),
      });
    }
  }

  return results;
}

/**
 * Identify card issuer based on IIN (Issuer Identification Number).
 * Uses first 1-6 digits to determine the card network.
 * 
 * @param cardNumber - Normalized card number (digits only)
 * @returns Card network name or 'unknown'
 */
export function identifyCardIssuer(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');

  // Visa: starts with 4
  if (/^4/.test(digits)) {
    return 'visa';
  }

  // Mastercard: 51-55 or 2221-2720
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) {
    return 'mastercard';
  }

  // Amex: 34 or 37
  if (/^3[47]/.test(digits)) {
    return 'amex';
  }

  // Discover: 6011, 644-649, 65
  if (/^(6011|64[4-9]|65)/.test(digits)) {
    return 'discover';
  }

  // Diners Club: 300-305, 36, 38
  if (/^(30[0-5]|36|38)/.test(digits)) {
    return 'diners';
  }

  // JCB: 3528-3589
  if (/^35(2[89]|[3-8]\d)/.test(digits)) {
    return 'jcb';
  }

  // UnionPay: 62
  if (/^62/.test(digits)) {
    return 'unionpay';
  }

  return 'unknown';
}

/**
 * Check if a string looks like a credit card number.
 * Quick pre-filter before full Luhn validation.
 * 
 * @param text - Text to check
 * @returns true if text matches card number pattern
 */
export function looksLikeCreditCard(text: string): boolean {
  const normalized = text.replace(/[\s-]/g, '');
  return /^\d{13,19}$/.test(normalized);
}

/**
 * Mask a credit card number for safe display.
 * Shows first 4 and last 4 digits.
 * 
 * @param cardNumber - Card number to mask
 * @returns Masked string like "4532****0366"
 */
export function maskCreditCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 8) {
    return '*'.repeat(digits.length);
  }
  return `${digits.slice(0, 4)}${'*'.repeat(digits.length - 8)}${digits.slice(-4)}`;
}
