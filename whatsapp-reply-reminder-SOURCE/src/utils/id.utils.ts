/**
 * Generates a reasonably unique id without relying on external
 * dependencies or `crypto.randomUUID` (not guaranteed in all
 * extension execution contexts).
 */
export function generateId(prefix = ''): string {
  const random = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);
  return `${prefix}${timestamp}-${random}`;
}

/**
 * Builds a stable, deterministic key for a contact name so the same
 * contact always maps to the same follow-up thread.
 */
export function contactKey(contactName: string): string {
  return contactName.trim().toLowerCase();
}
