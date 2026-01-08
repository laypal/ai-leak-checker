/**
 * @fileoverview Unit tests for redaction utilities
 * @module tests/unit/redact
 */
import { describe, it, expect } from 'vitest';
import { redact, mask, createRedactionMap } from '@/shared/utils/redact';
/**
 * Helper to create a finding for testing
 */
function createFinding(type, value, start) {
    return {
        type,
        value,
        start,
        end: start + value.length,
        confidence: 0.9,
    };
}
describe('redact', () => {
    describe('marker style', () => {
        it('replaces single finding with marker', () => {
            const text = 'API key: sk-abc123def456ghi789jkl012mno345pqr678';
            const findings = [createFinding(DetectorType.API_KEY_OPENAI, 'sk-abc123def456ghi789jkl012mno345pqr678', 9)];
            const result = redact(text, findings, 'marker');
            expect(result).toBe('API key: [REDACTED_OPENAI_KEY]');
        });
        it('replaces multiple findings with markers', () => {
            const text = 'Key: sk-abc123456789 and email: user@example.com';
            const findings = [
                createFinding(DetectorType.API_KEY_OPENAI, 'sk-abc123456789', 5),
                createFinding(DetectorType.EMAIL, 'user@example.com', 32),
            ];
            const result = redact(text, findings, 'marker');
            expect(result).toContain('[REDACTED_OPENAI_KEY]');
            expect(result).toContain('[REDACTED_EMAIL]');
        });
        it('handles overlapping findings correctly', () => {
            const text = 'Secret: mysecretvalue123';
            const findings = [
                createFinding(DetectorType.PASSWORD, 'mysecretvalue123', 8),
            ];
            const result = redact(text, findings, 'marker');
            expect(result).toBe('Secret: [REDACTED_PASSWORD]');
        });
        it('preserves text without findings', () => {
            const text = 'This is safe text with no secrets';
            const result = redact(text, [], 'marker');
            expect(result).toBe(text);
        });
        it('uses correct markers for each detector type', () => {
            const types = [
                { type: DetectorType.API_KEY_OPENAI, marker: '[REDACTED_OPENAI_KEY]' },
                { type: DetectorType.API_KEY_AWS, marker: '[REDACTED_AWS_KEY]' },
                { type: DetectorType.API_KEY_GITHUB, marker: '[REDACTED_GITHUB_TOKEN]' },
                { type: DetectorType.API_KEY_STRIPE, marker: '[REDACTED_STRIPE_KEY]' },
                { type: DetectorType.CREDIT_CARD, marker: '[REDACTED_CARD]' },
                { type: DetectorType.EMAIL, marker: '[REDACTED_EMAIL]' },
                { type: DetectorType.PHONE_UK, marker: '[REDACTED_PHONE]' },
                { type: DetectorType.UK_NI_NUMBER, marker: '[REDACTED_NI_NUMBER]' },
                { type: DetectorType.US_SSN, marker: '[REDACTED_SSN]' },
                { type: DetectorType.IBAN, marker: '[REDACTED_IBAN]' },
                { type: DetectorType.PRIVATE_KEY, marker: '[REDACTED_PRIVATE_KEY]' },
                { type: DetectorType.HIGH_ENTROPY, marker: '[REDACTED_SECRET]' },
            ];
            for (const { type, marker } of types) {
                const text = 'Value: SENSITIVE_DATA';
                const findings = [createFinding(type, 'SENSITIVE_DATA', 7)];
                const result = redact(text, findings, 'marker');
                expect(result).toBe(`Value: ${marker}`);
            }
        });
    });
    describe('mask style', () => {
        it('masks findings while preserving structure', () => {
            const text = 'Email: user@example.com';
            const findings = [createFinding(DetectorType.EMAIL, 'user@example.com', 7)];
            const result = redact(text, findings, 'mask');
            expect(result).toContain('@');
            expect(result).toContain('***');
            expect(result).not.toBe(text);
        });
        it('masks credit cards with partial reveal', () => {
            const text = 'Card: 4532015112830366';
            const findings = [createFinding(DetectorType.CREDIT_CARD, '4532015112830366', 6)];
            const result = redact(text, findings, 'mask');
            // Should show first 4 and last 4
            expect(result).toMatch(/Card: 4532\*+0366/);
        });
    });
    describe('remove style', () => {
        it('removes findings entirely', () => {
            const text = 'API key: sk-abc123 is secret';
            const findings = [createFinding(DetectorType.API_KEY_OPENAI, 'sk-abc123', 9)];
            const result = redact(text, findings, 'remove');
            expect(result).toBe('API key:  is secret');
        });
    });
    describe('hash style', () => {
        it('replaces with type and hash', () => {
            const text = 'Key: sk-abc123';
            const findings = [createFinding(DetectorType.API_KEY_OPENAI, 'sk-abc123', 5)];
            const result = redact(text, findings, 'hash');
            expect(result).toMatch(/Key: \[API_KEY_OPENAI:[0-9a-f]{8}\]/);
        });
        it('generates consistent hashes for same value', () => {
            const text = 'Key: sk-abc123';
            const findings = [createFinding(DetectorType.API_KEY_OPENAI, 'sk-abc123', 5)];
            const result1 = redact(text, findings, 'hash');
            const result2 = redact(text, findings, 'hash');
            expect(result1).toBe(result2);
        });
    });
    describe('position preservation', () => {
        it('replaces from end to start to preserve positions', () => {
            const text = 'First: AAA, Second: BBB, Third: CCC';
            const findings = [
                createFinding(DetectorType.PASSWORD, 'AAA', 7),
                createFinding(DetectorType.PASSWORD, 'BBB', 20),
                createFinding(DetectorType.PASSWORD, 'CCC', 32),
            ];
            const result = redact(text, findings, 'marker');
            expect(result).toBe('First: [REDACTED_PASSWORD], Second: [REDACTED_PASSWORD], Third: [REDACTED_PASSWORD]');
        });
    });
});
describe('mask', () => {
    describe('email masking', () => {
        it('masks email showing first 2 chars and TLD', () => {
            const result = mask('john.doe@example.com', DetectorType.EMAIL);
            expect(result).toBe('jo***@***.com');
        });
        it('handles short local part', () => {
            const result = mask('a@example.com', DetectorType.EMAIL);
            expect(result).toBe('***@***.com');
        });
        it('handles invalid email format', () => {
            const result = mask('notanemail', DetectorType.EMAIL);
            expect(result).toBe('***@***.***');
        });
    });
    describe('phone masking', () => {
        it('shows only last 4 digits', () => {
            const result = mask('07911123456', DetectorType.PHONE_UK);
            expect(result).toBe('*******3456');
        });
        it('handles formatted phone numbers', () => {
            const result = mask('07911 123 456', DetectorType.PHONE_UK);
            expect(result).toBe('*******3456');
        });
        it('handles short numbers', () => {
            const result = mask('123', DetectorType.PHONE_UK);
            expect(result).toBe('***');
        });
    });
    describe('national ID masking', () => {
        it('shows only last 2 characters for NI numbers', () => {
            const result = mask('AB123456C', DetectorType.UK_NI_NUMBER);
            expect(result).toBe('*******6C');
        });
        it('shows only last 2 characters for SSN', () => {
            const result = mask('123-45-6789', DetectorType.US_SSN);
            expect(result).toBe('*********89');
        });
        it('handles spaced format', () => {
            const result = mask('AB 12 34 56 C', DetectorType.UK_NI_NUMBER);
            expect(result).toBe('*******6C');
        });
    });
    describe('IBAN masking', () => {
        it('shows country code and last 4 characters', () => {
            const result = mask('GB82WEST12345698765432', DetectorType.IBAN);
            expect(result).toBe('GB****************5432');
        });
        it('handles spaced IBAN', () => {
            const result = mask('GB82 WEST 1234 5698 7654 32', DetectorType.IBAN);
            // After removing spaces: GB82WEST12345698765432 (22 chars)
            expect(result).toBe('GB****************5432');
        });
    });
    describe('private key masking', () => {
        it('replaces entire key with placeholder', () => {
            const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----`;
            const result = mask(privateKey, DetectorType.PRIVATE_KEY);
            expect(result).toBe('[PRIVATE_KEY]');
        });
    });
    describe('generic API key masking', () => {
        it('preserves prefix and shows last 4 chars', () => {
            const result = mask('sk-abc123def456ghi789', DetectorType.API_KEY_OPENAI);
            expect(result).toMatch(/^sk-\*+i789$/);
        });
        it('shows first 4 and last 4 for keys without prefix', () => {
            const result = mask('abc123def456ghi789jkl', DetectorType.API_KEY_GENERIC);
            expect(result).toBe('abc1*************9jkl');
        });
        it('handles short values', () => {
            const result = mask('short', DetectorType.API_KEY_GENERIC);
            expect(result).toBe('*****');
        });
    });
    describe('credit card masking', () => {
        it('shows first 4 and last 4 digits', () => {
            const result = mask('4532015112830366', DetectorType.CREDIT_CARD);
            expect(result).toBe('4532********0366');
        });
        it('handles formatted cards', () => {
            const result = mask('4532-0151-1283-0366', DetectorType.CREDIT_CARD);
            // maskCreditCard normalizes the format
            expect(result).toBe('4532********0366');
        });
    });
});
describe('createRedactionMap', () => {
    it('creates mapping from markers to original values', () => {
        const text = 'API key: sk-abc123 and email: user@example.com';
        const findings = [
            createFinding(DetectorType.API_KEY_OPENAI, 'sk-abc123', 9),
            createFinding(DetectorType.EMAIL, 'user@example.com', 30),
        ];
        const map = createRedactionMap(text, findings);
        expect(map.get('[REDACTED_OPENAI_KEY]')).toBe('sk-abc123');
        expect(map.get('[REDACTED_EMAIL]')).toBe('user@example.com');
    });
    it('handles multiple findings of same type', () => {
        const text = 'Email1: a@b.com, Email2: c@d.com';
        const findings = [
            createFinding(DetectorType.EMAIL, 'a@b.com', 8),
            createFinding(DetectorType.EMAIL, 'c@d.com', 25),
        ];
        const map = createRedactionMap(text, findings);
        // Last value wins for same marker
        expect(map.get('[REDACTED_EMAIL]')).toBe('c@d.com');
    });
    it('returns empty map for no findings', () => {
        const map = createRedactionMap('safe text', []);
        expect(map.size).toBe(0);
    });
    it('uses correct markers for all types', () => {
        const findings = [
            createFinding(DetectorType.API_KEY_OPENAI, 'value1', 0),
            createFinding(DetectorType.CREDIT_CARD, 'value2', 10),
            createFinding(DetectorType.PRIVATE_KEY, 'value3', 20),
        ];
        const map = createRedactionMap('dummy text for positions', findings);
        expect(map.has('[REDACTED_OPENAI_KEY]')).toBe(true);
        expect(map.has('[REDACTED_CARD]')).toBe(true);
        expect(map.has('[REDACTED_PRIVATE_KEY]')).toBe(true);
    });
});
//# sourceMappingURL=redact.test.js.map