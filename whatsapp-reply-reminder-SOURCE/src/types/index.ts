/**
 * Central type definitions shared across background, content, popup,
 * and options contexts of the extension.
 */

/** Status of a tracked outgoing message thread. */
export type FollowUpStatus = 'pending' | 'replied' | 'snoozed' | 'dismissed';

/**
 * Which direction of conversation the extension tracks and reminds about:
 * - 'notify-follow-up': you messaged them and they haven't replied — remind
 *   YOU to follow up with them again.
 * - 'notify-reply': they messaged you and you haven't replied — remind YOU
 *   to go reply to them.
 */
export type TrackingMode = 'notify-follow-up' | 'notify-reply';

/** A single tracked conversation follow-up. */
export interface FollowUp {
  /** Unique identifier (uuid-like string). */
  id: string;
  /** WhatsApp chat name / contact name as read from the DOM. */
  contactName: string;
  /** The last outgoing message text sent to this contact. */
  lastMessageText: string;
  /** Epoch ms timestamp when the outgoing message was detected. */
  sentAt: number;
  /** Epoch ms timestamp for when the follow-up reminder should fire. */
  dueAt: number;
  /** Current status of this follow-up. */
  status: FollowUpStatus;
  /** Epoch ms timestamp of when a reply was detected, if any. */
  repliedAt?: number;
  /** Number of times this follow-up has been snoozed. */
  snoozeCount: number;
  /** Number of reminder notifications already sent for this item. */
  remindersSent: number;
  /** Cached AI-generated follow-up suggestion, if generated. */
  aiSuggestion?: string;
  /** Epoch ms timestamp of record creation. */
  createdAt: number;
  /** Epoch ms timestamp of last update. */
  updatedAt: number;
}

/** Chrome alarm name prefix used for follow-up reminders. */
export const FOLLOWUP_ALARM_PREFIX = 'followup-alarm-';

/** User-configurable extension settings. */
export interface Settings {
  /** Whether the extension is actively tracking messages. */
  enabled: boolean;
  /** Which direction of conversation to track reminders for. */
  mode: TrackingMode;
  /** Minutes to wait after an outgoing message before reminding, if no reply. */
  followUpDelayMinutes: number;
  /** Maximum number of reminder notifications to send per follow-up. */
  maxReminders: number;
  /** Minutes between repeated reminders if still unanswered. */
  reminderIntervalMinutes: number;
  /** Whether desktop notifications are enabled. */
  notificationsEnabled: boolean;
  /** Whether AI-generated follow-up suggestions are enabled. */
  aiSuggestionsEnabled: boolean;
  /** OpenAI API key, stored locally (never transmitted anywhere but OpenAI). */
  openAiApiKey: string;
  /** OpenAI model to use for suggestions. */
  openAiModel: string;
  /** Contacts to ignore (never tracked). */
  ignoredContacts: string[];
}

/** Default settings applied on first install. */
export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mode: 'notify-follow-up',
  followUpDelayMinutes: 60,
  maxReminders: 3,
  reminderIntervalMinutes: 120,
  notificationsEnabled: true,
  aiSuggestionsEnabled: false,
  openAiApiKey: '',
  openAiModel: 'gpt-4o-mini',
  ignoredContacts: [],
};

/** Shape of data persisted in chrome.storage.local. */
export interface StorageSchema {
  followUps: Record<string, FollowUp>;
  settings: Settings;
}

/** Message types exchanged between content script, background, and UI. */
export type RuntimeMessageType =
  | 'OUTGOING_MESSAGE_DETECTED'
  | 'REPLY_DETECTED'
  | 'GET_FOLLOWUPS'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'SNOOZE_FOLLOWUP'
  | 'DISMISS_FOLLOWUP'
  | 'MARK_REPLIED'
  | 'REQUEST_AI_SUGGESTION'
  | 'INSERT_DRAFT_INTO_CHAT'
  | 'FOLLOWUPS_UPDATED';

export interface RuntimeMessage<T = unknown> {
  type: RuntimeMessageType;
  payload?: T;
}

export interface OutgoingMessageDetectedPayload {
  contactName: string;
  messageText: string;
  timestamp: number;
}

export interface ReplyDetectedPayload {
  contactName: string;
  timestamp: number;
  /** Text of the incoming message, used when tracking mode is 'notify-reply'. */
  messageText?: string;
}

export interface SnoozePayload {
  id: string;
  minutes: number;
}

export interface DismissPayload {
  id: string;
}

export interface AiSuggestionRequestPayload {
  id: string;
}

export interface InsertDraftPayload {
  contactName: string;
  text: string;
}

/** Generic response envelope for runtime messages. */
export interface RuntimeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
