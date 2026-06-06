/**
 * @fileoverview Tests for credit-card extraction not matching all-numeric UUID fields
 */

import { describe, it, expect } from 'vitest';
import { extractCreditCards } from '@/shared/utils/luhn';

describe('extractCreditCards - UUID structure', () => {
  it('does not extract a card from an all-numeric UUID', () => {
    expect(extractCreditCards('11111111-2222-3333-4444-555555555555')).toHaveLength(0);
  });

  it('does not extract a card from a standard hex UUID', () => {
    expect(extractCreditCards('01234567-89ab-cdef-0123-456789abcdef')).toHaveLength(0);
  });

  it('still extracts a real (Luhn-valid) card number', () => {
    expect(extractCreditCards('card 4532015112830366 here').length).toBeGreaterThanOrEqual(1);
  });

  it('still extracts a grouped real card number', () => {
    expect(extractCreditCards('4532 0151 1283 0366').length).toBeGreaterThanOrEqual(1);
  });

  it('does not extract a 13-digit unix-ms timestamp with no card issuer', () => {
    expect(extractCreditCards('1647763200000')).toHaveLength(0);
    expect(extractCreditCards('1718451000000')).toHaveLength(0);
  });

  it('still extracts a 13-digit card with a valid issuer prefix', () => {
    // Visa 13-digit (starts with 4), Luhn-valid
    expect(extractCreditCards('4222222222222').length).toBeGreaterThanOrEqual(1);
  });
});
