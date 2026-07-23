import { ALARM_PREFIX } from '@utils/constants';
import { createLogger } from '@utils/logger';

const logger = createLogger('alarm.service');

/**
 * Wraps chrome.alarms so follow-up scheduling logic is expressed in
 * terms of follow-up ids rather than raw alarm names.
 */
class AlarmService {
  private alarmName(followUpId: string): string {
    return `${ALARM_PREFIX}${followUpId}`;
  }

  /** Schedules (or reschedules) a reminder alarm for a follow-up at an absolute time. */
  async schedule(followUpId: string, whenMs: number): Promise<void> {
    const name = this.alarmName(followUpId);
    await chrome.alarms.create(name, { when: whenMs });
    logger.debug(`Scheduled alarm ${name} for ${new Date(whenMs).toISOString()}`);
  }

  /** Cancels a scheduled reminder alarm, if any. */
  async cancel(followUpId: string): Promise<void> {
    const name = this.alarmName(followUpId);
    await chrome.alarms.clear(name);
    logger.debug(`Cancelled alarm ${name}`);
  }

  /** Extracts the follow-up id from an alarm name, or null if unrelated. */
  extractFollowUpId(alarmName: string): string | null {
    if (!alarmName.startsWith(ALARM_PREFIX)) return null;
    return alarmName.slice(ALARM_PREFIX.length);
  }

  /** Registers a handler invoked whenever any follow-up alarm fires. */
  onAlarm(handler: (followUpId: string) => void): void {
    chrome.alarms.onAlarm.addListener((alarm) => {
      const id = this.extractFollowUpId(alarm.name);
      if (id) handler(id);
    });
  }
}

export const alarmService = new AlarmService();
