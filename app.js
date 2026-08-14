const SYSTEM_PROMPT = [
  "You are E.V, a personal AI assistant living on the user's phone. You are modeled on the quick-witted, capable AI sidekicks of Spider-Man. You are the user's close, trusted companion.",
  'Personality: sharp, confident, friendly, techy, occasionally playful and dry-humored. Keep responses natural for spoken conversation: short, clear, no heavy formatting. Never break character.',
  'You have memory of facts about the user. Use those facts when relevant, but never recite them unprompted and never claim you just met them if you know them.',
  'When you need current or real-time information (weather, news, sports, stock prices, recent events), use the web search tool you have access to.',
  'Anything marked [PRIVATE] is confidential and must never be repeated to anyone else or shared in responses.',
  'Be honest about your limits. If you cannot do something, say so briefly and suggest an alternative.'
].join('\n');

const GEMINI_MODELS = [
  { id: 'gemini-3.5-flash', vision: true },
  { id: 'gemini-3.6-flash', vision: true },
  { id: 'gemini-3.1-flash-lite', vision: true },
  { id: 'gemini-2.5-flash', vision: true },
  { id: 'gemini-2.5-flash-lite', vision: true }
];
const GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', vision: false },
  { id: 'qwen/qwen3.6-27b', vision: true },
  { id: 'openai/gpt-oss-20b', vision: false },
  { id: 'llama-3.3-70b-versatile', vision: false },
  { id: 'llama-3.1-8b-instant', vision: false }
];

const PRIVATE_ON_RE = /\b(this is private|private mode on|secure this conversation|secure this session|enter private mode)\b/i;
const PRIVATE_OFF_RE = /\b(private mode off|not private anymore|this is not private|declassify|exit private mode)\b/i;

const PII_PATTERNS = [
  { re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, cat: 'finance' },
  { re: /\b\d{3}-\d{2}-\d{4}\b/, cat: 'identity' },
  { re: /\b(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/, cat: 'identity' },
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, cat: 'identity' }
];

const SENSITIVE_KEYWORDS = {
  credentials: ['password', 'passcode', 'pin', 'otp', 'two-factor', '2fa', 'security question', 'login', 'secret'],
  finance: ['bank', 'credit card', 'debit card', 'salary', 'income', 'tax return', 'taxes', 'mortgage', 'loan', 'crypto', 'wallet', 'paypal', 'investment', 'routing number', 'bank account', 'ssn'],
  health: ['medical', 'health', 'doctor', 'diagnosis', 'prescription', 'medication', 'therapy', 'psychiatrist', 'mental health', 'lab results', 'weight'],
  identity: ['address', 'passport', "driver's license", 'license plate', 'id number', 'social security', 'date of birth', 'phone number', 'ssn', 'birthday', 'my age']
};

const KEYWORD_RES = {};
for (const cat of Object.keys(SENSITIVE_KEYWORDS)) {
  const kws = SENSITIVE_KEYWORDS[cat].map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  KEYWORD_RES[cat] = new RegExp('\\b(?:' + kws.join('|') + ')\\b', 'i');
}

const ALWAYS_SENSITIVE_CATEGORIES = ['credentials', 'finance', 'health', 'identity'];

const FACT_PATTERNS = [
  { re: /\bmy name is\s+([A-Z][a-zA-Z]{1,30}(?:\s[A-Z][a-zA-Z]{1,30})?)/i, fact: (m) => 'Name is ' + m[1] },
  { re: /\bcall me\s+([A-Za-z][a-zA-Z0-9]{1,20})/i, fact: (m) => 'Goes by ' + m[1] },
  { re: /\bi(?:'m| am)\s+(\d{1,3})\s*(?:years? old|yrs? old|yo)\b/i, fact: (m) => 'Age is ' + m[1] },
  { re: /\bi (?:live in|am from|stay in)\s+([A-Za-z][a-zA-Z .\-]{1,40})/i, fact: (m) => 'Lives in ' + m[1] },
  { re: /\bi (?:like|love|enjoy)\s+([a-zA-Z][a-zA-Z .\-]{1,40})/i, fact: (m) => 'Likes ' + m[1] },
  { re: /\bmy (birthday|date of birth|dob) is\s+([A-Za-z0-9\/\- ]{3,20})/i, fact: (m) => 'Birthday is ' + m[2] },
  { re: /\bmy (job|profession|occupation|work) (?:is|as)\s+([a-zA-Z][a-zA-Z .\-]{1,40})/i, fact: (m) => 'Occupation is ' + m[2] },
  { re: /\bmy (email|e-mail|phone(?: number)?|address|city|country|zip|postal code) is\s+(.+)/i, fact: (m) => cap(m[1]) + ' is ' + m[2].trim() },
  { re: /\bmy (favorite|favourite)\s+([a-zA-Z ]{1,20}) is\s+(.+)/i, fact: (m) => 'Favorite ' + m[2] + ' is ' + m[3].trim() },
  { re: /\bi have (a|an)\s+([a-zA-Z][a-zA-Z \-]{1,25}) (?:named|called)\s+([A-Za-z][a-zA-Z ]{1,30})/i, fact: (m) => 'Has ' + m[2] + ' named ' + m[3] }
];

const APPS = {
  whatsapp: { pkg: 'com.whatsapp', scheme: 'https' },
  maps: { pkg: 'com.google.android.apps.maps', scheme: 'geo' },
  youtube: { pkg: 'com.google.android.youtube', scheme: 'https' },
  'youtube music': { pkg: 'com.google.android.apps.youtube.music', scheme: 'https' },
  spotify: { pkg: 'com.spotify.music', scheme: 'https' },
  netflix: { pkg: 'com.netflix.mediaclient', scheme: 'https' },
  instagram: { pkg: 'com.instagram.android', scheme: 'https' },
  facebook: { pkg: 'com.facebook.katana', scheme: 'https' },
  tiktok: { pkg: 'com.zhiliaoapp.musically', scheme: 'https' },
  twitter: { pkg: 'com.twitter.android', scheme: 'https' },
  gmail: { pkg: 'com.google.android.gm', scheme: 'https' },
  photos: { pkg: 'com.google.android.apps.photos', scheme: 'https' },
  camera: { pkg: 'com.android.camera', scheme: 'http' },
  settings: { pkg: 'com.android.settings', scheme: 'http' },
  phone: { pkg: 'com.android.dialer', scheme: 'tel' },
  chrome: { pkg: 'com.android.chrome', scheme: 'https' }
};

const OPEN_APP_RE = /(?:open|launch|start)\s+(?:up\s+)?([a-z][a-z ]{1,20})/i;
const REMIND_RE = /remind me (?:in\s+)?(\d{1,3})\s*(seconds?|minutes?|hours?)\s*(?:to|that|about)?\s*(.+)/i;
const TOGGLE_RE = /(turn|switch)\s+(on|off)\s+(?:the\s+)?(flashlight|wifi|bluetooth|torch)/i;
const CALENDAR_RE = /\b(check|look(?:\s+at)?|read|see|show|what(?:'s| is| are)|open)\s+(?:my\s+|the\s+)?(?:next\s+|upcoming\s+|today'?s\s+)?(calendar|schedule|events?|appointments?)\b/i;

const STORAGE = {
  settings: 'ev.settings',
  history: 'ev.history',
  facts: 'ev.facts',
  privateMode: 'ev.privateMode',
  geminiModel: 'ev.geminiModel',
  groqModel: 'ev.groqModel',
  conversationSummary: 'ev.conversationSummary'
};

const DEFAULT_SETTINGS = {
  geminiKey: '',
  groqKey: '',
  provider: 'auto',
  privacy: 'auto',
  voice: true,
  handsFree: false,
  macroWebhook: ''
};

const APP_VERSION = 'v30';

function cap(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, loadJSON(STORAGE.settings, {}));
}

let settings = loadSettings();
let history = loadJSON(STORAGE.history, []);
let facts = loadJSON(STORAGE.facts, []);
if (facts.length > 60) facts = facts.slice(0, 60);
let privateMode = loadJSON(STORAGE.privateMode, false);
let conversationSummary = loadJSON(STORAGE.conversationSummary, '');
let summarizing = false;
let lastSummaryLen = 0;
const MAX_ATTACHMENTS = 5;
const MAX_IMG_MB = 7;
const MAX_PDF_MB = 20;
const MAX_TOTAL_MB = 20;
const IMG_MIME_RE = /^image\/(jpeg|png|webp|heic|heif)$/;

let pendingAttachments = [];

function attachLimits() {
  const limits = { maxCount: MAX_ATTACHMENTS, maxTotalMB: MAX_TOTAL_MB };
  const total = pendingAttachments.reduce((sum, a) => sum + a.sizeMB, 0);
  return Object.assign(limits, { usedMB: total, remainingMB: MAX_TOTAL_MB - total });
}

function attachmentError(file, kind) {
  if (pendingAttachments.length >= MAX_ATTACHMENTS) return 'Up to ' + MAX_ATTACHMENTS + ' attachments allowed';
  const sizeMB = file.size / (1024 * 1024);
  if (kind === 'image' && sizeMB > MAX_IMG_MB) return 'Image too large (max ' + MAX_IMG_MB + ' MB)';
  if (kind === 'pdf' && sizeMB > MAX_PDF_MB) return 'PDF too large (max ' + MAX_PDF_MB + ' MB)';
  if (attachLimits().remainingMB < sizeMB) return 'Total attachment size exceeds ' + MAX_TOTAL_MB + ' MB';
  return null;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function estimateTokens(text, accurate) {
  if (!text) return 0;
  return accurate ? Math.ceil((text.length / 4) * 1.7) : Math.ceil(text.length / 4);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function imageToJPEG(img, maxDim, quality) {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

const GROQ_IMAGE_BUDGET = 5800;

async function fitGroqBudget(attachments, text) {
  const list = attachments.filter((a) => a.kind === 'image');
  if (!list.length) return true;
  const overhead =
    estimateTokens(buildSystem('groq')) +
    history.reduce((s, h) => s + estimateTokens(h.text), 0) +
    estimateTokens(text) + 400;
  const levels = [
    { dim: 1024, q: 0.6 },
    { dim: 768, q: 0.5 },
    { dim: 512, q: 0.4 },
    { dim: 384, q: 0.35 },
    { dim: 320, q: 0.3 }
  ];
  for (const level of levels) {
    const total = overhead + list.reduce((s, a) => s + estimateTokens(a.dataURL), 0);
    if (total <= GROQ_IMAGE_BUDGET) return true;
    try {
      for (const a of list) {
        const img = await loadImage(a.dataURL);
        a.dataURL = imageToJPEG(img, level.dim, level.q);
      }
    } catch (e) {
      return false;
    }
  }
  const total = overhead + list.reduce((s, a) => s + estimateTokens(a.dataURL), 0);
  return total <= GROQ_IMAGE_BUDGET;
}

const GROQ_TEXT_BUDGET = 4400;
const GROQ_TIGHT_TEXT_BUDGET = 3600;
const FACTS_EST_BUDGET = 800;
const SUMMARY_TRIM_EST = 3000;
const SUMMARY_KEEP = 8;
const SUMMARY_MIN_GAP = 8;
const SUMMARY_CHUNK_EST = 2400;
const SUMMARY_MAX_CHARS = 1600;
const SUMMARY_PROMPT = 'You are E.V\u2019s conversation-compactor. Combine the conversation below into one tight, continuous summary that lets a later AI recover full context: what the user asked, key facts, decisions, and the user\u2019s current goals/state. Keep it under ~150 words. Preserve exact names and dates. Do not invent new information.\n\n';
const TOO_LARGE_MSG = 'The request is too large for Groq\u2019s free limit. Try a shorter conversation, or ask Gemini instead.';
const FAILED_MSG_PLACEHOLDER = '[previous reply failed \u2014 no answer]';

function isTooLargeError(msg) {
  return /request too large|reduce message size|tokens per minute|tpm/i.test(msg || '');
}

const RATE_HINT = ' This usually clears in a minute \u2014 if it persists, check your free-tier quota at aistudio.google.com.';

function friendlyRateLimit(label, err) {
  return label + ' is rate-limited right now (' + (err && err.detail ? err.detail : 'quota reached') + '). Try again in a moment.';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function estimateMessagesTokens(messages, accurate) {
  let total = 0;
  for (const m of messages) {
    if (typeof m.content === 'string') total += estimateTokens(m.content, accurate);
    else if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (typeof p === 'string') total += estimateTokens(p, accurate);
        else if (p && typeof p.text === 'string') total += estimateTokens(p.text, accurate);
        else if (p && p.type === 'image_url') total += 800;
      }
    }
  }
  return total;
}

function fitGroqTextBudget(userText, attachments, budget, accurate) {
  const b = budget || GROQ_TEXT_BUDGET;
  const messages = buildMessages('groq', userText, attachments);
  if (estimateMessagesTokens(messages, accurate) <= b) {
    return { messages: messages, fits: true, trimmed: false, estimated: 0 };
  }
  const histArr = history.slice();
  for (let keep = histArr.length - 1; keep >= 0; keep--) {
    const hist = keep === 0 ? [] : histArr.slice(histArr.length - keep);
    const m = buildMessages('groq', userText, attachments, hist);
    if (estimateMessagesTokens(m, accurate) <= b) {
      const last = m[m.length - 1];
      const note = '\n[Note: the earlier part of this conversation was trimmed to fit Groq\u2019s free limit.]';
      if (last && last.content) {
        if (typeof last.content === 'string') last.content += note;
        else if (Array.isArray(last.content)) last.content.push({ type: 'text', text: note });
      }
      return { messages: m, fits: true, trimmed: true, estimated: 0 };
    }
  }
  return { messages: messages, fits: false, trimmed: false, estimated: estimateMessagesTokens(messages, accurate) };
}

async function groqSendFitted(userText, attachments, token, maxTokens) {
  const start = attachments.length ? firstVisionIndex('groq') : undefined;
  const fit = fitGroqTextBudget(userText, attachments);
  if (!fit.fits) throw new Error(TOO_LARGE_MSG);
  const send = (msgs) => sendToGroq(msgs, token, start, maxTokens);
  let lastErr = null;
  try {
    await send(fit.messages);
    return;
  } catch (err) {
    if (!isTooLargeError(err.message)) throw err;
    lastErr = err;
  }
  await sleep(1500);
  const tight = fitGroqTextBudget(userText, attachments, GROQ_TIGHT_TEXT_BUDGET, true);
  if (!tight.fits) throw lastErr.rateLimited ? lastErr : new Error(TOO_LARGE_MSG);
  try {
    await send(tight.messages);
  } catch (err2) {
    if (!isTooLargeError(err2.message)) throw err2;
    throw err2.rateLimited ? err2 : lastErr.rateLimited ? lastErr : new Error(TOO_LARGE_MSG);
  }
}

async function summarizeOnce(provider, content) {
  const run = async (p) => {
    const acc = [];
    const collect = (chunk) => { if (typeof chunk === 'string') acc.push(chunk); };
    if (p === 'groq') {
      if (!settings.groqKey) throw new Error('no Groq key');
      await sendToGroq([
        { role: 'system', content: SUMMARY_PROMPT + 'Conversation so far:\n' + content },
        { role: 'user', content: 'Produce the summary now.' }
      ], collect, undefined, 800);
    } else {
      if (!settings.geminiKey) throw new Error('no Gemini key');
      await sendToGemini([
        { role: 'user', parts: [{ text: SUMMARY_PROMPT + 'Conversation so far:\n' + content + '\n\nProduce the summary now.' }] }
      ], collect, false, true);
    }
    return acc.join('').trim();
  };
  const other = provider === 'groq' ? 'gemini' : 'groq';
  let text;
  try {
    text = await run(provider);
  } catch (e) {
    text = await run(other);
  }
  if (!text) throw new Error('Empty summary');
  return text;
}

async function maybeSummarizeHistory(providerSucceeded) {
  if (summarizing) return;
  if (history.length < SUMMARY_KEEP + 2) return;
  if (history.length - lastSummaryLen < SUMMARY_MIN_GAP) return;
  const old = history.slice(0, history.length - SUMMARY_KEEP);
  const safe = old.filter((h) => !h.sensitive && !h.failed && h.text);
  if (!safe.length) return;
  let est = 0;
  for (const h of safe) est += estimateTokens(h.text);
  if (est <= SUMMARY_TRIM_EST) return;
  summarizing = true;
  const targetLen = history.length;
  try {
    const lines = safe.map((h) => (h.role === 'user' ? 'User: ' : 'E.V: ') + h.text);
    const chunks = [];
    let cur = [];
    let curEst = 0;
    for (const line of lines) {
      const t = estimateTokens(line, true);
      if (cur.length && curEst + t > SUMMARY_CHUNK_EST) {
        chunks.push(cur.join('\n'));
        cur = [];
        curEst = 0;
      }
      cur.push(line);
      curEst += t;
    }
    if (cur.length) chunks.push(cur.join('\n'));
    let rolling = conversationSummary;
    const provider = providerSucceeded === 'groq' ? 'groq' : 'gemini';
    for (const chunk of chunks) {
      const content = (rolling ? 'Previous summary:\n' + rolling + '\n\n' : '') + chunk;
      rolling = await summarizeOnce(provider, content);
      if (rolling.length > SUMMARY_MAX_CHARS) rolling = rolling.slice(0, SUMMARY_MAX_CHARS);
    }
    conversationSummary = rolling;
    saveJSON(STORAGE.conversationSummary, conversationSummary);
    if (history.length === targetLen) {
      history = history.slice(-SUMMARY_KEEP);
      saveJSON(STORAGE.history, history);
      lastSummaryLen = history.length;
    }
  } catch (e) {
    /* best-effort: keep history and summary as-is on failure */
  } finally {
    summarizing = false;
  }
}

function renderAttachTray() {
  const tray = document.getElementById('attach-tray');
  if (!tray) return;
  tray.innerHTML = '';
  pendingAttachments.forEach((a, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'attach-chip' + (a.kind === 'pdf' ? ' attach-pdf' : '');
    chip.title = a.name + ' (' + a.sizeMB.toFixed(1) + ' MB)';
    if (a.kind === 'image') {
      const thumb = document.createElement('img');
      thumb.src = a.dataURL;
      thumb.alt = '';
      thumb.className = 'attach-thumb';
      chip.appendChild(thumb);
    } else {
      const icon = document.createElement('span');
      icon.className = 'attach-pdf-icon';
      icon.textContent = 'PDF';
      chip.appendChild(icon);
    }
    const label = document.createElement('span');
    label.className = 'attach-name';
    label.textContent = a.name;
    chip.appendChild(label);
    const x = document.createElement('span');
    x.className = 'attach-remove';
    x.textContent = '\u00d7';
    x.setAttribute('aria-label', 'Remove ' + a.name);
    x.addEventListener('click', (ev) => {
      ev.stopPropagation();
      removeAttachment(i);
    });
    chip.appendChild(x);
    tray.appendChild(chip);
  });
  tray.classList.toggle('hidden', !pendingAttachments.length);
  updateSendDisabled();
}

function removeAttachment(i) {
  pendingAttachments.splice(i, 1);
  renderAttachTray();
}

function setPendingAttachments(list) {
  pendingAttachments = list;
  renderAttachTray();
}

function updateSendDisabled() {
  const sendBtn = el['btn-send'];
  if (!sendBtn) return;
  const canSend = !busy && (el['text-input'].value.trim() || pendingAttachments.length > 0);
  sendBtn.disabled = !canSend;
  sendBtn.classList.toggle('disabled', !canSend);
}

function handleFileInput(files) {
  if (!files || !files.length) return;
  const accepted = [];
  for (const file of files) {
    const mime = file.type.toLowerCase();
    const kind = IMG_MIME_RE.test(mime) ? 'image' : (mime === 'application/pdf' ? 'pdf' : null);
    if (!kind) {
      toast('Unsupported file type');
      continue;
    }
    const sizeMB = file.size / (1024 * 1024);
    const err = attachmentError(file, kind);
    if (err) {
      toast(err);
      continue;
    }
    if (accepted.length + pendingAttachments.length >= MAX_ATTACHMENTS) {
      toast('Up to ' + MAX_ATTACHMENTS + ' attachments allowed');
      break;
    }
    if (attachLimits().remainingMB < sizeMB) {
      toast('Total attachment size exceeds ' + MAX_TOTAL_MB + ' MB');
      break;
    }
    accepted.push({ file: file, kind: kind, name: file.name, mime: mime, sizeMB: sizeMB, dataURL: null });
  }
  if (!accepted.length) return;
  let remaining = accepted;
  const readNext = () => {
    const a = remaining[0];
    readFileAsDataURL(a.file).then((dataURL) => {
      if (a.kind === 'image') {
        loadImage(dataURL).then((img) => {
          a.dataURL = imageToJPEG(img, 1024, 0.7);
          a.mime = 'image/jpeg';
          finish();
        }).catch(() => { toast('Could not read ' + a.name); finish(); });
      } else {
        a.dataURL = dataURL;
        finish();
      }
    }).catch(() => {
      toast('Could not read ' + a.name);
      finish();
    });
  };
  const finish = () => {
    remaining = remaining.slice(1);
    if (remaining.length) readNext();
    else setPendingAttachments(pendingAttachments.concat(accepted));
  };
  readNext();
}

function getAttachmentText() {
  return pendingAttachments.length
    ? '[Attached file: ' + pendingAttachments.map((a) => a.name).join(', ') + ']'
    : '';
}

let busy = false;
let activeModels = {
  gemini: loadJSON(STORAGE.geminiModel, 0),
  groq: loadJSON(STORAGE.groqModel, 0)
};

function modelList(provider) {
  return provider === 'gemini' ? GEMINI_MODELS : GROQ_MODELS;
}

function modelStoreKey(provider) {
  return provider === 'gemini' ? STORAGE.geminiModel : STORAGE.groqModel;
}

function clampModelIndex(list, index) {
  return typeof index === 'number' && index >= 0 && index < list.length ? index : 0;
}

function getActiveModel(provider) {
  const list = modelList(provider);
  return list[clampModelIndex(list, activeModels[provider])].id;
}

function setActiveModel(provider, index) {
  const list = modelList(provider);
  const i = clampModelIndex(list, index);
  activeModels[provider] = i;
  saveJSON(modelStoreKey(provider), i);
  return list[i].id;
}

function resetActiveModel(provider) {
  return setActiveModel(provider, 0);
}

function modelLabel(provider) {
  const list = modelList(provider);
  const cur = getActiveModel(provider);
  return cur + (list[0].id === cur ? ' (default)' : ' (fallback)');
}

function firstVisionIndex(provider) {
  const list = modelList(provider);
  for (let i = 0; i < list.length; i++) {
    if (list[i].vision) return i;
  }
  return -1;
}

function isModelUnavailable(message) {
  if (!message) return false;
  if (/api key|billing|quota|rate ?limit|permission|forbidden|denied|network|cors|failed to fetch/i.test(message)) return false;
  return /(?:^|\s)404\b|no longer available|deprecated|retired|shut ?down|does not exist|do not have access|not found|model.*not (?:found|available|supported)|unavailable/i.test(message);
}

const el = {};
const els = ['chat', 'text-input', 'btn-send', 'btn-attach', 'file-input', 'attach-tray', 'reactor', 'reactor-wrap', 'status-dot', 'status-text',
  'modal-settings', 'app-version', 'set-gemini', 'set-groq', 'set-provider', 'set-privacy', 'set-voice', 'set-hands-free', 'set-macro-webhook',
  'btn-test', 'test-result', 'gemini-model-label', 'groq-model-label', 'btn-reset-gemini', 'btn-reset-groq',
  'btn-settings', 'btn-settings-save', 'btn-settings-cancel',
  'modal-memory', 'memory-list', 'btn-memory', 'btn-memory-clear', 'btn-memory-close', 'toast', 'btn-new',
  'voice-overlay', 'vo-transcript', 'vo-status'];
els.forEach((id) => { el[id] = document.getElementById(id); });

const LIVE_INFO_RE = /\b(weather|forecast|news|headlines|score|scores|result|results|match|stock|stocks|price|prices|gold price|bitcoin|crypto|election|traffic|sports|latest|update|updates|today|tonight|now|current|right now|temperature|schedule|status of|breaking|live|game|opening|closing|holiday)\b/i;

function needsLiveInfo(text) {
  return LIVE_INFO_RE.test(text);
}

function analyzeSensitivity(text) {
  const hits = new Set();
  for (const p of PII_PATTERNS) {
    if (p.re.test(text)) hits.add(p.cat);
  }
  for (const cat of Object.keys(KEYWORD_RES)) {
    if (KEYWORD_RES[cat].test(text)) hits.add(cat);
  }
  const sensitive = hits.size > 0 && [...hits].some((c) => ALWAYS_SENSITIVE_CATEGORIES.includes(c));
  return { sensitive, categories: [...hits] };
}

function chooseProvider(analysis) {
  const p = settings.provider;
  if (p === 'gemini') return { provider: 'gemini', reason: '' };
  if (p === 'groq') return { provider: 'groq', reason: 'settings' };
  const priv = settings.privacy;
  if (priv === 'groq') return { provider: 'groq', reason: 'policy' };
  if (priv === 'auto' && analysis.sensitive) return { provider: 'groq', reason: 'sensitive' };
  if (priv === 'auto' && privateMode) return { provider: 'groq', reason: 'private' };
  if (priv === 'manual' && (analysis.private || privateMode)) return { provider: 'groq', reason: 'private' };
  return { provider: 'gemini', reason: '' };
}

function visibleFacts(provider) {
  const out = [];
  let est = 0;
  for (const f of facts) {
    if (provider !== 'groq' && f.sensitive) continue;
    const t = estimateTokens(f.text);
    if (est + t > FACTS_EST_BUDGET) break;
    out.push(f);
    est += t;
  }
  return out;
}

function buildSystem(provider) {
  const f = visibleFacts(provider);
  let out = SYSTEM_PROMPT;
  if (conversationSummary) out += '\n\nEarlier conversation summary:\n' + conversationSummary;
  if (f.length) {
    const list = f.map((x) => '- ' + (x.sensitive ? '[PRIVATE] ' : '') + x.text).join('\n');
    out += '\n\nFacts about the user:\n' + list;
  }
  if (privateMode) out += '\n\n[PRIVATE SESSION ACTIVE] The user asked to keep this conversation private. Do not mention this mode unless asked.';
  return out;
}

function buildMessages(provider, userText, attachments, hist) {
  const atts = attachments || [];
  const histArr = hist || history;
  if (provider === 'gemini') {
    const contents = [];
    for (const h of histArr) {
      if (h.sensitive) continue;
      contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.failed ? FAILED_MSG_PLACEHOLDER : h.text }] });
    }
    const parts = [];
    for (const a of atts) {
      const mime = a.mime || (a.kind === 'pdf' ? 'application/pdf' : 'application/octet-stream');
      parts.push({ inlineData: { mimeType: mime, data: a.dataURL.split(',')[1] } });
    }
    parts.push({ text: userText });
    contents.push({ role: 'user', parts: parts });
    return contents;
  }
  const messages = [{ role: 'system', content: buildSystem(provider) }];
  for (const h of histArr) {
    messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.failed ? FAILED_MSG_PLACEHOLDER : h.text });
  }
  const content = [];
  for (const a of atts) {
    if (a.kind === 'image') {
      content.push({ type: 'image_url', image_url: { url: a.dataURL } });
    }
  }
  content.push({ type: 'text', text: userText });
  messages.push({ role: 'user', content: content });
  return messages;
}

async function readSSE(response, onData, onError) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const handleLine = (rawLine) => {
    const line = rawLine.trim();
    if (line.indexOf('data:') !== 0) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const json = JSON.parse(payload);
      if (json && json.error) {
        if (onError) onError(json.error);
        return;
      }
      onData(json);
    } catch (e) { /* skip partial */ }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      handleLine(line);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) handleLine(buffer);
}

async function sendToGemini(messages, onToken, liveInfo, noRecover) {
  const key = encodeURIComponent(settings.geminiKey);
  const headers = { 'Content-Type': 'application/json' };
  const body = {
    contents: messages,
    systemInstruction: { parts: [{ text: buildSystem('gemini') }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
  };
  if (liveInfo) body.tools = [{ googleSearch: {} }];

  const geminiError = async (res) => {
    let msg = 'HTTP ' + res.status;
    try {
      const j = await res.json();
      if (j && j.error && j.error.message) msg = j.error.message;
    } catch (e) { /* fall back to status */ }
    return msg;
  };

  const rateLimitError = async (res) => {
    let detail = 'quota reached';
    try {
      const j = await res.json();
      if (j && j.error && j.error.message) detail = j.error.message;
    } catch (e) { /* status only */ }
    const err = new Error('RATE_LIMIT');
    err.rateLimited = true;
    err.detail = detail;
    return err;
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const attempt = async (model, endpoint, useTools) => {
    const b = JSON.parse(JSON.stringify(body));
    if (!useTools) delete b.tools;
    const base = 'https://generativelanguage.googleapis.com/v1beta/models/' + model;
    const sep = endpoint.indexOf('?') !== -1 ? '&' : '?';
    const res = await fetch(base + ':' + endpoint + sep + 'key=' + key, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(b)
    });
    if (res.status === 429) throw await rateLimitError(res);
    if (!res.ok) throw new Error(await geminiError(res));
    const emptyReplyError = (finishReason, blockReason) => {
      let msg = 'Gemini returned an empty reply' +
        (finishReason ? ' (finishReason: ' + finishReason + ')' : '') +
        (blockReason ? ', blocked: ' + blockReason : '') + '.';
      return new Error(msg);
    };
    if (endpoint.indexOf('stream') !== -1) {
      let streamed = false;
      let finishReason = '';
      let blockReason = '';
      await readSSE(res, (chunk) => {
        const cand = chunk.candidates && chunk.candidates[0];
        if (cand && cand.finishReason) finishReason = cand.finishReason;
        if (chunk.promptFeedback && chunk.promptFeedback.blockReason) blockReason = chunk.promptFeedback.blockReason;
        const parts = cand && cand.content && cand.content.parts;
        if (!parts) return;
        for (const p of parts) {
          if (p.thought || !p.text) continue;
          streamed = true;
          onToken(p.text);
        }
      }, (err) => {
        throw new Error((err && err.message) || 'Gemini stream error');
      });
      if (!streamed) throw emptyReplyError(finishReason, blockReason);
    } else {
      const json = await res.json();
      const cand = json.candidates && json.candidates[0];
      const parts = cand && cand.content ? cand.content.parts : [];
      const text = parts.filter((p) => !p.thought).map((p) => p.text || '').join('');
      if (text) onToken(text);
      else throw emptyReplyError(cand && cand.finishReason, json.promptFeedback && json.promptFeedback.blockReason);
    }
  };

  const recoverFromRateLimit = async (model) => {
    for (let t = 1; t <= 3; t++) {
      await sleep(3000 * t);
      try {
        await attempt(model, 'streamGenerateContent?alt=sse', false);
        return true;
      } catch (e2) {
        if (!e2.rateLimited) return false;
      }
    }
    return false;
  };

  const recover = async (model) => {
    if (noRecover) return false;
    return recoverFromRateLimit(model);
  };

  const start = clampModelIndex(GEMINI_MODELS, activeModels.gemini);
  let lastErr = null;
  for (let i = start; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i].id;
    try {
      await attempt(model, 'streamGenerateContent?alt=sse', liveInfo);
    } catch (e) {
      if (e.rateLimited) {
        if (await recover(model)) { setActiveModel('gemini', i); return; }
        throw e;
      }
      lastErr = e;
      if (!isModelUnavailable(e.message)) {
        let recovered = false;
        for (let r = 0; r < 3 && !recovered; r++) {
          try {
            await attempt(model, 'generateContent', false);
            recovered = true;
          } catch (e2) {
            if (e2.rateLimited) {
              if (await recover(model)) { setActiveModel('gemini', i); return; }
              throw e2;
            }
            lastErr = e2;
            if (isModelUnavailable(e2.message)) break;
            if (!/MALFORMED_FUNCTION_CALL/.test(e2.message)) throw e2;
          }
        }
        if (recovered) { setActiveModel('gemini', i); return; }
        if (isModelUnavailable(lastErr.message)) continue;
        throw lastErr;
      } else {
        continue;
      }
    }
    setActiveModel('gemini', i);
    return;
  }
  throw new Error('All Gemini models unavailable' + (lastErr ? ' (' + lastErr.message + ')' : ''));
}

async function sendToGroq(messages, onToken, startIndex, maxTokens) {
  const start = typeof startIndex === 'number' && startIndex >= 0 && startIndex < GROQ_MODELS.length
    ? startIndex
    : clampModelIndex(GROQ_MODELS, activeModels.groq);
  let lastErr = null;
  for (let i = start; i < GROQ_MODELS.length; i++) {
    try {
      await groqAttempt(GROQ_MODELS[i].id, messages, onToken, maxTokens);
    } catch (e) {
      if (e.rateLimited) throw e;
      lastErr = e;
      if (!isModelUnavailable(e.message)) throw e;
      continue;
    }
    setActiveModel('groq', i);
    return;
  }
  throw new Error('All Groq models unavailable' + (lastErr ? ' (' + lastErr.message + ')' : ''));
}

async function groqAttempt(model, messages, onToken, maxTokens) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + settings.groqKey
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: maxTokens || 8192,
      stream: true
    })
  });
  const groqDetail = async (r) => {
    let msg = 'HTTP ' + r.status;
    try {
      const j = await r.json();
      if (j && j.error && j.error.message) msg = j.error.message;
    } catch (e) { /* status only */ }
    return msg;
  };
  const rateLimitedError = (detail) => {
    const err = new Error(detail && /tokens per minute|tpm|rate ?limit/i.test(detail) ? detail : 'RATE_LIMIT');
    err.rateLimited = true;
    err.detail = detail || 'quota reached';
    return err;
  };
  if (res.status === 429) throw rateLimitedError(await groqDetail(res));
  if (!res.ok) {
    const detail = await groqDetail(res);
    if (/tokens per minute|tpm|rate ?limit/i.test(detail)) throw rateLimitedError(detail);
    throw new Error(detail);
  }
  try {
    await readSSE(res, (j) => {
      const d = j.choices && j.choices[0] && j.choices[0].delta;
      if (d && typeof d.content === 'string' && d.content) onToken(d.content);
    }, (err) => {
      throw new Error((err && err.message) || 'Groq stream error');
    });
  } catch (e) {
    if (/tokens per minute|tpm|rate ?limit/i.test(e.message)) throw rateLimitedError(e.message);
    throw e;
  }
}

function show(node) { node.classList.remove('hidden'); }
function hide(node) { node.classList.add('hidden'); }
function scrollChat() { el.chat.scrollTop = el.chat.scrollHeight; }

function setStatus(label, cls) {
  el['status-text'].textContent = label;
  el['status-dot'].className = 'status-dot' + (cls ? ' ' + cls : '');
}

function setReactor(state) {
  if (!settings.geminiKey && !settings.groqKey) state = 'off';
  el.reactor.className = 'reactor' + (state ? ' ' + state : '');
  el.reactor.setAttribute('aria-pressed', state === 'listening' ? 'true' : 'false');
}

function setVoiceOverlay(on, working) {
  const ov = el['voice-overlay'];
  ov.classList.toggle('hidden', !on);
  ov.classList.toggle('working', !!working);
  el['vo-status'].textContent = working ? 'Working\u2026' : 'Listening\u2026';
}

function updateVoiceTranscript(text) {
  el['vo-transcript'].textContent = text || '';
}

let toastTimer;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 2600);
}

function addMsg(role, text, opts) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  if (role === 'ev') {
    const tag = document.createElement('span');
    tag.className = 'tag';
    if (opts && opts.provider) tag.innerHTML = 'E.V <span class="provider">(' + opts.provider + ')</span>';
    else tag.textContent = 'E.V';
    const body = document.createElement('span');
    body.className = 'body';
    if (text) body.textContent = text;
    div.appendChild(tag);
    div.appendChild(body);
  } else {
    div.textContent = text;
  }
  if (opts && opts.error) div.classList.add('error');
  el.chat.appendChild(div);
  scrollChat();
  return div;
}

function fail(message) {
  busy = false;
  setStatus('online', '');
  updateSendDisabled();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  addMsg('ev', message, { error: true });
}

function renderHistory() {
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (h.role === 'user') {
      addMsg('user', h.text);
    } else if (h.failed) {
      const div = addMsg('ev', h.errorMsg || h.text, h.provider ? { provider: h.provider } : undefined);
      div.classList.add('error');
      const btn = document.createElement('button');
      btn.className = 'retry-btn';
      btn.textContent = '\u21bb Retry';
      btn.addEventListener('click', () => { if (!busy) retryHistoryEntry(div, i); });
      div.appendChild(btn);
    } else {
      addMsg('ev', h.text, h.provider ? { provider: h.provider } : undefined);
    }
  }
}

function writeEvEntry(entryRef, entry) {
  if (entryRef >= 0 && entryRef < history.length) history[entryRef] = entry;
  else history.push(entry);
  trimHistory();
  saveJSON(STORAGE.history, history);
}

function baseLabelFor(ctx) {
  return ctx.provider === 'gemini'
    ? 'gemini · ' + getActiveModel('gemini')
    : 'groq' + (ctx.reason ? ' · ' + ctx.reason : '') + ' · ' + getActiveModel('groq');
}

async function retryHistoryEntry(bubble, index) {
  const h = history[index];
  if (!h || !h.failed) return;
  await performReply(bubble, {
    userText: h.retryUserText || h.text,
    provider: h.retryProvider || (h.provider && h.provider.indexOf('gemini') === 0 ? 'gemini' : 'groq'),
    reason: h.retryReason || '',
    sensitive: !!h.sensitive,
    attachments: [],
    entryRef: index
  });
}

function failInBubble(bubble, message, retry) {
  busy = false;
  setStatus('online', '');
  updateSendDisabled();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  bubble.classList.add('error');
  const bodyEl = bubble.querySelector('.body');
  if (bodyEl) bodyEl.textContent = message;
  const oldNote = bubble.querySelector('.fallback-note');
  if (oldNote) oldNote.remove();
  const oldBtn = bubble.querySelector('.retry-btn');
  if (oldBtn) oldBtn.remove();
  const btn = document.createElement('button');
  btn.className = 'retry-btn';
  btn.textContent = '\u21bb Retry';
  btn.addEventListener('click', () => {
    if (busy) return;
    retry();
  });
  bubble.appendChild(btn);
  scrollChat();
  resumeHandsFree();
}

function trimHistory() {
  if (history.length > 24) history = history.slice(history.length - 24);
}

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => v.lang && v.lang.toLowerCase().indexOf('en') === 0);
  return (
    en.find((v) => /uk|gb/i.test(v.lang) && /male/i.test(v.name)) ||
    en.find((v) => /male/i.test(v.name)) ||
    en.find((v) => /uk|gb/i.test(v.lang)) ||
    en[0] ||
    null
  );
}

function speak(text) {
  if (!settings.voice || !('speechSynthesis' in window)) { resumeHandsFree(); return; }
  const clean = text.replace(/[#*_`]/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) { resumeHandsFree(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 1.02;
  u.pitch = 0.95;
  const done = () => { setReactor(''); setStatus('online', ''); resumeHandsFree(); };
  u.onend = done;
  u.onerror = done;
  setReactor('speaking');
  setStatus('speaking', 'busy');
  window.speechSynthesis.speak(u);
}

function speakWhenReady(text, maxWaitMs) {
  if (!settings.voice || !('speechSynthesis' in window)) return;
  if (document.visibilityState === 'visible') { speak(text); return; }
  let done = false;
  let timer = 0;
  const fire = () => {
    if (done) return;
    done = true;
    document.removeEventListener('visibilitychange', onVis);
    clearTimeout(timer);
    speak(text);
  };
  const onVis = () => { if (document.visibilityState === 'visible') fire(); };
  timer = setTimeout(() => { if (document.visibilityState === 'visible') fire(); }, maxWaitMs);
  document.addEventListener('visibilitychange', onVis);
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;
let handsFreeActive = false;
let handsFreePaused = false;
let handsfreeRestartTimer = 0;
const WAKE_RE = /^\s*(?:(?:hey there|hey|okay|ok|listen|yo)\s+)?e[\s.]*v\b/i;
const EXIT_RE = /\b(?:stop listening|exit hands[- ]?free|hands[- ]?free off|goodbye|good bye)\b/i;

function stripWakePhrase(text) {
  return text.replace(WAKE_RE, ' ').trim();
}

function startRecognition(mode) {
  if (!SR) { toast('Voice input is not supported in this browser.'); return; }
  if (listening) return;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  clearTimeout(handsfreeRestartTimer);
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  let finalText = '';
  recognition.onstart = () => { listening = true; setReactor('listening'); setStatus('listening', 'busy'); setVoiceOverlay(true); };
  recognition.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        const seg = e.results[i][0].transcript;
        finalText += seg;
        updateVoiceTranscript(finalText);
        if (mode === 'hands-free') handleHandsFreeResult(seg);
      } else {
        el['text-input'].value = e.results[i][0].transcript;
        updateVoiceTranscript(e.results[i][0].transcript);
        updateSendDisabled();
      }
    }
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      toast('Microphone permission denied.');
      setVoiceOverlay(false);
      if (mode === 'hands-free') endHandsFreeSession();
      return;
    }
    if (mode === 'hands-free') {
      clearTimeout(handsfreeRestartTimer);
      handsfreeRestartTimer = setTimeout(() => {
        if (handsFreeActive && !handsFreePaused && !busy) startRecognition('hands-free');
      }, 800);
    } else {
      setVoiceOverlay(false);
    }
  };
  recognition.onend = () => {
    listening = false;
    if (mode !== 'hands-free') {
      setReactor('');
      setStatus('online', '');
      setVoiceOverlay(false);
      const value = (finalText || el['text-input'].value).trim();
      if (value) send(value);
      return;
    }
    if (handsFreePaused) { setVoiceOverlay(true, true); return; }
    clearTimeout(handsfreeRestartTimer);
    handsfreeRestartTimer = setTimeout(() => {
      if (handsFreeActive && !handsFreePaused && !busy) startRecognition('hands-free');
    }, 400);
  };
  recognition.start();
}

function handleHandsFreeResult(seg) {
  const value = (seg || '').trim();
  if (!value) return;
  if (EXIT_RE.test(value)) { endHandsFreeSession(); return; }
  const stripped = stripWakePhrase(value);
  if (!stripped || stripped === value) return;
  handsFreePaused = true;
  if (recognition) { try { recognition.stop(); } catch (e) { /* ignore */ } }
  el['text-input'].value = '';
  updateSendDisabled();
  updateVoiceTranscript(stripped);
  setVoiceOverlay(true, true);
  send(stripped);
}

function resumeHandsFree() {
  if (!handsFreeActive || !handsFreePaused || busy) return;
  if (listening) {
    clearTimeout(handsfreeRestartTimer);
    handsfreeRestartTimer = setTimeout(resumeHandsFree, 300);
    return;
  }
  handsFreePaused = false;
  startRecognition('hands-free');
}

function startHandsFreeSession() {
  handsFreeActive = true;
  handsFreePaused = false;
  toast('Hands-free on. Say \u201cHey E.V\u201d to talk.');
  startRecognition('hands-free');
}

function endHandsFreeSession() {
  handsFreeActive = false;
  handsFreePaused = false;
  if (recognition) { try { recognition.stop(); } catch (e) { /* ignore */ } }
  recognition = null;
  listening = false;
  clearTimeout(handsfreeRestartTimer);
  setReactor('');
  setStatus('online', '');
  setVoiceOverlay(false);
  if (!busy && settings.voice && 'speechSynthesis' in window) speak('Hands-free off.');
  else toast('Hands-free off.');
}

function toggleListening() {
  if (!SR) { toast('Voice input is not supported in this browser.'); return; }
  if (handsFreeActive) { endHandsFreeSession(); return; }
  if (busy) return;
  if (settings.handsFree) { startHandsFreeSession(); return; }
  if (listening) { recognition && recognition.stop(); return; }
  startRecognition('ptt');
}

function launchApp(app) {
  const fallback = 'https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3D' + app.pkg;
  window.location.href =
    'intent://#Intent;scheme=' + app.scheme + ';package=' + app.pkg + ';S.browser_fallback_url=' + fallback + ';end';
}

function triggerMacro(action) {
  let base = (settings.macroWebhook || '').trim().replace(/\/+$/, '');
  if (!base) {
    return 'MacroDroid webhook URL is not set. Open Settings (gear icon) and paste it.';
  }
  if (!/\/ev_cmd$/i.test(base)) base += '/ev_cmd';
  const url = base + '?cmd=' + encodeURIComponent(action);
  try { fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' }); } catch (e) { /* ignore */ }
  return null;
}

function formatEventDate(raw, allDay) {
  let s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const tz = s.match(/\s?([+-]?\d{2}):?(\d{2})\s*$/);
    if (tz) {
      const sign = /^[+-]/.test(tz[1]) ? '' : '+';
      s = s.slice(0, tz.index) + sign + tz[1].replace(/\D/g, '') + ':' + tz[2];
    }
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return raw;
  const date = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (allDay) return date;
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return date + ' · ' + time;
}

function eventEntry(entry) {
  const title = entry && entry.Title ? String(entry.Title).trim() : '';
  const start = entry && entry.Start ? String(entry.Start).trim() : '';
  const allDay = !!entry && String(entry['All day event'] || '') === 'true';
  return title ? { title, date: start || null, allDay } : null;
}

function parseCalendarFragment() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('next') || params.has('date')) {
    const next = (params.get('next') || '').trim();
    if (next.charAt(0) === '[' || next.charAt(0) === '{') {
      let events = null;
      try {
        const parsed = JSON.parse(next);
        const entries = Array.isArray(parsed) ? parsed : Object.keys(parsed || {}).map(k => parsed[k]);
        events = entries.map(eventEntry).filter(Boolean);
      } catch (e) { events = null; }
      if (events && events.length) return { title: null, date: null, events };
    }
    return {
      title: next || null,
      date: (params.get('date') || '').trim() || null,
      events: null
    };
  }
  const m = window.location.hash.match(/^#next=(.*)$/);
  if (!m) return null;
  let s = m[1];
  try { s = decodeURIComponent(s); } catch (e) { /* keep raw */ }
  const title = s.replace(/\+/g, ' ').trim() || null;
  return title ? { title, date: null, events: null } : null;
}

function renderCalendarResult(calendarEvent) {
  let label, spoken, header;
  if (calendarEvent.events) {
    label = calendarEvent.events.map(e => '• ' + e.title + (e.date ? ' · ' + formatEventDate(e.date, e.allDay) : '')).join('\n');
    spoken = calendarEvent.events.map(e => e.title + ', ' + (e.date ? formatEventDate(e.date, e.allDay) : 'no date')).join('. ');
    header = 'Calendar (' + calendarEvent.events.length + ' upcoming):\n';
  } else {
    label = calendarEvent.date
      ? calendarEvent.title + ' · ' + formatEventDate(calendarEvent.date)
      : calendarEvent.title;
    spoken = label;
    header = 'Calendar: ';
  }
  const entry = '[Calendar lookup result] ' + label;
  if (!history.some(h => h.text === entry)) {
    history.push({ role: 'user', text: entry, sensitive: true });
    trimHistory();
    saveJSON(STORAGE.history, history);
  }
  addMsg('ev', header + label);
  if (settings.voice) speakWhenReady('Calendar: ' + spoken, 3000);
}

const calendarChannel = ('BroadcastChannel' in window) ? new BroadcastChannel('ev-calendar') : null;
if (calendarChannel) {
  calendarChannel.onmessage = (e) => {
    const m = e.data;
    if (!m || m.type !== 'calendar' || document.visibilityState !== 'visible') return;
    renderCalendarResult({ title: m.title, date: m.date, events: m.events });
  };
}

function scheduleReminder(ms, text) {
  if ('Notification' in window && Notification.permission === 'default') {
    try { Notification.requestPermission(); } catch (e) { /* ignore */ }
  }
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('E.V', { body: text, icon: 'icon.svg', tag: 'ev-reminder' }); } catch (e) { /* ignore */ }
    }
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    toast('Reminder: ' + text);
    speak('Reminder. ' + text);
  }, ms);
}

function handlePhoneCommands(text) {
  const lower = text.toLowerCase();
  if (CALENDAR_RE.test(lower)) {
    const err = triggerMacro('calendar');
    return err || 'Calendar lookup sent to MacroDroid. Your upcoming events will appear when the page opens.';
  }
  const openMatch = lower.match(OPEN_APP_RE);
  if (openMatch) {
    let name = openMatch[1].replace(/\s+(up|the|app)\s+/g, ' ').trim();
    let app = APPS[name];
    if (!app) {
      for (const key of Object.keys(APPS)) {
        if (name.indexOf(key) !== -1 || key.indexOf(name) !== -1) { app = APPS[key]; name = key; break; }
      }
    }
    if (app) { launchApp(app); return 'Opening ' + name + '.'; }
  }
  const remindMatch = text.match(REMIND_RE);
  if (remindMatch) {
    const n = parseInt(remindMatch[1], 10);
    const unit = remindMatch[2];
    const what = remindMatch[3].replace(/^to\s+/i, '').trim();
    const label = unit.indexOf('hour') !== -1 ? 'hour(s)' : unit.indexOf('minute') !== -1 ? 'minute(s)' : 'second(s)';
    const ms = n * (unit.indexOf('hour') !== -1 ? 3600000 : unit.indexOf('minute') !== -1 ? 60000 : 1000);
    scheduleReminder(ms, what);
    return 'Reminder set: ' + what + ' in ' + n + ' ' + label + '.';
  }
  const toggleMatch = text.match(TOGGLE_RE);
  if (toggleMatch) {
    const what = toggleMatch[3] === 'torch' ? 'flashlight' : toggleMatch[3];
    const err = triggerMacro(what + '.' + toggleMatch[2]);
    return err || 'Sending command to switch ' + what + ' ' + toggleMatch[2] + '.';
  }
  return null;
}

function extractFacts(text) {
  let added = false;
  for (const p of FACT_PATTERNS) {
    const m = text.match(p.re);
    if (!m) continue;
    const factText = p.fact(m);
    if (facts.some((f) => f.text.toLowerCase() === factText.toLowerCase())) continue;
    const a = analyzeSensitivity(factText);
    facts.unshift({ text: factText, sensitive: a.sensitive });
    if (facts.length > 60) facts.length = 60;
    added = true;
  }
  if (added) {
    saveJSON(STORAGE.facts, facts);
    if (!el['modal-memory'].classList.contains('hidden')) renderMemoryList();
  }
}

async function performReply(bubble, ctx) {
  const attachments = ctx.attachments || [];
  const bodyEl = bubble.querySelector('.body');
  let usedLabel = baseLabelFor(ctx);

  bubble.classList.remove('error');
  bodyEl.textContent = '';
  const oldNote = bubble.querySelector('.fallback-note');
  if (oldNote) oldNote.remove();
  const oldBtn = bubble.querySelector('.retry-btn');
  if (oldBtn) oldBtn.remove();
  bubble.querySelector('.tag').innerHTML = 'E.V <span class="provider">(' + usedLabel + ')</span>';

  const curHasImage = attachments.some((a) => a.kind === 'image');
  const curHasPdf = attachments.some((a) => a.kind === 'pdf');
  const curGroqMaxTokens = curHasImage ? 2048 : 8192;

  busy = true;
  updateSendDisabled();
  const statusLabel = ctx.provider === 'groq' && (ctx.reason === 'sensitive' || ctx.reason === 'private')
    ? 'private route' : 'thinking';
  setStatus(statusLabel, 'busy');

  const failThis = (msg) => {
    writeEvEntry(ctx.entryRef, {
      role: 'ev', text: msg, sensitive: !!ctx.sensitive, failed: true, errorMsg: msg,
      provider: usedLabel, retryUserText: ctx.userText, retryProvider: ctx.provider, retryReason: ctx.reason
    });
    failInBubble(bubble, msg, () => performReply(bubble, ctx));
  };

  let reply = '';
  let succeededProvider = '';
  const token = (chunk) => {
    if (typeof chunk !== 'string') return;
    reply += chunk;
    bodyEl.textContent = reply;
    scrollChat();
  };
  const groqStart = () => (attachments.length ? firstVisionIndex('groq') : undefined);
  const geminiFailure = (geminiErr) => geminiErr.rateLimited
    ? friendlyRateLimit('Gemini', geminiErr)
    : 'Gemini error: ' + geminiErr.message;

  const fallbackToGroq = async (geminiErr) => {
    const gFail = geminiFailure(geminiErr);
    if (!settings.groqKey) throw new Error(gFail + ', and no Groq key is set to fall back to.' + (geminiErr.rateLimited ? RATE_HINT : ''));
    if (curHasPdf) throw new Error(gFail + ' (and PDF attachments can\u2019t fall back to Groq).');
    if (curHasImage) {
      const fits = await fitGroqBudget(attachments, ctx.userText);
      if (!fits) throw new Error(gFail + ' (and the image is too large for Groq\u2019s free limit even after compression).');
      await sendToGroq(buildMessages('groq', ctx.userText, attachments), token, groqStart(), curGroqMaxTokens);
    } else {
      try {
        await groqSendFitted(ctx.userText, attachments, token, curGroqMaxTokens);
      } catch (err) {
        if (isTooLargeError(err.detail) || isTooLargeError(err.message) || err.message === TOO_LARGE_MSG) {
          throw new Error(gFail + ' Groq\u2019s free tier also can\u2019t fit this request (8K tokens/min limit) \u2014 try a shorter message, or clear Memory / start a new conversation.');
        }
        if (err.rateLimited) throw new Error(gFail + ' Groq is also rate-limited right now (' + (err.detail || 'quota reached') + '). Try again in a moment.' + RATE_HINT);
        throw new Error(gFail + ' \u2014 Groq also failed: ' + err.message);
      }
    }
    usedLabel = 'groq · fallback · ' + getActiveModel('groq');
    bubble.querySelector('.tag').innerHTML = 'E.V <span class="provider">(' + usedLabel + ')</span>';
    const noteEl = document.createElement('div');
    noteEl.className = 'fallback-note';
    const reasonText = geminiErr.rateLimited
      ? 'Gemini is temporarily rate-limited (' + (geminiErr.detail || 'quota reached') + ')'
      : 'Gemini error: ' + geminiErr.message;
    noteEl.textContent = reasonText + ' — using Groq.';
    bubble.appendChild(noteEl);
    toast(reasonText + ' — using Groq.');
    succeededProvider = 'groq';
  };

  if (ctx.provider === 'gemini') {
    const useLive = needsLiveInfo(ctx.userText) && !attachments.length;
    try {
      await sendToGemini(buildMessages('gemini', ctx.userText, attachments), token, useLive);
      succeededProvider = 'gemini';
    } catch (err) {
      try {
        await fallbackToGroq(err);
      } catch (err2) {
        failThis(err2.message);
        return;
      }
    }
  } else {
    try {
      if (curHasImage) {
        await sendToGroq(buildMessages('groq', ctx.userText, attachments), token, groqStart(), curGroqMaxTokens);
      } else {
        await groqSendFitted(ctx.userText, attachments, token, curGroqMaxTokens);
      }
    } catch (err) {
      failThis(isTooLargeError(err.detail) || isTooLargeError(err.message) || err.message === TOO_LARGE_MSG
        ? 'Groq\u2019s free tier can\u2019t fit this request (8K tokens/min limit) \u2014 try a shorter message, or clear Memory / start a new conversation.'
        : (err.rateLimited ? friendlyRateLimit('Groq', err) + RATE_HINT : err.message));
      return;
    }
    succeededProvider = 'groq';
  }

  busy = false;
  updateSendDisabled();
  setStatus('online', '');
  const cleaned = reply.trim();
  if (!cleaned) { failThis('E.V received nothing back. Try again.'); return; }
  usedLabel = baseLabelFor(ctx);
  bubble.querySelector('.tag').innerHTML = 'E.V <span class="provider">(' + usedLabel + ')</span>';
  writeEvEntry(ctx.entryRef, { role: 'ev', text: cleaned, sensitive: !!ctx.sensitive, provider: usedLabel });
  extractFacts(ctx.userText);
  if (succeededProvider) maybeSummarizeHistory(succeededProvider).catch(() => {});
  if (ctx.clearAttachmentsOnSuccess) setPendingAttachments([]);
  if (settings.voice) speak(cleaned);
}

async function send(rawText) {
  if (busy) return;
  const text = rawText.trim();
  if (!text && !pendingAttachments.length) return;
  if (PRIVATE_ON_RE.test(text)) { privateMode = true; saveJSON(STORAGE.privateMode, privateMode); toast('Private session on. Routing to Groq.'); }
  if (PRIVATE_OFF_RE.test(text)) { privateMode = false; saveJSON(STORAGE.privateMode, privateMode); toast('Private session off.'); }

  let cmdReply = null;
  try { cmdReply = handlePhoneCommands(text); } catch (e) { /* keep going */ }

  const analysis = analyzeSensitivity(text);
  const attachText = pendingAttachments.length ? ' ' + getAttachmentText() : '';
  addMsg('user', text + (attachText ? '\n' + attachText.trim() : ''));
  history.push({ role: 'user', text: text + attachText, sensitive: analysis.sensitive });
  trimHistory();
  saveJSON(STORAGE.history, history);

  const note = cmdReply ? '\n[Handled by app: ' + cmdReply + ']' : '';
  const { provider, reason } = chooseProvider(analysis);

  const hasPdf = pendingAttachments.some((a) => a.kind === 'pdf');
  if (hasPdf && provider === 'groq') {
    toast('Groq can\u2019t read PDFs. Remove the PDF or switch provider to Gemini.');
    return;
  }
  const hasImage = pendingAttachments.some((a) => a.kind === 'image');
  if (provider === 'groq' && hasImage) {
    const fits = await fitGroqBudget(pendingAttachments, text + note);
    if (!fits) {
      fail('Image too large for Groq\u2019s free limit even after compression. Try a smaller screenshot or a shorter conversation, then resend.');
      return;
    }
  }

  const baseLabel = provider === 'gemini'
    ? 'gemini · ' + getActiveModel('gemini')
    : 'groq' + (reason ? ' · ' + reason : '') + ' · ' + getActiveModel('groq');

  if (provider === 'gemini' && !settings.geminiKey) { fail('Add your Gemini API key in Settings (gear icon).'); return; }
  if (provider === 'groq' && !settings.groqKey) { fail('Add your Groq API key in Settings (gear icon).'); return; }

  const bubble = addMsg('ev', '', { provider: baseLabel });
  await performReply(bubble, {
    userText: text + note,
    provider: provider,
    reason: reason,
    sensitive: analysis.sensitive,
    attachments: pendingAttachments,
    entryRef: history.length,
    clearAttachmentsOnSuccess: true
  });
}

function openSettings() {
  el['app-version'].textContent = 'Version ' + APP_VERSION;
  el['set-gemini'].value = settings.geminiKey;
  el['set-groq'].value = settings.groqKey;
  el['set-provider'].value = settings.provider;
  el['set-privacy'].value = settings.privacy;
  el['set-voice'].checked = settings.voice;
  el['set-hands-free'].checked = settings.handsFree;
  el['set-macro-webhook'].value = settings.macroWebhook;
  el['gemini-model-label'].textContent = modelLabel('gemini');
  el['groq-model-label'].textContent = modelLabel('groq');
  show(el['modal-settings']);
}

function saveSettingsForm() {
  settings.geminiKey = el['set-gemini'].value.trim();
  settings.groqKey = el['set-groq'].value.trim();
  settings.provider = el['set-provider'].value;
  settings.privacy = el['set-privacy'].value;
  settings.voice = el['set-voice'].checked;
  settings.handsFree = el['set-hands-free'].checked;
  settings.macroWebhook = el['set-macro-webhook'].value.trim();
  saveJSON(STORAGE.settings, settings);
  hide(el['modal-settings']);
  toast('Settings saved.');
  setReactor('');
  if (!settings.handsFree && handsFreeActive) endHandsFreeSession();
}

async function testConnections() {
  const out = el['test-result'];
  out.classList.remove('hidden');
  out.textContent = 'Testing...';
  const lines = [];
  const geminiKey = el['set-gemini'].value.trim();
  const groqKey = el['set-groq'].value.trim();

  const describe = async (res) => {
    if (res.status === 429) return 'RATE LIMITED (quota reached)';
    if (res.ok) return 'OK (connected)';
    let msg = 'HTTP ' + res.status;
    try {
      const j = await res.json();
      if (j && j.error && j.error.message) msg = j.error.message;
    } catch (e) { /* status only */ }
    return msg;
  };

  if (geminiKey) {
    let found = false;
    for (const m of GEMINI_MODELS) {
      try {
        const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m.id +
          ':generateContent?key=' + encodeURIComponent(geminiKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK' }] }],
            generationConfig: { maxOutputTokens: 10 }
          })
        });
        lines.push('Gemini ' + m.id + ': ' + await describe(res));
        if (res.ok) {
          setActiveModel('gemini', GEMINI_MODELS.indexOf(m));
          lines.push('→ active Gemini model set to ' + m.id);
          found = true;
          break;
        }
      } catch (e) {
        lines.push('Gemini ' + m.id + ': network/CORS error — ' + e.message);
      }
    }
    if (!found) lines.push('→ no working Gemini model found');
  } else {
    lines.push('Gemini: no key entered');
  }

  if (groqKey) {
    let found = false;
    for (const m of GROQ_MODELS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
          body: JSON.stringify({
            model: m.id,
            messages: [{ role: 'user', content: 'Reply with the single word OK' }],
            max_tokens: 5
          })
        });
        lines.push('Groq ' + m.id + ': ' + await describe(res));
        if (res.ok) {
          setActiveModel('groq', GROQ_MODELS.indexOf(m));
          lines.push('→ active Groq model set to ' + m.id);
          found = true;
          break;
        }
      } catch (e) {
        lines.push('Groq ' + m.id + ': network/CORS error — ' + e.message);
      }
    }
    if (!found) lines.push('→ no working Groq model found');
  } else {
    lines.push('Groq: no key entered');
  }

  out.textContent = lines.join('\n');
}

function renderMemoryList() {
  el['memory-list'].innerHTML = '';
  el['memory-list'].classList.toggle('empty', facts.length === 0);
  facts.forEach((fact, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'fact-text';
    span.textContent = fact.text;
    const tag = document.createElement('span');
    tag.className = 'fact-tag' + (fact.sensitive ? ' sensitive' : '');
    tag.textContent = fact.sensitive ? 'private' : 'general';
    const del = document.createElement('button');
    del.className = 'del';
    del.textContent = '\u2715';
    del.onclick = () => {
      facts.splice(i, 1);
      saveJSON(STORAGE.facts, facts);
      renderMemoryList();
    };
    li.appendChild(span);
    li.appendChild(tag);
    li.appendChild(del);
    el['memory-list'].appendChild(li);
  });
}

function openMemory() {
  renderMemoryList();
  show(el['modal-memory']);
}

const HELLO_MSG = 'Hey. E.V here, your personal AI. Type a message or tap the reactor to talk to me.';

function startNewConversation() {
  if (busy) return;
  if (!window.confirm('Start a new conversation? The current chat will be cleared. Your saved memory and settings are kept.')) return;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  history = [];
  saveJSON(STORAGE.history, history);
  conversationSummary = '';
  saveJSON(STORAGE.conversationSummary, conversationSummary);
  lastSummaryLen = 0;
  setPendingAttachments([]);
  el.chat.innerHTML = '';
  addMsg('ev', HELLO_MSG);
  if (settings.voice) speak(HELLO_MSG);
  toast('New conversation started.');
}

function init() {
  if (sessionStorage.getItem('ev.sw-reload')) {
    sessionStorage.removeItem('ev.sw-reload');
    el['text-input'].value = sessionStorage.getItem('ev.sw-text') || '';
    sessionStorage.removeItem('ev.sw-text');
    updateSendDisabled();
  }
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js?ev=' + APP_VERSION, { updateViaCache: 'none' }).then((reg) => {
        reg.addEventListener('updatefound', () => {
          const nsw = reg.installing;
          if (!nsw) return;
          nsw.addEventListener('statechange', () => {
            if (nsw.state === 'installed' && navigator.serviceWorker.controller) {
              sessionStorage.setItem('ev.sw-text', el['text-input'].value);
              sessionStorage.setItem('ev.sw-reload', '1');
              window.location.reload();
            }
          });
        });
      });
    }
  } catch (e) { /* ignore */ }
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();

  el.reactor.addEventListener('click', toggleListening);
  el['voice-overlay'].addEventListener('click', () => {
    if (!listening && !handsFreeActive) return;
    toggleListening();
  });
  el['btn-send'].addEventListener('click', () => {
    const v = el['text-input'].value.trim();
    if (!v && !pendingAttachments.length) return;
    el['text-input'].value = '';
    updateSendDisabled();
    send(v);
  });
  el['text-input'].addEventListener('input', updateSendDisabled);
  el['text-input'].addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el['btn-send'].click(); }
  });
  el['btn-attach'].addEventListener('click', () => el['file-input'].click());
  el['file-input'].addEventListener('change', () => {
    handleFileInput(el['file-input'].files);
    el['file-input'].value = '';
  });
  window.addEventListener('beforeunload', () => { if (pendingAttachments.length) setPendingAttachments([]); });
  el['btn-settings'].addEventListener('click', openSettings);
  el['btn-settings-save'].addEventListener('click', saveSettingsForm);
  el['btn-settings-cancel'].addEventListener('click', () => hide(el['modal-settings']));
  el['btn-test'].addEventListener('click', testConnections);
  const resetModel = (provider) => {
    const m = resetActiveModel(provider);
    el[provider === 'gemini' ? 'gemini-model-label' : 'groq-model-label'].textContent = modelLabel(provider);
    toast((provider === 'gemini' ? 'Gemini' : 'Groq') + ' model reset to ' + m);
  };
  el['btn-reset-gemini'].addEventListener('click', () => resetModel('gemini'));
  el['btn-reset-groq'].addEventListener('click', () => resetModel('groq'));
  el['btn-memory'].addEventListener('click', openMemory);
  el['btn-new'].addEventListener('click', startNewConversation);
  el['btn-memory-close'].addEventListener('click', () => hide(el['modal-memory']));
  el['btn-memory-clear'].addEventListener('click', () => {
    facts = [];
    saveJSON(STORAGE.facts, facts);
    renderMemoryList();
  });
  el['modal-settings'].addEventListener('click', (e) => { if (e.target === el['modal-settings']) hide(el['modal-settings']); });
  el['modal-memory'].addEventListener('click', (e) => { if (e.target === el['modal-memory']) hide(el['modal-memory']); });

  setReactor('');
  if (!history.length) {
    addMsg('ev', HELLO_MSG);
    if (settings.voice) speak(HELLO_MSG);
  } else {
    renderHistory();
    addMsg('ev', 'Welcome back.');
  }
  const calendarEvent = parseCalendarFragment();
  if (calendarEvent) {
    renderCalendarResult(calendarEvent);
    if (calendarChannel) {
      try {
        calendarChannel.postMessage({ type: 'calendar', title: calendarEvent.title, date: calendarEvent.date, events: calendarEvent.events });
      } catch (e) { /* ignore */ }
    }
  }
  if (window.location.hash.match(/^#next=/) || new URLSearchParams(window.location.search).has('next')
      || new URLSearchParams(window.location.search).has('date')) {
    try { history.replaceState(null, '', window.location.pathname); } catch (e) { /* ignore */ }
  }
}

init();
