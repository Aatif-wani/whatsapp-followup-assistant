import { useMemo } from 'react';
import { Header } from '@components/Header';
import { StatsCard } from '@components/StatsCard';
import { FollowUpList } from '@components/FollowUpList';
import { useFollowUps } from '@hooks/useFollowUps';
import { useSettings } from '@hooks/useSettings';
import { isOverdue } from '@utils/date.utils';

/** Root component rendered inside the extension's toolbar popup. */
export function Popup() {
  const {
    followUps,
    loading,
    error,
    snooze,
    dismiss,
    markReplied,
    requestAiSuggestion,
    insertDraftIntoChat,
    aiSuggestionLoadingId,
    insertingDraftId,
    actionError,
    clearActionError,
  } = useFollowUps();
  const { settings } = useSettings();

  const stats = useMemo(() => {
    const pending = followUps.filter((f) => f.status === 'pending');
    const overdue = pending.filter((f) => isOverdue(f.dueAt));
    const repliedToday = followUps.filter(
      (f) => f.status === 'replied' && f.repliedAt && Date.now() - f.repliedAt < 86_400_000
    );
    return { pending: pending.length, overdue: overdue.length, repliedToday: repliedToday.length };
  }, [followUps]);

  const openOptionsPage = () => chrome.runtime.openOptionsPage();
  const isReplyMode = settings?.mode === 'notify-reply';

  return (
    <div className="flex h-full max-h-[560px] flex-col bg-gray-50">
      <Header
        title={isReplyMode ? 'Reply Reminder' : 'Follow-up Assistant'}
        subtitle="WhatsApp Web"
        onSettingsClick={openOptionsPage}
      />

      <div className="flex gap-2 px-3 pt-3">
        <StatsCard label="Pending" value={stats.pending} accent="gray" />
        <StatsCard label="Overdue" value={stats.overdue} accent="amber" />
        <StatsCard label="Replied today" value={stats.repliedToday} accent="green" />
      </div>

      {error && (
        <p className="mx-3 mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {actionError && (
        <div className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={clearActionError}
            className="shrink-0 font-medium text-red-500 hover:text-red-700"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      ) : (
        <FollowUpList
          followUps={followUps}
          mode={settings?.mode ?? 'notify-follow-up'}
          aiSuggestionsEnabled={!!settings?.aiSuggestionsEnabled}
          aiSuggestionLoadingId={aiSuggestionLoadingId}
          insertingDraftId={insertingDraftId}
          onSnooze={snooze}
          onDismiss={dismiss}
          onMarkReplied={markReplied}
          onRequestAiSuggestion={requestAiSuggestion}
          onInsertIntoChat={insertDraftIntoChat}
        />
      )}

      <footer className="border-t border-gray-200 px-3 py-2 text-center text-[10px] text-gray-400">
        {isReplyMode ? 'WhatsApp Reply Reminder' : 'WhatsApp Follow-up Assistant'} · not affiliated
        with WhatsApp Inc.
      </footer>
    </div>
  );
}
