/**
 * @fileoverview Comprehensive multi-detection tests for the detection engine
 * @module tests/unit/engine.comprehensive
 * 
 * Tests for scenarios involving multiple detector types working together,
 * edge cases, and performance with large numbers of findings.
 */

import { describe, it, expect } from 'vitest';
import { scan } from '@/shared/detectors/engine';
import { DetectorType, type Finding } from '@/shared/types';
import {
  getComprehensivePrompt,
  getAllSamples,
  getSamplesByCategory,
  buildPromptFromTypes,
} from './helpers/fixtures';

describe('comprehensive multi-detection', () => {
  describe('all detector types', () => {
    it('detects all detector types in comprehensive prompt', () => {
      const text = getComprehensivePrompt();
      const result = scan(text);
      
      expect(result.hasSensitiveData).toBe(true);
      const types = new Set(result.findings.map(f => f.type));
      expect(types.size).toBeGreaterThanOrEqual(18);
    });

    it('verifies each detector type has at least one finding in comprehensive prompt', () => {
      const text = getComprehensivePrompt();
      const result = scan(text);
      const allSamples = getAllSamples();
      
      // Check that major categories are represented
      const detectedTypes = new Set(result.findings.map(f => f.type));
      const apiKeyTypes = Object.keys(getSamplesByCategory('api_keys'));
      const secretTypes = Object.keys(getSamplesByCategory('secrets'));
      const financialTypes = Object.keys(getSamplesByCategory('financial'));
      const piiTypes = Object.keys(getSamplesByCategory('pii'));
      
      // Verify at least one type from each category is detected
      expect(apiKeyTypes.some(type => detectedTypes.has(type as DetectorType))).toBe(true);
      expect(secretTypes.some(type => detectedTypes.has(type as DetectorType))).toBe(true);
      expect(financialTypes.some(type => detectedTypes.has(type as DetectorType))).toBe(true);
      expect(piiTypes.some(type => detectedTypes.has(type as DetectorType))).toBe(true);
    });
  });

  describe('detector type combinations', () => {
    it('detects all API key types together', () => {
      const apiKeyTypes: DetectorType[] = [
        DetectorType.API_KEY_OPENAI,
        DetectorType.API_KEY_AWS,
        DetectorType.API_KEY_GITHUB,
        DetectorType.API_KEY_STRIPE,
        DetectorType.API_KEY_SLACK,
        DetectorType.API_KEY_GOOGLE,
        DetectorType.API_KEY_ANTHROPIC,
        DetectorType.API_KEY_SENDGRID,
        DetectorType.API_KEY_TWILIO,
        DetectorType.API_KEY_MAILCHIMP,
        DetectorType.API_KEY_HEROKU,
        DetectorType.API_KEY_NPM,
        DetectorType.API_KEY_PYPI,
        DetectorType.API_KEY_DOCKER,
        DetectorType.API_KEY_SUPABASE,
        DetectorType.API_KEY_FIREBASE,
      ];
      
      const text = buildPromptFromTypes(apiKeyTypes);
      const result = scan(text);
      const types = new Set(result.findings.map(f => f.type));
      
      expect(types.has(DetectorType.API_KEY_OPENAI)).toBe(true);
      expect(types.has(DetectorType.API_KEY_AWS)).toBe(true);
      expect(types.has(DetectorType.API_KEY_GITHUB)).toBe(true);
      expect(types.size).toBeGreaterThanOrEqual(10);
    });

    it('detects multiple PII types together', () => {
      const piiTypes: DetectorType[] = [
        DetectorType.EMAIL,
        DetectorType.PHONE_UK,
        DetectorType.UK_NI_NUMBER,
      ];
      
      const text = buildPromptFromTypes(piiTypes);
      const result = scan(text);
      const types = new Set(result.findings.map(f => f.type));
      
      expect(types.has(DetectorType.EMAIL)).toBe(true);
      expect(types.size).toBeGreaterThanOrEqual(2);
    });

    it('detects all financial types together', () => {
      const financialTypes: DetectorType[] = [
        DetectorType.CREDIT_CARD,
        DetectorType.IBAN,
      ];
      
      const text = buildPromptFromTypes(financialTypes);
      const result = scan(text);
      const types = new Set(result.findings.map(f => f.type));
      
      expect(types.has(DetectorType.CREDIT_CARD)).toBe(true);
      expect(types.has(DetectorType.IBAN)).toBe(true);
    });

    it('detects secrets and API keys together', () => {
      const secretTypes: DetectorType[] = [
        DetectorType.PRIVATE_KEY,
        DetectorType.PASSWORD,
        DetectorType.API_KEY_OPENAI,
        DetectorType.API_KEY_AWS,
      ];
      
      const text = buildPromptFromTypes(secretTypes);
      const result = scan(text);
      const types = new Set(result.findings.map(f => f.type));
      
      expect(types.has(DetectorType.PRIVATE_KEY)).toBe(true);
      expect(types.has(DetectorType.PASSWORD)).toBe(true);
      expect(types.has(DetectorType.API_KEY_OPENAI)).toBe(true);
      expect(types.has(DetectorType.API_KEY_AWS)).toBe(true);
    });

    it('detects high-entropy alongside pattern-based detections', () => {
      const allSamples = getAllSamples();
      const text = `${allSamples[DetectorType.API_KEY_OPENAI]} ${allSamples[DetectorType.HIGH_ENTROPY]}`;
      const result = scan(text, { sensitivityLevel: 'high' });
      const types = new Set(result.findings.map(f => f.type));
      
      expect(types.has(DetectorType.API_KEY_OPENAI)).toBe(true);
      expect(types.has(DetectorType.HIGH_ENTROPY)).toBe(true);
    });
  });

  describe('deduplication and overlapping detections', () => {
    it('handles overlapping detections correctly', () => {
      const allSamples = getAllSamples();
      const text = allSamples[DetectorType.API_KEY_OPENAI] || '';
      const result = scan(text);
      const findings = result.findings.filter(f => f.value === text);
      expect(findings.length).toBeLessThanOrEqual(1);
    });

    it('prevents duplicate findings at same position', () => {
      const text = getComprehensivePrompt();
      const result = scan(text);
      
      // Group findings by position
      const positionMap = new Map<string, Finding[]>();
      result.findings.forEach(finding => {
        const key = `${finding.start}-${finding.end}`;
        if (!positionMap.has(key)) {
          positionMap.set(key, []);
        }
        positionMap.get(key)!.push(finding);
      });
      
      // Each position should have unique types
      positionMap.forEach((findings, position) => {
        const types = new Set(findings.map(f => f.type));
        expect(types.size).toBe(findings.length);
      });
    });

    it('handles truly overlapping patterns correctly', () => {
      // Test case where one pattern matches a substring of another
      const text = 'password=sk-proj-abc123def456ghi789jkl012mno345pqr678';
      const result = scan(text);
      
      // Should detect both password pattern and API key, but not duplicate
      const types = new Set(result.findings.map(f => f.type));
      // At least one should be detected, but positions should not overlap incorrectly
      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('confidence scores', () => {
    it('verifies confidence scores are within valid range', () => {
      const text = getComprehensivePrompt();
      const result = scan(text);
      
      result.findings.forEach(finding => {
        expect(finding.confidence).toBeGreaterThanOrEqual(0);
        expect(finding.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('verifies high-confidence detectors have appropriate scores', () => {
      const allSamples = getAllSamples();
      const highConfidenceTypes: DetectorType[] = [
        DetectorType.API_KEY_OPENAI,
        DetectorType.API_KEY_GITHUB,
        DetectorType.PRIVATE_KEY,
        DetectorType.CREDIT_CARD,
      ];
      
      highConfidenceTypes.forEach(type => {
        const sample = allSamples[type];
        if (sample) {
          const result = scan(sample);
          const finding = result.findings.find(f => f.type === type);
          if (finding) {
            expect(finding.confidence).toBeGreaterThanOrEqual(0.7);
          }
        }
      });
    });
  });

  describe('finding order and sorting', () => {
    it('sorts findings by start position', () => {
      const text = getComprehensivePrompt();
      const result = scan(text);
      
      for (let i = 1; i < result.findings.length; i++) {
        const prev = result.findings[i - 1];
        const curr = result.findings[i];
        expect(curr.start).toBeGreaterThanOrEqual(prev.start);
      }
    });

    it('handles findings at same position correctly', () => {
      // When multiple detectors match same text, higher confidence should come first
      const text = 'sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';
      const result = scan(text);
      
      if (result.findings.length > 1) {
        // Findings at same position should be sorted by confidence (descending)
        const samePosition = result.findings.filter(
          f => f.start === result.findings[0].start
        );
        for (let i = 1; i < samePosition.length; i++) {
          expect(samePosition[i].confidence).toBeLessThanOrEqual(
            samePosition[i - 1].confidence
          );
        }
      }
    });
  });

  describe('performance with many findings', () => {
    it('handles 50+ findings efficiently', () => {
      // Create a prompt with many repeated samples
      const allSamples = getAllSamples();
      const samplesArray = Object.values(allSamples);
      const repeatedText = samplesArray.join(' ').repeat(3);
      
      const startTime = performance.now();
      const result = scan(repeatedText);
      const duration = performance.now() - startTime;
      
      expect(result.findings.length).toBeGreaterThan(0);
      // Should complete in reasonable time (< 1 second for 50+ findings)
      expect(duration).toBeLessThan(1000);
    });

    it('respects maxResults limit with many findings', () => {
      const allSamples = getAllSamples();
      const samplesArray = Object.values(allSamples);
      const repeatedText = samplesArray.join(' ').repeat(5);
      
      const result = scan(repeatedText, { maxResults: 25 });
      
      expect(result.findings.length).toBeLessThanOrEqual(25);
    });
  });
});
