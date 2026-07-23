import { OBSERVER_DEBOUNCE_MS } from '@utils/constants';
import { createLogger } from '@utils/logger';

const logger = createLogger('whatsapp-observer');

export interface DetectedMessage {
  contactName: string;
  messageText: string;
  timestamp: number;
  outgoing: boolean;
}

type MessageHandler = (message: DetectedMessage) => void;

/**
 * WhatsApp Web renders its chat UI with obfuscated, frequently-changing
 * class names, so selectors below rely on stable `data-*` / `aria-*`
 * attributes and structural roles wherever WhatsApp exposes them. If
 * WhatsApp ships a markup change, only the selectors in this file
 * need updating — the rest of the extension is decoupled from the DOM.
 */
const SELECTORS = {
  chatTitle: '[data-testid="conversation-info-header-chat-title"]',
  messageRow: '[data-testid^="conv-msg-"]',
  tailOut: '[data-testid="tail-out"]',
  youLabel: 'span[aria-label^="You"]',
  messageTextSpan: '[data-testid="selectable-text"]',
  messageInput: 'footer div[contenteditable="true"][role="textbox"]',
} as const;

/**
 * Returns the contact name of whichever chat is currently open in the
 * WhatsApp Web panel, or null if no chat is open. Standalone (not tied
 * to an observer instance) so it can be reused for one-off DOM reads,
 * such as verifying the right chat is open before inserting a draft.
 */
export function getOpenChatContactName(): string | null {
  const titleEl = document.querySelector(SELECTORS.chatTitle);
  const title = titleEl?.textContent;
  return title?.trim() || null;
}

/**
 * Inserts text into the currently open chat's message composer, as if
 * typed by hand, without sending it. Returns false if no composer is
 * found (e.g. no chat is open).
 *
 * WhatsApp Web's composer is a React-controlled contenteditable div, so
 * setting .textContent directly does not register with React's internal
 * state — the text would appear visually but WhatsApp wouldn't "see" it
 * (Send would submit empty). document.execCommand('insertText', ...) is
 * the standard workaround: it goes through the same input pipeline a
 * real keystroke would, which React does observe.
 */
export function insertTextIntoComposer(text: string): boolean {
  const composer = document.querySelector<HTMLElement>(SELECTORS.messageInput);
  if (!composer) return false;

  composer.focus();

  // Clear any existing draft text first so we replace rather than append.
  document.execCommand('selectAll', false);
  document.execCommand('insertText', false, text);

  return true;
}

/**
 * Observes the active WhatsApp Web conversation panel for new outgoing
 * and incoming messages, emitting normalized events for each.
 *
 * Important: WhatsApp Web is a React single-page app that can *replace*
 * the `#main` chat panel element (rather than update it in place) when
 * switching between chats. Watching that specific element directly is a
 * trap — once WhatsApp swaps it out, the old element is disconnected
 * from the document and a MutationObserver attached to it goes silent
 * forever, even though a brand new `#main` now exists. To avoid this,
 * we observe the permanent `document.body` (which is never replaced)
 * and always re-query fresh via `document.querySelector` on every scan.
 * A periodic poll runs alongside the MutationObserver as a safety net.
 */
export class WhatsAppObserver {
  private observer: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private seenMessageKeys = new Set<string>();
  private handler: MessageHandler;
  /** Contacts whose currently-open chat has already had its initial message snapshot taken. */
  private baselinedContacts = new Set<string>();

  constructor(handler: MessageHandler) {
    this.handler = handler;
  }

  /** Begins observing the page for new/changed messages. */
  start(): void {
    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(document.body, { childList: true, subtree: true });

    // Safety net: WhatsApp's virtualized message list and chat-switch
    // remounts can occasionally produce mutation patterns we don't
    // catch. A cheap periodic re-scan guarantees we never go silent
    // for long, independent of what the MutationObserver did or didn't see.
    this.pollTimer = setInterval(() => this.scanMessages(), 3000);

    this.scheduleScan();
    logger.info('Observer started');
  }

  /** Stops all observation and clears internal state. */
  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    logger.info('Observer stopped');
  }

  private scheduleScan(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.scanMessages(), OBSERVER_DEBOUNCE_MS);
  }

  private getCurrentContactName(): string | null {
    const titleEl = document.querySelector(SELECTORS.chatTitle);
    const title = titleEl?.textContent;
    return title?.trim() || null;
  }

  private scanMessages(): void {
    const contactName = this.getCurrentContactName();
    if (!contactName) return;

    const isFirstScanForContact = !this.baselinedContacts.has(contactName);

    const rows = document.querySelectorAll(SELECTORS.messageRow);
    logger.debug(`Scanning "${contactName}" — ${rows.length} message row(s) found`);
    if (rows.length === 0) return;

    // Only inspect the most recent handful of rows per scan; older
    // messages were already processed and are tracked in seenMessageKeys.
    const recentRows = Array.from(rows).slice(-10);
    const lastRow = recentRows[recentRows.length - 1];

    for (const row of recentRows) {
      // Outgoing messages reliably carry a "sent" tail icon and/or a
      // "You:" accessibility label. Incoming messages don't carry either
      // — rather than guessing at an incoming-specific marker (which may
      // not exist or may vary), we treat anything lacking an outgoing
      // marker as incoming by default, since a message row is always
      // one or the other in a 1:1 chat.
      const hasOutgoingMarker =
        !!row.querySelector(SELECTORS.tailOut) || !!row.querySelector(SELECTORS.youLabel);
      const isOutgoing = hasOutgoingMarker;

      const textEl = row.querySelector(SELECTORS.messageTextSpan);
      const text = textEl?.textContent?.trim();
      if (!text) continue;

      // Prefer WhatsApp's own stable message id (data-id on the row) for
      // deduping; fall back to a text-based key only if it's missing.
      const messageId = row.getAttribute('data-id');
      const key = messageId
        ? `${contactName}::${messageId}`
        : `${contactName}::${isOutgoing ? 'out' : 'in'}::${text}`;

      const alreadySeen = this.seenMessageKeys.has(key);
      this.seenMessageKeys.add(key);
      if (alreadySeen) continue;

      // On the first-ever scan of a chat, suppress firing for its older
      // history (so re-opening a long chat doesn't flood you with
      // follow-ups) — but NEVER suppress the most recent message. That
      // last message is what determines whether the conversation is
      // currently pending a reply, and it may have been sent moments
      // before this very first scan ran (e.g. opening a brand-new chat
      // and immediately sending something).
      if (isFirstScanForContact && row !== lastRow) continue;

      this.handler({
        contactName,
        messageText: text,
        timestamp: Date.now(),
        outgoing: isOutgoing,
      });
    }

    this.baselinedContacts.add(contactName);
    this.pruneSeenKeys();
  }

  /** Keeps the dedupe set from growing unbounded over a long browsing session. */
  private pruneSeenKeys(): void {
    const MAX_TRACKED = 500;
    if (this.seenMessageKeys.size <= MAX_TRACKED) return;
    const excess = this.seenMessageKeys.size - MAX_TRACKED;
    const iterator = this.seenMessageKeys.values();
    for (let i = 0; i < excess; i += 1) {
      const { value } = iterator.next();
      if (value !== undefined) this.seenMessageKeys.delete(value);
    }
  }
}
