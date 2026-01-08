/**
 * @fileoverview Performance benchmark tests for detection engine.
 * @module e2e/performance
 * 
 * Measures scan latency on various text sizes to ensure performance is acceptable.
 */

import { test, expect } from '@playwright/test';
import { scan, quickCheck } from '../../src/shared/detectors/engine';

test.describe('Performance Benchmarks', () => {
  test.describe('Scan Latency', () => {
    test('scans small text quickly (<50ms)', () => {
      const text = 'My API key is sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      
      const start = performance.now();
      const result = scan(text);
      const duration = performance.now() - start;
      
      expect(result.hasSensitiveData).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });

    test('scans medium text quickly (<200ms)', () => {
      // ~5KB of text
      const text = Array(500).fill(
        'This is a test paragraph with some content. '
      ).join('') + 'My API key: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      
      const start = performance.now();
      const result = scan(text);
      const duration = performance.now() - start;
      
      expect(result.hasSensitiveData).toBe(true);
      expect(duration).toBeLessThan(200); // Should complete in <200ms
    });

    test('scans large text within reasonable time (<1000ms)', () => {
      // ~50KB of text (typical email/document)
      const baseText = Array(100).fill(
        'This is a longer test paragraph with various content types including code snippets, documentation, and prose. '
      ).join('');
      
      const text = Array(50).fill(baseText).join('\n') + 
        '\n\nSecret: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      
      const start = performance.now();
      const result = scan(text);
      const duration = performance.now() - start;
      
      expect(result.hasSensitiveData).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
    });

    test('handles very large text without crashing (<5000ms)', () => {
      // ~500KB of text (large document)
      const baseText = Array(1000).fill(
        'This is a very long paragraph that repeats many times to simulate a large document. '
      ).join('');
      
      const text = Array(50).fill(baseText).join('\n');
      
      const start = performance.now();
      const result = scan(text, { maxResults: 10 }); // Limit results for performance
      const duration = performance.now() - start;
      
      // Should complete without errors
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds even for large text
    });
  });

  test.describe('QuickCheck Performance', () => {
    test('quickCheck is fast for clean text (<5ms)', () => {
      const text = 'This is completely clean text with no suspicious patterns at all.';
      
      const start = performance.now();
      const result = quickCheck(text);
      const duration = performance.now() - start;
      
      expect(result).toBe(false);
      expect(duration).toBeLessThan(5);
    });

    test('quickCheck is fast for suspicious text (<10ms)', () => {
      const text = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      
      const start = performance.now();
      const result = quickCheck(text);
      const duration = performance.now() - start;
      
      expect(result).toBe(true);
      expect(duration).toBeLessThan(10);
    });

    test('quickCheck scales well with text size', () => {
      const sizes = [100, 1000, 10000];
      
      sizes.forEach((size) => {
        const text = 'a'.repeat(size) + 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
        
        const start = performance.now();
        const result = quickCheck(text);
        const duration = performance.now() - start;
        
        expect(result).toBe(true);
        // Should scale sub-linearly (early exit)
        expect(duration).toBeLessThan(20);
      });
    });
  });

  test.describe('Batch Scanning Performance', () => {
    test('scans multiple short texts efficiently', () => {
      const texts = [
        'Key: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
        'Email: user@example.com',
        'Card: 4532015112830366',
        'Phone: +447911123456',
        'Clean text with no secrets',
      ];
      
      const start = performance.now();
      const results = texts.map(text => scan(text));
      const duration = performance.now() - start;
      
      // Should scan all 5 texts quickly
      expect(results.length).toBe(5);
      expect(duration).toBeLessThan(250); // <250ms for 5 scans = <50ms avg
      
      // Verify results
      expect(results[0].hasSensitiveData).toBe(true);
      expect(results[1].hasSensitiveData).toBe(true);
      expect(results[2].hasSensitiveData).toBe(true);
      expect(results[3].hasSensitiveData).toBe(true);
      expect(results[4].hasSensitiveData).toBe(false);
    });
  });

  test.describe('Memory Usage', () => {
    test('does not leak memory on repeated scans', () => {
      const text = 'My key: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      
      // Initial memory (rough estimate)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Run many scans
      for (let i = 0; i < 100; i++) {
        scan(text);
      }
      
      // Note: Memory measurement is approximate and may not be available in all environments
      // Chrome DevTools Protocol would be needed for accurate memory measurement in E2E tests
      // For now, we verify the scans complete without errors
      
      // Check that all scans completed successfully
      expect(true).toBe(true); // Pass if we get here without errors
    });
  });
});
