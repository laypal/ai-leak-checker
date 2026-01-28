/**
 * @file ai-leak-checker-scan.ts
 * @description Reusable fixtures for AI Leak Checker window.postMessage scan_request/scan_result tests.
 * @module tests/fixtures/ai-leak-checker-scan
 *
 * @dependencies
 * - None (plain data)
 *
 * @security
 * - Sensitive content uses synthetic placeholders or clearly fake strings; no real secrets.
 */

/** Content string that triggers sensitive-data detection (OpenAI key pattern). */
export const SENSITIVE_SCAN_CONTENT =
  'my email is john@gmail.com and api key is sk-134567890abcdef';

/** Content string that does not trigger detection. */
export const CLEAN_SCAN_CONTENT =
  'This is just a normal message with no sensitive data.';

/** Message ID used in fixtures. */
export const SCAN_MESSAGE_ID_SENSITIVE = 'test-456';
export const SCAN_MESSAGE_ID_CLEAN = 'test-789';
export const SCAN_MESSAGE_ID_GENERIC = 'test-123';

/** Full scan_request payload shape for sensitive-content scenario. */
export const aiLeakCheckerScanRequestSensitive = {
  type: 'AI_LEAK_CHECKER' as const,
  action: 'scan_request' as const,
  messageId: SCAN_MESSAGE_ID_SENSITIVE,
  content: SENSITIVE_SCAN_CONTENT,
};

/** Full scan_request payload for clean-content scenario. */
export const aiLeakCheckerScanRequestClean = {
  type: 'AI_LEAK_CHECKER' as const,
  action: 'scan_request' as const,
  messageId: SCAN_MESSAGE_ID_CLEAN,
  content: CLEAN_SCAN_CONTENT,
};

/** Generic scan_request payload (OpenAI key only) for reuse across tests. */
export const aiLeakCheckerScanRequestGeneric = {
  type: 'AI_LEAK_CHECKER' as const,
  action: 'scan_request' as const,
  messageId: SCAN_MESSAGE_ID_GENERIC,
  content: 'sk-test1234567890abcdefghijklmnop',
};
