/**
 * @file csv.test.ts
 * @description Tests for RFC 4180 CSV escaping helpers.
 */

import { describe, test, expect } from 'vitest';
import { escapeCsvField, rowsToCsv } from '@/shared/utils/csv';

describe('escapeCsvField', () => {
  test('passes plain values through unchanged', () => {
    expect(escapeCsvField('plain')).toBe('plain');
  });

  test('quotes fields containing a comma', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });

  test('quotes and doubles embedded quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  test('quotes fields containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  test('quotes fields containing a carriage return', () => {
    expect(escapeCsvField('a\rb')).toBe('"a\rb"');
  });
});

describe('rowsToCsv', () => {
  test('joins escaped rows with newlines', () => {
    expect(rowsToCsv([['a', 'b'], ['c,d', 'e']])).toBe('a,b\n"c,d",e');
  });
});
