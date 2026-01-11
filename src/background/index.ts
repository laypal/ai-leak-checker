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
  const schemaVersion = storage.schemaVersion as number | undefined;
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    console.log('[AI Leak Checker] Migrating storage schema...');
    await migrateStorage(schemaVersion ?? 0);
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[AI Leak Checker] Message handler error:', errorMessage);
        sendResponse({ error: errorMessage });
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
  _sender: chrome.runtime.MessageSender
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
      const payload = message.payload;
      if (payload && typeof payload === 'object') {
        if ('settings' in payload) {
          const settingsPayload = payload as { settings: unknown };
          const settings = settingsPayload.settings;
          if (settings && typeof settings === 'object') {
            return updateSettings(settings as Partial<Settings>);
          }
        }
        // Fallback for backwards compatibility (direct Partial<Settings>)
        return updateSettings(payload as Partial<Settings>);
      }
      return updateSettings({});
    }

    case MessageType.STATS_GET:
      return getStats();

    case MessageType.STATS_INCREMENT: {
      const payload = message.payload;
      if (payload && typeof payload === 'object') {
        return incrementStats(payload as unknown as StatsIncrementPayload);
      }
      throw new Error('Invalid stats increment payload');
    }

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
  const result = await chrome.storage.local.get('settings');
  if (result.settings && typeof result.settings === 'object') {
    return result.settings as Settings;
  }
  return DEFAULT_SETTINGS;
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
  const result = await chrome.storage.local.get('stats');
  if (result.stats && typeof result.stats === 'object') {
    return result.stats as Stats;
  }
  return DEFAULT_STATS;
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
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[AI Leak Checker] Extension installed/updated:', details.reason);

  const reason = details.reason as 'install' | 'update' | 'chrome_update' | 'shared_module_update';
  if (reason === 'install') {
    // First install - initialize storage
    void initializeStorage();

    // Could open onboarding page here
    // await chrome.tabs.create({ url: 'onboarding.html' });
  } else if (reason === 'update') {
    // Extension updated - run migrations
    void initializeStorage();
  }
});

/**
 * Handle extension startup.
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('[AI Leak Checker] Extension started');
  void initialize();
});

// Initialize on service worker load
initialize().catch(console.error);
