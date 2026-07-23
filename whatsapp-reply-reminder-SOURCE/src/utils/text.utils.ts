import { MAX_MESSAGE_PREVIEW_LENGTH } from '@utils/constants';

/** Truncates text to a max length, appending an ellipsis if cut. */
export function truncate(text: string, maxLength = MAX_MESSAGE_PREVIEW_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Escapes a string for safe use inside a CSS attribute selector. */
export function escapeAttributeValue(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}
