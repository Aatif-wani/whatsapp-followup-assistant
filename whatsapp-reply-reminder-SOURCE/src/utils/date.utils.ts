/** Converts minutes to milliseconds. */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/** Returns a human-readable relative time string, e.g. "5m ago", "in 2h". */
export function formatRelativeTime(timestampMs: number): string {
  const diffMs = timestampMs - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) return 'just now';

  const units: Array<[string, number]> = [
    ['minute', 1],
    ['hour', 60],
    ['day', 1440],
  ];

  let unitLabel = 'minute';
  let unitValue = absMinutes;

  for (const [label, minutesPerUnit] of units) {
    if (absMinutes >= minutesPerUnit) {
      unitLabel = label;
      unitValue = Math.round(absMinutes / minutesPerUnit);
    }
  }

  const plural = unitValue === 1 ? '' : 's';
  return diffMinutes >= 0
    ? `in ${unitValue} ${unitLabel}${plural}`
    : `${unitValue} ${unitLabel}${plural} ago`;
}

/** Formats a timestamp as a locale-aware short date + time string. */
export function formatDateTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Returns true if the given timestamp is in the past relative to now. */
export function isOverdue(timestampMs: number): boolean {
  return timestampMs <= Date.now();
}
