import { useCallback, useEffect, useState } from 'react';
import { FollowUp, RuntimeMessage, RuntimeResponse } from '@/types';
import { useRuntimeBroadcast } from '@hooks/useChromeStorage';
import { createLogger } from '@utils/logger';

const logger = createLogger('useFollowUps');

async function sendMessage<T>(message: RuntimeMessage): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeResponse<T>;
  if (!response?.success) {
    throw new Error(response?.error ?? 'Unknown error communicating with background script');
  }
  return response.data as T;
}

interface UseFollowUpsResult {
  followUps: FollowUp[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  snooze: (id: string, minutes: number) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  markReplied: (id: string) => Promise<void>;
  requestAiSuggestion: (id: string) => Promise<void>;
  insertDraftIntoChat: (contactName: string, text: string) => Promise<void>;
  aiSuggestionLoadingId: string | null;
  insertingDraftId: string | null;
  actionError: string | null;
  clearActionError: () => void;
}

/** Loads follow-ups from the background script and exposes mutation actions. */
export function useFollowUps(): UseFollowUpsResult {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestionLoadingId, setAiSuggestionLoadingId] = useState<string | null>(null);
  const [insertingDraftId, setInsertingDraftId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    sendMessage<FollowUp[]>({ type: 'GET_FOLLOWUPS' })
      .then((data) => {
        setFollowUps(data);
        setError(null);
      })
      .catch((err: Error) => {
        logger.error('Failed to load follow-ups', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRuntimeBroadcast('FOLLOWUPS_UPDATED', load);

  const snooze = useCallback(
    async (id: string, minutes: number) => {
      await sendMessage({ type: 'SNOOZE_FOLLOWUP', payload: { id, minutes } });
      load();
    },
    [load]
  );

  const dismiss = useCallback(
    async (id: string) => {
      await sendMessage({ type: 'DISMISS_FOLLOWUP', payload: { id } });
      load();
    },
    [load]
  );

  const markReplied = useCallback(
    async (id: string) => {
      await sendMessage({ type: 'MARK_REPLIED', payload: { id } });
      load();
    },
    [load]
  );

  const requestAiSuggestion = useCallback(
    async (id: string) => {
      setAiSuggestionLoadingId(id);
      setActionError(null);
      try {
        await sendMessage({ type: 'REQUEST_AI_SUGGESTION', payload: { id } });
        load();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate a suggestion.';
        logger.error('Failed to generate AI suggestion', message);
        setActionError(message);
      } finally {
        setAiSuggestionLoadingId(null);
      }
    },
    [load]
  );

  const insertDraftIntoChat = useCallback(async (contactName: string, text: string) => {
    setInsertingDraftId(contactName);
    setActionError(null);
    try {
      await sendMessage({ type: 'INSERT_DRAFT_INTO_CHAT', payload: { contactName, text } });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to insert the draft into WhatsApp.';
      logger.error('Failed to insert draft into chat', message);
      setActionError(message);
    } finally {
      setInsertingDraftId(null);
    }
  }, []);

  return {
    followUps,
    loading,
    error,
    refresh: load,
    snooze,
    dismiss,
    markReplied,
    requestAiSuggestion,
    insertDraftIntoChat,
    aiSuggestionLoadingId,
    insertingDraftId,
    actionError,
    clearActionError: () => setActionError(null),
  };
}
