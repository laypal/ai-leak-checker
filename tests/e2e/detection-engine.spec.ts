/**
 * @fileoverview E2E tests for detection engine functionality.
 * @module e2e/detection-engine
 * 
 * Tests detection engine behavior with various input types.
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scan, quickCheck } from '../../src/shared/detectors/engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const apiKeysFixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/api_keys.json'), 'utf-8')
);
const falsePositivesFixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/false_positives.json'), 'utf-8')
);

test.describe('Detection Engine E2E', () => {
  test.describe('API Key Detection', () => {
    test('detects OpenAI API keys', () => {
      const testKeys = apiKeysFixture.patterns.openai.validSamples as string[];
      
      testKeys.forEach((key) => {
        const text = `My API key is ${key}`;
        const result = scan(text);
        
        expect(result.hasSensitiveData).toBe(true);
        expect(result.findings.length).toBeGreaterThan(0);
        expect(result.findings.some(f => f.type === 'api_key_openai')).toBe(true);
      });
    });

    test('detects AWS access keys', () => {
      const testKeys = apiKeysFixture.patterns.aws.validSamples as string[];
      
      testKeys.forEach((key) => {
        const text = `AWS_KEY=${key}`;
        const result = scan(text);
        
        expect(result.hasSensitiveData).toBe(true);
        expect(result.findings.some(f => f.type === 'api_key_aws')).toBe(true);
      });
    });

    test('detects GitHub tokens', () => {
      const testKeys = apiKeysFixture.patterns.github.validSamples as string[];
      
      testKeys.forEach((key) => {
        const text = `github_token: ${key}`;
        const result = scan(text);
        
        expect(result.hasSensitiveData).toBe(true);
        expect(result.findings.length).toBeGreaterThan(0);
      });
    });
  });

  test.describe('PII Detection', () => {
    test('detects email addresses', () => {
      // Use emails that won't be filtered as generic (not "test", "admin", "example", etc.)
      const emails = [
        'john.doe@gmail.com',  // Personal email provider
        'sarah.smith@yahoo.co.uk',  // Personal with +tag
        'mike.jones@hotmail.com',  // Personal email
      ];

      emails.forEach((email) => {
        const text = `Contact me at ${email}`;
        const result = scan(text);
        
        expect(result.hasSensitiveData).toBe(true);
        expect(result.findings.some(f => f.type === 'email')).toBe(true);
      });
    });

    test('detects credit card numbers', () => {
      // Valid Luhn-checked cards
      const cards = [
        '4532015112830366', // Visa
        '5555555555554444', // Mastercard
        '371449635398431',  // Amex
      ];

      cards.forEach((card) => {
        const text = `Card: ${card}`;
        const result = scan(text);
        
        expect(result.hasSensitiveData).toBe(true);
        expect(result.findings.some(f => f.type === 'credit_card')).toBe(true);
      });
    });

    test('detects UK phone numbers', () => {
      // Use phone formats that match the detector patterns
      const phones = [
        '+447911123456',  // International mobile format
        '07911123456',    // Local mobile format
        '02079460958',    // London landline (without spaces)
      ];

      phones.forEach((phone) => {
        const text = `Call me: ${phone}`;
        const result = scan(text);
        
        expect(result.hasSensitiveData).toBe(true);
        expect(result.findings.some(f => f.type === 'phone_uk')).toBe(true);
      });
    });
  });

  test.describe('Quick Check Performance', () => {
    test('quickCheck returns true for suspicious text quickly', () => {
      const start = performance.now();
      const result = quickCheck('sk-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz');
      const duration = performance.now() - start;
      
      expect(result).toBe(true);
      expect(duration).toBeLessThan(10); // Should be very fast (<10ms)
    });

    test('quickCheck returns false for clean text quickly', () => {
      const start = performance.now();
      const result = quickCheck('Hello, this is just regular text with no secrets.');
      const duration = performance.now() - start;
      
      expect(result).toBe(false);
      expect(duration).toBeLessThan(10);
    });
  });
});
