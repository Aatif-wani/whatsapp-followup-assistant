# WhatsApp Follow-up Assistant

A Chrome Extension (Manifest V3) that watches **WhatsApp Web**, detects messages you send
that haven't been replied to, and reminds you to follow up — optionally with an
AI-drafted follow-up message via the OpenAI API.

> ⚠️ Not affiliated with or endorsed by WhatsApp Inc. / Meta. WhatsApp Web's DOM is
> unofficial and can change at any time; see [Limitations](#limitations--maintenance) below.

---

## ✨ Features

- **Outgoing message detection** — a content script observes the active WhatsApp Web
  conversation and detects messages you send.
- **Reply detection** — automatically clears a pending follow-up once the contact replies.
- **Scheduled reminders** — uses `chrome.alarms` to reliably fire reminders even if the
  service worker has been unloaded in the meantime.
- **Desktop notifications** — `chrome.notifications` with quick actions ("Snooze 1h",
  "Mark as replied") right on the notification.
- **Popup dashboard** — see pending / overdue / replied-today counts and manage each
  follow-up (snooze, dismiss, mark replied, request an AI suggestion).
- **Settings page** — configure delay/interval/max-reminders, notifications, ignored
  contacts, and OpenAI integration.
- **AI-generated follow-up suggestions** — optional OpenAI Chat Completions integration
  drafts a short, natural follow-up message for a given thread.
- **Typed, layered architecture** — `services/`, `hooks/`, `components/`, `types/`,
  `utils/`, with the background service worker as the single source of business logic.

---

## 🧱 Tech stack

| Layer            | Choice                                  |
| ---------------- | ---------------------------------------- |
| Language          | TypeScript (strict mode)                |
| UI                | React 18                                |
| Bundler           | Vite 5 (multi-entry MV3 build)          |
| Styling           | Tailwind CSS                            |
| Persistence       | `chrome.storage.local`                  |
| Scheduling        | `chrome.alarms`                         |
| Notifications     | `chrome.notifications`                  |
| AI suggestions    | OpenAI Chat Completions API             |
| Lint / Format     | ESLint + Prettier                       |

---

## 📁 Project structure

```
whatsapp-followup-assistant/
├── popup.html                  # Popup entry HTML (Vite input)
├── options.html                # Options page entry HTML (Vite input)
├── src/
│   ├── manifest.json            # MV3 manifest (copied verbatim into dist/)
│   ├── background/
│   │   └── background.ts        # Service worker: message router, alarms, notifications
│   ├── content/
│   │   ├── content.ts            # Content script entry point
│   │   └── whatsapp-observer.ts  # MutationObserver-based DOM watcher
│   ├── popup/
│   │   ├── main.tsx
│   │   └── Popup.tsx
│   ├── options/
│   │   ├── main.tsx
│   │   └── Options.tsx
│   ├── components/               # Presentational React components
│   ├── hooks/                    # useFollowUps, useSettings, useRuntimeBroadcast
│   ├── services/                 # storage, alarm, notification, openai, followup
│   ├── types/                    # Shared TypeScript types
│   ├── utils/                    # constants, date/text/id utils, logger
│   └── styles/globals.css        # Tailwind entry stylesheet
├── public/icons/                 # Extension icons (16/48/128)
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── .eslintrc.cjs
├── .prettierrc
└── package.json
```

### Architecture notes

- **`services/`** contain all side-effecting logic (chrome APIs, fetch calls) behind
  small, typed classes. Nothing else in the codebase calls `chrome.storage`,
  `chrome.alarms`, or `chrome.notifications` directly.
- **`followup.service.ts`** is the single orchestrator for the follow-up lifecycle
  (create → remind → snooze/dismiss/reply). The background service worker is a thin
  message router that delegates into this service.
- **`content/whatsapp-observer.ts`** isolates all WhatsApp DOM selectors in one file,
  so future WhatsApp markup changes only require updating this file.
- **UI (`popup/`, `options/`)** never talks to `chrome.storage` directly — it goes
  through `chrome.runtime.sendMessage` to the background script via the hooks in
  `hooks/`, keeping a single source of truth and avoiding race conditions between
  multiple open UI surfaces.

---

## 🚀 Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Build the extension

```bash
npm run build
```

This produces a production build in `dist/` containing `manifest.json`, `popup.html`,
`options.html`, `background.js`, `content.js`, and hashed asset bundles.

### 3. Load it into Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `dist/` folder produced by the build.
5. Open [web.whatsapp.com](https://web.whatsapp.com) and log in — the extension
   activates automatically.

### 4. (Optional) Watch mode during development

```bash
npm run dev
```

Rebuilds on file changes. After each rebuild, click the refresh icon on the
extension's card in `chrome://extensions` to pick up the new `background.js` /
`content.js` (Chrome does not hot-reload MV3 service workers or content scripts).

---

## ⚙️ Configuration

Open the extension's **Settings** page (gear icon in the popup, or right-click the
toolbar icon → *Options*) to configure:

- **Enable tracking** — master on/off switch.
- **Desktop notifications** — toggle system notifications.
- **Follow-up delay** — minutes to wait after sending before considering a message due.
- **Reminder interval** — minutes between repeated reminders if still unanswered.
- **Maximum reminders** — cap on repeated notifications per message.
- **AI suggestions** — enable and provide an OpenAI API key + model to get drafted
  follow-up messages. The key is stored only in `chrome.storage.local` on your machine
  and is sent solely to `api.openai.com`.
- **Ignored contacts** — chat names that should never be tracked.

---

## 🧪 Linting & formatting

```bash
npm run lint          # ESLint
npm run lint:fix       # ESLint with autofix
npm run format         # Prettier write
npm run format:check   # Prettier check only
npm run type-check     # tsc --noEmit
```

---

## 🔐 Privacy & permissions

| Permission                     | Why it's needed                                            |
| ------------------------------- | ------------------------------------------------------------ |
| `storage`                       | Persist follow-ups and settings locally.                     |
| `alarms`                        | Schedule reminder checks reliably, independent of tab state.  |
| `notifications`                 | Show desktop reminders.                                       |
| `host_permissions: web.whatsapp.com` | Run the content script that reads message text/sender.  |
| `host_permissions: api.openai.com`   | Send follow-up context to OpenAI when AI suggestions are enabled. |

No data leaves your machine unless you explicitly enable AI suggestions, in which case
only the relevant message text and contact name are sent to OpenAI to draft a reply.

---

## Limitations & maintenance

WhatsApp Web's DOM structure is unofficial, obfuscated, and changes without notice.
The selectors in `src/content/whatsapp-observer.ts` are written against structural and
`data-testid`/`aria` attributes where possible to reduce breakage, but WhatsApp updates
may still require selector adjustments. If detection stops working:

1. Open WhatsApp Web, right-click a chat's header title → *Inspect*.
2. Compare the current DOM against `SELECTORS` in `whatsapp-observer.ts`.
3. Update the selector constants accordingly — no other file needs to change.

---

## 📄 License

MIT — do whatever you like with this, at your own risk. This project is provided as-is
with no warranty; use of the OpenAI API is subject to OpenAI's own terms and pricing.
