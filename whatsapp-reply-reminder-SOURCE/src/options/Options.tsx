import { Header } from '@components/Header';
import { SettingsForm } from '@components/SettingsForm';
import { useSettings } from '@hooks/useSettings';

/** Root component rendered on the extension's dedicated options/settings page. */
export function Options() {
  const { settings, loading, error, saving, updateSettings } = useSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={
          settings?.mode === 'notify-reply'
            ? 'WhatsApp Reply Reminder'
            : 'WhatsApp Follow-up Assistant'
        }
        subtitle="Settings"
      />

      {loading && <p className="p-6 text-sm text-gray-400">Loading settings…</p>}

      {error && (
        <p className="mx-6 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {settings && (
        <SettingsForm settings={settings} saving={saving} onUpdate={updateSettings} />
      )}
    </div>
  );
}
