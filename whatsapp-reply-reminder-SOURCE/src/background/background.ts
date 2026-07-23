import {
  AiSuggestionRequestPayload,
  DismissPayload,
  InsertDraftPayload,
  OutgoingMessageDetectedPayload,
  ReplyDetectedPayload,
  RuntimeMessage,
  RuntimeResponse,
  SnoozePayload,
} from '@/types';
import { storageService } from '@services/storage.service';
import { alarmService } from '@services/alarm.service';
import { notificationService } from '@services/notification.service';
import { followUpService } from '@services/followup.service';
import { openAiService } from '@services/openai.service';
import { createLogger } from '@utils/logger';

const logger = createLogger('background');

/** Broadcasts a lightweight "data changed" ping so open UI surfaces can refetch. */
function broadcastFollowUpsUpdated(): void {
  chrome.runtime.sendMessage({ type: 'FOLLOWUPS_UPDATED' }).catch(() => {
    // No listeners currently open (e.g. popup closed) — safe to ignore.
  });
}

chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed/updated');
  storageService.ensureDefaults().catch((err) => logger.error('Failed to init defaults', err));
});

/** Fires whenever a scheduled follow-up reminder alarm elapses. */
alarmService.onAlarm((followUpId) => {
  followUpService
    .handleReminderFired(followUpId)
    .then(broadcastFollowUpsUpdated)
    .catch((err) => logger.error('Failed handling reminder alarm', err));
});

/** Handles the action buttons on a reminder notification. */
notificationService.onButtonClicked((followUpId, buttonIndex) => {
  const action = buttonIndex === 0 ? followUpService.snooze(followUpId, 60) : followUpService.markReplied(followUpId);
  action.then(broadcastFollowUpsUpdated).catch((err) => logger.error('Notification action failed', err));
});

/**
 * Clicking the notification body focuses WhatsApp Web (opening it if no
 * tab is open) and, best-effort, also opens the extension popup so the
 * AI suggestion with its Copy / Insert-into-chat buttons is right there.
 * Chrome's notification API has no native inline-reply text field —
 * openPopup() is the closest equivalent it allows, and it isn't
 * guaranteed to succeed on every Chrome version/OS, so failures here
 * are logged but otherwise ignored.
 */
notificationService.onClicked(() => {
  void (async () => {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    const existing = tabs[0];
    if (existing?.id) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId !== undefined) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url: 'https://web.whatsapp.com/' });
    }

    try {
      await chrome.action.openPopup();
    } catch (err) {
      logger.warn('Could not auto-open popup after notification click', err);
    }
  })();
});

/**
 * Central message router. Every request/response pair from content
 * scripts and UI surfaces flows through here so business logic stays
 * out of those thinner contexts.
 */
chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse: (response: RuntimeResponse) => void) => {
    handleMessage(message)
      .then((data) => sendResponse({ success: true, data }))
      .catch((error: Error) => {
        logger.error(`Failed to handle message ${message.type}`, error);
        sendResponse({ success: false, error: error.message });
      });

    // Returning true keeps the message channel open for the async response above.
    return true;
  }
);

async function handleMessage(message: RuntimeMessage): Promise<unknown> {
  switch (message.type) {
    case 'OUTGOING_MESSAGE_DETECTED': {
      // In 'notify-follow-up' mode, a message YOU send is the trigger that
      // starts a reminder (waiting on their reply). In 'notify-reply' mode,
      // it's the opposite: a message you send is how you resolve a pending
      // "you owe them a reply" reminder, so it's treated as the resolving
      // event instead.
      const payload = message.payload as OutgoingMessageDetectedPayload;
      const settings = await storageService.getSettings();
      const result =
        settings.mode === 'notify-reply'
          ? await followUpService.registerReply(payload.contactName, payload.timestamp)
          : await followUpService.registerOutgoingMessage(
              payload.contactName,
              payload.messageText,
              payload.timestamp
            );
      broadcastFollowUpsUpdated();
      return result;
    }

    case 'REPLY_DETECTED': {
      // Mirrors the swap above: in 'notify-reply' mode, a message THEY send
      // is the trigger that starts a "you owe them a reply" reminder.
      const payload = message.payload as ReplyDetectedPayload;
      const settings = await storageService.getSettings();
      const result =
        settings.mode === 'notify-reply'
          ? await followUpService.registerOutgoingMessage(
              payload.contactName,
              payload.messageText ?? '',
              payload.timestamp
            )
          : await followUpService.registerReply(payload.contactName, payload.timestamp);
      broadcastFollowUpsUpdated();
      return result;
    }

    case 'GET_FOLLOWUPS': {
      return followUpService.getAllSorted();
    }

    case 'GET_SETTINGS': {
      return storageService.getSettings();
    }

    case 'UPDATE_SETTINGS': {
      const partial = message.payload as Partial<import('@/types').Settings>;
      return storageService.updateSettings(partial);
    }

    case 'SNOOZE_FOLLOWUP': {
      const payload = message.payload as SnoozePayload;
      const result = await followUpService.snooze(payload.id, payload.minutes);
      broadcastFollowUpsUpdated();
      return result;
    }

    case 'DISMISS_FOLLOWUP': {
      const payload = message.payload as DismissPayload;
      const result = await followUpService.dismiss(payload.id);
      broadcastFollowUpsUpdated();
      return result;
    }

    case 'MARK_REPLIED': {
      const payload = message.payload as DismissPayload;
      const result = await followUpService.markReplied(payload.id);
      broadcastFollowUpsUpdated();
      return result;
    }

    case 'REQUEST_AI_SUGGESTION': {
      const payload = message.payload as AiSuggestionRequestPayload;
      const followUps = await storageService.getFollowUps();
      const followUp = followUps[payload.id];
      if (!followUp) throw new Error('Follow-up not found');

      const settings = await storageService.getSettings();
      const suggestion = await openAiService.generateFollowUpSuggestion(followUp, settings);
      const updated = await followUpService.saveAiSuggestion(payload.id, suggestion);
      broadcastFollowUpsUpdated();
      return updated;
    }

    case 'INSERT_DRAFT_INTO_CHAT': {
      const payload = message.payload as InsertDraftPayload;
      return insertDraftIntoWhatsAppTab(payload);
    }

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

/**
 * Forwards an "insert this text into the composer" request to whichever
 * WhatsApp Web tab is open. The popup can't reach the page DOM directly
 * (it's a separate extension surface), so the background script relays
 * the request to content.ts, which owns the actual DOM interaction.
 */
async function insertDraftIntoWhatsAppTab(payload: InsertDraftPayload): Promise<void> {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
  const tab = tabs[0];
  if (!tab?.id) {
    throw new Error('WhatsApp Web is not open in any tab. Open it first, then try again.');
  }

  const response = (await chrome.tabs.sendMessage(tab.id, {
    type: 'INSERT_DRAFT_INTO_CHAT',
    payload,
  })) as RuntimeResponse;

  if (!response?.success) {
    throw new Error(response?.error ?? 'Failed to insert the draft into WhatsApp.');
  }

  // Bring the WhatsApp tab into focus so the user lands right where the
  // draft was inserted and just needs to hit send.
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId !== undefined) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}
