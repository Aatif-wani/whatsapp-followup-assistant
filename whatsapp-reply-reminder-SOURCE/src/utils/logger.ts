/** Toggle to silence non-error logs in production builds. */
const VERBOSE = true;

/**
 * Minimal namespaced logger so console output can be traced back to the
 * originating module (background, content script, popup, etc.).
 */
export function createLogger(namespace: string) {
  const tag = `[WA-FollowUp:${namespace}]`;

  return {
    info: (...args: unknown[]) => {
      if (VERBOSE) console.info(tag, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(tag, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(tag, ...args);
    },
    debug: (...args: unknown[]) => {
      if (VERBOSE) console.debug(tag, ...args);
    },
  };
}
