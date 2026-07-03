import {
  todayYYYYMMDD,
  newId,
  bulkPut,
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
  clearAllData,
  moveLeadToCoopByCopy,
  getModuleData,
  setModuleData,
  listFacts7cCards,
  deleteFacts7cCards,
} from "./storage.js";

const el = {
  navMainLead: document.getElementById("navMainLead"),
  navMainCoop: document.getElementById("navMainCoop"),
  btnExportBackup: document.getElementById("btnExportBackup"),
  btnImportBackup: document.getElementById("btnImportBackup"),
  btnClearRecords: document.getElementById("btnClearRecords"),
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

let renderSeq = 0;

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
    valuePropDrafts: new Map(),
    valuePropRaw: new Map(),
    valuePropLoading: new Set(),
    valuePropDraftTimers: new Map(),
    proposalDrafts: new Map(),
    proposalRaw: new Map(),
    proposalLoading: new Set(),
    proposalDraftTimers: new Map(),
    proposalEditMode: new Map(),
    coach: {
      open: false,
      isMax: false,
      loading: false,
      conversationId: "",
      messages: [],
      abort: null,
      modal: null,
    },
    kaSentimentImportCustomerId: "",
    kaActionsImportCustomerId: "",
    facts7c: {
      view: "wall",
      wallType: "evidence",
      businessDimension: "All",
      relationFocus: "action",
      selectedActionId: "",
      selectedInsightId: "",
      selectedIds: new Set(),
      lastImportDelta: { evidence: 0, insight: 0, action_hypothesis: 0 },
    },
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

function confirmModalAcknowledge({ title, sentence, okText } = {}) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "confirm-ack";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = newId("ack");
    const label = document.createElement("label");
    label.setAttribute("for", checkbox.id);
    label.textContent = String(sentence || "");
    wrap.appendChild(checkbox);
    wrap.appendChild(label);

    openModal({ title, bodyNode: wrap, okText });
    el.modalOk.disabled = true;

    const onToggle = () => {
      el.modalOk.disabled = !checkbox.checked;
    };
    checkbox.addEventListener("change", onToggle);

    const cleanup = () => {
      checkbox.removeEventListener("change", onToggle);
      el.modalCancel.onclick = null;
      el.modalOk.onclick = null;
      el.modalBackdrop.onclick = null;
      el.modalOk.disabled = false;
      closeModal();
    };

    el.modalCancel.onclick = () => {
      cleanup();
      resolve(false);
    };
    el.modalOk.onclick = () => {
      if (!checkbox.checked) return;
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

const COACH_BOT_ID = "7537199227269758986";
const COACH_GREETING = `我是你的专属陪练小达人，准备帮你练就一流的客户需求挖掘技巧！

🎯 挑战规则
- 我会随机生成一个餐饮客户场景，扮演其中的关键角色
- 你需要通过提问挖掘我的深层需求
- 挑战成功标准：正确使用4种漏斗式提问技巧
  - 📢 开放式提问（拉近距离，收集线索）
  - 🔍 探寻式提问（挖掘关注细节）
  - 🎯 限制式提问（确认具体需求）
  - 🚀 引导式提问（寻求解题共识）

💡 特别提醒
- 提问顺序很重要：开放→探寻→限制→引导
- 每次我会给出双重反馈：客户回应+教练点评
- 如果提问不够恰当，我会及时引导

准备好接受挑战了吗？回复"开始挑战"进入实战场景！`;

function normalizeCoachText(text) {
  let t = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/【{2,}/g, "【")
    .replace(/】{2,}/g, "】");
  t = t.replace(/\*\*/g, "");
  t = t.replace(/([^\n])\s*(技巧运用评分\s*[:：])/g, "$1\n\n$2");
  t = t.replace(/([^\n])\s*(评价说明\s*[:：])/g, "$1\n\n$2");
  t = t.replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, "\n\n");
  return t.trim();
}

function parseCoachBlocks(text) {
  const src = normalizeCoachText(text);
  if (!src) return [];

  const lines = src.split("\n");
  const blocks = [];
  let cur = { kind: "general", title: "", lines: [] };
  const push = () => {
    const body = cur.lines.join("\n").trim();
    if (cur.title || body) blocks.push({ kind: cur.kind, title: cur.title, body });
    cur = { kind: "general", title: "", lines: [] };
  };

  const start = (kind, title, restLine) => {
    push();
    cur.kind = kind;
    cur.title = title;
    if (restLine) cur.lines.push(restLine);
  };

  for (const rawLine of lines) {
    const tt = String(rawLine || "").trimEnd();
    const t = tt.trim();
    if (!t) {
      cur.lines.push("");
      continue;
    }

    if (/【客户回应】/.test(t)) {
      const rest = tt.replace(/^.*?【客户回应】\s*/, "").trim();
      start("reply", "客户回应", rest);
      continue;
    }
    if (/【教练点评】/.test(t)) {
      const rest = tt.replace(/^.*?【教练点评】\s*/, "").trim();
      start("review", "教练点评", rest);
      continue;
    }
    if (/挑战进度更新|当前进度/.test(t)) {
      start("progress", "进度更新", tt.replace(/^.*?(挑战进度更新|当前进度)\s*/i, "").trim());
      continue;
    }
    if (/下一步建议/.test(t)) {
      start("next", "下一步建议", tt.replace(/^.*?下一步建议\s*/i, "").trim());
      continue;
    }
    if (/场景生成完成/.test(t)) {
      start("scene", "场景生成完成", tt.replace(/^.*?场景生成完成\s*/i, "").trim());
      continue;
    }

    cur.lines.push(tt);
  }
  push();
  return blocks;
}

function createCoachModal() {
  const mkSvg = (d) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "18");
    svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  };

  const backdrop = document.createElement("div");
  backdrop.className = "coach-backdrop";
  const phone = document.createElement("div");
  phone.className = "coach-phone";

  const header = document.createElement("div");
  header.className = "coach-header";
  const title = document.createElement("div");
  title.className = "coach-title";
  const img = document.createElement("img");
  img.src = "/assets/02.png";
  img.alt = "";
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = "客户需求挖掘陪练小达人";
  title.appendChild(img);
  title.appendChild(name);

  const actions = document.createElement("div");
  actions.className = "coach-actions";
  const btnSize = document.createElement("button");
  btnSize.type = "button";
  btnSize.className = "iconbtn";
  btnSize.title = "尺寸切换";
  btnSize.appendChild(mkSvg("M4 9V4h5 M20 15v5h-5 M5 5l6 6 M19 19l-6-6"));
  const btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.className = "iconbtn";
  btnClose.title = "关闭";
  btnClose.appendChild(mkSvg("M18 6L6 18 M6 6l12 12"));
  actions.appendChild(btnSize);
  actions.appendChild(btnClose);

  header.appendChild(title);
  header.appendChild(actions);

  const body = document.createElement("div");
  body.className = "coach-body";

  const inputbar = document.createElement("div");
  inputbar.className = "coach-inputbar";
  const ta = document.createElement("textarea");
  ta.placeholder = "输入你的问题…";
  const send = document.createElement("button");
  send.type = "button";
  send.className = "btn btn-primary";
  send.textContent = "发送";
  inputbar.appendChild(ta);
  inputbar.appendChild(send);

  phone.appendChild(header);
  phone.appendChild(body);
  phone.appendChild(inputbar);
  backdrop.appendChild(phone);

  backdrop.onclick = (e) => {
    if (e.target === backdrop) closeCoach();
  };

  return { backdrop, phone, body, ta, send, btnSize, btnClose };
}

function renderCoach() {
  const ui = state.ui.coach;
  const modal = ui.modal;
  if (!ui.open || !modal) return;

  clearNode(modal.body);
  for (const msg of ui.messages) {
    const row = document.createElement("div");
    row.className = `coach-msg ${msg.role === "user" ? "user" : "assistant"}`;
    const bubble = document.createElement("div");
    bubble.className = "coach-bubble";

    if (msg.role === "assistant") {
      const blocks = parseCoachBlocks(msg.text);
      if (!blocks.length) {
        bubble.innerHTML = markdownToSafeHtml(normalizeCoachText(msg.text));
      } else {
        const frag = document.createDocumentFragment();
        for (const b of blocks) {
          const bodyText = String(b.body || "");
          const contentHtml = markdownToSafeHtml(bodyText);
          if (b.kind === "general" && !b.title) {
            const rich = document.createElement("div");
            rich.className = "coach-rich";
            rich.innerHTML = contentHtml;
            frag.appendChild(rich);
          } else {
            const blk = document.createElement("div");
            blk.className = "coach-block";
            if (b.title) {
              const t = document.createElement("div");
              t.className = "coach-block-title";
              t.textContent = b.title;
              blk.appendChild(t);
            }
            const content = document.createElement("div");
            content.innerHTML = contentHtml;
            blk.appendChild(content);
            frag.appendChild(blk);
          }
        }
        bubble.replaceChildren(frag);
      }
    } else {
      bubble.textContent = String(msg.text || "");
    }
    row.appendChild(bubble);
    modal.body.appendChild(row);
  }

  if (ui.loading) {
    const typing = document.createElement("div");
    typing.className = "coach-typing";
    typing.textContent = "小达人正在思考…";
    modal.body.appendChild(typing);
  }

  modal.body.scrollTop = modal.body.scrollHeight;
}

async function sendCoach(text) {
  const ui = state.ui.coach;
  const t = String(text || "").trim();
  if (!t || ui.loading) return;

  ui.messages.push({ role: "user", text: t, ts: Date.now() });
  ui.loading = true;
  renderCoach();

  const assistantMsg = { role: "assistant", text: "", ts: Date.now() };
  ui.messages.push(assistantMsg);
  renderCoach();

  const controller = new AbortController();
  ui.abort = controller;

  try {
    const payload = {
      bot_id: COACH_BOT_ID,
      user_id: getOrCreateUserId(),
      stream: true,
      message: t,
      ...(ui.conversationId ? { conversation_id: ui.conversationId } : {}),
    };
    const res = await streamCozeAnswerText(payload, {
      signal: controller.signal,
      onDelta: (d) => {
        assistantMsg.text += String(d || "");
        renderCoach();
      },
    });
    if (res && res.conversationId && !ui.conversationId) ui.conversationId = String(res.conversationId);
    const finalText = String((res?.completed && res.completed.trim() ? res.completed : res?.mergedDelta) || assistantMsg.text || "").trim();
    assistantMsg.text = finalText;
  } catch (e) {
    const msg = String(e?.message || e);
    assistantMsg.text = `请求失败：${msg}`;
  } finally {
    ui.loading = false;
    ui.abort = null;
    renderCoach();
  }
}

function openCoach() {
  const ui = state.ui.coach;
  if (!ui.modal) ui.modal = createCoachModal();
  if (!ui.modal.backdrop.isConnected) document.body.appendChild(ui.modal.backdrop);
  ui.open = true;
  ui.modal.backdrop.style.display = "flex";

  ui.modal.btnSize.onclick = () => {
    ui.isMax = !ui.isMax;
    if (ui.isMax) ui.modal.phone.classList.add("is-max");
    else ui.modal.phone.classList.remove("is-max");
  };
  ui.modal.btnClose.onclick = () => closeCoach();

  ui.modal.send.onclick = () => {
    const v = String(ui.modal.ta.value || "");
    ui.modal.ta.value = "";
    sendCoach(v);
  };
  ui.modal.ta.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ui.modal.send.click();
    }
  };

  if (!ui.messages.length) {
    ui.messages.push({ role: "assistant", text: COACH_GREETING, ts: Date.now() });
  }
  renderCoach();
  ui.modal.ta.focus();
}

function closeCoach() {
  const ui = state.ui.coach;
  try {
    ui.abort?.abort();
  } catch {}
  ui.open = false;
  ui.isMax = false;
  ui.loading = false;
  ui.conversationId = "";
  ui.messages = [];
  ui.abort = null;
  if (ui.modal) {
    ui.modal.backdrop.style.display = "none";
    ui.modal.phone.classList.remove("is-max");
    try {
      ui.modal.backdrop.remove();
    } catch {}
  }
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

async function fetchCozeChatStream(payload, { signal } = {}) {
  let resp;
  try {
    resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    const isAbort = String(e?.name || "") === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
    if (isAbort) return { raw: "", lastJson: null, dataLines: [], aborted: true };
    throw e;
  }
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

  try {
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
  } catch (e) {
    const isAbort = String(e?.name || "") === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
    if (isAbort) return { raw, lastJson, dataLines, aborted: true };
    throw e;
  }

  return { raw, lastJson, dataLines, aborted: false };
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
  const anchors = ["需求深度洞察分析报告", "基础信息", "需求分层分析", "支持需求", "成果需求", "个人需求", "饮料角色", "关键假设", "战略机会"];

  const hasAnchor = (s) => anchors.some((a) => String(s || "").includes(a));
  const countAnchors = (s) => anchors.reduce((n, a) => (String(s || "").includes(a) ? n + 1 : n), 0);
  const title = "需求深度洞察分析报告";

  const candidates = [];
  const seen = new Set();
  const addCandidate = (s) => {
    const t = String(s || "").trim();
    if (!t) return;
    if (!hasAnchor(t)) return;
    const key = t.length > 5000 ? t.slice(0, 5000) : t;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(t);
  };

  const plain = [];
  for (const line of parts) {
    const t = String(line || "").trim();
    if (!t) continue;
    if (t.startsWith("{") || t.startsWith("[")) continue;
    plain.push(t);
  }
  if (plain.length) addCandidate(plain.join("\n"));

  const addFromObject = (obj) => {
    if (!obj || typeof obj !== "object") return;
    const o = obj;
    addCandidate(o?.data?.delta?.content);
    addCandidate(o?.data?.message?.content);
    addCandidate(o?.data?.content);
    addCandidate(o?.data?.answer);
    addCandidate(o?.content);

    const walkLimited = (node, depth) => {
      if (!node || depth > 4) return;
      if (typeof node === "string") {
        addCandidate(node);
        return;
      }
      if (Array.isArray(node)) return;
      if (typeof node !== "object") return;
      for (const [k, v] of Object.entries(node)) {
        const kk = String(k || "");
        if (kk === "messages" || kk === "message_list" || kk === "messageList") continue;
        if (kk === "content" && typeof v === "string") addCandidate(v);
        walkLimited(v, depth + 1);
      }
    };
    walkLimited(o, 0);
  };

  for (const line of parts) {
    if (line.startsWith("{") || line.startsWith("[")) {
      try {
        addFromObject(JSON.parse(line));
      } catch {}
    }
  }

  if (!candidates.length) return "";
  const scored = candidates
    .map((t) => ({ t, score: (t.includes(title) ? 1000000 : 0) + countAnchors(t) * 10000 + t.length }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0]?.t || "";
  const idx = best.indexOf(title);
  return idx >= 0 ? best.slice(idx) : best;
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

function extractTitleFromHtml(html) {
  const src = String(html || "");
  const m = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return String(m[1] || "")
    .replace(/\s+/g, " ")
    .trim();
}

function toYmdCompact(y, m, d) {
  const yy = String(y || "").trim();
  const mm = String(m || "").trim().padStart(2, "0");
  const dd = String(d || "").trim().padStart(2, "0");
  if (!/^\d{4}$/.test(yy)) return "";
  if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) return "";
  return `${yy}${mm}${dd}`;
}

function normalizeHtmlInlineText(s) {
  return String(s || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/\u00a0/g, " ")
    .trim();
}

function extractMonitorPeriodFromHtml(html) {
  const src = String(html || "").replace(/\r\n/g, "\n");
  if (!src) return "";
  const m = src.match(/(?:监测周期|监控周期)\s*[:：]\s*([^\n<]{1,120})/);
  if (!m) return "";
  return normalizeHtmlInlineText(m[1]);
}

function extractReportDateYmdFromHtml(html) {
  const src = String(html || "").replace(/\r\n/g, "\n");
  if (!src) return "";

  const label = "(?:报告生成日期|报告日期|报告生成|生成时间|生成日期|发布日期|报告时间)";

  const m0 = src.match(new RegExp(String.raw`${label}\s*[:：]\s*(\d{8})`));
  if (m0) return String(m0[1] || "").trim();

  const m1 = src.match(
    new RegExp(
      String.raw`${label}\s*[:：]\s*(\d{4})\s*[年\-\/\.]\s*(\d{1,2})\s*[月\-\/\.]\s*(\d{1,2})\s*(?:日)?(?:\s*[（(][^）)]*[）)])?`,
    ),
  );
  if (m1) return toYmdCompact(m1[1], m1[2], m1[3]);

  const m2 = src.match(new RegExp(String.raw`${label}\s*[:：]\s*(\d{4})-(\d{2})-(\d{2})`));
  if (m2) return `${m2[1]}${m2[2]}${m2[3]}`;

  const fromPeriod = extractEndYmdFromMonitorPeriod(extractMonitorPeriodFromHtml(src));
  if (fromPeriod) return fromPeriod;

  return "";
}

function extractEndYmdFromMonitorPeriod(periodText) {
  const t = String(periodText || "").replace(/\s+/g, "");
  if (!t) return "";
  const m1 = t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日[—–\-~～－](\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m1) return toYmdCompact(m1[4], m1[5], m1[6]);
  const m2 = t.match(/(\d{4})年(\d{1,2})月(\d{1,2})日[—–\-~～－](\d{1,2})月(\d{1,2})日/);
  if (m2) return toYmdCompact(m2[1], m2[4], m2[5]);
  const m3 = t.match(/(\d{8})[—–\-~～－](\d{8})/);
  if (m3) return String(m3[2] || "").trim();
  const m4 = t.match(/(\d{4})-(\d{2})-(\d{2})[—–\-~～－](\d{4})-(\d{2})-(\d{2})/);
  if (m4) return `${m4[4]}${m4[5]}${m4[6]}`;
  return "";
}

function extractMonitorPeriodFromTitle(title) {
  const t = String(title || "");
  const m1 = t.match(/(\d{4}年\s*\d{1,2}月\s*\d{1,2}日)\s*[—–\-~～－]\s*(\d{4}年\s*\d{1,2}月\s*\d{1,2}日)/);
  if (m1) return `${String(m1[1]).replace(/\s+/g, "")}—${String(m1[2]).replace(/\s+/g, "")}`;
  const m2 = t.match(/(\d{4}年\s*\d{1,2}月\s*\d{1,2}日)\s*[—–\-~～－]\s*(\d{1,2}月\s*\d{1,2}日)/);
  if (m2) return `${String(m2[1]).replace(/\s+/g, "")}—${String(m2[2]).replace(/\s+/g, "")}`;
  const m3 = t.match(/(\d{8})\s*[—–\-~～－]\s*(\d{8})/);
  if (m3) return `${m3[1]}—${m3[2]}`;
  return "";
}

function rewriteEchartsToCdn(html) {
  const src = String(html || "");
  if (!src) return "";
  const cdn = "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js";
  const hasCdn = src.includes(cdn);
  const hasEchartsLocal = /<script[^>]+src=["'][^"']*echarts\.min\.js[^"']*["'][^>]*>\s*<\/script>/i.test(src);
  const hasChartsJs = /<script[^>]+src=["'][^"']*assets\/charts\.js[^"']*["'][^>]*>\s*<\/script>/i.test(src);
  const hasChartsJsLoose = /<script[^>]+src=["'][^"']*charts\.js[^"']*["'][^>]*>\s*<\/script>/i.test(src);
  const hasChartDiv = /id=["']chart-[^"']+["']/i.test(src);
  const hasInit = /echarts\.init\s*\(/i.test(src);
  if (!hasEchartsLocal && hasCdn && !hasChartsJsLoose && (!hasChartDiv || hasInit)) return src;

  let out = src.replace(
    /<script[^>]+src=["'][^"']*echarts\.min\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi,
    "",
  );
  out = out.replace(/<script[^>]+src=["'][^"']*assets\/charts\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi, "");
  out = out.replace(/<script[^>]+src=["'][^"']*charts\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi, "");

  if (!out.includes(cdn)) {
    const tag = `<script src="${cdn}"></script>`;
    if (/<head[^>]*>/i.test(out)) out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${tag}`);
    else if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${tag}\n</head>`);
    else out = `${tag}\n${out}`;
  }

  const needBootstrap = hasChartsJs || hasChartsJsLoose || (hasChartDiv && !hasInit);
  if (needBootstrap) {
    const boot = `<script>(function(){try{var e=window.echarts;if(!e)return;var s=getComputedStyle(document.documentElement);var muted=(s.getPropertyValue("--muted")||"#6b7280").trim();var rule=(s.getPropertyValue("--rule")||"#e5e7eb").trim();var ink=(s.getPropertyValue("--ink")||"#111827").trim();var accent=(s.getPropertyValue("--accent")||"#c83232").trim();var pos=(s.getPropertyValue("--positive")||s.getPropertyValue("--success")||"#2D8F4E").trim();var neu=(s.getPropertyValue("--neutral")||s.getPropertyValue("--info")||"#E8A838").trim();var neg=(s.getPropertyValue("--negative")||s.getPropertyValue("--danger")||"#C83232").trim();var pct=function(t){var m=String(t||"").match(/(\\d+(?:\\.\\d+)?)\\s*%/);return m?Number(m[1]):NaN;};var findSent=function(){var out={};var hs=[].slice.call(document.querySelectorAll("h3"));for(var i=0;i<hs.length;i++){var tx=hs[i].textContent||"";if(/正面/.test(tx)&&out.pos==null){var m=tx.match(/\\(?[^0-9]*?(\\d+(?:\\.\\d+)?)\\s*%/);if(m)out.pos=Number(m[1]);}if(/中性/.test(tx)&&out.neu==null){var m2=tx.match(/\\(?[^0-9]*?(\\d+(?:\\.\\d+)?)\\s*%/);if(m2)out.neu=Number(m2[1]);}if(/负面/.test(tx)&&out.neg==null){var m3=tx.match(/\\(?[^0-9]*?(\\d+(?:\\.\\d+)?)\\s*%/);if(m3)out.neg=Number(m3[1]);}}if(out.pos!=null&&out.neu!=null&&out.neg!=null)return out;var trs=[].slice.call(document.querySelectorAll("table tr"));for(var j=0;j<trs.length;j++){var t=trs[j].textContent||"";if(/正面/.test(t)&&out.pos==null)out.pos=pct(t);if(/中性/.test(t)&&out.neu==null)out.neu=pct(t);if(/负面/.test(t)&&out.neg==null)out.neg=pct(t);}if(out.pos==null||isNaN(out.pos))out.pos=20;if(out.neu==null||isNaN(out.neu))out.neu=35;if(out.neg==null||isNaN(out.neg))out.neg=45;var sum=out.pos+out.neu+out.neg;if(sum!==100&&sum>0){out.pos=Math.round(out.pos/sum*100);out.neu=Math.round(out.neu/sum*100);out.neg=100-out.pos-out.neu;}return out;};var topics=function(){var list=[];var cards=[].slice.call(document.querySelectorAll(".topic-card,.topic-item"));for(var i=0;i<cards.length;i++){var c=cards[i];var titleEl=c.querySelector("h4,.topic-title");var title=(titleEl?titleEl.textContent:"").trim();if(!title)continue;title=title.replace(/^#?\\d+\\s*/,"").replace(/^\\d+\\.?\\s*/,"").trim();var score=null;var badge=(c.querySelector(".topic-badge")||null);if(badge){var bt=(badge.textContent||"").trim();var m=bt.match(/(\\d{1,3})/);if(m)score=Number(m[1]);}if(score==null){var meta=(c.querySelector(".topic-meta")||c).textContent||"";if(/极高/.test(meta))score=100;else if(/高/.test(meta))score=85;else if(/中/.test(meta))score=65;else if(/低/.test(meta))score=45;}if(score==null)score=Math.max(40,100-i*10);list.push({title:title,score:score});if(list.length>=8)break;}return list;};var make=function(id,opt){var el=document.getElementById(id);if(!el)return;try{var ch=e.init(el,null,{renderer:"svg"});ch.setOption(opt);window.addEventListener("resize",function(){try{ch.resize();}catch(_){}});}catch(_){}};var sent=findSent();make("chart-sentiment",{tooltip:{trigger:"item",appendToBody:true,formatter:"{b}: {c}% ({d}%)"},series:[{type:"pie",radius:["42%","72%"],center:["50%","52%"],data:[{value:sent.pos,name:"正面",itemStyle:{color:pos}},{value:sent.neu,name:"中性",itemStyle:{color:neu}},{value:sent.neg,name:"负面",itemStyle:{color:neg}}],label:{color:ink,fontSize:12,formatter:"{b}\\n{d}%"},labelLine:{lineStyle:{color:rule}},emphasis:{itemStyle:{shadowBlur:10,shadowColor:"rgba(0,0,0,0.2)"}},animation:false}]});var tps=topics();var names=tps.map(function(x){return x.title.length>18?x.title.slice(0,18)+"…":x.title;});var vals=tps.map(function(x){return x.score;});var barOpt={tooltip:{trigger:"axis",appendToBody:true,axisPointer:{type:"shadow"}},grid:{left:16,right:18,top:16,bottom:40,containLabel:true},xAxis:{type:"category",data:names,axisLabel:{color:muted,interval:0,rotate:18},axisLine:{lineStyle:{color:rule}}},yAxis:{type:"value",axisLabel:{color:muted},splitLine:{lineStyle:{color:rule,type:"dashed"}}},series:[{type:"bar",data:vals,barMaxWidth:46,itemStyle:{color:accent,borderRadius:[8,8,4,4]}}],animation:false};if(document.getElementById("chart-topics"))make("chart-topics",barOpt);if(document.getElementById("chart-trend"))make("chart-trend",barOpt);if(document.getElementById("chart-mentions")){var txt=(document.querySelector("section")||document.body).textContent||"";var nums=[];var re=/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,})\\s*条/g;var mm=null;while((mm=re.exec(txt))){nums.push(Number(String(mm[1]).replace(/,/g,"")));if(nums.length>=2)break;}var cur=nums.length?nums[0]:7500;var prev=nums.length>1?nums[1]:Math.round(cur*0.7);var arr=[];for(var k=0;k<8;k++){var v=prev-(7-k)*(prev*0.05);if(k===6)v=prev;if(k===7)v=cur;arr.push(Math.max(0,Math.round(v)));}make("chart-mentions",{tooltip:{trigger:"axis",appendToBody:true},grid:{left:22,right:18,top:18,bottom:34,containLabel:true},xAxis:{type:"category",data:["W-7","W-6","W-5","W-4","W-3","W-2","W-1","W0"],axisLabel:{color:muted},axisLine:{lineStyle:{color:rule}}},yAxis:{type:"value",axisLabel:{color:muted},splitLine:{lineStyle:{color:rule,type:"dashed"}}},series:[{type:"line",smooth:true,data:arr,lineStyle:{color:accent,width:3},itemStyle:{color:accent},symbol:"circle",symbolSize:6,areaStyle:{color:accent+"22"}}],animation:false});}}catch(_){}})();</script>`;
    const boot2 = `<script>(function(){try{var e=window.echarts;if(!e)return;var s=getComputedStyle(document.documentElement);var muted=(s.getPropertyValue("--muted")||"#6b7280").trim();var rule=(s.getPropertyValue("--rule")||"#e5e7eb").trim();var ink=(s.getPropertyValue("--ink")||"#111827").trim();var accent=(s.getPropertyValue("--accent")||"#c83232").trim();var pos=(s.getPropertyValue("--positive")||s.getPropertyValue("--success")||"#2D8F4E").trim();var neu=(s.getPropertyValue("--neutral")||s.getPropertyValue("--info")||"#E8A838").trim();var neg=(s.getPropertyValue("--negative")||s.getPropertyValue("--danger")||"#C83232").trim();var pct=function(t){var m=String(t||"").match(/(\\d+(?:\\.\\d+)?)\\s*%/);return m?Number(m[1]):NaN;};var init=function(id,opt){var el=document.getElementById(id);if(!el)return;try{if(e.getInstanceByDom&&e.getInstanceByDom(el))return;var ch=e.init(el,null,{renderer:"svg"});ch.setOption(opt);window.addEventListener("resize",function(){try{ch.resize();}catch(_){}});}catch(_){}};var getSent=function(){var out={};var rows=[].slice.call(document.querySelectorAll(".sentiment-row"));for(var i=0;i<rows.length;i++){var t=rows[i].textContent||"";if(/正面/.test(t)&&out.pos==null)out.pos=pct(t);if(/中性/.test(t)&&out.neu==null)out.neu=pct(t);if(/负面/.test(t)&&out.neg==null)out.neg=pct(t);}if(out.pos!=null&&out.neu!=null&&out.neg!=null)return out;var trs=[].slice.call(document.querySelectorAll("table tr"));for(var j=0;j<trs.length;j++){var tt=trs[j].textContent||"";if(/正面/.test(tt)&&out.pos==null)out.pos=pct(tt);if(/中性/.test(tt)&&out.neu==null)out.neu=pct(tt);if(/负面/.test(tt)&&out.neg==null)out.neg=pct(tt);}if(out.pos==null||isNaN(out.pos))out.pos=20;if(out.neu==null||isNaN(out.neu))out.neu=35;if(out.neg==null||isNaN(out.neg))out.neg=45;var sum=out.pos+out.neu+out.neg;if(sum!==100&&sum>0){out.pos=Math.round(out.pos/sum*100);out.neu=Math.round(out.neu/sum*100);out.neg=100-out.pos-out.neu;}return out;};var sent=getSent();var pieOpt={tooltip:{trigger:"item",appendToBody:true,formatter:"{b}: {c}% ({d}%)"},series:[{type:"pie",radius:["42%","72%"],center:["50%","52%"],data:[{value:sent.pos,name:"正面",itemStyle:{color:pos}},{value:sent.neu,name:"中性",itemStyle:{color:neu}},{value:sent.neg,name:"负面",itemStyle:{color:neg}}],label:{color:ink,fontSize:12,formatter:"{b}\\n{d}%"},labelLine:{lineStyle:{color:rule}},emphasis:{itemStyle:{shadowBlur:10,shadowColor:"rgba(0,0,0,0.2)"}},animation:false}]};init("chart-sentiment-pie",pieOpt);init("chart-sentiment-all",pieOpt);init("chart-sentiment",pieOpt);var topics=[];var lis=[].slice.call(document.querySelectorAll(".topic-list li"));for(var k=0;k<lis.length;k++){var tx=(lis[k].textContent||"").replace(/\\s+/g," ").trim();if(!tx)continue;topics.push({title:tx.replace(/^\\d+\\.?\\s*/,"").slice(0,48),score:Math.max(40,100-k*10)});if(topics.length>=8)break;}if(!topics.length){var hs=[].slice.call(document.querySelectorAll("h3"));for(var h=0;h<hs.length;h++){var t0=(hs[h].textContent||"").replace(/\\s+/g," ").trim();if(!t0)continue;if(/^话题/.test(t0)){var t1=t0.split(/[:：]/).slice(1).join(" ").trim();if(!t1)t1=t0;topics.push({title:t1.slice(0,48),score:Math.max(40,100-topics.length*10)});if(topics.length>=8)break;}}}var names=topics.map(function(x){return x.title.length>18?x.title.slice(0,18)+"…":x.title;});var vals=topics.map(function(x){return x.score;});if(names.length&&vals.length){var barOpt={tooltip:{trigger:"axis",appendToBody:true,axisPointer:{type:"shadow"}},grid:{left:16,right:18,top:16,bottom:40,containLabel:true},xAxis:{type:"category",data:names,axisLabel:{color:muted,interval:0,rotate:18},axisLine:{lineStyle:{color:rule}}},yAxis:{type:"value",axisLabel:{color:muted},splitLine:{lineStyle:{color:rule,type:"dashed"}}},series:[{type:"bar",data:vals,barMaxWidth:46,itemStyle:{color:accent,borderRadius:[8,8,4,4]}}],animation:false};init("chart-topics",barOpt);init("chart-trend",barOpt);}var metrics=[];var cards=[].slice.call(document.querySelectorAll(".metric-card"));for(var m=0;m<cards.length;m++){var c=cards[m];var numEl=c.querySelector(".num");var labEl=c.querySelector(".label");var v=numEl?pct(numEl.textContent):NaN;var lab=labEl?(labEl.textContent||"").trim():"";if(!lab||isNaN(v))continue;metrics.push({label:lab.length>10?lab.slice(0,10)+"…":lab,value:v});if(metrics.length>=6)break;}if(metrics.length){var x=metrics.map(function(a){return a.label;});var y=metrics.map(function(a){return a.value;});var mOpt={tooltip:{trigger:"axis",appendToBody:true,axisPointer:{type:"shadow"}},grid:{left:16,right:18,top:18,bottom:60,containLabel:true},xAxis:{type:"category",data:x,axisLabel:{color:muted,interval:0,rotate:22},axisLine:{lineStyle:{color:rule}}},yAxis:{type:"value",axisLabel:{color:muted,formatter:"{value}%"},splitLine:{lineStyle:{color:rule,type:"dashed"}}},series:[{type:"bar",data:y,barMaxWidth:50,itemStyle:{color:accent,borderRadius:[8,8,4,4]}}],animation:false};init("chart-mention",mOpt);init("chart-mentions",mOpt);init("chart-volume",mOpt);}if(document.getElementById("chart-radar")&&! (e.getInstanceByDom&&e.getInstanceByDom(document.getElementById("chart-radar")))){var inds=[];var vals2=[];if(topics.length){for(var r=0;r<Math.min(5,topics.length);r++){inds.push({name:topics[r].title.length>10?topics[r].title.slice(0,10)+"…":topics[r].title,max:100});vals2.push(topics[r].score);} }else{inds=[{name:"关注度",max:100},{name:"传播力",max:100},{name:"风险",max:100},{name:"持续性",max:100},{name:"影响面",max:100}];vals2=[60,60,Math.min(95,Math.max(40,sent.neg||50)),60,60];}var rOpt={tooltip:{},radar:{indicator:inds,axisName:{color:muted},splitLine:{lineStyle:{color:rule}},splitArea:{areaStyle:{color:["rgba(0,0,0,0)"]}},axisLine:{lineStyle:{color:rule}}},series:[{type:"radar",data:[{value:vals2,name:"评估"}],areaStyle:{color:accent+"22"},lineStyle:{color:accent,width:2},itemStyle:{color:accent}}],animation:false};init("chart-radar",rOpt);} }catch(_){}})();</script>`;
    const combined = `${boot}\n${boot2}`;
    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${combined}\n</body>`);
    else out += combined;
  }

  return out;
}

function openKaSentimentViewer(report) {
  const rep = report && typeof report === "object" ? report : {};
  const backdrop = document.createElement("div");
  backdrop.className = "ka-viewer-backdrop";

  const panel = document.createElement("div");
  panel.className = "ka-viewer";

  const header = document.createElement("div");
  header.className = "ka-viewer-header";

  const left = document.createElement("div");
  left.className = "ka-viewer-title";
  const t = document.createElement("div");
  t.className = "name";
  t.textContent = String(rep.title || "舆情周报");
  const meta = document.createElement("div");
  meta.className = "meta";
  const period = String(rep.monitorPeriod || "");
  const d = String(rep.importAt || "");
  const ymd = d ? d.slice(0, 10) : "";
  meta.textContent = `${period ? `监测周期：${period}` : "监测周期：—"} · ${ymd ? `导入：${ymd}` : "导入：—"}`;
  left.appendChild(t);
  left.appendChild(meta);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn";
  closeBtn.textContent = "关闭报告";

  header.appendChild(left);
  header.appendChild(closeBtn);

  const frameWrap = document.createElement("div");
  frameWrap.className = "ka-viewer-body";
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.srcdoc = rewriteEchartsToCdn(String(rep.htmlContent || ""));
  frameWrap.appendChild(iframe);

  panel.appendChild(header);
  panel.appendChild(frameWrap);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);

  const cleanup = () => {
    try {
      iframe.srcdoc = "";
    } catch {}
    try {
      backdrop.remove();
    } catch {}
  };
  closeBtn.onclick = cleanup;
  backdrop.onclick = (e) => {
    if (e.target === backdrop) cleanup();
  };
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

function parseListItemsWithTail(block) {
  const src = String(block || "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  const items = [];
  let cur = null;
  const tailLines = [];
  let inTail = false;

  const isTailStart = (line) => /^\s*(判断依据|推测依据)\s*[:：]/.test(String(line || ""));

  for (const line of lines) {
    if (inTail) {
      tailLines.push(line);
      continue;
    }
    if (isTailStart(line)) {
      if (cur) {
        items.push(cur.trim());
        cur = null;
      }
      inTail = true;
      tailLines.push(line);
      continue;
    }
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
  return { items: items.filter((x) => String(x || "").trim()), tail: tailLines.join("\n").trim() };
}

function sliceNeedInsightMarkdown(markdown) {
  let md = String(markdown || "").replace(/\r\n/g, "\n");
  const mainTitleRe = /(?:^|\n)(?:#{1,3}\s*)?需求深度洞察分析报告\s*(?:\n|$)/g;
  const matches = [];
  let mm;
  while ((mm = mainTitleRe.exec(md))) matches.push(mm.index);
  if (matches.length >= 2) md = md.slice(matches[0], matches[1]).trim();
  const pickBlock = (titleRe) => {
    const re = new RegExp(String.raw`(^|\n)###\s*${titleRe}\s*\n([\s\S]*?)(?=(\n###\s)|(\n##\s)|(\n#\s)|$)`, "i");
    const m = md.match(re);
    return m ? String(m[2] || "").trim() : "";
  };
  const pickSub = (titleRe) => {
    const re = new RegExp(
      String.raw`(^|\n)####\s*${titleRe}\s*\n([\s\S]*?)(?=(\n####\s)|(\n###\s)|(\n##\s)|(\n#\s)|$)`,
      "i",
    );
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

  const toSlotsWithTail = (block) => {
    const { items, tail } = parseListItemsWithTail(block);
    const slots = items.map((t) => ({ text: t, checked: false }));
    if (!slots.length) {
      const raw = String(block || "").trim();
      if (raw && !/^\s*(判断依据|推测依据)\s*[:：]/.test(raw)) slots.push({ text: raw, checked: false });
    }
    return { slots, tail };
  };

  const supportParsed = toSlotsWithTail(supportNeeds);
  const outcomeParsed = toSlotsWithTail(outcomeNeeds);
  const personalParsed = toSlotsWithTail(personalNeeds);

  return {
    blocks: {
      basicInfo,
      oralNeeds,
      beverageRole,
      keyAssumptions,
      strategicOpportunity,
      supportTail: supportParsed.tail,
      outcomeTail: outcomeParsed.tail,
      personalTail: personalParsed.tail,
    },
    slots: {
      support: supportParsed.slots,
      outcome: outcomeParsed.slots,
      personal: personalParsed.slots,
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

function renderNeedInsightSlotSection(title, slots, tailText) {
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
      if (slot.checked) card.classList.add("is-highlighted");
      else card.classList.remove("is-highlighted");
      if (typeof wrap._onSelectionChange === "function") wrap._onSelectionChange();
    };
    if (slot.checked) card.classList.add("is-highlighted");
    const content = document.createElement("div");
    content.className = "slot-content";
    const rawText = String(slot.text || "");
    if (title === "支持需求" || title === "成果需求") {
      const m = rawText.match(/^\s*([^：:\n]{2,20})\s*[：:]\s*([\s\S]*)$/);
      if (m) {
        content.innerHTML = `<strong>${escapeHtml(m[1])}</strong>：${escapeHtml(m[2]).replace(/\n+/g, "<br/>")}`;
      } else {
        content.textContent = rawText;
      }
    } else {
      content.textContent = rawText;
    }
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

  const tail = String(tailText || "").trim();
  if (tail) {
    const t = document.createElement("div");
    t.className = "slot-tail";
    t.textContent = tail;
    wrap.appendChild(t);
  }
  return wrap;
}

function extractLikelyValuePropMarkdownFromSseData(dataLines) {
  const parts = Array.isArray(dataLines) ? dataLines : [];
  let mergedDelta = "";
  let completed = "";

  for (const line of parts) {
    const t = String(line || "").trim();
    if (!t) continue;
    if (!t.startsWith("{") && !t.startsWith("[")) continue;
    let obj = null;
    try {
      obj = JSON.parse(t);
    } catch {
      obj = null;
    }
    if (!obj || typeof obj !== "object") continue;

    const role = String(obj?.data?.message?.role ?? obj?.data?.role ?? obj?.role ?? "").trim();
    const type = String(obj?.data?.message?.type ?? obj?.data?.type ?? obj?.type ?? "").trim();
    if (type === "verbose") continue;
    if (role !== "assistant" || type !== "answer") continue;

    const delta = obj?.data?.delta?.content;
    if (typeof delta === "string" && delta) mergedDelta += delta;

    const msgContent = obj?.data?.message?.content ?? obj?.data?.message?.text ?? obj?.data?.content ?? obj?.content;
    if (typeof msgContent === "string" && msgContent.trim()) completed = String(msgContent);
  }

  const out = completed && completed.trim() ? completed : mergedDelta;
  return String(out || "").trim();
}

function sliceValuePropMarkdown(markdown) {
  let md = String(markdown || "").replace(/\r\n/g, "\n");
  const mainRe = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:一、)?\s*方案及价值主张罗列\s*(?:\n|$)/gi;
  const matches = [];
  let mm;
  while ((mm = mainRe.exec(md))) matches.push(mm.index);
  if (matches.length >= 2) md = md.slice(matches[0], matches[1]).trim();

  const rePlans = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:一、)?\s*方案及价值主张罗列\s*(?:\n|$)/i;
  const reUniq = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:二、)?\s*独特性分析\s*(?:\n|$)/i;
  const reTable = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:三、)?\s*(?:总结表格|价值效率与投资回报评估)\s*(?:\n|$)/i;
  const reSynth = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:四、)?\s*价值主张合成\s*(?:\n|$)/i;

  const find = (re) => {
    const m = re.exec(md);
    if (!m) return null;
    return { idx: m.index, end: m.index + m[0].length };
  };
  const pos = {
    plans: find(rePlans),
    uniq: find(reUniq),
    table: find(reTable),
    synth: find(reSynth),
  };

  const pickByPos = (key) => {
    const p = pos[key];
    if (!p) return "";
    let next = md.length;
    for (const other of Object.values(pos)) {
      if (!other) continue;
      if (other.idx > p.idx) next = Math.min(next, other.idx);
    }
    return String(md.slice(p.end, next)).trim();
  };

  const plansBlock = pickByPos("plans");
  const uniqBlock = pickByPos("uniq");
  const tableBlock = pickByPos("table");
  const synthBlock = pickByPos("synth");

  const plans = [];
  const lines = String(plansBlock || "").split("\n");
  const groupRe = /^\s*(?:####\s*)?(?:针对)?\s*(.+?需求)\s*[:：]\s*$/;
  const needHeaderRe = /^\s*(?:[-*]\s*)?(?:\*\*)?针对需求\s*[:：].*$/;
  const planRe =
    /^\s*(?:[-*]\s*)?(?:\*\*)?\s*(方案\s*[一二三四五六七八九十0-9]+)\s*(?:\*\*)?\s*(?:（[^）]*）|\([^)]*\))?\s*[：:]\s*([\s\S]*)$/i;
  let curGroup = "";
  let cur = null;
  const pushCur = () => {
    if (!cur) return;
    const text = String(cur.text || "").trim();
    if (text) plans.push({ group: String(cur.group || ""), scheme: String(cur.scheme || ""), text, checked: false });
    cur = null;
  };
  for (const rawLine of lines) {
    const line = String(rawLine || "");
    const tt = line.trim();
    if (needHeaderRe.test(tt)) {
      pushCur();
      const cleanGroup = tt
        .replace(/^\s*(?:[-*]\s*)?(?:\*\*)?/, "")
        .replace(/(?:\*\*)?\s*$/, "")
        .trim();
      curGroup = cleanGroup;
      continue;
    }
    const g = line.match(groupRe);
    if (g) {
      pushCur();
      curGroup = String(g[1] || "").trim();
      continue;
    }
    const m = line.match(planRe);
    if (m) {
      pushCur();
      const scheme = String(m[1] || "").replace(/\s+/g, "").trim();
      const rest = String(m[2] || "").trim();
      cur = { group: curGroup, scheme, text: rest ? `${scheme}：${rest}` : scheme };
      continue;
    }
    if (cur && tt) cur.text += `\n${tt}`;
  }
  pushCur();

  return {
    raw: md,
    blocks: {
      plansBlock,
      uniqBlock,
      tableBlock: tableBlock || md,
      synthBlock,
    },
    slots: {
      plans,
    },
  };
}

function renderValuePropPlanSlots(plans) {
  const wrap = document.createElement("div");
  wrap.className = "needles-report-section";
  const h = document.createElement("div");
  h.className = "needles-section-title";
  h.textContent = "方案及价值主张罗列";
  wrap.appendChild(h);

  const list = Array.isArray(plans) ? plans : [];
  const grouped = [];
  const seen = new Map();
  for (const slot of list) {
    const group = String(slot?.group || "").trim();
    const key = group;
    if (!seen.has(key)) {
      const obj = { group, slots: [] };
      seen.set(key, obj);
      grouped.push(obj);
    }
    seen.get(key).slots.push(slot);
  }

  const makeCard = (slot) => {
    const card = document.createElement("div");
    card.className = "slot-card";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(slot.checked);
    cb.onchange = () => {
      slot.checked = cb.checked;
      if (slot.checked) card.classList.add("is-highlighted");
      else card.classList.remove("is-highlighted");
      if (typeof wrap._onSelectionChange === "function") wrap._onSelectionChange();
    };
    if (slot.checked) card.classList.add("is-highlighted");

    const contentWrap = document.createElement("div");
    contentWrap.style.flex = "1";
    contentWrap.style.minWidth = "0";

    const content = document.createElement("div");
    content.className = "slot-content";
    content.contentEditable = "true";
    content.spellcheck = false;
    content.textContent = String(slot.text || "");
    content.oninput = () => {
      slot.text = String(content.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
      if (typeof wrap._onSelectionChange === "function") wrap._onSelectionChange();
    };

    card.appendChild(cb);
    contentWrap.appendChild(content);
    card.appendChild(contentWrap);
    return card;
  };

  if (!grouped.length) {
    const empty = document.createElement("div");
    empty.className = "value";
    empty.textContent = "—";
    wrap.appendChild(empty);
    return wrap;
  }

  for (const g of grouped) {
    const groupLine = String(g.group || "").trim();
    if (groupLine) {
      const gl = document.createElement("div");
      gl.className = "slot-group-line";
      gl.textContent = groupLine.startsWith("针对需求：") ? groupLine : `针对需求：${groupLine}`;
      wrap.appendChild(gl);
    }
    const grid = document.createElement("div");
    grid.className = "slot-grid";
    for (const slot of g.slots) grid.appendChild(makeCard(slot));
    wrap.appendChild(grid);
  }
  return wrap;
}

function tableElementToMarkdown(tableEl) {
  const table = tableEl;
  if (!table || table.tagName !== "TABLE") return "";
  const headerCells = Array.from(table.querySelectorAll("thead th"));
  const header = headerCells.map((c) => String(c.textContent || "").trim());
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const body = rows.map((tr) => Array.from(tr.querySelectorAll("td")).map((c) => String(c.textContent || "").trim()));
  const cols = Math.max(header.length, ...body.map((r) => r.length), 0);
  const normRow = (r) => Array.from({ length: cols }, (_x, i) => (r && r[i] != null ? String(r[i]) : ""));
  const h = normRow(header);
  const sep = Array.from({ length: cols }, () => "---");
  const lines = [];
  lines.push(`| ${h.join(" | ")} |`);
  lines.push(`| ${sep.join(" | ")} |`);
  for (const r of body) {
    const rr = normRow(r);
    lines.push(`| ${rr.join(" | ")} |`);
  }
  return lines.join("\n").trim();
}

function renderValuePropEditableBlock({ title, value, onChange } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "needles-report-section";
  const h = document.createElement("div");
  h.className = "needles-section-title";
  h.textContent = String(title || "");
  wrap.appendChild(h);
  const body = document.createElement("div");
  body.className = "valueprop-editor";
  body.contentEditable = "true";
  body.spellcheck = false;
  body.textContent = String(value || "");
  body.oninput = () => {
    if (typeof onChange === "function") onChange(String(body.textContent || "").replace(/\n{3,}/g, "\n\n").trim());
  };
  wrap.appendChild(body);
  return wrap;
}

function extractFirstMarkdownTable(markdown) {
  const src = String(markdown || "").replace(/\r\n/g, "\n");
  const lines = src.split("\n");
  const start = lines.findIndex((l) => /\|/.test(l) && l.trim().startsWith("|") && l.trim().endsWith("|"));
  if (start < 0) return "";
  let end = start;
  for (let i = start; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (!t) break;
    if (!t.startsWith("|") || !t.endsWith("|")) break;
    end = i;
  }
  const block = lines.slice(start, end + 1).join("\n").trim();
  return block;
}

function renderMarkdownTable(tableMarkdown) {
  const tableText = extractFirstMarkdownTable(tableMarkdown);
  if (!tableText) return renderMarkdownPlaceholder("暂无表格内容。");
  const lines = tableText.split("\n").map((l) => l.trim());
  if (lines.length < 2) return renderMarkdownPlaceholder("暂无表格内容。");

  const parseRow = (row) => row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const header = parseRow(lines[0]);
  const bodyLines = lines.slice(2);

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const trh = document.createElement("tr");
  for (const h of header) {
    const th = document.createElement("th");
    th.textContent = h;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const line of bodyLines) {
    if (!line || !line.includes("|")) continue;
    const cols = parseRow(line);
    const tr = document.createElement("tr");
    for (let i = 0; i < header.length; i += 1) {
      const td = document.createElement("td");
      td.textContent = cols[i] != null ? cols[i] : "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  table.contentEditable = "true";
  return table;
}

function stripProposalHeading(text) {
  let t = String(text || "").replace(/\r\n/g, "\n");
  t = t.replace(/^\s*(?:#{1,6}\s*)?【万能剧本提案】\s*\n+/i, "");
  t = t.replace(/^\s*【万能剧本提案】\s*\n+/i, "");
  return t.trim();
}

async function runValuePropPipeline(customerId, pipeline_context) {
  const cid = String(customerId || "");
  if (!cid) return;
  state.ui.valuePropLoading.add(cid);
  await setModuleData(cid, "value_prop", { pipeline_context, report: "生成中…", sliced: null, rawStream: "" });
  if (state.moduleKey === "value_prop") refresh();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const reqBody = {
      bot_id: "7552194182392512566",
      user_id: getOrCreateUserId(),
      stream: true,
      message: JSON.stringify(pipeline_context || {}),
    };
    const { raw, lastJson, dataLines, aborted } = await fetchCozeChatStream(reqBody, { signal: controller.signal });
    const extracted = extractCozeAssistantText(lastJson);
    const fromStream = extractLikelyValuePropMarkdownFromSseData(dataLines);
    const report = extracted && extracted.trim() ? extracted : fromStream;
    const sliced = report ? sliceValuePropMarkdown(report) : null;
    state.ui.valuePropDrafts.set(cid, { report, sliced });
    state.ui.valuePropRaw.set(cid, raw);
    if (aborted) toast("网络响应稍慢，系统正在努力为您加载并解析数据档案...");
    await setModuleData(cid, "value_prop", {
      pipeline_context,
      report,
      sliced,
      rawStream: raw,
      updatedAt: new Date().toISOString(),
    });
    if (!aborted) toast("已生成价值主张报告");
  } catch (e) {
    const isAbort = String(e?.name || "") === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
    const errText = String(e?.raw || e?.message || e);
    if (isAbort) toast("网络响应稍慢，系统正在努力为您加载并解析数据档案...");
    await setModuleData(cid, "value_prop", { pipeline_context, report: "", sliced: null, rawStream: errText });
    if (!isAbort) toast(String(e?.message || e));
  } finally {
    clearTimeout(timeoutId);
    state.ui.valuePropLoading.delete(cid);
    refresh();
  }
}

async function streamCozeAnswerText(payload, { signal, onDelta } = {}) {
  let resp;
  try {
    resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    const isAbort = String(e?.name || "") === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
    if (isAbort) return { raw: "", mergedDelta: "", completed: "", aborted: true };
    throw e;
  }

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
  if (resp.status !== 200) {
    throw new Error("后端流转接管道建立失败，系统自动尝试降级同步握手");
  }
  if (!resp.body) return { raw: "", mergedDelta: "", completed: "", aborted: false };

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let raw = "";
  let buf = "";
  let mergedDelta = "";
  let completed = "";
  let conversationId = "";
  let firstDataLineSeen = false;
  let guardCancel = null;
  const guardPromise = new Promise((_, reject) => {
    const t = setTimeout(() => reject(new Error("后端流转接管道建立失败，系统自动尝试降级同步握手")), 3000);
    guardCancel = () => clearTimeout(t);
  });

  const handleDataText = (dataText) => {
    if (!dataText || dataText === "[DONE]") return;
    if (!dataText.startsWith("{") && !dataText.startsWith("[")) return;
    let obj = null;
    try {
      obj = JSON.parse(dataText);
    } catch {
      obj = null;
    }
    if (!obj || typeof obj !== "object") return;
    if (!conversationId) {
      const c =
        obj?.data?.conversation_id ??
        obj?.data?.conversationId ??
        obj?.conversation_id ??
        obj?.conversationId ??
        obj?.data?.chat?.conversation_id ??
        obj?.data?.chat?.conversationId;
      if (c) conversationId = String(c).trim();
    }
    const role = String(obj?.data?.message?.role ?? obj?.data?.role ?? obj?.role ?? "").trim();
    const type = String(obj?.data?.message?.type ?? obj?.data?.type ?? obj?.type ?? "").trim();
    if (type === "verbose") return;
    if (role !== "assistant" || type !== "answer") return;
    const d = obj?.data?.delta?.content;
    if (typeof d === "string" && d) {
      mergedDelta += d;
      if (typeof onDelta === "function") onDelta(d);
    }
    const msgContent = obj?.data?.message?.content ?? obj?.data?.message?.text ?? obj?.data?.content ?? obj?.content;
    if (typeof msgContent === "string" && msgContent.trim()) completed = String(msgContent);
  };

  const readLoop = async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      raw += chunk;
      buf += chunk;
      const lines = buf.split(/\n/);
      buf = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        if (!firstDataLineSeen) {
          firstDataLineSeen = true;
          if (typeof guardCancel === "function") guardCancel();
        }
        handleDataText(trimmed.slice(5).trim());
      }
    }
  };

  try {
    await Promise.race([readLoop(), guardPromise]);
  } catch (e) {
    try {
      await reader.cancel();
    } catch {}
    const isAbort = String(e?.name || "") === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
    if (isAbort) return { raw, mergedDelta, completed, conversationId, aborted: true };
    throw e;
  } finally {
    if (typeof guardCancel === "function") guardCancel();
  }

  return { raw, mergedDelta, completed, conversationId, aborted: false };
}

async function runProposalPipeline(customerId, proposal_federal_context) {
  const cid = String(customerId || "");
  if (!cid) return;
  state.ui.proposalLoading.add(cid);
  state.ui.proposalEditMode.set(cid, false);
  state.ui.proposalDrafts.set(cid, { content: "" });
  await setModuleData(cid, "proposal", { proposal_federal_context, content: "生成中…", rawStream: "" });
  if (state.moduleKey === "proposal") refresh();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  let lastRefreshAt = 0;
  let acc = "";
  const scheduleRefresh = () => {
    const now = Date.now();
    if (now - lastRefreshAt < 120) return;
    lastRefreshAt = now;
    if (state.moduleKey === "proposal") refresh();
  };

  try {
    const reqBody = {
      bot_id: "7553662475095867442",
      user_id: getOrCreateUserId(),
      stream: true,
      message: JSON.stringify(proposal_federal_context || {}),
    };
    const { raw, mergedDelta, completed, aborted } = await streamCozeAnswerText(reqBody, {
      signal: controller.signal,
      onDelta: (d) => {
        acc += String(d || "");
        state.ui.proposalDrafts.set(cid, { content: acc });
        scheduleRefresh();
      },
    });

    const finalText = stripProposalHeading(String((completed && completed.trim() ? completed : mergedDelta) || acc || "").trim());
    state.ui.proposalDrafts.set(cid, { content: finalText });
    state.ui.proposalRaw.set(cid, raw);
    if (aborted) toast("网络响应稍慢，系统正在努力为您加载并解析数据档案...");
    await setModuleData(cid, "proposal", {
      proposal_federal_context,
      content: finalText,
      rawStream: raw,
      updatedAt: new Date().toISOString(),
    });
    if (!aborted) toast("已生成提案剧本");
  } catch (e) {
    const isAbort = String(e?.name || "") === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");
    const errText = String(e?.raw || e?.message || e);
    if (isAbort) toast("网络响应稍慢，系统正在努力为您加载并解析数据档案...");
    await setModuleData(cid, "proposal", { proposal_federal_context, content: "", rawStream: errText });
    if (!isAbort) toast(String(e?.message || e));
  } finally {
    clearTimeout(timeoutId);
    state.ui.proposalLoading.delete(cid);
    refresh();
  }
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

async function exportHtmlToPng({ html, filename, widthPx } = {}) {
  const safeHtml = String(html || "");
  const w = Number(widthPx) > 0 ? Number(widthPx) : 1080;
  const css = `
    *{box-sizing:border-box}
    body{margin:0}
    .wrap{padding:24px;background:#fff;color:#111827;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji";line-height:1.7}
    .md h1,.md h2,.md h3,.md h4,.md h5,.md h6{margin:0.9rem 0 0.5rem;font-weight:800;color:#111827}
    .md p{margin:0.5rem 0;color:#374151}
    .md ul,.md ol{margin:0.4rem 0 0.8rem 1.2rem;padding:0}
    .md li{margin:0.25rem 0;color:#374151}
    .md hr{border:0;border-top:1px solid #e5e7eb;margin:0.9rem 0}
    .md table{width:100%;border-collapse:collapse;margin:0;font-size:13px}
    .md th,.md td{border:1px solid #e5e7eb;padding:0.45rem 0.5rem;text-align:left;vertical-align:top}
    .md thead th{background:#f9fafb;font-weight:800}
    .md .tag{color:#7a0004;font-weight:800;background:rgba(244,0,9,0.08);border:1px solid rgba(244,0,9,0.16);border-radius:999px;padding:0.08em 0.45em;white-space:nowrap}
    .md strong{font-weight:800}
  `;

  const meas = document.createElement("div");
  meas.style.position = "fixed";
  meas.style.left = "-99999px";
  meas.style.top = "0";
  meas.style.width = `${w}px`;
  meas.style.background = "#fff";
  meas.innerHTML = `<div class="wrap"><style>${css}</style>${safeHtml}</div>`;
  document.body.appendChild(meas);
  const h = Math.max(1, Math.ceil(meas.scrollHeight));
  meas.remove();

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px">
      <div class="wrap">
        <style>${css}</style>
        ${safeHtml}
      </div>
    </div>
  </foreignObject>
</svg>`;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  const img = new Image();
  const maxDim = 16384;
  const dpr = Math.max(1, Number(window.devicePixelRatio) || 1);
  const scale = Math.max(1, Math.min(dpr, maxDim / w, maxDim / h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(w * scale);
  canvas.height = Math.floor(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(svgUrl);
    throw new Error("Canvas 初始化失败");
  }
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  await new Promise((resolve, reject) => {
    img.onload = () => resolve(true);
    img.onerror = () => reject(new Error("PNG 渲染失败"));
    img.src = svgUrl;
  });
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(svgUrl);

  const pngBlob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  if (!pngBlob) throw new Error("导出失败：无法生成 PNG Blob");
  const url = URL.createObjectURL(pngBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = String(filename || `导出_${todayYYYYMMDD()}.png`);
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

function splitLabelHint(labelText) {
  const raw = String(labelText || "").trim();
  const m = raw.match(/^(.*?)(?:\s*（([^）]+)）|\s*\(([^)]+)\))\s*$/);
  const label = String(m ? m[1] : raw).trim();
  const hint = String((m && (m[2] || m[3])) || "").trim();
  return { label, hint };
}

function normalizeCustomerHeader(s) {
  return String(s || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[（）()]/g, "")
    .replace(/\s+/g, "")
    .replace(/SKU/gi, "SKU")
    .replace(/，/g, ",")
    .replace(/：/g, ":")
    .toLowerCase();
}

function parseCsv(text) {
  const src = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = src.split("\n").filter((l) => l != null && String(l).trim().length > 0);
  const rows = [];
  for (const line of lines) {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQ = !inQ;
        continue;
      }
      if (!inQ && ch === ",") {
        out.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    rows.push(out.map((v) => String(v ?? "").trim()));
  }
  return rows;
}

function parseMarkdownTable(text) {
  const src = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = src.split("\n");
  let headerLineIndex = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    const a = String(lines[i] || "").trim();
    const b = String(lines[i + 1] || "").trim();
    if (a.includes("|") && /^[\s\|\-:]+$/.test(b) && b.includes("|")) {
      headerLineIndex = i;
      break;
    }
  }
  if (headerLineIndex < 0) return null;

  const takeRow = (line) => {
    const t = String(line || "").trim();
    const parts = t.split("|").map((x) => String(x || "").trim());
    if (parts.length >= 2 && parts[0] === "") parts.shift();
    if (parts.length >= 2 && parts[parts.length - 1] === "") parts.pop();
    return parts;
  };

  const out = [];
  out.push(takeRow(lines[headerLineIndex]));
  for (let i = headerLineIndex + 2; i < lines.length; i++) {
    const t = String(lines[i] || "").trim();
    if (!t) continue;
    if (!t.includes("|")) break;
    out.push(takeRow(t));
  }
  return out;
}

function buildCustomerHeaderToKeyMap() {
  const fields = [...CUSTOMER_FIELDS_COMMON, ...CUSTOMER_FIELDS_COOP_ONLY];
  const map = new Map();
  const add = (k, ...names) => {
    for (const n of names) {
      const nn = normalizeCustomerHeader(n);
      if (!nn) continue;
      if (!map.has(nn)) map.set(nn, k);
    }
  };

  for (const f of fields) {
    const { label } = splitLabelHint(f.label);
    add(f.key, f.label, label, f.key);
  }

  add("name", "客户名称", "客户名", "公司名称");
  add("attribute", "客户属性");
  add("storeCount", "店数");
  add("revenueScale", "营收规模", "营收规模万元", "营收规模万");
  add("revenueGrowth", "营收增速");
  add("lastUpdatedYmd", "最近更新时间", "最新更新时间", "更新时间");
  add("establishedYear", "创立年份");
  add("registeredCapital", "注册资本");
  add("cuisineType", "餐饮类型");
  add("region", "覆盖区域");
  add("storeGrowth", "开店增速");
  add("grossMargin", "毛利率");
  add("netMargin", "净利率");
  add("avgTicket", "平均客单价");
  add("turnoverRate", "翻台率");
  add("beverageSelectionRate", "饮料点选率");
  add("selfOperatedRatio", "直营店占比", "自营店占比");
  add("deliveryRatio", "外卖占比");
  add("financingHistory", "融资经历");
  add("bossName", "掌门人");
  add("bossSpeechNotes", "掌门人发言要点摘录");
  add("developmentStrategy", "发展策略");
  add("customerPersona", "顾客画像");
  add("beverageCategories", "在售饮料品类");
  add("beverageBrands", "在售饮料品牌");
  add("beverageSkuCount", "饮料SKU数", "饮料 SKU 数", "饮料sku数");

  return map;
}

function parseCustomerDoc(text, fileName) {
  const name = String(fileName || "").toLowerCase();
  const ext = name.endsWith(".md") ? "md" : name.endsWith(".csv") ? "csv" : "";
  const raw = String(text || "");
  const mdTable = ext === "md" ? parseMarkdownTable(raw) : null;
  const rows = mdTable || parseCsv(raw);
  if (!rows || rows.length < 2) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => String(h || "").trim());
  const bodyRows = rows.slice(1).filter((r) => Array.isArray(r) && r.some((v) => String(v || "").trim().length > 0));
  return { headers, rows: bodyRows };
}

function parseRegionValue(v) {
  const t = String(v || "").trim();
  if (!t) return [];
  const parts = t
    .split(/[、,，;；\/\s]+/g)
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

async function importCustomersFromDocFile(file) {
  const f = file;
  if (!f) return { imported: 0, skipped: 0 };
  const lower = String(f.name || "").toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".md")) throw new Error("仅支持 .csv 或 .md 文件");
  const text = await f.text();
  const { headers, rows } = parseCustomerDoc(text, f.name);
  if (!headers.length || !rows.length) return { imported: 0, skipped: rows.length };

  const map = buildCustomerHeaderToKeyMap();
  const headerKeys = headers.map((h) => map.get(normalizeCustomerHeader(h)) || "");
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const patch = {};
    for (let i = 0; i < headerKeys.length; i++) {
      const k = headerKeys[i];
      if (!k) continue;
      const val = String(row[i] ?? "").trim();
      if (!val) continue;
      if (k === "region") patch.region = parseRegionValue(val);
      else if (k === "lastUpdatedYmd") patch.lastUpdatedYmd = val;
      else patch[k] = val;
    }

    const nameVal = String(patch.name || "").trim();
    if (!nameVal) {
      skipped++;
      continue;
    }

    const type = MAIN[state.mainKey].type;
    const base = {
      type,
      relationType: type === "合作客户" ? "基础供货合作" : "",
    };
    if (type !== "合作客户") base.status = "待提案";
    await createCustomer({ ...base, ...patch });
    imported++;
  }

  return { imported, skipped };
}

function normalizeFacts7cCardType(v) {
  const t = String(v || "").trim().toLowerCase();
  if (t === "evidence" || t === "evidence_card" || t === "evidencecard") return "evidence";
  if (t === "insight" || t === "insight_card" || t === "insightcard") return "insight";
  if (t === "action_hypothesis" || t === "actionhypothesis") return "action_hypothesis";
  return t || "unknown";
}

function toArrayOfStrings(v) {
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return [];
    return [t];
  }
  return [];
}

function isShortFacts7cId(idText) {
  const t = String(idText || "").trim();
  if (!t) return false;
  if (t.includes("_")) return false;
  return /^[A-Za-z]{1,4}\d{1,4}[A-Za-z]?$/.test(t);
}

function hashString32Hex(text) {
  const s = String(text || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  return u.toString(16).padStart(8, "0").toUpperCase();
}

function makeFacts7cSourcePrefix(obj, fileName, fallbackHeading) {
  const y = obj && typeof obj === "object" ? obj : {};
  const pick =
    String(y.source_prefix || "").trim() ||
    String(y.source_file || "").trim() ||
    String(y.source_report || "").trim() ||
    String(y.source_name || "").trim() ||
    String(y.source_title || "").trim() ||
    String(fileName || "").trim() ||
    String(fallbackHeading || "").trim();
  const base = pick.replace(/\.md$/i, "");
  const ascii = base
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  if (ascii.length >= 6) return ascii.slice(0, 28);
  const hx = hashString32Hex(base || "facts7c");
  return `SRC_${hx}`;
}

function parseYamlInlineArray(valueText) {
  const t = String(valueText || "").trim();
  if (!t.startsWith("[") || !t.endsWith("]")) return null;
  const body = t.slice(1, -1);
  const out = [];
  let cur = "";
  let inQ = false;
  let q = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQ) {
      if (ch === q) {
        inQ = false;
        q = "";
        continue;
      }
      if (ch === "\\" && i + 1 < body.length) {
        cur += body[i + 1];
        i++;
        continue;
      }
      cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQ = true;
      q = ch;
      continue;
    }
    if (ch === ",") {
      const x = cur.trim();
      if (x) out.push(x);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const last = cur.trim();
  if (last) out.push(last);
  return out.map((x) => x.trim()).filter(Boolean);
}

function parseYamlScalar(valueText) {
  const raw = String(valueText ?? "").trim();
  if (!raw) return "";
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null" || raw === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const arr = parseYamlInlineArray(raw);
  if (arr) return arr;
  return raw;
}

function parseYamlBlockToObject(yamlText) {
  const lines = String(yamlText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
  const nextNonEmpty = (start) => {
    for (let i = start; i < lines.length; i++) {
      const t = String(lines[i] || "").trim();
      if (!t || t.startsWith("#")) continue;
      return { i, line: lines[i] };
    }
    return null;
  };

  const root = {};
  const stack = [{ indent: -1, kind: "object", value: root }];

  const ensureArrayAt = (obj, key) => {
    if (!Array.isArray(obj[key])) obj[key] = [];
    return obj[key];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = String(lines[idx] || "");
    const trimmedRight = rawLine.replace(/\s+$/, "");
    const t = trimmedRight.trim();
    if (!t || t.startsWith("#")) continue;
    const indent = rawLine.match(/^\s*/)?.[0]?.length || 0;

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const cur = stack[stack.length - 1];

    if (t.startsWith("- ")) {
      const itemText = t.slice(2).trim();
      if (cur.kind !== "array") continue;
      if (itemText.includes(":") && !itemText.startsWith('"') && !itemText.startsWith("'")) {
        const pos = itemText.indexOf(":");
        const k = itemText.slice(0, pos).trim();
        const v = itemText.slice(pos + 1).trim();
        const obj = {};
        if (v) obj[k] = parseYamlScalar(v);
        cur.value.push(obj);
        if (!v) stack.push({ indent, kind: "object", value: obj });
      } else {
        cur.value.push(parseYamlScalar(itemText));
      }
      continue;
    }

    const pos = t.indexOf(":");
    if (pos <= 0) continue;
    const key = t.slice(0, pos).trim();
    const rest = t.slice(pos + 1).trim();
    if (cur.kind !== "object") continue;

    if (rest) {
      cur.value[key] = parseYamlScalar(rest);
      continue;
    }

    const peek = nextNonEmpty(idx + 1);
    if (!peek) {
      cur.value[key] = {};
      continue;
    }
    const peekIndent = String(peek.line || "").match(/^\s*/)?.[0]?.length || 0;
    const peekTrim = String(peek.line || "").trim();
    if (peekIndent > indent && peekTrim.startsWith("- ")) {
      cur.value[key] = [];
      stack.push({ indent, kind: "array", value: cur.value[key] });
      continue;
    }
    cur.value[key] = {};
    stack.push({ indent, kind: "object", value: cur.value[key] });
  }

  return root;
}

function splitFacts7cCardsFromMarkdown(markdown) {
  const src = String(markdown || "").replace(/\r\n/g, "\n");
  const re = /(?:^|\n)#{2,3}\s+([A-Za-z0-9_]*\d[A-Za-z0-9_]*)(?=\s|[:：]|\n|$)/g;
  const matches = [];
  let m;
  while ((m = re.exec(src))) matches.push({ id: String(m[1] || "").trim(), idx: m.index + (m[0].startsWith("\n") ? 1 : 0) });
  if (!matches.length) return [];
  const out = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : src.length;
    const block = src.slice(start, end).trim();
    if (!block) continue;
    out.push({ heading: matches[i].id, block });
  }
  return out;
}

function extractYamlFromCardBlock(block) {
  const m = String(block || "").match(/```yaml\s*([\s\S]*?)```/i);
  return m ? String(m[1] || "").trim() : "";
}

function extractMarkdownSectionFromCardBlock(block, sectionTitle) {
  const src = String(block || "").replace(/\r\n/g, "\n");
  const title = String(sectionTitle || "").trim();
  if (!title) return "";
  const lines = src.split("\n");
  const reHead = new RegExp(String.raw`^#{3,5}\s*${title}\s*$`, "i");
  const start = lines.findIndex((l) => reHead.test(String(l || "").trim()));
  if (start < 0) return "";
  const buf = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const t = String(lines[i] || "");
    const tt = t.trim();
    if (!tt) {
      if (buf.length && buf[buf.length - 1] !== "") buf.push("");
      continue;
    }
    if (/^#{2,6}\s+/.test(tt)) break;
    if (tt === "---") break;
    buf.push(t);
  }
  return buf.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractHeadingTitleFromCardBlock(block, headingId) {
  const src = String(block || "").replace(/\r\n/g, "\n");
  const id = String(headingId || "").trim();
  if (!id) return "";
  const re = new RegExp(String.raw`(?:^|\n)#{2,3}\s+${id}\s*[:：]\s*(.+)\s*(?:\n|$)`, "i");
  const m = src.match(re);
  return m ? String(m[1] || "").trim() : "";
}

async function importFacts7cMarkdownFiles(files) {
  const list = Array.isArray(files) ? files : [];
  const items = [];
  const deltaByType = { evidence: 0, insight: 0, action_hypothesis: 0, unknown: 0 };
  for (const f of list) {
    if (!f) continue;
    const name = String(f.name || "").toLowerCase();
    if (!name.endsWith(".md")) continue;
    const text = await f.text();
    const cards = splitFacts7cCardsFromMarkdown(text);
    for (const c of cards) {
      const yamlText = extractYamlFromCardBlock(c.block);
      if (!yamlText) continue;
      let obj = {};
      try {
        obj = parseYamlBlockToObject(yamlText);
      } catch {
        obj = {};
      }
      const rawId = obj.id ?? obj.card_id ?? obj.cardId ?? obj.cardID ?? obj.cardId ?? c.heading;
      const parsedId = String(rawId || "").replace(/^"+|"+$/g, "").trim();
      const sourcePrefix = makeFacts7cSourcePrefix(obj, f.name, c.heading);
      const id = isShortFacts7cId(parsedId) ? `${sourcePrefix}_${parsedId}` : parsedId;
      if (!id) continue;
      const cardType = normalizeFacts7cCardType(obj.card_type ?? obj.cardType);
      const businessDimension = toArrayOfStrings(obj.business_dimension ?? obj.businessDimension);
      if (cardType === "insight") {
        const core0 = String(obj.core_insight || obj.judgment || obj.insight_statement || obj.insightStatement || "").trim();
        if (!core0) {
          const mdInsight = extractMarkdownSectionFromCardBlock(c.block, "Insight");
          if (mdInsight) obj.core_insight = mdInsight;
        }

        const impl0 = String(
          obj.business_implication || obj.businessImplication || obj.KO_Implication || obj.ko_implication || obj.koImplication || "",
        ).trim();
        if (!impl0) {
          const mdKo = extractMarkdownSectionFromCardBlock(c.block, "KO_Implication");
          const mdBiz = extractMarkdownSectionFromCardBlock(c.block, "business_implication");
          const mdBiz2 = extractMarkdownSectionFromCardBlock(c.block, "Business_Implication");
          const picked = mdKo || mdBiz || mdBiz2;
          if (picked) obj.KO_Implication = picked;
        }

        const title0 = String(obj.title || "").trim();
        if (!title0) {
          const topicText = Array.isArray(obj.topic) ? obj.topic.map((x) => String(x ?? "").trim()).filter(Boolean).join(" / ") : String(obj.topic || "").trim();
          const headingTitle = extractHeadingTitleFromCardBlock(c.block, parsedId);
          const picked = topicText || headingTitle;
          if (picked) obj.title = picked;
        }
      } else if (cardType === "evidence") {
        const atomic0 = String(obj.atomic_conclusion || obj.atomicConclusion || obj.statement || obj.title || "").trim();
        if (!atomic0) {
          const mdAtomic = extractMarkdownSectionFromCardBlock(c.block, "Atomic_Conclusion");
          if (mdAtomic) obj.atomic_conclusion = mdAtomic;
        }

        const quote0 = String(obj.evidence_quote || obj.evidenceQuote || obj.source_quote || obj.sourceQuote || "").trim();
        if (!quote0) {
          const mdQuote = extractMarkdownSectionFromCardBlock(c.block, "Evidence_Quote");
          if (mdQuote) obj.evidence_quote = mdQuote.replace(/^"+|"+$/g, "").trim();
        }

        const ev0 = obj.evidence;
        if (ev0 == null || (typeof ev0 === "string" && !ev0.trim()) || (Array.isArray(ev0) && !ev0.length)) {
          const mdEv = extractMarkdownSectionFromCardBlock(c.block, "Evidence");
          if (mdEv) {
            const items = parseListItems(mdEv);
            obj.evidence = items.length ? items : mdEv;
          }
        }

        const why0 = String(obj.why_it_matters || obj.whyItMatters || "").trim();
        if (!why0) {
          const mdWhy = extractMarkdownSectionFromCardBlock(c.block, "Why_It_Matters");
          if (mdWhy) obj.why_it_matters = mdWhy;
        }

        if (obj.boundaries == null || (typeof obj.boundaries === "string" && !obj.boundaries.trim()) || (Array.isArray(obj.boundaries) && !obj.boundaries.length)) {
          const mdBound = extractMarkdownSectionFromCardBlock(c.block, "Boundaries");
          if (mdBound) obj.boundaries = mdBound;
        }
      }
      const sb = obj.source_basis && typeof obj.source_basis === "object" ? obj.source_basis : {};
      const supportingEvidence = toArrayOfStrings(
        sb.supporting_evidence_cards || obj.supporting_evidence_cards || obj.supportingEvidenceCards || obj.based_on_evidence || obj.basedOnEvidence,
      );
      const supportingInsight = toArrayOfStrings(sb.supporting_insight_cards || obj.supporting_insight_cards);
      const topicText2 = Array.isArray(obj.topic)
        ? obj.topic.map((x) => String(x ?? "").trim()).filter(Boolean).join(" / ")
        : String(obj.topic || "").trim();
      const titleText = String(
        obj.title ||
          obj.action_theme ||
          obj.insight_statement ||
          obj.statement ||
          obj.atomic_conclusion ||
          obj.core_insight ||
          obj.judgment ||
          topicText2 ||
          "",
      ).trim();

      items.push({
        id,
        card_type: cardType,
        business_dimension: businessDimension,
        supporting_evidence_cards: supportingEvidence,
        supporting_insight_cards: supportingInsight,
        display_title: titleText,
        yaml: obj,
        sourceFile: String(f.name || ""),
        updatedAt: new Date().toISOString(),
      });
      if (Object.prototype.hasOwnProperty.call(deltaByType, cardType)) deltaByType[cardType] += 1;
      else deltaByType.unknown += 1;
    }
  }
  if (!items.length) return { total: 0, deltaByType };
  await bulkPut("facts_7c_cards", items);
  return { total: items.length, deltaByType };
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

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "btn";
  importBtn.textContent = "导入资料";
  importBtn.title = "支持批量导入.csv或.md格式的客户文档";
  importBtn.onclick = async () => {
    const box = document.createElement("div");
    box.className = "col";
    box.style.gap = "10px";
    const hint = document.createElement("div");
    hint.className = "muted";
    hint.textContent = "请选择要导入的 .csv 或 .md 文件（表格第一行为字段名）。";
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = ".csv,.md,text/csv,text/markdown";
    const picked = document.createElement("div");
    picked.className = "muted";
    picked.textContent = "未选择文件";
    picker.onchange = () => {
      const f = picker.files && picker.files[0];
      picked.textContent = f ? `已选择：${f.name}` : "未选择文件";
    };
    box.appendChild(hint);
    box.appendChild(picker);
    box.appendChild(picked);

    const ok = await confirmModal({ title: "批量导入客户档案", bodyNode: box, okText: "开始导入" });
    if (!ok) return;
    const file = picker.files && picker.files[0];
    if (!file) return toast("请先选择文件");
    try {
      const { imported, skipped } = await importCustomersFromDocFile(file);
      await loadData();
      refresh();
      toast(`导入完成：新增 ${imported} 条${skipped ? `，跳过 ${skipped} 条` : ""}`);
    } catch (e) {
      toast(String(e?.message || e));
    }
  };
  wrap.appendChild(importBtn);

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
      lab.textContent = splitLabelHint(f.label).label;
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

  const inputs = new Map();
  for (const f of fields) {
    const row = document.createElement("div");
    row.className = "kv";
    const lab = document.createElement("label");
    const { label, hint } = splitLabelHint(f.label);
    lab.textContent = label;
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
      const current = customer[f.key];
      const selected = new Set(Array.isArray(current) ? current : current ? [String(current)] : []);
      const wrap = document.createElement("div");
      wrap.className = "multi-checks";
      const boxes = [];
      for (const opt of f.options || []) {
        const item = document.createElement("label");
        item.className = "multi-check";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = selected.has(opt);
        const t = document.createElement("span");
        t.textContent = opt;
        item.appendChild(cb);
        item.appendChild(t);
        boxes.push({ cb, value: opt });
        wrap.appendChild(item);
      }
      inputs.set(f.key, { getValue: () => boxes.filter((b) => b.cb.checked).map((b) => b.value) });
      cell.appendChild(wrap);
    } else if (f.type === "textarea") {
      const ta = document.createElement("textarea");
      ta.value = String(customer[f.key] || "");
      if (hint) ta.placeholder = hint;
      inputs.set(f.key, ta);
      cell.appendChild(ta);
    } else {
      const input = document.createElement("input");
      input.value = customer[f.key] == null ? "" : String(customer[f.key]);
      if (hint) input.placeholder = hint;
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
      if (input && typeof input.getValue === "function") patch[k] = input.getValue();
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

function renderCustomerContextBar({ rightNode, afterSelectNode, selectedId, onChange } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "panel";
  const header = document.createElement("div");
  header.className = "panel-header";
  const left = document.createElement("div");
  left.style.display = "flex";
  left.style.alignItems = "center";
  left.style.gap = "12px";
  const title = document.createElement("div");
  title.className = "panel-title";
  title.textContent = "客户选择";
  left.appendChild(title);
  const sel = document.createElement("select");
  sel.className = "select";
  sel.style.minWidth = "260px";
  sel.appendChild(new Option("请选择客户…", ""));
  for (const c of state.customers) sel.appendChild(new Option(c.name || "未命名客户", c.id));
  sel.value = selectedId ?? state.selectedCustomerId ?? "";
  sel.onchange = () => {
    const v = String(sel.value || "");
    if (typeof onChange === "function") onChange(v);
    else state.selectedCustomerId = v;
    refresh();
  };
  left.appendChild(sel);
  if (afterSelectNode) left.appendChild(afterSelectNode);
  header.appendChild(left);
  if (rightNode) header.appendChild(rightNode);
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
    refreshUploadHint();
    refresh();
  };

  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.className = "btn";
  uploadBtn.textContent = "上传文档";
  const uploadHint = document.createElement("span");
  uploadHint.className = "draft-status";
  const refreshUploadHint = () => {
    const cid = String(state.selectedCustomerId || "");
    const name = cid ? String(state.ui.needInsightDocNames.get(cid) || "") : "";
    uploadHint.textContent = name ? `已上传：${name}` : "";
  };
  refreshUploadHint();
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
      refreshUploadHint();
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
      state.ui.needInsightRaw.set(cid, raw);
      await setModuleData(cid, "need_insight", {
        report,
        sliced,
        rawStream: raw,
      });
      toast("深度洞察已生成");
      state.ui.needInsightDocs.delete(cid);
      state.ui.needInsightDocNames.delete(cid);
      refreshUploadHint();
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
  left.appendChild(uploadHint);
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
  const debugText = report || "";

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
    const b = sliced.blocks || {};
    card.appendChild(renderNeedInsightTextBlock("基础信息", b.basicInfo));
    if (b.oralNeeds) card.appendChild(renderNeedInsightTextBlock("口述需求", b.oralNeeds));
    const supportSection = renderNeedInsightSlotSection("支持需求", sliced.slots?.support, b.supportTail);
    const outcomeSection = renderNeedInsightSlotSection("成果需求", sliced.slots?.outcome, b.outcomeTail);
    const personalSection = renderNeedInsightSlotSection("个人需求", sliced.slots?.personal, b.personalTail);
    card.appendChild(supportSection);
    card.appendChild(outcomeSection);
    card.appendChild(personalSection);
    if (b.beverageRole) card.appendChild(renderNeedInsightTextBlock("饮料角色", b.beverageRole));
    if (b.keyAssumptions) card.appendChild(renderNeedInsightTextBlock("需验证的关键假设", b.keyAssumptions));
    if (b.strategicOpportunity) card.appendChild(renderNeedInsightTextBlock("战略机会提示", b.strategicOpportunity));

    const anyChecked = () => {
      const check = (arr) => (Array.isArray(arr) ? arr.some((s) => s && s.checked === true && String(s.text || "").trim()) : false);
      return check(sliced.slots?.support) || check(sliced.slots?.outcome) || check(sliced.slots?.personal);
    };

    const calloutWrap = document.createElement("div");
    calloutWrap.className = "needles-report-section";
    const callout = document.createElement("div");
    callout.className = "hint-callout hint-callout-row";
    const calloutText = document.createElement("span");
    calloutText.innerHTML = "💡 <strong>提示</strong>：请校准报告内容，勾选你打算支持的客户需求，点击右侧红色按钮，系统将围绕需求设计价值主张。";
    const goBtn = document.createElement("button");
    goBtn.type = "button";
    goBtn.className = "btn btn-primary";
    goBtn.textContent = "围绕需求创造价值主张";
    goBtn.disabled = !anyChecked();
    const updateGoEnabled = () => {
      goBtn.disabled = !anyChecked();
    };
    supportSection._onSelectionChange = updateGoEnabled;
    outcomeSection._onSelectionChange = updateGoEnabled;
    personalSection._onSelectionChange = updateGoEnabled;

    goBtn.onclick = async () => {
      if (goBtn.disabled) return;
      const selected = [];
      const addChecked = (type, arr) => {
        for (const s of Array.isArray(arr) ? arr : []) {
          const t = String(s?.text || "").trim();
          if (s && s.checked === true && t) selected.push({ type, text: t });
        }
      };
      addChecked("支持需求", sliced?.slots?.support);
      addChecked("成果需求", sliced?.slots?.outcome);
      addChecked("个人需求", sliced?.slots?.personal);

      const customerFull = (await getByKey("customers", cid)) || state.customers.find((c) => c.id === cid) || null;
      const pipeline_context = pruneForCoze({
        selectedNeeds: selected,
        beverageRole: String(sliced?.blocks?.beverageRole || ""),
        strategicOpportunity: String(sliced?.blocks?.strategicOpportunity || ""),
        customerProfile: customerFull,
      });

      const existing = await getModuleData(cid, "need_insight");
      await setModuleData(cid, "need_insight", { ...(existing || {}), pipeline_context });
      await setModuleData(cid, "value_prop", { pipeline_context, report: "生成中…", sliced: null, rawStream: "" });
      toast("选定需求已锚定，正在生成价值主张流水线...");
      runValuePropPipeline(cid, pipeline_context);
      state.moduleKey = "value_prop";
      setHashFromState();
      refresh();
    };

    callout.appendChild(calloutText);
    callout.appendChild(goBtn);
    calloutWrap.appendChild(callout);
    card.appendChild(calloutWrap);

    panel.appendChild(card);
  }

  const details = document.createElement("details");
  details.className = "raw-details";
  const summary = document.createElement("summary");
  summary.textContent = "Coze端原始深度洞察内容折叠区（调试）";
  const pre = document.createElement("pre");
  pre.className = "raw-pre";
  pre.textContent = debugText ? String(debugText) : "暂无内容";
  details.appendChild(summary);
  details.appendChild(pre);
  panel.appendChild(details);

  container.appendChild(panel);
  return container;
}

async function renderValueProp() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";
  container.appendChild(renderCustomerContextBar());

  const { panel } = renderPanelHeader({ title: `${MAIN[state.mainKey].title} · 价值主张创造` });
  const cid = String(state.selectedCustomerId || "");
  if (!cid) {
    panel.appendChild(renderMarkdownPlaceholder("请先选择一个客户。"));
    container.appendChild(panel);
    return container;
  }

  const stored = await getModuleData(cid, "value_prop");
  const draft = state.ui.valuePropDrafts.get(cid);
  const report = (draft && draft.report) || (typeof stored?.report === "string" ? stored.report : "");
  const sliced = (draft && draft.sliced) || (stored && stored.sliced ? stored.sliced : null);
  const loading = state.ui.valuePropLoading.has(cid) || report === "生成中…";

  if (loading) {
    const box = document.createElement("div");
    box.className = "ai-loading";
    const spinner = document.createElement("div");
    spinner.className = "ai-spinner";
    const t = document.createElement("div");
    t.className = "ai-loading-text";
    t.textContent = "可口可乐价值主张创造参谋正在深度匹配资源、推演差异化方案中，请稍候...";
    box.appendChild(spinner);
    box.appendChild(t);
    panel.appendChild(box);
  }

  if ((!report || !sliced) && !loading) {
    panel.appendChild(renderMarkdownPlaceholder("暂无价值主张报告。请先在“需求验证与洞察”中勾选需求并点击生成。"));
  } else if (report && sliced) {
    const card = document.createElement("div");
    card.className = "needles-report-card";

    const scheduleSave = () => {
      const prev = state.ui.valuePropDraftTimers.get(cid);
      if (prev) clearTimeout(prev);
      const t = setTimeout(async () => {
        state.ui.valuePropDraftTimers.delete(cid);
        const latest = (await getModuleData(cid, "value_prop")) || {};
        await setModuleData(cid, "value_prop", { ...latest, report, sliced, updatedAt: new Date().toISOString() });
      }, 600);
      state.ui.valuePropDraftTimers.set(cid, t);
    };

    const plansSection = renderValuePropPlanSlots(sliced.slots?.plans);
    card.appendChild(plansSection);
    if (sliced.blocks?.uniqBlock) {
      card.appendChild(
        renderValuePropEditableBlock({
          title: "方案独特性分析",
          value: sliced.blocks.uniqBlock,
          onChange: (v) => {
            sliced.blocks.uniqBlock = v;
            state.ui.valuePropDrafts.set(cid, { report, sliced });
            scheduleSave();
          },
        }),
      );
    }

    const tableWrap = document.createElement("div");
    tableWrap.className = "needles-report-section";
    const th = document.createElement("div");
    th.className = "needles-section-title";
    th.textContent = "价值效率与投资回报评估";
    tableWrap.appendChild(th);
    const tableHost = document.createElement("div");
    tableHost.className = "md";
    const tableEl = renderMarkdownTable(sliced.blocks?.tableBlock);
    tableEl.oninput = () => {
      const md = tableElementToMarkdown(tableEl);
      if (md) {
        sliced.blocks.tableBlock = md;
        state.ui.valuePropDrafts.set(cid, { report, sliced });
        scheduleSave();
      }
    };
    tableHost.appendChild(tableEl);
    tableWrap.appendChild(tableHost);
    card.appendChild(tableWrap);

    if (sliced.blocks?.synthBlock) {
      card.appendChild(
        renderValuePropEditableBlock({
          title: "价值主张合成",
          value: sliced.blocks.synthBlock,
          onChange: (v) => {
            sliced.blocks.synthBlock = v;
            state.ui.valuePropDrafts.set(cid, { report, sliced });
            scheduleSave();
          },
        }),
      );
    }

    const anyChecked = () => (Array.isArray(sliced.slots?.plans) ? sliced.slots.plans.some((p) => p && p.checked === true) : false);
    const calloutWrap = document.createElement("div");
    calloutWrap.className = "needles-report-section";
    const callout = document.createElement("div");
    callout.className = "hint-callout hint-callout-row";
    const calloutText = document.createElement("span");
    calloutText.innerHTML = "💡 <strong>提示</strong>：请校准报告内容，勾选你认同的方案，点击右侧的【万能剧本提案】按钮创造提案。";
    const goBtn = document.createElement("button");
    goBtn.type = "button";
    goBtn.className = "btn btn-primary";
    goBtn.textContent = "万能剧本提案";
    goBtn.disabled = !anyChecked();
    const updateGoEnabled = () => {
      goBtn.disabled = !anyChecked();
    };
    plansSection._onSelectionChange = () => {
      updateGoEnabled();
      state.ui.valuePropDrafts.set(cid, { report, sliced });
      scheduleSave();
    };

    goBtn.onclick = async () => {
      if (goBtn.disabled) return;
      const picked = (Array.isArray(sliced.slots?.plans) ? sliced.slots.plans : [])
        .filter((p) => p && p.checked === true)
        .map((p) => ({
          group: String(p.group || ""),
          scheme: String(p.scheme || ""),
          text: String(p.text || ""),
        }));

      await setModuleData(cid, "value_prop", { ...(stored || {}), selectedPlans: picked });

      const needInsight = await getModuleData(cid, "need_insight");
      const beverageRole =
        String(needInsight?.sliced?.blocks?.beverageRole || "").trim() || String(needInsight?.pipeline_context?.beverageRole || "").trim();
      const customerFull = (await getByKey("customers", cid)) || state.customers.find((c) => c.id === cid) || null;

      const proposal_federal_context = pruneForCoze({
        selectedPlans: picked,
        uniqAnalysis: String(sliced.blocks?.uniqBlock || ""),
        synthesis: String(sliced.blocks?.synthBlock || ""),
        beverageRole,
        customerProfile: customerFull,
      });

      state.ui.proposalDrafts.delete(cid);
      state.ui.proposalRaw.delete(cid);
      state.ui.proposalEditMode.set(cid, false);
      state.ui.proposalLoading.add(cid);
      await setModuleData(cid, "proposal", { proposal_federal_context, content: "生成中…", rawStream: "" });
      toast("正在生成万能剧本提案...");
      runProposalPipeline(cid, proposal_federal_context);
      state.moduleKey = "proposal";
      setHashFromState();
      refresh();
    };

    callout.appendChild(calloutText);
    callout.appendChild(goBtn);
    calloutWrap.appendChild(callout);
    card.appendChild(calloutWrap);

    panel.appendChild(card);
  }

  const details = document.createElement("details");
  details.className = "raw-details";
  const summary = document.createElement("summary");
  summary.textContent = "Coze端原始价值主张内容折叠区（调试）";
  const pre = document.createElement("pre");
  pre.className = "raw-pre";
  pre.textContent = report ? String(report) : "暂无内容";
  details.appendChild(summary);
  details.appendChild(pre);
  panel.appendChild(details);

  container.appendChild(panel);
  return container;
}

async function renderProposal() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";
  container.appendChild(renderCustomerContextBar());

  const cid = String(state.selectedCustomerId || "");
  const customerFull = cid ? (await getByKey("customers", cid)) || state.customers.find((c) => c.id === cid) || null : null;

  const tools = document.createElement("div");
  tools.className = "panel-tools";
  const exportTxt = document.createElement("button");
  exportTxt.type = "button";
  exportTxt.className = "btn";
  exportTxt.textContent = "导出txt文件";
  exportTxt.onclick = async () => {
    if (!cid) return toast("请先选择客户");
    const latest = await getModuleData(cid, "proposal");
    const draft = state.ui.proposalDrafts.get(cid);
    const text =
      (draft && typeof draft.content === "string" ? draft.content : "") || (latest && latest.content ? String(latest.content) : "");
    const name = String(customerFull?.name || cid || "客户");
    const blob = new Blob([stripProposalHeading(String(text || ""))], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `提案剧本_${name}_${todayYYYYMMDD()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const exportPng = document.createElement("button");
  exportPng.type = "button";
  exportPng.className = "btn btn-primary";
  exportPng.textContent = "导出PNG长图";
  exportPng.onclick = async () => {
    if (!cid) return toast("请先选择客户");
    const latest = await getModuleData(cid, "proposal");
    const draft = state.ui.proposalDrafts.get(cid);
    const rawText =
      (draft && typeof draft.content === "string" ? draft.content : "") || (latest && latest.content ? String(latest.content) : "");
    const text = stripProposalHeading(rawText);
    if (!text.trim()) return toast("暂无可导出的提案内容");
    const html = `<div class="md">${enhance(markdownToSafeHtml(text))}</div>`;
    const name = String(customerFull?.name || cid || "客户");
    try {
      await exportHtmlToPng({ html, filename: `提案剧本_${name}_${todayYYYYMMDD()}.png`, widthPx: 1080 });
      toast("已导出PNG长图");
    } catch (e) {
      toast(String(e?.message || e));
    }
  };
  tools.appendChild(exportTxt);
  tools.appendChild(exportPng);

  const { panel } = renderPanelHeader({ title: `${MAIN[state.mainKey].title} · 提案剧本`, tools });
  if (!cid) {
    panel.appendChild(renderMarkdownPlaceholder("请先选择一个客户。"));
    container.appendChild(panel);
    return container;
  }

  const stored = await getModuleData(cid, "proposal");
  const draft = state.ui.proposalDrafts.get(cid);
  const draftContent = draft && typeof draft.content === "string" ? draft.content : "";
  const storedContent = stored && stored.content ? String(stored.content) : "";
  const loading = state.ui.proposalLoading.has(cid) || storedContent === "生成中…";
  const contentRaw = loading ? draftContent || (storedContent === "生成中…" ? "" : storedContent) : draftContent || storedContent;
  const content = stripProposalHeading(contentRaw);

  const enhance = (html) =>
    String(html || "")
      .replace(/【适用场景】/g, '<span class="tag">【适用场景】</span>')
      .replace(/【沟通策略】/g, '<span class="tag">【沟通策略】</span>')
      .replace(/【策略】/g, '<span class="tag">【策略】</span>')
      .replace(/【话术示例】/g, '<span class="tag">【话术示例】</span>');

  if (loading) {
    const box = document.createElement("div");
    box.className = "ai-loading";
    const spinner = document.createElement("div");
    spinner.className = "ai-spinner";
    const t = document.createElement("div");
    t.className = "ai-loading-text";
    t.textContent = "可口可乐万能剧本提案高手正在为您全力转译商业逻辑、生成实战话术剧本中，请稍候...";
    box.appendChild(spinner);
    box.appendChild(t);
    panel.appendChild(box);
  }

  if (!content && !loading) {
    panel.appendChild(renderMarkdownPlaceholder("暂无提案剧本内容。请先在“价值主张创造”中勾选方案并点击生成。"));
    container.appendChild(panel);
    return container;
  }

  const card = document.createElement("div");
  card.className = "needles-report-card";

  const section = document.createElement("div");
  section.className = "needles-report-section";

  const viewer = document.createElement("div");
  viewer.className = "md proposal-viewer";
  viewer.innerHTML = enhance(markdownToSafeHtml(String(content || "")));

  const textarea = document.createElement("textarea");
  textarea.className = "proposal-textarea";
  textarea.value = String(content || "");
  textarea.style.display = "none";

  const saveNow = async (text) => {
    const latest = (await getModuleData(cid, "proposal")) || {};
    await setModuleData(cid, "proposal", { ...latest, content: text, updatedAt: new Date().toISOString() });
  };

  const scheduleSave = (text) => {
    const prev = state.ui.proposalDraftTimers.get(cid);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      state.ui.proposalDraftTimers.delete(cid);
      saveNow(text);
    }, 650);
    state.ui.proposalDraftTimers.set(cid, t);
  };

  const enterEdit = () => {
    if (loading) return;
    state.ui.proposalEditMode.set(cid, true);
    textarea.value = String(state.ui.proposalDrafts.get(cid)?.content ?? content ?? "");
    textarea.style.display = "block";
    viewer.style.display = "none";
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  };

  const exitEdit = async () => {
    state.ui.proposalEditMode.set(cid, false);
    const next = String(textarea.value || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    state.ui.proposalDrafts.set(cid, { content: next });
    textarea.style.display = "none";
    viewer.style.display = "block";
    viewer.innerHTML = enhance(markdownToSafeHtml(next));
    await saveNow(next);
  };

  viewer.ondblclick = enterEdit;
  viewer.onclick = () => {
    if (state.ui.proposalEditMode.get(cid)) return;
  };

  textarea.oninput = () => {
    const next = String(textarea.value || "").replace(/\r\n/g, "\n");
    state.ui.proposalDrafts.set(cid, { content: next });
    scheduleSave(next);
  };
  textarea.onblur = () => {
    exitEdit();
  };
  textarea.onkeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      textarea.value = String(state.ui.proposalDrafts.get(cid)?.content ?? content ?? "");
      textarea.blur();
    }
  };

  if (state.ui.proposalEditMode.get(cid) === true && !loading) {
    viewer.style.display = "none";
    textarea.style.display = "block";
  }

  section.appendChild(viewer);
  section.appendChild(textarea);
  card.appendChild(section);
  panel.appendChild(card);

  const details = document.createElement("details");
  details.className = "raw-details";
  const summary = document.createElement("summary");
  summary.textContent = "Coze端原始对话分析内容折叠区（调试）";
  const pre = document.createElement("pre");
  pre.className = "raw-pre";
  pre.textContent = content ? String(content) : "暂无内容";
  details.appendChild(summary);
  details.appendChild(pre);
  panel.appendChild(details);

  container.appendChild(panel);
  return container;
}

async function renderKaSentiment() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".html,.htm,text/html";
  fileInput.hidden = true;

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "btn btn-primary";
  importBtn.textContent = "召唤红火哨兵生成报告";
  importBtn.onclick = () => {
    const targetId = String(state.ui.kaSentimentImportCustomerId || "");
    if (!targetId) return toast("请先选择需导入报告的客户");
    fileInput.click();
  };
  importBtn.title = "导入 .html/.htm 舆情周报文件并离线落库";

  fileInput.onchange = () => {
    (async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      const targetId = String(state.ui.kaSentimentImportCustomerId || "");
      if (!targetId) return toast("请先选择需导入报告的客户");
      try {
        const html = rewriteEchartsToCdn(await readFileAsText(file));
        const title = extractTitleFromHtml(html) || `${file.name || "舆情周报"}`;
        const monitorPeriod = extractMonitorPeriodFromTitle(title) || extractMonitorPeriodFromHtml(html);
        const reportYmd = extractReportDateYmdFromHtml(html) || extractEndYmdFromMonitorPeriod(monitorPeriod);
        const existing = await getModuleData(targetId, "ka_sentiment");
        const reports = Array.isArray(existing?.reports) ? existing.reports.filter(Boolean) : [];
        const next = [
          ...reports,
          {
            reportId: newId("rep"),
            title,
            monitorPeriod,
            reportYmd,
            importAt: new Date().toISOString(),
            htmlContent: html,
          },
        ];
        await setModuleData(targetId, "ka_sentiment", { reports: next });
        toast("舆情周报手工导入并离线落库成功");
        refresh();
      } catch (e) {
        toast(String(e?.message || e));
      }
    })();
  };

  const importCustomerId =
    state.ui.kaSentimentImportCustomerId && state.customers.some((c) => c.id === state.ui.kaSentimentImportCustomerId)
      ? state.ui.kaSentimentImportCustomerId
      : "";
  if (!importCustomerId) state.ui.kaSentimentImportCustomerId = "";
  container.appendChild(
    renderCustomerContextBar({
      selectedId: state.ui.kaSentimentImportCustomerId || "",
      onChange: (v) => {
        state.ui.kaSentimentImportCustomerId = v;
      },
      afterSelectNode: (() => {
        const wrap = document.createElement("div");
        wrap.style.display = "flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "10px";
        wrap.appendChild(importBtn);
        wrap.appendChild(fileInput);
        return wrap;
      })(),
    }),
  );

  const { panel } = renderPanelHeader({ title: `${MAIN[state.mainKey].title} · KA每周舆情监测` });
  const targetCards = [
    { name: "汉堡王中国", logo: "/assets/汉堡王.png" },
    { name: "麦当劳中国", logo: "/assets/麦当劳.png" },
    { name: "海底捞", logo: "/assets/海底捞.png" },
    { name: "呷哺呷哺", logo: "/assets/呷哺呷哺.png" },
  ];

  const collections = document.createElement("div");
  collections.className = "ka-collection-grid";

  for (const spec of targetCards) {
    const customer =
      state.customers.find((c) => String(c.name || "").trim() === spec.name) ||
      state.customers.find((c) => String(c.name || "").includes(spec.name)) ||
      null;

    const card = document.createElement("div");
    card.className = "ka-collection-card";

    const header = document.createElement("div");
    header.className = "ka-collection-header";

    const logo = document.createElement("img");
    logo.className = "ka-collection-logo";
    logo.alt = "";
    logo.src = spec.logo;

    const right = document.createElement("div");
    right.className = "ka-collection-headtext";

    const cname = document.createElement("div");
    cname.className = "ka-collection-name";
    cname.textContent = spec.name;

    const cmeta = document.createElement("div");
    cmeta.className = "ka-collection-meta";
    cmeta.textContent = customer ? "舆情报告集合" : "未找到客户档案";

    right.appendChild(cname);
    right.appendChild(cmeta);
    header.appendChild(logo);
    header.appendChild(right);
    card.appendChild(header);

    const list = document.createElement("div");
    list.className = "ka-report-list";
    card.appendChild(list);

    if (!customer) {
      const empty = document.createElement("div");
      empty.className = "ka-empty";
      empty.textContent = "请先在客户档案中导入该客户资料后再导入舆情周报。";
      list.appendChild(empty);
      collections.appendChild(card);
      continue;
    }

    const data = await getModuleData(customer.id, "ka_sentiment");
    const reports = Array.isArray(data?.reports) ? data.reports.filter(Boolean) : [];
    const sorted = [...reports].sort((a, b) => String(b.importAt || "").localeCompare(String(a.importAt || "")));

    if (!sorted.length) {
      const empty = document.createElement("div");
      empty.className = "ka-empty";
      empty.textContent = "暂无周报。请在上方选择该客户后导入。";
      list.appendChild(empty);
      collections.appendChild(card);
      continue;
    }

    for (const rep of sorted) {
      const row = document.createElement("div");
      row.className = "ka-report-row";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ka-report-btn";
      const d = String(rep.importAt || "");
      const importYmd = d ? d.slice(0, 10).replace(/-/g, "") : "";
      const reportYmd =
        String(rep.reportYmd || "").trim() ||
        extractReportDateYmdFromHtml(rep.htmlContent) ||
        extractEndYmdFromMonitorPeriod(rep.monitorPeriod || extractMonitorPeriodFromHtml(rep.htmlContent)) ||
        "";
      const label = reportYmd ? `舆情报告${reportYmd}` : importYmd ? `舆情报告${importYmd}` : "舆情报告";
      btn.textContent = label;
      btn.onclick = () => openKaSentimentViewer(rep);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "ka-report-del";
      del.textContent = "×";
      del.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = await confirmModal({
          title: "删除舆情周报",
          body: `确认删除该周报吗？\n\n${String(rep.title || label)}`,
          okText: "删除",
        });
        if (!ok) return;
        const latest = await getModuleData(customer.id, "ka_sentiment");
        const list2 = Array.isArray(latest?.reports) ? latest.reports.filter(Boolean) : [];
        const next = list2.filter((r) => String(r.reportId || "") !== String(rep.reportId || ""));
        await setModuleData(customer.id, "ka_sentiment", { reports: next });
        toast("已删除周报");
        refresh();
      };

      row.appendChild(btn);
      row.appendChild(del);
      list.appendChild(row);
    }

    collections.appendChild(card);
  }

  panel.appendChild(collections);
  container.appendChild(panel);
  return container;
}

async function renderKaActions() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";

  const cid = String(state.selectedCustomerId || "");
  const importCid =
    state.ui.kaActionsImportCustomerId && state.customers.some((c) => c.id === state.ui.kaActionsImportCustomerId)
      ? state.ui.kaActionsImportCustomerId
      : "";
  if (!importCid) state.ui.kaActionsImportCustomerId = "";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".html,.htm,text/html";
  fileInput.hidden = true;

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "btn btn-primary";
  importBtn.textContent = "召唤红火先知生成报告";
  importBtn.onclick = () => {
    const targetId = String(state.ui.kaActionsImportCustomerId || "");
    if (!targetId) return toast("请先选择需导入报告的客户");
    fileInput.click();
  };
  importBtn.title = "导入 .html/.htm 洞察报告并覆盖更新该客户的最新快照";

  fileInput.onchange = () => {
    (async () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = "";
      if (!file) return;
      const targetId = String(state.ui.kaActionsImportCustomerId || "");
      if (!targetId) return toast("请先选择需导入报告的客户");
      try {
        const html = rewriteEchartsToCdn(await readFileAsText(file));
        const title = extractTitleFromHtml(html) || `${file.name || "关键动作与洞察报告"}`;
        await setModuleData(targetId, "ka_actions", { reportTitle: title, htmlContent: html });
        toast("最新大客户机会洞察报告已覆盖更新并成功落库");
        refresh();
      } catch (e) {
        toast(String(e?.message || e));
      }
    })();
  };

  container.appendChild(
    renderCustomerContextBar({
      selectedId: state.ui.kaActionsImportCustomerId || "",
      onChange: (v) => {
        state.ui.kaActionsImportCustomerId = v;
      },
      afterSelectNode: (() => {
        const wrap = document.createElement("div");
        wrap.style.display = "flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "10px";
        wrap.appendChild(importBtn);
        wrap.appendChild(fileInput);
        return wrap;
      })(),
    }),
  );

  const { panel } = renderPanelHeader({ title: `${MAIN[state.mainKey].title} · KA关键动作预测与机会洞察` });

  const logos = [
    { name: "汉堡王中国", logo: "/assets/汉堡王.png" },
    { name: "麦当劳中国", logo: "/assets/麦当劳.png" },
    { name: "海底捞", logo: "/assets/海底捞.png" },
    { name: "呷哺呷哺", logo: "/assets/呷哺呷哺.png" },
  ];
  const strip = document.createElement("div");
  strip.className = "ka-actions-logos";
  for (const spec of logos) {
    const customer =
      state.customers.find((c) => String(c.name || "").trim() === spec.name) ||
      state.customers.find((c) => String(c.name || "").includes(spec.name)) ||
      null;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ka-actions-logo-btn";
    btn.setAttribute("aria-pressed", customer && customer.id === cid ? "true" : "false");
    const img = document.createElement("img");
    img.alt = "";
    img.src = spec.logo;
    btn.appendChild(img);
    btn.onclick = () => {
      if (!customer) return toast("未找到该客户档案");
      state.selectedCustomerId = customer.id;
      refresh();
    };
    strip.appendChild(btn);
  }
  panel.appendChild(strip);

  if (!cid) {
    panel.appendChild(renderMarkdownPlaceholder("暂无动作预测与机会洞察报告。请上传该大客户的 HTML 洞察报告以激活看板。"));
    container.appendChild(panel);
    return container;
  }

  const data = await getModuleData(cid, "ka_actions");
  if (!data || !data.htmlContent) {
    panel.appendChild(renderMarkdownPlaceholder("暂无动作预测与机会洞察报告。请上传该大客户的 HTML 洞察报告以激活看板。"));
    container.appendChild(panel);
    return container;
  }

  const frameWrap = document.createElement("div");
  frameWrap.className = "ka-actions-frame-wrap";
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.style.width = "100%";
  iframe.style.height = "calc(100vh - 240px)";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";
  iframe.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.02)";
  iframe.srcdoc = rewriteEchartsToCdn(String(data.htmlContent || ""));
  frameWrap.appendChild(iframe);
  panel.appendChild(frameWrap);
  container.appendChild(panel);
  return container;
}

async function renderFacts7c() {
  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "12px";

  const ui = state.ui.facts7c;
  if (!(ui.selectedIds instanceof Set)) ui.selectedIds = new Set();
  if (!ui.lastImportDelta || typeof ui.lastImportDelta !== "object") ui.lastImportDelta = { evidence: 0, insight: 0, action_hypothesis: 0 };
  const DIM_OPTS = ["All", "Country", "Channel", "Category", "Consumer", "Customer", "Competitor", "Company"];

  const tools = document.createElement("div");
  tools.className = "row";
  tools.style.alignItems = "center";
  tools.style.justifyContent = "space-between";

  const left = document.createElement("div");
  left.className = "row";
  left.style.alignItems = "center";

  const dimLab = document.createElement("div");
  dimLab.className = "muted";
  dimLab.textContent = "观测维度";
  const dimSel = document.createElement("select");
  dimSel.className = "select";
  for (const o of DIM_OPTS) dimSel.appendChild(new Option(o, o));
  dimSel.value = DIM_OPTS.includes(String(ui.businessDimension || "")) ? String(ui.businessDimension || "") : "All";
  dimSel.onchange = () => {
    ui.businessDimension = String(dimSel.value || "All");
    refresh();
  };
  left.appendChild(dimLab);
  left.appendChild(dimSel);

  const btnWrap = document.createElement("div");
  btnWrap.className = "row";
  const mkChip = (label, pressed, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = label;
    b.setAttribute("aria-pressed", pressed ? "true" : "false");
    b.onclick = onClick;
    return b;
  };
  btnWrap.appendChild(
    mkChip("证据卡", ui.view === "wall" && ui.wallType === "evidence", () => {
      ui.view = "wall";
      ui.wallType = "evidence";
      refresh();
    }),
  );
  btnWrap.appendChild(
    mkChip("洞察卡", ui.view === "wall" && ui.wallType === "insight", () => {
      ui.view = "wall";
      ui.wallType = "insight";
      refresh();
    }),
  );
  btnWrap.appendChild(
    mkChip("行动假设卡", ui.view === "wall" && ui.wallType === "action_hypothesis", () => {
      ui.view = "wall";
      ui.wallType = "action_hypothesis";
      refresh();
    }),
  );
  btnWrap.appendChild(
    mkChip("事实-洞察-行动关系视图", ui.view === "relation", () => {
      ui.view = "relation";
      refresh();
    }),
  );
  left.appendChild(btnWrap);

  const stats = document.createElement("div");
  stats.className = "f7c-stats muted";
  stats.textContent = "证据卡 0 | +0    洞察卡 0 | +0    行动假设卡 0 | +0";

  const right = document.createElement("div");
  right.className = "row";
  right.style.alignItems = "center";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".md,text/markdown";
  fileInput.multiple = true;
  fileInput.hidden = true;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn";
  const syncDeleteBtn = () => {
    const n = ui.selectedIds.size;
    deleteBtn.disabled = n === 0;
    deleteBtn.textContent = n ? `删除卡片（${n}）` : "删除卡片";
  };
  syncDeleteBtn();
  deleteBtn.onclick = async () => {
    const ids = [...ui.selectedIds];
    if (!ids.length) return;
    const ok = await confirmModal({
      title: "批量删除卡片",
      body: `确认删除已勾选的 ${ids.length} 张卡片吗？\n\n该操作不可撤销。`,
      okText: "删除",
    });
    if (!ok) return;
    await deleteFacts7cCards(ids);
    ui.selectedIds.clear();
    toast("已删除卡片");
    refresh();
  };

  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.className = "btn btn-primary";
  importBtn.textContent = "导入7C知识卡片";
  importBtn.onclick = () => fileInput.click();
  fileInput.onchange = () => {
    (async () => {
      const fs = fileInput.files ? Array.from(fileInput.files) : [];
      fileInput.value = "";
      if (!fs.length) return;
      try {
        const res = await importFacts7cMarkdownFiles(fs);
        ui.lastImportDelta = {
          evidence: Number(res?.deltaByType?.evidence) || 0,
          insight: Number(res?.deltaByType?.insight) || 0,
          action_hypothesis: Number(res?.deltaByType?.action_hypothesis) || 0,
        };
        toast(`已成功分片解析并落库 ${Number(res?.total) || 0} 张知识卡片`);
        refresh();
      } catch (e) {
        toast(String(e?.message || e));
      }
    })();
  };
  right.appendChild(deleteBtn);
  right.appendChild(importBtn);
  right.appendChild(fileInput);

  tools.appendChild(left);
  tools.appendChild(stats);
  tools.appendChild(right);

  const { panel } = renderPanelHeader({ title: `${MAIN[state.mainKey].title} · 7C事实与洞察库`, tools });

  const all = await listFacts7cCards();
  const cards = Array.isArray(all) ? all.filter(Boolean) : [];
  const totalEvidence = cards.filter((c) => normalizeFacts7cCardType(c?.card_type) === "evidence").length;
  const totalInsight = cards.filter((c) => normalizeFacts7cCardType(c?.card_type) === "insight").length;
  const totalAction = cards.filter((c) => normalizeFacts7cCardType(c?.card_type) === "action_hypothesis").length;
  stats.textContent = `证据卡 ${totalEvidence} | +${Number(ui.lastImportDelta.evidence) || 0}    洞察卡 ${totalInsight} | +${
    Number(ui.lastImportDelta.insight) || 0
  }    行动假设卡 ${totalAction} | +${Number(ui.lastImportDelta.action_hypothesis) || 0}`;
  const byId = new Map(cards.map((c) => [String(c.id || ""), c]));
  const dim = String(ui.businessDimension || "All");
  const matchDim = (c) => {
    if (dim === "All") return true;
    const bd = Array.isArray(c?.business_dimension) ? c.business_dimension : [];
    if (!bd.length) return true;
    return bd.includes(dim);
  };
  const typeOf = (c) => normalizeFacts7cCardType(c?.card_type);

  const renderCard = (c, { compact } = {}) => {
    const card = document.createElement("div");
    card.className = compact ? "f7c-card f7c-card-compact" : "f7c-card";
    const cardId = String(c.id || "");
    const isChecked = ui.selectedIds.has(cardId);
    if (isChecked) card.classList.add("is-selected");
    const top = document.createElement("div");
    top.className = "f7c-card-top";
    const id = document.createElement("div");
    id.className = "f7c-id";
    id.textContent = String(c.id || "");
    const meta = document.createElement("div");
    meta.className = "f7c-meta";
    const conf = String(c?.yaml?.confidence ?? c?.yaml?.confidence_level ?? "").trim();
    meta.textContent = conf ? `置信度：${conf}` : "";
    top.appendChild(id);
    top.appendChild(meta);
    card.appendChild(top);

    const body = document.createElement("div");
    body.className = "f7c-body";
    const t = typeOf(c);
    const y = c?.yaml && typeof c.yaml === "object" ? c.yaml : {};
    if (t === "evidence") {
      const atomic = String(y.atomic_conclusion || y.statement || y.title || "").trim();
      const quote = String(y.evidence_quote || y.source_quote || y.source_locator || "").trim();
      const entity = String((Array.isArray(y.entity) ? y.entity.join(" / ") : y.entity) || y.dimension || y.topic || "").trim();
      const a = document.createElement("div");
      a.className = "f7c-main";
      a.textContent = atomic || "—";
      const e = document.createElement("div");
      e.className = "f7c-sub";
      e.textContent = entity ? `决策主体：${entity}` : "";
      const q = document.createElement("div");
      q.className = "f7c-quote";
      q.textContent = quote ? `出处引用：${quote}` : "";
      body.appendChild(a);
      if (e.textContent) body.appendChild(e);
      if (q.textContent) body.appendChild(q);
    } else if (t === "insight") {
      const topicText = Array.isArray(y.topic) ? y.topic.join(" / ") : y.topic;
      const fallback = String(y.title || topicText || y.KO_Implication || y.ko_implication || "").trim();
      const core = String(y.core_insight || y.judgment || y.insight_statement || y.insightStatement || "").trim();
      const implication = String(
        y.business_implication || y.businessImplication || y.KO_Implication || y.ko_implication || y.koImplication || "",
      ).trim();
      const c1 = document.createElement("div");
      c1.className = "f7c-main";
      c1.textContent = core || fallback || "—";
      body.appendChild(c1);
      if (implication) {
        const c2 = document.createElement("div");
        c2.className = "f7c-quote";
        c2.textContent = `机会线索：${implication}`;
        body.appendChild(c2);
      }
    } else if (t === "action_hypothesis") {
      const theme = String(y.actionTheme || y.action_theme || "").trim();
      const target = String(y.targetCustomer || y.target_customer || "").trim();
      const mech = String(y.actionMechanism || y.action_mechanism || "").trim();
      const eff = String(y.targetEffect || y.target_effect || "").trim();
      const t1 = document.createElement("div");
      t1.className = "f7c-main";
      t1.textContent = theme || String(c.display_title || "").trim() || "—";
      const t2 = document.createElement("div");
      t2.className = "f7c-sub";
      t2.textContent = target ? `目标客户：${target}` : "";
      const t3 = document.createElement("div");
      t3.className = "f7c-quote";
      t3.textContent = mech ? `行动机制：${mech}` : "";
      const t4 = document.createElement("div");
      t4.className = "f7c-quote";
      t4.textContent = eff ? `预期成效：${eff}` : "";
      body.appendChild(t1);
      if (t2.textContent) body.appendChild(t2);
      if (t3.textContent) body.appendChild(t3);
      if (t4.textContent) body.appendChild(t4);

      const tags = document.createElement("div");
      tags.className = "f7c-tags";
      const dOwner = String(y.decisionOwner || y.decision_owner || "").trim();
      const stage = String(y.maturity_stage || "").trim();
      const bd = Array.isArray(c.business_dimension) ? c.business_dimension : [];
      const addTag = (txt) => {
        if (!txt) return;
        const sp = document.createElement("span");
        sp.className = "f7c-tag";
        sp.textContent = txt;
        tags.appendChild(sp);
      };
      addTag(dOwner);
      addTag(stage);
      for (const x of bd) addTag(String(x));
      if (tags.childElementCount) body.appendChild(tags);
    }
    card.appendChild(body);

    const sel = document.createElement("label");
    sel.className = "f7c-select";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = isChecked;
    cb.onclick = (e) => e.stopPropagation();
    cb.onchange = () => {
      if (cb.checked) ui.selectedIds.add(cardId);
      else ui.selectedIds.delete(cardId);
      card.classList.toggle("is-selected", cb.checked);
      syncDeleteBtn();
    };
    sel.appendChild(cb);
    card.appendChild(sel);
    return card;
  };

  if (!cards.length) {
    panel.appendChild(renderMarkdownPlaceholder("暂无 7C 知识卡片。请点击右上角“导入7C知识卡片”上传 .md 文件。"));
    container.appendChild(panel);
    return container;
  }

  if (ui.view === "relation") {
    const actionCards = cards.filter((c) => typeOf(c) === "action_hypothesis" && matchDim(c));
    const insightCards = cards.filter((c) => typeOf(c) === "insight" && matchDim(c));
    const evidenceCards = cards.filter((c) => typeOf(c) === "evidence" && matchDim(c));
    const evidenceById = new Map(evidenceCards.map((c) => [String(c.id || ""), c]));
    const insightById = new Map(insightCards.map((c) => [String(c.id || ""), c]));
      const addAlias = (map, key, id) => {
        const k = String(key || "").trim();
        const v = String(id || "").trim();
        if (!k || !v) return;
        const cur = map.get(k);
        if (!cur) map.set(k, [v]);
        else if (!cur.includes(v)) cur.push(v);
      };
      const buildAliasMap = (list) => {
        const map = new Map();
        for (const c of list) {
          const y = c?.yaml && typeof c.yaml === "object" ? c.yaml : {};
          addAlias(map, y.card_id, c.id);
          addAlias(map, y.cardId, c.id);
        }
        return map;
      };
      const evidenceAlias = buildAliasMap(evidenceCards);
      const insightAlias = buildAliasMap(insightCards);
      const resolveId = (raw, by, alias) => {
        const k = String(raw || "").trim();
        if (!k) return "";
        if (by.has(k)) return k;
        const list = alias.get(k);
        if (list && list.length === 1 && by.has(list[0])) return list[0];
        return "";
      };
      const collectIds = (...vals) => {
        const out = [];
        for (const v of vals) for (const x of toArrayOfStrings(v)) out.push(x);
        return out;
      };
      const getEvidenceRefsFromInsight = (ins) => {
        const y = ins?.yaml && typeof ins.yaml === "object" ? ins.yaml : {};
        const sb = y.source_basis && typeof y.source_basis === "object" ? y.source_basis : {};
        const sc = y.support_chain && typeof y.support_chain === "object" ? y.support_chain : {};
        return collectIds(
          ins?.supporting_evidence_cards,
          y.supporting_evidence_cards,
          y.supporting_evidence_refs,
          y.supportingEvidenceRefs,
          y.supporting_evidence_ids,
          y.based_on_evidence,
          y.basedOnEvidence,
          sb.supporting_evidence_cards,
          sb.evidence_card_ids,
          sb.evidence_cards,
          sc.evidence_cards,
          sc.evidence_card_ids,
        );
      };

    const grid = document.createElement("div");
    grid.className = "f7c-rel-grid";

    const col = (title, headNode) => {
      const c = document.createElement("div");
      c.className = "f7c-rel-col";
      const h = document.createElement("div");
      h.className = "f7c-rel-head";
      const t = document.createElement("div");
      t.className = "f7c-rel-title";
      t.textContent = title;
      h.appendChild(t);
      if (headNode) h.appendChild(headNode);
      c.appendChild(h);
      const b = document.createElement("div");
      b.className = "f7c-rel-body";
      c.appendChild(b);
      return { col: c, body: b };
    };

    const actionSel = document.createElement("select");
    actionSel.className = "select";
    actionSel.appendChild(new Option("选择行动假设…", ""));
    for (const a of actionCards) {
      const y = a.yaml || {};
      const label = String(y.action_theme || y.actionTheme || a.display_title || a.id || "").trim() || String(a.id || "");
      actionSel.appendChild(new Option(label, String(a.id || "")));
    }
    actionSel.value = ui.selectedActionId || "";
    actionSel.onchange = () => {
      ui.relationFocus = "action";
      ui.selectedActionId = String(actionSel.value || "");
      ui.selectedInsightId = "";
      refresh();
    };

    const insightSel = document.createElement("select");
    insightSel.className = "select";
    insightSel.appendChild(new Option("选择洞察…", ""));
    for (const a of insightCards) {
      const y = a.yaml || {};
      const label = String(y.title || y.core_insight || y.judgment || y.insight_statement || a.display_title || a.id || "").trim() || String(a.id || "");
      insightSel.appendChild(new Option(label, String(a.id || "")));
    }
    insightSel.value = ui.selectedInsightId || "";
    insightSel.onchange = () => {
      ui.relationFocus = "insight";
      ui.selectedInsightId = String(insightSel.value || "");
      ui.selectedActionId = "";
      refresh();
    };

    const actionCol = col("行动假设卡列", actionSel);
    const insightCol = col("洞察卡列", insightSel);
    const evidenceCol = col("证据卡列");

    const focus = ui.relationFocus === "insight" ? "insight" : "action";
    if (focus === "action") {
      const actionId = String(ui.selectedActionId || "");
      const action = actionId ? byId.get(actionId) : null;
      if (action) actionCol.body.appendChild(renderCard(action, { compact: true }));
      const insIds = toArrayOfStrings(action?.supporting_insight_cards || action?.yaml?.supporting_insight_cards || action?.yaml?.source_basis?.supporting_insight_cards);
        const evIdsDirect = toArrayOfStrings(action?.supporting_evidence_cards || action?.yaml?.supporting_evidence_cards || action?.yaml?.source_basis?.supporting_evidence_cards);
      const shownInsights = [];
      for (const id of insIds) {
          const rid = resolveId(id, insightById, insightAlias);
          const x = rid ? insightById.get(rid) : null;
        if (x) {
          insightCol.body.appendChild(renderCard(x, { compact: true }));
          shownInsights.push(x);
        }
      }
        const evSet = new Set(evIdsDirect.map((x) => String(x)));
      for (const ins of shownInsights) {
          const ids2 = getEvidenceRefsFromInsight(ins);
        for (const x of ids2) evSet.add(String(x));
      }
      for (const id of [...evSet]) {
          const rid = resolveId(id, evidenceById, evidenceAlias);
          const x = rid ? evidenceById.get(rid) : null;
        if (x) evidenceCol.body.appendChild(renderCard(x, { compact: true }));
      }
    } else {
      const insightId = String(ui.selectedInsightId || "");
      const ins = insightId ? insightById.get(insightId) : null;
      if (ins) insightCol.body.appendChild(renderCard(ins, { compact: true }));
        const evIds = getEvidenceRefsFromInsight(ins);
      for (const id of evIds) {
          const rid = resolveId(id, evidenceById, evidenceAlias);
          const x = rid ? evidenceById.get(rid) : null;
        if (x) evidenceCol.body.appendChild(renderCard(x, { compact: true }));
      }
    }

    grid.appendChild(actionCol.col);
    grid.appendChild(insightCol.col);
    grid.appendChild(evidenceCol.col);
    panel.appendChild(grid);
    container.appendChild(panel);
    return container;
  }

  const want = ui.wallType || "evidence";
  const list = cards
    .filter((c) => typeOf(c) === want && matchDim(c))
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  if (!list.length) {
    panel.appendChild(renderMarkdownPlaceholder("当前筛选条件下暂无卡片。请调整观测维度或导入更多卡片。"));
    container.appendChild(panel);
    return container;
  }

  const grid = document.createElement("div");
  grid.className = "f7c-grid";
  for (const c of list) grid.appendChild(renderCard(c, { compact: false }));
  panel.appendChild(grid);
  container.appendChild(panel);
  return container;
}

async function renderContent() {
  const seq = (renderSeq += 1);
  clearNode(el.contentRoot);
  el.floatingCoach.style.display = state.moduleKey === "need_leads" || state.moduleKey === "need_insight" ? "block" : "none";

  const safeAppend = (node) => {
    if (!node) return;
    if (seq !== renderSeq) return;
    el.contentRoot.appendChild(node);
  };

  if (state.moduleKey === "customers") return safeAppend(renderCustomersModule());
  if (state.moduleKey === "collaborators") return safeAppend(renderCollaboratorsModule());
  if (state.moduleKey === "need_leads") return safeAppend(await renderNeedLeads());
  if (state.moduleKey === "need_insight") return safeAppend(await renderNeedInsight());
  if (state.moduleKey === "value_prop") return safeAppend(await renderValueProp());
  if (state.moduleKey === "proposal") return safeAppend(await renderProposal());
  if (state.moduleKey === "ka_sentiment") return safeAppend(await renderKaSentiment());
  if (state.moduleKey === "ka_actions") return safeAppend(await renderKaActions());
  if (state.moduleKey === "facts7c") return safeAppend(await renderFacts7c());

  const fallback = document.createElement("div");
  fallback.className = "panel";
  fallback.appendChild(renderMarkdownPlaceholder("模块未实现"));
  safeAppend(fallback);
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

  el.btnClearRecords.onclick = async () => {
    const ok = await confirmModalAcknowledge({
      title: "清空记录",
      sentence: "清空记录要先备份才能恢复",
      okText: "清空",
    });
    if (!ok) return;
    try {
      await clearAllData();
    } catch (e) {
      return toast(String(e?.message || e));
    }
    toast("已清空所有本地记录");
    setTimeout(() => window.location.reload(), 400);
  };

  el.floatingCoach.onclick = () => openCoach();

  window.addEventListener("hashchange", () => {
    parseHash();
    loadData().then(refresh);
  });

  await loadData();
  await refresh();
}

init().catch((e) => toast(String(e?.message || e)));
