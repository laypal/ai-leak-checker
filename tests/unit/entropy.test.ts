/**
 * @fileoverview Unit tests for entropy calculation
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEntropy,
  calculateSlidingEntropy,
  findHighEntropyRegions,
  hasHighEntropy,
} from '@/shared/utils/entropy';

describe('calculateEntropy', () => {
  it('returns 0 for empty string', () => {
    expect(calculateEntropy('')).toBe(0);
  });

  it('returns 0 for single character repeated', () => {
    expect(calculateEntropy('aaaa')).toBe(0);
    expect(calculateEntropy('ZZZZZZZZZZ')).toBe(0);
  });

  it('returns 1 for two equally distributed characters', () => {
    expect(calculateEntropy('ab')).toBe(1);
    expect(calculateEntropy('abab')).toBe(1);
    expect(calculateEntropy('aabb')).toBe(1);
  });

  it('returns higher entropy for more random strings', () => {
    const lowEntropy = calculateEntropy('aaabbbccc');
    const highEntropy = calculateEntropy('aB3$kL9@mN2!pQ5');
    expect(highEntropy).toBeGreaterThan(lowEntropy);
  });

  it('handles typical API key entropy', () => {
    // OpenAI-style key should have high entropy
    const apiKey = 'sk-abc123DEF456ghi789JKL012mno345PQR';
    const entropy = calculateEntropy(apiKey);
    expect(entropy).toBeGreaterThan(4.0);
  });

  it('handles normal text with low entropy', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const entropy = calculateEntropy(text);
    expect(entropy).toBeLessThan(4.5);
  });
});

describe('calculateSlidingEntropy', () => {
  it('returns single result for short text', () => {
    const results = calculateSlidingEntropy('short', 20);
    expect(results).toHaveLength(1);
    expect(results[0]?.start).toBe(0);
    expect(results[0]?.end).toBe(5);
  });

  it('returns multiple windows for long text', () => {
    const text = 'a'.repeat(30);
    const results = calculateSlidingEntropy(text, 20);
    expect(results.length).toBe(11); // 30 - 20 + 1
  });

  it('identifies high entropy regions', () => {
    const text = 'normal text ' + 'aB3$kL9@mN2!pQ5xyz' + ' more text';
    const results = calculateSlidingEntropy(text, 10);
    
    // Find the highest entropy window
    const maxEntropy = Math.max(...results.map(r => r.entropy));
    expect(maxEntropy).toBeGreaterThan(3.0);
  });
});

describe('findHighEntropyRegions', () => {
  it('returns empty array for low entropy text', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    const regions = findHighEntropyRegions(text);
    expect(regions).toHaveLength(0);
  });

  it('finds API key in text', () => {
    const apiKey = 'sk_test_abcdefghijklmnopqrstuvwxyz123456';
    const text = `My API key is ${apiKey} please help`;
    const regions = findHighEntropyRegions(text, 3.5, 16);
    
    expect(regions.length).toBeGreaterThanOrEqual(1);
    const found = regions.some(r => r.value.includes('sk_test'));
    expect(found).toBe(true);
  });

  it('respects minimum length', () => {
    const text = 'short aB3$ but long enough aB3$kL9@mN2!pQ5xyz123';
    const regions = findHighEntropyRegions(text, 3.0, 20);
    
    // Should only find the longer one
    expect(regions.every(r => r.value.length >= 20)).toBe(true);
  });

  it('respects maximum length', () => {
    const text = 'a'.repeat(200) + 'high_entropy_' + 'xYz123AbC'.repeat(5);
    const regions = findHighEntropyRegions(text, 3.0, 16, 50);
    
    // All regions should be at most 50 chars
    expect(regions.every(r => r.value.length <= 50)).toBe(true);
  });
});

describe('hasHighEntropy', () => {
  it('returns false for short strings', () => {
    expect(hasHighEntropy('short')).toBe(false);
    expect(hasHighEntropy('12345678901')).toBe(false); // 11 chars
  });

  it('returns false for low entropy strings', () => {
    expect(hasHighEntropy('aaaaaaaaaaaaaaaa')).toBe(false);
    expect(hasHighEntropy('hello world hello world')).toBe(false);
  });

  it('returns true for high entropy strings', () => {
    expect(hasHighEntropy('sk_test_4eC39HqLyjWDarjtT1zdp7dc')).toBe(true);
    expect(hasHighEntropy('ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789')).toBe(true);
  });

  it('uses custom threshold', () => {
    const text = 'moderateEntropyText123';
    const lowThreshold = 2.0;
    const highThreshold = 4.5;
    
    expect(hasHighEntropy(text, lowThreshold)).toBe(true);
    expect(hasHighEntropy(text, highThreshold)).toBe(false);
  });
});

describe('URL exclusion in entropy detection', () => {
  it('excludes URLs with high-entropy path segments', () => {
    const url = 'https://kdp.amazon.com/en_US/help/topic/G4WB7VPPEAREHAAD';
    const regions = findHighEntropyRegions(url, 3.5, 16);
    
    // URL segments should not be detected as high-entropy secrets
    expect(regions).toHaveLength(0);
  });

  it('excludes URLs with query parameters', () => {
    const url = 'https://example.com/api/v1/users/1234567890abcdef';
    const regions = findHighEntropyRegions(url, 3.5, 16);
    
    // URL path segments should not be detected
    expect(regions).toHaveLength(0);
  });

  it('excludes localhost URLs', () => {
    const url = 'http://localhost:3000/docs/abc123xyz789def456';
    const regions = findHighEntropyRegions(url, 3.5, 16);
    
    // Localhost URL segments should not be detected
    expect(regions).toHaveLength(0);
  });

  it('still detects secrets outside of URLs', () => {
    const text = 'Check this URL: https://example.com/api/v1/users/1234567890abcdef and my API key is sk_test_4eC39HqLyjWDarjtT1zdp7dc';
    const regions = findHighEntropyRegions(text, 3.5, 16);
    
    // Should detect the API key but not the URL segment
    const hasApiKey = regions.some(r => r.value.includes('sk_test'));
    const hasUrlSegment = regions.some(r => r.value.includes('1234567890abcdef'));
    
    expect(hasApiKey).toBe(true);
    expect(hasUrlSegment).toBe(false);
  });

  it('handles URLs with fragments', () => {
    const url = 'https://example.com/page#section123xyz789';
    const regions = findHighEntropyRegions(url, 3.5, 16);
    
    // URL fragments should not be detected
    expect(regions).toHaveLength(0);
  });

  it('handles multiple URLs in text', () => {
    const text = 'Links: https://site1.com/path/ABC123XYZ and https://site2.com/api/DEF456UVW';
    const regions = findHighEntropyRegions(text, 3.5, 16);
    
    // Multiple URL segments should not be detected
    expect(regions).toHaveLength(0);
  });

  it('handles URLs in mixed content', () => {
    const text = 'Visit https://kdp.amazon.com/en_US/help/topic/G4WB7VPPEAREHAAD but keep secret abc123DEF456xyz789 safe';
    const regions = findHighEntropyRegions(text, 3.5, 16);
    
    // Should detect the standalone secret but not the URL segment
    const hasUrlSegment = regions.some(r => r.value.includes('G4WB7VPPEAREHAAD'));
    const hasStandaloneSecret = regions.some(r => r.value.includes('abc123DEF456xyz789'));
    
    expect(hasUrlSegment).toBe(false);
    expect(hasStandaloneSecret).toBe(true);
  });
});
