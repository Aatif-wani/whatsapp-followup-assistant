import { FollowUp, TrackingMode } from '@/types';
import { FollowUpCard } from '@components/FollowUpCard';
import { EmptyState } from '@components/EmptyState';

interface FollowUpListProps {
  followUps: FollowUp[];
  mode: TrackingMode;
  aiSuggestionsEnabled: boolean;
  aiSuggestionLoadingId: string | null;
  insertingDraftId: string | null;
  onSnooze: (id: string, minutes: number) => void;
  onDismiss: (id: string) => void;
  onMarkReplied: (id: string) => void;
  onRequestAiSuggestion: (id: string) => void;
  onInsertIntoChat: (contactName: string, text: string) => void;
}

/** Renders the scrollable list of pending follow-ups, or an empty state. */
export function FollowUpList({
  followUps,
  mode,
  aiSuggestionsEnabled,
  aiSuggestionLoadingId,
  insertingDraftId,
  onSnooze,
  onDismiss,
  onMarkReplied,
  onRequestAiSuggestion,
  onInsertIntoChat,
}: FollowUpListProps) {
  const pending = followUps.filter((f) => f.status === 'pending');

  if (pending.length === 0) {
    return (
      <EmptyState
        title="You're all caught up!"
        description={
          mode === 'notify-reply'
            ? "No pending replies right now. When someone messages you on WhatsApp Web, we'll remind you if it goes unanswered."
            : "No pending follow-ups right now. Send a message on WhatsApp Web and we'll track it for you."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto px-3 py-2">
      {pending.map((followUp) => (
        <FollowUpCard
          key={followUp.id}
          followUp={followUp}
          mode={mode}
          aiSuggestionsEnabled={aiSuggestionsEnabled}
          aiLoading={aiSuggestionLoadingId === followUp.id}
          insertLoading={insertingDraftId === followUp.contactName}
          onSnooze={(minutes) => onSnooze(followUp.id, minutes)}
          onDismiss={() => onDismiss(followUp.id)}
          onMarkReplied={() => onMarkReplied(followUp.id)}
          onRequestAiSuggestion={() => onRequestAiSuggestion(followUp.id)}
          onInsertIntoChat={() => onInsertIntoChat(followUp.contactName, followUp.aiSuggestion ?? '')}
        />
      ))}
    </div>
  );
}
