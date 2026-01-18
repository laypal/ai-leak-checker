/**
 * @file fixtures.ts
 * @description Helper functions for loading and using test fixtures
 * @module tests/unit/helpers
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { DetectorType } from '@/shared/types';

/**
 * Comprehensive detection fixture data structure
 */
export interface ComprehensiveDetectionFixture {
  $schema: string;
  description: string;
  version: string;
  samples: {
    api_keys: Record<string, string>;
    secrets: Record<string, string>;
    financial: Record<string, string>;
    pii: Record<string, string>;
    generic: Record<string, string>;
  };
  comprehensive_prompt: {
    description: string;
    text: string;
  };
}

/**
 * Load comprehensive detection fixture
 */
export function loadComprehensiveFixture(): ComprehensiveDetectionFixture {
  const fixturePath = join(__dirname, '../../fixtures/comprehensive_detection.json');
  let content = readFileSync(fixturePath, 'utf-8');
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return JSON.parse(content) as ComprehensiveDetectionFixture;
}

/**
 * Get all detector type samples as a flat object
 */
export function getAllSamples(): Record<string, string> {
  const fixture = loadComprehensiveFixture();
  return {
    ...fixture.samples.api_keys,
    ...fixture.samples.secrets,
    ...fixture.samples.financial,
    ...fixture.samples.pii,
    ...fixture.samples.generic,
  };
}

/**
 * Get comprehensive prompt text containing all detector types
 */
export function getComprehensivePrompt(): string {
  const fixture = loadComprehensiveFixture();
  return fixture.comprehensive_prompt.text;
}

/**
 * Get samples for a specific category
 */
export function getSamplesByCategory(
  category: 'api_keys' | 'secrets' | 'financial' | 'pii' | 'generic'
): Record<string, string> {
  const fixture = loadComprehensiveFixture();
  return fixture.samples[category];
}

/**
 * Get sample for a specific detector type
 */
export function getSampleForDetectorType(type: DetectorType): string | undefined {
  const allSamples = getAllSamples();
  return allSamples[type];
}

/**
 * Build a test prompt from multiple detector types
 */
export function buildPromptFromTypes(types: DetectorType[]): string {
  const allSamples = getAllSamples();
  return types
    .map((type) => {
      const sample = allSamples[type];
      return sample ? `${type}: ${sample}` : null;
    })
    .filter((line): line is string => line !== null)
    .join(' ');
}
