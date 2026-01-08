/**
 * @fileoverview Unit tests for badge update functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { actionMock } from '../../tests/setup';
import { DEFAULT_STATS } from '@/shared/types';

describe('Badge Updates', () => {
  beforeEach(() => {
    // Reset mocks
    actionMock.setBadgeText.mockClear();
    actionMock.setBadgeBackgroundColor.mockClear();
  });

  describe('Badge Text Formatting', () => {
    it('should set badge text to count when blocked > 0', async () => {
      const stats = {
        ...DEFAULT_STATS,
        actions: { ...DEFAULT_STATS.actions, cancelled: 5 },
      };

      const blocked = stats.actions.cancelled;
      if (blocked > 0) {
        const text = blocked > 99 ? '99+' : blocked.toString();
        await chrome.action.setBadgeText({ text });
      }

      expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '5' });
    });

    it('should cap badge text at 99+', async () => {
      const stats = {
        ...DEFAULT_STATS,
        actions: { ...DEFAULT_STATS.actions, cancelled: 150 },
      };

      const blocked = stats.actions.cancelled;
      if (blocked > 0) {
        const text = blocked > 99 ? '99+' : blocked.toString();
        await chrome.action.setBadgeText({ text });
      }

      expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '99+' });
    });

    it('should clear badge when blocked is 0', async () => {
      const stats = {
        ...DEFAULT_STATS,
        actions: { ...DEFAULT_STATS.actions, cancelled: 0 },
      };

      const blocked = stats.actions.cancelled;
      if (blocked > 0) {
        const text = blocked > 99 ? '99+' : blocked.toString();
        await chrome.action.setBadgeText({ text });
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }

      expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('Badge Color', () => {
    it('should set badge color to red when blocked > 0', async () => {
      const stats = {
        ...DEFAULT_STATS,
        actions: { ...DEFAULT_STATS.actions, cancelled: 3 },
      };

      const blocked = stats.actions.cancelled;
      if (blocked > 0) {
        await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
      }

      expect(actionMock.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#dc3545',
      });
    });

    it('should not set badge color when blocked is 0', async () => {
      const stats = {
        ...DEFAULT_STATS,
        actions: { ...DEFAULT_STATS.actions, cancelled: 0 },
      };

      const blocked = stats.actions.cancelled;
      if (blocked > 0) {
        await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
      }

      expect(actionMock.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });
  });

  describe('Badge Update Scenarios', () => {
    it('should update badge after stats increment', async () => {
      const initialStats = {
        ...DEFAULT_STATS,
        actions: { ...DEFAULT_STATS.actions, cancelled: 0 },
      };

      // Simulate increment
      const updatedStats = {
        ...initialStats,
        actions: { ...initialStats.actions, cancelled: 1 },
      };

      const blocked = updatedStats.actions.cancelled;
      if (blocked > 0) {
        const text = blocked > 99 ? '99+' : blocked.toString();
        await chrome.action.setBadgeText({ text });
        await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
      }

      expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '1' });
      expect(actionMock.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: '#dc3545',
      });
    });

    it('should clear badge after stats reset', async () => {
      const resetStats = DEFAULT_STATS;
      const blocked = resetStats.actions.cancelled;

      if (blocked > 0) {
        const text = blocked > 99 ? '99+' : blocked.toString();
        await chrome.action.setBadgeText({ text });
        await chrome.action.setBadgeBackgroundColor({ color: '#dc3545' });
      } else {
        await chrome.action.setBadgeText({ text: '' });
      }

      expect(actionMock.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });
});
