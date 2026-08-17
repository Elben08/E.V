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

## The brain (all free)

| Provider | Role | Free limits (no card) |
|---|---|---|
| Google Gemini (`gemini-3.5-flash`) | Main brain + live web search | ~1,500 req/day |
| Groq (`openai/gpt-oss-120b`) | Private/sensitive route + auto-fallback | ~1,000 req/day |
| Groq vision (`qwen/qwen3.6-27b`) | Reads attached images on the private route | same Groq quota |
| OpenRouter (latest `:free` models) | Third fallback + outage escape (text-only, non-sensitive) | varies by free model |

> **Model resilience** — if the active model gets deprecated or becomes unavailable, E.V automatically switches to the next capable free-tier model. The active model is shown in the chat tag and in Settings, where you can reset any provider back to its default model. OpenRouter chat tags show the exact free model that answered (it pins the latest strong free models like `nvidia/nemotron-3.5-lightning:free` and `google/gemma-4-31b-it:free`, with `openrouter/free` as a last-resort catch-all). Settings → **Test connections** probes all candidate models and picks the best working one. When you attach a photo, E.V switches Groq to its vision model automatically. When a provider is out of free quota, E.V rotates to its next model (Gemini) or remembers the outage and routes around it for 5 minutes (OpenRouter is the final fallback).

## Setup (one time, ~15 minutes)

### 1. Get the API keys

- **Gemini**: go to [aistudio.google.com](https://aistudio.google.com) → sign in with a Google account → **Get API key** → copy it (`AIza...`).
- **Groq**: go to [console.groq.com](https://console.groq.com) → sign up → **API Keys** → **Create** → copy it (`gsk_...`).
- **OpenRouter (optional)**: go to [openrouter.ai](https://openrouter.ai) → sign up → **Keys** → **Create Key** → copy it (`sk-or-v1-...`). Free models need no card. E.V uses it as a third fallback for **text-only, non-sensitive** turns (free models may log/train on prompts), or as the default provider if you choose "OpenRouter only". Groq/OpenRouter models have **no live internet** in E.V, so real-time questions like "today's weather" get an honest "can't fetch live data" instead of a made-up answer — use Gemini for live search.

### 2. Put E.V on the web (needed for voice on your phone)

Voice input only works on HTTPS (or localhost). This project is hosted from [github.com/Elben08/E.V](https://github.com/Elben08/E.V); with GitHub Pages enabled it's live at `https://elben08.github.io/E.V/`.

To set that up:

1. Push the files from this folder (`index.html`, `styles.css`, `app.js`, `manifest.json`, `icon.svg`, `sw.js`) to the repo's `main` branch.
2. Go to **Settings → Pages → Branch: main → Save**.
3. Wait ~1 minute, then E.V is live at `https://elben08.github.io/E.V/`.

New to GitHub? Create a free account, make a new **public** repository named `E.V`, then upload the files above.

> Alternative: host locally and open `http://localhost:8080` in a desktop browser to test text chat (voice works on desktop too since localhost is a secure context).

### 3. Open it on your phone

Open the GitHub Pages link in **Chrome** on your Android phone. Tap the gear icon, paste your API keys, save.

### 4. Install it like an app

In Chrome: menu (⋮) → **Add to Home screen**. E.V now has its own icon and fullscreen app.

## Using E.V

- **Tap the reactor** → speak. E.V transcribes and replies out loud.
- **Attach files (paperclip)** — pick one or more photos or PDFs, then send. Thumbnails appear above the input; tap **×** to remove. Photos work on the Gemini, Groq, and OpenRouter routes (OpenRouter via its pinned vision model `google/gemma-4-31b-it:free`); PDFs only on Gemini. The OpenRouter **auto-fallback** stays text-only.
- **Settings (gear)** — API keys, default provider, privacy routing, voice on/off, and **Test connections** to diagnose each provider.
- **Memory (book icon)** — see what E.V remembers; delete entries you don't want.
- **Private session** — say *"this is private"* to route everything to Groq until you say *"private mode off"*.

### Phone control commands

| Say | What happens |
|---|---|
| "Open whatsapp / maps / youtube / spotify / gmail / settings ..." | Launches that app |
| "Remind me in 10 minutes to drink water" | Notification + spoken reminder |
| "Turn on the flashlight" / "Turn off wifi" | Sends a MacroDroid webhook command (see below) |
| "Check my calendar" / "What's my next event?" | Sends the `calendar` webhook command; MacroDroid opens E.V with your next event (see below) |

### MacroDroid (free, optional — for real device toggles + calendar)

> E.V talks to MacroDroid through the **Webhook (URL)** trigger (a plain HTTP call), not intents — MacroDroid's *Intent Received* trigger is a broadcast receiver and can't be reached from a web page. Requires Google Play Services on the phone.

1. Install [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid) (free).
2. In E.V → **Settings (gear)** → paste your webhook URL (either form works — the base `https://trigger.macrodroid.com/<device-id>/` or the full `https://trigger.macrodroid.com/<device-id>/ev_cmd`; E.V appends `?cmd=...` itself).
3. Create **one** macro named `E.V Commands`:
   - **Trigger: Webhook (URL)** → Identifier `ev_cmd`. This gives you `https://trigger.macrodroid.com/<device-id>/ev_cmd`. If the trigger shows a PRO badge in the free version, stop here and let me know — we'll need a different approach.
   - **Global variable**: create a string variable named `cmd` (the webhook fills it from `?cmd=...`).
   - **Actions** (If / Else-If chain on `{v=cmd}`):
     - If `{v=cmd}` = `calendar` → **Get Calendar Events** (Select Calendar: Any; Start Offset 0; Duration 15 days; output to an **Array** variable `evEvents`) → **Open Website** → `https://elben08.github.io/E.V/?next={lvjson=evEvents}` (keep **URL encode parameters** ON — E.V lists every event in range as `Title · date` rows; the single-next-event form `?next={lv=evEvents[0][Title]}&date={lv=evEvents[0][Start]}` also works)
     - Else-If `{v=cmd}` = `flashlight.on` → **Set Flashlight: On**
     - Else-If `{v=cmd}` = `flashlight.off` → **Set Flashlight: Off**
     - (add `wifi.on` / `wifi.off` / `bluetooth.on` / `bluetooth.off` branches the same way if you want those)
4. Enable the macro and allow Calendar / Flashlight / Wi-Fi / Bluetooth permissions when prompted.

**Calendar debugging** — if E.V shows the raw magic text (e.g. `Calendar:{lv=evEvents[0].Title}`), the variable/key path didn't resolve. Temporarily change the Open Website URL to `?next={lv=evEvents}` to dump the whole array (E.V prints it as `[key]: value` lines), confirm it's populated, then restore the correct path. Bracketed keys per level (`[0][Title]`), not dot notation; `lv=` for local variables, `v=` for global.

> If "check my calendar" fires the macro but no browser tab opens, MacroDroid is missing the **"Display over other apps"** permission (required on Android 10+ for Open Website while MacroDroid is in the background): Android Settings → Apps → MacroDroid → Display over other apps → allow.

When you say *"check my calendar"*, E.V calls the webhook with `?cmd=calendar`, MacroDroid grabs the upcoming events and opens E.V with the event list as JSON (`?next={lvjson=evEvents}`). E.V shows them all in chat and keeps them on the private/Groq-only route. Works without root.

App-launching and reminders work without MacroDroid.

## How privacy routing works

1. **PII scan** — card numbers, SSNs, phone numbers, emails → flagged.
2. **Keyword scan** — passwords, bank, medical, address, salary, etc. → flagged (whole-word matching).
3. **Default-deny categories** — credentials / finance / health / identity always go to Groq.
4. **Voice override** — "this is private" forces Groq for the session.
5. **Tagged memory** — facts learned from sensitive messages are marked `private` and only used on the Groq route.

Everything runs on-device and instant. Groq does not train on your data; Gemini and OpenRouter free tiers may. Nothing sensitive is ever sent to Gemini or OpenRouter — sensitive/private turns stay on Groq when a Groq key is set.

## Project files

| File | What it is |
|---|---|
| `index.html` | Chat UI + arc-reactor button |
| `styles.css` | Iron Man HUD theme |
| `app.js` | Voice, providers, routing, memory, phone control |
| `manifest.json` + `icon.svg` | Makes it installable as an app |
| `sw.js` | Offline caching |

## Known limits

- **Free-tier caps** — Gemini and OpenRouter quotas reset daily (roughly midnight); Groq rolls per minute. E.V auto-rotates models, auto-retries rate limits, and remembers an out-of-quota provider for ~5 minutes. Settings → **Test connections** checks every provider at once.
- **Tap-to-talk**, or **Hands-free mode** (Settings → on): tap the reactor to start a voice session, then just say "Hey E.V …". While listening, a fullscreen glowing-orb overlay shows your live transcript; tap it to stop (or say "stop listening" / "goodbye" to end a hands-free session). Browsers stop listening after ~1 minute, so E.V silently restarts the mic while the session is live. End your message with "send now" (or "send it"/"send this"/"send that"/"send message") to send immediately instead of waiting for the silence timer. Needs Android Chrome, screen on, and microphone permission.
- **Attachments** — images up to 7 MB each, PDFs up to 20 MB, max 5 files / 20 MB total. Files are read in-browser only and never stored; history keeps just a `[Attached file]` note. PDFs don't work on the Groq route, and attachments are kept out of private-mode history.
- Deep control *inside* other apps (typing/swiping) needs a native Android app — a future upgrade.
- API keys are stored on your device; treat this as a personal app, don't publish it publicly with your keys.
