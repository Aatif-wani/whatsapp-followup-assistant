interface StatsCardProps {
  label: string;
  value: number;
  accent?: 'green' | 'amber' | 'gray';
}

const ACCENT_CLASSES: Record<NonNullable<StatsCardProps['accent']>, string> = {
  green: 'text-whatsapp-green',
  amber: 'text-amber-500',
  gray: 'text-gray-500',
};

/** Small metric tile shown in a row at the top of the popup dashboard. */
export function StatsCard({ label, value, accent = 'gray' }: StatsCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg border border-gray-200 bg-white py-2">
      <span className={`text-xl font-bold ${ACCENT_CLASSES[accent]}`}>{value}</span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}
