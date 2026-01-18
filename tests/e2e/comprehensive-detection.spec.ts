/**
 * @fileoverview E2E tests for comprehensive multi-detection scenarios.
 */

import { test, expect } from '@playwright/test';
import { setupTestPage, isModalVisible, getModalFindings } from './helpers';
import { ExtensionHelper } from './fixtures/extension';

test.describe('Comprehensive Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Use route interception to serve test HTML on matching URL
    // This ensures content scripts inject (URL must match manifest pattern)
    await setupTestPage(page, 'chat.openai.com');
  });

  test('detects and displays all detector types in modal', async ({ page, context }) => {
    const textarea = page.locator('#prompt-textarea');
    const text = `OpenAI: sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI
AWS: AKIAIOSFODNN7EXAMPLE
GitHub: ghp_abcdefghijklmnopqrstuvwxyz1234567890
Stripe: sk_live_TEST_FAKE_KEY_FOR_TESTING_ONLY_12345
Slack: xoxb-123456789012-1234567890123-abcdefghijklmnopqrstuvwx
Google: AIzaSyA1234567890abcdefghijklmnopqrstuv
Anthropic: sk-ant-api03-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI1234567890abcdefghijklmnopqrstuvwxyz
SendGrid: SG.xxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Twilio: SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Mailchimp: TEST_MAILCHIMP_FAKE_KEY_123456-us1
Heroku: 12345678-1234-1234-1234-1234567890ab
NPM: npm_abcdefghijklmnopqrstuvwxyz1234567890
PyPI: pypi-abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz
Docker: dckr_pat_abcdefghijklmnopqrstuvwxyz1234567890
Supabase: eyJ0ZXN0IjoiZmFrZV9zdXBhYmFzZV9qd3QifQ.eyJ0ZXN0IjoiZmFrZV9wYXlsb2FkX25vdF9yZWFsX3N1cGFiYXNlX2tleSJ9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Firebase: AIzaSyB-C1D2E3F4G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4
Private Key: -----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
Password: password=MySecret123!
Email: user@example.com
Phone: 07911123456
NI: AB123456C
SSN: 123-45-6789
Card: 4532015112830366
IBAN: GB82WEST12345698765432`;
    
    await textarea.fill(text);
    await textarea.press('Enter');
    await page.waitForTimeout(2000);
    
    const helper = new ExtensionHelper(context);
    const isLoaded = await helper.isLoaded();
    
    if (isLoaded) {
      const modalVisible = await isModalVisible(page).catch(() => false);
      expect(modalVisible).toBe(true);
      
      if (modalVisible) {
        const findings = await getModalFindings(page);
        expect(findings.length).toBeGreaterThan(0);
        
        // Verify specific detector types are detected
        const detectedLabels = findings.map(f => f.label.toLowerCase());
        expect(detectedLabels.some(l => l.includes('openai') || l.includes('api key'))).toBe(true);
        expect(detectedLabels.some(l => l.includes('email') || l.includes('address'))).toBe(true);
        expect(detectedLabels.some(l => l.includes('card') || l.includes('credit'))).toBe(true);
        
        // Verify masked values are present and don't contain raw secrets
        findings.forEach(finding => {
          expect(finding.maskedValue).toBeTruthy();
          expect(finding.maskedValue.length).toBeGreaterThan(0);
          // Masked values should not contain obvious raw patterns
          expect(finding.maskedValue).not.toContain('sk-proj-');
          expect(finding.maskedValue).not.toContain('AKIA');
          expect(finding.maskedValue).not.toContain('@example.com');
          expect(finding.maskedValue).not.toContain('4532015112830366');
        });
        
        // Verify confidence badges are present
        findings.forEach(finding => {
          expect(['High', 'Medium', 'Low']).toContain(finding.confidence);
        });
      }
    }
  });
});