/**
 * @fileoverview Unit tests for PII (Personally Identifiable Information) detection
 * @module tests/unit/pii
 */
import { describe, it, expect } from 'vitest';
import { scanForEmails, scanForUKPhones, scanForUKNationalInsurance, scanForUSSSN, scanForIBAN, } from '@/shared/detectors/pii';
describe('scanForEmails', () => {
    describe('valid email detection', () => {
        it('detects simple email addresses', () => {
            const text = 'Contact me at user@example.com for more info';
            const findings = scanForEmails(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].type).toBe(DetectorType.EMAIL);
            expect(findings[0].value).toBe('user@example.com');
        });
        it('detects emails with dots in local part', () => {
            const text = 'Email: first.last@company.com';
            const findings = scanForEmails(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].value).toBe('first.last@company.com');
        });
        it('detects emails with plus addressing', () => {
            const text = 'Send to user+tag@example.org';
            const findings = scanForEmails(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].value).toBe('user+tag@example.org');
        });
        it('detects emails with subdomains', () => {
            const text = 'Email: user@mail.subdomain.example.co.uk';
            const findings = scanForEmails(text);
            expect(findings).toHaveLength(1);
        });
        it('detects multiple emails in text', () => {
            const text = 'Contact john@example.com or jane@company.org';
            const findings = scanForEmails(text);
            expect(findings).toHaveLength(2);
        });
    });
    describe('confidence scoring', () => {
        it('assigns higher confidence to personal email domains', () => {
            const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
            for (const domain of personalDomains) {
                const findings = scanForEmails(`user@${domain}`);
                expect(findings[0].confidence).toBe(0.85);
            }
        });
        it('assigns medium confidence to .co.uk domains', () => {
            const findings = scanForEmails('user@company.co.uk');
            expect(findings[0].confidence).toBe(0.75);
        });
        it('assigns lower confidence to other domains', () => {
            const findings = scanForEmails('user@randomdomain.net');
            expect(findings[0].confidence).toBe(0.65);
        });
    });
    describe('generic email filtering', () => {
        it('filters out noreply addresses', () => {
            const genericEmails = [
                'noreply@example.com',
                'no-reply@example.com',
                'donotreply@example.com',
            ];
            for (const email of genericEmails) {
                const findings = scanForEmails(email);
                expect(findings).toHaveLength(0);
            }
        });
        it('filters out support/info addresses', () => {
            const genericEmails = [
                'support@example.com',
                'info@example.com',
                'help@example.com',
                'admin@example.com',
            ];
            for (const email of genericEmails) {
                const findings = scanForEmails(email);
                expect(findings).toHaveLength(0);
            }
        });
        it('filters out test/example addresses', () => {
            const testEmails = [
                'test@example.com',
                'demo@example.com',
                'example@test.com',
            ];
            for (const email of testEmails) {
                const findings = scanForEmails(email);
                expect(findings).toHaveLength(0);
            }
        });
    });
    describe('domain filtering', () => {
        it('filters emails by specified domains', () => {
            const text = 'john@personal.com and jane@company.com';
            const findings = scanForEmails(text, ['company.com']);
            expect(findings).toHaveLength(1);
            expect(findings[0].value).toBe('john@personal.com');
        });
        it('filters subdomains when parent domain specified', () => {
            const text = 'user@mail.company.com';
            const findings = scanForEmails(text, ['company.com']);
            expect(findings).toHaveLength(0);
        });
    });
    describe('invalid email handling', () => {
        it('does not detect emails without @', () => {
            const findings = scanForEmails('userexample.com');
            expect(findings).toHaveLength(0);
        });
        it('does not detect emails without domain', () => {
            const findings = scanForEmails('user@');
            expect(findings).toHaveLength(0);
        });
        it('does not detect emails without TLD', () => {
            const findings = scanForEmails('user@example');
            expect(findings).toHaveLength(0);
        });
    });
    describe('context extraction', () => {
        it('includes surrounding context', () => {
            const text = 'Please email john.doe@example.com for support';
            const findings = scanForEmails(text);
            expect(findings[0].context).toContain('Please email');
            expect(findings[0].context).toContain('for support');
        });
    });
});
describe('scanForUKPhones', () => {
    describe('mobile numbers', () => {
        it('detects 07xxx format mobile numbers', () => {
            const text = 'Call me on 07911123456';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].type).toBe(DetectorType.PHONE_UK);
        });
        it('detects spaced mobile numbers', () => {
            const text = 'Mobile: 07911 123 456';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
        });
        it('detects hyphenated mobile numbers', () => {
            const text = 'Tel: 07911-123-456';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
        });
    });
    describe('international format', () => {
        it('detects +44 format', () => {
            const text = 'International: +447911123456';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
        });
        it('detects +44 with spaces', () => {
            const text = 'Call: +44 7911 123 456';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
        });
        it('detects +44 (0) format', () => {
            const text = 'Phone: +44 (0) 7911 123456';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
        });
    });
    describe('landline numbers', () => {
        it('detects London landlines (020)', () => {
            const text = 'Office: 020 7946 0958';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
        });
        it('detects regional landlines (01xxx)', () => {
            const text = 'Regional: 01123 456789';
            const findings = scanForUKPhones(text);
            expect(findings).toHaveLength(1);
        });
    });
    describe('invalid numbers', () => {
        it('does not detect numbers too short', () => {
            const findings = scanForUKPhones('07911');
            expect(findings).toHaveLength(0);
        });
        it('does not detect numbers with invalid prefix', () => {
            const findings = scanForUKPhones('06911123456');
            expect(findings).toHaveLength(0);
        });
    });
    describe('deduplication', () => {
        it('does not return duplicate findings for same position', () => {
            const text = '+447911123456'; // Could match multiple patterns
            const findings = scanForUKPhones(text);
            // Should have exactly one finding
            expect(findings).toHaveLength(1);
        });
    });
});
describe('scanForUKNationalInsurance', () => {
    describe('valid NI numbers', () => {
        it('detects compact format', () => {
            const text = 'NI: AB123456D';
            const findings = scanForUKNationalInsurance(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].type).toBe(DetectorType.UK_NI_NUMBER);
        });
        it('detects spaced format', () => {
            const text = 'National Insurance: AB 12 34 56 D';
            const findings = scanForUKNationalInsurance(text);
            expect(findings).toHaveLength(1);
        });
        it('accepts final letters A through D', () => {
            const letters = ['A', 'B', 'C', 'D'];
            for (const letter of letters) {
                const findings = scanForUKNationalInsurance(`AB123457${letter}`);
                expect(findings).toHaveLength(1);
            }
        });
        it('is case insensitive', () => {
            const findings = scanForUKNationalInsurance('ab123457d');
            expect(findings).toHaveLength(1);
            expect(findings[0].value).toBe('AB123457D'); // Normalized to uppercase
        });
    });
    describe('invalid NI numbers', () => {
        it('rejects invalid first letter prefixes', () => {
            // D, F, I, Q, U, V cannot be first letter
            const invalidPrefixes = ['DA', 'FA', 'IA', 'QA', 'UA', 'VA'];
            for (const prefix of invalidPrefixes) {
                const findings = scanForUKNationalInsurance(`${prefix}123456A`);
                expect(findings).toHaveLength(0);
            }
        });
        it('rejects invalid final letters', () => {
            // Only A-D allowed as final letter
            const findings = scanForUKNationalInsurance('AB123456E');
            expect(findings).toHaveLength(0);
        });
    });
    describe('test/example filtering', () => {
        it('filters known example NI numbers', () => {
            const examples = ['QQ123456A', 'AB123456C', 'AA000000A'];
            for (const example of examples) {
                const findings = scanForUKNationalInsurance(example);
                expect(findings).toHaveLength(0);
            }
        });
    });
});
describe('scanForUSSSN', () => {
    describe('valid SSN detection', () => {
        it('detects hyphenated format', () => {
            const text = 'SSN: 234-56-7890';
            const findings = scanForUSSSN(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].type).toBe(DetectorType.US_SSN);
        });
        it('detects spaced format', () => {
            const text = 'SSN: 234 56 7890';
            const findings = scanForUSSSN(text);
            expect(findings).toHaveLength(1);
        });
        it('detects compact format', () => {
            const text = 'SSN: 234567890';
            const findings = scanForUSSSN(text);
            expect(findings).toHaveLength(1);
        });
    });
    describe('invalid SSN filtering', () => {
        it('rejects SSNs starting with 000', () => {
            const findings = scanForUSSSN('000-12-3456');
            expect(findings).toHaveLength(0);
        });
        it('rejects SSNs starting with 666', () => {
            const findings = scanForUSSSN('666-12-3456');
            expect(findings).toHaveLength(0);
        });
        it('rejects SSNs starting with 9xx', () => {
            const findings = scanForUSSSN('900-12-3456');
            expect(findings).toHaveLength(0);
        });
        it('rejects SSNs with 00 in group position', () => {
            const findings = scanForUSSSN('123-00-1234');
            expect(findings).toHaveLength(0);
        });
        it('rejects SSNs with 0000 in serial position', () => {
            const findings = scanForUSSSN('123-45-0000');
            expect(findings).toHaveLength(0);
        });
    });
    describe('test pattern filtering', () => {
        it('filters sequential test patterns', () => {
            const testPatterns = ['123456789', '987654321'];
            for (const pattern of testPatterns) {
                const findings = scanForUSSSN(pattern);
                expect(findings).toHaveLength(0);
            }
        });
        it('filters repeated digit patterns', () => {
            const findings = scanForUSSSN('111-11-1111');
            expect(findings).toHaveLength(0);
        });
    });
});
describe('scanForIBAN', () => {
    describe('valid IBAN detection', () => {
        it('detects UK IBAN', () => {
            // GB82 WEST 1234 5698 7654 32 (example from Wikipedia)
            const text = 'IBAN: GB82WEST12345698765432';
            const findings = scanForIBAN(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].type).toBe(DetectorType.IBAN);
        });
        it('detects German IBAN', () => {
            // DE89 3704 0044 0532 0130 00 (example)
            const text = 'DE89370400440532013000';
            const findings = scanForIBAN(text);
            expect(findings).toHaveLength(1);
        });
        it('detects spaced IBAN format', () => {
            const text = 'GB82 WEST 1234 5698 7654 32';
            const findings = scanForIBAN(text);
            expect(findings).toHaveLength(1);
        });
        it('is case insensitive', () => {
            const text = 'gb82west12345698765432';
            const findings = scanForIBAN(text);
            expect(findings).toHaveLength(1);
        });
    });
    describe('checksum validation', () => {
        it('rejects IBANs with invalid checksum', () => {
            // Modify a valid IBAN to have wrong checksum
            const text = 'GB83WEST12345698765432'; // Changed 82 to 83
            const findings = scanForIBAN(text);
            expect(findings).toHaveLength(0);
        });
    });
    describe('length validation', () => {
        it('rejects IBANs that are too short', () => {
            const text = 'GB82WEST123456'; // Too short
            const findings = scanForIBAN(text);
            expect(findings).toHaveLength(0);
        });
        it('rejects IBANs that are too long', () => {
            const text = 'GB82WEST123456987654321234567890123456'; // Too long
            const findings = scanForIBAN(text);
            expect(findings).toHaveLength(0);
        });
    });
    describe('confidence scoring', () => {
        it('assigns high confidence to validated IBANs', () => {
            const text = 'GB82WEST12345698765432';
            const findings = scanForIBAN(text);
            expect(findings[0].confidence).toBe(0.9);
        });
    });
});
//# sourceMappingURL=pii.test.js.map