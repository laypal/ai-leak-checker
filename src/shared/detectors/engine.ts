/**
 * @fileoverview Main detection engine orchestrating all detectors
 * @module detectors/engine
 * 
 * Provides the primary `scan()` function that runs all enabled detectors
 * and returns consolidated, deduplicated findings with confidence scores.
 */

import {
  DetectorType,
  type Finding,
  type DetectionResult,
  type ScanOptions,
  ENTROPY_THRESHOLDS,
} from '@/shared/types';
import { scanForApiKeys, CONTEXT_BOOST_KEYWORDS, CONTEXT_REDUCE_KEYWORDS } from './patterns';
import { scanForEmails, scanForUKPhones, scanForUKNationalInsurance, scanForUSSSN, scanForIBAN } from './pii';
import { calculateEntropy, findHighEntropyRegions } from '@/shared/utils/entropy';
import { extractCreditCards } from '@/shared/utils/luhn';

/**
 * Default scan options when not specified.
 */
const DEFAULT_OPTIONS: Required<ScanOptions> = {
  enabledDetectors: new Set(Object.values(DetectorType)),
  sensitivityLevel: 'medium',
  maxResults: 50,
  includeContext: true,
  contextSize: 50,
  filterDomains: [],
  minConfidence: 0.5,
  allowlist: [],
};

/**
 * Sensitivity level thresholds.
 */
const SENSITIVITY_THRESHOLDS: Record<Required<ScanOptions>['sensitivityLevel'], number> = {
  low: 0.8,     // Only high-confidence matches
  medium: 0.6,  // Balanced detection
  high: 0.4,    // More aggressive, may have false positives
};

/**
 * Main scan function - orchestrates all detectors.
 * 
 * @param text - Text to scan for sensitive data
 * @param options - Scan configuration options
 * @returns Detection result with findings and metadata
 * 
 * @example
 * const result = scan('my api key is sk-abc123...');
 * if (result.hasSensitiveData) {
 *   console.log(`Found ${result.findings.length} issues`);
 * }
 */
export function scan(text: string, options?: Partial<ScanOptions>): DetectionResult {
  const startTime = performance.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Early exit for empty input
  if (!text || text.trim().length === 0) {
    return createEmptyResult(startTime);
  }

  // Normalize enabledDetectors to Set
  const enabledDetectorsSet = opts.enabledDetectors instanceof Set
    ? opts.enabledDetectors
    : new Set(
        Object.entries(opts.enabledDetectors)
          .filter(([, enabled]) => enabled)
          .map(([type]) => type as DetectorType)
      );

  // Collect findings from all enabled detectors
  const allFindings: Finding[] = [];

  // Run pattern-based API key detection
  const apiKeyFindings = scanForApiKeys(text, enabledDetectorsSet);
  allFindings.push(...apiKeyFindings);

  // Run PII detectors
  if (enabledDetectorsSet.has(DetectorType.EMAIL)) {
    allFindings.push(...scanForEmails(text, opts.filterDomains));
  }

  if (enabledDetectorsSet.has(DetectorType.PHONE_UK)) {
    allFindings.push(...scanForUKPhones(text));
  }

  if (enabledDetectorsSet.has(DetectorType.UK_NI_NUMBER)) {
    allFindings.push(...scanForUKNationalInsurance(text));
  }

  if (enabledDetectorsSet.has(DetectorType.US_SSN)) {
    allFindings.push(...scanForUSSSN(text));
  }

  if (enabledDetectorsSet.has(DetectorType.IBAN)) {
    allFindings.push(...scanForIBAN(text));
  }

  // Run credit card detection
  if (enabledDetectorsSet.has(DetectorType.CREDIT_CARD)) {
    const cards = extractCreditCards(text);
    for (const card of cards) {
      allFindings.push({
        type: DetectorType.CREDIT_CARD,
        value: card.value,
        start: card.start,
        end: card.end,
        confidence: 0.95,
        context: text.slice(
          Math.max(0, card.start - opts.contextSize),
          Math.min(text.length, card.end + opts.contextSize)
        ),
        metadata: { issuer: card.issuer },
      });
    }
  }

  // Run high-entropy detection for generic secrets
  if (enabledDetectorsSet.has(DetectorType.HIGH_ENTROPY)) {
    const threshold = opts.sensitivityLevel === 'high'
      ? ENTROPY_THRESHOLDS.suspicious
      : opts.sensitivityLevel === 'low'
        ? ENTROPY_THRESHOLDS.definite
        : ENTROPY_THRESHOLDS.likely;

    const entropyFindings = findHighEntropyRegions(text, threshold);
    for (const region of entropyFindings) {
      // Skip if already detected by a more specific pattern
      if (allFindings.some(f => overlaps(f, region))) {
        continue;
      }

      allFindings.push({
        type: DetectorType.HIGH_ENTROPY,
        value: region.value,
        start: region.start,
        end: region.end,
        confidence: calculateEntropyConfidence(region.entropy),
        context: text.slice(
          Math.max(0, region.start - opts.contextSize),
          Math.min(text.length, region.end + opts.contextSize)
        ),
        metadata: { entropy: region.entropy },
      });
    }
  }

  // Apply context analysis to boost/reduce confidence
  const contextAdjusted = allFindings.map(f => applyContextBoost(f, text));

  // Filter by minimum confidence threshold based on sensitivity
  const minThreshold = opts.minConfidence ?? SENSITIVITY_THRESHOLDS[opts.sensitivityLevel];
  const filtered = contextAdjusted.filter(f => f.confidence >= minThreshold);

  // Deduplicate overlapping findings (keep highest confidence)
  const deduplicated = deduplicateFindings(filtered);

  // Sort by position and limit results
  const sorted = deduplicated
    .sort((a, b) => a.start - b.start)
    .slice(0, opts.maxResults);

  // Strip context if not requested
  const finalFindings = opts.includeContext
    ? sorted
    : sorted.map(f => ({ ...f, context: undefined }));

  const scanTime = performance.now() - startTime;

  return {
    hasSensitiveData: finalFindings.length > 0,
    findings: finalFindings,
    summary: createSummary(finalFindings),
    scanTime,
    textLength: text.length,
  };
}

/**
 * Quick check for sensitive data without full analysis.
 * Faster for pre-filtering before full scan.
 * 
 * @param text - Text to check
 * @returns true if text likely contains sensitive data
 */
export function quickCheck(text: string): boolean {
  if (!text || text.length < 10) {
    return false;
  }

  // Quick pattern checks (no regex exec, just test)
  // More lenient for quick filtering - catches potential issues
  const quickPatterns = [
    /sk-[a-zA-Z0-9]{5,}/,    // OpenAI (lenient - at least 5 chars)
    /AKIA[A-Z0-9]{5,}/,      // AWS (lenient)
    /ghp_[a-zA-Z0-9]{5,}/,   // GitHub (lenient)
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
    /-----BEGIN.*PRIVATE KEY-----/, // Private key
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // Email
  ];

  // Check keyword patterns (password=, secret:, api_key=, token:)
  const keywordPatterns = [
    /(?:password|passwd|pwd|secret|token|api_key|apikey|auth)\s*[:=]\s*/i,
  ];

  return quickPatterns.some(p => p.test(text)) || 
         keywordPatterns.some(p => p.test(text));
}

/**
 * Create empty result for short-circuit cases.
 */
function createEmptyResult(startTime: number): DetectionResult {
  return {
    hasSensitiveData: false,
    findings: [],
    summary: { total: 0, byType: {}, highestConfidence: 0 },
    scanTime: performance.now() - startTime,
    textLength: 0,
  };
}

/**
 * Check if two findings overlap.
 */
function overlaps(
  a: Finding,
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Calculate confidence score from entropy value.
 */
function calculateEntropyConfidence(entropy: number): number {
  if (entropy >= ENTROPY_THRESHOLDS.definite) {
    return 0.9;
  }
  if (entropy >= ENTROPY_THRESHOLDS.likely) {
    return 0.75;
  }
  if (entropy >= ENTROPY_THRESHOLDS.suspicious) {
    return 0.6;
  }
  return 0.4;
}

/**
 * Apply context-based confidence adjustments.
 * Boost confidence when sensitive keywords are nearby.
 * Reduce confidence for obvious test/example data.
 */
function applyContextBoost(finding: Finding, fullText: string): Finding {
  // Extract extended context around the finding
  const contextStart = Math.max(0, finding.start - 100);
  const contextEnd = Math.min(fullText.length, finding.end + 100);
  const context = fullText.slice(contextStart, contextEnd).toLowerCase();

  let confidenceAdjustment = 0;

  // Check for boost keywords
  for (const keyword of CONTEXT_BOOST_KEYWORDS) {
    if (context.includes(keyword.toLowerCase())) {
      confidenceAdjustment += 0.05;
    }
  }

  // Check for reduce keywords (test/example data)
  for (const keyword of CONTEXT_REDUCE_KEYWORDS) {
    if (context.includes(keyword.toLowerCase())) {
      confidenceAdjustment -= 0.15;
    }
  }

  // Clamp final confidence to 0-1
  const newConfidence = Math.max(0, Math.min(1, finding.confidence + confidenceAdjustment));

  return {
    ...finding,
    confidence: newConfidence,
  };
}

/**
 * Remove overlapping findings, keeping highest confidence.
 */
function deduplicateFindings(findings: Finding[]): Finding[] {
  if (findings.length <= 1) {
    return findings;
  }

  // Sort by start position, then by confidence (descending)
  const sorted = [...findings].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.confidence - a.confidence;
  });

  const result: Finding[] = [];

  for (const finding of sorted) {
    // Check if this finding overlaps with any already in result
    const hasOverlap = result.some(existing => overlaps(existing, finding));
    if (!hasOverlap) {
      result.push(finding);
    }
  }

  return result;
}

/**
 * Create summary statistics for findings.
 */
function createSummary(findings: Finding[]): DetectionResult['summary'] {
  const byType: Record<string, number> = {};
  let highestConfidence = 0;

  for (const finding of findings) {
    byType[finding.type] = (byType[finding.type] ?? 0) + 1;
    if (finding.confidence > highestConfidence) {
      highestConfidence = finding.confidence;
    }
  }

  return {
    total: findings.length,
    byType,
    highestConfidence,
  };
}

/**
 * Get human-readable description for a finding.
 */
export function describeFinding(finding: Finding): string {
  const descriptions: Record<DetectorType, string> = {
    [DetectorType.API_KEY_OPENAI]: 'OpenAI API key',
    [DetectorType.API_KEY_AWS]: 'AWS credentials',
    [DetectorType.API_KEY_GITHUB]: 'GitHub token',
    [DetectorType.API_KEY_STRIPE]: 'Stripe API key',
    [DetectorType.API_KEY_SLACK]: 'Slack token',
    [DetectorType.API_KEY_GOOGLE]: 'Google API key',
    [DetectorType.API_KEY_ANTHROPIC]: 'Anthropic API key',
    [DetectorType.API_KEY_SENDGRID]: 'SendGrid API key',
    [DetectorType.API_KEY_TWILIO]: 'Twilio credentials',
    [DetectorType.API_KEY_MAILCHIMP]: 'Mailchimp API key',
    [DetectorType.API_KEY_HEROKU]: 'Heroku API key',
    [DetectorType.API_KEY_NPM]: 'npm access token',
    [DetectorType.API_KEY_PYPI]: 'PyPI API token',
    [DetectorType.API_KEY_DOCKER]: 'Docker Hub token',
    [DetectorType.API_KEY_SUPABASE]: 'Supabase API key',
    [DetectorType.API_KEY_FIREBASE]: 'Firebase API key',
    [DetectorType.API_KEY_GENERIC]: 'API key',
    [DetectorType.PRIVATE_KEY]: 'Private key',
    [DetectorType.PASSWORD]: 'Password',
    [DetectorType.CREDIT_CARD]: 'Credit card number',
    [DetectorType.EMAIL]: 'Email address',
    [DetectorType.PHONE_UK]: 'UK phone number',
    [DetectorType.UK_NI_NUMBER]: 'UK National Insurance number',
    [DetectorType.US_SSN]: 'US Social Security number',
    [DetectorType.IBAN]: 'Bank account (IBAN)',
    [DetectorType.HIGH_ENTROPY]: 'High-entropy secret',
  };

  return descriptions[finding.type] ?? 'Sensitive data';
}

// Re-export for convenience
export { DetectorType };
export type { Finding, DetectionResult, ScanOptions } from '@/shared/types';
