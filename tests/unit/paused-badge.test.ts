/**
 * @file paused-badge.test.ts
 * @description Verifies the background SET_PAUSED_BADGE per-tab handler: paused
 *              => grey pause glyph on that tab; unpaused => normal badge
 *              restored via updateBadgeForTab(tabId); foreign sender rejected
 *              (EXT-SEC gate). Uses the background-sender chrome-stub pattern.
 * @module tests/unit/paused-badge
 *
 * @dependencies
 * - vitest (describe, it, expect)
 * - @/background (handleMessage)
 * - @/shared/types (MessageType)
 *
 * @security
 * - Asserts the sender gate: a spoofed sender id never reaches the badge APIs.
 */
import { describe, it, expect } from 'vitest';
import { handleMessage } from '@/background';
import { MessageType } from '@/shared/types';

/** Build a trusted MessageSender for a given tab (id matches chrome.runtime.id). */
function trustedSenderWithTab(tabId: number): chrome.runtime.MessageSender {
  return { id: chrome.runtime.id, tab: { id: tabId } } as chrome.runtime.MessageSender;
}

describe('Background SET_PAUSED_BADGE handler', () => {
  it('sets a grey pause glyph for the tab when paused', async () => {
    const response = await handleMessage(
      { type: MessageType.SET_PAUSED_BADGE, payload: { paused: true } },
      trustedSenderWithTab(7)
    );

    expect(response).toEqual({ success: true });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '⏸', tabId: 7 });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#6c757d', tabId: 7 });
  });

  it('restores the normal tab badge when unpaused', async () => {
    const response = await handleMessage(
      { type: MessageType.SET_PAUSED_BADGE, payload: { paused: false } },
      trustedSenderWithTab(7)
    );

    expect(response).toEqual({ success: true });
    // updateBadgeForTab(7) with empty stats clears the badge for that tab.
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '', tabId: 7 });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '⏸', tabId: 7 });
  });

  it('rejects a foreign sender before touching the badge', async () => {
    const response = await handleMessage(
      { type: MessageType.SET_PAUSED_BADGE, payload: { paused: true } },
      { id: 'attacker-extension-id', tab: { id: 7 } } as chrome.runtime.MessageSender
    );

    expect(response).toEqual({ error: 'Unauthorized' });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });
});
