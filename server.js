import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const port = Number(process.env.PORT || 4377);
const host = process.env.HOST || "127.0.0.1";
const supabaseUrl = trimTrailingSlash(process.env.SUPABASE_URL || "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ocrStudioApi = process.env.OCR_STUDIO_API || "http://127.0.0.1:8787/api/vision-ocr";

const memoryStore = {
  documents: [],
  records: [],
  exports: []
};

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"]
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await serveStatic(request, response, url);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Upkeep site running at http://${host}:${port}/`);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      supabase: Boolean(supabaseUrl && supabaseKey),
      ocrStudioApi
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/workspace") {
    const [documents, records, exports] = await Promise.all([
      listRows("upkeep_documents"),
      listRows("upkeep_records"),
      listRows("upkeep_exports")
    ]);
    sendJson(response, 200, summarizeWorkspace(documents, records, exports));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/intake") {
    const payload = await readJsonBody(request);
    const result = await processIntake(payload);
    sendJson(response, 201, result);
    return;
  }

  if (request.method === "PATCH" && url.pathname.startsWith("/api/records/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/records/", ""));
    const payload = await readJsonBody(request);
    const updated = await updateRecord(id, payload);
    sendJson(response, 200, { record: updated });
    return;
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/records/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/records/", ""));
    await deleteRow("upkeep_records", id);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/exports/") && url.pathname.endsWith("/download")) {
    const id = decodeURIComponent(url.pathname.replace("/api/exports/", "").replace("/download", ""));
    await downloadExport(response, id);
    return;
  }

  if (request.method === "DELETE" && url.pathname.startsWith("/api/exports/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/exports/", ""));
    await deleteRow("upkeep_exports", id);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/export.csv") {
    const records = await listRows("upkeep_records");
    const set = url.searchParams.get("set") || "records";
    const selectedIds = selectedIdSet(url);
    const scopedRecords = selectedIds.size ? records.filter((record) => selectedIds.has(record.id)) : records;
    const csv = recordsToCsv(scopedRecords, set);
    const filename = exportFileName(set);
    await logExport(set, "csv", filename, scopedRecords);
    response.writeHead(200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    });
    response.end(csv);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/export.sheet") {
    const records = await listRows("upkeep_records");
    const set = url.searchParams.get("set") || "records";
    const selectedIds = selectedIdSet(url);
    const scopedRecords = selectedIds.size ? records.filter((record) => selectedIds.has(record.id)) : records;
    const html = recordsToSheetHtml(scopedRecords, set);
    const filename = exportFileName(set).replace(/\.csv$/i, ".xls");
    await logExport(set, "sheet", filename, scopedRecords);
    response.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    });
    response.end(html);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/export.doc") {
    const records = await listRows("upkeep_records");
    const set = url.searchParams.get("set") || "records";
    const selectedIds = selectedIdSet(url);
    const scopedRecords = selectedIds.size ? records.filter((record) => selectedIds.has(record.id)) : records;
    const html = recordsToDocumentHtml(scopedRecords, set);
    const filename = exportFileName(set).replace(/\.csv$/i, ".doc");
    await logExport(set, "doc", filename, scopedRecords);
    response.writeHead(200, {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    });
    response.end(html);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/export.pdf") {
    const records = await listRows("upkeep_records");
    const set = url.searchParams.get("set") || "records";
    const selectedIds = selectedIdSet(url);
    const scopedRecords = selectedIds.size ? records.filter((record) => selectedIds.has(record.id)) : records;
    const filename = exportFileName(set).replace(/\.csv$/i, ".pdf");
    await logExport(set, "pdf", filename, scopedRecords);
    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    });
    response.end(recordsToPdf(scopedRecords, set));
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

async function serveStatic(request, response, url) {
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/"
    ? "index.html"
    : pathname === "/backend"
      ? "backend.html"
      : pathname.replace(/^\/+/, "");
  let filePath = path.resolve(root, requestedPath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  const fileStat = await stat(filePath).catch(() => null);
  if (fileStat?.isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  const file = await readFile(filePath).catch(() => null);
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contentType = mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
  const encoding = preferredCompression(request, contentType, file.length);
  const body = encoding === "br"
    ? brotliCompressSync(file)
    : encoding === "gzip"
      ? gzipSync(file)
      : file;
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": cacheControlFor(filePath),
    "Vary": "Accept-Encoding"
  };

  if (encoding) {
    headers["Content-Encoding"] = encoding;
  }

  response.writeHead(200, headers);
  response.end(body);
}

function preferredCompression(request, contentType, byteLength) {
  if (byteLength < 1024 || !isCompressible(contentType)) return "";

  const acceptEncoding = String(request.headers["accept-encoding"] || "");
  if (acceptEncoding.includes("br")) return "br";
  if (acceptEncoding.includes("gzip")) return "gzip";
  return "";
}

function isCompressible(contentType) {
  return contentType.startsWith("text/")
    || contentType.includes("json")
    || contentType.includes("javascript")
    || contentType.includes("svg+xml");
}

function cacheControlFor(filePath) {
  return /\.(?:html|css|js)$/i.test(filePath)
    ? "no-cache"
    : "public, max-age=3600";
}

async function processIntake(payload) {
  const incoming = Array.isArray(payload?.documents) ? payload.documents : [];
  if (!incoming.length) {
    throw new Error("No documents were submitted.");
  }

  const createdDocuments = [];
  const createdRecords = [];

  for (const document of incoming) {
    const sourceText = await getDocumentText(document);
    const preparedDocument = normalizeDocument(document, sourceText);
    const savedDocument = await insertRow("upkeep_documents", preparedDocument);
    const records = prepareRecords(sourceText, savedDocument);
    const savedRecords = await insertRows("upkeep_records", records);

    createdDocuments.push(savedDocument);
    createdRecords.push(...savedRecords);
  }

  return summarizeWorkspace(await listRows("upkeep_documents"), await listRows("upkeep_records"), await listRows("upkeep_exports"), {
    createdDocuments,
    createdRecords
  });
}

async function getDocumentText(document) {
  const text = String(document?.text || "").trim();
  if (text) return text;

  const dataUrl = String(document?.dataUrl || "");
  if (!dataUrl.startsWith("data:image/")) return "";

  try {
    const result = await fetchJson(ocrStudioApi, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.name || "uploaded document",
        imageDataUrl: dataUrl
      })
    });
    return String(result.text || result.summary || "").trim();
  } catch {
    return "";
  }
}

function normalizeDocument(document, text) {
  return {
    id: createId("doc"),
    name: String(document?.name || "Untitled document").slice(0, 180),
    file_type: String(document?.type || "text/plain").slice(0, 80),
    file_size: Number(document?.size || 0),
    status: text ? "prepared" : "needs_review",
    source_text: text.slice(0, 120000),
    review_count: text ? 0 : 1,
    created_at: new Date().toISOString()
  };
}

function prepareRecords(text, document) {
  const rows = parseTransactionLikeRows(text);

  if (!rows.length) {
    return [{
      id: createId("rec"),
      document_id: document.id,
      document_name: document.name,
      record_type: "document",
      category: "Uncategorized document",
      title: "Misc expense",
      description: text ? text.slice(0, 240) : "No readable text found. Review the source document.",
      details_reference: "",
      deposit: null,
      withdrawal: null,
      amount: null,
      record_date: null,
      status: "needs_review",
      confidence: text ? 58 : 20,
      needs_review: true,
      review_note: text ? "No transaction rows were detected." : "OCR did not return readable text.",
      fields: { sourcePreview: text.slice(0, 1000) },
      created_at: new Date().toISOString()
    }];
  }

  return rows.map((row) => ({
    id: createId("rec"),
    document_id: document.id,
    document_name: document.name,
    record_type: row.type,
    category: row.category,
    title: row.payee || "Misc expense",
    description: row.description,
    details_reference: row.detailsReference,
    deposit: row.type === "income" ? row.amount : null,
    withdrawal: row.type !== "income" ? row.amount : null,
    amount: row.amount,
    record_date: row.date,
    status: row.needsReview ? "needs_review" : "ready",
    confidence: row.needsReview ? 72 : 91,
    needs_review: row.needsReview,
    review_note: row.needsReview ? row.reviewNote : "",
    fields: row,
    created_at: new Date().toISOString()
  }));
}

function parseTransactionLikeRows(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseTransactionLine)
    .filter(Boolean)
    .slice(0, 200);
}

function parseTransactionLine(line) {
  const amountMatches = [...line.matchAll(/-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\$?\d+\.\d{2}/g)];
  if (!amountMatches.length) return null;

  const amountText = amountMatches[amountMatches.length - 1][0];
  const amount = Number(amountText.replace(/[$,]/g, ""));
  if (!Number.isFinite(amount)) return null;

  const dateMatch = line.match(/\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/);
  const description = line
    .replace(amountText, "")
    .replace(dateMatch?.[0] || "", "")
    .replace(/\s+/g, " ")
    .trim();
  const type = amount < 0 || /\b(debit|withdrawal|purchase|fee|payment|mcdonald'?s?|restaurant|cafe|coffee|doordash|uber eats|georgia power|electric|water|gas|utility|sawnee|att|verizon|tmobile|home depot|lowe'?s|fuel|shell|chevron|bp|exxon)\b/i.test(line)
    ? "expense"
    : "income";
  const category = categorizeTransaction(description || line, type);
  const payee = derivePayee(description || line, type);
  const needsReview = !dateMatch || description.length < 4 || category.needsReview || payee.needsReview;

  return {
    date: dateMatch?.[0] || "",
    payee: payee.value,
    description: description || line,
    detailsReference: extractReference(line),
    amount: Math.abs(amount),
    type,
    category: category.label,
    needsReview,
    reviewNote: !dateMatch || description.length < 4
      ? "Confirm incomplete transaction details."
      : payee.needsReview
        ? "Confirm the payee or source."
        : category.reviewNote
  };
}

function derivePayee(text, type) {
  const raw = String(text || "")
    .replace(/\b(?:purchase authorized on|business to business|ach debit|edi paymnt|edi pymnts|web pmts|online payment|cr cd dep|merch fees|card|ref\*tn\*|pdoc#)\b/ig, " ")
    .replace(/\b(?:merchantservices|merchant services)\b/ig, " ")
    .replace(/\b(?:card|ga|tx|fl|ny|ca|sc|nc|al|tn)\s*[a-z]?\b/ig, " ")
    .replace(/\b\d{2,}\w*\b/g, " ")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}\b/ig, " ")
    .replace(/\b(?:ga|tx|usa|inc|llc|co|company)\b$/ig, " ")
    .replace(/\s+/g, " ")
    .trim();

  const transfer = /\b(transfer|zelle|venmo|owner|draw|online payment|credit card payment)\b/i.test(text);
  if (transfer) return { value: "Transfer", needsReview: true };

  const merchant = raw
    .split(/\s+-\s+|\s{2,}/)[0]
    ?.match(/[A-Za-z][A-Za-z&*.' -]{2,34}/)?.[0]?.trim().replace(/\s{2,}/g, " ");
  if (!merchant || merchant.length < 3) {
    return { value: type === "income" ? "Misc income" : "Misc expense", needsReview: true };
  }
  return { value: merchant, needsReview: /\b(misc|unknown|payment)\b/i.test(merchant) };
}

function extractReference(line) {
  const refMatch = String(line || "").match(/\b(?:batch|ref|payment|card|ach|acct)\s*[#:]?\s*([a-z0-9-]+)/i);
  return refMatch ? `${refMatch[0]}` : "";
}

function categorizeTransaction(text, type) {
  const value = String(text || "").toLowerCase();
  const rules = [
    { match: /\b(merchantservices|stripe|square|paypal|shopify|card dep|cr cd dep)\b/, label: "Sales income", type: "income" },
    { match: /\b(interest|dividend)\b/, label: "Interest income", type: "income" },
    { match: /\b(georgia power|electric|water|gas|utility|sawnee)\b/, label: "Utilities", type: "expense" },
    { match: /\b(att|verizon|tmobile|internet|phone|telecom)\b/, label: "Telephone and internet", type: "expense" },
    { match: /\b(merchant fees|bank fee|service charge|wire fee)\b/, label: "Bank and merchant fees", type: "expense" },
    { match: /\b(home depot|lowe'?s|supply|supplies|hardware)\b/, label: "Supplies", type: "expense" },
    { match: /\b(rent|lease)\b/, label: "Rent or lease", type: "expense" },
    { match: /\b(fuel|shell|chevron|bp|exxon)\b/, label: "Vehicle expense", type: "expense" },
    { match: /\b(mcdonald'?s?|restaurant|cafe|coffee|doordash|uber eats)\b/, label: "Meals - needs business purpose review", type: "expense", review: true },
    { match: /\b(owner|draw|transfer|zelle|venmo)\b/, label: "Owner transfer", type: "expense", review: true }
  ];
  const rule = rules.find((item) => item.type === type && item.match.test(value));
  if (rule) {
    return {
      label: rule.label,
      needsReview: Boolean(rule.review),
      reviewNote: rule.review ? "Confirm business purpose before filing." : ""
    };
  }
  return {
    label: type === "income" ? "Uncategorized income" : "Uncategorized business expense",
    needsReview: true,
    reviewNote: "Choose the correct accounting category."
  };
}

async function listRows(table) {
  if (!hasSupabase()) return [...memoryStore[tableToStoreKey(table)]].sort(sortNewest);
  try {
    return await fetchJson(`${supabaseUrl}/rest/v1/${table}?select=*&order=created_at.desc`, {
      headers: supabaseHeaders()
    });
  } catch {
    return [...memoryStore[tableToStoreKey(table)]].sort(sortNewest);
  }
}

async function insertRow(table, row) {
  if (!hasSupabase()) {
    memoryStore[tableToStoreKey(table)].push(row);
    return row;
  }

  const rows = await fetchJson(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });
  return rows[0];
}

async function insertRows(table, rows) {
  if (!rows.length) return [];
  if (!hasSupabase()) {
    memoryStore[tableToStoreKey(table)].push(...rows);
    return rows;
  }

  return fetchJson(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation"
    },
    body: JSON.stringify(rows)
  });
}

async function updateRecord(id, payload) {
  const status = payload.status === "ready" ? "ready" : "needs_review";
  const updates = {
    status,
    needs_review: status !== "ready",
    review_note: String(payload.review_note || ""),
    category: String(payload.category || ""),
    title: String(payload.title || ""),
    details_reference: String(payload.details_reference || ""),
    amount: payload.amount === "" || payload.amount == null ? null : Number(payload.amount),
    deposit: inferRecordType(payload.category, payload.record_type) === "income" ? Number(payload.amount) || null : null,
    withdrawal: inferRecordType(payload.category, payload.record_type) !== "income" ? Number(payload.amount) || null : null,
    record_date: String(payload.record_date || ""),
    document_name: String(payload.document_name || ""),
    record_type: inferRecordType(payload.category, payload.record_type),
    updated_at: new Date().toISOString()
  };

  if (!hasSupabase()) {
    const record = memoryStore.records.find((item) => item.id === id);
    if (!record) throw new Error("Record not found.");
    Object.assign(record, updates);
    return record;
  }

  const rows = await fetchJson(`${supabaseUrl}/rest/v1/upkeep_records?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation"
    },
    body: JSON.stringify(updates)
  });
  if (!rows[0]) throw new Error("Record not found.");
  return rows[0];
}

async function deleteRow(table, id) {
  const storeKey = tableToStoreKey(table);
  if (!hasSupabase()) {
    const previousLength = memoryStore[storeKey].length;
    memoryStore[storeKey] = memoryStore[storeKey].filter((item) => item.id !== id);
    if (memoryStore[storeKey].length === previousLength) throw new Error("Item not found.");
    return;
  }

  const rows = await fetchJson(`${supabaseUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...supabaseHeaders(),
      Prefer: "return=representation"
    }
  });
  if (!rows[0]) throw new Error("Item not found.");
}

function inferRecordType(category, fallback = "document") {
  const value = String(category || fallback || "").toLowerCase();
  if (value.includes("income") || value.includes("sales")) return "income";
  if (value.includes("asset") || value.includes("balance")) return "asset";
  if (value.includes("liability") || value.includes("loan")) return "liability";
  if (value.includes("equity") || value.includes("owner")) return "equity";
  if (value.includes("expense") || value.includes("fee") || value.includes("utilities") || value.includes("rent") || value.includes("supplies")) return "expense";
  return fallback || "document";
}

function summarizeWorkspace(documents, records, exports, extras = {}) {
  const ready = records.filter((record) => !record.needs_review && record.status === "ready").length;
  const review = records.filter((record) => record.needs_review || record.status === "needs_review").length;
  const total = records.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);

  return {
    supabaseConfigured: hasSupabase(),
    documents,
    records,
    exports,
    stats: {
      documents: documents.length,
      records: records.length,
      ready,
      review,
      total
    },
    ...extras
  };
}

function recordsToCsv(records, set = "records") {
  const normalizedSet = String(set || "records").toLowerCase();
  const scopedRecords = normalizedSet === "income-statement"
    ? records.filter((record) => ["income", "expense"].includes(record.record_type))
    : records;

  const headers = normalizedSet === "banking-reconciliation"
    ? ["Date", "Transaction Type", "QuickBooks Category", "Payee / Source", "Bookkeeping Description", "Details / Reference", "Deposit", "Withdrawal", "Status", "Review Note"]
    : normalizedSet === "income-statement"
      ? ["Date", "Transaction Type", "QuickBooks Category", "Payee / Source", "Bookkeeping Description", "Details / Reference", "Deposit", "Withdrawal"]
      : ["Date", "Transaction Type", "QuickBooks Category", "Payee / Source", "Bookkeeping Description", "Details / Reference", "Deposit", "Withdrawal"];

  const rows = scopedRecords.map((record) => {
    if (normalizedSet === "banking-reconciliation") {
      return [
        record.record_date || "",
        formatTransactionType(record),
        record.category || "",
        record.title || "",
        record.description || "",
        record.details_reference || record.fields?.detailsReference || "",
        record.deposit ?? "",
        record.withdrawal ?? "",
        record.status || "",
        record.review_note || ""
      ];
    }

    if (normalizedSet === "income-statement") {
      return [
        record.record_date || "",
        formatTransactionType(record),
        record.category || "",
        record.title || "",
        record.description || "",
        record.details_reference || record.fields?.detailsReference || "",
        record.deposit ?? "",
        record.withdrawal ?? ""
      ];
    }

    return [
      record.record_date || "",
      formatTransactionType(record),
      record.category || "",
      record.title || "",
      record.description || "",
      record.details_reference || record.fields?.detailsReference || "",
      record.deposit ?? "",
      record.withdrawal ?? ""
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function recordsToSheetHtml(records, set) {
  const csv = recordsToCsv(records, set);
  const rows = csv.split("\n").map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").replace(/""/g, "\"")));
  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join("")}</tr>`).join("")}</table></body></html>`;
}

function recordsToDocumentHtml(records, set) {
  const title = exportTitle(set);
  const totals = recordTotals(records);
  const rows = records.slice(0, 200).map((record) => `
    <tr>
      <td>${htmlEscape(record.record_date || "")}</td>
      <td>${htmlEscape(formatTransactionType(record))}</td>
      <td>${htmlEscape(record.category || "")}</td>
      <td>${htmlEscape(record.title || "")}</td>
      <td>${htmlEscape(String(record.deposit ?? ""))}</td>
      <td>${htmlEscape(String(record.withdrawal ?? ""))}</td>
      <td>${htmlEscape(record.needs_review || record.status === "needs_review" ? "Review" : "Ready")}</td>
    </tr>
  `).join("");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${htmlEscape(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #1f2a24; }
      h1 { margin-bottom: 6px; }
      .summary { margin: 18px 0; display: table; width: 100%; }
      .summary div { display: table-cell; padding: 10px; border: 1px solid #d8ded8; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d8ded8; padding: 8px; font-size: 12px; text-align: left; }
      th { background: #edf5ee; }
    </style>
  </head>
  <body>
    <h1>${htmlEscape(title)}</h1>
    <p>Prepared by Upkeep from selected records.</p>
    <div class="summary">
      <div><strong>Records</strong><br>${records.length}</div>
      <div><strong>Income</strong><br>${formatMoney(totals.income)}</div>
      <div><strong>Expenses</strong><br>${formatMoney(totals.expense)}</div>
      <div><strong>Net</strong><br>${formatMoney(totals.income - totals.expense)}</div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Payee / Source</th><th>Deposit</th><th>Withdrawal</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;
}

function recordsToPdf(records, set) {
  const title = exportTitle(set);
  const totals = recordTotals(records);
  const lines = [
    title,
    `Records: ${records.length}`,
    `Income: ${formatMoney(totals.income)}`,
    `Expenses: ${formatMoney(totals.expense)}`,
    `Net: ${formatMoney(totals.income - totals.expense)}`,
    "",
    ...records.slice(0, 24).map((record) => `${record.record_date || "-"}  ${formatTransactionType(record)}  ${record.title || "Misc expense"}  ${formatMoney(record.amount || 0)}  ${record.needs_review || record.status === "needs_review" ? "Review" : "Ready"}`)
  ];
  const content = `BT /F1 12 Tf 48 760 Td ${lines.map((line, index) => `${index ? "0 -18 Td " : ""}(${pdfEscape(line)}) Tj`).join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function recordTotals(records) {
  return records.reduce((totals, record) => {
    if (record.record_type === "income") totals.income += Number(record.amount) || 0;
    else totals.expense += Number(record.amount) || 0;
    return totals;
  }, { income: 0, expense: 0 });
}

function exportTitle(set) {
  const titles = {
    "banking-reconciliation": "Bank reconciliation",
    "income-statement": "Income statement",
    "balance-transactions": "Transaction list",
    "balance-sheet": "Balance sheet",
    "cash-flow": "Cash flow statement"
  };
  return titles[set] || "Transaction list";
}

function formatMoney(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function pdfEscape(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function exportFileName(set) {
  const names = {
    "banking-reconciliation": "banking-reconciliation.csv",
    "income-statement": "income-statement.csv",
    "balance-transactions": "transaction-list.csv",
    "balance-sheet": "balance-sheet.csv",
    "cash-flow": "cash-flow-statement.csv"
  };
  return names[set] || "transaction-list.csv";
}

function formatTransactionType(record) {
  const type = String(record.record_type || "document");
  return type.charAt(0).toUpperCase() + type.slice(1);
}

async function logExport(set, format, filename, recordCount) {
  const records = Array.isArray(recordCount) ? recordCount : [];
  const row = {
    id: createId("exp"),
    name: filename,
    export_type: set || "records",
    file_type: format,
    record_count: Array.isArray(recordCount) ? records.length : recordCount,
    source_record_ids: records.map((record) => record.id),
    created_at: new Date().toISOString()
  };
  try {
    await insertRow("upkeep_exports", row);
  } catch {
    memoryStore.exports.push(row);
  }
}

async function downloadExport(response, id) {
  const exports = await listRows("upkeep_exports");
  const exportRow = exports.find((item) => item.id === id);
  if (!exportRow) {
    sendJson(response, 404, { error: "Export not found." });
    return;
  }

  const records = await listRows("upkeep_records");
  const sourceIds = Array.isArray(exportRow.source_record_ids) ? exportRow.source_record_ids : [];
  const scopedRecords = sourceIds.length ? records.filter((record) => sourceIds.includes(record.id)) : records;
  const filename = exportRow.name || exportFileName(exportRow.export_type || "balance-transactions");

  if (exportRow.file_type === "sheet") {
    response.writeHead(200, {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/\.csv$/i, ".xls")}"`
    });
    response.end(recordsToSheetHtml(scopedRecords, exportRow.export_type));
    return;
  }

  if (exportRow.file_type === "doc") {
    response.writeHead(200, {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/\.(csv|xls|pdf)$/i, ".doc")}"`
    });
    response.end(recordsToDocumentHtml(scopedRecords, exportRow.export_type));
    return;
  }

  if (exportRow.file_type === "pdf") {
    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/\.(csv|xls|doc)$/i, ".pdf")}"`
    });
    response.end(recordsToPdf(scopedRecords, exportRow.export_type));
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename.replace(/\.xls$/i, ".csv")}"`
  });
  response.end(recordsToCsv(scopedRecords, exportRow.export_type));
}

function selectedIdSet(url) {
  const raw = url.searchParams.get("ids") || "";
  return new Set(raw.split(",").map((id) => id.trim()).filter(Boolean));
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 26 * 1024 * 1024) throw new Error("Request body is too large.");
  }
  return body ? JSON.parse(body) : {};
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function supabaseHeaders() {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    "Content-Type": "application/json"
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function hasSupabase() {
  return Boolean(supabaseUrl && supabaseKey);
}

function tableToStoreKey(table) {
  if (table === "upkeep_documents") return "documents";
  if (table === "upkeep_exports") return "exports";
  return "records";
}

function sortNewest(a, b) {
  return String(b.created_at || "").localeCompare(String(a.created_at || ""));
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
