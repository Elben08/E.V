# E.V — Your Personal AI Assistant

A phone-first, Spider-Man-style AI assistant. Voice or text chat, real-time answers, memory of facts about you, phone control, and automatic privacy routing. 100% free, no credit card.

## What it does

- **Voice chat** — tap the arc reactor, talk, and E.V answers aloud.
- **Text chat** — type if you prefer.
- **Live info** — weather, news, sports, anything current (via Gemini Google Search grounding).
- **Attachments** — attach photos or PDFs (paperclip) and E.V reads them directly.
- **Memory** — remembers your name, likes, address, birthday, etc. View/edit in the memory panel.
- **Phone control** — "open WhatsApp", "remind me in 10 minutes to stretch", "turn on the flashlight" (needs MacroDroid).
- **Privacy routing** — sensitive messages auto-route to Groq (no data training) instead of Gemini; memory tagged private never leaves the device toward Gemini.

## The brain (both free)

| Provider | Role | Free limits (no card) |
|---|---|---|
| Google Gemini (`gemini-3.5-flash`) | Main brain + live web search | ~1,500 req/day |
| Groq (`openai/gpt-oss-120b`) | Private/sensitive route + auto-fallback | ~1,000 req/day |
| Groq vision (`qwen/qwen3.6-27b`) | Reads attached images on the private route | same Groq quota |

> **Model resilience** — if the active model gets deprecated or becomes unavailable, E.V automatically switches to the next capable free-tier model. The active model is shown in the chat tag and in Settings, where you can reset either provider back to its default model. Settings → **Test connections** probes all candidate models and picks the best working one. When you attach a photo, E.V switches Groq to its vision model automatically.

## Setup (one time, ~15 minutes)

### 1. Get the API keys

- **Gemini**: go to [aistudio.google.com](https://aistudio.google.com) → sign in with a Google account → **Get API key** → copy it (`AIza...`).
- **Groq**: go to [console.groq.com](https://console.groq.com) → sign up → **API Keys** → **Create** → copy it (`gsk_...`).

### 2. Put E.V on the web (needed for voice on your phone)

Voice input only works on HTTPS (or localhost). This project is hosted from [github.com/Elben08/E.V](https://github.com/Elben08/E.V); with GitHub Pages enabled it's live at `https://elben08.github.io/E.V/`.

To set that up:

1. Push the files from this folder (`index.html`, `styles.css`, `app.js`, `manifest.json`, `icon.svg`, `sw.js`) to the repo's `main` branch.
2. Go to **Settings → Pages → Branch: main → Save**.
3. Wait ~1 minute, then E.V is live at `https://elben08.github.io/E.V/`.

New to GitHub? Create a free account, make a new **public** repository named `E.V`, then upload the files above.

> Alternative: host locally and open `http://localhost:8080` in a desktop browser to test text chat (voice works on desktop too since localhost is a secure context).

### 3. Open it on your phone

Open the GitHub Pages link in **Chrome** on your Android phone. Tap the gear icon, paste both API keys, save.

### 4. Install it like an app

In Chrome: menu (⋮) → **Add to Home screen**. E.V now has its own icon and fullscreen app.

## Using E.V

- **Tap the reactor** → speak. E.V transcribes and replies out loud.
- **Attach files (paperclip)** — pick one or more photos or PDFs, then send. Thumbnails appear above the input; tap **×** to remove. Photos work on both providers (Gemini natively, Groq via its vision model); PDFs only on Gemini.
- **Settings (gear)** — API keys, default provider, privacy routing, voice on/off, and **Test connections** to diagnose each provider.
- **Memory (book icon)** — see what E.V remembers; delete entries you don't want.
- **Private session** — say *"this is private"* to route everything to Groq until you say *"private mode off"*.

### Phone control commands

| Say | What happens |
|---|---|
| "Open whatsapp / maps / youtube / spotify / gmail / settings ..." | Launches that app |
| "Remind me in 10 minutes to drink water" | Notification + spoken reminder |
| "Turn on the flashlight" / "Turn off wifi" | Fires a MacroDroid intent (see below) |

### MacroDroid (free, optional — for real device toggles)

1. Install [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) (free).
2. Create a Macro → **Trigger: Intent Received**.
   - Action: `com.ev.flashlight.on` (or `.off`, `com.ev.wifi.on`, `com.ev.bluetooth.on`, ...)
   - Category: leave the default.
3. **Action: Set Flashlight / Wi-Fi / Bluetooth** accordingly, then enable the macro.
4. Allow MacroDroid the needed permissions when prompted.

App-launching and reminders work without MacroDroid.

## How privacy routing works

1. **PII scan** — card numbers, SSNs, phone numbers, emails → flagged.
2. **Keyword scan** — passwords, bank, medical, address, salary, etc. → flagged (whole-word matching).
3. **Default-deny categories** — credentials / finance / health / identity always go to Groq.
4. **Voice override** — "this is private" forces Groq for the session.
5. **Tagged memory** — facts learned from sensitive messages are marked `private` and only used on the Groq route.

Everything runs on-device and instant. Groq does not train on your data; Gemini free tier may. Nothing sensitive is ever sent to Gemini.

## Project files

| File | What it is |
|---|---|
| `index.html` | Chat UI + arc-reactor button |
| `styles.css` | Iron Man HUD theme |
| `app.js` | Voice, providers, routing, memory, phone control |
| `manifest.json` + `icon.svg` | Makes it installable as an app |
| `sw.js` | Offline caching |

## Known limits

- **Tap-to-talk**, not a wake word — browsers stop listening after ~1 minute, so hands-free "Hey E.V" isn't reliable in a web app.
- **Attachments** — images up to 7 MB each, PDFs up to 20 MB, max 5 files / 20 MB total. Files are read in-browser only and never stored; history keeps just a `[Attached file]` note. PDFs don't work on the Groq route, and attachments are kept out of private-mode history.
- Deep control *inside* other apps (typing/swiping) needs a native Android app — a future upgrade.
- API keys are stored on your device; treat this as a personal app, don't publish it publicly with your keys.
