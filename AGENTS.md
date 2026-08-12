# AGENTS.md — E.V

Static PWA (no build step): `index.html`, `styles.css`, `app.js`, `manifest.json`, `icon.svg`, `sw.js`. All logic is one vanilla-JS file (`app.js`, ~1,440 lines, no modules). There is no `package.json`, npm, linter, or test suite — do not invent build/lint/test commands.

## Deploy

- GitHub Pages auto-deploys from `main` → `https://elben08.github.io/E.V/`. Shipping = commit + push. Origin: `https://github.com/Elben08/E.V.git`.
- Verification (no node on this machine): `python C:\Users\1000332504\AppData\Local\Temp\opencode\jscheck.py app.js` and same for `sw.js` (structural JS checker). If that path is gone, note there is no other JS verification tooling.

## Release procedure — CRITICAL

Every release must bump **both**:
1. `const APP_VERSION = 'vN'` in `app.js` (shown in Settings; also cached into the SW URL via `./sw.js?ev=...`).
2. `const CACHE = 'ev-cache-vN'` in `sw.js` (must match).

`sw.js` uses stale-while-revalidate: cached assets are served instantly and `app.js`/`styles.css` are only refreshed when the cache name changes (activate deletes all other caches). Forgetting the `sw.js` bump means users keep running the old code indefinitely.

## Service-worker reload quirk

`init()` auto-reloads once when a new SW installs, stashing the draft input in `sessionStorage` keys `ev.sw-reload` / `ev.sw-text`. Keep those keys and that flow intact, or you'll wipe users' in-progress messages on every update.

## Architecture (app.js)

- Constants at top: model lists, sensitivity keywords, phone-command regexes, `STORAGE`/`DEFAULT_SETTINGS`, `APP_VERSION`, Groq budgets.
- `init()` at bottom is the entrypoint; `el.*` is the DOM element map.
- History entries: `{ role: 'user'|'ev', text, sensitive, ... }`. Failed replies persist as `{ failed: true, errorMsg, retryUserText, retryProvider, retryReason }` and are restored by `renderHistory()` with a working Retry button. Don't break the `entryRef`/`writeEvEntry` update path.
- Calendar lookup: phrase → `CALENDAR_RE` → webhook command `calendar` (MacroDroid Webhook trigger); MacroDroid reopens E.V as `https://elben08.github.io/E.V/#next=<event>`; `parseCalendarFragment()`/`init()` read it, show it, store it as `{ role:'user', text:'[Calendar lookup result] …', sensitive: true }`, then clear the hash via `history.replaceState`. MacroDroid config (5.65+ specifics) is in README.
- Phone control uses `triggerMacro(action)` → `fetch(settings.macroWebhook + '/ev_cmd?cmd=' + action, { mode:'no-cors' })` (a MacroDroid **Webhook (URL)** trigger, since `intent://` can't reach MacroDroid's broadcast-receiver trigger). Actions are bare words: `calendar`, `flashlight.on`, `flashlight.off`, `wifi.on/off`, `bluetooth.on/off`. Returns an error string (shown as the reply) when no webhook URL is set. App launches still use `scheme=...;package=...;S.browser_fallback_url=...`.

## Privacy invariant (do not violate)

Sensitive content must **never** reach Gemini. `analyzeSensitivity` → `chooseProvider` routes sensitive/private to Groq. `buildMessages` skips `h.sensitive` history entries on the Gemini route; `visibleFacts` hides sensitive facts from Gemini. Calendar results and anything keyword/PII-flagged ride this same rule. Keep new features consistent.

## Groq free-tier token budgets

Estimate is `Math.ceil(text.length / 4)`, which undercounts real Groq tokens by ~1.7× (e.g. estimated 7,264 → Groq counted 12,349). Budget constants (`GROQ_TEXT_BUDGET`, `GROQ_TIGHT_TEXT_BUDGET`, `GROQ_IMAGE_BUDGET`) and `fitGroqTextBudget`/`groqSendFitted` handle trimming + retry-on-TPM-too-large (`isTooLargeError`). Don't casually raise these; they exist because Groq free tier is 8K TPM.

## Style notes

- No semicolon-free style; code follows existing compact idioms with `/* ... */` inline comments.
- UI glyphs are HTML entities (`&#10133;`), not raw emoji. `styles.css` is the only styling file; there is a `max-width: 380px` narrow-screen media query and `#text-input { min-width: 0 }` that must stay (reactor clipping regression).
- User-facing docs live in `README.md` (setup, phone commands, MacroDroid macros, privacy model).
