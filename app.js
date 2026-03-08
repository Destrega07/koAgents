const elements = {
  agentList: document.getElementById("agentList"),
  activeAgentName: document.getElementById("activeAgentName"),
  activeAgentDesc: document.getElementById("activeAgentDesc"),
  messages: document.getElementById("messages"),
  statusBar: document.getElementById("statusBar"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  sendBtn: document.getElementById("sendBtn"),
  fileBtn: document.getElementById("fileBtn"),
  fileInput: document.getElementById("fileInput"),
  filePreview: document.getElementById("filePreview"),
  fileNameText: document.getElementById("fileNameText"),
  removeFileBtn: document.getElementById("removeFileBtn"),
  uploadProgressWrap: document.getElementById("uploadProgressWrap"),
  uploadProgressBar: document.getElementById("uploadProgressBar"),
  clearChatBtn: document.getElementById("clearChatBtn"),
  downloadChatBtn: document.getElementById("downloadChatBtn"),
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  mobileMoreBtn: document.getElementById("mobileMoreBtn"),
  mobileMoreMenu: document.getElementById("mobileMoreMenu"),
  mobileClearChatBtn: document.getElementById("mobileClearChatBtn"),
  mobileDownloadChatBtn: document.getElementById("mobileDownloadChatBtn"),
  postLoginOverlay: document.getElementById("postLoginOverlay"),
  postLoginLogo: document.getElementById("postLoginLogo"),
  sidebarLogo: document.getElementById("sidebarLogo"),
  tokenHint: document.getElementById("tokenHint"),
};

function getOrCreateUserId() {
  const key = "ko_user_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + "";
  localStorage.setItem(key, id);
  return id;
}

function sanitizeText(text) {
  return String(text ?? "");
}

function stripMarkdownArtifacts(text) {
  let out = String(text ?? "");
  out = out.replace(/^\s*#{1,6}\s*/gm, "");
  out = out.replace(/^\s*[-=]{3,}\s*$/gm, "");
  out = out.replace(/`{3,}/g, "");
  out = out.replace(/\s*(?:-{3,}|={3,})\s*/g, "\n\n");
  out = out.replace(/===+/g, "");
  out = out.replace(/---+/g, "");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/\*\*/g, "");
  out = out.replace(/(^|[\u4e00-\u9fa5A-Za-z0-9）)])--+(?=\s|$)/g, "$1");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

function recoverMarkdownTables(text) {
  let out = String(text ?? "");
  out = out.replace(/`?[A-Za-z]:\\[^`|\n]+\.txt#L\d+(?:-\d+)?`?/g, "");
  out = out.replace(/(^|\n)(\|[^\n]*?\|)\s*\|\s*(?=[^\n|]+\|)/g, "$1$2\n|");
  out = out.replace(/\|\|+/g, "|\n|");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

function classifyLineLevel(line) {
  const s = String(line ?? "").trim();
  if (!s) return 0;
  if (/^#{1,6}\s*/.test(s)) return 1;
  if (/^\|.*\|$/.test(s)) return 2;
  if (/^(?:[-•]\s*|[0-9]+\.\s+)/.test(s)) return 2;
  if (/^\*\*[^*]+\*\*:?\s*$/.test(s)) return 2;
  if (
    /^(?:【[^】]+】|第[一二三四五六七八九十0-9]+(?:部分|步)|Slide\s*\d+|封面页)/.test(
      s,
    )
  ) {
    return 1;
  }
  return 2;
}

function normalizeWithBlockStateMachine(text) {
  const source = String(text ?? "").replace(/\r\n/g, "\n");
  const lines = source
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .filter((line) => line.trim() !== "");

  const out = [];
  for (const line of lines) {
    const level = classifyLineLevel(line);
    if (out.length > 0) {
      if (level === 1) out.push("\n\n");
      else out.push("\n");
    }
    out.push(line.trim());
  }

  return out.join("").replace(/\n{3,}/g, "\n\n");
}

function normalizeAssistantMarkdown(markdown) {
  let text = String(markdown ?? "").replace(/\r\n/g, "\n");
  text = text.replace(/^\uFEFF/, "");
  text = text.replace(/\\n/g, "\n");
  text = text.replace(/`{3,}/g, "");
  text = text.replace(/\\`{3,}/g, "");

  text = text.replace(/^\s*```(?:markdown|md)?[ \t]*\n?/i, "");
  text = text.replace(/\n?[ \t]*```[ \t]*$/i, "");
  text = text.replace(/\*\*\s*([^*]+?)\s*\*\*/g, "**$1**");
  text = text.replace(/\s*(?:-{3,}|={3,})\s*/g, "\n\n");

  const insertBefore = (re, insert, opts = {}) => {
    const skipAtStart = Boolean(opts.skipAtStart);
    text = text.replace(re, (m, ...args) => {
      const offset = args[args.length - 2];
      const whole = args[args.length - 1];
      if (offset === 0) return skipAtStart ? m : insert + m;
      const prev = whole[offset - 1];
      if (prev === "\n") return m;
      return insert + m;
    });
  };

  const emojiPattern =
    "🎯|📢|🔍|🚀|💡|🎬|🏢|🎭|⚠️|📊|🤝|⚡|📎|📍|💬|❌|⏱️|🎲|📌|✅|📈|🔄|0️⃣|1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣";
  const semanticDashWords =
    "公司|规模|业态|发展阶段|标准化|加盟商|社交媒体|单店|当前处境|性格特点|业务亮点|我的身份|企业背景|开放式提问|探寻式提问|限制式提问|引导式提问";
  const fieldDashWords =
    "姓名|角色关系|数据基础|性格标签|核心特质|深度解读|典型行为|核心特征|语言风格|互动建议|决策类型|关键要素|决策速度|信息依赖|风险偏好|适用场景|策略|话术示例|避免";

  insertBefore(/#{1,6}/g, "\n", { skipAtStart: true });
  text = text.replace(
    new RegExp(`((?:记录了|您可以|你可以|你将获得|可获得|建议|你可)\\s*)([：:])\\s*(?=(?:${emojiPattern}))`, "g"),
    "$1$2\n",
  );
  text = text.replace(new RegExp(`(${emojiPattern})`, "g"), (m, ...args) => {
    const offset = args[args.length - 2];
    const whole = args[args.length - 1];
    if (offset === 0) return m;
    const prev = whole[offset - 1];
    if (prev === "\n") return m;
    if (prev === "#") {
      const prev2 = offset >= 2 ? whole[offset - 2] : "";
      if (prev2 === "#") return "\n\n" + m;
      return m;
    }
    if (prev === ":" || prev === "：") return m;
    const next = whole[offset + m.length];
    if (next == null || next === "\n") return m;
    return "\n" + m;
  });
  insertBefore(/【PPT内容框架】/g, "\n\n", { skipAtStart: true });
  insertBefore(/(第[一二三四五六七八九十]步|第[一二三四五六七八九十]部分|Slide\s?\d+|封面页)/g, "\n", { skipAtStart: true });

  text = text.replace(/(\*\*[^*]+\*\*)/g, (m, ...args) => {
    const offset = args[args.length - 2];
    const whole = args[args.length - 1];
    if (offset === 0) return m;
    const prev = whole[offset - 1];
    if (prev === "\n") return m;
    const before = whole.slice(Math.max(0, offset - 12), offset);
    if (/\d+\.\s*$/.test(before)) return m;
    if (/[-•]\s*$/.test(before)) return m;
    return "\n" + m;
  });
  insertBefore(/([•]|\-\s|[0-9]+\.\s)/g, "\n", { skipAtStart: true });
  text = text.replace(/([^\n])(\d{1,3})\.(?=\*\*|[A-Za-z\u4e00-\u9fff（(])/g, "$1\n$2.");
  text = text.replace(/(^|\n)(\d{1,3})\.\s*\n+(?=\S)/g, "$1$2. ");
  text = text.replace(/([^\n])-(?=\*\*)/g, "$1\n-");
  text = text.replace(/([：:])\s*-(?=\S)/g, "$1\n-");
  text = text.replace(new RegExp(`([^\\n])-(?=\\s*(?:${fieldDashWords})\\s*[：:])`, "g"), "$1\n-");
  text = text.replace(new RegExp(`([^\\n])-(?=\\s*(?:${semanticDashWords}))`, "g"), "$1\n-");
  text = text.replace(/([^\n])•(?=\S)/g, "$1\n•");
  text = text.replace(/(\+)\s*-(?=\S)/g, "$1\n-");
  text = text.replace(/-(?=(开放式提问|探寻式提问|限制式提问|引导式提问))/g, "\n-");
  text = text.replace(/([^\n])( -)(?=\S)/g, "$1\n-");
  text = text.replace(new RegExp(`(${emojiPattern})\\s*\\n+\\s*`, "g"), "$1");

  text = text.replace(/(^|[\u4e00-\u9fa5A-Za-z0-9）)])--+(?=\s|$)/g, "$1");
  text = text.replace(/^\s*---+\s*$/gm, "");
  text = text.replace(/^\s*===+\s*/gm, "");
  text = text.replace(/\s*===+\s*$/gm, "");
  text = text.replace(/\n\s*\|/g, "\n|");
  text = recoverMarkdownTables(text);
  text = text.replace(/(\n-[^\n]*)\n{2,}(?=-)/g, "$1\n");
  text = text.replace(/(\n•[^\n]*)\n{2,}(?=•)/g, "$1\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = normalizeWithBlockStateMachine(text);
  text = text.replace(/^\s*#{1,6}\s*/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

let markedConfigured = false;
function renderAssistantMarkdown(markdown) {
  const raw = normalizeAssistantMarkdown(markdown);
  const hasMarked =
    typeof window !== "undefined" &&
    window.marked &&
    typeof window.marked.parse === "function" &&
    typeof window.marked.setOptions === "function";
  if (!hasMarked) return { mode: "text", text: stripMarkdownArtifacts(raw), html: "" };
  if (!markedConfigured) {
    window.marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: false,
      mangle: false,
    });
    markedConfigured = true;
  }
  const html = window.marked.parse(raw);
  let sanitized =
    typeof window !== "undefined" && window.DOMPurify
      ? window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
      : html;
  sanitized = sanitized.replace(/\*\*/g, "");
  return { mode: "html", text: raw, html: sanitized };
}

function showStatus(message, variant) {
  const text = sanitizeText(message);
  if (!text) {
    elements.statusBar.classList.add("hidden");
    elements.statusBar.textContent = "";
    elements.statusBar.className =
      "hidden border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm";
    return;
  }

  elements.statusBar.classList.remove("hidden");
  elements.statusBar.textContent = text;
  const base = "border-b border-gray-200 px-4 py-2 text-sm";
  if (variant === "error") {
    elements.statusBar.className = `${base} bg-red-50 text-red-700`;
    return;
  }
  if (variant === "warn") {
    elements.statusBar.className = `${base} bg-yellow-50 text-yellow-800`;
    return;
  }
  elements.statusBar.className = `${base} bg-gray-50 text-gray-700`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function renderMessages(items) {
  elements.messages.innerHTML = "";
  for (const msg of items) {
    const role = msg.role;
    const isUser = role === "user";
    const wrapper = document.createElement("div");
    wrapper.className = `flex ${isUser ? "justify-end" : "justify-start"}`;

    const bubble = document.createElement("div");
    bubble.className = `max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
      isUser ? "bg-cokeRed text-white" : "bg-gray-100 text-gray-900"
    }`;

    const meta = document.createElement("div");
    meta.className = `mb-1 text-[11px] ${
      isUser ? "text-white/80" : "text-gray-500"
    }`;
    meta.textContent = `${isUser ? "我" : "智能体"} · ${formatTime(msg.ts)}`;

    const content = document.createElement("div");
    const text = sanitizeText(msg.content);
    if (isUser || !text) {
      content.className = "whitespace-pre-wrap break-words";
      content.textContent = text;
    } else {
      const rendered = renderAssistantMarkdown(text);
      if (rendered.mode === "html") {
        content.className = "md-content break-words";
        content.innerHTML = rendered.html;
      } else {
        content.className = "md-content whitespace-pre-wrap break-words";
        content.textContent = rendered.text;
      }
    }

    bubble.appendChild(meta);
    bubble.appendChild(content);
    wrapper.appendChild(bubble);
    elements.messages.appendChild(wrapper);
  }
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function extractAssistantText(payload) {
  const candidates = [];
  const direct = payload?.messages ?? payload?.data?.messages ?? payload?.data?.message_list;
  if (Array.isArray(direct)) {
    for (const m of direct) {
      const role = m?.role ?? m?.sender_role ?? m?.from;
      const type = m?.type ?? m?.message_type;
      const content = m?.content ?? m?.text ?? m?.data?.content;
      if (role === "assistant" && typeof content === "string") {
        candidates.push({ type: typeof type === "string" ? type : "", content });
      }
    }
  }
  if (candidates.length > 0) {
    const answers = candidates.filter((c) => c.type === "answer" && c.content.trim());
    if (answers.length > 0) return answers[answers.length - 1].content;
    const last = candidates[candidates.length - 1];
    return last.content;
  }

  const single =
    payload?.message?.content ??
    payload?.data?.message?.content ??
    payload?.data?.answer ??
    payload?.data?.content;
  if (typeof single === "string" && single.trim()) return single;

  return "";
}

async function fetchJson(url, options) {
  const resp = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!resp.ok) {
    const message =
      data?.msg || data?.message || data?.error || `请求失败（HTTP ${resp.status}）`;
    const err = new Error(message);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  const userId = getOrCreateUserId();
  let agents = [];
  const sessions = new Map();
  let activeBotId = null;
  let typewriterTimer = null;
  let typewriterBuffer = "";
  let typewriterTargetEl = null;
  let typewriterDone = false;
  let typewriterRenderedRaw = "";
  let activeStreamController = null;
  let stopModeTimer = null;
  let stopModeActive = false;
  let stopRequested = false;
  let mobileMoreOpen = false;

  const isMobile = () =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 767px)").matches;

  function closeSidebar() {
    if (!elements.sidebar) return;
    elements.sidebar.classList.remove("translate-x-0");
    elements.sidebar.classList.add("-translate-x-full");
    if (elements.sidebarOverlay) elements.sidebarOverlay.classList.add("hidden");
  }

  function openSidebar() {
    if (!elements.sidebar) return;
    elements.sidebar.classList.remove("-translate-x-full");
    elements.sidebar.classList.add("translate-x-0");
    if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove("hidden");
  }

  function toggleSidebar() {
    if (!elements.sidebar) return;
    const open = elements.sidebar.classList.contains("translate-x-0");
    if (open) closeSidebar();
    else openSidebar();
  }

  function setMobileMoreOpen(next) {
    mobileMoreOpen = Boolean(next);
    if (!elements.mobileMoreMenu) return;
    elements.mobileMoreMenu.classList.toggle("hidden", !mobileMoreOpen);
  }

  if (elements.sidebarToggleBtn) {
    elements.sidebarToggleBtn.addEventListener("click", () => {
      setMobileMoreOpen(false);
      toggleSidebar();
    });
  }
  if (elements.sidebarOverlay) elements.sidebarOverlay.addEventListener("click", closeSidebar);
  if (typeof window !== "undefined") {
    const mq = window.matchMedia ? window.matchMedia("(min-width: 768px)") : null;
    if (mq) {
      const onChange = () => {
        if (mq.matches) closeSidebar();
        setMobileMoreOpen(false);
      };
      if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
      else if (typeof mq.addListener === "function") mq.addListener(onChange);
    }
  }

  if (elements.mobileMoreBtn) {
    elements.mobileMoreBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSidebar();
      setMobileMoreOpen(!mobileMoreOpen);
    });
  }
  document.addEventListener("click", () => setMobileMoreOpen(false));

  if (elements.chatInput) {
    elements.chatInput.addEventListener("focus", () => {
      setMobileMoreOpen(false);
      if (isMobile()) setTimeout(() => elements.chatInput.scrollIntoView({ block: "end" }), 60);
    });
  }
  if (typeof window !== "undefined" && window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (!isMobile()) return;
      requestAnimationFrame(() => {
        elements.messages.scrollTop = elements.messages.scrollHeight;
      });
    });
  }

  function runPostLoginTransitionIfNeeded() {
    if (typeof sessionStorage === "undefined") return;
    const flag = sessionStorage.getItem("postLoginAnim");
    if (flag !== "1") return;
    sessionStorage.removeItem("postLoginAnim");

    if (isMobile()) openSidebar();
    if (!elements.postLoginOverlay) return;
    elements.postLoginOverlay.classList.remove("hidden");
    elements.postLoginOverlay.classList.remove("opacity-0");

    requestAnimationFrame(() => {
      elements.postLoginOverlay.classList.add("opacity-0");
      setTimeout(() => {
        elements.postLoginOverlay.classList.add("hidden");
      }, 520);
    });
  }

  runPostLoginTransitionIfNeeded();

  function ensureSession(botId) {
    if (!sessions.has(botId)) {
      sessions.set(botId, {
        conversation_id: null,
        file: null,
        messages: [],
        pending: false,
      });
    }
    return sessions.get(botId);
  }

  function setUploadProgress(percent) {
    const pct = Math.max(0, Math.min(100, Number(percent) || 0));
    elements.uploadProgressWrap.classList.remove("hidden");
    elements.uploadProgressBar.style.width = `${pct}%`;
  }

  function clearFileForSession(session) {
    session.file = null;
    if (elements.fileInput) elements.fileInput.value = "";
    if (elements.filePreview) elements.filePreview.classList.add("hidden");
    if (elements.fileNameText) elements.fileNameText.textContent = "";
    if (elements.uploadProgressBar) elements.uploadProgressBar.style.width = "0%";
    if (elements.uploadProgressWrap) elements.uploadProgressWrap.classList.add("hidden");
  }

  function showFileForSession(session) {
    if (!session?.file?.file_id) {
      clearFileForSession(session);
      return;
    }
    elements.fileNameText.textContent = session.file.name || "附件";
    elements.filePreview.classList.remove("hidden");
    elements.uploadProgressWrap.classList.add("hidden");
    elements.uploadProgressBar.style.width = "0%";
  }

  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload", true);

      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return;
        setUploadProgress((e.loaded / e.total) * 100);
      });

      xhr.addEventListener("load", () => {
        const text = xhr.responseText || "";
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
          return;
        }
        const message = data?.message || data?.msg || `上传失败（HTTP ${xhr.status}）`;
        const err = new Error(message);
        err.status = xhr.status;
        err.data = data;
        reject(err);
      });

      xhr.addEventListener("error", () => reject(new Error("上传失败：网络错误")));
      xhr.addEventListener("abort", () => reject(new Error("上传已取消")));

      const fd = new FormData();
      fd.append("file", file, file.name);
      xhr.send(fd);
    });
  }

  function setActiveAgent(botId) {
    activeBotId = botId;
    const agent = agents.find((a) => a.botId === botId);
    elements.activeAgentName.textContent = agent?.name ?? "未选择智能体";
    elements.activeAgentDesc.textContent = agent?.greeting ? agent.greeting.split(/\r?\n/)[0].trim() : "";
    const session = botId ? ensureSession(botId) : null;
    if (session) showFileForSession(session);
    if (session && session.messages.length === 0 && agent?.greeting) {
      session.messages.push({ role: "assistant", content: agent.greeting, ts: Date.now() });
    }
    renderMessages(session?.messages ?? []);

    for (const btn of elements.agentList.querySelectorAll("button[data-bot-id]")) {
      const isActive = btn.getAttribute("data-bot-id") === botId;
      btn.classList.toggle("bg-white/15", isActive);
      btn.classList.toggle("ring-2", isActive);
      btn.classList.toggle("ring-white/60", isActive);
    }
  }

  function renderAgentList() {
    elements.agentList.innerHTML = "";
    for (const agent of agents) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-bot-id", agent.botId);
      btn.className =
        "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/10";

      const icon = document.createElement("img");
      icon.src = agent.iconPath;
      icon.alt = "";
      icon.className = "h-10 w-10 rounded-lg bg-white/15 object-contain p-1";

      const info = document.createElement("div");
      info.className = "min-w-0";
      const name = document.createElement("div");
      name.className = "truncate text-sm font-semibold";
      name.textContent = agent.name;
      const sub = document.createElement("div");
      sub.className = "truncate text-xs text-white/70";
      sub.textContent = agent.greeting ? agent.greeting.split(/\r?\n/)[0].trim() : "";
      info.appendChild(name);
      info.appendChild(sub);

      btn.appendChild(icon);
      btn.appendChild(info);
      btn.addEventListener("click", () => {
        showStatus("", "");
        setActiveAgent(agent.botId);
        elements.chatInput.focus();
        if (isMobile()) closeSidebar();
      });

      elements.agentList.appendChild(btn);
    }
  }

  async function loadConfig() {
    try {
      const config = await fetchJson("/api/config");
      if (!config?.hasToken) {
        elements.tokenHint.textContent =
          "未检测到 COZE_API_TOKEN。请在启动命令前设置环境变量后刷新页面。";
        showStatus("未配置 COZE_API_TOKEN，暂无法调用智能体。", "warn");
        return;
      }
      elements.tokenHint.textContent = "";
    } catch (e) {
      elements.tokenHint.textContent = "";
    }
  }

  async function loadAgents() {
    const data = await fetchJson("/api/agents");
    agents = (data?.agents ?? []).map((a) => ({
      name: a.name,
      botId: a.botId,
      iconPath: a.iconPath,
      greeting: a.greeting,
    }));
    renderAgentList();
    if (agents.length > 0) setActiveAgent(agents[0].botId);
  }

  function getLastMessageContentEl() {
    const wrapper = elements.messages.lastElementChild;
    if (!wrapper) return null;
    const bubble = wrapper.firstElementChild;
    if (!bubble) return null;
    const candidates = bubble.querySelectorAll("div");
    return candidates.length >= 2 ? candidates[candidates.length - 1] : null;
  }

  function stopTypewriter() {
    if (typewriterTimer) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
    typewriterBuffer = "";
    typewriterTargetEl = null;
    typewriterDone = false;
    typewriterRenderedRaw = "";
  }

  function stopTypewriterTimerOnly() {
    if (typewriterTimer) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
    typewriterBuffer = "";
    typewriterTargetEl = null;
    typewriterDone = true;
  }

  function clearStopModeTimer() {
    if (stopModeTimer) {
      clearTimeout(stopModeTimer);
      stopModeTimer = null;
    }
  }

  function setSendButtonMode(mode, disabled) {
    stopModeActive = mode === "stop";
    elements.sendBtn.textContent = stopModeActive ? "停止" : "发送";
    elements.sendBtn.disabled = Boolean(disabled);
  }

  function scheduleStopMode(session) {
    clearStopModeTimer();
    setSendButtonMode("send", true);
    stopModeTimer = setTimeout(() => {
      if (session?.pending) setSendButtonMode("stop", false);
    }, 3000);
  }

  function resetSendButton(session) {
    clearStopModeTimer();
    setSendButtonMode("send", Boolean(session?.pending));
  }

  function stopActiveStream() {
    stopRequested = true;
    typewriterDone = true;
    stopTypewriterTimerOnly();
    if (activeStreamController) {
      activeStreamController.abort();
      activeStreamController = null;
    }
  }

  function startTypewriter(targetEl) {
    typewriterTargetEl = targetEl;
    if (typewriterTimer) return;
    typewriterTimer = setInterval(() => {
      if (!typewriterTargetEl) return;
      if (typewriterBuffer.length === 0) {
        if (typewriterDone) stopTypewriter();
        return;
      }
      const ch = typewriterBuffer.slice(0, 1);
      typewriterBuffer = typewriterBuffer.slice(1);
      typewriterRenderedRaw += ch;
      const rendered = renderAssistantMarkdown(typewriterRenderedRaw);
      if (rendered.mode === "html") typewriterTargetEl.innerHTML = rendered.html;
      else typewriterTargetEl.textContent = rendered.text;
      elements.messages.scrollTop = elements.messages.scrollHeight;
    }, 18);
  }

  function enqueueTypewriter(text) {
    const s = String(text ?? "");
    if (!s) return;
    typewriterBuffer += s;
  }

  function parseSseFrame(frame) {
    const lines = frame.split(/\r?\n/);
    let eventName = "";
    const dataLines = [];
    for (const line of lines) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    const dataStr = dataLines.join("\n").trim();
    if (!dataStr) return null;
    if (dataStr === "[DONE]" || eventName === "done") return { done: true, event: eventName, data: null };
    try {
      const parsed = JSON.parse(dataStr);
      const finalEvent =
        eventName ||
        (typeof parsed?.event === "string" ? parsed.event : "") ||
        (typeof parsed?.data?.event === "string" ? parsed.data.event : "");
      return { done: false, event: finalEvent, data: parsed };
    } catch {
      return null;
    }
  }

  function extractFrameMeta(frame) {
    const obj = frame?.data;
    const conversation_id =
      obj?.data?.conversation_id ??
      obj?.conversation_id ??
      obj?.data?.chat?.conversation_id ??
      obj?.data?.chat_id?.conversation_id ??
      obj?.data?.message?.conversation_id ??
      obj?.message?.conversation_id;
    const chat_id =
      obj?.data?.chat_id ?? obj?.chat_id ?? obj?.data?.id ?? obj?.id ?? obj?.data?.message?.chat_id ?? obj?.message?.chat_id;
    return {
      conversation_id: conversation_id != null ? String(conversation_id) : "",
      chat_id: chat_id != null ? String(chat_id) : "",
    };
  }

  function extractFrameType(frame) {
    const obj = frame?.data;
    const candidates = [
      obj?.type,
      obj?.data?.type,
      obj?.message?.type,
      obj?.data?.message?.type,
      obj?.message?.msg_type,
      obj?.data?.message?.msg_type,
      obj?.message?.message_type,
      obj?.data?.message?.message_type,
      obj?.msg_type,
      obj?.data?.msg_type,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c.trim();
    }
    return "";
  }

  function isJsonLookingText(text) {
    const s = String(text ?? "").trim();
    if (!s) return false;
    return s.startsWith("{") || s.startsWith("[");
  }

  function deepGet(obj, path) {
    let cur = obj;
    for (const key of path) {
      if (cur == null) return undefined;
      cur = cur[key];
    }
    return cur;
  }

  function extractTextFromJsonString(text) {
    const s = String(text ?? "").trim();
    if (!isJsonLookingText(s)) return "";
    if (s.startsWith("{\"msg_type\"") || s.startsWith("{\"message_type\"")) return "";
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        const parts = [];
        for (const item of parsed) {
          if (item && item.type === "text" && typeof item.text === "string") parts.push(item.text);
        }
        return parts.join("");
      }
    } catch {}
    return "";
  }

  function parseWrapperMsgType(content) {
    const s = String(content ?? "").trim();
    if (!s) return "";
    if (s.startsWith("{\"msg_type\"") || s.startsWith("{\"message_type\"")) {
      try {
        const obj = JSON.parse(s);
        return String(obj?.msg_type ?? obj?.message_type ?? "").trim();
      } catch {
        return "unknown_wrapper";
      }
    }
    return "";
  }

  function isAssistantRole(role) {
    if (role === "assistant") return true;
    if (role === 2) return true;
    return false;
  }

  function getFrameRole(obj) {
    return obj?.role ?? obj?.data?.role ?? obj?.message?.role ?? obj?.data?.message?.role;
  }

  function getFrameContent(obj) {
    return obj?.content ?? obj?.data?.content ?? obj?.message?.content ?? obj?.data?.message?.content;
  }

  function extractTextFromObjectString(content) {
    const s = String(content ?? "").trim();
    if (!s) return "";
    if (!isJsonLookingText(s)) return "";
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        const parts = [];
        for (const item of parsed) {
          if (item && item.type === "text" && typeof item.text === "string") parts.push(item.text);
        }
        return parts.join("");
      }
      if (parsed && parsed.type === "text" && typeof parsed.text === "string") return parsed.text;
    } catch {}
    return "";
  }

  function extractAnswerText(frame) {
    if (frame?.event !== "conversation.message.delta") return "";
    const obj = frame?.data;
    if (!obj) return "";
    const role = getFrameRole(obj);
    if (!isAssistantRole(role)) return "";
    const content = getFrameContent(obj);
    if (typeof content !== "string") return "";
    const wrapperType = parseWrapperMsgType(content);
    if (wrapperType) return "";
    const fromObjectString = extractTextFromObjectString(content);
    if (fromObjectString) return fromObjectString;
    const s = content.trim();
    if (!s) return "";
    if (s.startsWith("{\"msg_type\"") || s.startsWith("{\"message_type\"")) return "";
    if (isJsonLookingText(s)) return "";
    return s;
  }

  function updateAssistantBubble(session, assistantIndex, contentEl, text) {
    if (assistantIndex >= 0 && assistantIndex < session.messages.length) {
      session.messages[assistantIndex].content = text;
    }
    if (!contentEl) return;
    const rendered = renderAssistantMarkdown(text);
    if (rendered.mode === "html") contentEl.innerHTML = rendered.html;
    else contentEl.textContent = rendered.text;
  }

  async function sendMessageStream(session, trimmed, assistantIndex) {
    stopTypewriter();
    typewriterDone = false;
    stopRequested = false;
    let answerStarted = false;
    let doneSeen = false;
    let receivedChars = 0;
    let endSeen = false;
    let answerRawText = "";
    let placeholderText = "让我先进行深度思考…";

    const streamController = new AbortController();
    activeStreamController = streamController;
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      signal: streamController.signal,
      body: JSON.stringify({
        bot_id: activeBotId,
        user_id: userId,
        ...(session.conversation_id ? { conversation_id: session.conversation_id } : {}),
        ...(session.file?.file_id ? { file_id: session.file.file_id } : {}),
        message: trimmed,
        stream: true,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      const message = data?.message || data?.msg || `请求失败（HTTP ${resp.status}）`;
      const err = new Error(message);
      err.status = resp.status;
      err.data = data;
      throw err;
    }

    renderMessages(session.messages);
    const contentEl = getLastMessageContentEl();
    const canStreamRender = Boolean(contentEl);
    if (contentEl) {
      updateAssistantBubble(session, assistantIndex, contentEl, placeholderText);
      elements.messages.scrollTop = elements.messages.scrollHeight;
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("浏览器不支持流式响应");

    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        while (true) {
          const idx = buffer.indexOf("\n\n");
          if (idx === -1) break;
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const sse = parseSseFrame(frame);
          if (!sse) continue;
          const obj = sse.data;
          const frameType = extractFrameType(sse);
          const frameContent = obj ? getFrameContent(obj) : "";
          const wrapperMsgType = typeof frameContent === "string" ? parseWrapperMsgType(frameContent) : "";

          if (sse.done || ["conversation.chat.completed", "conversation.chat.failed"].includes(sse.event) || wrapperMsgType === "generate_answer_finish") {
            console.log(`[系统帧] event=${sse.event || "done"} type=${frameType || "-"} msg_type=${wrapperMsgType || "-"}`);
            typewriterDone = true;
            const snapshot = String(answerRawText || typewriterRenderedRaw || "").trim();
            if (snapshot && assistantIndex >= 0 && assistantIndex < session.messages.length) {
              session.messages[assistantIndex].content = snapshot;
              renderMessages(session.messages);
            }
            doneSeen = true;
            endSeen = true;
            break;
          }

          const meta = extractFrameMeta(sse);
          if (meta.conversation_id && /^\d+$/.test(meta.conversation_id)) {
            session.conversation_id = meta.conversation_id;
          }

          const msgType = frameType;
          if (!answerStarted) {
            const nextPlaceholder =
              msgType === "knowledge_recall" || wrapperMsgType === "knowledge_recall"
                ? "让我认真查阅知识库…"
                : msgType === "verbose" || wrapperMsgType
                  ? "让我先进行深度思考…"
                  : "";
            if (nextPlaceholder && nextPlaceholder !== placeholderText) {
              placeholderText = nextPlaceholder;
              updateAssistantBubble(session, assistantIndex, contentEl, placeholderText);
            }
          }

          const answerText = extractAnswerText(sse);
          if (answerText) {
            if (!answerStarted) {
              answerStarted = true;
              placeholderText = "";
              answerRawText = "";
              typewriterRenderedRaw = "";
              if (canStreamRender) {
                contentEl.innerHTML = "";
                startTypewriter(contentEl);
              }
            }
            receivedChars += answerText.length;
            answerRawText += answerText;
            if (canStreamRender) enqueueTypewriter(answerText);
          }
        }

        if (doneSeen) break;
      }
    } catch (e) {
      const isAbort = stopRequested || e?.name === "AbortError";
      if (!isAbort) throw e;
      stopTypewriterTimerOnly();
      const printed = String((canStreamRender ? typewriterRenderedRaw : answerRawText) || "").trim();
      const placeholders = new Set(["让我先进行深度思考…", "让我认真查阅知识库…"]);
      let finalText = printed && !placeholders.has(printed) ? printed : "已停止输出。";
      if (!finalText.endsWith("(用户手动终止)")) finalText = `${finalText}\n(用户手动终止)`;
      if (assistantIndex >= 0 && assistantIndex < session.messages.length) {
        session.messages[assistantIndex].content = finalText;
      }
      renderMessages(session.messages);
      showStatus("已停止输出。", "warn");
      activeStreamController = null;
      return;
    }

    typewriterDone = true;
    if (doneSeen) {
      try {
        await reader.cancel();
      } catch {}
    }

    if (endSeen) await new Promise((r) => setTimeout(r, 2000));

    for (let i = 0; i < 600; i += 1) {
      if (!typewriterTimer) break;
      if (typewriterBuffer.length === 0) break;
      await new Promise((r) => setTimeout(r, 25));
    }

    if (assistantIndex >= 0 && assistantIndex < session.messages.length) {
      const finalText2 = String(answerRawText || "").trim();
      session.messages[assistantIndex].content = finalText2 ? finalText2 : "已收到请求，但未解析到智能体回复，请稍后重试。";
    }
    renderMessages(session.messages);
    if (!String(answerRawText || "").trim() && receivedChars === 0) showStatus("未解析到智能体回复。", "warn");
    activeStreamController = null;
  }

  async function sendMessage(text) {
    const trimmed = sanitizeText(text).trim();
    if (!trimmed) return;
    if (!activeBotId) return;

    const session = ensureSession(activeBotId);
    if (session.pending) return;

    session.messages.push({ role: "user", content: trimmed, ts: Date.now() });
    session.messages.push({ role: "assistant", content: "让我先进行深度思考…", ts: Date.now() });
    const assistantIndex = session.messages.length - 1;
    renderMessages(session.messages);
    elements.chatInput.value = "";
    showStatus("", "");

    session.pending = true;
    elements.chatInput.disabled = true;
    scheduleStopMode(session);
    try {
      await sendMessageStream(session, trimmed, assistantIndex);
      if (session.file?.file_id) clearFileForSession(session);
    } catch (e) {
      const isAbort = stopRequested || e?.name === "AbortError";
      if (isAbort) stopTypewriterTimerOnly();
      else stopTypewriter();
      if (isAbort) {
        const placeholders = new Set(["让我先进行深度思考…", "让我认真查阅知识库…"]);
        const existingRaw = String(session.messages[assistantIndex]?.content || "").trim();
        let existing = existingRaw && !placeholders.has(existingRaw) ? existingRaw : "已停止输出。";
        if (!existing.endsWith("(用户手动终止)")) existing = `${existing}\n(用户手动终止)`;
        session.messages[assistantIndex].content = existing;
        renderMessages(session.messages);
        showStatus("已停止输出。", "warn");
      } else {
        session.messages.push({
          role: "assistant",
          content: `调用失败：${sanitizeText(e?.message || e)}`,
          ts: Date.now(),
        });
        renderMessages(session.messages);
        showStatus(`调用失败：${sanitizeText(e?.message || e)}`, "error");
      }
    } finally {
      session.pending = false;
      activeStreamController = null;
      stopRequested = false;
      resetSendButton(session);
      elements.chatInput.disabled = false;
      elements.chatInput.focus();
    }
  }

  elements.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      elements.chatForm.requestSubmit();
    }
  });

  elements.chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (stopModeActive) {
      stopActiveStream();
      return;
    }
    sendMessage(elements.chatInput.value);
  });

  elements.fileBtn?.addEventListener("click", () => {
    if (!activeBotId) return;
    if (elements.chatInput.disabled) return;
    elements.fileInput?.click();
  });

  elements.fileInput?.addEventListener("change", async (e) => {
    if (!activeBotId) return;
    const session = ensureSession(activeBotId);
    const file = e?.target?.files?.[0];
    if (!file) return;

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      clearFileForSession(session);
      showStatus("文件过大，最大支持 20MB。", "warn");
      return;
    }

    elements.filePreview.classList.remove("hidden");
    elements.fileNameText.textContent = file.name;
    setUploadProgress(0);
    showStatus("文件上传中…", "info");
    elements.sendBtn.disabled = true;
    elements.chatInput.disabled = true;
    elements.fileBtn.disabled = true;

    try {
      const result = await uploadFile(file);
      const fileId = result?.file_id || result?.data?.id || result?.data?.file_id;
      if (!fileId) throw new Error("上传成功但未拿到 file_id");
      session.file = { file_id: String(fileId), name: file.name, size: file.size };
      showFileForSession(session);
      showStatus("文件已上传，可发送消息让智能体读取。", "info");
    } catch (err) {
      clearFileForSession(session);
      showStatus(`文件上传失败：${sanitizeText(err?.message || err)}`, "error");
    } finally {
      elements.sendBtn.disabled = false;
      elements.chatInput.disabled = false;
      elements.fileBtn.disabled = false;
      elements.chatInput.focus();
    }
  });

  elements.removeFileBtn?.addEventListener("click", () => {
    if (!activeBotId) return;
    const session = ensureSession(activeBotId);
    clearFileForSession(session);
    showStatus("已移除附件。", "info");
  });

  function clearChat() {
    if (!activeBotId) return;
    const session = ensureSession(activeBotId);
    session.messages = [];
    showStatus("", "");
    renderMessages(session.messages);
  }

  function downloadChat() {
    if (!activeBotId) return;
    const agent = agents.find((a) => a.botId === activeBotId);
    const session = ensureSession(activeBotId);
    const lines = [];
    lines.push(`可口可乐销售赋能中心 - 对话导出`);
    lines.push(`智能体：${agent?.name ?? ""}`);
    lines.push(`导出时间：${formatTime(Date.now())}`);
    lines.push("");
    for (const msg of session.messages) {
      const who = msg.role === "user" ? "我" : "智能体";
      lines.push(`[${formatTime(msg.ts)}] ${who}: ${sanitizeText(msg.content)}`);
    }
    const nameSafe = (agent?.name ?? "chat").replace(/[\\/:*?"<>|]/g, "_");
    downloadTextFile(`${nameSafe}-${Date.now()}.txt`, lines.join("\n"));
  }

  elements.clearChatBtn.addEventListener("click", clearChat);

  elements.downloadChatBtn.addEventListener("click", downloadChat);

  if (elements.mobileClearChatBtn) {
    elements.mobileClearChatBtn.addEventListener("click", () => {
      setMobileMoreOpen(false);
      clearChat();
    });
  }
  if (elements.mobileDownloadChatBtn) {
    elements.mobileDownloadChatBtn.addEventListener("click", () => {
      setMobileMoreOpen(false);
      downloadChat();
    });
  }

  try {
    await loadConfig();
    await loadAgents();
    showStatus("", "");
  } catch (e) {
    showStatus(`初始化失败：${sanitizeText(e?.message || e)}`, "error");
  }
}

main();
