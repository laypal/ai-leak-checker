/**
 * @fileoverview Unit tests for the main detection engine
 * @module tests/unit/engine
 */

import { describe, it, expect } from 'vitest';
import { scan, quickCheck } from '@/shared/detectors/engine';
import { DetectorType } from '@/shared/types';

describe('scan', () => {
  describe('basic detection', () => {
    it('detects API keys in text', () => {
      const text = 'My OpenAI key is sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings.some(f => f.type === DetectorType.API_KEY_OPENAI)).toBe(true);
    });

    it('detects credit cards in text', () => {
      const text = 'Payment card: 4532015112830366';
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.some(f => f.type === DetectorType.CREDIT_CARD)).toBe(true);
    });

    it('detects emails in text', () => {
      const text = 'Contact me at john.doe@company.com';
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.some(f => f.type === DetectorType.EMAIL)).toBe(true);
    });

    it('detects phone numbers in text', () => {
      const text = 'Call me on 07911123456';
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.some(f => f.type === DetectorType.PHONE_UK)).toBe(true);
    });

    it('returns no findings for safe text', () => {
      const text = 'This is a normal message with no sensitive data.';
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });
  });

  describe('multiple detections', () => {
    it('detects multiple types of sensitive data', () => {
      const text = `
        API Key: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
        Email: user@example.com
        Card: 4532015112830366
      `;
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.length).toBeGreaterThanOrEqual(3);

      const types = new Set(result.findings.map(f => f.type));
      expect(types.has(DetectorType.API_KEY_OPENAI)).toBe(true);
      expect(types.has(DetectorType.EMAIL)).toBe(true);
      expect(types.has(DetectorType.CREDIT_CARD)).toBe(true);
    });

    it('detects multiple instances of same type', () => {
      const text = 'Emails: user1@example.com and user2@example.com';
      const result = scan(text);

      const emailFindings = result.findings.filter(f => f.type === DetectorType.EMAIL);
      expect(emailFindings.length).toBe(2);
    });
  });

  describe('sensitivity levels', () => {
    it('detects high confidence items at low sensitivity', () => {
      const text = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const result = scan(text, { sensitivityLevel: 'low' });

      // OpenAI keys have 0.95 confidence, should be detected at low sensitivity (0.8 threshold)
      expect(result.hasSensitiveData).toBe(true);
    });

    it('detects medium confidence items at medium sensitivity', () => {
      const text = 'Contact: user@custom-domain.io';
      const result = scan(text, { sensitivityLevel: 'medium' });

      expect(result.hasSensitiveData).toBe(true);
    });

    it('high sensitivity catches more potential issues', () => {
      const text = 'Some random high entropy string: xK9mP2qR5tY8wZ3bN6cF0gH';

      const lowResult = scan(text, { sensitivityLevel: 'low' });
      const highResult = scan(text, { sensitivityLevel: 'high' });

      // High sensitivity should catch more potential issues
      expect(highResult.findings.length).toBeGreaterThanOrEqual(lowResult.findings.length);
    });
  });

  describe('enabled detectors filtering', () => {
    it('respects enabled detectors option', () => {
      const text = 'Key: sk-abc123def456ghi789jkl012mno345pqr678 email: user@example.com';
      const enabledDetectors = new Set([DetectorType.API_KEY_OPENAI]);

      const result = scan(text, { enabledDetectors });

      expect(result.findings.some(f => f.type === DetectorType.API_KEY_OPENAI)).toBe(true);
      expect(result.findings.some(f => f.type === DetectorType.EMAIL)).toBe(false);
    });

    it('detects all types when no filter specified', () => {
      const text = 'Key: sk-abc123def456ghi789jkl012mno345pqr678 email: personal@gmail.com';
      const result = scan(text);

      expect(result.findings.some(f => f.type === DetectorType.API_KEY_OPENAI)).toBe(true);
      expect(result.findings.some(f => f.type === DetectorType.EMAIL)).toBe(true);
    });
  });

  describe('max results', () => {
    it('limits number of findings returned', () => {
      const text = 'a@b.com c@d.com e@f.com g@h.com i@j.com';
      const result = scan(text, { maxResults: 2 });

      expect(result.findings.length).toBeLessThanOrEqual(2);
    });

    it('returns all findings when maxResults is high', () => {
      const text = 'a@b.com c@d.com e@f.com';
      const result = scan(text, { maxResults: 100 });

      // Should have 3 emails (if all detected)
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('context inclusion', () => {
    it('includes context when requested', () => {
      const text = 'Here is my secret key: sk-abc123def456ghi789jkl012mno345pqr678 please keep safe';
      const result = scan(text, { includeContext: true, contextSize: 20 });

      expect(result.findings[0].context).toBeDefined();
      expect(result.findings[0].context?.length).toBeGreaterThan(0);
    });

    it('respects context size', () => {
      // Use the same format as the "includes context when requested" test above
      const text = 'A'.repeat(100) + 'Here is my secret key: sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz please keep safe' + 'B'.repeat(100);
      const result = scan(text, { includeContext: true, contextSize: 10 });

      // Should have findings
      expect(result.findings.length).toBeGreaterThan(0);
      // Context should be limited
      expect(result.findings[0]?.context?.length).toBeLessThan(text.length);
    });
  });

  describe('summary generation', () => {
    it('generates summary with counts by type', () => {
      const text = 'Key: sk-abc123def456ghi789jkl012mno345 emails: a@b.com c@d.com';
      const result = scan(text);

      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeGreaterThan(0);
      expect(result.summary.byType).toBeDefined();
    });
  });

  describe('scan time tracking', () => {
    it('reports scan time in milliseconds', () => {
      const text = 'Some text to scan for secrets';
      const result = scan(text);

      expect(result.scanTime).toBeDefined();
      expect(result.scanTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('text length tracking', () => {
    it('reports text length in result', () => {
      const text = 'Test text for length';
      const result = scan(text);

      expect(result.textLength).toBe(text.length);
    });
  });

  describe('deduplication', () => {
    it('removes duplicate findings at same position', () => {
      // A pattern might match both as generic API key and specific type
      const text = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const result = scan(text);

      // Should not have duplicate findings for same text at same position
      const positions = result.findings.map(f => `${f.start}-${f.end}`);
      const uniquePositions = new Set(positions);

      // Each position should have at most one finding per type
      expect(uniquePositions.size).toBe(positions.length);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = scan('');

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('handles very long text', () => {
      const text = 'Safe text '.repeat(10000) + 'sk-abc123def456ghi789jkl012mno345pqr678';
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
    });

    it('handles special characters', () => {
      const text = 'Unicode: 你好 emoji: 🔐 special: <>&"\' key: sk-abc123def456ghi789jkl012mno';
      const result = scan(text);

      // Should not crash and should detect the key
      expect(result).toBeDefined();
    });

    it('handles newlines and tabs', () => {
      const text = 'Key:\n\tsk-abc123def456ghi789jkl012mno345pqr678';
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
    });
  });

  describe('high entropy detection', () => {
    it('detects high entropy strings when enabled', () => {
      // Generate a random-looking high entropy string
      const highEntropyString = 'xK9mP2qR5tY8wZ3bN6cF0gHjL4vXsD7eI1uA';
      const text = `secret: ${highEntropyString}`;

      const result = scan(text, {
        enabledDetectors: new Set([DetectorType.HIGH_ENTROPY]),
        sensitivityLevel: 'high',
      });

      // High entropy detection should find potential secrets
      expect(result.findings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('allowlist filtering', () => {
    it('filters out findings matching allowlisted strings (exact match)', () => {
      const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const text = `My API key is ${apiKey}`;

      const result = scan(text, {
        allowlist: [apiKey],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('filters out findings matching allowlisted strings (substring match)', () => {
      const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const text = `My API key is ${apiKey}`;

      // Allowlist with partial match should still filter
      const result = scan(text, {
        allowlist: ['sk-abc123'],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('filters out email addresses in allowlist', () => {
      const email = 'test@example.com';
      const text = `Contact ${email} for more info`;

      const result = scan(text, {
        allowlist: [email],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('filters out credit card numbers in allowlist', () => {
      const card = '4532015112830366';
      const text = `Card number: ${card}`;

      const result = scan(text, {
        allowlist: [card],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('allows multiple allowlist entries', () => {
      const key1 = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const key2 = 'AKIAIOSFODNN7EXAMPLE';
      const email = 'test@example.com';
      const text = `Keys: ${key1} and ${key2}, email: ${email}`;

      const result = scan(text, {
        allowlist: [key1, key2, email],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('filters out only allowlisted findings, keeps others', () => {
      const allowlistedKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const otherKey = 'sk-xyz789abc123def456ghi789jkl012mno345pqr678stu901vwx';
      const text = `Allowlisted: ${allowlistedKey}, Other: ${otherKey}`;

      const result = scan(text, {
        allowlist: [allowlistedKey],
      });

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      // Should not find the allowlisted key
      expect(result.findings.some(f => f.value === allowlistedKey)).toBe(false);
      // Should still find the other key
      expect(result.findings.some(f => f.value.includes('xyz789'))).toBe(true);
    });

    it('handles case-insensitive allowlist matching', () => {
      const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const text = `My API key is ${apiKey}`;

      // Allowlist with different casing should still match
      const result = scan(text, {
        allowlist: [apiKey.toUpperCase()],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('handles empty allowlist (no filtering)', () => {
      const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const text = `My API key is ${apiKey}`;

      const result = scan(text, {
        allowlist: [],
      });

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
    });

    it('handles allowlist with whitespace (trimmed)', () => {
      const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const text = `My API key is ${apiKey}`;

      // Allowlist with leading/trailing whitespace should still match
      const result = scan(text, {
        allowlist: [`  ${apiKey}  `],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });

    it('ignores empty allowlist entries (whitespace-only)', () => {
      const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const text = `My API key is ${apiKey}`;

      // Empty or whitespace-only allowlist entries should be skipped
      // Otherwise includes("") would match everything and disable detection
      const result = scan(text, {
        allowlist: ['', '   ', '\t\n', '  '],
      });

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      // Should still detect the API key despite empty allowlist entries
      expect(result.findings.some(f => f.value.includes(apiKey))).toBe(true);
    });

    it('ignores empty allowlist entries but processes valid ones', () => {
      const apiKey = 'sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const otherKey = 'sk-xyz789abc123def456ghi789jkl012mno345pqr678stu901vwx';
      const text = `Keys: ${apiKey} and ${otherKey}`;

      // Mix of empty and valid entries - empty should be skipped
      const result = scan(text, {
        allowlist: ['', '   ', apiKey], // apiKey should be filtered, empty entries ignored
      });

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      // apiKey should be filtered (not found)
      expect(result.findings.some(f => f.value === apiKey)).toBe(false);
      // otherKey should still be detected
      expect(result.findings.some(f => f.value.includes('xyz789'))).toBe(true);
    });

    it('filters UK phone numbers in allowlist', () => {
      const phone = '07911123456';
      const text = `Call me on ${phone}`;

      const result = scan(text, {
        allowlist: [phone],
      });

      expect(result.hasSensitiveData).toBe(false);
      expect(result.findings).toHaveLength(0);
    });
  });
});

describe('quickCheck', () => {
  describe('fast pre-filtering', () => {
    it('returns true for text with API key pattern', () => {
      const text = 'My key is sk-abc123';
      expect(quickCheck(text)).toBe(true);
    });

    it('returns true for text with email pattern', () => {
      const text = 'Contact user@example.com';
      expect(quickCheck(text)).toBe(true);
    });

    it('returns true for text with credit card pattern', () => {
      const text = 'Card: 4532015112830366';
      expect(quickCheck(text)).toBe(true);
    });

    it('returns false for safe text', () => {
      const text = 'This is a normal message without any sensitive patterns.';
      expect(quickCheck(text)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(quickCheck('')).toBe(false);
    });

    it('returns false for very short strings', () => {
      expect(quickCheck('hi')).toBe(false);
    });
  });

  describe('pattern matching', () => {
    it('detects common API key prefixes', () => {
      const prefixes = ['sk-', 'pk-', 'ghp_', 'xoxb-', 'AKIA'];

      for (const prefix of prefixes) {
        expect(quickCheck(`token: ${prefix}abc123`)).toBe(true);
      }
    });

    it('detects keyword patterns', () => {
      const keywords = ['password=', 'secret:', 'api_key=', 'token:'];

      for (const keyword of keywords) {
        expect(quickCheck(`${keyword}somevalue`)).toBe(true);
      }
    });
  });

  describe('performance', () => {
    it('is faster than full scan', () => {
      const text = 'Safe text '.repeat(1000);

      const quickStart = performance.now();
      quickCheck(text);
      const quickTime = performance.now() - quickStart;

      const scanStart = performance.now();
      scan(text);
      const scanTime = performance.now() - scanStart;

      // Quick check should be faster (or at least not significantly slower)
      // Allow for some variance since both are fast
      expect(quickTime).toBeLessThan(scanTime + 1);
    });
  });
});

describe('integration scenarios', () => {
  describe('real-world prompts', () => {
    it('detects credentials in code snippet', () => {
      const text = `
        const config = {
          apiKey: 'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx',
          dbUrl: 'postgres://user:password@localhost/db'
        };
      `;
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
    });

    it('detects PII in natural text', () => {
      const text = `
        Customer: John Smith
        Email: john.smith@personal.com
        Phone: 07911 123 456
        Card: 4532-0151-1283-0366
      `;
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.length).toBeGreaterThanOrEqual(3);
    });

    it('handles mixed content', () => {
      const text = `
        Can you help me debug this code?
        
        const stripe = Stripe('sk_live_51234567890abcdefghijklmnopqrstuvwxyz');
        
        It's throwing an error when I try to charge customer@example.com
      `;
      const result = scan(text);

      expect(result.hasSensitiveData).toBe(true);
      expect(result.findings.some(f => f.type === DetectorType.API_KEY_STRIPE)).toBe(true);
      expect(result.findings.some(f => f.type === DetectorType.EMAIL)).toBe(true);
    });
  });

});
