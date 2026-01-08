/**
 * @fileoverview Detection engine public API
 * @module detectors
 */

export { scan, quickCheck, describeFinding } from './engine';
export { DetectorType } from '@/shared/types';
export type { Finding, DetectionResult, ScanOptions } from '@/shared/types';
export { scanForApiKeys, API_KEY_PATTERNS } from './patterns';
export { scanForEmails, scanForUKPhones, scanForUKNationalInsurance, scanForUSSSN, scanForIBAN } from './pii';
