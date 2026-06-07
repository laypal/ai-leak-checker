# False Positives — Known Classes & Tuning

> **Status:** Phase 7.1 (false-positive tuning). Corpus FP rate reduced from
> **23.71% → 3.19%** at `high` sensitivity (`low` 2.19%, `medium` 3.19%).
> Measured via `npm run test:corpus` against `tests/fixtures/false_positives_corpus.json` (502 samples).

## How suppression works

Detectors run first, then the engine drops **known-safe values** before
confidence filtering. Two layers:

1. **Structural exclusions** (`src/shared/utils/entropy.ts`, `luhn.ts`, `pii.ts`)
   applied inside the detectors, so they benefit every caller:
   - **URLs** — high-entropy path/query segments are not secrets.
   - **Hex digests / git SHAs** — pure-hex strings ≥ 32 chars (MD5, SHA-1/256/512, commit SHAs).
   - **base64 data URIs** — payloads after `;base64,` (inline images).
   - **Filenames** — tokens ending in a known dev extension (`.js`, `.json`, `.yml`, …).
   - **Semantic versions** — `1.0.0-alpha.1+build.123`.
   - **Credit cards** — candidates inside a UUID, and bare 13-digit numbers with
     no recognised card issuer (e.g. unix-ms timestamps `1718451000000`).
   - **UK phones** — digit runs embedded in a longer alphanumeric token.

2. **Value-level allowlist** (`src/shared/utils/placeholders.ts`) applied in the
   engine across every detector type:
   - **Placeholder secrets** — `your_…`, `replace`, `placeholder`, `redacted`,
     `example`, `test-key`, runs of `xxxx`, etc.
   - **Example emails** — RFC 2606 reserved (`example.com`, `.test`, `.invalid`)
     plus common doc domains (`test.org`, `sample.net`).
   - **Product codes** — uppercase hyphen-segmented codes (`CODE-12345-67890`).
   - **Code references** — `process.env.X`.

### Strong vs weak placeholder markers

Marker matching is split to avoid **false negatives** (suppressing a real
secret is worse than a false positive for a security tool):

- **Strong markers** (`your_`, `replace`, `placeholder`, `redacted`, `example`,
  `test-key`, …) — compound/distinctive substrings a real secret never
  contains. Matched at any length.
- **Weak markers** (`demo`, `temp`, `random`, `mock`, `sample`, `dummy`,
  `fake`) — short English words that could appear by chance inside a long
  random token. Only honoured for values **≤ 40 chars**, where genuine
  high-entropy secrets are rare.

### Bypassing suppression

`scan(text, { disableBuiltinAllowlist: true })` skips layer 2. Used by
detector-coverage tests so canonical example fixtures (e.g.
`AKIAIOSFODNN7EXAMPLE`) still exercise the patterns. **Note:** those canonical
example values are intentionally kept in test fixtures because they are
allowlisted by GitHub push protection and safe to commit; they must not be
replaced with realistic fake secrets.

## Regression gate

`npm run test:corpus` fails the build at or above **4%** (i.e. the rate must be
strictly `< 4%`; see `falsePositiveRate >= targetRate` in
`tests/corpus/run-corpus-test.ts`), tightened from the 5% NFR ceiling to lock in
Phase 7.1 gains.

## Residual / accepted false positives

~16 samples (3.19% at `high`) remain, almost all **adversarial synthetic
strings** that are structurally not secrets but have maximal Shannon entropy:

| Class | Examples | Why it remains |
|-------|----------|----------------|
| Sequential alphabets | `abcdefghij…0123456789`, `0123456789abcdef` | Every character unique → max entropy; indistinguishable from a real token by entropy alone. |
| Patterned interleavings | `a1b2c3d4e5…`, `xyz123abc456def789` | Low Kolmogorov complexity but high Shannon entropy. |
| JWT header fragment | `Bearer eyJhbGci…` | A JWT can be a real bearer token; flagging it is defensible. |

These are accepted as a known limitation rather than suppressed, because the
heuristics needed to catch them (sequential-run / pattern detection) would
trade against detection recall on real secrets. A real user is very unlikely to
paste them, and a benign over-warning is low-cost.

**Future option (not yet implemented):** a bounded sequential-run detector
(suppress when a high fraction of adjacent characters are consecutive in code
point) would clear the sequential cases and bring all sensitivity levels under
3%, at a small, well-bounded recall cost. Revisit if real-world reports warrant.
