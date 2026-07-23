# WhatsApp Follow-up Assistant

A Chrome Extension (Manifest V3) that watches **WhatsApp Web** and helps you never drop a
conversation — in either direction:

- **Messages you sent that haven't been replied to** — reminds you to follow up with them.
- **Messages you received that you haven't replied to yet** — reminds you not to leave
  people on seen.

Optionally, it can also draft an AI-generated reply suggestion for you via the OpenAI API.

> ⚠️ Not affiliated with or endorsed by WhatsApp Inc. / Meta. WhatsApp Web's DOM is
> unofficial and can change at any time; see [Limitations](#limitations--maintenance) below.

---

## 🙋 A note on how this was built

I'm a first-year Computer Science student, and I don't actually know TypeScript. This
whole project was **vibe-coded** — built by describing what I wanted to AI models
(ChatGPT for planning out the design, Claude for writing and debugging the actual code),
rather than writing it line-by-line myself from existing knowledge. It took a lot of back
and forth and a lot of real bugs before it worked: a popup that rendered at the wrong
size, a content script that silently crashed because of a module error, and WhatsApp's
own page structure changing in ways that broke detection more than once. Each one took
real debugging — reading console errors, inspecting the page's HTML, and trying again —
even without deep prior knowledge of the underlying code.

I'm sharing this openly rather than hiding it, because I think it's a fair and honest
description of how the project came together, and I'm still learning.

---

## ✨ Features

- **Two-way tracking**
  - "Waiting on them" — you messaged, they haven't replied.
  - "Your turn to reply" — they messaged, you haven't replied (so you don't leave
    someone on seen).
- **Reply detection** — automatically clears a pending follow-up once the other side
  responds, in either direction.
- **Scheduled reminders** — uses `chrome.alarms` to reliably fire reminders even if the
  service worker has been unloaded in the meantime.
- **Desktop notifications** — `chrome.notifications` with quick actions ("Snooze 1h",
  "Mark as replied") right on the notification.
- **Popup dashboard** — see pending / overdue / replied-today counts and manage each
  follow-up (snooze, dismiss, mark replied, request an AI suggestion).
- **Settings page** — configure delay/interval/max-reminders for both directions,
  notifications, ignored contacts, and OpenAI integration.
- **AI-generated reply suggestions** — optional OpenAI Chat Completions integration
  drafts a short, natural reply or follow-up message for a given thread.
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
  (create → remind → snooze/dismiss/reply), for both tracking directions. The background
  service worker is a thin message router that delegates into this service.
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
- **Follow-up delay** — minutes to wait after sending before considering a message due
  for a follow-up.
- **Reminder interval** — minutes between repeated reminders if still unanswered.
- **Maximum reminders** — cap on repeated notifications per message.
- **Track incoming replies** — toggle whether the extension also reminds you to reply
  to messages sent to you.
- **Incoming reply delay** — minutes to wait after receiving a message before reminding
  you to reply.
- **AI suggestions** — enable and provide an OpenAI API key + model to get drafted
  reply/follow-up messages. The key is stored only in `chrome.storage.local` on your
  machine and is sent solely to `api.openai.com`.
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
