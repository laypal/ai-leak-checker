/**
 * @fileoverview Content script for DOM interception on AI chat interfaces
 * @module content
 * 
 * Intercepts form submissions and input events on ChatGPT and Claude
 * to scan for sensitive data before it's sent.
 */

import { scan, quickCheck, describeFinding } from '@/shared/detectors';
import { redact } from '@/shared/utils/redact';
import {
  type Finding,
  type DetectionResult,
  type SiteConfig,
  type ExtensionMessage,
  MessageType,
  getSiteConfig,
} from '@/shared/types';
import { WarningModal } from './modal';

/** Current site configuration */
let siteConfig: SiteConfig | null = null;

/** Warning modal instance */
let modal: WarningModal | null = null;

/** Pending submission data when showing modal */
let pendingSubmission: {
  text: string;
  findings: Finding[];
  result: DetectionResult;
  originalEvent?: Event;
  submitFn?: () => void;
} | null = null;

/** Interval ID for MutationObserver retry */
let observerRetryInterval: ReturnType<typeof setInterval> | null = null;

/** Track attached listeners to avoid duplicates */
const attachedElements = new WeakSet<Element>();

/**
 * Initialize the content script.
 * Detects the current site and sets up interception.
 */
function initialize(): void {
  const hostname = window.location.hostname;
  
  // Find matching site configuration
  const config = getSiteConfig(hostname);
  if (config) {
    siteConfig = config;
    console.log(`[AI Leak Checker] Initialized for ${hostname}`);
  }

  if (!siteConfig) {
    console.log('[AI Leak Checker] No matching site configuration');
    return;
  }

  // Initialize modal
  modal = new WarningModal({
    onContinue: handleContinueWithRedaction,
    onSendAnyway: handleSendAnyway,
    onCancel: handleCancel,
  });

  // Set up interception
  setupInterception();

  // Inject main world script for fetch patching
  injectMainWorldScript();

  // Listen for messages from service worker
  chrome.runtime.onMessage.addListener(handleMessage);
}

/**
 * Set up DOM event interception.
 */
function setupInterception(): void {
  if (!siteConfig) return;

  // Initial attachment
  attachListeners();

  // Watch for dynamic elements with MutationObserver
  const observer = new MutationObserver((mutations) => {
    // Debounce: only check if new nodes were added
    const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasNewNodes) {
      attachListeners();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Retry attachment periodically for slow-loading SPAs
  observerRetryInterval = setInterval(() => {
    attachListeners();
  }, 2000);

  // Stop retrying after 30 seconds
  setTimeout(() => {
    if (observerRetryInterval) {
      clearInterval(observerRetryInterval);
      observerRetryInterval = null;
    }
  }, 30000);
}

/**
 * Attach event listeners to input and submit elements.
 */
function attachListeners(): void {
  if (!siteConfig) return;

  // Find and attach to input elements
  for (const selector of siteConfig.inputSelectors) {
    const inputs = document.querySelectorAll(selector);
    for (const input of inputs) {
      if (!attachedElements.has(input)) {
        if (input instanceof HTMLElement) {
          attachInputListeners(input);
        }
        attachedElements.add(input);
      }
    }
  }

  // Find and attach to submit buttons
  for (const selector of siteConfig.submitSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      if (!attachedElements.has(button)) {
        if (button instanceof HTMLElement) {
          attachSubmitListener(button);
        }
        attachedElements.add(button);
      }
    }
  }

  // Attach form submit listener
  const forms = document.querySelectorAll('form');
  for (const form of forms) {
    if (!attachedElements.has(form)) {
      form.addEventListener('submit', handleFormSubmit, { capture: true });
      attachedElements.add(form);
    }
  }
}

/**
 * Attach listeners to input element.
 */
function attachInputListeners(element: HTMLElement): void {
  // Intercept Enter key
  element.addEventListener('keydown', handleKeyDown, { capture: true });

  // Intercept paste
  element.addEventListener('paste', handlePaste, { capture: true });
}

/**
 * Attach click listener to submit button.
 */
function attachSubmitListener(element: HTMLElement): void {
  element.addEventListener('click', handleSubmitClick, { capture: true });
}

/**
 * Handle keydown events (primarily Enter key).
 */
function handleKeyDown(event: KeyboardEvent): void {
  // Only intercept Enter without Shift (Shift+Enter is newline)
  if (event.key !== 'Enter' || event.shiftKey) {
    return;
  }

  const target = event.target;
  if (!target || !(target instanceof HTMLElement)) return;
  const text = getInputText(target);

  if (text && shouldScan(text)) {
    const result = scan(text);
    if (result.hasSensitiveData) {
      event.preventDefault();
      event.stopPropagation();
      showWarning(text, result, event);
    }
  }
}

/**
 * Handle paste events.
 */
function handlePaste(event: ClipboardEvent): void {
  const pastedText = event.clipboardData?.getData('text');
  if (!pastedText) return;

  // Quick check on pasted content
  if (quickCheck(pastedText)) {
    const result = scan(pastedText);
    if (result.hasSensitiveData) {
      // Show warning but don't block paste - user might want to edit
      console.warn('[AI Leak Checker] Sensitive data pasted', result.summary);
      notifyPasteSensitive(result);
    }
  }
}

/**
 * Handle submit button click.
 */
function handleSubmitClick(event: MouseEvent): void {
  const text = getCurrentInputText();
  
  if (text && shouldScan(text)) {
    const result = scan(text);
    if (result.hasSensitiveData) {
      event.preventDefault();
      event.stopPropagation();
      showWarning(text, result, event);
    }
  }
}

/**
 * Handle form submit.
 */
function handleFormSubmit(event: SubmitEvent): void {
  const text = getCurrentInputText();
  
  if (text && shouldScan(text)) {
    const result = scan(text);
    if (result.hasSensitiveData) {
      event.preventDefault();
      event.stopPropagation();
      showWarning(text, result, event);
    }
  }
}

/**
 * Get text from input element.
 */
function getInputText(element: HTMLElement): string {
  if (element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  if (element instanceof HTMLInputElement) {
    return element.value;
  }
  // ContentEditable div (used by some sites)
  if (element.contentEditable === 'true') {
    return element.innerText || element.textContent || '';
  }
  return '';
}

/**
 * Get text from the current active input.
 */
function getCurrentInputText(): string {
  if (!siteConfig) return '';

  for (const selector of siteConfig.inputSelectors) {
    const input = document.querySelector(selector);
    if (input && input instanceof HTMLElement) {
      const text = getInputText(input);
      if (text.trim()) {
        return text;
      }
    }
  }

  return '';
}

/**
 * Check if text should be scanned.
 * Skip very short text or obvious non-sensitive content.
 */
function shouldScan(text: string): boolean {
  // Skip very short text
  if (text.length < 10) {
    return false;
  }

  // Quick pre-filter
  return quickCheck(text) || text.length > 50;
}

/**
 * Show warning modal with detected findings.
 */
function showWarning(
  text: string,
  result: DetectionResult,
  originalEvent?: Event
): void {
  if (!modal) return;

  pendingSubmission = {
    text,
    findings: result.findings,
    result,
    originalEvent,
  };

  modal.show(result.findings);

  // Send stats to service worker
  void chrome.runtime.sendMessage({
    type: MessageType.STATS_INCREMENT,
    payload: {
      field: 'actions.cancelled',
      byDetector: result.summary.byType,
    },
  });
}

/**
 * Handle "Mask & Continue" action.
 */
function handleContinueWithRedaction(): void {
  if (!pendingSubmission || !siteConfig) return;

  const redactedText = redact(pendingSubmission.text, pendingSubmission.findings);
  
  // Update the input with redacted text
  for (const selector of siteConfig.inputSelectors) {
    const input = document.querySelector(selector);
    if (input && input instanceof HTMLElement) {
      setInputText(input, redactedText);
      break;
    }
  }

  // Log the action
  void chrome.runtime.sendMessage({
    type: MessageType.STATS_INCREMENT,
    payload: { field: 'actions.masked' },
  });

  // Trigger the submit after a short delay to allow UI update
  setTimeout(() => {
    triggerSubmit();
  }, 100);

  pendingSubmission = null;
}

/**
 * Handle "Send Anyway" action.
 */
function handleSendAnyway(): void {
  if (!pendingSubmission) return;

  // Log the bypass
  void chrome.runtime.sendMessage({
    type: MessageType.STATS_INCREMENT,
    payload: { field: 'actions.proceeded' },
  });

  // Trigger the original submission
  triggerSubmit();
  pendingSubmission = null;
}

/**
 * Handle "Cancel" action.
 */
function handleCancel(): void {
  pendingSubmission = null;
  
  // Return focus to input
  if (siteConfig) {
    for (const selector of siteConfig.inputSelectors) {
      const input = document.querySelector(selector);
      if (input && input instanceof HTMLElement) {
        input.focus();
        break;
      }
    }
  }
}

/**
 * Set text in input element.
 */
function setInputText(element: HTMLElement, text: string): void {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.value = text;
    // Trigger input event to update React state
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (element.contentEditable === 'true') {
    element.innerText = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Trigger submit action.
 */
function triggerSubmit(): void {
  if (!siteConfig) return;

  // Find and click submit button
  for (const selector of siteConfig.submitSelectors) {
    const button = document.querySelector(selector);
    if (button instanceof HTMLButtonElement && !button.disabled) {
      button.click();
      return;
    }
  }

  // Fallback: simulate Enter key
  for (const selector of siteConfig.inputSelectors) {
    const input = document.querySelector(selector);
    if (input && input instanceof HTMLElement) {
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      input.dispatchEvent(enterEvent);
      return;
    }
  }
}

/**
 * Notify about sensitive data in paste.
 */
function notifyPasteSensitive(result: DetectionResult): void {
  // Could show a toast notification here
  console.log('[AI Leak Checker] Pasted content contains:', 
    result.findings.map(f => describeFinding(f)).join(', ')
  );
}

/**
 * Inject script into main world for fetch patching.
 */
function injectMainWorldScript(): void {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('[AI Leak Checker] Failed to inject main world script:', error);
  }
}

/**
 * Handle messages from service worker.
 */
function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean {
  switch (message.type) {
    case MessageType.SETTINGS_UPDATED:
      // Reload settings
      console.log('[AI Leak Checker] Settings updated');
      break;

    case MessageType.GET_STATUS:
      sendResponse({
        active: !!siteConfig,
        site: siteConfig?.name ?? window.location.hostname,
      });
      return true;
  }

  return false;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
