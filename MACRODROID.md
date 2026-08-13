# E.V + MacroDroid — Webhook Setup (5.65.9)

Step-by-step procedure for wiring E.V to MacroDroid via the **Webhook (URL)** trigger, replacing the old intent-based macros (intent `intent://` calls cannot reach MacroDroid's Intent Received broadcast-receiver trigger).

Uses **local variables only** (no Global Variables tab required). Every picker screen in MacroDroid has a search box at the top — if you can't find an item under a category, type its name there.

## 1. Delete the old macros

Long-press each old macro ("E.V Calendar Lookup", any earlier "E.V Commands") in the home list → **Delete**. Start clean.

## 2. New macro

**+ / New Macro** (bottom) → name: `E.V Commands` → **OK**.

## 3. Trigger: Webhook (URL)

1. **+ Add Trigger** → search "webhook" → **Webhook (URL)**.
2. Configure:
   - **Identifier**: `ev_cmd` (exactly; no slash, no spaces)
   - **URL**: leave blank
   - **IP Address Whitelist**: leave blank
   - **Save body to string variable**: leave empty
   - **Save query parameters to dictionary**: leave empty
   - **Variable Whitelist**: leave **OFF** — with it off, the query parameter `?cmd=calendar` updates the variable freely.
3. Tap the generated URL's **copy/share** → this gives `https://trigger.macrodroid.com/<device-id>/ev_cmd`. **Write down the full URL.**
4. **OK** to confirm.

## 4. Actions (order matters)

Add actions in this order, then fix positions with **long-press → drag**:

1. **+ Add Action** → search "if" → **If Clause** (category Conditions/Loops) → in its condition editor:
   - **Add Condition** → **Variables** → **MacroDroid Variable**
   - In the variable picker, choose **Create new** (or the "+" button) → name: `cmd` → type **String** → OK. (This creates a **local** variable of the macro.)
   - Pick `cmd` → comparison **Equals (=)** → value: `calendar` (no quotes)
   - Confirm. An **End If** is added to the list automatically.
2. **+ Add Action** → search "calendar" → **Get Calendar Events**:
   - **Select Calendar**: **Any Calendar**
   - **Start Offset**: 0 (Minutes)
   - **Duration**: 7 (Days)
   - **Output Array Variable**: create a **local** array variable `evEvents`
   - OK.
3. **+ Add Action** → search "website" → **Open Website / HTTP GET**:
   - URL: `https://elben08.github.io/E.V/#next={lv=evEvents[0][Title]}`
   - OK.
4. **Reorder** so the list reads exactly:
   ```
   If Clause: {lv=cmd} = calendar
   Get Calendar Events → evEvents
   Open Website → https://elben08.github.io/E.V/#next={lv=evEvents[0][Title]}
   End If
   ```
   (Drag Get Calendar Events and Open Website up if they landed below End If.)

## 5. Enable the macro

Top toggle → **ON**. Grant **Calendar** permission when prompted.

## 6. Test in the browser first

This isolates MacroDroid from E.V. Open in the phone's browser (replace `<device-id>`):

```
https://trigger.macrodroid.com/<device-id>/ev_cmd?cmd=calendar
```

It should open E.V showing your next event.

## Troubleshooting (System Log)

Macro editor → **⋮** menu → **System Log**, then re-run the browser test:

- **No "E.V Commands" entry** → the webhook never arrived. Check: macro toggle is ON, identifier is spelled `ev_cmd` exactly, or try **Device ID → Refresh Cloud Token** (stale FCM push).
- **Entry present but no branch ran** → the `cmd` variable/condition is the problem. Confirm the local `cmd` variable exists and the If Clause condition is `{lv=cmd} = calendar` (exact value, no quotes).

### Raw magic text in E.V?

If E.V shows something like `Calendar:{lv=evEvents[0].Title}` instead of an event, the array key path didn't resolve. Temporarily change the Open Website URL to `#next={lv=evEvents}` to dump the whole array (E.V prints it as `[key]: value` lines), confirm it's populated, then restore the correct path.

## 7. Then in E.V

1. E.V → **Settings** (gear) → **MacroDroid webhook URL**.
2. Paste either the **base URL**: `https://trigger.macrodroid.com/<device-id>/` or the **full URL**: `https://trigger.macrodroid.com/<device-id>/ev_cmd` (v19+ accepts both and appends `?cmd=...` itself).
3. **Save**, then say **"check my calendar"** in E.V.
