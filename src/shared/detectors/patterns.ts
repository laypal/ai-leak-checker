/**
 * @fileoverview Pattern definitions for API key and token detection
 * @module detectors/patterns
 * 
 * Defines regex patterns for identifying API keys, tokens, and secrets
 * from major cloud providers and services.
 */

import { DetectorType, type Finding } from '@/shared/types';

/**
 * Pattern definition for a specific API key type
 */
export interface PatternDefinition {
  /** Unique identifier matching DetectorType */
  type: DetectorType;
  /** Human-readable name */
  name: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Base confidence level for matches (0-1) */
  baseConfidence: number;
  /** Optional validation function for additional checks */
  validate?: (match: string) => boolean;
  /** Keywords that boost confidence when nearby */
  contextKeywords?: string[];
}

/**
 * API Key patterns for major providers.
 * Ordered by specificity (most specific first).
 */
export const API_KEY_PATTERNS: PatternDefinition[] = [
  // OpenAI - supports sk-, sk-proj-, and sk-admin- variants
  // Pattern is permissive per OpenAI guidance (keys are opaque), but validation
  // requires minimum length to reduce false positives from placeholders
  {
    type: DetectorType.API_KEY_OPENAI,
    name: 'OpenAI API Key',
    pattern: /\bsk-(?:proj-|admin-)?[A-Za-z0-9_-]+\b/g,
    baseConfidence: 0.95,
    validate: (match) => {
      // Require minimum 20 chars total to filter out placeholders like "sk-abc"
      // Real OpenAI keys are significantly longer
      return match.length >= 20;
    },
    contextKeywords: ['openai', 'gpt', 'chatgpt', 'api_key', 'OPENAI_API_KEY'],
  },

  // AWS Access Key ID
  {
    type: DetectorType.API_KEY_AWS,
    name: 'AWS Access Key ID',
    pattern: /\b(A3T[A-Z0-9]|AKIA|ABIA|ACCA|AGPA|AIDA|AIPA|ANPA|ANVA|APKA|AROA|ASCA|ASIA)[A-Z0-9]{16}\b/g,
    baseConfidence: 0.95,
    contextKeywords: ['aws', 'amazon', 'access_key', 'AWS_ACCESS_KEY_ID', 's3', 'ec2'],
  },

  // AWS Secret Access Key
  {
    type: DetectorType.API_KEY_AWS,
    name: 'AWS Secret Access Key',
    pattern: /\b[A-Za-z0-9/+=]{40}\b/g,
    baseConfidence: 0.5, // Lower confidence - needs context
    validate: (match) => {
      // Must contain mix of upper, lower, and special chars
      return /[a-z]/.test(match) && /[A-Z]/.test(match) && /[/+=]/.test(match);
    },
    contextKeywords: ['aws', 'secret_access_key', 'AWS_SECRET_ACCESS_KEY', 'amazon'],
  },

  // GitHub Personal Access Token (classic)
  {
    type: DetectorType.API_KEY_GITHUB,
    name: 'GitHub Personal Access Token',
    pattern: /\bghp_[A-Za-z0-9]{36}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['github', 'git', 'token', 'GITHUB_TOKEN'],
  },

  // GitHub Fine-grained PAT
  {
    type: DetectorType.API_KEY_GITHUB,
    name: 'GitHub Fine-grained PAT',
    pattern: /\bgithub_pat_[A-Za-z0-9_-]{50,}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['github', 'pat', 'token'],
  },

  // GitHub OAuth App Token
  {
    type: DetectorType.API_KEY_GITHUB,
    name: 'GitHub OAuth Token',
    pattern: /\bgho_[A-Za-z0-9]{36}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['github', 'oauth', 'token'],
  },

  // GitHub App Token
  {
    type: DetectorType.API_KEY_GITHUB,
    name: 'GitHub App Token',
    pattern: /\b(ghu|ghs)_[A-Za-z0-9]{36}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['github', 'app', 'token'],
  },

  // Stripe API Keys
  {
    type: DetectorType.API_KEY_STRIPE,
    name: 'Stripe API Key',
    pattern: /\b(sk|pk|rk)_(test|live)_[A-Za-z0-9]{24,}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['stripe', 'payment', 'api_key', 'STRIPE_SECRET_KEY'],
  },

  // Slack Bot Token
  {
    type: DetectorType.API_KEY_SLACK,
    name: 'Slack Bot Token',
    pattern: /\bxoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['slack', 'bot', 'token', 'SLACK_BOT_TOKEN'],
  },

  // Slack User Token
  {
    type: DetectorType.API_KEY_SLACK,
    name: 'Slack User Token',
    pattern: /\bxoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{32}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['slack', 'user', 'token'],
  },

  // Slack App Token
  {
    type: DetectorType.API_KEY_SLACK,
    name: 'Slack App Token',
    pattern: /\bxapp-[0-9]+-[A-Za-z0-9]+-[0-9]+-[A-Za-z0-9]+\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['slack', 'app', 'token'],
  },

  // Google API Key
  {
    type: DetectorType.API_KEY_GOOGLE,
    name: 'Google API Key',
    pattern: /\bAIza[A-Za-z0-9_-]{35}\b/g,
    baseConfidence: 0.95,
    contextKeywords: ['google', 'gcp', 'api_key', 'GOOGLE_API_KEY'],
  },

  // Google OAuth Client Secret
  {
    type: DetectorType.API_KEY_GOOGLE,
    name: 'Google OAuth Secret',
    pattern: /\bGOCspx-[A-Za-z0-9_-]{24,}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['google', 'oauth', 'client_secret'],
  },

  // Anthropic API Key
  {
    type: DetectorType.API_KEY_ANTHROPIC,
    name: 'Anthropic API Key',
    pattern: /\bsk-ant-api[0-9]{2}-[A-Za-z0-9_-]{93}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['anthropic', 'claude', 'api_key', 'ANTHROPIC_API_KEY'],
  },

  // SendGrid API Key
  {
    type: DetectorType.API_KEY_SENDGRID,
    name: 'SendGrid API Key',
    pattern: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['sendgrid', 'email', 'SENDGRID_API_KEY'],
  },

  // Twilio API Key
  {
    type: DetectorType.API_KEY_TWILIO,
    name: 'Twilio API Key',
    pattern: /\bSK[A-Za-z0-9]{32}\b/g,
    baseConfidence: 0.9,
    contextKeywords: ['twilio', 'sms', 'TWILIO_API_KEY'],
  },

  // Twilio Account SID
  {
    type: DetectorType.API_KEY_TWILIO,
    name: 'Twilio Account SID',
    pattern: /\bAC[A-Za-z0-9]{32}\b/g,
    baseConfidence: 0.9,
    contextKeywords: ['twilio', 'account', 'TWILIO_ACCOUNT_SID'],
  },

  // Mailchimp API Key
  {
    type: DetectorType.API_KEY_MAILCHIMP,
    name: 'Mailchimp API Key',
    pattern: /\b[A-Za-z0-9]{32}-us[0-9]{1,2}\b/g,
    baseConfidence: 0.85,
    contextKeywords: ['mailchimp', 'email', 'MAILCHIMP_API_KEY'],
  },

  // Heroku API Key
  {
    type: DetectorType.API_KEY_HEROKU,
    name: 'Heroku API Key',
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g,
    baseConfidence: 0.4, // UUID format - needs strong context
    contextKeywords: ['heroku', 'HEROKU_API_KEY'],
  },

  // npm Token
  {
    type: DetectorType.API_KEY_NPM,
    name: 'npm Access Token',
    pattern: /\bnpm_[A-Za-z0-9]{36}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['npm', 'npmrc', 'NPM_TOKEN'],
  },

  // PyPI Token
  {
    type: DetectorType.API_KEY_PYPI,
    name: 'PyPI API Token',
    pattern: /\bpypi-[A-Za-z0-9_-]{50,}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['pypi', 'pip', 'PYPI_TOKEN'],
  },

  // Docker Hub Token
  {
    type: DetectorType.API_KEY_DOCKER,
    name: 'Docker Hub Token',
    pattern: /\bdckr_pat_[A-Za-z0-9_-]{27}\b/g,
    baseConfidence: 0.98,
    contextKeywords: ['docker', 'DOCKER_TOKEN'],
  },

  // Supabase API Key
  {
    type: DetectorType.API_KEY_SUPABASE,
    name: 'Supabase API Key',
    pattern: /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    baseConfidence: 0.7, // JWT format - needs context
    validate: (match) => match.length > 100, // Supabase JWTs are long
    contextKeywords: ['supabase', 'SUPABASE_KEY', 'anon', 'service_role'],
  },

  // Firebase
  {
    type: DetectorType.API_KEY_FIREBASE,
    name: 'Firebase API Key',
    pattern: /\bAIza[A-Za-z0-9_-]{35}\b/g,
    baseConfidence: 0.85, // Same as Google API key
    contextKeywords: ['firebase', 'firestore', 'FIREBASE_API_KEY'],
  },

  // Private Key (generic PEM)
  {
    type: DetectorType.PRIVATE_KEY,
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    baseConfidence: 0.99,
    contextKeywords: ['private', 'key', 'pem', 'ssh'],
  },

  // Generic Secret/Password in config
  {
    type: DetectorType.PASSWORD,
    name: 'Password in Config',
    pattern: /(?:password|passwd|pwd|secret|token|api_key|apikey|auth)\s*[:=]\s*['"]?([^'"\s]{8,})['"]?/gi,
    baseConfidence: 0.6,
    validate: (match) => {
      // Exclude common placeholders
      const placeholders = ['your_', 'xxx', 'placeholder', 'example', 'changeme', '<', '${'];
      return !placeholders.some(p => match.toLowerCase().includes(p));
    },
    contextKeywords: [],
  },
];

/**
 * Context keywords that boost confidence when found near a match.
 * Shared across all detectors.
 */
export const CONTEXT_BOOST_KEYWORDS = [
  'api_key', 'apikey', 'api-key',
  'secret', 'token', 'password', 'passwd', 'pwd',
  'credential', 'auth', 'authorization',
  'private', 'access_key', 'secret_key',
  'bearer', 'oauth', 'jwt',
  'connection_string', 'conn_str',
  'database_url', 'db_url',
];

/**
 * Context keywords that reduce confidence (likely false positive).
 */
export const CONTEXT_REDUCE_KEYWORDS = [
  'example', 'sample', 'test', 'demo', 'fake', 'dummy',
  'placeholder', 'your_', 'xxx', 'redacted',
  'documentation', 'docs', 'readme',
];

/**
 * Scan text for API key patterns.
 * 
 * @param text - Text to scan
 * @param enabledTypes - Set of enabled detector types (if undefined, all enabled)
 * @returns Array of findings
 */
export function scanForApiKeys(
  text: string,
  enabledTypes?: Set<DetectorType>
): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>(); // Dedupe overlapping matches

  for (const patternDef of API_KEY_PATTERNS) {
    // Skip if detector type is disabled
    if (enabledTypes && !enabledTypes.has(patternDef.type)) {
      continue;
    }

    // Reset regex state for global patterns
    patternDef.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = patternDef.pattern.exec(text)) !== null) {
      const value = match[0];
      const key = `${patternDef.type}:${match.index}:${value}`;

      // Skip duplicates
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      // Run additional validation if defined
      if (patternDef.validate && !patternDef.validate(value)) {
        continue;
      }

      findings.push({
        type: patternDef.type,
        value,
        start: match.index,
        end: match.index + value.length,
        confidence: patternDef.baseConfidence,
        context: extractContext(text, match.index, value.length),
      });
    }
  }

  return findings;
}

/**
 * Extract surrounding context for a match.
 */
function extractContext(text: string, start: number, length: number, contextSize: number = 50): string {
  const contextStart = Math.max(0, start - contextSize);
  const contextEnd = Math.min(text.length, start + length + contextSize);
  return text.slice(contextStart, contextEnd);
}
