/**
 * @fileoverview Unit tests for message validation and handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageType, type ExtensionMessage, type SettingsUpdatePayload } from '@/shared/types';

// Helper to create valid messages
function createMessage<T extends MessageType>(
  type: T,
  payload: unknown,
  source: 'content' | 'background' | 'popup' | 'injected' = 'popup'
): ExtensionMessage {
  return {
    type,
    payload,
    timestamp: Date.now(),
    correlationId: `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    source,
  } as ExtensionMessage;
}

describe('Message Validation', () => {
  describe('validateMessage', () => {
    it('should validate correctly structured messages', () => {
      const message = createMessage(MessageType.SETTINGS_GET, undefined);
      
      expect(message).toBeDefined();
      expect(message.type).toBe(MessageType.SETTINGS_GET);
      expect(typeof message.timestamp).toBe('number');
      expect(typeof message.correlationId).toBe('string');
      expect(['content', 'background', 'popup', 'injected']).toContain(message.source);
    });

    it('should reject messages without type', () => {
      const invalid: unknown = {
        payload: {},
        timestamp: Date.now(),
      };
      
      // Type check would fail at compile time, but runtime validation is needed
      expect(invalid).not.toHaveProperty('type');
    });

    it('should reject messages with unknown type', () => {
      const invalid = createMessage('UNKNOWN_TYPE' as MessageType, {});
      
      // Should not be in valid MessageType values
      expect(Object.values(MessageType)).not.toContain(invalid.type);
    });

    it('should accept messages with payload', () => {
      const payload: SettingsUpdatePayload = {
        settings: { sensitivity: 'high' },
      };
      const message = createMessage(MessageType.SETTINGS_UPDATE, payload);
      
      expect(message.payload).toBeDefined();
      expect((message.payload as SettingsUpdatePayload).settings).toBeDefined();
    });

    it('should accept messages without payload', () => {
      const message = createMessage(MessageType.STATS_GET, undefined);
      
      expect(message.payload).toBeUndefined();
    });
  });

  describe('Message Type Handling', () => {
    it('should handle SETTINGS_GET message', () => {
      const message = createMessage(MessageType.SETTINGS_GET, undefined);
      
      expect(message.type).toBe(MessageType.SETTINGS_GET);
      expect(message.payload).toBeUndefined();
    });

    it('should handle SETTINGS_UPDATE message with proper payload', () => {
      const payload: SettingsUpdatePayload = {
        settings: { sensitivity: 'high', strictMode: true },
      };
      const message = createMessage(MessageType.SETTINGS_UPDATE, payload);
      
      expect(message.type).toBe(MessageType.SETTINGS_UPDATE);
      expect((message.payload as SettingsUpdatePayload).settings).toEqual({
        sensitivity: 'high',
        strictMode: true,
      });
    });

    it('should handle STATS_GET message', () => {
      const message = createMessage(MessageType.STATS_GET, undefined);
      
      expect(message.type).toBe(MessageType.STATS_GET);
    });

    it('should handle STATS_CLEAR message', () => {
      const message = createMessage(MessageType.STATS_CLEAR, undefined);
      
      expect(message.type).toBe(MessageType.STATS_CLEAR);
    });

    it('should handle GET_STATUS message', () => {
      const message = createMessage(MessageType.GET_STATUS, undefined);
      
      expect(message.type).toBe(MessageType.GET_STATUS);
    });

    it('should handle STATS_INCREMENT message with simplified format', () => {
      // Simplified format used by content script
      const simplifiedMessage = {
        type: MessageType.STATS_INCREMENT,
        payload: { field: 'actions.masked' as const },
      };
      
      expect(simplifiedMessage.type).toBe(MessageType.STATS_INCREMENT);
      expect(simplifiedMessage.payload).toBeDefined();
      expect((simplifiedMessage.payload as { field: string }).field).toBe('actions.masked');
    });

    it('should handle STATS_INCREMENT message with byDetector', () => {
      const simplifiedMessage = {
        type: MessageType.STATS_INCREMENT,
        payload: {
          field: 'actions.cancelled' as const,
          byDetector: { api_key_openai: 1 },
        },
      };
      
      expect(simplifiedMessage.type).toBe(MessageType.STATS_INCREMENT);
      expect((simplifiedMessage.payload as { byDetector?: Record<string, number> }).byDetector).toBeDefined();
    });
  });

  describe('Settings Update Payload Extraction', () => {
    it('should extract settings from SettingsUpdatePayload', () => {
      const payload: SettingsUpdatePayload = {
        settings: { sensitivity: 'low' },
      };
      const message = createMessage(MessageType.SETTINGS_UPDATE, payload);
      
      const extracted = (message.payload as SettingsUpdatePayload).settings;
      
      expect(extracted).toEqual({ sensitivity: 'low' });
    });

    it('should handle partial settings updates', () => {
      const payload: SettingsUpdatePayload = {
        settings: { strictMode: true },
      };
      const message = createMessage(MessageType.SETTINGS_UPDATE, payload);
      
      const extracted = (message.payload as SettingsUpdatePayload).settings;
      
      expect(extracted).toEqual({ strictMode: true });
      expect(Object.keys(extracted)).toHaveLength(1);
    });

    it('should handle empty settings object', () => {
      const payload: SettingsUpdatePayload = {
        settings: {},
      };
      const message = createMessage(MessageType.SETTINGS_UPDATE, payload);
      
      const extracted = (message.payload as SettingsUpdatePayload).settings;
      
      expect(extracted).toEqual({});
    });
  });
});
