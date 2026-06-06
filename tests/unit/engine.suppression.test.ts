/**
 * @fileoverview Engine-level tests for built-in placeholder/example suppression
 *
 * Verifies that the scan engine drops well-known non-secret values across all
 * detector types when run at the most aggressive (high) sensitivity.
 */

import { describe, it, expect } from 'vitest';
import { scan } from '@/shared/detectors/engine';

const HIGH = { sensitivityLevel: 'high' as const };

describe('engine suppresses placeholder secrets', () => {
  it('suppresses documentation placeholders', () => {
    expect(scan('your_api_key_here', HIGH).hasSensitiveData).toBe(false);
    expect(scan('sk-placeholder-for-documentation', HIGH).hasSensitiveData).toBe(false);
    expect(scan('REPLACE_WITH_YOUR_TOKEN', HIGH).hasSensitiveData).toBe(false);
  });

  it('suppresses redacted (xxxx) placeholder keys', () => {
    expect(scan('AKIAXXXXXXXXXXXXXXXX', HIGH).hasSensitiveData).toBe(false);
    expect(scan('pk_test_XXXXXXXXXXXXXXXXXXXXXXXX', HIGH).hasSensitiveData).toBe(false);
  });

  it('suppresses example email addresses', () => {
    expect(scan('user@example.com', HIGH).hasSensitiveData).toBe(false);
    expect(scan('first.last@sample.net', HIGH).hasSensitiveData).toBe(false);
  });

  it('suppresses structured product codes', () => {
    expect(scan('SERIAL-MNO345-PQR678', HIGH).hasSensitiveData).toBe(false);
    expect(scan('CODE-12345-67890', HIGH).hasSensitiveData).toBe(false);
  });

  it('suppresses process.env code references', () => {
    expect(scan("process.env.API_KEY || 'default-key'", HIGH).hasSensitiveData).toBe(false);
    expect(scan("const secret = process.env.SECRET || 'x';", HIGH).hasSensitiveData).toBe(false);
  });

  it('still detects a real-looking secret', () => {
    const text = 'api_key = aB3kL9mN2pQ5rT8wX1zY4uI7oP0sD6fG';
    expect(scan(text, HIGH).hasSensitiveData).toBe(true);
  });

  it('still detects a real email address', () => {
    expect(scan('contact jane@anthropic.com', HIGH).hasSensitiveData).toBe(true);
  });
});
