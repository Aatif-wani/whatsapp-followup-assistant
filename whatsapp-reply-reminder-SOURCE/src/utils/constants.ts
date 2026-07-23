/** Storage keys used with chrome.storage.local. */
export const STORAGE_KEYS = {
  FOLLOWUPS: 'followUps',
  SETTINGS: 'settings',
} as const;

/** Prefix applied to all chrome.alarms created by this extension. */
export const ALARM_PREFIX = 'followup-alarm-';

/** Notification id prefix for follow-up reminder notifications. */
export const NOTIFICATION_PREFIX = 'followup-notification-';

/** Maximum length of message text stored/displayed to keep UI tidy. */
export const MAX_MESSAGE_PREVIEW_LENGTH = 140;

/** OpenAI chat completions endpoint. */
export const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/** Available OpenAI models selectable in settings. */
export const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'] as const;

/** Debounce delay (ms) for the MutationObserver watching WhatsApp Web DOM. */
export const OBSERVER_DEBOUNCE_MS = 400;
