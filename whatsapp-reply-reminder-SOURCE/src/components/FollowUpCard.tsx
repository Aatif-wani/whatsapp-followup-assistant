import { useState } from 'react';
import { FollowUp, TrackingMode } from '@/types';
import { formatRelativeTime, isOverdue } from '@utils/date.utils';
import { truncate } from '@utils/text.utils';

interface FollowUpCardProps {
  followUp: FollowUp;
  mode: TrackingMode;
  aiSuggestionsEnabled: boolean;
  aiLoading: boolean;
  insertLoading: boolean;
  onSnooze: (minutes: number) => void;
  onDismiss: () => void;
  onMarkReplied: () => void;
  onRequestAiSuggestion: () => void;
  onInsertIntoChat: () => void;
}

/** Renders a single tracked conversation with due-time and action controls. */
export function FollowUpCard({
  followUp,
  mode,
  aiSuggestionsEnabled,
  aiLoading,
  insertLoading,
  onSnooze,
  onDismiss,
  onMarkReplied,
  onRequestAiSuggestion,
  onInsertIntoChat,
}: FollowUpCardProps) {
  const overdue = isOverdue(followUp.dueAt);
  const isReplyMode = mode === 'notify-reply';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!followUp.aiSuggestion) return;
    await navigator.clipboard.writeText(followUp.aiSuggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">{followUp.contactName}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
            {truncate(followUp.lastMessageText, 100)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            overdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {overdue ? 'Overdue' : formatRelativeTime(followUp.dueAt)}
        </span>
      </div>

      {followUp.aiSuggestion && (
        <div className="mt-2 rounded-md bg-whatsapp-green/10 px-2 py-1.5 text-xs text-whatsapp-teal">
          <p>
            💡 <span className="font-medium">{isReplyMode ? 'Suggested reply:' : 'Suggested follow-up:'}</span>{' '}
            {followUp.aiSuggestion}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded border border-whatsapp-green/40 bg-white px-2 py-0.5 text-[11px] font-medium text-whatsapp-teal transition hover:bg-whatsapp-green/10"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            <button
              type="button"
              onClick={onInsertIntoChat}
              disabled={insertLoading}
              title={`Open the "${followUp.contactName}" chat on WhatsApp Web first`}
              className="rounded border border-whatsapp-green/40 bg-white px-2 py-0.5 text-[11px] font-medium text-whatsapp-teal transition hover:bg-whatsapp-green/10 disabled:opacity-50"
            >
              {insertLoading ? 'Inserting…' : '↪ Insert into chat'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onMarkReplied}
          className="rounded-md bg-whatsapp-green px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
        >
          Mark replied
        </button>
        <button
          type="button"
          onClick={() => onSnooze(60)}
          className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
        >
          Snooze 1h
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-200"
        >
          Dismiss
        </button>
        {aiSuggestionsEnabled && (
          <button
            type="button"
            onClick={onRequestAiSuggestion}
            disabled={aiLoading}
            className="ml-auto rounded-md border border-whatsapp-green px-2.5 py-1 text-xs font-medium text-whatsapp-teal transition hover:bg-whatsapp-green/10 disabled:opacity-50"
          >
            {aiLoading
              ? 'Thinking…'
              : followUp.aiSuggestion
                ? 'Regenerate'
                : isReplyMode
                  ? '✨ Draft reply'
                  : '✨ Suggest'}
          </button>
        )}
      </div>
    </div>
  );
}
