/**
 * @file selectors.ts
 * @description Type definitions for site-specific selector configurations.
 *              Selectors are used to identify input fields and submit buttons
 *              on AI chat platforms for interception.
 *
 * @version 1.0.0
 */

// =============================================================================
// Site Configuration
// =============================================================================

/**
 * Configuration for a single AI chat site.
 */
export interface SiteConfig {
  /** Whether this site is enabled for detection */
  enabled: boolean;

  /** Human-readable site name */
  name: string;

  /** CSS selectors for the text input element (tried in order) */
  inputSelectors: string[];

  /** CSS selectors for the submit/send button (tried in order) */
  submitSelectors: string[];

  /** Parent container selector for MutationObserver */
  containerSelector: string;

  /** API endpoints to intercept (for fetch patching fallback) */
  apiEndpoints: string[];

  /** JSON path to extract prompt from request body */
  bodyExtractor: string;

  /** Input type: 'textarea' or 'contenteditable' */
  inputType: 'textarea' | 'contenteditable';

  /** Whether site uses composition events (for IME input) */
  usesComposition: boolean;

  /** Custom keyboard shortcut for submit (default: Enter) */
  submitKeyCombo?: {
    key: string;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  };
}

/**
 * Full selector configuration file structure.
 */
export interface SelectorConfig {
  /** Schema version for migrations */
  version: string;

  /** Last update timestamp (ISO 8601) */
  updated: string;

  /** Per-domain configurations */
  sites: Record<string, SiteConfig>;
}

// =============================================================================
// Default Configurations
// =============================================================================

/**
 * Default ChatGPT configuration.
 * Note: Selectors may need updates as OpenAI changes their UI.
 */
export const CHATGPT_CONFIG: SiteConfig = {
  enabled: true,
  name: 'ChatGPT',
  inputSelectors: [
    '#prompt-textarea',
    '[data-testid="text-input"]',
    'form textarea',
    'main textarea',
  ],
  submitSelectors: [
    'button[data-testid="send-button"]',
    'button[aria-label="Send prompt"]',
    'form button[type="submit"]',
  ],
  containerSelector: 'main',
  apiEndpoints: [
    '/backend-api/conversation',
    '/backend-anon/conversation',
  ],
  bodyExtractor: 'messages[0].content.parts[0]',
  inputType: 'textarea',
  usesComposition: true,
};

/**
 * Default Claude configuration.
 * Note: Claude uses contenteditable ProseMirror editor.
 */
export const CLAUDE_CONFIG: SiteConfig = {
  enabled: true,
  name: 'Claude',
  inputSelectors: [
    '[contenteditable="true"]',
    'div.ProseMirror',
    '[data-testid="message-input"]',
  ],
  submitSelectors: [
    'button[aria-label="Send message"]',
    'button[data-testid="send-button"]',
    'form button[type="submit"]',
  ],
  containerSelector: 'main',
  apiEndpoints: [
    '/api/organizations/*/chat_conversations/*/completion',
    '/api/append_message',
  ],
  bodyExtractor: 'prompt',
  inputType: 'contenteditable',
  usesComposition: true,
};

/**
 * Bundled default selector configuration.
 * Used as fallback when remote fetch fails.
 */
export const BUNDLED_SELECTORS: SelectorConfig = {
  version: '1.0.0',
  updated: '2026-01-07T00:00:00Z',
  sites: {
    'chat.openai.com': CHATGPT_CONFIG,
    'chatgpt.com': CHATGPT_CONFIG,
    'claude.ai': CLAUDE_CONFIG,
  },
};

// =============================================================================
// Selector Utilities
// =============================================================================

/**
 * Get site config for a given hostname.
 */
export function getSiteConfig(
  hostname: string,
  config: SelectorConfig = BUNDLED_SELECTORS
): SiteConfig | null {
  // Exact match
  if (config.sites[hostname]) {
    return config.sites[hostname];
  }

  // Try without 'www.' prefix
  const withoutWww = hostname.replace(/^www\./, '');
  if (config.sites[withoutWww]) {
    return config.sites[withoutWww];
  }

  return null;
}

/**
 * Check if a hostname is supported.
 */
export function isSupportedSite(
  hostname: string,
  config: SelectorConfig = BUNDLED_SELECTORS
): boolean {
  return getSiteConfig(hostname, config) !== null;
}

/**
 * Get list of all supported hostnames.
 */
export function getSupportedHostnames(
  config: SelectorConfig = BUNDLED_SELECTORS
): string[] {
  return Object.keys(config.sites).filter(
    (hostname): hostname is string => config.sites[hostname]?.enabled ?? false
  );
}

// =============================================================================
// Selector Health
// =============================================================================

/**
 * Result of selector health check.
 */
export interface SelectorHealthResult {
  site: string;
  inputFound: boolean;
  submitFound: boolean;
  containerFound: boolean;
  workingSelector: string | null;
  testedAt: string;
}

/**
 * Check if selectors are working on the current page.
 * Returns health status for monitoring.
 */
export function checkSelectorHealth(
  siteConfig: SiteConfig
): SelectorHealthResult {
  const result: SelectorHealthResult = {
    site: siteConfig.name,
    inputFound: false,
    submitFound: false,
    containerFound: false,
    workingSelector: null,
    testedAt: new Date().toISOString(),
  };

  // Check input selectors
  for (const selector of siteConfig.inputSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        result.inputFound = true;
        result.workingSelector = selector;
        break;
      }
    } catch {
      // Invalid selector, continue
    }
  }

  // Check submit selectors
  for (const selector of siteConfig.submitSelectors) {
    try {
      if (document.querySelector(selector)) {
        result.submitFound = true;
        break;
      }
    } catch {
      // Invalid selector, continue
    }
  }

  // Check container
  try {
    result.containerFound = !!document.querySelector(siteConfig.containerSelector);
  } catch {
    result.containerFound = false;
  }

  return result;
}
