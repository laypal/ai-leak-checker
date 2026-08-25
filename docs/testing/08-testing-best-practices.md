[Back to Test Strategy index](index.md)

# 8. Testing Best Practices

## 8.1 Test Naming Convention

```typescript
// Pattern: should_ExpectedBehavior_When_StateUnderTest
describe('DetectionEngine', () => {
  it('should_DetectApiKey_When_OpenAIKeyPresent', () => {});
  it('should_ReturnEmpty_When_NoSensitiveData', () => {});
  it('should_CalculateHighEntropy_When_RandomString', () => {});
});
```

## 8.2 Arrange-Act-Assert Pattern

```typescript
it('should mask email addresses', () => {
  // Arrange
  const input = 'Contact: john.doe@company.com';
  const finding = { start: 9, end: 29, type: 'email' };

  // Act
  const result = redact(input, [finding]);

  // Assert
  expect(result).toBe('Contact: [REDACTED_EMAIL]');
});
```

## 8.3 Test Isolation

- Each test must be independent
- Use `beforeEach` for setup, `afterEach` for cleanup
- Never rely on test execution order
- Clear storage/mocks between tests
