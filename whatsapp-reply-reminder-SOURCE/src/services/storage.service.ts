import { DEFAULT_SETTINGS, FollowUp, Settings } from '@/types';
import { STORAGE_KEYS } from '@utils/constants';
import { createLogger } from '@utils/logger';

const logger = createLogger('storage.service');

/**
 * Thin, typed wrapper around chrome.storage.local so the rest of the
 * codebase never touches the raw chrome.storage API directly. This
 * centralizes schema shape, defaults, and error handling.
 */
class StorageService {
  /** Reads all follow-ups as a record keyed by follow-up id. */
  async getFollowUps(): Promise<Record<string, FollowUp>> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.FOLLOWUPS);
    return (result[STORAGE_KEYS.FOLLOWUPS] as Record<string, FollowUp>) ?? {};
  }

  /** Overwrites the entire follow-ups map. */
  async setFollowUps(followUps: Record<string, FollowUp>): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.FOLLOWUPS]: followUps });
  }

  /** Upserts a single follow-up record. */
  async saveFollowUp(followUp: FollowUp): Promise<void> {
    const all = await this.getFollowUps();
    all[followUp.id] = followUp;
    await this.setFollowUps(all);
  }

  /** Removes a single follow-up record by id. */
  async deleteFollowUp(id: string): Promise<void> {
    const all = await this.getFollowUps();
    if (id in all) {
      delete all[id];
      await this.setFollowUps(all);
    }
  }

  /** Finds a pending follow-up for a given contact, if one exists. */
  async findPendingFollowUpByContact(contactName: string): Promise<FollowUp | undefined> {
    const all = await this.getFollowUps();
    const normalized = contactName.trim().toLowerCase();
    return Object.values(all).find(
      (f) => f.contactName.trim().toLowerCase() === normalized && f.status === 'pending'
    );
  }

  /** Reads the persisted settings, merged over defaults for forward compatibility. */
  async getSettings(): Promise<Settings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = (result[STORAGE_KEYS.SETTINGS] as Partial<Settings>) ?? {};
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  /** Persists a partial settings update, merged with existing settings. */
  async updateSettings(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.getSettings();
    const updated: Settings = { ...current, ...partial };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    logger.info('Settings updated', updated);
    return updated;
  }

  /** Initializes default settings on first install, without clobbering existing data. */
  async ensureDefaults(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    if (!result[STORAGE_KEYS.SETTINGS]) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
      logger.info('Default settings initialized');
    }
    const followUps = await chrome.storage.local.get(STORAGE_KEYS.FOLLOWUPS);
    if (!followUps[STORAGE_KEYS.FOLLOWUPS]) {
      await chrome.storage.local.set({ [STORAGE_KEYS.FOLLOWUPS]: {} });
    }
  }

  /** Subscribes to storage changes for reactive UI updates. */
  onChanged(callback: (changes: chrome.storage.StorageChange, areaName: string) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (changes[STORAGE_KEYS.FOLLOWUPS]) {
        callback(changes[STORAGE_KEYS.FOLLOWUPS], areaName);
      }
    });
  }
}

export const storageService = new StorageService();
