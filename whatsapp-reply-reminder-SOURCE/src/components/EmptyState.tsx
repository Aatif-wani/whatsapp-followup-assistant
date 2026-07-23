interface EmptyStateProps {
  title: string;
  description: string;
}

/** Friendly empty-state illustration + copy shown when there is nothing to display. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp-green/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-whatsapp-green"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <p className="max-w-[260px] text-xs text-gray-500">{description}</p>
    </div>
  );
}
