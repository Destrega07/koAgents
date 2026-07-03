import {
  todayYYYYMMDD,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getByKey,
  listCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  exportBackup,
  importBackup,
  moveLeadToCoopByCopy,
  getModuleData,
  setModuleData,
} from "./storage.js";

const el = {
  navMainLead: document.getElementById("navMainLead"),
  navMainCoop: document.getElementById("navMainCoop"),
  btnExportBackup: document.getElementById("btnExportBackup"),
  btnImportBackup: document.getElementById("btnImportBackup"),
  inputImportFile: document.getElementById("inputImportFile"),
  pageTitle: document.getElementById("pageTitle"),
  pageSubtitle: document.getElementById("pageSubtitle"),
  btnLogout: document.getElementById("btnLogout"),
  subTabs: document.getElementById("subTabs"),
  contentRoot: document.getElementById("contentRoot"),
  toast: document.getElementById("toast"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  modalCancel: document.getElementById("modalCancel"),
  modalOk: document.getElementById("modalOk"),
  floatingCoach: document.getElementById("floatingCoach"),
};

const MAIN = {
  lead: {
    key: "lead",
    title: "潜客开发",
    subtitle: "从潜客到成交：档案 → 线索 → 洞察 → 价值 → 提案",
    type: "潜客",
    modules: [
      { key: "customers", title: "客户档案" },
      { key: "collaborators", title: "合作者档案" },
      { key: "need_leads", title: "需求线索" },
      { key: "need_insight", title: "需求验证与洞察" },
      { key: "value_prop", title: "价值主张创造" },
      { key: "proposal", title: "提案剧本" },
    ],
  },
  coop: {
    key: "coop",
    title: "合作客户管理",
    subtitle: "KA 运维：档案 → 舆情 → 动作预测 → 事实洞察",
    type: "合作客户",
    modules: [
      { key: "customers", title: "客户档案" },
      { key: "collaborators", title: "合作者档案" },
      { key: "ka_sentiment", title: "KA每周舆情监测" },
      { key: "ka_actions", title: "KA关键动作预测与机会洞察" },
      { key: "facts7c", title: "7C事实与洞察库" },
    ],
  },
};

const STATUS_LEAD = ["待提案", "已提案", "已成交", "被拒绝"];
const RELATION_COOP = ["基础供货合作", "JBP合作", "战略合作"];
const RELATION_COLLAB = ["首次接触", "存有戒心", "初步信任", "合作无间", "剑拔弩张", "冷却处理"];

const CUSTOMER_FIELDS_COMMON = [
  { key: "name", label: "客户名称", type: "text" },
  { key: "attribute", label: "客户属性", type: "select", options: ["单体店", "单一城市连锁", "跨城市连锁", "全国连锁"] },
  { key: "storeCount", label: "店数", type: "text" },
  { key: "revenueScale", label: "营收规模（最近一年营收金额）", type: "text" },
  { key: "revenueGrowth", label: "营收增速（最近一年同比增速）", type: "text" },
  { key: "lastUpdatedYmd", label: "最近更新时间（YYYYMMDD）", type: "readonly" },
  { key: "establishedYear", label: "创立年份（YYYY）", type: "text" },
  { key: "registeredCapital", label: "注册资本（从企查查获取）", type: "text" },
  {
    key: "cuisineType",
    label: "餐饮类型",
    type: "select",
    options: ["中式正餐", "西式正餐", "中式快餐", "西式快餐", "火锅", "烧烤", "日料/东南亚菜", "综合性自助餐", "小吃"],
  },
  { key: "region", label: "覆盖区域", type: "multiselect", options: ["华东", "华南", "华中", "华西", "华北"] },
  { key: "storeGrowth", label: "开店增速（最近一年同比增速）", type: "text" },
  { key: "grossMargin", label: "毛利率", type: "text" },
  { key: "netMargin", label: "净利率（仅上市企业，查财报后填写）", type: "text" },
  { key: "avgTicket", label: "平均客单价（美团/点评抽样均值）", type: "text" },
  { key: "turnoverRate", label: "翻台率（门店观察获取）", type: "text" },
  { key: "beverageSelectionRate", label: "饮料点选率（门店观察获取）", type: "text" },
  { key: "selfOperatedRatio", label: "直营店占比", type: "text" },
  { key: "deliveryRatio", label: "外卖占比", type: "text" },
  { key: "financingHistory", label: "融资经历", type: "textarea" },
  { key: "bossName", label: "掌门人（创始人/CEO）", type: "text" },
  { key: "bossSpeechNotes", label: "掌门人发言要点摘录", type: "textarea" },
  { key: "developmentStrategy", label: "发展策略", type: "textarea" },
  { key: "customerPersona", label: "顾客画像（门店观察获取）", type: "textarea" },
  { key: "beverageCategories", label: "在售饮料品类", type: "textarea" },
  { key: "beverageBrands", label: "在售饮料品牌", type: "textarea" },
  { key: "beverageSkuCount", label: "饮料SKU数", type: "text" },
];

const CUSTOMER_FIELDS_COOP_ONLY = [
  { key: "jbpSales", label: "JBP销售额", type: "text" },
  { key: "jbpSalesGrowth", label: "JBP销售增速", type: "text" },
  { key: "koBeverageSelectionRate", label: "KO饮料点选率", type: "text" },
  { key: "koSkuCount", label: "KO SKU数", type: "text" },
];

const COLLAB_USER_FIELDS = [
  { key: "name", label: "姓名", type: "text" },
  { key: "company", label: "公司（需先建客户档案）", type: "companySelect" },
  { key: "position", label: "职位", type: "text" },
  { key: "phone", label: "手机号", type: "text" },
  { key: "email", label: "邮箱", type: "text" },
];

const COLLAB_AI_FIELDS = [
  { key: "personality", label: "性格特征", type: "readonly" },
  { key: "personalityConfidence", label: "置信度（性格特征）", type: "readonly" },
  { key: "commStyle", label: "沟通风格", type: "readonly" },
  { key: "commStyleConfidence", label: "置信度（沟通风格）", type: "readonly" },
  { key: "decisionPreference", label: "决策偏好", type: "readonly" },
  { key: "decisionPreferenceConfidence", label: "置信度（决策偏好）", type: "readonly" },
  { key: "commUpdatedYmd", label: "最后更新时间", type: "readonly" },
  { key: "analysisSamples", label: "累计分析样本数", type: "readonly" },
  { key: "relationChangeHint", label: "关系变化提示", type: "readonly" },
  { key: "commSuggestions", label: "三条沟通建议", type: "readonlyList" },
  { key: "otherNotes", label: "其他提醒", type: "readonly" },
];

const state = {
  mainKey: "lead",
  moduleKey: "customers",
  selectedCustomerId: "",
  customers: [],
  collaborators: [],
  needLeadsDebug: { enabled: false, clickCount: 0, lastClickTime: 0 },
  ui: {
    customerCardMode: new Map(),
    collaboratorCardMode: new Map(),
    collaboratorFiles: new Map(),
    collaboratorLoading: new Map(),
    collaboratorDebugRaw: "",
    collaboratorDraftTimers: new Map(),
    collaboratorDraftStatus: new Map(),
    needInsightDocs: new Map(),
    needInsightDocNames: new Map(),
    needInsightDrafts: new Map(),
    needInsightRaw: new Map(),
    needInsightLoading: false,
    customerFilters: { search: "", statuses: new Set(), relations: new Set() },
    collaboratorFilters: { search: "", sort: "recent", customerIds: [] },
  },
};

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function toast(message) {
  el.toast.textContent = String(message || "");
  if (!el.toast.textContent) return;
  el.toast.style.display = "block";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.toast.style.display = "none";
    el.toast.textContent = "";
  }, 2400);
}

function openModal({ title, body, bodyNode, bodyHtml, okText } = {}) {
  el.modalTitle.textContent = String(title || "确认");
  clearNode(el.modalBody);
  if (bodyNode) {
    el.modalBody.appendChild(bodyNode);
  } else if (typeof bodyHtml === "string") {
    el.modalBody.innerHTML = bodyHtml;
  } else {
    el.modalBody.textContent = String(body || "");
  }
  el.modalOk.textContent = okText ? String(okText) : "确定";
  el.modalBackdrop.style.display = "block";
}

function closeModal() {
  el.modalBackdrop.style.display = "none";
  el.modalTitle.textContent = "";
  clearNode(el.modalBody);
  el.modalOk.textContent = "确定";
}

function confirmModal({ title, body, bodyNode, bodyHtml, okText } = {}) {
  return new Promise((resolve) => {
    openModal({ title, body, bodyNode, bodyHtml, okText });
    const cleanup = () => {
      el.modalCancel.onclick = null;
      el.modalOk.onclick = null;
      el.modalBackdrop.onclick = null;
      closeModal();
    };
    el.modalCancel.onclick = () => {
      cleanup();
      resolve(false);
    };
    el.modalOk.onclick = () => {
      cleanup();
      resolve(true);
    };
    el.modalBackdrop.onclick = (e) => {
      if (e.target === el.modalBackdrop) {
        cleanup();
        resolve(false);
      }
    };
  });
}

function isFilled(value) {
  if (value === 0) return true;
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value !== false;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToSafeHtml(markdown) {
  const src = String(markdown ?? "").replace(/\r\n/g, "\n");
  const codeBlocks = [];
  let text = src.replace(/```([\s\S]*?)```/g, (_m, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapeHtml(String(code ?? "").replace(/^\n/, "").replace(/\n$/, ""))}</code></pre>`);
    return `@@CODEBLOCK_${idx}@@`;
  });

  text = escapeHtml(text);
  text = text.replace(/@@CODEBLOCK_(\d+)@@/g, (_m, n) => codeBlocks[Number(n)] || "");

  const lines = text.split("\n");
  const out = [];
  let i = 0;

  const inline = (s) => {
    let x = String(s ?? "");
    x = x.replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`);
    x = x.replace(/\*\*([^*]+)\*\*/g, (_m, t) => `<strong>${t}</strong>`);
    x = x.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t, u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`);
    return x;
  };

  const consumeList = (startIdx, ordered) => {
    const items = [];
    let j = startIdx;
    while (j < lines.length) {
      const line = lines[j];
      const m = ordered ? line.match(/^\s*\d+\.\s+(.*)$/) : line.match(/^\s*[-*]\s+(.*)$/);
      if (!m) break;
      items.push(`<li>${inline(m[1] || "")}</li>`);
      j += 1;
    }
    return { html: `<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`, next: j };
  };

  const consumeTable = (startIdx) => {
    const rows = [];
    let j = startIdx;
    while (j < lines.length) {
      const line = lines[j];
      if (!/^\s*\|.*\|\s*$/.test(line)) break;
      rows.push(line.trim());
      j += 1;
    }
    if (rows.length < 2) return { html: "", next: startIdx };
    const isSep = (r) => /^\s*\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?\s*$/.test(r);
    if (!isSep(rows[1])) return { html: "", next: startIdx };
    const parseRow = (r) =>
      r
        .replace(/^\s*\|/, "")
        .replace(/\|\s*$/, "")
        .split("|")
        .map((c) => c.trim());
    const header = parseRow(rows[0]);
    const bodyRows = rows.slice(2).map(parseRow);
    const thead = `<thead><tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${bodyRows
      .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>`;
    return { html: `<table>${thead}${tbody}</table>`, next: startIdx + rows.length };
  };

  const consumeParagraph = (startIdx) => {
    const buf = [];
    let j = startIdx;
    while (j < lines.length) {
      const line = lines[j];
      if (!line.trim()) break;
      if (/^\s*#{1,6}\s+/.test(line)) break;
      if (/^\s*[-*]\s+/.test(line)) break;
      if (/^\s*\d+\.\s+/.test(line)) break;
      if (/^\s*\|.*\|\s*$/.test(line)) break;
      if (/^\s*<pre><code>/.test(line)) break;
      buf.push(line.trim());
      j += 1;
    }
    const html = buf.length ? `<p>${inline(buf.join(" "))}</p>` : "";
    return { html, next: j };
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2] || "")}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*<pre><code>/.test(line)) {
      out.push(line);
      i += 1;
      continue;
    }

    const t = consumeTable(i);
    if (t.html) {
      out.push(t.html);
      i = t.next;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const r = consumeList(i, false);
      out.push(r.html);
      i = r.next;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const r = consumeList(i, true);
      out.push(r.html);
      i = r.next;
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr />");
      i += 1;
      continue;
    }

    const p = consumeParagraph(i);
    if (p.html) out.push(p.html);
    i = Math.max(i + 1, p.next);
  }

  return out.join("\n");
}

function renderMarkdown(markdown) {
  const wrap = document.createElement("div");
  wrap.className = "md";
  wrap.innerHTML = markdownToSafeHtml(markdown);
  return wrap;
}

function enhanceNeedLeadsReport(mdRoot) {
  if (!mdRoot) return mdRoot;
  const h3s = Array.from(mdRoot.querySelectorAll("h3"));
  for (const h3 of h3s) {
    const text = String(h3.textContent || "").trim();
    if (text === "积极现实" || text === "挑战现实") {
      const tag = document.createElement("span");
      tag.className = `needles-tag ${text === "积极现实" ? "green" : "red"}`;
      tag.textContent = text;
      h3.replaceWith(tag);
    }
  }

  const children = Array.from(mdRoot.childNodes);
  const frag = document.createDocumentFragment();
  const makeSection = (h2Node, blockNodes) => {
    const section = document.createElement("section");
    section.className = "needles-section";
    const title = document.createElement("div");
    title.className = "needles-section-title";
    const h2 = document.createElement("h2");
    h2.textContent = String(h2Node.textContent || "");
    title.appendChild(h2);
    section.appendChild(title);
    for (const n of blockNodes) section.appendChild(n);
    return section;
  };

  let i = 0;
  while (i < children.length) {
    const node = children[i];
    if (node.nodeType === 1 && node.tagName === "H2") {
      const block = [];
      i += 1;
      while (i < children.length) {
        const next = children[i];
        if (next.nodeType === 1 && next.tagName === "H2") break;
        block.push(next);
        i += 1;
      }
      frag.appendChild(makeSection(node, block));
      continue;
    }
    frag.appendChild(node);
    i += 1;
  }

  mdRoot.replaceChildren(frag);
  return mdRoot;
}

function getOrCreateUserId() {
  const key = "ko_user_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) + "";
  localStorage.setItem(key, id);
  return id;
}

function pruneForCoze(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === 0) out[k] = v;
    else if (typeof v === "string") {
      if (v.trim()) out[k] = v.trim();
    } else if (typeof v === "boolean") {
      if (v !== false) out[k] = v;
    } else if (Array.isArray(v)) {
      const filtered = v.filter((x) => isFilled(x));
      if (filtered.length) out[k] = filtered;
    } else if (v != null && typeof v === "object") {
      const child = pruneForCoze(v);
      if (Object.keys(child).length) out[k] = child;
    } else if (v != null) {
      out[k] = v;
    }
  }
  return out;
}

function extractCozeAssistantText(payload) {
  const list = payload?.messages ?? payload?.data?.messages ?? payload?.data?.message_list;
  const candidates = [];
  if (Array.isArray(list)) {
    for (const m of list) {
      const role = m?.role ?? m?.sender_role ?? m?.from;
      const type = m?.type ?? m?.message_type;
      const content = m?.content ?? m?.text ?? m?.data?.content;
      if (String(role || "") === "assistant" && typeof content === "string") {
        candidates.push({ type: typeof type === "string" ? type : "", content });
      }
    }
  }
  if (candidates.length) {
    const answers = candidates.filter((c) => c.type === "answer" && c.content.trim());
    const pick = answers.length ? answers[answers.length - 1] : candidates[candidates.length - 1];
    return String(pick.content || "");
  }

  const single = payload?.message?.content ?? payload?.data?.message?.content ?? payload?.data?.answer ?? payload?.data?.content;
  return typeof single === "string" ? single : "";
}

async function copyToClipboard(text) {
  const t = String(text ?? "");
  if (!t) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = t;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

async function uploadToCoze(file) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const resp = await fetch("/api/upload", { method: "POST", body: fd });
  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!resp.ok) {
    const msg = data?.message || data?.msg || data?.error || `上传失败（HTTP ${resp.status}）`;
    throw new Error(String(msg));
  }
  const fileId = String(data?.file_id || "").trim();
  if (!fileId) throw new Error("上传成功但未返回 file_id");
  return fileId;
}

async function fetchCozeChatStream(payload) {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const t = await resp.text();
    let j = null;
    try {
      j = t ? JSON.parse(t) : null;
    } catch {
      j = null;
    }
    const msg = j?.message || j?.msg || j?.error || `请求失败（HTTP ${resp.status}）`;
    const err = new Error(String(msg));
    err.raw = t;
    throw err;
  }
  if (!resp.body) {
    const t = await resp.text();
    return { raw: t, lastJson: null };
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let raw = "";
  let buf = "";
  let lastJson = null;
  const dataLines = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    raw += chunk;
    buf += chunk;

    const parts = buf.split(/\n/);
    buf = parts.pop() || "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const dataText = trimmed.slice(5).trim();
      if (!dataText || dataText === "[DONE]") continue;
      dataLines.push(dataText);
      if (dataText.startsWith("{") || dataText.startsWith("[")) {
        try {
          lastJson = JSON.parse(dataText);
        } catch {}
      }
    }
  }

  return { raw, lastJson, dataLines };
}

function parseCommStyleReport(markdown) {
  let text = String(markdown ?? "").replace(/\r\n/g, "\n");
  const today = todayYYYYMMDD();

  const headingRe = /^#\s*.*沟通风格分析报告.*$/gm;
  const hits = [];
  let hm;
  while ((hm = headingRe.exec(text))) hits.push(hm.index);
  if (hits.length >= 2) {
    text = text.slice(hits[0], hits[1]).trim();
  }

  const pick = (label) => {
    const re = new RegExp(String.raw`(?:^|\n)\s*[-*]\s*\*\*${label}\*\*\s*[:：]\s*(.*?)\s*(?=\n|$)`, "i");
    const m = text.match(re);
    return m ? String(m[1] ?? "").trim() : "";
  };

  const parsePercent = (s) => {
    const v = String(s ?? "").trim();
    const m = v.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) return Number(m[1]);
    return v;
  };

  const dateRaw = pick("对话日期");
  const dateMatch = String(dateRaw).match(/(\d{8})/);
  const commUpdatedYmd = dateMatch ? dateMatch[1] : today;

  const personality = pick("性格特征");
  const personalityConfidence = parsePercent(pick("性格置信度"));
  const commStyle = pick("沟通风格");
  const commStyleConfidence = parsePercent(pick("风格置信度"));
  const decisionPreference = pick("决策偏好");
  const decisionPreferenceConfidence = parsePercent(pick("决策置信度"));
  const relationChangeHint = pick("关系变化提示");

  const commSuggestions = [];
  const blockRe =
    /(?:^|\n)\s*(?:[-*]\s*)?(?:\*\*)?\s*建议\s*([一二三1-3])\s*(?:\*\*)?\s*[:：]?\s*\n([\s\S]*?)(?=(?:\n\s*(?:[-*]\s*)?(?:\*\*)?\s*建议\s*[一二三1-3]\s*(?:\*\*)?\s*[:：]?\s*\n)|(?:\n\s*##\s)|(?:\n\s*#\s)|$)/g;
  let m;
  while ((m = blockRe.exec(text))) {
    const body = String(m[2] ?? "").trim();
    if (body) {
      const normalized = body.replace(/\n{3,}/g, "\n\n").trim();
      commSuggestions.push(normalized);
    }
    if (commSuggestions.length >= 9) break;
  }

  if (!commSuggestions.length) {
    const suggestion = (n) => {
      const re = new RegExp(String.raw`(?:^|\n)\s*(?:[-*]\s*)?${n}\.\s*(.*?)\s*(?=\n|$)`, "m");
      const mm = text.match(re);
      return mm ? String(mm[1] ?? "").trim() : "";
    };
    const s1 = suggestion(1);
    const s2 = suggestion(2);
    const s3 = suggestion(3);
    commSuggestions.push(...[s1, s2, s3].filter((x) => String(x || "").trim()));
  }

  const seen = new Set();
  const dedupedSuggestions = [];
  for (const s of commSuggestions) {
    const key = String(s || "").replace(/\s+/g, " ").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedSuggestions.push(s);
    if (dedupedSuggestions.length >= 3) break;
  }

  const otherNotes = pick("其他提醒");

  return {
    commUpdatedYmd,
    personality,
    personalityConfidence,
    commStyle,
    commStyleConfidence,
    decisionPreference,
    decisionPreferenceConfidence,
    relationChangeHint,
    commSuggestions: dedupedSuggestions,
    otherNotes,
  };
}

function extractLikelyMarkdownFromSseData(dataLines) {
  const parts = Array.isArray(dataLines) ? dataLines : [];
  const found = [];

  const pushIf = (s) => {
    const t = String(s || "").trim();
    if (!t) return;
    if (t.includes("沟通风格分析报告") || t.includes("性格特征") || t.includes("三条沟通建议")) found.push(t);
  };

  const walk = (obj) => {
    if (!obj) return;
    if (typeof obj === "string") {
      pushIf(obj);
      return;
    }
    if (Array.isArray(obj)) {
      for (const x of obj) walk(x);
      return;
    }
    if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if (k === "content" && typeof v === "string") pushIf(v);
        walk(v);
      }
    }
  };

  for (const line of parts) {
    if (line.startsWith("{") || line.startsWith("[")) {
      try {
        walk(JSON.parse(line));
      } catch {}
    } else {
      pushIf(line);
    }
  }

  if (!found.length) return "";
  const joined = found.join("\n");
  const idx = joined.indexOf("沟通风格分析报告");
  return idx >= 0 ? joined.slice(idx) : joined;
}

function extractLikelyNeedInsightMarkdownFromSseData(dataLines) {
  const parts = Array.isArray(dataLines) ? dataLines : [];
  const found = [];
  const anchors = ["需求深度洞察", "基础信息", "需求分层分析", "支持需求", "成果需求", "个人需求", "饮料角色", "关键假设", "战略机会"];

  const pushIf = (s) => {
    const t = String(s || "").trim();
    if (!t) return;
    if (anchors.some((a) => t.includes(a))) found.push(t);
  };

  const walk = (obj) => {
    if (!obj) return;
    if (typeof obj === "string") {
      pushIf(obj);
      return;
    }
    if (Array.isArray(obj)) {
      for (const x of obj) walk(x);
      return;
    }
    if (typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if (k === "content" && typeof v === "string") pushIf(v);
        walk(v);
      }
    }
  };

  for (const line of parts) {
    if (line.startsWith("{") || line.startsWith("[")) {
      try {
        walk(JSON.parse(line));
      } catch {}
    } else {
      pushIf(line);
    }
  }

  if (!found.length) return "";
  const joined = found.join("\n");
  const idx = joined.indexOf("需求深度洞察");
  return idx >= 0 ? joined.slice(idx) : joined;
}

function computeCompletenessCustomer(customer) {
  const fields = state.mainKey === "coop" ? [...CUSTOMER_FIELDS_COMMON, ...CUSTOMER_FIELDS_COOP_ONLY] : CUSTOMER_FIELDS_COMMON;
  let filled = 0;
  for (const f of fields) if (isFilled(customer?.[f.key])) filled += 1;
  const total = fields.length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return { filled, total, pct };
}

function computeCompletenessCollaborator(collaborator) {
  const fields = [...COLLAB_USER_FIELDS, ...COLLAB_AI_FIELDS];
  let filled = 0;
  for (const f of fields) if (isFilled(collaborator?.[f.key])) filled += 1;
  const total = fields.length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  return { filled, total, pct };
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const f = file;
    if (!f) return resolve("");
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(f);
  });
}

function parseListItems(block) {
  const src = String(block || "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  const items = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^\s*(?:\d+\.\s+|[-*]\s+)(.+)$/);
    if (m) {
      if (cur) items.push(cur.trim());
      cur = String(m[1] || "").trim();
      continue;
    }
    const t = line.trim();
    if (!t) {
      if (cur) cur += "\n";
      continue;
    }
    if (cur) cur += `\n${t}`;
  }
  if (cur) items.push(cur.trim());
  return items.filter((x) => String(x || "").trim());
}

function sliceNeedInsightMarkdown(markdown) {
  const md = String(markdown || "").replace(/\r\n/g, "\n");
  const pickBlock = (titleRe) => {
    const re = new RegExp(String.raw`(^|\n)###\s*${titleRe}\s*\n([\s\S]*?)(?=(\n###\s)|$)`, "i");
    const m = md.match(re);
    return m ? String(m[2] || "").trim() : "";
  };
  const pickSub = (titleRe) => {
    const re = new RegExp(String.raw`(^|\n)####\s*${titleRe}\s*\n([\s\S]*?)(?=(\n####\s)|(\n###\s)|$)`, "i");
    const m = md.match(re);
    return m ? String(m[2] || "").trim() : "";
  };

  const basicInfo = pickBlock("基础信息");
  const oralNeeds = pickSub("口述需求");
  const supportNeeds = pickSub("支持需求");
  const outcomeNeeds = pickSub("成果需求");
  const personalNeeds = pickSub("个人需求");
  const beverageRole = pickBlock("饮料角色(?:判断)?");
  const keyAssumptions = pickBlock("需要验证的关键假设");
  const strategicOpportunity = pickBlock("战略机会提示");

  const toSlots = (block) => parseListItems(block).map((t) => ({ text: t, checked: false }));

  return {
    blocks: {
      basicInfo,
      oralNeeds,
      beverageRole,
      keyAssumptions,
      strategicOpportunity,
    },
    slots: {
      support: toSlots(supportNeeds),
      outcome: toSlots(outcomeNeeds),
      personal: toSlots(personalNeeds),
    },
  };
}

function renderNeedInsightTextBlock(title, markdown) {
  const wrap = document.createElement("div");
  wrap.className = "needles-report-section";
  const h = document.createElement("div");
  h.className = "needles-section-title";
  h.textContent = title;
  wrap.appendChild(h);
  const body = document.createElement("div");
  body.className = "md-content";
  body.innerHTML = markdownToSafeHtml(String(markdown || ""));
  wrap.appendChild(body);
  return wrap;
}

function renderNeedInsightSlotSection(title, slots) {
  const wrap = document.createElement("div");
  wrap.className = "needles-report-section";
  const h = document.createElement("div");
  h.className = "needles-section-title";
  h.textContent = title;
  wrap.appendChild(h);

  const grid = document.createElement("div");
  grid.className = "slot-grid";
  const list = Array.isArray(slots) ? slots : [];
  for (const slot of list) {
    const card = document.createElement("div");
    card.className = "slot-card";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(slot.checked);
    cb.onchange = () => {
      slot.checked = cb.checked;
    };
    const content = document.createElement("div");
    content.className = "slot-content";
    content.textContent = String(slot.text || "");
    content.onclick = () => {
      if (content.contentEditable !== "true") {
        content.contentEditable = "true";
        content.focus();
      }
    };
    content.ondblclick = () => {
      content.contentEditable = "true";
      content.focus();
    };
    content.onblur = () => {
      content.contentEditable = "false";
      slot.text = String(content.textContent || "").trim();
    };
    card.appendChild(cb);
    card.appendChild(content);
    grid.appendChild(card);
  }
  if (!grid.childNodes.length) {
    const empty = document.createElement("div");
    empty.className = "value";
    empty.textContent = "—";
    grid.appendChild(empty);
  }
  wrap.appendChild(grid);
  return wrap;
}

function setHashFromState() {
  const h = `#${encodeURIComponent(state.mainKey)}/${encodeURIComponent(state.moduleKey)}`;
  if (location.hash !== h) location.hash = h;
}

function parseHash() {
  const raw = String(location.hash || "").replace(/^#/, "");
  const [m, mod] = raw.split("/").map((s) => decodeURIComponent(s || ""));
  state.mainKey = m === "coop" ? "coop" : "lead";
  const allowed = new Set(MAIN[state.mainKey].modules.map((x) => x.key));
  state.moduleKey = allowed.has(mod) ? mod : MAIN[state.mainKey].modules[0].key;
}

function setNavCurrent() {
  el.navMainLead.setAttribute("aria-current", state.mainKey === "lead" ? "page" : "false");
  el.navMainCoop.setAttribute("aria-current", state.mainKey === "coop" ? "page" : "false");
  el.pageTitle.textContent = MAIN[state.mainKey].title;
  el.pageSubtitle.textContent = MAIN[state.mainKey].subtitle;
  el.pageTitle.dataset.debug = state.needLeadsDebug.enabled ? "1" : "0";
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function icon(svgPathD) {
  const wrap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrap.setAttribute("viewBox", "0 0 24 24");
  wrap.setAttribute("width", "18");
  wrap.setAttribute("height", "18");
  wrap.setAttribute("fill", "none");
  wrap.setAttribute("stroke", "currentColor");
  wrap.setAttribute("stroke-width", "2");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", svgPathD);
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  wrap.appendChild(p);
  return wrap;
}

function makeIconBtn({ title, onClick, disabled, iconPath }) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "iconbtn";
  b.title = title;
  if (disabled) b.disabled = true;
  b.appendChild(icon(iconPath));
  b.onclick = (e) => {
    e.stopPropagation();
    onClick();
  };
  return b;
}

function formatConfidenceInline(confValue) {
  if (confValue == null || confValue === "") return "";
  if (typeof confValue === "number" && Number.isFinite(confValue)) return `${confValue}%`;
  const s = String(confValue).trim();
  if (!s) return "";
  return s;
}

function makeInlineValueWithConfidence(text, confidenceText) {
  const wrap = document.createElement("div");
  wrap.className = "value";
  const main = document.createElement("span");
  main.textContent = text && String(text).trim() ? String(text) : "—";
  wrap.appendChild(main);
  const conf = formatConfidenceInline(confidenceText);
  if (conf) {
    const meta = document.createElement("span");
    meta.className = "inline-confidence";
    meta.textContent = `(置信度: ${conf})`;
    wrap.appendChild(meta);
  }
  return wrap;
}

function renderSuggestionCards(list) {
  const items = Array.isArray(list) ? list : [];
  const wrap = document.createElement("div");
  wrap.className = "suggestion-cards";
  const fmt = (t) => {
    const safe = escapeHtml(String(t || ""));
    return safe
      .replace(/【适用场景】/g, "<span class=\"tag\">【适用场景】</span>")
      .replace(/【策略】/g, "<span class=\"tag\">【策略】</span>")
      .replace(/【沟通策略】/g, "<span class=\"tag\">【沟通策略】</span>")
      .replace(/【话术示例】/g, "<span class=\"tag\">【话术示例】</span>")
      .replace(/\n+/g, "<br/>");
  };

  for (let i = 0; i < Math.min(items.length, 3); i += 1) {
    const card = document.createElement("div");
    card.className = "suggestion-card";
    card.innerHTML = fmt(items[i]);
    wrap.appendChild(card);
  }
  if (!wrap.childNodes.length) {
    const empty = document.createElement("div");
    empty.className = "value";
    empty.textContent = "—";
    wrap.appendChild(empty);
  }
  return wrap;
}

function progressRing(pct) {
  const size = 54;
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  const wrap = document.createElement("div");
  wrap.className = "progress-ring";
  wrap.style.position = "relative";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.innerHTML = `
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="#e5e7eb" stroke-width="6" fill="none"></circle>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="#f40009" stroke-width="6" fill="none"
      stroke-dasharray="${c.toFixed(2)}"
      stroke-dashoffset="${offset.toFixed(2)}"
      stroke-linecap="round"
    ></circle>
  `;
  const label = document.createElement("div");
  label.className = "pct";
  label.textContent = `${pct}%`;
  wrap.appendChild(svg);
  wrap.appendChild(label);
  return wrap;
}

function renderTabs() {
  clearNode(el.subTabs);
  for (const m of MAIN[state.mainKey].modules) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab";
    b.textContent = m.title;
    b.setAttribute("aria-selected", m.key === state.moduleKey ? "true" : "false");
    b.onclick = () => {
      state.moduleKey = m.key;
      if (m.key === "collaborators") state.ui.collaboratorFilters.customerIds = [];
      setHashFromState();
      refresh();
    };
    el.subTabs.appendChild(b);
  }
}

function renderPanelHeader({ title, tools } = {}) {
  const panel = document.createElement("div");
  panel.className = "panel";
  const header = document.createElement("div");
  header.className = "panel-header";
  const t = document.createElement("div");
  t.className = "panel-title";
  t.textContent = String(title || "");
  const toolWrap = document.createElement("div");
  toolWrap.className = "panel-tools";
  if (tools) toolWrap.appendChild(tools);
  header.appendChild(t);
  header.appendChild(toolWrap);
  panel.appendChild(header);
  return { panel, header, toolWrap };
}

function renderMarkdownPlaceholder(text) {
  const pre = document.createElement("pre");
  pre.style.margin = "0";
  pre.style.padding = "14px 16px";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.lineHeight = "1.6";
  pre.textContent = String(text || "");
  return pre;
}

function customerModuleTitle() {
  return `${MAIN[state.mainKey].title} · 客户档案`;
}

function collaboratorModuleTitle() {
  return `${MAIN[state.mainKey].title} · 合作者档案`;
}

function formatCustomerMeta(customer) {
  const parts = [];
  if (customer.attribute) parts.push(`属性：${customer.attribute}`);
  if (isFilled(customer.storeCount)) parts.push(`店数：${customer.storeCount}`);
  if (isFilled(customer.revenueScale)) parts.push(`营收：${customer.revenueScale}`);
  if (isFilled(customer.revenueGrowth)) parts.push(`增速：${customer.revenueGrowth}`);
  if (customer.lastUpdatedYmd) parts.push(`更新时间：${customer.lastUpdatedYmd}`);
  return parts.join(" · ");
}

function renderCustomerTools() {
  const wrap = document.createElement("div");
  wrap.className = "panel-tools";

  const search = document.createElement("input");
  search.className = "input";
  search.placeholder = "搜索客户名称…";
  search.value = state.ui.customerFilters.search;
  search.oninput = () => {
    state.ui.customerFilters.search = String(search.value || "");
    refresh();
  };
  wrap.appendChild(search);

  const filters = document.createElement("div");
  filters.className = "row";
  const options = state.mainKey === "lead" ? STATUS_LEAD : RELATION_COOP;
  for (const opt of options) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = opt;
    const set = state.mainKey === "lead" ? state.ui.customerFilters.statuses : state.ui.customerFilters.relations;
    chip.setAttribute("aria-pressed", set.has(opt) ? "true" : "false");
    chip.onclick = () => {
      if (set.has(opt)) set.delete(opt);
      else set.add(opt);
      refresh();
    };
    filters.appendChild(chip);
  }
  wrap.appendChild(filters);

  const add = document.createElement("button");
  add.type = "button";
  add.className = "btn btn-primary";
  add.textContent = "新建档案";
  add.onclick = async () => {
    const c = await createCustomer({
      type: MAIN[state.mainKey].type,
      name: "未命名客户",
      lastUpdatedYmd: todayYYYYMMDD(),
      status: "待提案",
      relationType: MAIN[state.mainKey].type === "合作客户" ? "基础供货合作" : "",
    });
    state.ui.customerCardMode.set(c.id, "edit");
    state.selectedCustomerId = c.id;
    await loadData();
    refresh();
    toast("已新建客户档案");
  };
  wrap.appendChild(add);
  return wrap;
}

function renderCollaboratorTools(customers) {
  const wrap = document.createElement("div");
  wrap.className = "panel-tools";

  const search = document.createElement("input");
  search.className = "input";
  search.placeholder = "搜索姓名/公司/客户…";
  search.value = state.ui.collaboratorFilters.search;
  search.oninput = () => {
    state.ui.collaboratorFilters.search = String(search.value || "");
    refresh();
  };
  wrap.appendChild(search);

  const sort = document.createElement("select");
  sort.className = "select";
  sort.innerHTML = `<option value="recent">最近更新</option><option value="alpha">姓名首字母</option>`;
  sort.value = state.ui.collaboratorFilters.sort;
  sort.onchange = () => {
    state.ui.collaboratorFilters.sort = String(sort.value || "recent");
    refresh();
  };
  wrap.appendChild(sort);

  const filterBtn = document.createElement("button");
  filterBtn.type = "button";
  filterBtn.className = "btn";
  const selectedIds = Array.isArray(state.ui.collaboratorFilters.customerIds)
    ? state.ui.collaboratorFilters.customerIds
    : [];
  if (!selectedIds.length) filterBtn.textContent = "全部客户";
  else if (selectedIds.length === 1) {
    const one = customers.find((c) => c.id === selectedIds[0]);
    filterBtn.textContent = one ? one.name || "已选客户" : "已选 1 个客户";
  } else {
    filterBtn.textContent = `已选 ${selectedIds.length} 个客户`;
  }
  filterBtn.onclick = async () => {
    const current = new Set(
      Array.isArray(state.ui.collaboratorFilters.customerIds) ? state.ui.collaboratorFilters.customerIds : [],
    );
    const bodyNode = document.createElement("div");
    bodyNode.style.display = "grid";
    bodyNode.style.gap = "10px";

    const allRow = document.createElement("label");
    allRow.style.display = "flex";
    allRow.style.alignItems = "center";
    allRow.style.gap = "10px";
    const allCb = document.createElement("input");
    allCb.type = "checkbox";
    allCb.checked = current.size === 0;
    const allText = document.createElement("div");
    allText.textContent = "全部客户";
    allRow.appendChild(allCb);
    allRow.appendChild(allText);
    bodyNode.appendChild(allRow);

    const listWrap = document.createElement("div");
    listWrap.style.display = "grid";
    listWrap.style.gap = "8px";

    const rows = [];
    for (const c of customers) {
      const row = document.createElement("label");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = current.has(c.id);
      const txt = document.createElement("div");
      txt.textContent = c.name || "未命名客户";
      row.appendChild(cb);
      row.appendChild(txt);
      cb.onchange = () => {
        if (cb.checked) current.add(c.id);
        else current.delete(c.id);
        allCb.checked = current.size === 0;
      };
      rows.push({ cb, id: c.id });
      listWrap.appendChild(row);
    }
    bodyNode.appendChild(listWrap);

    allCb.onchange = () => {
      if (allCb.checked) {
        current.clear();
        for (const r of rows) r.cb.checked = false;
      }
    };

    const ok = await confirmModal({ title: "筛选客户（支持复选）", bodyNode, okText: "应用" });
    if (!ok) return;
    state.ui.collaboratorFilters.customerIds = Array.from(current);
    refresh();
  };
  wrap.appendChild(filterBtn);

  const add = document.createElement("button");
  add.type = "button";
  add.className = "btn btn-primary";
  add.textContent = "新建档案";
  add.onclick = async () => {
    const firstCustomer = customers && customers.length ? customers[0] : null;
    if (!firstCustomer) {
      toast("请先新建客户档案，再新建合作者档案");
      return;
    }
    const cid = state.selectedCustomerId || firstCustomer.id;
    const cust = customers.find((c) => c.id === cid) || firstCustomer;
    const col = await createCollaborator({
      customerId: cid,
      relationStatus: "首次接触",
      name: "未命名合作者",
      company: cust.name || "",
      position: "",
    });
    state.ui.collaboratorCardMode.set(col.id, "edit");
    await loadData();
    refresh();
    toast("已新建合作者档案");
  };
  wrap.appendChild(add);
  return wrap;
}

function renderCustomerCard(customer) {
  const mode = state.ui.customerCardMode.get(customer.id) || "collapsed";
  const card = document.createElement("div");
  card.className = "card";

  const top = document.createElement("div");
  top.className = "card-top";
  const left = document.createElement("div");
  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = customer.name || "未命名客户";
  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.textContent = formatCustomerMeta(customer);
  left.appendChild(title);
  left.appendChild(meta);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "10px";
  right.appendChild(progressRing(computeCompletenessCustomer(customer).pct));

  const iconbar = document.createElement("div");
  iconbar.className = "iconbar";
  iconbar.appendChild(
    makeIconBtn({
      title: "折叠",
      iconPath: "M7 14l5-5 5 5",
      onClick: () => {
        state.ui.customerCardMode.set(customer.id, "collapsed");
        refresh();
      },
    }),
  );
  iconbar.appendChild(
    makeIconBtn({
      title: "展开",
      iconPath: "M7 10l5 5 5-5",
      onClick: () => {
        state.ui.customerCardMode.set(customer.id, "expanded");
        state.selectedCustomerId = customer.id;
        refresh();
      },
    }),
  );
  iconbar.appendChild(
    makeIconBtn({
      title: "编辑",
      iconPath: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5 M15 5l4 4",
      onClick: () => {
        state.ui.customerCardMode.set(customer.id, "edit");
        state.selectedCustomerId = customer.id;
        refresh();
      },
    }),
  );

  const canMove = state.mainKey === "lead" && customer.status === "已成交";
  iconbar.appendChild(
    makeIconBtn({
      title: "移至合作客户主页",
      iconPath: "M14 3h7v7M21 3l-9 9",
      disabled: !canMove,
      onClick: async () => {
        const ok = await confirmModal({
          title: "移至合作客户主页",
          body: "将复制该客户及其合作者档案到“合作客户管理”，并在潜客页隐藏该客户。是否继续？",
          okText: "继续",
        });
        if (!ok) return;
        const res = await moveLeadToCoopByCopy(customer.id);
        if (!res) return toast("移动失败：仅支持潜客且状态为“已成交”");
        await loadData();
        refresh();
        toast(`已复制到合作客户（合作者复制 ${res.collaboratorsCopied} 条）`);
      },
    }),
  );

  iconbar.appendChild(
    makeIconBtn({
      title: "删除",
      iconPath: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
      onClick: async () => {
        const ok = await confirmModal({ title: "删除客户档案", body: "删除后不可恢复，是否继续？", okText: "删除" });
        if (!ok) return;
        await deleteCustomer(customer.id);
        state.ui.customerCardMode.delete(customer.id);
        if (state.selectedCustomerId === customer.id) state.selectedCustomerId = "";
        await loadData();
        refresh();
        toast("已删除客户档案");
      },
    }),
  );

  right.appendChild(iconbar);
  top.appendChild(left);
  top.appendChild(right);
  card.appendChild(top);

  const statusRow = document.createElement("div");
  statusRow.className = "row";
  statusRow.style.padding = "0 12px 12px";
  statusRow.style.borderTop = "1px solid var(--border)";
  statusRow.style.marginTop = "-1px";

  if (state.mainKey === "lead") {
    for (const s of STATUS_LEAD) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip-mini";
      chip.textContent = s;
      chip.setAttribute("aria-pressed", customer.status === s ? "true" : "false");
      chip.onclick = async () => {
        await updateCustomer(customer.id, { status: s, lastUpdatedYmd: todayYYYYMMDD() });
        await loadData();
        refresh();
      };
      statusRow.appendChild(chip);
    }
  } else {
    for (const r of RELATION_COOP) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip-mini";
      chip.textContent = r;
      chip.setAttribute("aria-pressed", customer.relationType === r ? "true" : "false");
      chip.onclick = async () => {
        await updateCustomer(customer.id, { relationType: r, lastUpdatedYmd: todayYYYYMMDD() });
        await loadData();
        refresh();
      };
      statusRow.appendChild(chip);
    }
  }

  const nextWrap = document.createElement("div");
  nextWrap.className = "row";
  nextWrap.style.marginLeft = "auto";
  const nextLabel = document.createElement("span");
  nextLabel.style.color = "var(--muted)";
  nextLabel.style.fontSize = "12px";
  nextLabel.textContent = "下一步处理";
  nextWrap.appendChild(nextLabel);
  const nextSelect = document.createElement("select");
  nextSelect.className = "select";
  nextSelect.style.minWidth = "200px";
  nextSelect.innerHTML = `
    <option value="customers">客户档案</option>
    <option value="collaborators">合作者档案</option>
    <option value="need_leads">需求线索</option>
    <option value="need_insight">需求验证与洞察</option>
    <option value="value_prop">价值主张创造</option>
    <option value="proposal">提案剧本</option>
  `;
  nextWrap.appendChild(nextSelect);
  const go = document.createElement("button");
  go.type = "button";
  go.className = "btn btn-primary";
  go.textContent = "Go";
  go.onclick = () => {
    state.selectedCustomerId = customer.id;
    state.moduleKey = String(nextSelect.value || "customers");
    if (state.moduleKey === "collaborators") state.ui.collaboratorFilters.customerIds = [customer.id];
    setHashFromState();
    refresh();
  };
  nextWrap.appendChild(go);
  statusRow.appendChild(nextWrap);
  card.appendChild(statusRow);

  if (mode === "collapsed") return card;

  const body = document.createElement("div");
  body.className = "card-body";
  const fields = state.mainKey === "coop" ? [...CUSTOMER_FIELDS_COMMON, ...CUSTOMER_FIELDS_COOP_ONLY] : CUSTOMER_FIELDS_COMMON;

  if (mode === "expanded") {
    for (const f of fields) {
      if (f.key === "lastUpdatedYmd") continue;
      const row = document.createElement("div");
      row.className = "kv";
      const lab = document.createElement("label");
      lab.textContent = f.label;
      const val = document.createElement("div");
      val.className = "value";
      const v = customer[f.key];
      val.textContent = isFilled(v) ? String(Array.isArray(v) ? v.join("、") : v) : "—";
      row.appendChild(lab);
      row.appendChild(val);
      body.appendChild(row);
    }
    card.appendChild(body);
    return card;
  }

  const editTools = document.createElement("div");
  editTools.className = "row";
  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "btn";
  importBtn.textContent = "导入资料";
  importBtn.onclick = () => toast("已预留：导入资料 → 发送给 Coze 智能体解析");
  const parseBtn = document.createElement("button");
  parseBtn.type = "button";
  parseBtn.className = "btn btn-primary";
  parseBtn.textContent = "解析";
  parseBtn.onclick = () => toast("已预留：解析 → 调用 <客户信息狙击手>");
  editTools.appendChild(importBtn);
  editTools.appendChild(parseBtn);
  body.appendChild(editTools);

  const inputs = new Map();
  for (const f of fields) {
    const row = document.createElement("div");
    row.className = "kv";
    const lab = document.createElement("label");
    lab.textContent = f.label;
    const cell = document.createElement("div");
    if (f.type === "readonly") {
      const v = document.createElement("div");
      v.className = "value";
      v.textContent = customer.lastUpdatedYmd || todayYYYYMMDD();
      cell.appendChild(v);
    } else if (f.type === "select") {
      const sel = document.createElement("select");
      sel.innerHTML = `<option value=""></option>${(f.options || []).map((o) => `<option value="${o}">${o}</option>`).join("")}`;
      sel.value = String(customer[f.key] || "");
      inputs.set(f.key, sel);
      cell.appendChild(sel);
    } else if (f.type === "multiselect") {
      const sel = document.createElement("select");
      sel.multiple = true;
      sel.size = Math.min(5, Math.max(3, (f.options || []).length));
      sel.innerHTML = `${(f.options || []).map((o) => `<option value="${o}">${o}</option>`).join("")}`;
      const current = customer[f.key];
      const selected = new Set(Array.isArray(current) ? current : current ? [String(current)] : []);
      for (const opt of Array.from(sel.options)) opt.selected = selected.has(opt.value);
      inputs.set(f.key, sel);
      cell.appendChild(sel);
    } else if (f.type === "textarea") {
      const ta = document.createElement("textarea");
      ta.value = String(customer[f.key] || "");
      inputs.set(f.key, ta);
      cell.appendChild(ta);
    } else {
      const input = document.createElement("input");
      input.value = customer[f.key] == null ? "" : String(customer[f.key]);
      inputs.set(f.key, input);
      cell.appendChild(input);
    }
    row.appendChild(lab);
    row.appendChild(cell);
    body.appendChild(row);
  }

  const saveRow = document.createElement("div");
  saveRow.className = "row";
  saveRow.style.justifyContent = "flex-end";
  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn btn-primary";
  save.textContent = "保存";
  save.onclick = async () => {
    const patch = {};
    for (const [k, input] of inputs.entries()) {
      if (input instanceof HTMLSelectElement && input.multiple) patch[k] = Array.from(input.selectedOptions).map((o) => o.value);
      else patch[k] = input.value;
    }
    patch.lastUpdatedYmd = todayYYYYMMDD();
    await updateCustomer(customer.id, patch);
    state.ui.customerCardMode.set(customer.id, "expanded");
    await loadData();
    refresh();
    toast("已保存客户档案");
  };
  saveRow.appendChild(save);
  body.appendChild(saveRow);

  card.appendChild(body);
  return card;
}

function renderCustomersModule() {
  const { search, statuses, relations } = state.ui.customerFilters;
  const q = String(search || "").trim().toLowerCase();
  const list = state.customers.filter((c) => {
    if (!c) return false;
    if (q && !String(c.name || "").toLowerCase().includes(q)) return false;
    if (state.mainKey === "lead" && statuses.size && !statuses.has(String(c.status || ""))) return false;
    if (state.mainKey === "coop" && relations.size && !relations.has(String(c.relationType || ""))) return false;
    return true;
  });
  const { panel } = renderPanelHeader({ title: customerModuleTitle(), tools: renderCustomerTools() });
  const grid = document.createElement("div");
  grid.className = "grid grid-customers";
  for (const c of list) grid.appendChild(renderCustomerCard(c));
  panel.appendChild(grid);
  return panel;
}

function scheduleCollaboratorDraftSave(collaboratorId, getPatch, opts = {}) {
  const id = String(collaboratorId || "");
  if (!id) return;
  const prev = state.ui.collaboratorDraftTimers.get(id);
  if (prev) clearTimeout(prev);
  const applyTarget = opts && typeof opts === "object" ? opts.applyTarget : null;
  const onStatus = opts && typeof opts === "object" ? opts.onStatus : null;
  const setStatus = (s) => {
    const text = String(s || "");
    state.ui.collaboratorDraftStatus.set(id, text);
    if (typeof onStatus === "function") onStatus(text);
  };
  setStatus("正在保存…");
  const timer = setTimeout(async () => {
    try {
      const patch = typeof getPatch === "function" ? getPatch() : null;
      if (!patch || typeof patch !== "object") return;
      await updateCollaborator(id, patch);
      if (applyTarget && typeof applyTarget === "object") Object.assign(applyTarget, patch);
      setStatus("已保存");
    } catch {}
  }, 350);
  state.ui.collaboratorDraftTimers.set(id, timer);
}

function renderCollaboratorCard(collaborator, customersById, companyOptions) {
  const mode = state.ui.collaboratorCardMode.get(collaborator.id) || "collapsed";
  const card = document.createElement("div");
  card.className = "card";

  const top = document.createElement("div");
  top.className = "card-top";
  const left = document.createElement("div");
  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = collaborator.name || "未命名合作者";
  const meta = document.createElement("div");
  meta.className = "card-meta";
  const cust = customersById.get(String(collaborator.customerId || ""));
  const pieces = [];
  if (cust && cust.name) pieces.push(`客户：${cust.name}`);
  if (collaborator.position) pieces.push(`职位：${collaborator.position}`);
  if (collaborator.commUpdatedYmd) pieces.push(`沟通更新：${collaborator.commUpdatedYmd}`);
  meta.textContent = pieces.join(" · ");
  left.appendChild(title);
  left.appendChild(meta);

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.alignItems = "center";
  right.style.gap = "10px";
  right.appendChild(progressRing(computeCompletenessCollaborator(collaborator).pct));

  const iconbar = document.createElement("div");
  iconbar.className = "iconbar";
  iconbar.appendChild(
    makeIconBtn({
      title: "折叠",
      iconPath: "M7 14l5-5 5 5",
      onClick: () => {
        state.ui.collaboratorCardMode.set(collaborator.id, "collapsed");
        refresh();
      },
    }),
  );
  iconbar.appendChild(
    makeIconBtn({
      title: "展开",
      iconPath: "M7 10l5 5 5-5",
      onClick: () => {
        state.ui.collaboratorCardMode.set(collaborator.id, "expanded");
        refresh();
      },
    }),
  );
  iconbar.appendChild(
    makeIconBtn({
      title: "编辑",
      iconPath: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5 M15 5l4 4",
      onClick: () => {
        state.ui.collaboratorCardMode.set(collaborator.id, "edit");
        refresh();
      },
    }),
  );
  iconbar.appendChild(
    makeIconBtn({
      title: "删除",
      iconPath: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
      onClick: async () => {
        const ok = await confirmModal({ title: "删除合作者档案", body: "删除后不可恢复，是否继续？", okText: "删除" });
        if (!ok) return;
        await deleteCollaborator(collaborator.id);
        state.ui.collaboratorCardMode.delete(collaborator.id);
        await loadData();
        refresh();
        toast("已删除合作者档案");
      },
    }),
  );
  right.appendChild(iconbar);

  top.appendChild(left);
  top.appendChild(right);
  card.appendChild(top);

  const relRow = document.createElement("div");
  relRow.className = "row";
  relRow.style.padding = "0 12px 12px";
  relRow.style.borderTop = "1px solid var(--border)";
  relRow.style.marginTop = "-1px";
  for (const r of RELATION_COLLAB) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip-mini";
    chip.textContent = r;
    chip.setAttribute("aria-pressed", collaborator.relationStatus === r ? "true" : "false");
    chip.onclick = async () => {
      await updateCollaborator(collaborator.id, { relationStatus: r });
      await loadData();
      refresh();
    };
    relRow.appendChild(chip);
  }
  card.appendChild(relRow);

  if (mode === "collapsed") return card;

  const body = document.createElement("div");
  body.className = "card-body";

  if (mode === "expanded") {
    for (const f of [...COLLAB_USER_FIELDS, ...COLLAB_AI_FIELDS]) {
      if (f.key === "personalityConfidence") continue;
      if (f.key === "commStyleConfidence") continue;
      if (f.key === "decisionPreferenceConfidence") continue;
      const row = document.createElement("div");
      row.className = "kv";
      const lab = document.createElement("label");
      lab.textContent = f.label;
      const v = collaborator[f.key];
      let val;
      if (f.key === "personality") {
        val = makeInlineValueWithConfidence(v, collaborator.personalityConfidence);
      } else if (f.key === "commStyle") {
        val = makeInlineValueWithConfidence(v, collaborator.commStyleConfidence);
      } else if (f.key === "decisionPreference") {
        val = makeInlineValueWithConfidence(v, collaborator.decisionPreferenceConfidence);
      } else if (f.key === "commSuggestions") {
        val = renderSuggestionCards(Array.isArray(v) ? v : []);
      } else {
        val = document.createElement("div");
        val.className = "value";
        if (f.type === "readonlyList") val.textContent = Array.isArray(v) && v.length ? v.join("\n") : "—";
        else val.textContent = isFilled(v) ? String(v) : "—";
      }
      row.appendChild(lab);
      row.appendChild(val);
      body.appendChild(row);
    }
    card.appendChild(body);
    return card;
  }

  const editTools = document.createElement("div");
  editTools.className = "row";
  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "btn";
  uploadBtn.textContent = "上传对话文档";
  const draftStatus = document.createElement("span");
  draftStatus.className = "draft-status";
  draftStatus.textContent = state.ui.collaboratorDraftStatus.get(collaborator.id) || "";
  const setDraftStatus = (t) => {
    draftStatus.textContent = String(t || "");
  };
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "text/plain,.txt";
  fileInput.hidden = true;
  fileInput.onchange = () => {
    (async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      await saveDraftNow();
      state.ui.collaboratorFiles.set(collaborator.id, file);
      toast(`已选择文件：${file.name}`);
      refresh();
    })();
  };
  uploadBtn.onclick = () => {
    (async () => {
      await saveDraftNow();
      fileInput.click();
    })();
  };
  const parseBtn = document.createElement("button");
  parseBtn.type = "button";
  parseBtn.className = "btn btn-primary";
  parseBtn.textContent = "解析";
  editTools.appendChild(uploadBtn);
  editTools.appendChild(parseBtn);
  editTools.appendChild(draftStatus);
  editTools.appendChild(fileInput);
  body.appendChild(editTools);

  const picked = state.ui.collaboratorFiles.get(collaborator.id);
  const loadingText = state.ui.collaboratorLoading.get(collaborator.id);
  if (loadingText) {
    const loading = document.createElement("div");
    loading.className = "ai-loading";
    const spinner = document.createElement("div");
    spinner.className = "ai-spinner";
    const t = document.createElement("div");
    t.className = "ai-loading-text";
    t.textContent = loadingText;
    loading.appendChild(spinner);
    loading.appendChild(t);
    body.appendChild(loading);
  } else if (picked) {
    const hint = document.createElement("div");
    hint.className = "ai-filehint";
    hint.textContent = `已选择：${picked.name}`;
    body.appendChild(hint);
  }

  const inputs = new Map();
  function getUserPatch() {
    const patch = {
      name: String(inputs.get("name")?.value ?? ""),
      company: String(inputs.get("company")?.value ?? ""),
      position: String(inputs.get("position")?.value ?? ""),
      phone: String(inputs.get("phone")?.value ?? ""),
      email: String(inputs.get("email")?.value ?? ""),
    };
    const companyName = String(patch.company || "");
    const mappedCustomerId =
      [...customersById.values()].find((c) => c && c.name === companyName)?.id || collaborator.customerId;
    patch.customerId = String(mappedCustomerId || "");
    return patch;
  }

  async function saveDraftNow() {
    const patch = getUserPatch();
    state.ui.collaboratorDraftStatus.set(collaborator.id, "正在保存…");
    setDraftStatus("正在保存…");
    try {
      await updateCollaborator(collaborator.id, patch);
      Object.assign(collaborator, patch);
      state.ui.collaboratorDraftStatus.set(collaborator.id, "已保存");
      setDraftStatus("已保存");
    } catch {
      state.ui.collaboratorDraftStatus.set(collaborator.id, "保存失败");
      setDraftStatus("保存失败");
    }
  }

  for (const f of COLLAB_USER_FIELDS) {
    const row = document.createElement("div");
    row.className = "kv";
    const lab = document.createElement("label");
    lab.textContent = f.label;
    const cell = document.createElement("div");
    if (f.type === "companySelect") {
      const sel = document.createElement("select");
      sel.title = "请先设置客户档案，再设置合作者档案，以实现联动";
      sel.innerHTML = `<option value=""></option>${companyOptions.map((x) => `<option value="${x}">${x}</option>`).join("")}`;
      sel.value = String(collaborator.company || "");
      inputs.set(f.key, sel);
      sel.onchange = () =>
        scheduleCollaboratorDraftSave(collaborator.id, getUserPatch, { applyTarget: collaborator, onStatus: setDraftStatus });
      cell.appendChild(sel);
    } else {
      const input = document.createElement("input");
      input.value = collaborator[f.key] == null ? "" : String(collaborator[f.key]);
      inputs.set(f.key, input);
      input.addEventListener("input", () =>
        scheduleCollaboratorDraftSave(collaborator.id, getUserPatch, { applyTarget: collaborator, onStatus: setDraftStatus }),
      );
      cell.appendChild(input);
    }
    row.appendChild(lab);
    row.appendChild(cell);
    body.appendChild(row);
  }

  for (const f of COLLAB_AI_FIELDS) {
    if (f.key === "personalityConfidence") continue;
    if (f.key === "commStyleConfidence") continue;
    if (f.key === "decisionPreferenceConfidence") continue;
    const row = document.createElement("div");
    row.className = "kv";
    const lab = document.createElement("label");
    lab.textContent = f.label;
    const v = collaborator[f.key];
    let val;
    if (f.key === "personality") {
      val = makeInlineValueWithConfidence(v, collaborator.personalityConfidence);
    } else if (f.key === "commStyle") {
      val = makeInlineValueWithConfidence(v, collaborator.commStyleConfidence);
    } else if (f.key === "decisionPreference") {
      val = makeInlineValueWithConfidence(v, collaborator.decisionPreferenceConfidence);
    } else if (f.key === "commSuggestions") {
      val = renderSuggestionCards(Array.isArray(v) ? v : []);
    } else {
      val = document.createElement("div");
      val.className = "value";
      if (f.type === "readonlyList") val.textContent = Array.isArray(v) && v.length ? v.join("\n") : "—";
      else val.textContent = isFilled(v) ? String(v) : "—";
    }
    row.appendChild(lab);
    row.appendChild(val);
    body.appendChild(row);
  }

  const saveRow = document.createElement("div");
  saveRow.className = "row";
  saveRow.style.justifyContent = "flex-end";
  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn btn-primary";
  save.textContent = "保存";
  save.onclick = async () => {
    const patch = {};
    for (const [k, input] of inputs.entries()) patch[k] = input.value;
    const companyName = String(patch.company || "");
    const mappedCustomerId = [...customersById.values()].find((c) => c && c.name === companyName)?.id || collaborator.customerId;
    patch.customerId = String(mappedCustomerId || "");
    await updateCollaborator(collaborator.id, patch);
    state.ui.collaboratorCardMode.set(collaborator.id, "expanded");
    await loadData();
    refresh();
    toast("已保存合作者档案");
  };
  saveRow.appendChild(save);
  body.appendChild(saveRow);

  parseBtn.onclick = async () => {
    const file = state.ui.collaboratorFiles.get(collaborator.id);
    if (!file) return toast("请先上传对话文档（txt）");

    await saveDraftNow();
    const nameVal = String((inputs.get("name")?.value ?? collaborator.name) || "").trim();
    const posVal = String((inputs.get("position")?.value ?? collaborator.position) || "").trim();

    state.ui.collaboratorLoading.set(collaborator.id, "AI 正在进行全方位特征扫描与分析中…");
    refresh();

    let raw = "";
    try {
      const fileId = await uploadToCoze(file);
      const history_context = pruneForCoze({
        personality: collaborator.personality,
        personalityConfidence: collaborator.personalityConfidence,
        commStyle: collaborator.commStyle,
        commStyleConfidence: collaborator.commStyleConfidence,
        decisionPreference: collaborator.decisionPreference,
        decisionPreferenceConfidence: collaborator.decisionPreferenceConfidence,
        commUpdatedYmd: collaborator.commUpdatedYmd,
        analysisSamples: collaborator.analysisSamples,
        relationChangeHint: collaborator.relationChangeHint,
        commSuggestions: collaborator.commSuggestions,
        otherNotes: collaborator.otherNotes,
      });
      const historyText = JSON.stringify(history_context, null, 2);
      const message = `分析对象姓名：${nameVal}\n对方职位：${posVal}\nhistory_context：\n${historyText}\n\n请基于历史评估与已上传的本轮对话文档，进行增量更新，并严格按系统格式输出沟通风格分析报告。`;
      const { raw: sseRaw, lastJson, dataLines } = await fetchCozeChatStream({
        bot_id: "7613766901940011048",
        user_id: getOrCreateUserId(),
        stream: true,
        message,
        file_id: fileId,
      });
      raw = sseRaw;
      const extracted = extractCozeAssistantText(lastJson);
      const fromStream = extractLikelyMarkdownFromSseData(dataLines);
      const report = extracted && extracted.trim() ? extracted : fromStream;
      const parsed = parseCommStyleReport(report);

      const latest = await getByKey("collaborators", collaborator.id);
      const prevSamples = Number(latest?.analysisSamples);
      const nextSamples = Number.isFinite(prevSamples) ? prevSamples + 1 : 1;

      await updateCollaborator(collaborator.id, {
        ...parsed,
        analysisSamples: nextSamples,
      });

      state.ui.collaboratorCardMode.set(collaborator.id, "expanded");
      state.ui.collaboratorFiles.delete(collaborator.id);
      state.ui.collaboratorDebugRaw = report || fromStream || sseRaw || raw;
      toast("AI 分析已成功回填并记录档案");
      await loadData();
      refresh();
    } catch (e) {
      state.ui.collaboratorDebugRaw = raw || String(e?.raw || "");
      toast(String(e?.message || e));
      refresh();
    } finally {
      state.ui.collaboratorLoading.delete(collaborator.id);
      refresh();
    }
  };

  card.appendChild(body);
  return card;
}

function renderCollaboratorsModule() {
  const customersById = new Map(state.customers.map((c) => [c.id, c]));
  const companyOptions = state.customers.map((c) => String(c.name || "")).filter((x) => x);

  let list = state.collaborators;
  const q = String(state.ui.collaboratorFilters.search || "").trim().toLowerCase();
  const filterIds = Array.isArray(state.ui.collaboratorFilters.customerIds) ? state.ui.collaboratorFilters.customerIds : [];
  if (filterIds.length) {
    const set = new Set(filterIds.map((x) => String(x || "")));
    list = list.filter((c) => set.has(String(c.customerId || "")));
  }
  if (q) {
    list = list.filter((col) => {
      const cust = customersById.get(String(col.customerId || ""));
      const parts = [col.name, col.company, col.position, cust ? cust.name : ""].map((x) => String(x || "").toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  }
  if (state.ui.collaboratorFilters.sort === "alpha") {
    list = [...list].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN"));
  }

  const { panel } = renderPanelHeader({ title: collaboratorModuleTitle(), tools: renderCollaboratorTools(state.customers) });
  const grid = document.createElement("div");
  grid.className = "grid grid-collaborators";
  for (const c of list) grid.appendChild(renderCollaboratorCard(c, customersById, companyOptions));
  panel.appendChild(grid);

  const details = document.createElement("details");
  details.className = "raw-details";
  const summary = document.createElement("summary");
  summary.textContent = "Coze端原始对话分析内容折叠区（调试）";
  const pre = document.createElement("pre");
  pre.className = "raw-pre";
  pre.textContent = state.ui.collaboratorDebugRaw ? String(state.ui.collaboratorDebugRaw) : "暂无原始内容";
  details.appendChild(summary);
  details.appendChild(pre);
  panel.appendChild(details);

  return panel;
}

function renderCustomerContextBar() {
  const wrap = document.createElement("div");
  wrap.className = "panel";
  const header = document.createElement("div");
  header.className = "panel-header";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.textContent = "上下文客户";
  const tools = document.createElement("div");
  tools.className = "panel-tools";
  const sel = document.createElement("select");
  sel.className = "select";
  sel.appendChild(new Option("请选择客户…", ""));
  for (const c of state.customers) sel.appendChild(new Option(c.name || "未命名客户", c.id));
  sel.value = state.selectedCustomerId || "";
  sel.onchange = () => {
    state.selectedCustomerId = String(sel.value || "");
    refresh();
  };
  tools.appendChild(sel);
  header.appendChild(title);
  header.appendChild(tools);
  wrap.appendChild(header);
  return wrap;
}

async function renderPipelineModule({ title, moduleKey, primaryAction, secondaryAction } = {}) {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";
  container.appendChild(renderCustomerContextBar());

  const tools = document.createElement("div");
  tools.className = "panel-tools";
  if (secondaryAction) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = secondaryAction.label;
    b.onclick = secondaryAction.onClick;
    tools.appendChild(b);
  }
  if (primaryAction) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-primary";
    b.textContent = primaryAction.label;
    b.onclick = primaryAction.onClick;
    tools.appendChild(b);
  }

  const { panel } = renderPanelHeader({ title, tools });
  const cid = state.selectedCustomerId;
  if (!cid) {
    panel.appendChild(renderMarkdownPlaceholder("请先选择一个客户，再执行该模块动作。"));
    container.appendChild(panel);
    return container;
  }

  const data = await getModuleData(cid, moduleKey);
  panel.appendChild(
    renderMarkdownPlaceholder(
      data && data.content
        ? String(data.content || "")
        : "暂无内容。该模块的智能体联调暂未启用（已预留事件绑定）。",
    ),
  );
  container.appendChild(panel);
  return container;
}

async function renderNeedLeads() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";

  const cid = state.selectedCustomerId;
  const topBar = document.createElement("div");
  topBar.className = "panel";
  const barHeader = document.createElement("div");
  barHeader.className = "panel-header";
  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.alignItems = "center";
  left.style.gap = "12px";

  const label = document.createElement("div");
  label.className = "panel-title";
  label.textContent = "客户选择";
  left.appendChild(label);

  const select = document.createElement("select");
  select.className = "select";
  select.style.minWidth = "260px";
  select.appendChild(new Option("请选择客户…", ""));
  for (const c of state.customers) select.appendChild(new Option(c.name || "未命名客户", c.id));
  select.value = cid || "";
  left.appendChild(select);

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = "btn btn-primary";
  sendBtn.textContent = "发送客户档案";
  left.appendChild(sendBtn);

  barHeader.appendChild(left);
  topBar.appendChild(barHeader);
  container.appendChild(topBar);

  const reportPanel = document.createElement("div");
  reportPanel.className = "panel";
  const reportHeader = document.createElement("div");
  reportHeader.className = "panel-header";
  const reportTitle = document.createElement("div");
  reportTitle.className = "panel-title";
  reportTitle.textContent = "数字化线索洞察报告";
  reportHeader.appendChild(reportTitle);
  reportPanel.appendChild(reportHeader);

  const body = document.createElement("div");
  body.style.padding = "14px 14px";
  reportPanel.appendChild(body);

  const renderReport = (content, rawText) => {
    clearNode(body);
    const card = document.createElement("div");
    card.className = "needles-report-card";
    const md = content ? renderMarkdown(content) : renderMarkdownPlaceholder("暂无报告。点击“发送客户档案”后生成。");
    if (md.classList) md.classList.add("md");
    if (content) enhanceNeedLeadsReport(md);
    card.appendChild(md);

    const tip = document.createElement("div");
    tip.className = "needles-sys-tip";
    const p1 = document.createElement("p");
    p1.className = "line";
    p1.innerHTML = `💡 <strong>本报告仅根据客户档案生成需求线索，需在客户拜访中向客户验证。</strong>`;
    const p2 = document.createElement("p");
    p2.className = "line";
    p2.innerHTML = `🚀 <strong>建议使用右下角的 &lt;需求挖掘陪练小达人&gt;，磨练你的技巧，在客户交谈中挖掘出更全面与更深层的需求。</strong>`;
    tip.appendChild(p1);
    tip.appendChild(p2);
    card.appendChild(tip);

    body.appendChild(card);

    const details = document.createElement("details");
    details.className = "raw-details";
    const summary = document.createElement("summary");
    summary.textContent = "Coze端原始内容折叠区（调试）";
    const pre = document.createElement("pre");
    pre.className = "raw-pre";
    pre.textContent = rawText ? String(rawText) : "暂无原始内容";
    details.appendChild(summary);
    details.appendChild(pre);
    body.appendChild(details);
  };

  if (!cid) {
    renderReport("", "");
    sendBtn.disabled = true;
  } else {
    const data = await getModuleData(cid, "need_leads");
    const report = typeof data?.content === "string" ? data.content : "";
    const raw = typeof data?.raw === "string" ? data.raw : report;
    renderReport(report, raw);
  }

  const buildPayload = () => {
    const currentId = state.selectedCustomerId;
    const customer = state.customers.find((c) => c.id === currentId);
    if (!customer) return null;
    const lowConfidence = !isFilled(customer.bossSpeechNotes) && !isFilled(customer.developmentStrategy);
    if (lowConfidence) {
      toast("提醒：检测到缺少掌门人发言和发展策略，分析置信度可能偏低，系统已自动指引后端切换至 SPACE-O 诊断模型。");
    }
    const keys = new Set([
      ...CUSTOMER_FIELDS_COMMON.map((f) => f.key),
      ...CUSTOMER_FIELDS_COOP_ONLY.map((f) => f.key),
      "status",
      "relationType",
      "type",
    ]);
    const base = {};
    for (const k of keys) base[k] = customer[k];
    if (lowConfidence) base.analysisModelHint = "SPACE-O";
    return pruneForCoze(base);
  };

  const sendToCoze = async () => {
    const messageObj = buildPayload();
    if (!messageObj) return toast("未找到客户档案");
    const currentId = state.selectedCustomerId;
    await setModuleData(currentId, "need_leads", { content: "生成中…", raw: "生成中…" });
    await refresh();

    const reqBody = {
      bot_id: "7548674654287265832",
      user_id: getOrCreateUserId(),
      stream: false,
      message: JSON.stringify(messageObj),
    };

    let resp;
    try {
      resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
    } catch (e) {
      toast(String(e?.message || e));
      await setModuleData(currentId, "need_leads", { content: "", raw: "" });
      await refresh();
      return;
    }

    let payload = null;
    let text = "";
    try {
      text = await resp.text();
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!resp.ok) {
      const msg = payload?.message || payload?.msg || payload?.error || `请求失败（HTTP ${resp.status}）`;
      toast(String(msg));
      await setModuleData(currentId, "need_leads", { content: "", raw: text || String(msg) });
      await refresh();
      return;
    }

    const extracted = extractCozeAssistantText(payload);
    const rawContent = extracted && extracted.trim() ? extracted : text || JSON.stringify(payload, null, 2);
    await setModuleData(currentId, "need_leads", { content: rawContent, raw: rawContent });
    await refresh();
    toast("已生成需求线索报告");
  };

  const maybeShowPreviewAndSend = async () => {
    if (!state.needLeadsDebug.enabled) {
      await sendToCoze();
      return;
    }
    const messageObj = buildPayload();
    if (!messageObj) return toast("未找到客户档案");
    const requestPreview = {
      bot_id: "7548674654287265832",
      user_id: getOrCreateUserId(),
      stream: false,
      messageObject: messageObj,
    };
    const previewText = JSON.stringify(requestPreview, null, 2);
    const bodyNode = document.createElement("div");
    bodyNode.style.display = "grid";
    bodyNode.style.gap = "10px";
    const copyRow = document.createElement("div");
    copyRow.className = "row";
    copyRow.style.justifyContent = "space-between";
    const hint = document.createElement("div");
    hint.style.color = "var(--muted)";
    hint.style.fontSize = "12px";
    hint.textContent = "发送预览：确认无误后再发起请求（联调用）";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn";
    copyBtn.textContent = "一键复制";
    copyBtn.onclick = async () => {
      const ok = await copyToClipboard(previewText);
      toast(ok ? "已复制" : "复制失败");
    };
    copyRow.appendChild(hint);
    copyRow.appendChild(copyBtn);
    const previewPre = document.createElement("pre");
    previewPre.className = "raw-pre";
    previewPre.textContent = previewText;
    bodyNode.appendChild(copyRow);
    bodyNode.appendChild(previewPre);

    const ok = await confirmModal({ title: "确认发送客户档案", bodyNode, okText: "确认发送" });
    if (!ok) return;
    await sendToCoze();
  };

  select.onchange = () => {
    state.selectedCustomerId = String(select.value || "");
    refresh();
  };
  sendBtn.onclick = maybeShowPreviewAndSend;

  container.appendChild(reportPanel);
  return container;
}

async function renderNeedInsight() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";

  const context = document.createElement("div");
  context.className = "panel";
  const header = document.createElement("div");
  header.className = "panel-header";
  const left = document.createElement("div");
  left.className = "panel-tools";
  left.style.display = "flex";
  left.style.alignItems = "center";
  left.style.gap = "12px";
  const label = document.createElement("div");
  label.className = "panel-title";
  label.textContent = "客户选择";
  const select = document.createElement("select");
  select.className = "select";
  select.appendChild(new Option("请选择客户…", ""));
  for (const c of state.customers) select.appendChild(new Option(c.name || "未命名客户", c.id));
  select.value = state.selectedCustomerId || "";
  select.onchange = () => {
    state.selectedCustomerId = String(select.value || "");
    refresh();
  };

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "btn";
  uploadBtn.textContent = "上传文档";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "text/plain,.txt";
  fileInput.hidden = true;
  fileInput.onchange = () => {
    (async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      const cid = String(state.selectedCustomerId || "");
      if (!cid) return toast("请先选择客户");
      const text = await readFileAsText(file);
      state.ui.needInsightDocs.set(cid, text);
      state.ui.needInsightDocNames.set(cid, file.name);
      toast(`已上传：${file.name}`);
      refresh();
    })();
  };
  uploadBtn.onclick = () => fileInput.click();

  const analyzeBtn = document.createElement("button");
  analyzeBtn.type = "button";
  analyzeBtn.className = "btn btn-primary";
  analyzeBtn.textContent = "深度解析";
  analyzeBtn.onclick = async () => {
    const cid = String(state.selectedCustomerId || "");
    if (!cid) return toast("请先选择客户");
    const customer = state.customers.find((c) => c.id === cid);
    if (!customer) return toast("未找到客户档案");
    const doc = String(state.ui.needInsightDocs.get(cid) || "").trim();
    if (!doc) return toast("请先上传文档（txt）");
    state.ui.needInsightLoading = true;
    refresh();
    try {
      const message = `客户名称：${customer.name || ""}\n\n对话文档：\n${doc}`;
      const { raw, lastJson, dataLines } = await fetchCozeChatStream({
        bot_id: "7536874275736354857",
        user_id: getOrCreateUserId(),
        stream: true,
        message,
      });
      const extracted = extractCozeAssistantText(lastJson);
      const fromStream = extractLikelyNeedInsightMarkdownFromSseData(dataLines);
      const report = extracted && extracted.trim() ? extracted : fromStream;
      const sliced = sliceNeedInsightMarkdown(report);

      state.ui.needInsightDrafts.set(cid, { report, sliced });
      state.ui.needInsightRaw.set(cid, report || raw);
      await setModuleData(cid, "need_insight", {
        report,
        sliced,
        raw: report || raw,
      });
      toast("深度洞察已生成");
      refresh();
    } catch (e) {
      toast(String(e?.message || e));
    } finally {
      state.ui.needInsightLoading = false;
      refresh();
    }
  };

  left.appendChild(label);
  left.appendChild(select);
  left.appendChild(uploadBtn);
  left.appendChild(analyzeBtn);
  header.appendChild(left);
  context.appendChild(header);
  context.appendChild(fileInput);
  container.appendChild(context);

  const { panel } = renderPanelHeader({ title: `${MAIN[state.mainKey].title} · 需求验证与洞察` });
  const cid = String(state.selectedCustomerId || "");
  if (!cid) {
    panel.appendChild(renderMarkdownPlaceholder("请先选择一个客户。"));
    container.appendChild(panel);
    return container;
  }

  const stored = await getModuleData(cid, "need_insight");
  const draft = state.ui.needInsightDrafts.get(cid);
  const report = (draft && draft.report) || (typeof stored?.report === "string" ? stored.report : "");
  const sliced = (draft && draft.sliced) || (stored && stored.sliced ? stored.sliced : null);
  const rawText = state.ui.needInsightRaw.get(cid) || (typeof stored?.raw === "string" ? stored.raw : report);

  if (state.ui.needInsightLoading) {
    const loading = document.createElement("div");
    loading.className = "ai-loading";
    const spinner = document.createElement("div");
    spinner.className = "ai-spinner";
    const t = document.createElement("div");
    t.className = "ai-loading-text";
    t.textContent = "AI 正在进行深度洞察分析中…";
    loading.appendChild(spinner);
    loading.appendChild(t);
    panel.appendChild(loading);
  }

  if (!report) {
    panel.appendChild(renderMarkdownPlaceholder("暂无洞察报告。请上传文档后点击“深度解析”。"));
  } else if (!sliced) {
    panel.appendChild(renderMarkdownPlaceholder(report));
  } else {
    const card = document.createElement("div");
    card.className = "needles-report-card";
    const title = document.createElement("div");
    title.className = "needles-report-title";
    title.textContent = "需求验证与洞察报告";
    card.appendChild(title);

    const b = sliced.blocks || {};
    card.appendChild(renderNeedInsightTextBlock("基础信息", b.basicInfo));
    if (b.oralNeeds) card.appendChild(renderNeedInsightTextBlock("口述需求", b.oralNeeds));
    card.appendChild(renderNeedInsightSlotSection("支持需求", sliced.slots?.support));
    card.appendChild(renderNeedInsightSlotSection("成果需求", sliced.slots?.outcome));
    card.appendChild(renderNeedInsightSlotSection("个人需求", sliced.slots?.personal));
    if (b.beverageRole) card.appendChild(renderNeedInsightTextBlock("饮料角色", b.beverageRole));
    if (b.keyAssumptions) card.appendChild(renderNeedInsightTextBlock("需验证的关键假设", b.keyAssumptions));
    if (b.strategicOpportunity) card.appendChild(renderNeedInsightTextBlock("战略机会提示", b.strategicOpportunity));

    const hint = document.createElement("div");
    hint.className = "hint-callout";
    hint.innerHTML =
      "💡 <strong>提示</strong>：请仔细校准内容，并勾选你打算在后续方案中予以满足的目标需求，点击页面最下方的<strong>【围绕需求创造价值主张】</strong>按钮，系统将为你联动创造精准的价值主张方案。";
    card.appendChild(hint);

    panel.appendChild(card);
  }

  const actionRow = document.createElement("div");
  actionRow.className = "row";
  actionRow.style.justifyContent = "flex-end";
  const goValue = document.createElement("button");
  goValue.type = "button";
  goValue.className = "btn btn-primary";
  goValue.textContent = "围绕需求创造价值主张";
  goValue.onclick = async () => {
    const currentDraft = state.ui.needInsightDrafts.get(cid);
    const currentSliced = currentDraft ? currentDraft.sliced : stored?.sliced;
    if (!currentSliced) return toast("暂无可用洞察内容");
    const selected = [];
    const addChecked = (arr) => {
      for (const s of Array.isArray(arr) ? arr : []) {
        if (s && s.checked === true && String(s.text || "").trim()) selected.push(String(s.text || "").trim());
      }
    };
    addChecked(currentSliced?.slots?.support);
    addChecked(currentSliced?.slots?.outcome);
    addChecked(currentSliced?.slots?.personal);

    const payload = {
      basicInfo: String(currentSliced?.blocks?.basicInfo || ""),
      beverageRole: String(currentSliced?.blocks?.beverageRole || ""),
      strategicOpportunity: String(currentSliced?.blocks?.strategicOpportunity || ""),
      selectedNeeds: selected,
    };
    await setModuleData(cid, "need_insight", payload);
    toast("选定需求已锚定，正在生成价值主张流水线...");
    setTimeout(() => {
      state.moduleKey = "value_prop";
      setHashFromState();
      refresh();
    }, 400);
  };
  actionRow.appendChild(goValue);
  panel.appendChild(actionRow);

  const details = document.createElement("details");
  details.className = "raw-details";
  const summary = document.createElement("summary");
  summary.textContent = "Coze端原始深度洞察内容折叠区（调试）";
  const pre = document.createElement("pre");
  pre.className = "raw-pre";
  pre.textContent = rawText ? String(rawText) : "暂无原始内容";
  details.appendChild(summary);
  details.appendChild(pre);
  panel.appendChild(details);

  container.appendChild(panel);
  return container;
}

async function renderValueProp() {
  return renderPipelineModule({
    title: `${MAIN[state.mainKey].title} · 价值主张创造`,
    moduleKey: "value_prop",
    primaryAction: {
      label: "万能剧本提案",
      onClick: async () => {
        const cid = state.selectedCustomerId;
        await setModuleData(cid, "proposal", { content: "已预留：将勾选方案 + 分析内容 → 发送给 <万能剧本提案高手>" });
        state.moduleKey = "proposal";
        setHashFromState();
        refresh();
      },
    },
  });
}

async function renderProposal() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";
  container.appendChild(renderCustomerContextBar());

  const tools = document.createElement("div");
  tools.className = "panel-tools";
  const exportTxt = document.createElement("button");
  exportTxt.type = "button";
  exportTxt.className = "btn";
  exportTxt.textContent = "导出txt文件";
  exportTxt.onclick = async () => {
    const cid = state.selectedCustomerId;
    if (!cid) return toast("请先选择客户");
    const data = await getModuleData(cid, "proposal");
    const text = data && data.content ? String(data.content) : "";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `提案剧本_${cid}_${todayYYYYMMDD()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const exportPng = document.createElement("button");
  exportPng.type = "button";
  exportPng.className = "btn btn-primary";
  exportPng.textContent = "导出PNG长图";
  exportPng.onclick = () => toast("已预留：导出PNG长图（后续实现）");
  tools.appendChild(exportTxt);
  tools.appendChild(exportPng);

  const { panel } = renderPanelHeader({ title: `${MAIN[state.mainKey].title} · 提案剧本`, tools });
  const cid = state.selectedCustomerId;
  if (!cid) panel.appendChild(renderMarkdownPlaceholder("请先选择一个客户。"));
  else {
    const data = await getModuleData(cid, "proposal");
    panel.appendChild(renderMarkdownPlaceholder(data && data.content ? String(data.content) : "暂无提案剧本内容。"));
  }
  container.appendChild(panel);
  return container;
}

async function renderKaSentiment() {
  return renderPipelineModule({ title: `${MAIN[state.mainKey].title} · KA每周舆情监测`, moduleKey: "ka_sentiment" });
}

async function renderKaActions() {
  return renderPipelineModule({ title: `${MAIN[state.mainKey].title} · KA关键动作预测与机会洞察`, moduleKey: "ka_actions" });
}

async function renderFacts7c() {
  return renderPipelineModule({ title: `${MAIN[state.mainKey].title} · 7C事实与洞察库`, moduleKey: "facts7c" });
}

async function renderContent() {
  clearNode(el.contentRoot);
  el.floatingCoach.style.display = state.moduleKey === "need_leads" || state.moduleKey === "need_insight" ? "block" : "none";

  if (state.moduleKey === "customers") return el.contentRoot.appendChild(renderCustomersModule());
  if (state.moduleKey === "collaborators") return el.contentRoot.appendChild(renderCollaboratorsModule());
  if (state.moduleKey === "need_leads") return el.contentRoot.appendChild(await renderNeedLeads());
  if (state.moduleKey === "need_insight") return el.contentRoot.appendChild(await renderNeedInsight());
  if (state.moduleKey === "value_prop") return el.contentRoot.appendChild(await renderValueProp());
  if (state.moduleKey === "proposal") return el.contentRoot.appendChild(await renderProposal());
  if (state.moduleKey === "ka_sentiment") return el.contentRoot.appendChild(await renderKaSentiment());
  if (state.moduleKey === "ka_actions") return el.contentRoot.appendChild(await renderKaActions());
  if (state.moduleKey === "facts7c") return el.contentRoot.appendChild(await renderFacts7c());

  const fallback = document.createElement("div");
  fallback.className = "panel";
  fallback.appendChild(renderMarkdownPlaceholder("模块未实现"));
  el.contentRoot.appendChild(fallback);
}

async function loadData() {
  state.customers = await listCustomers({ type: MAIN[state.mainKey].type, includeHidden: false });
  const customerIdSet = new Set(state.customers.map((c) => c.id));
  state.collaborators = (await listCollaborators({})).filter((c) => customerIdSet.has(String(c.customerId || "")));
  if (state.selectedCustomerId && !state.customers.some((c) => c.id === state.selectedCustomerId)) {
    state.selectedCustomerId = "";
  }
}

async function refresh() {
  setNavCurrent();
  renderTabs();
  await renderContent();
}

async function init() {
  parseHash();
  setNavCurrent();

  el.pageTitle.addEventListener("click", () => {
    if (state.mainKey !== "lead" || state.moduleKey !== "need_leads") return;
    const now = Date.now();
    if (now - state.needLeadsDebug.lastClickTime > 2000) {
      state.needLeadsDebug.clickCount = 0;
    }
    state.needLeadsDebug.lastClickTime = now;
    state.needLeadsDebug.clickCount += 1;
    if (state.needLeadsDebug.clickCount >= 5) {
      state.needLeadsDebug.enabled = true;
      state.needLeadsDebug.clickCount = 0;
      setNavCurrent();
    }
  });

  el.navMainLead.onclick = () => {
    state.mainKey = "lead";
    state.moduleKey = MAIN.lead.modules[0].key;
    state.ui.customerFilters.statuses.clear();
    state.ui.customerFilters.relations.clear();
    setHashFromState();
    loadData().then(refresh);
  };

  el.navMainCoop.onclick = () => {
    state.mainKey = "coop";
    state.moduleKey = MAIN.coop.modules[0].key;
    state.ui.customerFilters.statuses.clear();
    state.ui.customerFilters.relations.clear();
    setHashFromState();
    loadData().then(refresh);
  };

  el.btnLogout.onclick = async () => {
    const ok = await confirmModal({ title: "退出登录", body: "是否退出并返回登录页？", okText: "退出" });
    if (!ok) return;
    sessionStorage.removeItem("isLoggedIn");
    window.location.replace("/login.html");
  };

  el.btnExportBackup.onclick = async () => {
    const data = await exportBackup();
    const ts = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const name = `ko-sales-backup_${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(
      ts.getHours(),
    )}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;
    downloadJson(name, data);
    toast("已导出备份");
  };

  el.btnImportBackup.onclick = () => el.inputImportFile.click();
  el.inputImportFile.onchange = async () => {
    const file = el.inputImportFile.files && el.inputImportFile.files[0];
    el.inputImportFile.value = "";
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      return toast("读取文件失败");
    }
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      return toast("JSON 解析失败");
    }

    const ok = await confirmModal({
      title: "导入恢复（完全覆盖）",
      body: "导入将覆盖当前系统的所有数据，是否继续？",
      okText: "继续",
    });
    if (!ok) return;
    try {
      await importBackup(payload);
    } catch (e) {
      return toast(String(e?.message || e));
    }
    toast("导入完成，正在刷新…");
    setTimeout(() => window.location.reload(), 400);
  };

  el.floatingCoach.onclick = () => {
    confirmModal({
      title: "需求发掘陪练小达人",
      body: "当前阶段：仅预留入口与弹窗。\n后续可接入对话式陪练（仅在 需求线索 / 需求验证与洞察 模块显示）。",
      okText: "知道了",
    });
  };

  window.addEventListener("hashchange", () => {
    parseHash();
    loadData().then(refresh);
  });

  await loadData();
  await refresh();
}

init().catch((e) => toast(String(e?.message || e)));
