// Trestle: navigation, effects, structured prompts and streaming AI.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let effectsChoice = true;
try { effectsChoice = localStorage.getItem('trestle-effects') !== 'off'; } catch { /* Storage can be unavailable. */ }
function effectsEnabled() { return effectsChoice && !motionPreference.matches; }
const effectsToggle = document.getElementById('effectsToggle');
const splash = document.getElementById('splash');
let splashTimers = [];
function closeSplash() {
  splashTimers.forEach(clearTimeout); splashTimers = [];
  splash.hidden = true;
  document.body.classList.remove('splash-active');
}
function applyEffects() {
  const enabled = effectsEnabled();
  document.body.classList.toggle('effects-off', !enabled);
  effectsToggle.checked = enabled;
  effectsToggle.disabled = motionPreference.matches;
  document.getElementById('effectsLabel').textContent = 'Effects: ' + (enabled ? 'On' : 'Off');
  if (!enabled) closeSplash();
}
effectsToggle.addEventListener('change', () => {
  effectsChoice = effectsToggle.checked;
  try { localStorage.setItem('trestle-effects', effectsChoice ? 'on' : 'off'); } catch { /* No persistence in private storage. */ }
  applyEffects();
});
motionPreference.addEventListener('change', applyEffects);
applyEffects();
// Run only on the first load in this tab, never when motion is disabled.
let firstLoad = true;
try { firstLoad = !sessionStorage.getItem('trestle-opened'); sessionStorage.setItem('trestle-opened', 'yes'); } catch { /* Still runs once per document. */ }
if (firstLoad && effectsEnabled()) {
  splash.hidden = false;
  document.body.classList.add('splash-active');
  splashTimers.push(setTimeout(() => {
    document.getElementById('splashStatus').textContent = 'Ready ✓';
  }, 2400));
  splashTimers.push(setTimeout(() => {
    splash.classList.add('closing');
    document.body.classList.remove('splash-active');
    document.body.classList.add('entering');
  }, 2750));
  splashTimers.push(setTimeout(() => { closeSplash(); }, 3650));
}
// ---------- 1. NAVIGATION ----------
const mobile = window.matchMedia('(max-width: 860px)');
const menuBtn = document.getElementById('menuBtn');
function syncMenu() {
  const expanded = mobile.matches ? document.body.classList.contains('open') : !document.body.classList.contains('collapsed');
  menuBtn.setAttribute('aria-expanded', String(expanded));
  document.getElementById('sidebar').inert = !expanded;
  menuBtn.querySelector('use').setAttribute('href', mobile.matches ? '#i-menu' : '#i-panel');
}
function showPage(id) {
  const page = document.getElementById(id);
  if (!page?.classList.contains('page')) return;
  document.body.classList.remove('entering');
  document.querySelectorAll('.page, .nav-item').forEach(el => el.classList.remove('active'));
  page.classList.add('active');
  document.querySelector('[data-page="' + id + '"]').classList.add('active');
  document.body.classList.remove('open'); syncMenu();
  window.scrollTo({ top: 0, behavior: effectsEnabled() ? 'smooth' : 'auto' });
  const heading = page.querySelector('h1');
  heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true });
}
document.querySelectorAll('[data-page], [data-go]').forEach(el => {
  el.addEventListener('click', () => showPage(el.dataset.page || el.dataset.go));
  if (el.getAttribute('role') === 'button') el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
});
menuBtn.addEventListener('click', () => { document.body.classList.toggle(mobile.matches ? 'open' : 'collapsed'); syncMenu(); });
document.getElementById('overlay').addEventListener('click', () => { document.body.classList.remove('open'); syncMenu(); menuBtn.focus(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('open')) { document.body.classList.remove('open'); syncMenu(); menuBtn.focus(); }
});
mobile.addEventListener('change', syncMenu); syncMenu();
// ---------- 2. PROMPT ENGINEERING ----------
// The preview is built from the SAME strings sent to the AI, not a separate example.
const SAFETY = 'Do not invent facts, names or dates. If something is missing, write [to confirm]. Keep the tone respectful and unbiased. Do not ask for personal or confidential data.';
function val(id) { return document.getElementById(id).value.trim(); }
const tools = {
  email: {
    output: 'emailOut', system: 'ROLE: You are an expert business communication writer.',
    prompt: () => 'TASK: Write a professional email.\nCONTEXT:\nRecipient: ' + val('emailTo') + '\nPurpose: ' + val('emailTopic') + '\nTone: ' + val('emailTone') + '\nFORMAT: Subject line, greeting, 2-3 short paragraphs, clear call to action, sign-off with [Your Name].\nRULES: Under 200 words. Plain text, no markdown. ' + SAFETY
  },
  notes: {
    output: 'notesOut', system: 'ROLE: You are a precise meeting secretary.',
    prompt: () => 'TASK: Analyse these meeting notes.\nCONTEXT:\nNOTES:\n' + val('notesIn') + '\nFORMAT (plain text with these headings):\nSUMMARY: 3-5 sentences\nKEY DECISIONS: bullet list\nACTION ITEMS: bullet list as Task - Owner\nDEADLINES: bullet list as Item - Date\nRULES: Use [to confirm] for missing information. ' + SAFETY
  },
  planner: {
    output: 'plannerOut', system: 'ROLE: You are a productivity coach who uses the Eisenhower Matrix (urgent/important).',
    prompt: () => 'TASK: Create a ' + val('planType') + ' schedule.\nCONTEXT:\nWorking hours: ' + val('hours') + '\nTasks:\n' + val('tasksIn') + '\nFORMAT (plain text):\n1. PRIORITIES: each task labelled High / Medium / Low with a short reason\n2. SCHEDULE: time blocks like 08:00-09:00 - Task\n3. TIPS: 2 short focus tips\nRULES: Include short breaks. Do not overload the day. ' + SAFETY
  },
  research: {
    output: 'researchOut', system: 'ROLE: You are a careful workplace research analyst.',
    prompt: () => 'TASK: Research the following topic or text.\nCONTEXT:\nINPUT:\n' + val('researchIn') + '\nFORMAT (plain text):\nSUMMARY: short paragraph\nKEY INSIGHTS: 3-5 bullets\nRECOMMENDATIONS: 3 practical actions\nLIMITATIONS: what should be verified\nRULES: Be balanced and mention when sources should be checked. ' + SAFETY
  }
};
const history = [];
const chatSystem = 'ROLE: You are a friendly, concise workplace assistant.\nTASK: Answer the workplace question.\nCONTEXT: Use the conversation messages provided below.\nFORMAT: Plain text, short paragraphs.\nRULES: ' + SAFETY;
let chatPending = false;
function updatePrompts() {
  Object.entries(tools).forEach(([id, tool]) => { document.getElementById(id + 'Prompt').textContent = tool.system + '\n' + tool.prompt(); });
  const messages = [...history];
  if (val('chatIn')) messages.push({ role: 'user', content: val('chatIn') });
  document.getElementById('chatPrompt').textContent = chatSystem + '\n\nCONVERSATION MESSAGES:\n' + JSON.stringify(messages, null, 2);
}
document.querySelectorAll('input, textarea, select').forEach(el => { el.addEventListener('input', updatePrompts); el.addEventListener('change', updatePrompts); });
updatePrompts();
// ---------- 3. CALLING THE AI ----------
async function askAI(system, messages, onText) {
  const res = await fetch('/api/public/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, messages }) });
  if (!res.ok) throw new Error('The AI service is unavailable right now (' + res.status + ').');
  if (!res.body) throw new Error('No answer was returned. Please try again.');
  const reader = res.body.getReader(); const decoder = new TextDecoder(); let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true }); onText(text);
  }
  text += decoder.decode(); onText(text);
  if (!text.trim()) throw new Error('No answer was returned. Please try again.');
  return text;
}
// Slow streaming reveal catches up with incoming text, but never delays motion-off output.
function answerWriter(write) {
  let target = '', shown = 0, timer;
  function tick() {
    if (!effectsEnabled()) shown = target.length;
    else shown = Math.min(target.length, shown + Math.max(3, Math.ceil((target.length - shown) / 12)));
    write(target.slice(0, shown));
    timer = shown < target.length ? setTimeout(tick, 35) : undefined;
  }
  return {
    update(text) { target = text; if (!timer) tick(); },
    async finish() { while (timer) await new Promise(resolve => setTimeout(resolve, 40)); },
    cancel() { clearTimeout(timer); timer = undefined; }
  };
}
document.querySelectorAll('[data-tool]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tool = tools[btn.dataset.tool]; const out = document.getElementById(tool.output);
    if (![...btn.closest('.panel').querySelectorAll('textarea')].every(i => i.value.trim())) { out.value = 'Please fill in the input first.'; return; }
    const label = btn.textContent; const panel = out.closest('.output-panel');
    btn.textContent = 'Thinking…'; btn.disabled = true; out.value = ''; out.readOnly = true;
    panel.classList.add('generating'); panel.setAttribute('aria-busy', 'true');
    const writer = answerWriter(t => { out.value = t; });
    try { await askAI(tool.system, [{ role: 'user', content: tool.prompt() }], t => { panel.classList.remove('generating'); writer.update(t); }); await writer.finish(); }
    catch (e) { writer.cancel(); out.value = e.message; }
    finally { btn.textContent = label; btn.disabled = false; out.readOnly = false; panel.classList.remove('generating'); panel.setAttribute('aria-busy', 'false'); }
  });
});
document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.getElementById(btn.dataset.copy).value); btn.textContent = 'Copied!'; }
  catch { btn.textContent = 'Copy failed'; }
  setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
}));
// Chat keeps its in-page conversation history and prevents overlapping requests.
document.getElementById('chatForm').addEventListener('submit', async e => {
  e.preventDefault(); if (chatPending) return;
  const input = document.getElementById('chatIn'); const question = input.value.trim(); if (!question) return;
  chatPending = true; const btn = e.currentTarget.querySelector('button'); btn.disabled = true;
  input.value = ''; addMsg(question, 'user'); history.push({ role: 'user', content: question }); updatePrompts();
  const bubble = addMsg('Thinking…', 'bot'); bubble.classList.add('generating');
  const writer = answerWriter(t => { bubble.textContent = t; bubble.parentElement.scrollTop = bubble.parentElement.scrollHeight; });
  try {
    const answer = await askAI(chatSystem, history, t => { bubble.classList.remove('generating'); writer.update(t); });
    await writer.finish(); history.push({ role: 'assistant', content: answer });
  } catch (err) { writer.cancel(); bubble.textContent = err.message; history.pop(); }
  finally { bubble.classList.remove('generating'); chatPending = false; btn.disabled = false; updatePrompts(); }
});
function addMsg(text, who) {
  const log = document.getElementById('chatLog'); const div = document.createElement('div');
  div.className = 'msg ' + who; div.textContent = text; log.appendChild(div); log.scrollTop = log.scrollHeight; return div;
}
