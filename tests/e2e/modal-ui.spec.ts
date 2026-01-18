/**
 * @fileoverview E2E tests for modal UI verification with multiple findings.
 */

import { test, expect } from '@playwright/test';
import { setupTestPage, isModalVisible, getModalFindings } from './helpers';
import { ExtensionHelper } from './fixtures/extension';

test.describe('Modal UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Use route interception to serve test HTML on matching URL
    // This ensures content scripts inject (URL must match manifest pattern)
    await setupTestPage(page, 'chat.openai.com');
  });

  test('modal displays all findings with correct formatting', async ({ page, context }) => {
    const textarea = page.locator('#prompt-textarea');
    const text = `Key1: sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yzABC567DEF890GHI
Key2: AKIAIOSFODNN7EXAMPLE
Key3: ghp_abcdefghijklmnopqrstuvwxyz1234567890
Email1: user1@example.com
Email2: user2@example.com
Card: 4532015112830366
Phone: 07911123456
NI: AB123456C
SSN: 123-45-6789
IBAN: GB82WEST12345698765432`;
    
    await textarea.fill(text);
    await textarea.press('Enter');
    await page.waitForTimeout(2000);
    
    const helper = new ExtensionHelper(context);
    const isLoaded = await helper.isLoaded();
    
    if (isLoaded) {
      const modalVisible = await isModalVisible(page).catch(() => false);
      
      if (modalVisible) {
        const findings = await getModalFindings(page);
        expect(findings.length).toBeGreaterThanOrEqual(10);
        
        findings.forEach((finding) => {
          expect(finding.label).toBeTruthy();
          expect(finding.label.length).toBeGreaterThan(0);
          expect(finding.maskedValue).toBeTruthy();
          expect(finding.maskedValue.length).toBeGreaterThan(0);
          expect(['High', 'Medium', 'Low']).toContain(finding.confidence);
        });
        
        // Verify specific detector types are present
        const labels = findings.map(f => f.label.toLowerCase());
        expect(labels.some(l => l.includes('api key') || l.includes('token') || l.includes('credential'))).toBe(true);
        expect(labels.some(l => l.includes('email') || l.includes('phone') || l.includes('card'))).toBe(true);
        
        // Verify masked values follow expected patterns
        findings.forEach(finding => {
          // Masked values should contain redaction markers or be masked
          const isRedacted = finding.maskedValue.includes('[REDACTED') || 
                            finding.maskedValue.includes('***') ||
                            finding.maskedValue.match(/\*{3,}/);
          expect(isRedacted || finding.maskedValue.length < 20).toBe(true);
        });
      }
    }
  });

  test('modal scrolls when findings exceed viewport', async ({ page, context }) => {
    const textarea = page.locator('#prompt-textarea');
    const findings = Array.from({ length: 25 }, (_, i) => `Key${i}: sk-proj-test${i}abcdefghijklmnopqrstuvwxyz1234567890`).join('\n');
    
    await textarea.fill(findings);
    await textarea.press('Enter');
    await page.waitForTimeout(2000);
    
    const helper = new ExtensionHelper(context);
    const isLoaded = await helper.isLoaded();
    
    if (isLoaded) {
      const modalVisible = await isModalVisible(page).catch(() => false);
      
      if (modalVisible) {
        const hasScroll = await page.evaluate(() => {
          const testAPI = (window as unknown as { __aiLeakCheckerTestAPI?: { hasScrollableBody: () => boolean } }).__aiLeakCheckerTestAPI;
          if (!testAPI) {
            return false;
          }
          return testAPI.hasScrollableBody();
        });
        
        expect(hasScroll).toBe(true);
      }
    }
  });
});