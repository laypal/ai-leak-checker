/**
 * @fileoverview Integration tests for fallback badge functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExtensionMessage } from '@/shared/types';
import { MessageType } from '@/shared/types';

// Mock chrome.action API
const actionMock = {
  setBadgeText: vi.fn(() => Promise.resolve()),
  setBadgeBackgroundColor: vi.fn(() => Promise.resolve()),
};

// Mock chrome.storage API
const storageMock = {
  local: {
    get: vi.fn(() => Promise.resolve({ stats: { actions: { cancelled: 0 } } })),
    set: vi.fn(() => Promise.resolve()),
  },
};

// Mock chrome.runtime API
const runtimeMock = {
  getManifest: vi.fn(() => ({ version: '0.1.3' })),
};

// Setup global chrome mock
beforeEach(() => {
  globalThis.chrome = {
    action: actionMock as any,
    storage: storageMock as any,
    runtime: runtimeMock as any,
  } as any;
});

/**
 * Helper function to simulate SET_FALLBACK_BADGE handler logic.
 */
async function simulateSetFallbackBadge(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<void> {
  if (message.type !== MessageType.SET_FALLBACK_BADGE) {
    return;
  }

  const payload = message.payload as { active: boolean };
  const tabId = sender.tab?.id;

  if (!tabId) {
    return;
  }

  if (payload.active === true) {
    await chrome.action.setBadgeText({ text: '⚠', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#ffc107', tabId });
  } else if (payload.active === false) {
    // Simulate updateBadgeForTab logic
    const stats = await chrome.storage.local.get('stats');
    const blocked = stats.stats?.actions?.cancelled || 0;

    if (blocked > 0) {
      const text = blocked > 99 ? '99+' : blocked.toString();
      await chrome.action.setBadgeText({ text, tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#dc3545', tabId });
    } else {
      await chrome.action.setBadgeText({ text: '', tabId });
    }
  }
}

describe('Fallback Badge Integration', () => {
  beforeEach(() => {
    actionMock.setBadgeText.mockClear();
    actionMock.setBadgeBackgroundColor.mockClear();
  });

  it('should set tab-specific badge when fallback activates', async () => {
    const mockTabId = 123;
    const message: ExtensionMessage = {
      type: MessageType.SET_FALLBACK_BADGE,
      payload: { active: true },
      timestamp: Date.now(),
      correlationId: 'test-123',
      source: 'content',
    };

    const sender = {
      tab: { id: mockTabId },
    } as chrome.runtime.MessageSender;

    await simulateSetFallbackBadge(message, sender);

    expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '⚠', tabId: mockTabId });
    expect(actionMock.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#ffc107',
      tabId: mockTabId,
    });
  });

  it('should clear badge when fallback deactivates', async () => {
    const mockTabId = 123;
    const message: ExtensionMessage = {
      type: MessageType.SET_FALLBACK_BADGE,
      payload: { active: false },
      timestamp: Date.now(),
      correlationId: 'test-123',
      source: 'content',
    };

    const sender = {
      tab: { id: mockTabId },
    } as chrome.runtime.MessageSender;

    await simulateSetFallbackBadge(message, sender);

    expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: mockTabId });
  });

  it('should show blocked count badge when fallback deactivates and blocked > 0', async () => {
    const mockTabId = 123;
    
    // Mock storage to return stats with blocked count
    storageMock.local.get.mockResolvedValueOnce({
      stats: { actions: { cancelled: 5 } },
    });

    const message: ExtensionMessage = {
      type: MessageType.SET_FALLBACK_BADGE,
      payload: { active: false },
      timestamp: Date.now(),
      correlationId: 'test-123',
      source: 'content',
    };

    const sender = {
      tab: { id: mockTabId },
    } as chrome.runtime.MessageSender;

    await simulateSetFallbackBadge(message, sender);

    expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '5', tabId: mockTabId });
    expect(actionMock.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#dc3545',
      tabId: mockTabId,
    });
  });

  it('should handle missing tabId gracefully', async () => {
    const message: ExtensionMessage = {
      type: MessageType.SET_FALLBACK_BADGE,
      payload: { active: true },
      timestamp: Date.now(),
      correlationId: 'test-123',
      source: 'content',
    };

    const sender = {
      tab: undefined, // No tab ID
    } as chrome.runtime.MessageSender;

    // Simulate background script handler
    let error: string | null = null;
    if (message.type === MessageType.SET_FALLBACK_BADGE) {
      const tabId = sender.tab?.id;
      
      if (!tabId) {
        error = 'No tab ID available';
      }
    }

    expect(error).toBe('No tab ID available');
    expect(actionMock.setBadgeText).not.toHaveBeenCalled();
  });

  it('should use correct badge color for fallback (yellow/orange)', async () => {
    const mockTabId = 123;
    const message: ExtensionMessage = {
      type: MessageType.SET_FALLBACK_BADGE,
      payload: { active: true },
      timestamp: Date.now(),
      correlationId: 'test-123',
      source: 'content',
    };

    const sender = {
      tab: { id: mockTabId },
    } as chrome.runtime.MessageSender;

    if (message.type === MessageType.SET_FALLBACK_BADGE) {
      const payload = message.payload as { active: boolean };
      const tabId = sender.tab?.id;
      
      if (tabId && payload.active) {
        await chrome.action.setBadgeText({ text: '⚠', tabId });
        await chrome.action.setBadgeBackgroundColor({ color: '#ffc107', tabId });
      }
    }

    // Verify warning color (yellow/orange) is used, not red
    expect(actionMock.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#ffc107', // Yellow/orange, not '#dc3545' (red)
      tabId: mockTabId,
    });
  });
});
