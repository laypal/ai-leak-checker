/**
 * @fileoverview Unit tests for placeholder / example value classifiers
 */

import { describe, it, expect } from 'vitest';
import {
  isPlaceholderSecret,
  isExampleEmail,
  isProductCode,
} from '@/shared/utils/placeholders';

describe('isPlaceholderSecret', () => {
  it('flags "your_..." / "your-..." placeholders', () => {
    expect(isPlaceholderSecret('your_api_key_here')).toBe(true);
    expect(isPlaceholderSecret('your-key-here')).toBe(true);
    expect(isPlaceholderSecret('your-secret-here')).toBe(true);
  });

  it('flags REPLACE / CHANGEME style placeholders', () => {
    expect(isPlaceholderSecret('REPLACE_ME')).toBe(true);
    expect(isPlaceholderSecret('REPLACE_WITH_YOUR_TOKEN')).toBe(true);
    expect(isPlaceholderSecret('changeme123')).toBe(true);
  });

  it('flags documentation placeholders', () => {
    expect(isPlaceholderSecret('placeholder-token')).toBe(true);
    expect(isPlaceholderSecret('placeholder-key-123')).toBe(true);
    expect(isPlaceholderSecret('sk-placeholder-for-documentation')).toBe(true);
  });

  it('flags demo / sample / mock dev values', () => {
    expect(isPlaceholderSecret('sk-demo-1234567890abcdef')).toBe(true);
    expect(isPlaceholderSecret('mock123data456sample789code012')).toBe(true);
    expect(isPlaceholderSecret('placeholder123data456value789')).toBe(true);
  });

  it('flags runs of x/X redaction characters', () => {
    expect(isPlaceholderSecret('AKIAXXXXXXXXXXXXXXXX')).toBe(true);
    expect(isPlaceholderSecret('pk_test_XXXXXXXXXXXXXXXXXXXXXXXX')).toBe(true);
    expect(isPlaceholderSecret('sk-xxxxxxxxxxxxxxxxxxxx')).toBe(true);
  });

  it('flags temp / random dev-named values', () => {
    expect(isPlaceholderSecret('temp123temp456temp789temp012')).toBe(true);
    expect(isPlaceholderSecret('random123string456test789data012')).toBe(true);
    expect(isPlaceholderSecret('randomString123456')).toBe(true);
  });

  it('does NOT flag realistic random secrets', () => {
    expect(isPlaceholderSecret('4eC39HqLyjWDarjtT1zdp7dcGHIJKLmnop')).toBe(false);
    expect(isPlaceholderSecret('ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789')).toBe(false);
    expect(isPlaceholderSecret('aB3kL9mN2pQ5rT8wX1zY4uI7oP0sD6fG')).toBe(false);
  });

  it('does NOT flag a long secret that coincidentally contains a weak dev word', () => {
    // "demo" appears by chance inside a long high-entropy token -> must NOT suppress
    const longToken = 'aB3kL9demoN2pQ5rT8wX1zY4uI7oP0sD6fGhJ2kL9mN3pQ6';
    expect(longToken.length).toBeGreaterThan(40);
    expect(isPlaceholderSecret(longToken)).toBe(false);
  });

  it('does NOT flag short empty-ish input', () => {
    expect(isPlaceholderSecret('')).toBe(false);
    expect(isPlaceholderSecret('abc')).toBe(false);
  });
});

describe('isExampleEmail', () => {
  it('flags RFC 2606 reserved example domains', () => {
    expect(isExampleEmail('user@example.com')).toBe(true);
    expect(isExampleEmail('a.b@example.org')).toBe(true);
    expect(isExampleEmail('c@example.net')).toBe(true);
  });

  it('flags common placeholder/test domains used in docs', () => {
    expect(isExampleEmail('user@test.org')).toBe(true);
    expect(isExampleEmail('first.last@sample.net')).toBe(true);
  });

  it('does NOT flag real email domains', () => {
    expect(isExampleEmail('person@gmail.com')).toBe(false);
    expect(isExampleEmail('jane@anthropic.com')).toBe(false);
    expect(isExampleEmail('ops@company.co.uk')).toBe(false);
  });

  it('returns false for non-emails', () => {
    expect(isExampleEmail('not-an-email')).toBe(false);
  });
});

describe('isProductCode', () => {
  it('flags uppercase hyphen-segmented product codes', () => {
    expect(isProductCode('CODE-12345-67890')).toBe(true);
    expect(isProductCode('SERIAL-MNO345-PQR678')).toBe(true);
    expect(isProductCode('VERSION-EFG123-HIJ456')).toBe(true);
  });

  it('does NOT flag mixed-case secrets or single-segment tokens', () => {
    expect(isProductCode('sk_test_4eC39HqLyjWDarjtT1zdp7dc')).toBe(false);
    expect(isProductCode('AKIAIOSFODNN7EXAMPLE')).toBe(false); // no hyphen segments
    expect(isProductCode('ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ')).toBe(false);
  });
});
