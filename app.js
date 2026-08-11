const SYSTEM_PROMPT = [
  "You are E.V, a personal AI assistant living on the user's phone. You are modeled on the quick-witted, capable AI sidekicks of Spider-Man. You are the user's close, trusted companion.",
  'Personality: sharp, confident, friendly, techy, occasionally playful and dry-humored. Keep responses natural for spoken conversation: short, clear, no heavy formatting. Never break character.',
  'You have memory of facts about the user. Use those facts when relevant, but never recite them unprompted and never claim you just met them if you know them.',
  'When you need current or real-time information (weather, news, sports, stock prices, recent events), use the web search tool you have access to.',
  'Anything marked [PRIVATE] is confidential and must never be repeated to anyone else or shared in responses.',
  'Be honest about your limits. If you cannot do something, say so briefly and suggest an alternative.'
].join('\n');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const PRIVATE_ON_RE = /\b(this is private|private mode on|secure this|enter private mode)\b/i;
const PRIVATE_OFF_RE = /\b(private mode off|not private anymore|this is not private|declassify|exit private mode)\b/i;

const PII_PATTERNS = [
  { re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, cat: 'finance' },
  { re: /\b\d{3}-\d{2}-\d{4}\b/, cat: 'identity' },
  { re: /\b(\+?\d{1,3}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/, cat: 'identity' },
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, cat: 'identity' }
];

const SENSITIVE_KEYWORDS = {
  credentials: ['password', 'passcode', ' otp', 'two-factor', '2fa', 'security question', 'login', 'secret'],
  finance: ['bank', 'credit card', 'debit card', 'salary', 'income', 'tax return', 'taxes', 'mortgage', 'loan', 'crypto', 'wallet', 'paypal', 'investment', 'routing number', 'bank account', 'ssn'],
  health: ['medical', 'health', 'doctor', 'diagnosis', 'prescription', 'medication', 'therapy', 'psychiatrist', 'mental health', 'lab results', 'weight'],
  identity: ['address', 'passport', "driver's license", 'license plate', 'id number', 'social security', 'date of birth', 'phone number', 'ssn', 'birthday', 'my age']
};

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

const STORAGE = {
  settings: 'ev.settings',
  history: 'ev.history',
  facts: 'ev.facts',
  privateMode: 'ev.privateMode'
};

const DEFAULT_SETTINGS = {
  geminiKey: '',
  groqKey: '',
  provider: 'auto',
  privacy: 'auto',
  voice: true
};

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
let privateMode = loadJSON(STORAGE.privateMode, false);
let busy = false;

const el = {};
const els = ['chat', 'text-input', 'btn-send', 'reactor', 'reactor-wrap', 'status-dot', 'status-text',
  'modal-settings', 'set-gemini', 'set-groq', 'set-provider', 'set-privacy', 'set-voice',
  'btn-settings', 'btn-settings-save', 'btn-settings-cancel',
  'modal-memory', 'memory-list', 'btn-memory', 'btn-memory-clear', 'btn-memory-close', 'toast'];
els.forEach((id) => { el[id] = document.getElementById(id); });

function analyzeSensitivity(text) {
  const hits = new Set();
  for (const p of PII_PATTERNS) {
    if (p.re.test(text)) hits.add(p.cat);
  }
  const lower = ' ' + text.toLowerCase() + ' ';
  for (const cat of Object.keys(SENSITIVE_KEYWORDS)) {
    for (const kw of SENSITIVE_KEYWORDS[cat]) {
      if (lower.indexOf(kw) !== -1) hits.add(cat);
    }
  }
  const sensitive = hits.size > 0 && [...hits].some((c) => ALWAYS_SENSITIVE_CATEGORIES.includes(c));
  return { sensitive, categories: [...hits] };
}

function chooseProvider(analysis) {
  const p = settings.provider;
  if (p === 'gemini') return 'gemini';
  if (p === 'groq') return 'groq';
  const priv = settings.privacy;
  if (priv === 'groq') return 'groq';
  if (priv === 'auto' && (analysis.sensitive || privateMode)) return 'groq';
  if (priv === 'manual' && (analysis.private || privateMode)) return 'groq';
  return 'gemini';
}

function visibleFacts(provider) {
  return facts.filter((f) => provider === 'groq' || !f.sensitive);
}

function buildSystem(provider) {
  const f = visibleFacts(provider);
  let out = SYSTEM_PROMPT;
  if (f.length) {
    const list = f.map((x) => '- ' + (x.sensitive ? '[PRIVATE] ' : '') + x.text).join('\n');
    out += '\n\nFacts about the user:\n' + list;
  }
  if (privateMode) out += '\n\n[PRIVATE SESSION ACTIVE] The user asked to keep this conversation private. Do not mention this mode unless asked.';
  return out;
}

function buildMessages(provider, userText) {
  if (provider === 'gemini') {
    const contents = [];
    for (const h of history) {
      if (h.sensitive) continue;
      contents.push({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.text }] });
    }
    contents.push({ role: 'user', parts: [{ text: userText }] });
    return contents;
  }
  const messages = [{ role: 'system', content: buildSystem(provider) }];
  for (const h of history) {
    messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text });
  }
  messages.push({ role: 'user', content: userText });
  return messages;
}

async function readSSE(response, onData) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (line.indexOf('data:') === 0) {
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try { onData(JSON.parse(payload)); } catch (e) { /* skip partial */ }
      }
    }
  }
}

async function sendToGemini(messages, onToken) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL +
    ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(settings.geminiKey);
  const body = {
    contents: messages,
    systemInstruction: { parts: [{ text: buildSystem('gemini') }] },
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    tools: [{ googleSearch: {} }]
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) {
    const text = await res.text();
    if (text.indexOf('google_search') !== -1 || res.status === 400) {
      delete body.tools;
      const retry = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (retry.status === 429) throw new Error('RATE_LIMIT');
      if (!retry.ok) throw new Error('Gemini ' + retry.status + ': ' + (await retry.text()).slice(0, 160));
      await readSSE(retry, onToken);
      return;
    }
    throw new Error('Gemini ' + res.status + ': ' + text.slice(0, 160));
  }
  await readSSE(res, onToken);
}

async function sendToGroq(messages, onToken) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + settings.groqKey
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true
    })
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error('Groq ' + res.status + ': ' + (await res.text()).slice(0, 160));
  await readSSE(res, (j) => {
    const d = j.choices && j.choices[0] && j.choices[0].delta;
    if (d && typeof d.content === 'string' && d.content) onToken(d.content);
  });
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
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  addMsg('ev', message, { error: true });
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
  if (!settings.voice || !('speechSynthesis' in window)) return;
  const clean = text.replace(/[#*_`]/g, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  const v = pickVoice();
  if (v) u.voice = v;
  u.rate = 1.02;
  u.pitch = 0.95;
  const done = () => { setReactor(''); setStatus('online', ''); };
  u.onend = done;
  u.onerror = done;
  setReactor('speaking');
  setStatus('speaking', 'busy');
  window.speechSynthesis.speak(u);
}

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

function toggleListening() {
  if (busy) return;
  if (!SR) { toast('Voice input is not supported in this browser.'); return; }
  if (listening) { recognition && recognition.stop(); return; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  let finalText = '';
  recognition.onstart = () => { listening = true; setReactor('listening'); setStatus('listening', 'busy'); };
  recognition.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else el['text-input'].value = e.results[i][0].transcript;
    }
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Microphone permission denied.');
  };
  recognition.onend = () => {
    listening = false;
    setReactor('');
    setStatus('online', '');
    const value = (finalText || el['text-input'].value).trim();
    if (value) send(value);
  };
  recognition.start();
}

function launchApp(app) {
  const fallback = 'https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3D' + app.pkg;
  window.location.href =
    'intent://#Intent;scheme=' + app.scheme + ';package=' + app.pkg + ';S.browser_fallback_url=' + fallback + ';end';
}

function triggerMacro(action) {
  window.location.href =
    'intent://#Intent;action=' + action + ';scheme=mdm;category=android.intent.category.DEFAULT;end';
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
    triggerMacro('com.ev.' + what + '.' + toggleMatch[2]);
    return 'Sending command to switch ' + what + ' ' + toggleMatch[2] + '.';
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
    added = true;
  }
  if (added) {
    saveJSON(STORAGE.facts, facts);
    if (!el['modal-memory'].classList.contains('hidden')) renderMemoryList();
  }
}

async function send(rawText) {
  const text = rawText.trim();
  if (!text || busy) return;
  if (PRIVATE_ON_RE.test(text)) { privateMode = true; saveJSON(STORAGE.privateMode, privateMode); toast('Private session on. Routing to Groq.'); }
  if (PRIVATE_OFF_RE.test(text)) { privateMode = false; saveJSON(STORAGE.privateMode, privateMode); toast('Private session off.'); }

  let cmdReply = null;
  try { cmdReply = handlePhoneCommands(text); } catch (e) { /* keep going */ }

  const analysis = analyzeSensitivity(text);
  addMsg('user', text);
  history.push({ role: 'user', text: text, sensitive: analysis.sensitive });
  trimHistory();

  const note = cmdReply ? '\n[Handled by app: ' + cmdReply + ']' : '';
  const provider = chooseProvider(analysis);
  const messages = buildMessages(provider, text + note);

  busy = true;
  setStatus(provider === 'groq' ? 'private route' : 'thinking', 'busy');
  const bubble = addMsg('ev', '', { provider });
  const bodyEl = bubble.querySelector('.body');

  let used = provider;
  let reply = '';
  const token = (chunk) => {
    reply += chunk;
    bodyEl.textContent = reply;
    scrollChat();
  };
  const fallbackToGroq = async () => {
    if (!settings.groqKey) throw new Error('Gemini failed and no Groq key is set.');
    used = 'groq';
    bubble.querySelector('.tag').innerHTML = 'E.V <span class="provider">(groq fallback)</span>';
    await sendToGroq(buildMessages('groq', text + note), token);
  };

  if (provider === 'gemini') {
    if (!settings.geminiKey) { fail('Add your Gemini API key in Settings (gear icon).'); return; }
    try {
      await sendToGemini(messages, token);
    } catch (err) {
      try {
        await fallbackToGroq();
      } catch (err2) {
        fail(err2.message);
        return;
      }
    }
  } else {
    if (!settings.groqKey) { fail('Add your Groq API key in Settings (gear icon).'); return; }
    try {
      await sendToGroq(messages, token);
    } catch (err) {
      fail(err.message);
      return;
    }
  }

  busy = false;
  setStatus('online', '');
  const cleaned = reply.trim();
  if (!cleaned) { fail('E.V received nothing back. Try again.'); return; }
  bubble.querySelector('.tag').innerHTML = 'E.V <span class="provider">(' + used + ')</span>';
  history.push({ role: 'ev', text: cleaned, sensitive: analysis.sensitive });
  trimHistory();
  saveJSON(STORAGE.history, history);
  extractFacts(text);
  if (settings.voice) speak(cleaned);
}

function openSettings() {
  el['set-gemini'].value = settings.geminiKey;
  el['set-groq'].value = settings.groqKey;
  el['set-provider'].value = settings.provider;
  el['set-privacy'].value = settings.privacy;
  el['set-voice'].checked = settings.voice;
  show(el['modal-settings']);
}

function saveSettingsForm() {
  settings.geminiKey = el['set-gemini'].value.trim();
  settings.groqKey = el['set-groq'].value.trim();
  settings.provider = el['set-provider'].value;
  settings.privacy = el['set-privacy'].value;
  settings.voice = el['set-voice'].checked;
  saveJSON(STORAGE.settings, settings);
  hide(el['modal-settings']);
  toast('Settings saved.');
  setReactor('');
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

function init() {
  try {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
  } catch (e) { /* ignore */ }
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();

  el.reactor.addEventListener('click', toggleListening);
  el['btn-send'].addEventListener('click', () => {
    const v = el['text-input'].value.trim();
    if (!v) return;
    el['text-input'].value = '';
    send(v);
  });
  el['text-input'].addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el['btn-send'].click(); }
  });
  el['btn-settings'].addEventListener('click', openSettings);
  el['btn-settings-save'].addEventListener('click', saveSettingsForm);
  el['btn-settings-cancel'].addEventListener('click', () => hide(el['modal-settings']));
  el['btn-memory'].addEventListener('click', openMemory);
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
    const hello = 'Hey. E.V here, your personal AI. Type a message or tap the reactor to talk to me.';
    addMsg('ev', hello);
    if (settings.voice) speak(hello);
  } else {
    addMsg('ev', 'Welcome back.');
  }
}

init();
