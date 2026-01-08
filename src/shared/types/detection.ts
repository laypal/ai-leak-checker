/**
 * @file detection.ts
 * @description Core type definitions for the detection engine.
 *              Defines findings, results, and configuration types.
 *
 * @version 1.0.0
 */

// =============================================================================
// Detector Types
// =============================================================================

/**
 * Supported detector types for sensitive data identification.
 * Each type corresponds to a specific detection pattern or algorithm.
 * 
 * Usage:
 *   DetectorType.API_KEY_OPENAI  // Get the string value
 *   type MyType = DetectorType   // Use as a type
 */

// Const object for runtime access (allows DetectorType.API_KEY_OPENAI syntax)
export const DetectorType = {
  // API Keys - High Confidence (prefix-based)
  API_KEY_OPENAI: 'api_key_openai',
  API_KEY_AWS: 'api_key_aws',
  API_KEY_GITHUB: 'api_key_github',
  API_KEY_STRIPE: 'api_key_stripe',
  API_KEY_SLACK: 'api_key_slack',
  API_KEY_GOOGLE: 'api_key_google',
  API_KEY_ANTHROPIC: 'api_key_anthropic',
  API_KEY_SENDGRID: 'api_key_sendgrid',
  API_KEY_TWILIO: 'api_key_twilio',
  API_KEY_MAILCHIMP: 'api_key_mailchimp',
  API_KEY_HEROKU: 'api_key_heroku',
  API_KEY_NPM: 'api_key_npm',
  API_KEY_PYPI: 'api_key_pypi',
  API_KEY_DOCKER: 'api_key_docker',
  API_KEY_SUPABASE: 'api_key_supabase',
  API_KEY_FIREBASE: 'api_key_firebase',
  // API Keys - Medium Confidence (entropy-based)
  API_KEY_GENERIC: 'api_key_generic',
  // Secrets
  PRIVATE_KEY: 'private_key',
  PASSWORD: 'password',
  // Financial
  CREDIT_CARD: 'credit_card',
  IBAN: 'iban',
  // PII
  EMAIL: 'email',
  PHONE_UK: 'phone_uk',
  UK_NI_NUMBER: 'uk_ni_number',
  US_SSN: 'us_ssn',
  // Generic
  HIGH_ENTROPY: 'high_entropy',
} as const;

// Type derived from the const object values
export type DetectorType = typeof DetectorType[keyof typeof DetectorType];

/**
 * Human-readable labels for detector types.
 */
export const DETECTOR_LABELS: Record<DetectorType, string> = {
  [DetectorType.API_KEY_OPENAI]: 'OpenAI API Key',
  [DetectorType.API_KEY_AWS]: 'AWS Credentials',
  [DetectorType.API_KEY_GITHUB]: 'GitHub Token',
  [DetectorType.API_KEY_STRIPE]: 'Stripe API Key',
  [DetectorType.API_KEY_SLACK]: 'Slack Token',
  [DetectorType.API_KEY_GOOGLE]: 'Google API Key',
  [DetectorType.API_KEY_ANTHROPIC]: 'Anthropic API Key',
  [DetectorType.API_KEY_SENDGRID]: 'SendGrid API Key',
  [DetectorType.API_KEY_TWILIO]: 'Twilio Credentials',
  [DetectorType.API_KEY_MAILCHIMP]: 'Mailchimp API Key',
  [DetectorType.API_KEY_HEROKU]: 'Heroku API Key',
  [DetectorType.API_KEY_NPM]: 'npm Access Token',
  [DetectorType.API_KEY_PYPI]: 'PyPI API Token',
  [DetectorType.API_KEY_DOCKER]: 'Docker Hub Token',
  [DetectorType.API_KEY_SUPABASE]: 'Supabase API Key',
  [DetectorType.API_KEY_FIREBASE]: 'Firebase API Key',
  [DetectorType.API_KEY_GENERIC]: 'Possible API Key',
  [DetectorType.PRIVATE_KEY]: 'Private Key',
  [DetectorType.PASSWORD]: 'Password',
  [DetectorType.CREDIT_CARD]: 'Credit Card Number',
  [DetectorType.IBAN]: 'Bank Account (IBAN)',
  [DetectorType.EMAIL]: 'Email Address',
  [DetectorType.PHONE_UK]: 'UK Phone Number',
  [DetectorType.UK_NI_NUMBER]: 'UK National Insurance Number',
  [DetectorType.US_SSN]: 'US Social Security Number',
  [DetectorType.HIGH_ENTROPY]: 'High-Entropy Secret',
};

/**
 * Risk levels associated with detector types.
 */
export const DETECTOR_RISK_LEVEL: Record<DetectorType, 'critical' | 'high' | 'medium' | 'low'> = {
  [DetectorType.API_KEY_OPENAI]: 'critical',
  [DetectorType.API_KEY_AWS]: 'critical',
  [DetectorType.API_KEY_GITHUB]: 'critical',
  [DetectorType.API_KEY_STRIPE]: 'critical',
  [DetectorType.API_KEY_SLACK]: 'high',
  [DetectorType.API_KEY_GOOGLE]: 'high',
  [DetectorType.API_KEY_ANTHROPIC]: 'critical',
  [DetectorType.API_KEY_SENDGRID]: 'high',
  [DetectorType.API_KEY_TWILIO]: 'high',
  [DetectorType.API_KEY_MAILCHIMP]: 'medium',
  [DetectorType.API_KEY_HEROKU]: 'high',
  [DetectorType.API_KEY_NPM]: 'high',
  [DetectorType.API_KEY_PYPI]: 'high',
  [DetectorType.API_KEY_DOCKER]: 'high',
  [DetectorType.API_KEY_SUPABASE]: 'high',
  [DetectorType.API_KEY_FIREBASE]: 'high',
  [DetectorType.API_KEY_GENERIC]: 'medium',
  [DetectorType.PRIVATE_KEY]: 'critical',
  [DetectorType.PASSWORD]: 'high',
  [DetectorType.CREDIT_CARD]: 'critical',
  [DetectorType.IBAN]: 'high',
  [DetectorType.EMAIL]: 'medium',
  [DetectorType.PHONE_UK]: 'medium',
  [DetectorType.UK_NI_NUMBER]: 'high',
  [DetectorType.US_SSN]: 'critical',
  [DetectorType.HIGH_ENTROPY]: 'medium',
};

// =============================================================================
// Finding Types
// =============================================================================

/**
 * Represents a single detected sensitive data item.
 */
export interface Finding {
  /** Type of sensitive data detected */
  type: DetectorType;

  /** Original matched value (for internal use only - never log/transmit) */
  value: string;

  /** Start position in original text */
  start: number;

  /** End position in original text */
  end: number;

  /** Confidence score from 0.0 to 1.0 */
  confidence: number;

  /** Surrounding context snippet (optional) */
  context?: string;

  /** Additional metadata (e.g., card issuer, entropy value) */
  metadata?: Record<string, unknown>;
}

/**
 * Summary statistics for detection results.
 */
export interface DetectionSummary {
  /** Total number of findings */
  total: number;

  /** Count by detector type */
  byType: Record<string, number>;

  /** Highest confidence score */
  highestConfidence: number;
}

/**
 * Result of a detection scan operation.
 */
export interface DetectionResult {
  /** Whether any sensitive data was detected */
  hasSensitiveData: boolean;

  /** All findings from the scan */
  findings: Finding[];

  /** Summary statistics */
  summary: DetectionSummary;

  /** Time taken to scan in milliseconds */
  scanTime: number;

  /** Number of characters scanned */
  textLength: number;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Sensitivity level enum-like object for convenient access.
 */
export const SensitivityLevel = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
} as const;

/**
 * Sensitivity level type derived from the const object.
 */
export type SensitivityLevel = typeof SensitivityLevel[keyof typeof SensitivityLevel];

/**
 * Options for configuring a detection scan.
 */
export interface ScanOptions {
  /** Specific detectors to enable (default: all). Can be Set or Record */
  enabledDetectors?: Set<DetectorType> | Record<DetectorType, boolean>;

  /** Sensitivity level affecting thresholds */
  sensitivityLevel?: SensitivityLevel;

  /** Maximum findings to return (default: 50) */
  maxResults?: number;

  /** Whether to include context in findings (default: true) */
  includeContext?: boolean;

  /** Size of context window (default: 50) */
  contextSize?: number;

  /** Domains to filter out (for email detection) */
  filterDomains?: string[];

  /** Minimum confidence threshold (0.0-1.0) */
  minConfidence?: number;

  /** User-defined strings to ignore (allowlist) */
  allowlist?: string[];
}

/**
 * Default scan options.
 */
export const DEFAULT_SCAN_OPTIONS: Required<Omit<ScanOptions, 'enabledDetectors'>> & { enabledDetectors: Set<DetectorType> } = {
  enabledDetectors: new Set(Object.values(DetectorType)),
  sensitivityLevel: SensitivityLevel.MEDIUM,
  maxResults: 50,
  includeContext: true,
  contextSize: 50,
  filterDomains: ['example.com', 'test.com', 'localhost'],
  minConfidence: 0.5,
  allowlist: [],
};

// =============================================================================
// Entropy Configuration
// =============================================================================

/**
 * Thresholds for entropy-based detection.
 */
export interface EntropyThresholds {
  /** Minimum string length to analyze */
  minLength: number;

  /** Maximum string length to analyze */
  maxLength: number;

  /** Threshold for suspicious (lowest confidence) */
  suspicious: number;

  /** Threshold for likely matches */
  likely: number;

  /** Threshold for definite matches */
  definite: number;
}

/**
 * Default entropy thresholds.
 * Shannon entropy for random alphanumeric (62 chars) is ~5.95.
 */
export const DEFAULT_ENTROPY_THRESHOLDS: EntropyThresholds = {
  minLength: 16,
  maxLength: 128,
  suspicious: 3.5,
  likely: 4.0,
  definite: 4.5,
};

/**
 * Alias for backward compatibility and convenience.
 */
export const ENTROPY_THRESHOLDS = DEFAULT_ENTROPY_THRESHOLDS;

// =============================================================================
// Redaction Types
// =============================================================================

/**
 * Redaction style options.
 */
export type RedactionStyle = 'marker' | 'mask' | 'remove' | 'hash';

/**
 * Redaction format templates.
 */
export const REDACTION_FORMATS: Record<'bracket' | 'asterisk' | 'placeholder', (type: DetectorType) => string> = {
  bracket: (type) => `[REDACTED_${type.toUpperCase()}]`,
  asterisk: (type) => `***${DETECTOR_LABELS[type]}***`,
  placeholder: () => '████████',
};

// =============================================================================
// Pattern Types
// =============================================================================

/**
 * Defines a regex pattern for detection.
 */
export interface PatternDefinition {
  /** Unique identifier */
  id: DetectorType;

  /** Human-readable name */
  name: string;

  /** Regex pattern */
  pattern: RegExp;

  /** Additional validation function (optional) */
  validator?: (match: string) => boolean;

  /** Base confidence when pattern matches */
  baseConfidence: number;

  /** Whether to require context keywords */
  requiresContext: boolean;

  /** Context keywords that boost confidence */
  contextKeywords?: string[];
}

// =============================================================================
// Export Utilities
// =============================================================================

/**
 * Type guard to check if a string is a valid DetectorType.
 */
export function isDetectorType(value: string): value is DetectorType {
  return value in DETECTOR_LABELS;
}

/**
 * Get all detector types in a specific risk category.
 */
export function getDetectorsByRisk(
  risk: 'critical' | 'high' | 'medium' | 'low'
): DetectorType[] {
  return (Object.entries(DETECTOR_RISK_LEVEL) as [DetectorType, string][])
    .filter(([, level]) => level === risk)
    .map(([type]) => type);
}
