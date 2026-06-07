/**
 * @file background-sender.test.ts
 * @description Unit tests for background service-worker sender validation
 * (EXT-SEC hardening). Messages whose sender id does not match our own
 * extension id must be rejected as Unauthorized before any work is done.
 * @module tests/unit/background-sender
 *
 * @dependencies
 * - vitest (describe, it, expect)
 * - @/background (isTrustedSender, handleMessage)
 * - @/shared/types (MessageType)
 *
 * @security
 * - Asserts defense-in-depth: a spoofed/foreign sender id never reaches
 *   storage or settings/stats handlers.
 */
import { describe, it, expect, vi } from 'vitest';
import { isTrustedSender, handleMessage } from '@/background';
import { MessageType } from '@/shared/types';

/** Build a MessageSender with a given id. */
function senderWithId(id: string | undefined): chrome.runtime.MessageSender {
  return { id } as chrome.runtime.MessageSender;
}

describe('Background sender validation (EXT-SEC)', () => {
  describe('isTrustedSender', () => {
    it('accepts a sender whose id matches our extension id', () => {
      expect(isTrustedSender(senderWithId(chrome.runtime.id))).toBe(true);
    });

    it('rejects a sender with a different id', () => {
      expect(isTrustedSender(senderWithId('some-other-extension-id'))).toBe(false);
    });

    it('rejects a sender with no id', () => {
      expect(isTrustedSender(senderWithId(undefined))).toBe(false);
    });
  });

  describe('handleMessage authorization', () => {
    it('returns Unauthorized and does no storage work for an untrusted sender', async () => {
      const getSpy = vi.spyOn(chrome.storage.local, 'get');

      const response = await handleMessage(
        { type: MessageType.SETTINGS_GET, payload: undefined },
        senderWithId('attacker-extension-id')
      );

      expect(response).toEqual({ error: 'Unauthorized' });
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('processes a message normally for a trusted sender', async () => {
      const response = await handleMessage(
        { type: MessageType.GET_STATUS, payload: undefined },
        senderWithId(chrome.runtime.id)
      );

      expect(response).toEqual(
        expect.objectContaining({ active: true })
      );
    });
  });
});
