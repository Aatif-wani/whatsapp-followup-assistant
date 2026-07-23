import { useState } from 'react';
import { Settings } from '@/types';
import { Toggle } from '@components/Toggle';
import { OPENAI_MODELS } from '@utils/constants';

interface SettingsFormProps {
  settings: Settings;
  saving: boolean;
  onUpdate: (partial: Partial<Settings>) => Promise<void>;
}

/** Full settings form: tracking behavior, reminders, notifications, and AI configuration. */
export function SettingsForm({ settings, saving, onUpdate }: SettingsFormProps) {
  const [ignoredContactInput, setIgnoredContactInput] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const addIgnoredContact = () => {
    const name = ignoredContactInput.trim();
    if (!name || settings.ignoredContacts.includes(name)) return;
    void onUpdate({ ignoredContacts: [...settings.ignoredContacts, name] });
    setIgnoredContactInput('');
  };

  const removeIgnoredContact = (name: string) => {
    void onUpdate({ ignoredContacts: settings.ignoredContacts.filter((c) => c !== name) });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          What to remind me about
        </h2>
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
          <ModeOption
            selected={settings.mode === 'notify-follow-up'}
            onSelect={() => void onUpdate({ mode: 'notify-follow-up' })}
            title="Messages I sent that they haven't replied to"
            description="You message someone and they go quiet — get reminded to follow up with them."
          />
          <ModeOption
            selected={settings.mode === 'notify-reply'}
            onSelect={() => void onUpdate({ mode: 'notify-reply' })}
            title="Messages they sent that I haven't replied to"
            description="Someone messages you and it slips through the cracks — get reminded to reply."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          General
        </h2>
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white px-4">
          <Toggle
            checked={settings.enabled}
            onChange={(checked) => void onUpdate({ enabled: checked })}
            label="Enable tracking"
            description="Detect outgoing messages and replies on WhatsApp Web."
          />
          <Toggle
            checked={settings.notificationsEnabled}
            onChange={(checked) => void onUpdate({ notificationsEnabled: checked })}
            label="Desktop notifications"
            description="Show a system notification when a follow-up is due."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Reminder timing
        </h2>
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
          <NumberField
            label={
              settings.mode === 'notify-reply'
                ? 'Reply delay (minutes)'
                : 'Follow-up delay (minutes)'
            }
            description={
              settings.mode === 'notify-reply'
                ? "How long to wait after they message you before considering it due for a reply."
                : 'How long to wait after sending a message before considering it due for follow-up.'
            }
            value={settings.followUpDelayMinutes}
            min={5}
            onChange={(value) => void onUpdate({ followUpDelayMinutes: value })}
          />
          <NumberField
            label="Reminder interval (minutes)"
            description="Time between repeated reminders if still unanswered."
            value={settings.reminderIntervalMinutes}
            min={5}
            onChange={(value) => void onUpdate({ reminderIntervalMinutes: value })}
          />
          <NumberField
            label="Maximum reminders"
            description="Stop reminding after this many notifications for a single message."
            value={settings.maxReminders}
            min={1}
            max={10}
            onChange={(value) => void onUpdate({ maxReminders: value })}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          AI Suggestions
        </h2>
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <Toggle
            checked={settings.aiSuggestionsEnabled}
            onChange={(checked) => void onUpdate({ aiSuggestionsEnabled: checked })}
            label={
              settings.mode === 'notify-reply'
                ? 'Enable AI-generated reply suggestions'
                : 'Enable AI-generated follow-up suggestions'
            }
            description={
              settings.mode === 'notify-reply'
                ? 'Uses the OpenAI API to draft a short reply to their message for you.'
                : 'Uses the OpenAI API to draft a short follow-up message for you.'
            }
          />

          {settings.aiSuggestionsEnabled && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">
                  OpenAI API key
                </label>
                <div className="flex gap-2">
                  <input
                    type={apiKeyVisible ? 'text' : 'password'}
                    value={settings.openAiApiKey}
                    onChange={(e) => void onUpdate({ openAiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp-green focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                  />
                  <button
                    type="button"
                    onClick={() => setApiKeyVisible((v) => !v)}
                    className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {apiKeyVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Stored only in your browser&apos;s local extension storage. Never sent
                  anywhere but the OpenAI API.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-800">Model</label>
                <select
                  value={settings.openAiModel}
                  onChange={(e) => void onUpdate({ openAiModel: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp-green focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                >
                  {OPENAI_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Ignored contacts
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={ignoredContactInput}
              onChange={(e) => setIgnoredContactInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addIgnoredContact()}
              placeholder="Exact contact/chat name as shown in WhatsApp"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-whatsapp-green focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
            <button
              type="button"
              onClick={addIgnoredContact}
              className="shrink-0 rounded-md bg-whatsapp-green px-3 py-2 text-xs font-medium text-white hover:opacity-90"
            >
              Add
            </button>
          </div>

          {settings.ignoredContacts.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {settings.ignoredContacts.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeIgnoredContact(name)}
                    aria-label={`Remove ${name}`}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {saving && <p className="text-xs text-gray-400">Saving…</p>}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

interface ModeOptionProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}

/** Single selectable card in the tracking-direction chooser at the top of settings. */
function ModeOption({ selected, onSelect, title, description }: ModeOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition ${
        selected
          ? 'border-whatsapp-green bg-whatsapp-green/5'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          selected ? 'border-whatsapp-green' : 'border-gray-300'
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-whatsapp-green" />}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-gray-800">{title}</span>
        <span className="text-xs text-gray-500">{description}</span>
      </span>
    </button>
  );
}

function NumberField({ label, description, value, min, max, onChange }: NumberFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-800">{label}</label>
      {description && <p className="mb-1 text-xs text-gray-500">{description}</p>}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
        className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-whatsapp-green focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
      />
    </div>
  );
}
