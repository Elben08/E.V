# Graph Report - E.V  (2026-08-20)

## Corpus Check
- Corpus is ~18,667 words - fits in a single context window. You may not need a graph.

## Summary
- 202 nodes · 449 edges · 21 communities (13 shown, 8 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API Provider Routing
- Architecture Documentation
- Global State & Constants
- UI Interaction Layer
- App Lifecycle & State
- PWA Manifest
- Screen Layout & Visuals
- File & Image Handling
- Token Budget & Messages
- Sensitivity & Routing
- Calendar & History
- OpenCode Config
- Phone Commands
- OpenCode Plugin
- System Prompt Design
- Release & SW Lifecycle
- Calendar Parsing
- Attachment Tray
- Globe Background
- Service Worker Cache
- Crosshair Icon

## God Nodes (most connected - your core abstractions)
1. `performReply()` - 30 edges
2. `init()` - 26 edges
3. `send()` - 17 edges
4. `saveJSON()` - 14 edges
5. `toast()` - 14 edges
6. `startRecognition()` - 14 edges
7. `sendToGemini()` - 12 edges
8. `endHandsFreeSession()` - 12 edges
9. `setActiveModel()` - 10 edges
10. `speak()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Arc Reactor Core` --semantically_similar_to--> `Arc Reactor Button`  [INFERRED] [semantically similar]
  icon.svg → index.html
- `Globe Background` --semantically_similar_to--> `Wireframe Sphere`  [INFERRED] [semantically similar]
  index.html → icon.svg
- `Listening Overlay` --implements--> `Voice Overlay`  [EXTRACTED]
  AGENTS.md → index.html
- `Rate Limit Handling` --conceptually_related_to--> `Provider Fallback`  [INFERRED]
  AGENTS.md → README.md
- `Settings Modal` --references--> `Privacy Routing Pipeline`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Multi-Provider Privacy-Aware Routing** — agents_md_privacy_invariant, agents_md_multi_provider_routing, agents_md_openrouter_models, readme_md_provider_fallback, readme_md_privacy_routing [EXTRACTED 1.00]
- **Voice Input Pipeline** — agents_md_hands_free_voice, agents_md_listening_overlay, index_html_voice_overlay, index_html_arc_reactor_button, readme_md_hands_free, readme_md_voice_chat [EXTRACTED 1.00]
- **MacroDroid-Calendar Integration** — agents_md_calendar_lookup, agents_md_phone_control, macrodroid_md_webhook_trigger, macrodroid_md_calendar_command, macrodroid_md_display_over_apps [EXTRACTED 1.00]

## Communities (21 total, 8 thin omitted)

### Community 0 - "API Provider Routing"
Cohesion: 0.12
Nodes (33): baseLabelFor(), clampModelIndex(), clearProviderOut(), firstVisionIndex(), friendlyRateLimit(), getActiveModel(), groqAttempt(), isDailyQuotaError() (+25 more)

### Community 1 - "Architecture Documentation"
Cohesion: 0.08
Nodes (28): Calendar Lookup, Conversation Compaction, Free-tier Token Budgets, Hands-free Voice, Listening Overlay, Multi-Provider Routing, OpenRouter Models, Phone Control (+20 more)

### Community 2 - "Global State & Constants"
Cohesion: 0.07
Nodes (24): activeModels, ALWAYS_SENSITIVE_CATEGORIES, APPS, conversationSummary, DEFAULT_SETTINGS, el, els, FACT_PATTERNS (+16 more)

### Community 3 - "UI Interaction Layer"
Cohesion: 0.17
Nodes (25): addMsg(), endHandsFreeSession(), fail(), failInBubble(), flushHandsFreeBuffer(), getAttachmentText(), handleHandsFreeResult(), pickVoice() (+17 more)

### Community 4 - "App Lifecycle & State"
Cohesion: 0.20
Nodes (22): clearSystemCache(), deleteSelectedSessions(), extractFacts(), hide(), init(), loadJSON(), loadSession(), loadSettings() (+14 more)

### Community 5 - "PWA Manifest"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 6 - "Screen Layout & Visuals"
Cohesion: 0.32
Nodes (8): Screen Navigation, Arc Reactor Core, Arc Reactor Button, Chat Screen, Dashboard Screen, Voice Overlay, Voice Screen, Three-Screen Architecture

### Community 7 - "File & Image Handling"
Cohesion: 0.38
Nodes (7): attachLimits(), attachmentError(), fitGroqBudget(), handleFileInput(), imageToJPEG(), loadImage(), readFileAsDataURL()

### Community 8 - "Token Budget & Messages"
Cohesion: 0.33
Nodes (7): buildMessages(), buildSystem(), estimateMessagesTokens(), estimateTokens(), fitOpenAITextBudget(), maybeSummarizeHistory(), visibleFacts()

### Community 9 - "Sensitivity & Routing"
Cohesion: 0.33
Nodes (6): analyzeSensitivity(), chooseProvider(), isProviderOut(), needsLiveInfo(), renderHistory(), retryHistoryEntry()

### Community 10 - "Calendar & History"
Cohesion: 0.40
Nodes (5): formatEventDate(), renderCalendarResult(), speakWhenReady(), trimHistory(), writeEvEntry()

### Community 11 - "OpenCode Config"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 12 - "Phone Commands"
Cohesion: 0.67
Nodes (3): handlePhoneCommands(), launchApp(), triggerMacro()

## Knowledge Gaps
- **51 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `SYSTEM_PROMPT`, `GEMINI_MODELS`, `GROQ_MODELS` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 9 inferred relationships involving `init()` (e.g. with `deleteSelectedSessions()` and `openMemory()`) actually correct?**
  _`init()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `SYSTEM_PROMPT` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Provider Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.12310606060606061 - nodes in this community are weakly interconnected._
- **Should `Architecture Documentation` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._
- **Should `Global State & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._