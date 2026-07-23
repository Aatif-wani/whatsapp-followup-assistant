import { FollowUp, Settings } from '@/types';
import { storageService } from '@services/storage.service';
import { alarmService } from '@services/alarm.service';
import { notificationService } from '@services/notification.service';
import { generateId } from '@utils/id.utils';
import { minutesToMs } from '@utils/date.utils';
import { createLogger } from '@utils/logger';

const logger = createLogger('followup.service');

/**
 * Orchestrates the full lifecycle of a follow-up: creation from an
 * outgoing message, cancellation on reply, snoozing, dismissal, and
 * reminder firing. This is the single source of truth the background
 * service worker and UI surfaces both build on.
 */
class FollowUpService {
  /** Registers (or refreshes) a follow-up when an outgoing message is detected. */
  async registerOutgoingMessage(
    contactName: string,
    messageText: string,
    sentAt: number
  ): Promise<FollowUp | null> {
    const settings = await storageService.getSettings();

    if (!settings.enabled) return null;
    if (settings.ignoredContacts.some((c) => c.toLowerCase() === contactName.toLowerCase())) {
      return null;
    }

    // If a pending follow-up already exists for this contact, refresh it
    // rather than stacking duplicate reminders.
    const existing = await storageService.findPendingFollowUpByContact(contactName);
    const dueAt = sentAt + minutesToMs(settings.followUpDelayMinutes);

    const followUp: FollowUp = existing
      ? {
          ...existing,
          lastMessageText: messageText,
          sentAt,
          dueAt,
          remindersSent: 0,
          aiSuggestion: undefined,
          updatedAt: Date.now(),
        }
      : {
          id: generateId('fu-'),
          contactName,
          lastMessageText: messageText,
          sentAt,
          dueAt,
          status: 'pending',
          snoozeCount: 0,
          remindersSent: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

    await storageService.saveFollowUp(followUp);
    await alarmService.schedule(followUp.id, dueAt);

    logger.info(`Registered follow-up for ${contactName}, due ${new Date(dueAt).toISOString()}`);
    return followUp;
  }

  /** Marks the pending follow-up for a contact as replied and cancels its alarm. */
  async registerReply(contactName: string, repliedAt: number): Promise<FollowUp | null> {
    const followUp = await storageService.findPendingFollowUpByContact(contactName);
    if (!followUp) return null;

    const updated: FollowUp = {
      ...followUp,
      status: 'replied',
      repliedAt,
      updatedAt: Date.now(),
    };

    await storageService.saveFollowUp(updated);
    await alarmService.cancel(followUp.id);
    notificationService.clear(followUp.id);

    logger.info(`Marked follow-up for ${contactName} as replied`);
    return updated;
  }

  /** Handles a fired reminder alarm: sends a notification and updates state. */
  async handleReminderFired(followUpId: string): Promise<void> {
    const all = await storageService.getFollowUps();
    const followUp = all[followUpId];
    if (!followUp || followUp.status !== 'pending') return;

    const settings = await storageService.getSettings();

    if (followUp.remindersSent >= settings.maxReminders) {
      logger.info(`Max reminders reached for ${followUp.contactName}, no further alarms`);
      return;
    }

    if (settings.notificationsEnabled) {
      await notificationService.showFollowUpReminder(followUp, settings.mode);
    }

    const updated: FollowUp = {
      ...followUp,
      remindersSent: followUp.remindersSent + 1,
      updatedAt: Date.now(),
    };
    await storageService.saveFollowUp(updated);

    // Schedule the next reminder if the budget allows.
    if (updated.remindersSent < settings.maxReminders) {
      const nextDueAt = Date.now() + minutesToMs(settings.reminderIntervalMinutes);
      await alarmService.schedule(followUp.id, nextDueAt);
      await storageService.saveFollowUp({ ...updated, dueAt: nextDueAt });
    }
  }

  /** Snoozes a follow-up by the given number of minutes from now. */
  async snooze(followUpId: string, minutes: number): Promise<FollowUp | null> {
    const all = await storageService.getFollowUps();
    const followUp = all[followUpId];
    if (!followUp) return null;

    const dueAt = Date.now() + minutesToMs(minutes);
    const updated: FollowUp = {
      ...followUp,
      status: 'pending',
      dueAt,
      snoozeCount: followUp.snoozeCount + 1,
      updatedAt: Date.now(),
    };

    await storageService.saveFollowUp(updated);
    await alarmService.schedule(followUp.id, dueAt);
    notificationService.clear(followUp.id);

    return updated;
  }

  /** Dismisses a follow-up permanently, cancelling any pending reminders. */
  async dismiss(followUpId: string): Promise<FollowUp | null> {
    const all = await storageService.getFollowUps();
    const followUp = all[followUpId];
    if (!followUp) return null;

    const updated: FollowUp = { ...followUp, status: 'dismissed', updatedAt: Date.now() };
    await storageService.saveFollowUp(updated);
    await alarmService.cancel(followUp.id);
    notificationService.clear(followUp.id);

    return updated;
  }

  /** Manually marks a follow-up as replied (e.g. from the popup UI). */
  async markReplied(followUpId: string): Promise<FollowUp | null> {
    const all = await storageService.getFollowUps();
    const followUp = all[followUpId];
    if (!followUp) return null;

    const updated: FollowUp = {
      ...followUp,
      status: 'replied',
      repliedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storageService.saveFollowUp(updated);
    await alarmService.cancel(followUp.id);
    notificationService.clear(followUp.id);

    return updated;
  }

  /** Attaches a generated AI suggestion to a follow-up record. */
  async saveAiSuggestion(followUpId: string, suggestion: string): Promise<FollowUp | null> {
    const all = await storageService.getFollowUps();
    const followUp = all[followUpId];
    if (!followUp) return null;

    const updated: FollowUp = { ...followUp, aiSuggestion: suggestion, updatedAt: Date.now() };
    await storageService.saveFollowUp(updated);
    return updated;
  }

  /** Returns all follow-ups sorted by due date, most urgent first. */
  async getAllSorted(): Promise<FollowUp[]> {
    const all = await storageService.getFollowUps();
    return Object.values(all).sort((a, b) => a.dueAt - b.dueAt);
  }

  /** Convenience accessor for current settings (re-exported for UI use). */
  async getSettings(): Promise<Settings> {
    return storageService.getSettings();
  }
}

export const followUpService = new FollowUpService();
