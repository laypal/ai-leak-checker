/**
 * @fileoverview Service worker for AI Leak Checker extension
 * @module background
 * 
 * Handles message routing, storage management, and badge updates.
 * Runs as a MV3 service worker with no persistent state.
 */

import {
  type ExtensionMessage,
  type Settings,
  type Stats,
  type StorageSchema,
  type StatsIncrementPayload,
  type SettingsUpdatePayload,
  MessageType,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  CURRENT_SCHEMA_VERSION,
  isMessageType,
} from '@/shared/types';

/**
 * Initialize the service worker.
 */
async function initialize(): Promise<void> {
  console.log('[AI Leak Checker] Service worker initialized');

  // Ensure storage is initialized with defaults
  await initializeStorage();

  // Set up badge
  await updateBadge();
}

/**
 * Initialize storage with default values if not present.
 */
async function initializeStorage(): Promise<void> {
  const storage = await chrome.storage.local.get(['schemaVersion', 'settings', 'stats']);

  // Check if migration is needed
  if (storage.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    console.log('[AI Leak Checker] Migrating storage schema...');
    await migrateStorage(storage.schemaVersion ?? 0);
  }

  // Initialize settings if not present
  if (!storage.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  // Initialize stats if not present
  if (!storage.stats) {
    await chrome.storage.local.set({ stats: DEFAULT_STATS });
  }
}

/**
 * Migrate storage from old schema versions.
 */
async function migrateStorage(fromVersion: number): Promise<void> {
  // Future migrations would go here
  // For now, just set the current version
    await chrome.storage.local.set({ schemaVersion: CURRENT_SCHEMA_VERSION });
    console.log(`[AI Leak Checker] Migrated storage from v${fromVersion} to v${CURRENT_SCHEMA_VERSION}`);
}

/**
 * Handle messages from content scripts and popup.
 */
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse): boolean => {
    // Handle async responses
    handleMessage(message, sender)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error('[AI Leak Checker] Message handler error:', error);
        sendResponse({ error: error.message });
      });

    // Return true to indicate async response
    return true;
  }
);

/**
 * Validate message structure and type.
 */
function validateMessage(message: unknown): message is ExtensionMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  const msg = message as Record<string, unknown>;
  
  // Check for required fields
  if (typeof msg.type !== 'string') {
    return false;
  }
  
  // Validate message type is known
  if (!Object.values(MessageType).includes(msg.type as MessageType)) {
    return false;
  }
  
  // Payload is optional for some message types, but must exist if present
  if ('payload' in msg && msg.payload === undefined) {
    return false;
  }
  
  return true;
}

/**
 * Process incoming messages.
 */
async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  // Validate message structure
  if (!validateMessage(message)) {
    console.error('[AI Leak Checker] Invalid message structure:', message);
    return { error: 'Invalid message structure' };
  }

  switch (message.type) {
    case MessageType.SETTINGS_GET:
      return getSettings();

    case MessageType.SETTINGS_UPDATE: {
      // Extract settings from payload: SettingsUpdatePayload = { settings: Partial<Settings> }
      const payload = message.payload as SettingsUpdatePayload;
      if (payload && typeof payload === 'object' && 'settings' in payload) {
        return updateSettings(payload.settings);
      }
      // Fallback for backwards compatibility (direct Partial<Settings>)
      return updateSettings(message.payload as Partial<Settings>);
    }

    case MessageType.STATS_GET:
      return getStats();

    case MessageType.STATS_INCREMENT:
      return incrementStats(message.payload as StatsIncrementPayload);

    case MessageType.STATS_CLEAR:
      return resetStats();

    case MessageType.GET_STATUS: {
      try {
        const manifest = chrome.runtime.getManifest();
        return { active: true, version: manifest.version };
      } catch {
        return { active: true, version: 'unknown' };
      }
    }

    default:
      console.warn('[AI Leak Checker] Unknown message type:', message.type);
      return { error: 'Unknown message type' };
  }
}


/**
 * Get current settings.
 */
async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get('settings');
  return settings ?? DEFAULT_SETTINGS;
}

/**
 * Check storage quota and usage.
 */
async function checkStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  try {
    // Chrome storage API doesn't provide quota info directly
    // We can estimate by checking storage usage
    const storage = await chrome.storage.local.get(null);
    const usageBytes = new Blob([JSON.stringify(storage)]).size;
    
    // Chrome extension storage quota is typically 10MB (10,485,760 bytes)
    const quotaBytes = 10 * 1024 * 1024;
    const percentage = (usageBytes / quotaBytes) * 100;
    
    // Warn if usage exceeds 80%
    if (percentage > 80) {
      console.warn(
        `[AI Leak Checker] Storage quota warning: ${percentage.toFixed(1)}% used (${(usageBytes / 1024).toFixed(1)}KB / ${(quotaBytes / 1024).toFixed(1)}KB)`
      );
    }
    
    return {
      usage: usageBytes,
      quota: quotaBytes,
      percentage,
    };
  } catch (error) {
    console.error('[AI Leak Checker] Failed to check storage quota:', error);
    return {
      usage: 0,
      quota: 10 * 1024 * 1024,
      percentage: 0,
    };
  }
}

/**
 * Update settings.
 */
async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = { ...current, ...updates };
  
  // Check quota before saving
  const quotaInfo = await checkStorageQuota();
  if (quotaInfo.percentage > 95) {
    throw new Error('Storage quota exceeded. Please clear stats or reset settings.');
  }
  
  await chrome.storage.local.set({ settings: updated });

  // Notify all tabs of settings change
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.SETTINGS_UPDATED,
          payload: { settings: updated },
        });
      } catch {
        // Tab might not have content script
      }
    }
  }

  return updated;
}

/**
 * Get current stats.
 */
async function getStats(): Promise<Stats> {
  const { stats } = await chrome.storage.local.get('stats');
  return stats ?? DEFAULT_STATS;
}

/**
 * Increment stats counters.
 */
async function incrementStats(payload: StatsIncrementPayload | { field: keyof Stats | 'actions.masked' | 'actions.proceeded' | 'actions.cancelled'; byDetector?: Record<string, number> }): Promise<Stats> {
  const stats = await getStats();

  // Support legacy format with field/byDetector
  if ('field' in payload) {
    const legacyPayload = payload as { field: keyof Stats | 'actions.masked' | 'actions.proceeded' | 'actions.cancelled'; byDetector?: Record<string, number> };
    // Handle action fields
    if (legacyPayload.field === 'actions.masked') {
      stats.actions.masked++;
    } else if (legacyPayload.field === 'actions.proceeded') {
      stats.actions.proceeded++;
    } else if (legacyPayload.field === 'actions.cancelled') {
      stats.actions.cancelled++;
    } else if (legacyPayload.field in stats && typeof stats[legacyPayload.field as keyof Stats] === 'number') {
      (stats[legacyPayload.field as keyof Stats] as number)++;
    }

    // Increment by-detector counters
    if (legacyPayload.byDetector) {
      for (const [type, count] of Object.entries(legacyPayload.byDetector)) {
        if (type in stats.byDetector) {
          stats.byDetector[type as keyof typeof stats.byDetector] += count;
        }
      }
    }
  } else {
    // Support new format with detectorType/site
    stats.totalDetections++;
    if (payload.detectorType in stats.byDetector) {
      stats.byDetector[payload.detectorType]++;
    }
    stats.bySite[payload.site] = (stats.bySite[payload.site] ?? 0) + 1;
  }

  await chrome.storage.local.set({ stats });
  await updateBadge();

  return stats;
}

/**
 * Reset stats to defaults.
 */
async function resetStats(): Promise<Stats> {
  await chrome.storage.local.set({ stats: DEFAULT_STATS });
  await updateBadge();
  
  // Check quota after reset
  await checkStorageQuota();
  
  return DEFAULT_STATS;
}

/**
 * Update the extension badge.
 */
async function updateBadge(): Promise<void> {
  const stats = await getStats();
  const blocked = stats.actions.cancelled;

  if (blocked > 0) {
    const text = blocked > 99 ? '99+' : blocked.toString();
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

/**
 * Handle extension installation/update.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[AI Leak Checker] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // First install - initialize storage
    await initializeStorage();

    // Could open onboarding page here
    // await chrome.tabs.create({ url: 'onboarding.html' });
  } else if (details.reason === 'update') {
    // Extension updated - run migrations
    await initializeStorage();
  }
});

/**
 * Handle extension startup.
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[AI Leak Checker] Extension started');
  await initialize();
});

// Initialize on service worker load
initialize().catch(console.error);
