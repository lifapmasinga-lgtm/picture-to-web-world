// ================= AI Workplace Productivity Assistant =================
// Plain JavaScript. Three parts: 1) navigation  2) prompts  3) calling the AI

// ---------- 1. NAVIGATION ----------
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelector('[data-page="' + id + '"]').classList.add("active");
  document.getElementById("sidebar").classList.remove("open"); // close menu on mobile
}

document.querySelectorAll(".nav-item").forEach(btn =>
  btn.addEventListener("click", () => showPage(btn.dataset.page)));
document.querySelectorAll(".card").forEach(card =>
  card.addEventListener("click", () => showPage(card.dataset.go)));
document.getElementById("menuBtn").addEventListener("click", () =>
  document.getElementById("sidebar").classList.toggle("open"));

// ---------- 2. PROMPT ENGINEERING ----------
// Every tool has a clear ROLE, TASK, FORMAT and RULES so answers are reliable.
const SAFETY = " Never invent facts, names or dates. If information is missing, say so. Keep content respectful and unbiased.";

const tools = {
  email: {
    output: "emailOut",
    system: "ROLE: You are an expert business communication writer." + SAFETY,
    prompt: () =>
      "TASK: Write a professional email.\n" +
      "Recipient: " + val("emailTo") + "\n" +
      "Purpose: " + val("emailTopic") + "\n" +
      "Tone: " + val("emailTone") + "\n" +
      "FORMAT: Subject line, greeting, 2-3 short paragraphs, clear call to action, sign-off with [Your Name].\n" +
      "RULES: Under 200 words. Plain text, no markdown."
  },
  notes: {
    output: "notesOut",
    system: "ROLE: You are a precise meeting secretary." + SAFETY,
    prompt: () =>
      "TASK: Analyse these meeting notes.\n\nNOTES:\n" + val("notesIn") + "\n\n" +
      "FORMAT (plain text with these headings):\n" +
      "SUMMARY: 3-5 sentences\nKEY DECISIONS: bullet list\n" +
      "ACTION ITEMS: bullet list as 'Task - Owner'\nDEADLINES: bullet list as 'Item - Date'\n" +
      "RULES: Write 'Not mentioned' if a section has no information."
  },
  planner: {
    output: "plannerOut",
    system: "ROLE: You are a productivity coach who uses the Eisenhower Matrix (urgent/important)." + SAFETY,
    prompt: () =>
      "TASK: Create a " + val("planType") + " schedule.\n" +
      "Working hours: " + val("hours") + "\nTasks:\n" + val("tasksIn") + "\n\n" +
      "FORMAT (plain text):\n1. PRIORITIES: each task labelled High / Medium / Low with a short reason\n" +
      "2. SCHEDULE: time blocks like '08:00-09:00 - Task'\n3. TIPS: 2 short focus tips\n" +
      "RULES: Include short breaks. Do not overload the day."
  },
  research: {
    output: "researchOut",
    system: "ROLE: You are a careful workplace research analyst." + SAFETY,
    prompt: () =>
      "TASK: Research the following topic or text.\n\nINPUT:\n" + val("researchIn") + "\n\n" +
      "FORMAT (plain text):\nSUMMARY: short paragraph\nKEY INSIGHTS: 3-5 bullets\n" +
      "RECOMMENDATIONS: 3 practical actions\nLIMITATIONS: what should be verified\n" +
      "RULES: Be balanced and mention when sources should be checked."
  }
};

function val(id) { return document.getElementById(id).value.trim(); }

// ---------- 3. CALLING THE AI ----------
// Sends the prompt to our server, which talks to Lovable AI, and streams the answer back.
async function askAI(system, messages, onText) {
  const res = await fetch("/api/public/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages })
  });
  if (!res.ok) throw new Error("The AI service is unavailable right now (" + res.status + ").");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
    onText(text); // update the screen as words arrive
  }
  if (!text) throw new Error("No answer was returned. Please try again.");
  return text;
}

// Tool buttons (email, notes, planner, research)
document.querySelectorAll("[data-tool]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const tool = tools[btn.dataset.tool];
    const out = document.getElementById(tool.output);
    const inputs = btn.closest(".panel").querySelectorAll("textarea");
    if (![...inputs].every(i => i.value.trim())) { out.value = "Please fill in the input first 🙂"; return; }

    const label = btn.textContent;
    btn.textContent = "Thinking..."; btn.classList.add("loading");
    out.value = "";
    try {
      await askAI(tool.system, [{ role: "user", content: tool.prompt() }], t => out.value = t);
    } catch (e) {
      out.value = "⚠️ " + e.message;
    }
    btn.textContent = label; btn.classList.remove("loading");
  });
});

// Copy buttons
document.querySelectorAll("[data-copy]").forEach(btn =>
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById(btn.dataset.copy).value);
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 1500);
  }));

// Chatbot (remembers the conversation)
const history = [];
const chatSystem = "ROLE: You are a friendly, concise workplace assistant. Answer in plain text, short paragraphs." + SAFETY;

document.getElementById("chatForm").addEventListener("submit", async e => {
  e.preventDefault();
  const input = document.getElementById("chatIn");
  const question = input.value.trim();
  if (!question) return;
  input.value = "";
  addMsg(question, "user");
  history.push({ role: "user", content: question });

  const bubble = addMsg("...", "bot");
  try {
    const answer = await askAI(chatSystem, history, t => bubble.textContent = t);
    history.push({ role: "assistant", content: answer });
  } catch (err) {
    bubble.textContent = "⚠️ " + err.message;
    history.pop();
  }
});

function addMsg(text, who) {
  const log = document.getElementById("chatLog");
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  return div;
}
