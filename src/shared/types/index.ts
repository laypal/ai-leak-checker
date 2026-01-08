/**
 * @file index.ts
 * @description Central export point for all shared type definitions.
 *
 * @version 1.0.0
 */

// Detection types
export type {
  DetectorType,
  SensitivityLevel,
  Finding,
  DetectionResult,
  DetectionSummary,
  ScanOptions,
  EntropyThresholds,
  RedactionStyle,
  PatternDefinition,
} from './detection';

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

// Message types
export type {
  MessageType,
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
} from './messages';

export {
  generateCorrelationId,
  createMessage,
  createSuccessResponse,
  createErrorResponse,
  isMessageType,
} from './messages';

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
  CURRENT_SCHEMA_VERSION,
  DEFAULT_STORAGE,
  STORAGE_KEYS,
  statsToCSV,
} from './storage';
