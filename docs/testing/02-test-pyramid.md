[Back to Test Strategy index](index.md)

# 2. Test Pyramid

```
                    ┌─────────┐
                    │   E2E   │  10% - Critical user journeys
                    │  Tests  │  Slowest, most expensive
                    ├─────────┤
              ┌─────┴─────────┴─────┐
              │    Integration     │  20% - Component interaction
              │       Tests        │  Message passing, storage
              ├───────────────────┤
        ┌─────┴───────────────────┴─────┐
        │         Unit Tests           │  70% - Detection engine, utilities
        │      Fast, isolated          │  Regex, entropy, redaction
        └───────────────────────────────┘
```

## 2.1 Test Type Distribution

| Test Type | Percentage | Purpose | Speed |
|-----------|------------|---------|-------|
| Unit | 70% | Detection patterns, utilities, pure functions | < 1s per test |
| Integration | 20% | Component interaction, message passing | < 5s per test |
| E2E | 10% | Full browser flows, real site interaction | < 30s per test |
