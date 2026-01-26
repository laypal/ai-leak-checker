/**
 * @file index.ts
 * @description Central export point for all shared type definitions.
 *
 * @version 1.0.0
 */

// Detection types - export DetectorType and SensitivityLevel as values (they're const objects)
// Export other types as type-only
export type {
  Finding,
  DetectionResult,
  DetectionSummary,
  ScanOptions,
  EntropyThresholds,
  RedactionStyle,
  PatternDefinition,
} from './detection';

// Export DetectorType and SensitivityLevel as values (needed for runtime use)
// The const objects also provide their types when imported
export {
  DetectorType,
  SensitivityLevel,
  DETECTOR_LABELS,
  DETECTOR_RISK_LEVEL,
  DEFAULT_SCAN_OPTIONS,
  DEFAULT_ENTROPY_THRESHOLDS,
  ENTROPY_THRESHOLDS,
  REDACTION_FORMATS,
  isDetectorType,
  getDetectorsByRisk,
} from './detection';

// Selector types
export type {
  SiteConfig,
  SelectorConfig,
  SelectorHealthResult,
} from './selectors';

export {
  CHATGPT_CONFIG,
  CLAUDE_CONFIG,
  BUNDLED_SELECTORS,
  getSiteConfig,
  isSupportedSite,
  getSupportedHostnames,
  checkSelectorHealth,
} from './selectors';

// Message types - export MessageType as value (it's a const object)
export type {
  BaseMessage,
  ScanRequestPayload,
  ScanResultPayload,
  ScanRequestMessage,
  ScanResultMessage,
  SettingsGetMessage,
  SettingsUpdatePayload,
  SettingsUpdateMessage,
  SettingsResetMessage,
  StatsGetMessage,
  StatsIncrementPayload,
  StatsIncrementMessage,
  StatsClearMessage,
  StatsExportMessage,
  SelectorGetPayload,
  SelectorGetMessage,
  SelectorUpdatePayload,
  SelectorUpdateMessage,
  SelectorHealthPayload,
  SelectorHealthMessage,
  SetFallbackBadgePayload,
  SetFallbackBadgeMessage,
  ExtensionReadyMessage,
  ContentScriptLoadedPayload,
  ContentScriptLoadedMessage,
  PopupOpenedMessage,
  UserActionPayload,
  UserActionMaskMessage,
  UserActionProceedMessage,
  UserActionCancelMessage,
  ExtensionMessage,
  MessageResponse,
  ResponseTypeMap,
  StatusMessage,
} from './messages';

// Export MessageType as value (needed for runtime use)
export {
  MessageType,
  generateCorrelationId,
  createMessage,
  createSuccessResponse,
  createErrorResponse,
  isMessageType,
} from './messages';

// Alias ExtensionMessage as Message for convenience
export type { ExtensionMessage as Message } from './messages';

// Storage types
export type {
  Settings,
  Stats,
  SelectorCache,
  StorageSchema,
  StorageKey,
  MigrationFn,
  MigrationRegistry,
  StatsExportRow,
} from './storage';

export {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  DEFAULT_STORAGE,
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEYS,
  statsToCSV,
  MIN_FALLBACK_DELAY_MS,
  MAX_FALLBACK_DELAY_MS,
} from './storage';

// Export STORAGE_SCHEMA_VERSION as alias for CURRENT_SCHEMA_VERSION
export { CURRENT_SCHEMA_VERSION as STORAGE_SCHEMA_VERSION } from './storage';
