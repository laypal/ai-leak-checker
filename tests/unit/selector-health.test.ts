/**
 * @fileoverview Unit tests for selector health validation.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkSelectorHealth, type SiteConfig } from '@/shared/types';

describe('Selector Health Validation', () => {
  let mockSiteConfig: SiteConfig;

  beforeEach(() => {
    // Create a mock site config
    mockSiteConfig = {
      enabled: true,
      name: 'Test Site',
      inputSelectors: ['#test-input', 'textarea'],
      submitSelectors: ['#test-submit', 'button[type="submit"]'],
      containerSelector: '#test-container',
      apiEndpoints: ['/api/test'],
      bodyExtractor: 'message',
      inputType: 'textarea',
      usesComposition: false,
    };

    // Clear document
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('False Negative Prevention', () => {
    it('should reject hidden textarea', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <textarea id="test-input" style="display: none;">Hidden</textarea>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(false);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(true);
    });

    it('should reject read-only input', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <textarea id="test-input" readonly>Read-only</textarea>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(false);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(true);
    });

    it('should reject disabled input', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <textarea id="test-input" disabled>Disabled</textarea>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(false);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(true);
    });

    it('should reject element outside container', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <button id="test-submit" type="submit">Submit</button>
        </div>
        <textarea id="test-input">Outside container</textarea>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(false);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(true);
    });

    it('should reject disabled button', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <textarea id="test-input">Test</textarea>
          <button id="test-submit" type="submit" disabled>Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(true);
      expect(result.submitFound).toBe(false);
      expect(result.containerFound).toBe(true);
    });

    it('should reject button outside container', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <textarea id="test-input">Test</textarea>
        </div>
        <button id="test-submit" type="submit">Submit</button>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(true);
      expect(result.submitFound).toBe(false);
      expect(result.containerFound).toBe(true);
    });

    it('should accept valid visible, editable input in container', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <textarea id="test-input">Test</textarea>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(true);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(true);
      expect(result.workingSelector).toBe('#test-input');
    });

    it('should accept contenteditable div when valid', () => {
      const contenteditableConfig: SiteConfig = {
        ...mockSiteConfig,
        inputSelectors: ['div[contenteditable="true"]'],
        inputType: 'contenteditable',
      };

      document.body.innerHTML = `
        <div id="test-container">
          <div contenteditable="true">Editable</div>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(contenteditableConfig);
      expect(result.inputFound).toBe(true);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(true);
    });

    it('should accept contenteditable with empty string value (HTML5 spec)', () => {
      const contenteditableConfig: SiteConfig = {
        ...mockSiteConfig,
        inputSelectors: ['div[contenteditable]'],
        inputType: 'contenteditable',
      };

      document.body.innerHTML = `
        <div id="test-container">
          <div contenteditable="">Editable (empty string = true per HTML5)</div>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(contenteditableConfig);
      expect(result.inputFound).toBe(true);
      expect(result.submitFound).toBe(true);
    });

    it('should accept bare contenteditable attribute (no value)', () => {
      const contenteditableConfig: SiteConfig = {
        ...mockSiteConfig,
        inputSelectors: ['div[contenteditable]'],
        inputType: 'contenteditable',
      };

      document.body.innerHTML = `
        <div id="test-container">
          <div contenteditable>Editable (bare attribute = true per HTML5)</div>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(contenteditableConfig);
      expect(result.inputFound).toBe(true);
      expect(result.submitFound).toBe(true);
    });

    it('should reject contenteditable="false"', () => {
      const contenteditableConfig: SiteConfig = {
        ...mockSiteConfig,
        inputSelectors: ['div[contenteditable]'],
        inputType: 'contenteditable',
      };

      document.body.innerHTML = `
        <div id="test-container">
          <div contenteditable="false">Not editable</div>
          <button id="test-submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(contenteditableConfig);
      expect(result.inputFound).toBe(false);
    });

    it('should handle missing container gracefully', () => {
      const configWithoutContainer: SiteConfig = {
        ...mockSiteConfig,
        containerSelector: '#non-existent',
      };

      document.body.innerHTML = `
        <textarea id="test-input">Test</textarea>
        <button id="test-submit" type="submit">Submit</button>
      `;

      const result = checkSelectorHealth(configWithoutContainer);
      // Should still find elements even if container not found
      expect(result.inputFound).toBe(true);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(false);
    });

    it('should reject zero-size element (hidden via CSS)', () => {
      document.body.innerHTML = `
        <div id="test-container">
          <textarea id="test-input" style="display: none;">Hidden</textarea>
          <button id="test-submit" type="submit">Submit</button>
        </div>
      `;

      const result = checkSelectorHealth(mockSiteConfig);
      expect(result.inputFound).toBe(false);
      expect(result.submitFound).toBe(true);
      expect(result.containerFound).toBe(true);
    });
  });
});
