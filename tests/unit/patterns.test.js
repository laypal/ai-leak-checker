/**
 * @fileoverview Unit tests for API key pattern detection
 * @module tests/unit/patterns
 */
import { describe, it, expect } from 'vitest';
import { scanForApiKeys, API_KEY_PATTERNS } from '@/shared/detectors/patterns';
describe('scanForApiKeys', () => {
    describe('OpenAI API Keys', () => {
        it('detects standard OpenAI keys', () => {
            const text = 'My API key is sk-abcdefghijklmnopqrstuvwxyz12345678901234567890';
            const findings = scanForApiKeys(text);
            expect(findings).toHaveLength(1);
            expect(findings[0].type).toBe(DetectorType.API_KEY_OPENAI);
            expect(findings[0].confidence).toBeGreaterThanOrEqual(0.9);
        });
        it('detects project-scoped OpenAI keys', () => {
            const text = 'OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI';
            const findings = scanForApiKeys(text);
            expect(findings.length).toBeGreaterThanOrEqual(1);
            expect(findings.some(f => f.type === DetectorType.API_KEY_OPENAI)).toBe(true);
        });
        it('does not detect invalid OpenAI key format', () => {
            const text = 'Not a key: sk-abc or sk-';
            const findings = scanForApiKeys(text);
            expect(findings.filter(f => f.type === DetectorType.API_KEY_OPENAI)).toHaveLength(0);
        });
    });
    describe('AWS Keys', () => {
        it('detects AWS Access Key IDs', () => {
            const text = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_AWS)).toBe(true);
            const awsFinding = findings.find(f => f.type === DetectorType.API_KEY_AWS);
            expect(awsFinding?.value).toBe('AKIAIOSFODNN7EXAMPLE');
        });
        it('detects various AWS key prefixes', () => {
            const prefixes = ['AKIA', 'ABIA', 'ACCA', 'AGPA', 'AIDA', 'AIPA', 'ANPA', 'AROA', 'ASCA', 'ASIA'];
            for (const prefix of prefixes) {
                const text = `${prefix}IOSFODNN7EXAMPLE`;
                const findings = scanForApiKeys(text);
                expect(findings.some(f => f.type === DetectorType.API_KEY_AWS)).toBe(true);
            }
        });
        it('does not detect partial AWS keys', () => {
            const text = 'AKIA is just a prefix';
            const findings = scanForApiKeys(text);
            expect(findings.filter(f => f.type === DetectorType.API_KEY_AWS)).toHaveLength(0);
        });
    });
    describe('GitHub Tokens', () => {
        it('detects GitHub PAT (classic)', () => {
            const text = 'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_GITHUB)).toBe(true);
        });
        it('detects GitHub fine-grained PAT', () => {
            const text = 'token: github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_GITHUB)).toBe(true);
        });
        it('detects GitHub OAuth tokens', () => {
            const text = 'gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_GITHUB)).toBe(true);
        });
        it('detects GitHub App tokens (ghu_, ghs_)', () => {
            const texts = [
                'ghu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                'ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
            ];
            for (const text of texts) {
                const findings = scanForApiKeys(text);
                expect(findings.some(f => f.type === DetectorType.API_KEY_GITHUB)).toBe(true);
            }
        });
    });
    describe('Stripe Keys', () => {
        it('detects Stripe live secret key', () => {
            const text = 'STRIPE_SECRET_KEY=sk_live_51234567890abcdefghijklmnopqrstuvwxyz';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_STRIPE)).toBe(true);
        });
        it('detects Stripe test keys', () => {
            const text = 'sk_test_51234567890abcdefghijklmnopqrstuvwxyz';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_STRIPE)).toBe(true);
        });
        it('detects Stripe publishable keys', () => {
            const text = 'pk_live_51234567890abcdefghijklmnopqrstuvwxyz';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_STRIPE)).toBe(true);
        });
        it('detects Stripe restricted keys', () => {
            const text = 'rk_live_51234567890abcdefghijklmnopqrstuvwxyz';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_STRIPE)).toBe(true);
        });
    });
    describe('Slack Tokens', () => {
        it('detects Slack bot tokens', () => {
            const text = 'SLACK_BOT_TOKEN=xoxb-123456789012-1234567890123-abcdefghijklmnopqrstuvwx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_SLACK)).toBe(true);
        });
        it('detects Slack user tokens', () => {
            const text = 'xoxp-123456789012-123456789012-123456789012-abcdefghijklmnopqrstuvwxyz123456';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_SLACK)).toBe(true);
        });
    });
    describe('Google API Keys', () => {
        it('detects Google API keys', () => {
            const text = 'GOOGLE_API_KEY=AIzaSyA1234567890abcdefghijklmnopqrstuv';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_GOOGLE)).toBe(true);
        });
        it('detects Google OAuth secrets', () => {
            const text = 'client_secret: GOCspx-1234567890abcdefghijklmno';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_GOOGLE)).toBe(true);
        });
    });
    describe('SendGrid Keys', () => {
        it('detects SendGrid API keys', () => {
            const text = 'SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_SENDGRID)).toBe(true);
        });
    });
    describe('Twilio Keys', () => {
        it('detects Twilio API keys', () => {
            const text = 'TWILIO_API_KEY=SK1234567890abcdef1234567890abcdef';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_TWILIO)).toBe(true);
        });
        it('detects Twilio Account SIDs', () => {
            const text = 'TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_TWILIO)).toBe(true);
        });
    });
    describe('npm Tokens', () => {
        it('detects npm access tokens', () => {
            const text = 'NPM_TOKEN=npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_NPM)).toBe(true);
        });
    });
    describe('PyPI Tokens', () => {
        it('detects PyPI API tokens', () => {
            const text = 'PYPI_TOKEN=pypi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_PYPI)).toBe(true);
        });
    });
    describe('Docker Tokens', () => {
        it('detects Docker Hub PATs', () => {
            const text = 'DOCKER_TOKEN=dckr_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxx';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_DOCKER)).toBe(true);
        });
    });
    describe('Private Keys', () => {
        it('detects RSA private keys', () => {
            const text = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...base64content...
-----END RSA PRIVATE KEY-----`;
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.PRIVATE_KEY)).toBe(true);
            expect(findings.find(f => f.type === DetectorType.PRIVATE_KEY)?.confidence).toBeGreaterThanOrEqual(0.95);
        });
        it('detects EC private keys', () => {
            const text = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEICJxApEhZgBf...
-----END EC PRIVATE KEY-----`;
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.PRIVATE_KEY)).toBe(true);
        });
        it('detects OpenSSH private keys', () => {
            const text = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUA...
-----END OPENSSH PRIVATE KEY-----`;
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.PRIVATE_KEY)).toBe(true);
        });
    });
    describe('Generic Password Patterns', () => {
        it('detects password assignments in config', () => {
            const text = 'password=MySuperSecretPassword123!';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.PASSWORD)).toBe(true);
        });
        it('detects secret assignments', () => {
            const text = 'secret: "my_super_secret_value"';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.PASSWORD)).toBe(true);
        });
        it('ignores placeholder passwords', () => {
            const text = 'password=your_password_here';
            const findings = scanForApiKeys(text);
            // Should not detect placeholders
            expect(findings.filter(f => f.type === DetectorType.PASSWORD)).toHaveLength(0);
        });
        it('ignores example passwords', () => {
            const text = 'password: example_value';
            const findings = scanForApiKeys(text);
            expect(findings.filter(f => f.type === DetectorType.PASSWORD)).toHaveLength(0);
        });
    });
    describe('Filtering by enabled types', () => {
        it('only detects enabled types', () => {
            const text = 'sk-abcdefghijklmnopqrstuvwxyz12345678901234567890 and AKIAIOSFODNN7EXAMPLE';
            const enabledTypes = new Set([DetectorType.API_KEY_OPENAI]);
            const findings = scanForApiKeys(text, enabledTypes);
            expect(findings.every(f => f.type === DetectorType.API_KEY_OPENAI)).toBe(true);
            expect(findings.some(f => f.type === DetectorType.API_KEY_AWS)).toBe(false);
        });
        it('returns all types when no filter specified', () => {
            const text = 'sk-abcdefghijklmnopqrstuvwxyz12345678901234567890 and AKIAIOSFODNN7EXAMPLE';
            const findings = scanForApiKeys(text);
            expect(findings.some(f => f.type === DetectorType.API_KEY_OPENAI)).toBe(true);
            expect(findings.some(f => f.type === DetectorType.API_KEY_AWS)).toBe(true);
        });
    });
    describe('Context extraction', () => {
        it('includes surrounding context in findings', () => {
            const text = 'Here is my API key: sk-abcdefghijklmnopqrstuvwxyz12345678901234567890 please keep it safe';
            const findings = scanForApiKeys(text);
            expect(findings[0].context).toBeDefined();
            expect(findings[0].context).toContain('Here is my API key');
        });
    });
    describe('Deduplication', () => {
        it('does not return duplicate findings', () => {
            const text = 'Key: sk-abcdefghijklmnopqrstuvwxyz12345678901234567890';
            // Call multiple times to ensure no state leakage
            const findings1 = scanForApiKeys(text);
            const findings2 = scanForApiKeys(text);
            expect(findings1).toHaveLength(findings2.length);
            expect(findings1.length).toBe(1);
        });
    });
    describe('Position tracking', () => {
        it('correctly tracks start and end positions', () => {
            const prefix = 'Key: ';
            const key = 'sk-abcdefghijklmnopqrstuvwxyz12345678901234567890';
            const text = prefix + key;
            const findings = scanForApiKeys(text);
            expect(findings[0].start).toBe(prefix.length);
            expect(findings[0].end).toBe(prefix.length + key.length);
        });
    });
});
describe('API_KEY_PATTERNS', () => {
    it('has unique pattern types', () => {
        const types = new Set(API_KEY_PATTERNS.map(p => `${p.type}:${p.name}`));
        // Multiple patterns can have same type (e.g., AWS access key vs secret key)
        // but the combination of type + name should be unique
        expect(types.size).toBe(API_KEY_PATTERNS.length);
    });
    it('all patterns have required fields', () => {
        for (const pattern of API_KEY_PATTERNS) {
            expect(pattern.type).toBeDefined();
            expect(pattern.name).toBeDefined();
            expect(pattern.pattern).toBeInstanceOf(RegExp);
            expect(pattern.baseConfidence).toBeGreaterThan(0);
            expect(pattern.baseConfidence).toBeLessThanOrEqual(1);
        }
    });
    it('all patterns have global flag', () => {
        for (const pattern of API_KEY_PATTERNS) {
            expect(pattern.pattern.flags).toContain('g');
        }
    });
});
//# sourceMappingURL=patterns.test.js.map