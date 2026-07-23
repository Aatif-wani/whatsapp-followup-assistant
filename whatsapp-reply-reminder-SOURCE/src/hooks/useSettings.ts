import { useCallback, useEffect, useState } from 'react';
import { RuntimeMessage, RuntimeResponse, Settings } from '@/types';
import { createLogger } from '@utils/logger';

const logger = createLogger('useSettings');

async function sendMessage<T>(message: RuntimeMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeResponse<T>;
  if (!response?.success) {
    throw new Error(response?.error ?? 'Unknown error communicating with background script');
  }
  return response.data as T;
}

interface UseSettingsResult {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

/** Loads current settings and exposes an update function that persists via the background script. */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sendMessage<Settings>({ type: 'GET_SETTINGS' })
      .then(setSettings)
      .catch((err: Error) => {
        logger.error('Failed to load settings', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    setSaving(true);
    try {
      const updated = await sendMessage<Settings>({ type: 'UPDATE_SETTINGS', payload: partial });
      setSettings(updated);
      setError(null);
    } catch (err) {
      const message = (err as Error).message;
      logger.error('Failed to update settings', message);
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, error, saving, updateSettings };
}
