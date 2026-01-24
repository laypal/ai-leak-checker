/**
 * @file messages.ts
 * @description Type definitions for inter-component messaging.
 *              Defines the protocol for communication between content scripts,
 *              service worker, and popup.
 *
 * @version 1.0.0
 */

import type { DetectionResult, DetectorType, ScanOptions } from './detection';
import type { SiteConfig } from './selectors';
import type { Settings, Stats } from './storage';

// =============================================================================
// Message Types
// =============================================================================

/**
 * All possible message types in the extension.
 * Const object for runtime access (allows MessageType.SCAN_REQUEST syntax)
 */
export const MessageType = {
  // Detection
  SCAN_REQUEST: 'SCAN_REQUEST',
  SCAN_RESULT: 'SCAN_RESULT',
  // Settings
  SETTINGS_GET: 'SETTINGS_GET',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  SETTINGS_RESET: 'SETTINGS_RESET',
  SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  // Stats
  STATS_GET: 'STATS_GET',
  STATS_INCREMENT: 'STATS_INCREMENT',
  STATS_CLEAR: 'STATS_CLEAR',
  STATS_EXPORT: 'STATS_EXPORT',
  // Selectors
  SELECTOR_GET: 'SELECTOR_GET',
  SELECTOR_UPDATE: 'SELECTOR_UPDATE',
  SELECTOR_HEALTH: 'SELECTOR_HEALTH',
  // Lifecycle
  EXTENSION_READY: 'EXTENSION_READY',
  CONTENT_SCRIPT_LOADED: 'CONTENT_SCRIPT_LOADED',
  POPUP_OPENED: 'POPUP_OPENED',
  // User Actions
  USER_ACTION_MASK: 'USER_ACTION_MASK',
  USER_ACTION_PROCEED: 'USER_ACTION_PROCEED',
  USER_ACTION_CANCEL: 'USER_ACTION_CANCEL',
  // Status (deprecated, use EXTENSION_READY)
  GET_STATUS: 'GET_STATUS',
  // Fallback Status
  SET_FALLBACK_BADGE: 'SET_FALLBACK_BADGE',
} as const;

/**
 * Type derived from the const object values.
 */
export type MessageType = typeof MessageType[keyof typeof MessageType];

// =============================================================================
// Base Message Structure
// =============================================================================

/**
 * Base message interface with metadata.
 */
export interface BaseMessage<T extends MessageType, P = unknown> {
  /** Message type identifier */
  type: T;

  /** Message payload */
  payload: P;

  /** Unix timestamp when message was created */
  timestamp: number;

  /** Unique identifier for request/response correlation */
  correlationId: string;

  /** Source component */
  source: 'content' | 'background' | 'popup' | 'injected';
}

// =============================================================================
// Detection Messages
// =============================================================================

export interface ScanRequestPayload {
  text: string;
  source: string;
  options?: ScanOptions;
}

export interface ScanResultPayload {
  result: DetectionResult;
  requestId: string;
}

export type ScanRequestMessage = BaseMessage<'SCAN_REQUEST', ScanRequestPayload>;
export type ScanResultMessage = BaseMessage<'SCAN_RESULT', ScanResultPayload>;

// =============================================================================
// Settings Messages
// =============================================================================

export type SettingsGetMessage = BaseMessage<'SETTINGS_GET', undefined>;

export interface SettingsUpdatePayload {
  settings: Partial<Settings>;
}

export type SettingsUpdateMessage = BaseMessage<'SETTINGS_UPDATE', SettingsUpdatePayload>;
export type SettingsUpdatedMessage = BaseMessage<'SETTINGS_UPDATED', SettingsUpdatePayload>;
export type SettingsResetMessage = BaseMessage<'SETTINGS_RESET', undefined>;

// =============================================================================
// Stats Messages
// =============================================================================

export type StatsGetMessage = BaseMessage<'STATS_GET', undefined>;

export interface StatsIncrementPayload {
  detectorType: DetectorType;
  site: string;
}

export type StatsIncrementMessage = BaseMessage<'STATS_INCREMENT', StatsIncrementPayload>;
export type StatsClearMessage = BaseMessage<'STATS_CLEAR', undefined>;
export type StatsExportMessage = BaseMessage<'STATS_EXPORT', undefined>;

// =============================================================================
// Selector Messages
// =============================================================================

export interface SelectorGetPayload {
  domain: string;
}

export type SelectorGetMessage = BaseMessage<'SELECTOR_GET', SelectorGetPayload>;

export interface SelectorUpdatePayload {
  config: SiteConfig;
  domain: string;
}

export type SelectorUpdateMessage = BaseMessage<'SELECTOR_UPDATE', SelectorUpdatePayload>;

export interface SelectorHealthPayload {
  domain: string;
  healthy: boolean;
  details: {
    inputFound: boolean;
    submitFound: boolean;
  };
}

export type SelectorHealthMessage = BaseMessage<'SELECTOR_HEALTH', SelectorHealthPayload>;

// =============================================================================
// Fallback Status Messages
// =============================================================================

/** Payload for SET_FALLBACK_BADGE message */
export interface SetFallbackBadgePayload {
  active: boolean;
}

export type SetFallbackBadgeMessage = BaseMessage<'SET_FALLBACK_BADGE', SetFallbackBadgePayload>;

// =============================================================================
// Lifecycle Messages
// =============================================================================

export type ExtensionReadyMessage = BaseMessage<'EXTENSION_READY', undefined>;

export interface ContentScriptLoadedPayload {
  domain: string;
  url: string;
  selectorHealth: boolean;
}

export type ContentScriptLoadedMessage = BaseMessage<
  'CONTENT_SCRIPT_LOADED',
  ContentScriptLoadedPayload
>;

export type PopupOpenedMessage = BaseMessage<'POPUP_OPENED', undefined>;

// =============================================================================
// User Action Messages
// =============================================================================

export interface UserActionPayload {
  correlationId: string;
  findings: number;
}

export type UserActionMaskMessage = BaseMessage<'USER_ACTION_MASK', UserActionPayload>;
export type UserActionProceedMessage = BaseMessage<'USER_ACTION_PROCEED', UserActionPayload>;
export type UserActionCancelMessage = BaseMessage<'USER_ACTION_CANCEL', UserActionPayload>;

// =============================================================================
// Union Types
// =============================================================================

/**
 * Union of all possible messages.
 */
export type StatusMessage = BaseMessage<'GET_STATUS', undefined>;

export type ExtensionMessage =
  | ScanRequestMessage
  | ScanResultMessage
  | SettingsGetMessage
  | SettingsUpdateMessage
  | SettingsUpdatedMessage
  | SettingsResetMessage
  | StatsGetMessage
  | StatsIncrementMessage
  | StatsClearMessage
  | StatsExportMessage
  | SelectorGetMessage
  | SelectorUpdateMessage
  | SelectorHealthMessage
  | ExtensionReadyMessage
  | ContentScriptLoadedMessage
  | PopupOpenedMessage
  | UserActionMaskMessage
  | UserActionProceedMessage
  | UserActionCancelMessage
  | StatusMessage;

// =============================================================================
// Response Types
// =============================================================================

/**
 * Generic response wrapper.
 */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId: string;
}

/**
 * Response type mapping.
 */
export interface ResponseTypeMap {
  SETTINGS_GET: Settings;
  STATS_GET: Stats;
  STATS_EXPORT: string; // CSV content
  SELECTOR_GET: SiteConfig | null;
  SCAN_REQUEST: DetectionResult;
}

// =============================================================================
// Message Utilities
// =============================================================================

/**
 * Generate a unique correlation ID.
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a typed message with required metadata.
 */
export function createMessage<T extends MessageType, P>(
  type: T,
  payload: P,
  source: BaseMessage<T, P>['source']
): BaseMessage<T, P> {
  return {
    type,
    payload,
    timestamp: Date.now(),
    correlationId: generateCorrelationId(),
    source,
  };
}

/**
 * Create a success response.
 */
export function createSuccessResponse<T>(
  data: T,
  correlationId: string
): MessageResponse<T> {
  return {
    success: true,
    data,
    correlationId,
  };
}

/**
 * Create an error response.
 */
export function createErrorResponse(
  error: string,
  correlationId: string
): MessageResponse {
  return {
    success: false,
    error,
    correlationId,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for message type.
 */
export function isMessageType<T extends MessageType>(
  message: ExtensionMessage,
  type: T
): message is Extract<ExtensionMessage, { type: T }> {
  return message.type === type;
}
