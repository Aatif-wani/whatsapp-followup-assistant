import { useEffect, useRef } from 'react';

/**
 * Subscribes to a runtime message type broadcast from the background
 * script (e.g. 'FOLLOWUPS_UPDATED') and invokes the callback whenever
 * it arrives. Used to keep popup/options UI in sync with background
 * state changes without polling.
 */
export function useRuntimeBroadcast(messageType: string, callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message?.type === messageType) {
        callbackRef.current();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [messageType]);
}
