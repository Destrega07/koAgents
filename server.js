const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const ASSETS_DIR = path.join(ROOT_DIR, "assets");
const AGENT_LIST_FILE = path.join(ROOT_DIR, "koAgentList.txt");
const CONFIG_FILE = path.join(ROOT_DIR, "coze.config.json");
const DOTENV_FILE = path.join(ROOT_DIR, ".env");
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function loadDotEnv() {
  if (!fs.existsSync(DOTENV_FILE)) return;
  const raw = fs.readFileSync(DOTENV_FILE, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv();

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readOptionalConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  const raw = fs.readFileSync(CONFIG_FILE, "utf8");
  return safeJsonParse(raw);
}

function sanitizeEndpoint(input) {
  const text = String(input ?? "");
  const match = text.match(/https?:\/\/[^\s)）]+/);
  const raw = match ? match[0] : "";
  const noCjkParen = raw.split("（")[0];
  return noCjkParen.replace(/[)）。，,]+$/g, "");
}

function parseGreetingsFromText(text) {
  const lines = text.split(/\r?\n/);
  const greetings = new Map();
  let currentName = "";
  let buf = [];

  const flush = () => {
    if (!currentName) return;
    const value = buf.join("\n").trim();
    if (value) greetings.set(currentName, value);
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headerMatch = line.match(/^#\s+(.+)\s*$/);
    if (headerMatch) {
      flush();
      currentName = headerMatch[1].trim();
      buf = [];
      continue;
    }
    if (!currentName) continue;
    buf.push(line);
  }
  flush();
  return greetings;
}

function parseAgentsFromText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const endpoint = sanitizeEndpoint(text) || "https://api.coze.cn/v3/chat";
  const agents = [];
  const greetings = parseGreetingsFromText(text);

  for (const line of lines) {
    if (!line.includes("|")) continue;
    const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
    if (parts.length < 3) continue;
    const name = parts[0];
    const botId = parts[1].replace(/\s+/g, "");
    const iconFile = parts[2];
    if (!name || !botId || !iconFile) continue;
    if (!/^\d+$/.test(botId)) continue;
    agents.push({
      name,
      botId,
      iconPath: `/assets/${iconFile}`,
      greeting: greetings.get(name) || "",
    });
  }

  return { endpoint, agents };
}

function loadAgentList() {
  const text = fs.existsSync(AGENT_LIST_FILE) ? fs.readFileSync(AGENT_LIST_FILE, "utf8") : "";
  return parseAgentsFromText(text);
}

function getToken() {
  const cfg = readOptionalConfig();
  const fromFile = cfg && typeof cfg.token === "string" ? cfg.token : "";
  const fromEnv = process.env.COZE_API_TOKEN || process.env.COZE_TOKEN || "";
  const envToken = String(fromEnv || "").trim();
  const isProbablyBadEnv =
    !envToken ||
    envToken.includes("\\") ||
    envToken.includes(".env") ||
    envToken.includes("#L") ||
    envToken.includes("`");
  return (isProbablyBadEnv ? "" : envToken || fromFile || "").trim();
}

function mapCozeError(code, msg, detail) {
  const logid = detail?.logid ? String(detail.logid) : "";
  const suffix = logid ? `（logid: ${logid}）` : "";

  if (code === 4100 || code === 4101) {
    return {
      httpStatus: 401,
      body: {
        message: `Coze 鉴权失败：Bearer token 不合法或已失效。请使用 coze.cn 的个人访问令牌（PAT，通常以 pat_ 开头）并确保开通 chat/getChat/listMessage 权限${suffix}`,
        code,
        detail,
      },
    };
  }

  return {
    httpStatus: 502,
    body: {
      message: `${msg || "Coze 调用失败"}${suffix}`,
      code,
      detail,
    },
  };
}

function sanitizeUploadEndpoint(input) {
  const text = String(input ?? "");
  const match = text.match(/https?:\/\/[^\s)）]+/);
  const raw = match ? match[0] : "";
  const noCjkParen = raw.split("（")[0];
  return noCjkParen.replace(/[)）。，,]+$/g, "");
}

async function proxyCozeFileUpload(req, res) {
  const token = getToken();
  if (!token) {
    sendJson(res, 500, { message: "未配置 COZE_API_TOKEN" });
    return;
  }

  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    sendJson(res, 400, { message: "请使用 multipart/form-data 上传文件" });
    return;
  }

  const contentLengthHeader = req.headers["content-length"];
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES + 1024 * 512) {
    sendJson(res, 413, { message: "文件过大，最大支持 20MB" });
    return;
  }

  const upstreamUrl = sanitizeUploadEndpoint("https://api.coze.cn/v1/files/upload") || "https://api.coze.cn/v1/files/upload";
  const controller = new AbortController();
  let bytes = 0;

  const { Transform } = require("stream");
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      bytes += chunk.length;
      if (bytes > MAX_UPLOAD_BYTES + 1024 * 512) {
        controller.abort();
        cb(new Error("Payload too large"));
        return;
      }
      cb(null, chunk);
    },
  });

  req.on("aborted", () => controller.abort());
  req.on("error", () => controller.abort());

  req.pipe(counter);

  let upstreamResp;
  try {
    upstreamResp = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body: counter,
      duplex: "half",
      signal: controller.signal,
    });
  } catch (e) {
    const message = String(e?.message || e);
    if (message.toLowerCase().includes("payload too large")) {
      sendJson(res, 413, { message: "文件过大，最大支持 20MB" });
      return;
    }
    sendJson(res, 502, { message: "文件上传到 Coze 失败", error: message });
    return;
  }

  const respText = await upstreamResp.text();
  const respJson = safeJsonParse(respText) || { raw: respText };
  if (!upstreamResp.ok) {
    sendJson(res, upstreamResp.status, respJson);
    return;
  }
  if (typeof respJson?.code === "number" && respJson.code !== 0) {
    const mapped = mapCozeError(respJson.code, respJson?.msg || "文件上传失败", respJson?.detail);
    sendJson(res, mapped.httpStatus, mapped.body);
    return;
  }

  const fileId =
    respJson?.data?.id ||
    respJson?.data?.file_id ||
    respJson?.data?.fileId ||
    respJson?.id ||
    respJson?.file_id;

  sendJson(res, 200, { file_id: fileId ? String(fileId) : "", raw: respJson });
}

function getPort() {
  const raw = process.env.PORT || "5000";
  const port = Number(raw);
  return Number.isFinite(port) && port > 0 ? port : 5000;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function sendJson(res, statusCode, body) {
  const text = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Content-Length": stat.size,
    "Cache-Control": filePath.includes(`${path.sep}assets${path.sep}`) ? "public, max-age=604800" : "no-cache",
  });
  fs.createReadStream(filePath).pipe(res);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function normalizePathname(urlString) {
  try {
    const u = new URL(urlString, "http://localhost");
    return decodeURIComponent(u.pathname);
  } catch {
    return "/";
  }
}

async function handleChatProxy(req, res, agentState) {
  const token = getToken();
  if (!token) {
    sendJson(res, 500, { message: "未配置 COZE_API_TOKEN" });
    return;
  }

  const rawBody = await readRequestBody(req);
  const body = safeJsonParse(rawBody);
  const botId = String(body?.bot_id ?? "").trim();
  const userId = String(body?.user_id ?? "local_user").trim();
  const conversationId = body?.conversation_id ? String(body.conversation_id) : undefined;
  const message = String(body?.message ?? "").trim();
  const fileId = body?.file_id ? String(body.file_id).trim() : "";
  const wantsStream = Boolean(body?.stream);

  if (!botId || !message) {
    sendJson(res, 400, { message: "缺少 bot_id 或 message" });
    return;
  }

  const endpoint = sanitizeEndpoint(agentState.endpoint) || "https://api.coze.cn/v3/chat";
  let origin = "https://api.coze.cn";
  try {
    origin = new URL(endpoint).origin;
  } catch {}

  const chatUrl = `${origin}/v3/chat`;
  const retrieveUrl = `${origin}/v3/chat/retrieve`;
  const messageListUrl = `${origin}/v3/chat/message/list`;

  const userMessage = fileId
    ? {
        role: "user",
        content: JSON.stringify([
          { type: "text", text: message },
          { type: "file", file_id: fileId },
        ]),
        content_type: "object_string",
      }
    : { role: "user", content: message, content_type: "text" };

  const payload = {
    bot_id: botId,
    user_id: userId,
    additional_messages: [userMessage],
    stream: wantsStream,
    auto_save_history: true,
  };

  const chatCreateUrl = conversationId
    ? `${chatUrl}?conversation_id=${encodeURIComponent(conversationId)}`
    : chatUrl;

  const controller = new AbortController();
  req.on("aborted", () => controller.abort());
  req.on("error", () => controller.abort());

  let upstreamResp;
  try {
    upstreamResp = await fetch(chatCreateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(wantsStream ? { Accept: "text/event-stream" } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (e) {
    sendJson(res, 502, { message: "上游请求失败", error: String(e?.message || e) });
    return;
  }

  if (wantsStream) {
    if (!upstreamResp.ok) {
      const errText = await upstreamResp.text();
      const errJson = safeJsonParse(errText) || { raw: errText };
      if (typeof errJson?.code === "number" && errJson.code !== 0) {
        const mapped = mapCozeError(errJson.code, errJson?.msg, errJson?.detail);
        sendJson(res, mapped.httpStatus, mapped.body);
        return;
      }
      sendJson(res, upstreamResp.status, errJson);
      return;
    }

    if (!upstreamResp.body) {
      sendJson(res, 502, { message: "上游未返回流式响应" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const { Readable } = require("stream");
    const nodeStream = Readable.fromWeb(upstreamResp.body);
    nodeStream.on("error", () => {
      try {
        res.end();
      } catch {}
    });
    res.on("close", () => controller.abort());
    nodeStream.pipe(res);
    return;
  }

  const text = await upstreamResp.text();
  let data = safeJsonParse(text);
  if (!data) data = { raw: text };

  if (!upstreamResp.ok) {
    sendJson(res, upstreamResp.status, data);
    return;
  }

  if (typeof data?.code === "number" && data.code !== 0) {
    const mapped = mapCozeError(data.code, data?.msg, data?.detail);
    sendJson(res, mapped.httpStatus, mapped.body);
    return;
  }

  const chatId = String(data?.data?.id ?? "").trim();
  const realConversationId = String(data?.data?.conversation_id ?? conversationId ?? "").trim();
  if (!chatId || !realConversationId) {
    sendJson(res, 502, { message: "未获取到 chat_id / conversation_id", raw: data });
    return;
  }

  const terminal = new Set(["completed", "failed", "requires_action", "required_action", "canceled"]);
  let status = "created";
  let chatDetail = null;

  for (let i = 0; i < 90; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    let pollResp;
    try {
      pollResp = await fetch(
        `${retrieveUrl}?conversation_id=${encodeURIComponent(realConversationId)}&chat_id=${encodeURIComponent(chatId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
    } catch (e) {
      sendJson(res, 502, { message: "轮询对话状态失败", error: String(e?.message || e) });
      return;
    }

    const pollText = await pollResp.text();
    const pollJson = safeJsonParse(pollText) || { raw: pollText };
    if (!pollResp.ok) {
      sendJson(res, pollResp.status, pollJson);
      return;
    }
    if (typeof pollJson?.code === "number" && pollJson.code !== 0) {
      const mapped = mapCozeError(pollJson.code, pollJson?.msg || "查看对话详情失败", pollJson?.detail);
      sendJson(res, mapped.httpStatus, mapped.body);
      return;
    }

    status = String(pollJson?.data?.status ?? "");
    chatDetail = pollJson?.data ?? null;
    if (terminal.has(status)) break;
  }

  if (status !== "completed") {
    const lastErrorMsg = chatDetail?.last_error?.msg ? String(chatDetail.last_error.msg) : "";
    sendJson(res, 502, {
      message: lastErrorMsg || `对话未完成（status=${status || "unknown"}）`,
      status,
      chat: chatDetail,
    });
    return;
  }

  let msgResp;
  try {
    msgResp = await fetch(
      `${messageListUrl}?conversation_id=${encodeURIComponent(realConversationId)}&chat_id=${encodeURIComponent(chatId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (e) {
    sendJson(res, 502, { message: "获取对话消息失败", error: String(e?.message || e) });
    return;
  }

  const msgText = await msgResp.text();
  const msgJson = safeJsonParse(msgText) || { raw: msgText };
  if (!msgResp.ok) {
    sendJson(res, msgResp.status, msgJson);
    return;
  }
  if (typeof msgJson?.code === "number" && msgJson.code !== 0) {
    const mapped = mapCozeError(msgJson.code, msgJson?.msg || "查看对话消息失败", msgJson?.detail);
    sendJson(res, mapped.httpStatus, mapped.body);
    return;
  }

  sendJson(res, 200, {
    conversation_id: realConversationId,
    chat_id: chatId,
    status,
    messages: Array.isArray(msgJson?.data) ? msgJson.data : [],
  });
}

function createServer() {
  let agentState = loadAgentList();

  if (!agentState.agents.length) {
    agentState = {
      endpoint: sanitizeEndpoint(agentState.endpoint) || "https://api.coze.cn/v3/chat",
      agents: [],
    };
  }

  const server = http.createServer(async (req, res) => {
    const pathname = normalizePathname(req.url || "/");

    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === "/api/config" && req.method === "GET") {
      sendJson(res, 200, { hasToken: Boolean(getToken()), endpoint: sanitizeEndpoint(agentState.endpoint) });
      return;
    }

    if (pathname === "/api/agents" && req.method === "GET") {
      agentState = loadAgentList();
      sendJson(res, 200, { endpoint: sanitizeEndpoint(agentState.endpoint), agents: agentState.agents });
      return;
    }

    if (pathname === "/api/upload" && req.method === "POST") {
      try {
        await proxyCozeFileUpload(req, res);
      } catch (e) {
        const msg = String(e?.message || e);
        if (msg.toLowerCase().includes("payload too large")) {
          sendJson(res, 413, { message: "文件过大，最大支持 20MB" });
          return;
        }
        sendJson(res, 500, { message: "服务端上传处理失败", error: msg });
      }
      return;
    }

    if (pathname === "/api/chat" && req.method === "POST") {
      agentState = loadAgentList();
      try {
        await handleChatProxy(req, res, agentState);
      } catch (e) {
        sendJson(res, 500, { message: "服务端处理失败", error: String(e?.message || e) });
      }
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      sendFile(res, path.join(ROOT_DIR, "index.html"));
      return;
    }

    if (pathname === "/login.html") {
      sendFile(res, path.join(ROOT_DIR, "login.html"));
      return;
    }

    if (pathname === "/app.js") {
      sendFile(res, path.join(ROOT_DIR, "app.js"));
      return;
    }

    if (pathname === "/koAgentList.txt") {
      sendFile(res, path.join(ROOT_DIR, "koAgentList.txt"));
      return;
    }

    if (pathname.startsWith("/assets/")) {
      const rel = pathname.slice("/assets/".length);
      const target = path.join(ASSETS_DIR, rel);
      const resolved = path.resolve(target);
      if (!resolved.startsWith(path.resolve(ASSETS_DIR))) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Bad Request");
        return;
      }
      sendFile(res, resolved);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  });

  return server;
}

const port = getPort();
createServer().listen(port, "0.0.0.0", () => {
  process.stdout.write(`Server running at http://localhost:${port}\n`);
});
