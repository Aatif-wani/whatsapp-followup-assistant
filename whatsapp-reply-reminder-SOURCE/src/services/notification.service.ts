import { FollowUp, TrackingMode } from '@/types';
import { NOTIFICATION_PREFIX } from '@utils/constants';
import { truncate } from '@utils/text.utils';
import { createLogger } from '@utils/logger';

const logger = createLogger('notification.service');

/** Wraps chrome.notifications for follow-up reminder alerts. */
class NotificationService {
  private notificationId(followUpId: string): string {
    return `${NOTIFICATION_PREFIX}${followUpId}`;
  }

  /** Shows a desktop notification prompting the user to follow up (or reply). */
  async showFollowUpReminder(followUp: FollowUp, mode: TrackingMode): Promise<void> {
    const id = this.notificationId(followUp.id);
    const isReplyMode = mode === 'notify-reply';

    const message = followUp.aiSuggestion
      ? isReplyMode
        ? `Suggested reply: "${truncate(followUp.aiSuggestion, 90)}"`
        : `Suggested: "${truncate(followUp.aiSuggestion, 90)}"`
      : isReplyMode
        ? `You haven't replied to: "${truncate(followUp.lastMessageText, 90)}"`
        : `No reply yet to: "${truncate(followUp.lastMessageText, 90)}"`;

    chrome.notifications.create(
      id,
      {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: isReplyMode
          ? `Reply to ${followUp.contactName}`
          : `Follow up with ${followUp.contactName}`,
        message,
        priority: 1,
        buttons: [{ title: 'Snooze 1h' }, { title: 'Mark as replied' }],
        requireInteraction: true,
      },
      () => {
        if (chrome.runtime.lastError) {
          logger.error('Failed to create notification', chrome.runtime.lastError.message);
        }
      }
    );
  }

  /** Clears a notification, e.g. once a reply has been detected. */
  clear(followUpId: string): void {
    chrome.notifications.clear(this.notificationId(followUpId));
  }

  /** Extracts the follow-up id encoded in a notification id, or null. */
  extractFollowUpId(notificationId: string): string | null {
    if (!notificationId.startsWith(NOTIFICATION_PREFIX)) return null;
    return notificationId.slice(NOTIFICATION_PREFIX.length);
  }

  /** Registers a handler for notification button clicks. */
  onButtonClicked(
    handler: (followUpId: string, buttonIndex: number) => void
  ): void {
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      const id = this.extractFollowUpId(notificationId);
      if (id) handler(id, buttonIndex);
    });
  }

  /** Registers a handler for clicks on the notification body itself. */
  onClicked(handler: (followUpId: string) => void): void {
    chrome.notifications.onClicked.addListener((notificationId) => {
      const id = this.extractFollowUpId(notificationId);
      if (id) handler(id);
    });
  }
}

export const notificationService = new NotificationService();
