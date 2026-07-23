import {
  InsertDraftPayload,
  OutgoingMessageDetectedPayload,
  ReplyDetectedPayload,
  RuntimeMessage,
  RuntimeResponse,
} from '@/types';
import {
  DetectedMessage,
  getOpenChatContactName,
  insertTextIntoComposer,
  WhatsAppObserver,
} from './whatsapp-observer';
import { createLogger } from '@utils/logger';

const logger = createLogger('content');

function sendRuntimeMessage<T>(message: RuntimeMessage<T>): void {
  chrome.runtime.sendMessage(message).catch((err) => {
    logger.warn('Failed to deliver message to background', err);
  });
}

function handleDetectedMessage(message: DetectedMessage): void {
  if (message.outgoing) {
    const payload: OutgoingMessageDetectedPayload = {
      contactName: message.contactName,
      messageText: message.messageText,
      timestamp: message.timestamp,
    };
    sendRuntimeMessage({ type: 'OUTGOING_MESSAGE_DETECTED', payload });
    logger.info(`Outgoing message detected -> ${message.contactName}`);
  } else {
    const payload: ReplyDetectedPayload = {
      contactName: message.contactName,
      timestamp: message.timestamp,
      messageText: message.messageText,
    };
    sendRuntimeMessage({ type: 'REPLY_DETECTED', payload });
    logger.info(`Reply detected <- ${message.contactName}`);
  }
}

function init(): void {
  const observer = new WhatsAppObserver(handleDetectedMessage);
  observer.start();

  // WhatsApp Web never fully reloads the page during normal navigation,
  // so there is no unload event that reliably fires; the service worker
  // and observer both tolerate the tab being closed at any time.
  window.addEventListener('beforeunload', () => observer.stop());

  chrome.runtime.onMessage.addListener(
    (message: RuntimeMessage<InsertDraftPayload>, _sender, sendResponse: (r: RuntimeResponse) => void) => {
      if (message.type !== 'INSERT_DRAFT_INTO_CHAT') return undefined;

      const openContact = getOpenChatContactName();
      if (!openContact) {
        sendResponse({ success: false, error: 'No WhatsApp chat is currently open.' });
        return true;
      }

      const targetContact = message.payload?.contactName ?? '';
      if (openContact.toLowerCase() !== targetContact.toLowerCase()) {
        sendResponse({
          success: false,
          error: `Open the chat with "${targetContact}" first (currently viewing "${openContact}").`,
        });
        return true;
      }

      const inserted = insertTextIntoComposer(message.payload?.text ?? '');
      sendResponse(
        inserted
          ? { success: true }
          : { success: false, error: "Couldn't find the message box — is the chat fully loaded?" }
      );
      return true;
    }
  );
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
