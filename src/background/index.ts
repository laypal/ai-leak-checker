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
 * Accepts both full BaseMessage format and simplified { type, payload } format.
 */
function validateMessage(message: unknown): message is ExtensionMessage | { type: MessageType; payload: unknown } {
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
  
  // Payload can be undefined for messages that don't require it (e.g., SETTINGS_GET, STATS_GET)
  // undefined is a valid payload value per BaseMessage<'TYPE', undefined> type definitions
  // No need to validate payload type here - that's handled by TypeScript and message handlers
  
  return true;
}

/**
 * Handle and dispatch incoming extension messages to the corresponding background operations.
 *
 * Processes a validated message, performs the requested action (settings/stats operations,
 * status query, or badge updates), and returns the operation-specific response object.
 *
 * @param message - The incoming message object (expected to include a `type` and optional `payload`)
 * @returns The response for the processed message: settings or stats objects, a status object,
 *          `{ success: true }` / `{ success: false, error: string }` for badge operations, or
 *          `{ error: string }` for invalid or unknown messages
 * @throws Error - If `MessageType.STATS_INCREMENT` is received with an invalid payload
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

    case MessageType.SET_FALLBACK_BADGE: {
      const payload = message.payload;
      const tabId = _sender.tab?.id;
      
      if (!tabId) {
        return { error: 'No tab ID available' };
      }
      
      // Validate payload exists and has active property as boolean
      if (!payload || typeof payload !== 'object') {
        return { error: 'Invalid payload: payload must be an object' };
      }
      
      if (!('active' in payload) || typeof payload.active !== 'boolean') {
        return { error: 'Invalid payload: payload.active must be a boolean' };
      }
      
      try {
        if (payload.active === true) {
          // Show warning badge for this specific tab
          await chrome.action.setBadgeText({ text: '⚠', tabId });
          await chrome.action.setBadgeBackgroundColor({ color: '#ffc107', tabId });
        } else if (payload.active === false) {
          // Clear fallback badge, restore normal badge for this tab
          await updateBadgeForTab(tabId);
        }
        return { success: true };
      } catch (error) {
        // Tab may have closed - log and return failure
        console.warn('[AI Leak Checker] Failed to update fallback badge:', error);
        return { success: false, error: String(error) };
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

  // Notify all tabs of settings change (best-effort; don't fail update if this throws)
  try {
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
  } catch {
    // tabs.query or iteration failed (e.g. permission edge case); settings already saved
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
 * Update the extension action badge to reflect the number of cancelled actions.
 *
 * If `actions.cancelled` is greater than 0, sets the badge text to that count (capped at "99+")
 * and sets the badge background color to `#dc3545`. If the count is 0, clears the badge text.
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
 * Restore the action badge for a specific tab based on current stats.
 *
 * Sets the badge text to the number of cancelled actions (capped at "99+") and the badge background to red when the count is greater than zero; clears the badge text when the count is zero. Handles tab lifecycle errors gracefully.
 *
 * @param tabId - The ID of the tab whose badge should be updated
 */
async function updateBadgeForTab(tabId: number): Promise<void> {
  try {
    const stats = await getStats();
    const blocked = stats.actions.cancelled;

    if (blocked > 0) {
      const text = blocked > 99 ? '99+' : blocked.toString();
      await chrome.action.setBadgeText({ text, tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#dc3545', tabId });
    } else {
      await chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch (error) {
    // Tab may have closed - log and continue
    console.warn('[AI Leak Checker] Failed to update badge for tab:', error);
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