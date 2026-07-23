interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Accessible labeled toggle switch, styled with Tailwind, no external deps. */
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {description && <span className="text-xs text-gray-500">{description}</span>}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`absolute inset-0 rounded-full transition-colors ${
            checked ? 'bg-whatsapp-green' : 'bg-gray-300'
          } ${disabled ? 'opacity-50' : ''}`}
        />
        <span
          className={`absolute h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </label>
  );
}
