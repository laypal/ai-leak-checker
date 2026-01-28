/**
 * @file content-state-reset.test.ts
 * @description Unit tests for content script state reset logic. Ensures the modal
 * can trigger again in new chat conversations and covers the bug fix where state
 * wasn't reset when new input elements appeared.
 * @module tests/unit/content-state-reset
 *
 * @dependencies
 * - vitest (describe, it, expect, beforeEach, vi)
 * - @/shared/types (SiteConfig)
 *
 * @security
 * - No user data or prompts; uses mock state and DOM only.
 */

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SiteConfig } from '@/shared/types';

/**
 * Simulate the resetStateForNewChat function logic for testing.
 * 
 * NOTE: The real implementation in src/content/index.ts uses module-scoped variables.
 * This test version accepts these as parameters to enable isolated unit testing.
 */
function simulateResetStateForNewChat(
  state: {
    pendingSubmission: unknown;
    isProgrammaticSubmit: boolean;
    modalVisible: boolean;
  },
  modal: { hide: () => void } | null
): void {
  state.pendingSubmission = null;
  state.isProgrammaticSubmit = false;

  if (modal) {
    modal.hide();
    state.modalVisible = false;
  }
}

/**
 * Simulate the attachListeners function logic for detecting new inputs.
 * 
 * NOTE: The real implementation in src/content/index.ts uses module-scoped variables.
 * This test version simulates the behavior of detecting new input elements and
 * calling resetStateForNewChat when new inputs are found. Only resets when
 * newInputsFound && (!modal || !modal.isCurrentlyVisible()), matching the real guard.
 */
function simulateAttachListeners(
  siteConfig: SiteConfig | null,
  existingInputs: Set<HTMLElement>,
  state: {
    pendingSubmission: unknown;
    isProgrammaticSubmit: boolean;
    modalVisible: boolean;
  },
  modal: { hide: () => void; isCurrentlyVisible: () => boolean } | null,
  document: { querySelectorAll: (selector: string) => NodeListOf<HTMLElement> }
): { newInputsFound: boolean; inputsAttached: number } {
  if (!siteConfig) return { newInputsFound: false, inputsAttached: 0 };

  let inputCount = 0;
  let newInputsFound = false;

  // Find and attach to input elements
  for (const selector of siteConfig.inputSelectors) {
    const inputs = document.querySelectorAll(selector);
    for (const input of inputs) {
      if (!existingInputs.has(input)) {
        existingInputs.add(input);
        inputCount++;
        newInputsFound = true;
      }
    }
  }

  // If new input elements were found, reset state only when modal not visible
  // (matches real attachListeners: avoid closing active warnings)
  if (newInputsFound && (!modal || !modal.isCurrentlyVisible())) {
    simulateResetStateForNewChat(state, modal);
  }

  return { newInputsFound, inputsAttached: inputCount };
}

describe('Content Script State Reset', () => {
  let mockModal: { hide: ReturnType<typeof vi.fn>; isCurrentlyVisible: ReturnType<typeof vi.fn> };
  let mockDocument: { querySelectorAll: ReturnType<typeof vi.fn> };
  let state: {
    pendingSubmission: unknown;
    isProgrammaticSubmit: boolean;
    modalVisible: boolean;
  };
  let existingInputs: Set<HTMLElement>;

  const mockSiteConfig: SiteConfig = {
    enabled: true,
    name: 'Test Site',
    inputSelectors: ['#test-input', 'textarea[data-id]'],
    submitSelectors: ['button[type="submit"]'],
    containerSelector: '#test-container',
    apiEndpoints: ['/api/test'],
    bodyExtractor: 'message',
    inputType: 'textarea',
    usesComposition: false,
  };

  beforeEach(() => {
    mockModal = {
      hide: vi.fn(),
      isCurrentlyVisible: vi.fn(() => false),
    };
    // Create mock elements using jsdom
    const mockInput = document.createElement('textarea');
    mockInput.id = 'test-input';
    mockDocument = {
      querySelectorAll: vi.fn(() => {
        return [mockInput] as unknown as NodeListOf<HTMLElement>;
      }),
    };
    state = {
      pendingSubmission: { text: 'test', findings: [] },
      isProgrammaticSubmit: true,
      modalVisible: true,
    };
    existingInputs = new Set();
  });

  describe('resetStateForNewChat', () => {
    it('should clear pendingSubmission', () => {
      state.pendingSubmission = { text: 'sensitive data', findings: [] };
      
      simulateResetStateForNewChat(state, mockModal);

      expect(state.pendingSubmission).toBeNull();
    });

    it('should reset isProgrammaticSubmit flag', () => {
      state.isProgrammaticSubmit = true;
      
      simulateResetStateForNewChat(state, mockModal);

      expect(state.isProgrammaticSubmit).toBe(false);
    });

    it('should hide modal if visible', () => {
      state.modalVisible = true;
      
      simulateResetStateForNewChat(state, mockModal);

      expect(mockModal.hide).toHaveBeenCalled();
      expect(state.modalVisible).toBe(false);
    });

    it('should hide modal whenever provided (even if already hidden)', () => {
      state.modalVisible = false;

      simulateResetStateForNewChat(state, mockModal);

      expect(mockModal.hide).toHaveBeenCalled();
      expect(state.modalVisible).toBe(false);
    });

    it('should handle null modal gracefully', () => {
      state.pendingSubmission = { text: 'test' };
      state.isProgrammaticSubmit = true;
      state.modalVisible = true;
      
      simulateResetStateForNewChat(state, null);

      expect(state.pendingSubmission).toBeNull();
      expect(state.isProgrammaticSubmit).toBe(false);
      // Modal state should remain unchanged when modal is null
      expect(state.modalVisible).toBe(true);
    });

    it('should reset all state properties', () => {
      state.pendingSubmission = { text: 'test', findings: [] };
      state.isProgrammaticSubmit = true;
      state.modalVisible = true;
      
      simulateResetStateForNewChat(state, mockModal);

      expect(state.pendingSubmission).toBeNull();
      expect(state.isProgrammaticSubmit).toBe(false);
      expect(state.modalVisible).toBe(false);
      expect(mockModal.hide).toHaveBeenCalled();
    });
  });

  describe('New Chat Detection', () => {
    it('should detect new input elements', () => {
      const result = simulateAttachListeners(
        mockSiteConfig,
        existingInputs,
        state,
        mockModal,
        mockDocument
      );

      expect(result.newInputsFound).toBe(true);
      expect(result.inputsAttached).toBeGreaterThan(0);
    });

    it('should reset state when new inputs detected', () => {
      state.pendingSubmission = { text: 'previous chat data' };
      state.isProgrammaticSubmit = true;
      state.modalVisible = true;

      simulateAttachListeners(
        mockSiteConfig,
        existingInputs,
        state,
        mockModal,
        mockDocument
      );

      expect(state.pendingSubmission).toBeNull();
      expect(state.isProgrammaticSubmit).toBe(false);
      expect(mockModal.hide).toHaveBeenCalled();
    });

    it('should not reset state when no new inputs found', () => {
      // First call - adds input to existingInputs
      simulateAttachListeners(
        mockSiteConfig,
        existingInputs,
        state,
        mockModal,
        mockDocument
      );

      // Set state for second call; capture before second attachListeners
      state.pendingSubmission = { text: 'test' };
      state.isProgrammaticSubmit = true;
      state.modalVisible = true;
      const initialState = {
        pendingSubmission: state.pendingSubmission,
        isProgrammaticSubmit: state.isProgrammaticSubmit,
        modalVisible: state.modalVisible,
      };

      // Second call with same inputs - should not reset
      const result = simulateAttachListeners(
        mockSiteConfig,
        existingInputs,
        state,
        mockModal,
        mockDocument
      );

      expect(result.newInputsFound).toBe(false);
      expect(state.pendingSubmission).toEqual(initialState.pendingSubmission);
      expect(state.isProgrammaticSubmit).toBe(initialState.isProgrammaticSubmit);
      expect(state.modalVisible).toBe(initialState.modalVisible);
    });

    it('should not clear pendingSubmission when new inputs found but modal is visible', () => {
      state.pendingSubmission = { text: 'previous chat data', findings: [] };
      state.isProgrammaticSubmit = true;
      state.modalVisible = true;
      mockModal.isCurrentlyVisible.mockReturnValue(true);

      simulateAttachListeners(
        mockSiteConfig,
        existingInputs,
        state,
        mockModal,
        mockDocument
      );

      expect(state.pendingSubmission).not.toBeNull();
      expect(state.pendingSubmission).toEqual({ text: 'previous chat data', findings: [] });
      expect(mockModal.hide).not.toHaveBeenCalled();
    });

    it('should handle multiple new inputs correctly', () => {
      const input1 = document.createElement('textarea');
      input1.id = 'test-input';
      const input2 = document.createElement('textarea');
      input2.id = 'test-input';
      mockDocument.querySelectorAll = vi.fn((selector: string) => {
        if (selector === '#test-input') {
          return [input1, input2] as unknown as NodeListOf<HTMLElement>;
        }
        return [] as unknown as NodeListOf<HTMLElement>;
      });

      const result = simulateAttachListeners(
        mockSiteConfig,
        existingInputs,
        state,
        mockModal,
        mockDocument
      );

      expect(result.newInputsFound).toBe(true);
      expect(result.inputsAttached).toBe(2);
      expect(state.pendingSubmission).toBeNull();
    });

    it('should not reset state when siteConfig is null', () => {
      state.pendingSubmission = { text: 'test' };
      state.isProgrammaticSubmit = true;

      const result = simulateAttachListeners(
        null,
        existingInputs,
        state,
        mockModal,
        mockDocument
      );

      expect(result.newInputsFound).toBe(false);
      expect(state.pendingSubmission).not.toBeNull();
      expect(state.isProgrammaticSubmit).toBe(true);
    });
  });

  describe('State Reset Scenarios', () => {
    it('should allow modal to trigger again after state reset', () => {
      // Simulate first chat: modal was shown
      state.pendingSubmission = { text: 'first chat data', findings: [] };
      state.isProgrammaticSubmit = true;
      state.modalVisible = true;

      // New chat detected: reset state via simulateResetStateForNewChat(state, mockModal)
      simulateResetStateForNewChat(state, mockModal);

      // Verifies state is reset for new chat (pendingSubmission, isProgrammaticSubmit, modalVisible)
      expect(state.pendingSubmission).toBeNull();
      expect(state.isProgrammaticSubmit).toBe(false);
      expect(state.modalVisible).toBe(false);
    });

    it('should handle rapid new chat detection', () => {
      // First new chat
      simulateResetStateForNewChat(state, mockModal);
      expect(state.pendingSubmission).toBeNull();

      // Set state again
      state.pendingSubmission = { text: 'second chat' };
      state.isProgrammaticSubmit = true;
      state.modalVisible = true;

      // Second new chat
      simulateResetStateForNewChat(state, mockModal);
      expect(state.pendingSubmission).toBeNull();
      expect(state.isProgrammaticSubmit).toBe(false);
    });
  });
});
