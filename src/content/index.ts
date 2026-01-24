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
  checkSelectorHealth,
  type Settings,
  DEFAULT_SETTINGS,
  MAX_FALLBACK_DELAY_MS,
  MIN_FALLBACK_DELAY_MS,
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

/** Flag to temporarily disable scanning during programmatic submission */
let isProgrammaticSubmit = false;

/** Flag indicating fallback fetch/XHR patching is active */
let fallbackActive = false;

/**
 * Check if the extension context is still valid.
 * Returns false if the extension has been reloaded.
 */
function isExtensionContextValid(): boolean {
  try {
    // Try to access chrome.runtime.id - this will throw if context is invalidated
    return typeof chrome.runtime.id !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Safely send a message to the service worker.
 * Handles extension context invalidation gracefully.
 * Accepts simplified message format (background script handles legacy format).
 */
function safeSendMessage(
  message: ExtensionMessage | { type: MessageType; payload: unknown },
  callback?: (response?: unknown) => void
): void {
  if (!isExtensionContextValid()) {
    // Extension was reloaded - silently fail
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      // Check for errors (including context invalidation)
      if (chrome.runtime.lastError) {
        // Log error in development to help debug
        const errorMsg = chrome.runtime.lastError.message;
        if (errorMsg && !errorMsg.includes('Extension context invalidated')) {
          console.warn('[AI Leak Checker] Failed to send message:', errorMsg, message);
        }
        return;
      }
      if (callback) {
        callback(response);
      }
    });
  } catch (error) {
    // Extension context invalidated or other error
    // Log in development mode for debugging
    if (error instanceof Error && !error.message.includes('Extension context invalidated')) {
      console.warn('[AI Leak Checker] Error sending message:', error.message, message);
    }
  }
}

/**
 * Safely get a URL for an extension resource.
 */
function safeGetURL(path: string): string | null {
  if (!isExtensionContextValid()) {
    return null;
  }

  try {
    return chrome.runtime.getURL(path);
  } catch {
    return null;
  }
}

/**
 * Prepare the content script for the current page: detect the site, create the warning modal, attach interception listeners, load fallback delay settings, schedule a conditional fallback check, and register the runtime message listener.
 *
 * This function sets module-level state such as `siteConfig` and `modal`. If no matching site configuration is found, initialization stops early. When settings are available in storage, the fallback delay is coerced to a number and clamped between configured minimum and maximum values before scheduling the fallback health check.
 */
async function initialize(): Promise<void> {
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

  // Load settings for fallback delay
  let fallbackDelayMs = DEFAULT_SETTINGS.fallbackDelayMs; // Default
  try {
    const result = await chrome.storage.local.get('settings');
    if (result.settings && typeof result.settings === 'object') {
      const settings = result.settings as Settings;
      const rawValue = settings.fallbackDelayMs ?? DEFAULT_SETTINGS.fallbackDelayMs;
      // Coerce to number and validate
      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        fallbackDelayMs = DEFAULT_SETTINGS.fallbackDelayMs;
      } else {
        // Clamp between minimum and maximum
        fallbackDelayMs = Math.min(Math.max(numericValue, MIN_FALLBACK_DELAY_MS), MAX_FALLBACK_DELAY_MS);
      }
    }
  } catch (error) {
    console.warn('[AI Leak Checker] Failed to load settings, using default delay:', error);
  }

  // Check selector health after grace period, then conditionally inject fallback
  scheduleConditionalFallback(fallbackDelayMs);

  // Listen for messages from service worker
  try {
    chrome.runtime.onMessage.addListener(handleMessage);
  } catch (error) {
    // Extension context invalidated - can't set up listener
    console.warn('[AI Leak Checker] Failed to set up message listener:', error);
  }
}

/**
 * Initialize DOM interception by attaching listeners and scaffolding dynamic reattachment.
 *
 * Attaches input/submit/form listeners for the current site, observes the document body for added nodes to re-run attachment when new elements appear, and periodically retries attaching listeners every 2 seconds for up to 30 seconds to cover slow-loading or SPA-rendered elements.
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
 * After a delay, checks whether configured input/submit selectors are present and injects the main-world fallback script if selectors are unhealthy.
 *
 * If injection succeeds, marks the fallback active and notifies the background script. If no site configuration exists or selectors are healthy, no action is taken. Errors during the health check or injection are caught and logged.
 *
 * @param delayMs - Milliseconds to wait before performing the health check and potential injection
 */
function scheduleConditionalFallback(delayMs: number): void {
  if (!siteConfig) return;

  setTimeout(() => {
    if (!siteConfig) return;

    try {
      const health = checkSelectorHealth(siteConfig);
      
      if (!health.inputFound || !health.submitFound) {
        // Attempt injection and only mark as active if successful
        void injectMainWorldScript().then((injected) => {
          if (injected) {
            fallbackActive = true;
            notifyFallbackActive();
          }
        });
      } else {
        // DOM interception working - no fallback needed
      }
    } catch (error) {
      // Health check failed - fail safe, skip injection
      console.error('[AI Leak Checker] Health check failed:', error);
    }
  }, delayMs);
}

/**
 * Inform the background script that the fallback mechanism is active so the extension badge can update.
 */
function notifyFallbackActive(): void {
  safeSendMessage({
    type: MessageType.SET_FALLBACK_BADGE,
    payload: { active: true },
  });
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
 * Intercepts Enter key presses on input elements to scan the input text for sensitive data and display a warning modal when sensitive content is found.
 *
 * This handler skips interception when a main-world fallback patch is active, ignores non-Enter keys and Shift+Enter (newline), and treats synthesized or programmatic submissions as trusted. If scanning detects sensitive data, the handler prevents the default submission, stops propagation, and shows the warning modal.
 *
 * @param event - The keyboard event originating from the focused input element
 */
function handleKeyDown(event: KeyboardEvent): void {
  // Skip if fallback patching is handling interception
  if (fallbackActive) {
    return;
  }

  // If user starts typing after programmatic submit, reset flag immediately
  // This prevents the flag from blocking legitimate user input after submission
  if (isProgrammaticSubmit && event.key !== 'Enter') {
    isProgrammaticSubmit = false;
  }

  // Skip if this is a programmatic submit (to avoid re-triggering modal)
  // Only applies to Enter key - other keys reset the flag above
  // However, if the event is marked as synthesized (from triggerSubmit fallback),
  // we should skip scanning but allow the event to proceed to trigger submission
  const isSynthesizedEvent = (event as KeyboardEvent & { __aiLeakCheckerSynthesized?: boolean }).__aiLeakCheckerSynthesized === true;
  
  if (isProgrammaticSubmit && event.key === 'Enter' && !isSynthesizedEvent) {
    return;
  }

  // Only intercept Enter without Shift (Shift+Enter is newline)
  if (event.key !== 'Enter' || event.shiftKey) {
    return;
  }

  const target = event.target;
  if (!target || !(target instanceof HTMLElement)) return;
  
  // Skip scanning for synthesized events (from triggerSubmit fallback)
  // These events are dispatched after user action (Mask & Continue or Send Anyway),
  // so we trust the user's decision and just trigger submission
  if (isSynthesizedEvent) {
    return; // Allow event to proceed without scanning
  }
  
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
  // If user pastes after programmatic submit, reset flag immediately
  // This prevents the flag from blocking legitimate user input after submission
  if (isProgrammaticSubmit) {
    isProgrammaticSubmit = false;
  }

  const pastedText = event.clipboardData?.getData('text');
  if (!pastedText) return;

  // Quick check on pasted content
  if (quickCheck(pastedText)) {
    const result = scan(pastedText);
    if (result.hasSensitiveData) {
      // Show warning but don't block paste - user might want to edit
      notifyPasteSensitive(result);
    }
  }
}

/**
 * Intercepts a submit-button click, scans current input for sensitive data, and shows the warning modal when findings are detected.
 *
 * @param event - The original click event from the submit button; this event will be prevented and propagation stopped if sensitive data is found.
 */
function handleSubmitClick(event: MouseEvent): void {
  // Skip if fallback patching is handling interception
  if (fallbackActive) {
    return;
  }

  // Skip if this is a programmatic submit (to avoid re-triggering modal)
  if (isProgrammaticSubmit) {
    return;
  }

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
 * Intercepts a form submit event and blocks submission when user input contains sensitive data.
 *
 * If a fallback patch is active or the submission was initiated programmatically, the event is ignored.
 * Otherwise the current input text is scanned and, if sensitive data is detected, the submit is prevented
 * and the warning modal is shown to the user.
 *
 * @param event - The form `SubmitEvent` that may be prevented when sensitive data is found
 */
function handleFormSubmit(event: SubmitEvent): void {
  // Skip if fallback patching is handling interception
  if (fallbackActive) {
    return;
  }

  // Skip if this is a programmatic submit (to avoid re-triggering modal)
  if (isProgrammaticSubmit) {
    return;
  }

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

  // Send stats to service worker (legacy format supported by background)
  safeSendMessage({
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

  // Log the action (legacy format supported by background)
  safeSendMessage({
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

  // Log the bypass (legacy format supported by background)
  safeSendMessage({
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
 * Sets a flag to prevent re-triggering the modal during programmatic submission.
 */
function triggerSubmit(): void {
  if (!siteConfig) return;

  // Set flag to prevent our listeners from intercepting this submission
  isProgrammaticSubmit = true;

  // Helper to reset flag after sufficient delay to allow async submission to complete
  // Use 500ms delay to ensure async click handlers and form submissions complete
  // before we allow normal event interception to resume
  const resetFlag = (): void => {
    setTimeout(() => {
      isProgrammaticSubmit = false;
    }, 500);
  };

  try {
    // Find and click submit button
    for (const selector of siteConfig.submitSelectors) {
      const button = document.querySelector(selector);
      if (button instanceof HTMLButtonElement && !button.disabled) {
        button.click();
        // Reset flag after sufficient delay to allow async submission to complete
        resetFlag();
        return;
      }
    }

    // Fallback: simulate Enter key
    // Mark the event as synthesized so handleKeyDown can skip scanning
    // but still allow the event to proceed and trigger submission
    // This prevents infinite loops when "Send Anyway" is clicked (text still has sensitive data)
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
        // Mark as synthesized event - handleKeyDown will skip scanning but allow event to proceed
        (enterEvent as KeyboardEvent & { __aiLeakCheckerSynthesized?: boolean }).__aiLeakCheckerSynthesized = true;
        input.dispatchEvent(enterEvent);
        // Reset flag after sufficient delay to allow async event processing to complete
        resetFlag();
        return;
      }
    }

    // No submit method found - reset flag immediately (synchronous fallback)
    // This is safe because no submission occurred, so no async event processing needed
    isProgrammaticSubmit = false;
  } catch (error) {
    // Reset flag on error - use immediate reset to ensure cleanup
    isProgrammaticSubmit = false;
    throw error;
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
<<<<<<< HEAD
 * Injects the extension's "injected.js" into the page's main world to enable fetch/XHR patching.
 *
 * @returns `true` if the script element was created and appended to the document, `false` otherwise.
=======
 * Inject script into main world for fetch patching.
 * @returns Promise that resolves to true if script loaded successfully, false if load failed or error occurred
>>>>>>> 244beaf (Refactor fallback logic and improve element usability checks)
 */
function injectMainWorldScript(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = safeGetURL('injected.js');
      if (!url) {
        // Extension context invalidated - can't inject
        resolve(false);
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        script.remove();
        resolve(true);
      };
      script.onerror = (ev) => {
        console.error('[AI Leak Checker] Failed to load injected script:', url, ev);
        script.remove();
        resolve(false);
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (error) {
      // Extension context invalidated or other error
      console.error('[AI Leak Checker] Failed to inject main world script:', error);
      resolve(false);
    }
  });
}

/**
 * Handle messages from service worker.
 */
function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
): boolean {
  // Check if context is still valid before handling
  if (!isExtensionContextValid()) {
    return false;
  }

  try {
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
  } catch (error) {
    // Extension context invalidated during message handling
    return false;
  }

  return false;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initialize();
  });
} else {
  void initialize();
}