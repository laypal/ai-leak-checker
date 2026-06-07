/**
 * @fileoverview Tests for UK phone detection not matching digits embedded in tokens
 */

import { describe, it, expect } from 'vitest';
import { scanForUKPhones } from '@/shared/detectors/pii';

describe('scanForUKPhones - token embedding', () => {
  it('does not match a digit run embedded in a longer alphanumeric token', () => {
    expect(scanForUKPhones('0123456789abcdef')).toHaveLength(0);
    expect(scanForUKPhones('0123456789abcdefghijklmnopqrstuvwxyz')).toHaveLength(0);
  });

  it('does not match digits inside a hex string', () => {
    expect(scanForUKPhones('0123456789abcdef0123456789abcdef01234567')).toHaveLength(0);
  });

  it('does not match a phone-length prefix of a long all-digit run', () => {
    expect(scanForUKPhones('0123456789012345678901234567890123456789')).toHaveLength(0);
  });

  it('still detects a standalone UK mobile number', () => {
    const findings = scanForUKPhones('Call me on 07123 456789 tomorrow');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it('still detects a standalone UK landline number', () => {
    const findings = scanForUKPhones('Office: 0207 946 0958');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});
