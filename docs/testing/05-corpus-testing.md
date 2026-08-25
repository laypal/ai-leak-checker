[Back to Test Strategy index](index.md)

# 5. Corpus Testing

## 5.1 False Positive Corpus

**Purpose**: Validate that safe text does not trigger warnings  
**Location**: `tests/fixtures/false_positives_corpus.json`  
**Target**: < 5% false positive rate  
**Command**: `npm run test:corpus`

**Corpus Categories** (500+ samples total):
```json
{
  "categories": [
    {
      "name": "UUIDs",
      "count": 50,
      "samples": ["550e8400-e29b-41d4-a716-446655440000", ...]
    },
    {
      "name": "MD5 Hashes",
      "count": 50,
      "samples": ["d41d8cd98f00b204e9800998ecf8427e", ...]
    },
    {
      "name": "Base64 Images",
      "count": 30,
      "samples": ["data:image/png;base64,iVBORw0KGgo...", ...]
    },
    {
      "name": "Code Snippets",
      "count": 100,
      "samples": ["const hash = crypto.createHash('sha256');", ...]
    },
    {
      "name": "URLs with Query Params",
      "count": 50,
      "samples": ["https://example.com/callback?token=abc123", ...]
    },
    {
      "name": "URLs with High-Entropy Path Segments",
      "count": 3,
      "samples": [
        "https://kdp.amazon.com/en_US/help/topic/G4WB7VPPEAREHAAD",
        "https://example.com/api/v1/users/1234567890abcdef",
        "http://localhost:3000/docs/abc123xyz789"
      ],
      "notes": "URLs contain high-entropy segments (IDs, tokens) but are not secrets. Entropy detection excludes URLs via isPartOfUrl() helper."
    },
    {
      "name": "Product Codes",
      "count": 50,
      "samples": ["SKU-12345-ABC", "PART-NO-987654", ...]
    },
    {
      "name": "Session IDs",
      "count": 50,
      "samples": ["sess_abc123def456", ...]
    },
    {
      "name": "Common Abbreviations",
      "count": 70,
      "samples": ["API = Application Programming Interface", ...]
    },
    {
      "name": "Placeholder Text",
      "count": 50,
      "samples": ["YOUR_API_KEY_HERE", "REPLACE_ME", ...]
    }
  ]
}
```

## 5.2 True Positive Corpus

**Purpose**: Validate that real sensitive data is detected  
**Location**: `tests/fixtures/true_positives_corpus.json`  
**Target**: > 95% true positive rate

**Categories**:
- OpenAI API keys (sk-proj-*, sk-live-*)
- AWS credentials (AKIA*, aws_secret_access_key)
- Stripe keys (sk_live_*, pk_live_*)
- GitHub tokens (ghp_*, gho_*)
- Google API keys
- Email addresses
- Credit card numbers (Luhn-valid)
- Phone numbers (various formats)
- National Insurance numbers (UK)
- Social Security numbers (US)
- Private keys (RSA, SSH)

## 5.3 Corpus Test Runner

```typescript
// tests/corpus/run-corpus-test.ts
import { readFileSync } from 'fs';
import { detect } from '@/shared/detectors';

interface CorpusResult {
  total: number;
  falsePositives: number;
  falseNegatives: number;
  fpRate: number;
  fnRate: number;
  failedSamples: Array<{ sample: string; category: string; detected: boolean }>;
}

export function runCorpusTest(corpusPath: string, expectDetection: boolean): CorpusResult {
  const corpus = JSON.parse(readFileSync(corpusPath, 'utf-8'));
  const results: CorpusResult = {
    total: 0,
    falsePositives: 0,
    falseNegatives: 0,
    fpRate: 0,
    fnRate: 0,
    failedSamples: [],
  };

  for (const category of corpus.categories) {
    for (const sample of category.samples) {
      results.total++;
      const findings = detect(sample);
      const detected = findings.length > 0;

      if (expectDetection && !detected) {
        results.falseNegatives++;
        results.failedSamples.push({ sample, category: category.name, detected });
      } else if (!expectDetection && detected) {
        results.falsePositives++;
        results.failedSamples.push({ sample, category: category.name, detected });
      }
    }
  }

  results.fpRate = (results.falsePositives / results.total) * 100;
  results.fnRate = (results.falseNegatives / results.total) * 100;

  return results;
}
```
