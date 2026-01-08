/**
 * @fileoverview Detection engine public API
 * @module detectors
 */

export { scan, quickCheck, describeFinding, DetectorType } from './engine';
export type { Finding, DetectionResult, ScanOptions } from './engine';
export { scanForApiKeys, API_KEY_PATTERNS } from './patterns';
export { scanForEmails, scanForUKPhones, scanForUKNationalInsurance, scanForUSSSN, scanForIBAN } from './pii';
