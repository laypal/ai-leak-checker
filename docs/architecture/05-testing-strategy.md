# 5. Testing Strategy

[Back to index](index.md)


## 5.1 Test Pyramid

```
        ┌─────────┐
        │   E2E   │  - Playwright browser tests
        │   10%   │  - Real AI site interaction
        └────┬────┘
             │
       ┌─────┴─────┐
       │Integration│  - Component interaction
       │    20%    │  - Message passing
       └─────┬─────┘
             │
    ┌────────┴────────┐
    │   Unit Tests    │  - Detection engine
    │      70%        │  - Utility functions
    │                 │  - Pattern validation
    └─────────────────┘
```

## 5.2 Property-Based Testing (Hypothesis)

```python
# Example: Entropy calculation properties
from hypothesis import given, strategies as st

@given(st.text(min_size=1, max_size=1000))
def test_entropy_bounds(text):
    """Entropy is always between 0 and log2(alphabet_size)"""
    entropy = calculate_entropy(text)
    assert 0 <= entropy <= 8  # For ASCII

@given(st.text(alphabet='a', min_size=1, max_size=100))
def test_entropy_zero_for_uniform(text):
    """Single character strings have zero entropy"""
    entropy = calculate_entropy(text)
    assert entropy == 0

@given(st.from_regex(r'sk-[a-zA-Z0-9]{20,40}'))
def test_openai_key_always_detected(key):
    """Valid OpenAI key format is always detected"""
    result = scan(key)
    assert any(f.type == 'api_key_openai' for f in result.findings)
```

## 5.3 Test Fixtures

Located in `/tests/fixtures/`:
- `api_keys.json` - Known API key formats
- `false_positives.json` - Strings that look like secrets but aren't
- `pii_samples.json` - Anonymized PII patterns
- `edge_cases.json` - Unicode, long strings, edge cases
