const DB_NAME = "ko_sales_enablement";
const DB_VERSION = 2;
const SCHEMA_VERSION = 1;

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB request failed"));
  });
}

function waitTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
  });
}

function openDb() {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;

    if (!db.objectStoreNames.contains("customers")) {
      const store = db.createObjectStore("customers", { keyPath: "id" });
      store.createIndex("by_type", "type", { unique: false });
      store.createIndex("by_hidden", "hidden", { unique: false });
      store.createIndex("by_updatedAt", "updatedAt", { unique: false });
    }

    if (!db.objectStoreNames.contains("collaborators")) {
      const store = db.createObjectStore("collaborators", { keyPath: "id" });
      store.createIndex("by_customerId", "customerId", { unique: false });
      store.createIndex("by_updatedAt", "updatedAt", { unique: false });
    }

    if (!db.objectStoreNames.contains("module_data")) {
      const store = db.createObjectStore("module_data", { keyPath: ["customerId", "moduleKey"] });
      store.createIndex("by_customerId", "customerId", { unique: false });
      store.createIndex("by_moduleKey", "moduleKey", { unique: false });
      store.createIndex("by_updatedAt", "updatedAt", { unique: false });
    }

    if (!db.objectStoreNames.contains("facts_7c_cards")) {
      const store = db.createObjectStore("facts_7c_cards", { keyPath: "id" });
      store.createIndex("by_card_type", "card_type", { unique: false });
      store.createIndex("by_updatedAt", "updatedAt", { unique: false });
    }
  };
  return promisifyRequest(req);
}

function nowIso() {
  return new Date().toISOString();
}

function todayYYYYMMDD() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function newId(prefix) {
  const p = String(prefix || "id");
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  return `${p}_${id}`;
}

async function withDb(mode, storeNames, fn) {
  const db = await openDb();
  const tx = db.transaction(storeNames, mode);
  const stores = {};
  for (const name of storeNames) stores[name] = tx.objectStore(name);
  const out = await fn(stores, tx);
  await waitTransaction(tx);
  return out;
}

async function getAll(storeName) {
  return withDb("readonly", [storeName], async (stores) => promisifyRequest(stores[storeName].getAll()));
}

async function getByKey(storeName, key) {
  return withDb("readonly", [storeName], async (stores) => promisifyRequest(stores[storeName].get(key)));
}

async function put(storeName, value) {
  return withDb("readwrite", [storeName], async (stores) => {
    await promisifyRequest(stores[storeName].put(value));
    return value;
  });
}

async function del(storeName, key) {
  return withDb("readwrite", [storeName], async (stores) => {
    await promisifyRequest(stores[storeName].delete(key));
    return true;
  });
}

async function clearStore(storeName) {
  return withDb("readwrite", [storeName], async (stores) => {
    await promisifyRequest(stores[storeName].clear());
    return true;
  });
}

async function bulkPut(storeName, items) {
  const list = Array.isArray(items) ? items : [];
  return withDb("readwrite", [storeName], async (stores) => {
    for (const item of list) await promisifyRequest(stores[storeName].put(item));
    return list.length;
  });
}

async function listCustomers({ type, includeHidden } = {}) {
  const all = await getAll("customers");
  const wantType = type ? String(type) : "";
  const showHidden = Boolean(includeHidden);
  return all
    .filter((c) => {
      if (!c) return false;
      if (wantType && c.type !== wantType) return false;
      if (!showHidden && c.hidden) return false;
      return true;
    })
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

async function listCollaborators({ customerId } = {}) {
  const all = await getAll("collaborators");
  const cid = customerId ? String(customerId) : "";
  return all
    .filter((c) => {
      if (!c) return false;
      if (cid && String(c.customerId || "") !== cid) return false;
      return true;
    })
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

async function getModuleData(customerId, moduleKey) {
  const key = [String(customerId || ""), String(moduleKey || "")];
  if (!key[0] || !key[1]) return null;
  return getByKey("module_data", key);
}

async function setModuleData(customerId, moduleKey, data) {
  const cid = String(customerId || "");
  const mk = String(moduleKey || "");
  if (!cid || !mk) throw new Error("Missing customerId/moduleKey");
  const existing = await getModuleData(cid, mk);
  const base = existing && typeof existing === "object" ? existing : { customerId: cid, moduleKey: mk };
  const next = {
    ...base,
    ...data,
    customerId: cid,
    moduleKey: mk,
    updatedAt: nowIso(),
  };
  await put("module_data", next);
  return next;
}

async function createCustomer(partial) {
  const data = partial && typeof partial === "object" ? partial : {};
  const id = newId("cust");
  const type = data.type === "合作客户" ? "合作客户" : "潜客";
  const customer = {
    id,
    type,
    hidden: false,
    status: data.status || "待提案",
    relationType: data.relationType || "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastUpdatedYmd: todayYYYYMMDD(),
    ...data,
    id,
    type,
    hidden: Boolean(data.hidden),
  };
  await put("customers", customer);
  return customer;
}

async function updateCustomer(id, patch) {
  const existing = await getByKey("customers", String(id || ""));
  if (!existing) return null;
  const p = patch && typeof patch === "object" ? patch : {};
  const next = {
    ...existing,
    ...p,
    id: existing.id,
    updatedAt: nowIso(),
  };
  if (p && Object.prototype.hasOwnProperty.call(p, "lastUpdatedYmd")) {
    next.lastUpdatedYmd = String(p.lastUpdatedYmd || "");
  }
  await put("customers", next);
  return next;
}

async function deleteCustomer(id) {
  const cid = String(id || "");
  const collaborators = await listCollaborators({ customerId: cid });
  await withDb("readwrite", ["customers", "collaborators", "module_data"], async (stores) => {
    await promisifyRequest(stores.customers.delete(cid));
    for (const col of collaborators) await promisifyRequest(stores.collaborators.delete(col.id));
    const moduleAll = await promisifyRequest(stores.module_data.getAll());
    for (const m of moduleAll) {
      if (m && String(m.customerId || "") === cid) {
        await promisifyRequest(stores.module_data.delete([m.customerId, m.moduleKey]));
      }
    }
  });
  return true;
}

async function deleteCollaborator(id) {
  return del("collaborators", String(id || ""));
}

async function createCollaborator(partial) {
  const data = partial && typeof partial === "object" ? partial : {};
  const id = newId("col");
  const collaborator = {
    id,
    customerId: String(data.customerId || ""),
    name: String(data.name || ""),
    company: String(data.company || ""),
    position: String(data.position || ""),
    relationStatus: String(data.relationStatus || "首次接触"),
    personality: data.personality || "",
    personalityConfidence: data.personalityConfidence ?? null,
    commStyle: data.commStyle || "",
    commStyleConfidence: data.commStyleConfidence ?? null,
    decisionPreference: data.decisionPreference || "",
    decisionPreferenceConfidence: data.decisionPreferenceConfidence ?? null,
    commUpdatedYmd: data.commUpdatedYmd || "",
    phone: data.phone || "",
    email: data.email || "",
    analysisSamples: data.analysisSamples ?? null,
    relationChangeHint: data.relationChangeHint || "",
    commSuggestions: data.commSuggestions || [],
    otherNotes: data.otherNotes || "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await put("collaborators", collaborator);
  return collaborator;
}

async function updateCollaborator(id, patch) {
  const existing = await getByKey("collaborators", String(id || ""));
  if (!existing) return null;
  const p = patch && typeof patch === "object" ? patch : {};
  const next = { ...existing, ...p, id: existing.id, updatedAt: nowIso() };
  await put("collaborators", next);
  return next;
}

async function moveLeadToCoopByCopy(leadCustomerId) {
  const lead = await getByKey("customers", String(leadCustomerId || ""));
  if (!lead) return null;
  if (lead.type !== "潜客") return null;
  if (lead.status !== "已成交") return null;

  const newCoop = await createCustomer({
    ...lead,
    id: undefined,
    type: "合作客户",
    hidden: false,
    relationType: lead.relationType || "基础供货合作",
    status: lead.status || "已成交",
    sourceLeadId: lead.id,
  });

  await updateCustomer(lead.id, { hidden: true });

  const cols = await listCollaborators({ customerId: lead.id });
  const copies = cols.map((c) => {
    const id = newId("col");
    return {
      ...c,
      id,
      customerId: newCoop.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sourceLeadCustomerId: lead.id,
      sourceLeadCollaboratorId: c.id,
    };
  });
  if (copies.length) await bulkPut("collaborators", copies);

  return { lead: await getByKey("customers", lead.id), coop: newCoop, collaboratorsCopied: copies.length };
}

async function exportBackup() {
  const [customers, collaborators, moduleData, facts7cCards] = await Promise.all([
    getAll("customers"),
    getAll("collaborators"),
    getAll("module_data"),
    getAll("facts_7c_cards").catch(() => []),
  ]);
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    data: {
      customers,
      collaborators,
      module_data: moduleData,
      facts_7c_cards: facts7cCards,
    },
  };
}

async function importBackup(payload) {
  const schemaVersion = Number(payload?.schemaVersion);
  if (schemaVersion !== SCHEMA_VERSION) throw new Error(`schemaVersion 不匹配：期望 ${SCHEMA_VERSION}，实际 ${schemaVersion}`);
  const data = payload?.data;
  if (!data || typeof data !== "object") throw new Error("备份文件格式错误：缺少 data");

  const customers = Array.isArray(data.customers) ? data.customers : [];
  const collaborators = Array.isArray(data.collaborators) ? data.collaborators : [];
  const moduleData = Array.isArray(data.module_data) ? data.module_data : [];
  const facts7cCards = Array.isArray(data.facts_7c_cards) ? data.facts_7c_cards : [];

  await withDb("readwrite", ["customers", "collaborators", "module_data", "facts_7c_cards"], async (stores) => {
    await promisifyRequest(stores.customers.clear());
    await promisifyRequest(stores.collaborators.clear());
    await promisifyRequest(stores.module_data.clear());
    await promisifyRequest(stores.facts_7c_cards.clear());
    for (const c of customers) await promisifyRequest(stores.customers.put(c));
    for (const c of collaborators) await promisifyRequest(stores.collaborators.put(c));
    for (const m of moduleData) await promisifyRequest(stores.module_data.put(m));
    for (const x of facts7cCards) await promisifyRequest(stores.facts_7c_cards.put(x));
  });

  return true;
}

async function listFacts7cCards() {
  return getAll("facts_7c_cards");
}

async function deleteFacts7cCards(ids) {
  const list = Array.isArray(ids) ? ids : [];
  const keys = list.map((x) => String(x || "").trim()).filter(Boolean);
  if (!keys.length) return 0;
  await withDb("readwrite", ["facts_7c_cards"], async (stores) => {
    for (const id of keys) await promisifyRequest(stores.facts_7c_cards.delete(id));
  });
  return keys.length;
}

export {
  DB_NAME,
  DB_VERSION,
  SCHEMA_VERSION,
  openDb,
  todayYYYYMMDD,
  newId,
  bulkPut,
  listCustomers,
  getByKey,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listCollaborators,
  createCollaborator,
  updateCollaborator,
  deleteCollaborator,
  getModuleData,
  setModuleData,
  moveLeadToCoopByCopy,
  listFacts7cCards,
  deleteFacts7cCards,
  exportBackup,
  importBackup,
  clearStore,
};
