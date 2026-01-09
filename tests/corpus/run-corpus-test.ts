/**
 * @fileoverview Corpus test runner for false positive testing.
 * @module corpus/run-corpus-test
 * 
 * Tests detection engine against corpus of safe text samples.
 * Reports false positive rate and identifies patterns that trigger false positives.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scan } from '../../src/shared/detectors/engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Corpus test result.
 */
interface CorpusTestResult {
  sample: string;
  category: string;
  detected: boolean;
  findings: Array<{
    type: string;
    confidence: number;
    value: string;
  }>;
}

/**
 * Main corpus test runner.
 */
function runCorpusTest(): void {
  console.log('[Corpus Test] Starting false positive corpus test...\n');

  // Load corpus
  const corpusPath = join(__dirname, '../fixtures/false_positives_corpus.json');
  const corpus = JSON.parse(readFileSync(corpusPath, 'utf-8'));

  const results: CorpusTestResult[] = [];
  let totalSamples = 0;

  // Process each category
  for (const [categoryName, category] of Object.entries(corpus.categories)) {
    const categoryObj = category as {
      description: string;
      samples?: string[];
      md5?: string[];
      sha256?: string[];
      sha512?: string[];
      sha1?: string[];
    };

    // Collect all samples from category
    const categorySamples: string[] = [];

    if (categoryObj.samples) {
      categorySamples.push(...categoryObj.samples);
    }

    // Handle nested hash objects
    if (categoryObj.md5) {
      categorySamples.push(...categoryObj.md5);
    }
    if (categoryObj.sha256) {
      categorySamples.push(...categoryObj.sha256);
    }
    if (categoryObj.sha512) {
      categorySamples.push(...categoryObj.sha512);
    }
    if (categoryObj.sha1) {
      categorySamples.push(...categoryObj.sha1);
    }

    // Test each sample
    for (const sample of categorySamples) {
      totalSamples++;
      
      // Scan with high sensitivity (most strict)
      const result = scan(sample, { sensitivityLevel: 'high' });
      
      results.push({
        sample,
        category: categoryName,
        detected: result.hasSensitiveData,
        findings: result.findings.map(f => ({
          type: f.type,
          confidence: f.confidence,
          value: f.value.substring(0, 50) + (f.value.length > 50 ? '...' : ''),
        })),
      });
    }
  }

  // Calculate statistics
  const falsePositives = results.filter(r => r.detected);
  const falsePositiveCount = falsePositives.length;
  const falsePositiveRate = (falsePositiveCount / totalSamples) * 100;
  const targetRate = 5.0; // 5% target from NFR-REL-002

  // Group false positives by pattern type
  const falsePositivesByType = new Map<string, number>();
  for (const fp of falsePositives) {
    for (const finding of fp.findings) {
      const count = falsePositivesByType.get(finding.type) || 0;
      falsePositivesByType.set(finding.type, count + 1);
    }
  }

  // Group false positives by category
  const falsePositivesByCategory = new Map<string, number>();
  for (const fp of falsePositives) {
    const count = falsePositivesByCategory.get(fp.category) || 0;
    falsePositivesByCategory.set(fp.category, count + 1);
  }

  // Print report
  console.log('='.repeat(80));
  console.log('CORPUS TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`Scanned: ${totalSamples} samples`);
  console.log(`False positives: ${falsePositiveCount} (${falsePositiveRate.toFixed(2)}%)`);
  console.log(`Target: < ${targetRate}% ${falsePositiveRate < targetRate ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  if (falsePositivesByType.size > 0) {
    console.log('False Positives by Detector Type:');
    console.log('-'.repeat(80));
    const sortedTypes = Array.from(falsePositivesByType.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [type, count] of sortedTypes) {
      console.log(`  ${type.padEnd(30)} ${count.toString().padStart(4)}`);
    }
    console.log('');
  }

  if (falsePositivesByCategory.size > 0) {
    console.log('False Positives by Category:');
    console.log('-'.repeat(80));
    const sortedCategories = Array.from(falsePositivesByCategory.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [category, count] of sortedCategories) {
      const categorySamples = results.filter(r => r.category === category).length;
      const categoryRate = (count / categorySamples) * 100;
      console.log(`  ${category.padEnd(30)} ${count.toString().padStart(4)}/${categorySamples.toString().padStart(4)} (${categoryRate.toFixed(1)}%)`);
    }
    console.log('');
  }

  if (falsePositives.length > 0 && falsePositives.length <= 50) {
    console.log('Sample False Positives:');
    console.log('-'.repeat(80));
    for (const fp of falsePositives.slice(0, 20)) {
      console.log(`  Category: ${fp.category}`);
      console.log(`  Sample: ${fp.sample.substring(0, 80)}${fp.sample.length > 80 ? '...' : ''}`);
      for (const finding of fp.findings) {
        console.log(`    - ${finding.type} (confidence: ${finding.confidence.toFixed(2)})`);
        console.log(`      Value: ${finding.value}`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(80));

  // Exit with appropriate code
  if (falsePositiveRate >= targetRate) {
    console.error(`\n❌ FAILED: False positive rate ${falsePositiveRate.toFixed(2)}% exceeds target ${targetRate}%`);
    process.exit(1);
  } else {
    console.log(`\n✅ PASSED: False positive rate ${falsePositiveRate.toFixed(2)}% is below target ${targetRate}%`);
    process.exit(0);
  }
}

// Run if executed directly
// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.includes('run-corpus-test');

if (isMainModule || process.argv.includes('--run')) {
  runCorpusTest();
}

export { runCorpusTest };
