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
  MessageType,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  CURRENT_SCHEMA_VERSION,
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
 * Process incoming messages.
 */
async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case MessageType.SETTINGS_GET:
      return getSettings();

    case MessageType.SETTINGS_UPDATE:
      return updateSettings(message.payload as Partial<Settings>);

    case MessageType.STATS_GET:
      return getStats();

    case MessageType.STATS_INCREMENT:
      return incrementStats(message.payload as StatsIncrementPayload);

    case MessageType.STATS_CLEAR:
      return resetStats();

    case MessageType.GET_STATUS:
      return { active: true, version: chrome.runtime.getManifest().version };

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
 * Update settings.
 */
async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = { ...current, ...updates };
  
  await chrome.storage.local.set({ settings: updated });

  // Notify all tabs of settings change
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.SETTINGS_UPDATED,
          payload: updated,
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
