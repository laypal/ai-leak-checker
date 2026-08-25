[Back to Test Strategy index](index.md)

# 7. Test Data Management

## 7.1 Sensitive Data Handling

**Rule**: Never commit real API keys, credentials, or PII to the repository.

**Approaches**:
1. Use obviously fake keys that match pattern but fail validation
2. Use environment variables for real keys in local testing
3. Prefix test data with `TEST_` or `FAKE_`

**Example Test Keys**:
```typescript
export const TEST_KEYS = {
  openai: 'sk-proj-TESTkey1234567890abcdefghijklmnopqrs',
  aws_access: 'AKIATEST12345678TEST',
  stripe: 'sk_test_FAKE1234567890abcdefghijklmno',
};
```

## 7.2 Fixtures Organization

```
tests/fixtures/
├── corpus/
│   ├── false_positives_corpus.json
│   └── true_positives_corpus.json
├── mocks/
│   ├── chrome-api.ts           # Chrome API mocks
│   ├── chatgpt-page.html       # Mock ChatGPT DOM
│   └── claude-page.html        # Mock Claude DOM
├── test-data/
│   ├── api-keys.ts             # Test API key samples
│   ├── pii-samples.ts          # Test PII samples
│   └── edge-cases.ts           # Unicode, emoji, etc.
└── selectors/
    └── snapshot-*.json         # DOM snapshot fixtures
```
