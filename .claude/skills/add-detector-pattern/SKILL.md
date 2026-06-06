---
name: add-detector-pattern
description: Add a new sensitive-data detection pattern with full test coverage in the AI Leak Checker. Use when adding detector types, regex patterns for API keys/tokens/secrets, or when the user asks to add a detection pattern.
---

# Add Detector Pattern

Add a new detection pattern (API keys, tokens, secrets) with types, regex, validation, tests, and docs. PII patterns (email, SSN, etc.) live in `src/shared/detectors/pii.ts` and use a different flow.

## 1. Add type and metadata

**File:** `src/shared/types/detection.ts`

1. Add to `DetectorType` const:
   ```typescript
   API_KEY_NEW_SERVICE: 'api_key_new_service',
   ```

2. Add to `DETECTOR_LABELS`:
   ```typescript
   [DetectorType.API_KEY_NEW_SERVICE]: 'New Service API Key',
   ```

3. Add to `DETECTOR_RISK_LEVEL` (`'critical' | 'high' | 'medium' | 'low'`):
   ```typescript
   [DetectorType.API_KEY_NEW_SERVICE]: 'high',
   ```

4. Add to `REDACTION_MARKERS` in `src/shared/utils/redact.ts`:
   ```typescript
   [DetectorType.API_KEY_NEW_SERVICE]: '[REDACTED_NEW_SERVICE_KEY]',
   ```

## 2. Add pattern

**File:** `src/shared/detectors/patterns.ts`

Append to `API_KEY_PATTERNS`:

```typescript
{
  type: DetectorType.API_KEY_NEW_SERVICE,
  name: 'New Service API Key',
  pattern: /\bprefix_[A-Za-z0-9_-]{32,}\b/g,
  baseConfidence: 0.9,
  validate: (match) => match.length >= 32, // optional
  contextKeywords: ['newservice', 'NEW_SERVICE_API_KEY'],
},
```

- Use word boundaries (`\b`), specific prefixes, and length constraints to avoid false positives.
- Add `validate` for extra checks (length, character mix, entropy). Exclude placeholders (`example`, `your_`, `xxx`).
- Order by specificity: more specific patterns before generic ones.

## 3. Add unit tests

**File:** `tests/unit/patterns.test.ts`

Add a `describe` block and use `scanForApiKeys`:

```typescript
describe('New Service API Keys', () => {
  it('detects valid New Service keys', () => {
    const text = 'NEW_SERVICE_KEY=prefix_abcdefghijklmnopqrstuvwxyz123456';
    const findings = scanForApiKeys(text);
    expect(findings.some(f => f.type === DetectorType.API_KEY_NEW_SERVICE)).toBe(true);
  });

  it('does not detect placeholders or invalid format', () => {
    const text = 'key=prefix_abc or prefix_example_key';
    const findings = scanForApiKeys(text);
    expect(findings.filter(f => f.type === DetectorType.API_KEY_NEW_SERVICE)).toHaveLength(0);
  });
});
```

Include at least one positive and one negative case. Add `test.each` for multiple samples if useful.

## 4. Run and filter tests

```bash
npm run test:unit -- -t "New Service"
```

Use `-t` (Vitest) to run only tests whose name matches the pattern.

## 5. Update documentation

Create or update `docs/detection/PATTERNS.md` (create `docs/detection/` if missing). Document the new pattern: format, examples, and any caveats.

## Validation checklist

- [ ] Type added to `DetectorType`, `DETECTOR_LABELS`, `DETECTOR_RISK_LEVEL`, and `redact.ts` `REDACTION_MARKERS`
- [ ] Pattern appended to `API_KEY_PATTERNS` with `type`, `name`, `pattern`, `baseConfidence`
- [ ] At least 2 unit tests (positive + negative) in `tests/unit/patterns.test.ts`
- [ ] False positive rate &lt; 5% on `tests/fixtures/false_positives.json` (or relevant corpus) when applicable
- [ ] JSDoc on pattern definition if non-obvious
- [ ] `docs/detection/PATTERNS.md` updated

## Security

- Never log or transmit `Finding.value`. Use `mask(value, type)` from `@/shared/utils/redact` when displaying or logging.
- Prefer narrow regex + `validate` over broad patterns. See `.claude/rules/detection.md` for guidelines.
