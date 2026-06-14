const state = {
  files: [],
  documents: [],
  records: [],
  exports: [],
  selectedRecordId: "",
  selectedExportIds: new Set(),
  selectedStorageIds: new Set(),
  reportType: "balance-transactions",
  stage: "intake"
};

const els = {
  connectionState: document.querySelector("#connectionState"),
  documentInput: document.querySelector("#documentInput"),
  uploadCount: document.querySelector("#uploadCount"),
  fileList: document.querySelector("#fileList"),
  processButton: document.querySelector("#processButton"),
  clearButton: document.querySelector("#clearButton"),
  refreshButton: document.querySelector("#refreshButton"),
  statusLine: document.querySelector("#statusLine"),
  documentTotal: document.querySelector("#documentTotal"),
  readyTotal: document.querySelector("#readyTotal"),
  reviewTotal: document.querySelector("#reviewTotal"),
  recordCount: document.querySelector("#recordCount"),
  selectAllRecordsButton: document.querySelector("#selectAllRecordsButton"),
  recordsList: document.querySelector("#recordsList"),
  detailTitle: document.querySelector("#detailTitle"),
  detailFields: document.querySelector("#detailFields"),
  categoryOptions: document.querySelector("#categoryOptions"),
  saveButton: document.querySelector("#saveButton"),
  approveButton: document.querySelector("#approveButton"),
  flagButton: document.querySelector("#flagButton"),
  deleteRecordButton: document.querySelector("#deleteRecordButton"),
  navLinks: Array.from(document.querySelectorAll(".backend-nav a")),
  views: Array.from(document.querySelectorAll(".app-view")),
  storageList: document.querySelector("#storageList"),
  downloadStorageButton: document.querySelector("#downloadStorageButton"),
  deleteStorageButton: document.querySelector("#deleteStorageButton"),
  reportType: document.querySelector("#reportType"),
  reportTypeOptions: document.querySelector("#reportTypeOptions"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  exportSheetButton: document.querySelector("#exportSheetButton"),
  exportDocButton: document.querySelector("#exportDocButton"),
  exportPdfButton: document.querySelector("#exportPdfButton"),
  exportPreview: document.querySelector("#exportPreview"),
  previewTitle: document.querySelector("#previewTitle"),
  previewCount: document.querySelector("#previewCount")
};

init();

function init() {
  els.documentInput.addEventListener("change", handleFiles);
  els.processButton.addEventListener("click", processSelectedFiles);
  els.clearButton.addEventListener("click", clearFiles);
  els.refreshButton?.addEventListener("click", loadWorkspace);
  els.selectAllRecordsButton.addEventListener("click", toggleAllRecords);
  els.recordsList.addEventListener("click", handleRecordClick);
  els.recordsList.addEventListener("change", handleRecordSelection);
  els.detailFields.addEventListener("change", handleDetailFieldChange);
  els.navLinks.forEach((link) => link.addEventListener("click", handleNavClick));
  els.saveButton.addEventListener("click", saveSelectedRecord);
  els.approveButton.addEventListener("click", () => updateSelectedRecord("ready"));
  els.flagButton.addEventListener("click", () => updateSelectedRecord("needs_review"));
  els.deleteRecordButton.addEventListener("click", deleteSelectedRecord);
  els.storageList.addEventListener("change", handleStorageSelection);
  els.downloadStorageButton.addEventListener("click", downloadSelectedStorage);
  els.deleteStorageButton.addEventListener("click", deleteSelectedStorage);
  els.reportType.addEventListener("change", handleReportTypeChange);
  els.reportTypeOptions.addEventListener("click", handleReportOptionClick);
  [els.exportCsvButton, els.exportSheetButton, els.exportDocButton, els.exportPdfButton].forEach((link) => {
    link.addEventListener("click", () => {
      window.setTimeout(loadWorkspace, 900);
    });
  });
  renderCategoryOptions();
  loadWorkspace();
}

async function loadWorkspace() {
  setStage("intake");
  setStatus("Loading workspace...");
  try {
    const workspace = await fetchJson("/api/workspace");
    applyWorkspace(workspace);
    els.connectionState.textContent = workspace.supabaseConfigured ? "Connected" : "Local memory";
    setStatus("Ready.");
  } catch (error) {
    els.connectionState.textContent = "Unavailable";
    setStatus(error.message || "Could not load workspace.", "error");
  }
}

function handleFiles(event) {
  state.files = Array.from(event.target.files || []);
  renderFiles();
}

function renderFiles() {
  const shownCount = state.files.length || state.documents.length;
  els.uploadCount.textContent = `${shownCount} file${shownCount === 1 ? "" : "s"}`;
  els.processButton.disabled = state.files.length === 0;

  if (!state.files.length) {
    renderInboxDocuments();
    return;
  }

  els.fileList.innerHTML = state.files.map((file) => `
    <article class="file-item inbox-card">
      <span class="file-type">${escapeHtml(fileKind(file.name, file.type))}</span>
      <div>
        <strong>${escapeHtml(file.name)}</strong>
        <small>${escapeHtml(file.type || "Unknown type")} - ${formatBytes(file.size)}</small>
      </div>
      <b class="status-pill review">Waiting</b>
    </article>
  `).join("");
}

function renderInboxDocuments() {
  if (!state.documents.length) {
    els.fileList.innerHTML = "<p>No documents selected.</p>";
    return;
  }

  els.fileList.innerHTML = state.documents.map((document) => {
    const records = state.records.filter((record) => record.document_id === document.id);
    const review = records.filter((record) => record.needs_review || record.status === "needs_review").length;
    const matched = records.length - review;
    const needsReview = review > 0 || document.status === "needs_review";
    const summary = needsReview
      ? `${matched} matched - ${review} to review`
      : `${matched} lines matched`;
    return `
      <article class="file-item inbox-card">
        <span class="file-type">${escapeHtml(fileKind(document.name, document.file_type))}</span>
        <div>
          <strong>${escapeHtml(document.name)}</strong>
          <small>${escapeHtml(document.file_type || "Document")} - ${summary}</small>
        </div>
        <b class="status-pill ${needsReview ? "review" : ""}">${needsReview ? "Review" : "Ready"}</b>
      </article>
    `;
  }).join("");
}

async function processSelectedFiles() {
  if (!state.files.length) return;

  els.processButton.disabled = true;
  setStage("read");
  setStatus("Reading files...");

  try {
    const documents = [];
    for (const file of state.files) {
      documents.push(await fileToPayload(file));
    }

    setStage("prepare");
    setStatus("Preparing records and saving output...");
    const workspace = await fetchJson("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documents })
    });

    applyWorkspace(workspace);
    state.selectedExportIds = new Set((workspace.createdRecords || []).map((record) => record.id));
    updateExportLinks();
    updateRecordSelectionAction();
    renderExportPreview();
    clearFiles(false);
    showView("records");
    setStatus(`Saved ${workspace.createdRecords.length} record${workspace.createdRecords.length === 1 ? "" : "s"}.`);
  } catch (error) {
    setStage("intake");
    setStatus(error.message || "Processing failed.", "error");
  } finally {
    els.processButton.disabled = state.files.length === 0;
  }
}

async function fileToPayload(file) {
  const base = {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size
  };

  if (file.type.startsWith("image/")) {
    return { ...base, dataUrl: await readAsDataUrl(file) };
  }

  return { ...base, text: await file.text() };
}

function clearFiles(shouldResetInput = true) {
  state.files = [];
  if (shouldResetInput) els.documentInput.value = "";
  renderFiles();
}

function applyWorkspace(workspace) {
  state.documents = workspace.documents || [];
  state.records = workspace.records || [];
  state.exports = workspace.exports || [];
  state.selectedStorageIds = new Set(Array.from(state.selectedStorageIds).filter((id) => state.exports.some((item) => item.id === id)));

  if (!state.records.some((record) => record.id === state.selectedRecordId)) {
    state.selectedRecordId = state.records[0]?.id || "";
  }

  renderStats(workspace.stats || {});
  renderFiles();
  renderRecords();
  updateRecordSelectionAction();
  renderDetail();
  renderStorage();
  updateExportLinks();
  renderExportPreview();
}

function renderStats(stats) {
  els.documentTotal.textContent = stats.documents || 0;
  els.readyTotal.textContent = stats.ready || 0;
  els.reviewTotal.textContent = stats.review || 0;
  els.recordCount.textContent = `${stats.records || 0} record${stats.records === 1 ? "" : "s"}`;
}

function renderRecords() {
  if (!state.records.length) {
    els.recordsList.innerHTML = "<p>No records yet.</p>";
    updateRecordSelectionAction();
    return;
  }

  els.recordsList.innerHTML = state.records.map((record) => {
    const needsReview = record.needs_review || record.status === "needs_review";
    return `
      <article class="record-item ${record.id === state.selectedRecordId ? "is-selected" : ""}" data-record-id="${escapeHtml(record.id)}">
        <button class="record-main" type="button">
          <strong>${escapeHtml(recordTitle(record))}</strong>
          <span>${escapeHtml(recordSheetSummary(record))}</span>
        </button>
        <input class="record-check" type="checkbox" aria-label="Include ${escapeHtml(record.title || "record")} in export" data-export-id="${escapeHtml(record.id)}" ${state.selectedExportIds.has(record.id) ? "checked" : ""}>
        <span class="status-pill ${needsReview ? "review" : ""}">${needsReview ? "Review" : "Ready"}</span>
      </article>
    `;
  }).join("");
  updateRecordSelectionAction();
}

function renderDetail() {
  const record = selectedRecord();
  const hasRecord = Boolean(record);

  els.detailTitle.textContent = record ? recordTitle(record) : "Select a record";
  els.saveButton.disabled = !hasRecord;
  els.approveButton.disabled = !hasRecord;
  els.flagButton.disabled = !hasRecord;
  els.deleteRecordButton.disabled = !hasRecord;

  if (!record) {
    els.detailFields.innerHTML = `
      <div><dt>Status</dt><dd>Waiting</dd></div>
      <div><dt>Amount</dt><dd>-</dd></div>
      <div><dt>Document</dt><dd>-</dd></div>
    `;
    return;
  }

  const fields = detailFieldConfig(record);
  els.detailFields.innerHTML = `
    <div><dt>Status</dt><dd>${statusBadge(record)}</dd></div>
    ${fields.map((field) => `
    <div class="${field.questionable ? "needs-field-review" : ""}">
      <dt>${escapeHtml(field.label)}</dt>
      <dd>${fieldInput(field)}</dd>
    </div>
  `).join("")}`;
}

function detailFieldConfig(record) {
  const questionable = questionableFields(record);
  return [
    { key: "category", label: "Transaction", value: record.category || formatCategory(record.record_type), list: "categoryOptions", questionable: questionable.has("category") },
    { key: "title", label: "Payee / Source", value: record.title || "", questionable: questionable.has("title") },
    { key: "amount", label: "Amount", value: record.amount ?? "", type: "number", step: "0.01", questionable: questionable.has("amount") },
    { key: "record_date", label: "Date", value: record.record_date || "", questionable: questionable.has("record_date") },
    { key: "document_name", label: "Document", value: record.document_name || "", questionable: questionable.has("document_name") },
    { key: "details_reference", label: "Reference", value: record.details_reference || record.fields?.detailsReference || "", questionable: questionable.has("details_reference") },
    { key: "review_note", label: "Review note", value: record.review_note || "", questionable: record.needs_review || record.status === "needs_review" }
  ];
}

function fieldInput(field) {
  const type = field.type || "text";
  const list = field.list ? ` list="${field.list}"` : "";
  const step = field.step ? ` step="${field.step}"` : "";
  return `<input class="detail-input" data-detail-field="${escapeHtml(field.key)}" type="${type}"${step}${list} value="${escapeHtml(field.value)}">`;
}

function handleDetailFieldChange(event) {
  const input = event.target.closest("[data-detail-field]");
  const record = selectedRecord();
  if (!input || !record) return;
  record[input.dataset.detailField] = input.value;
  if (input.dataset.detailField === "category") {
    record.record_type = inferClientRecordType(input.value, record.record_type);
  }
  renderRecords();
  updateExportLinks();
  renderExportPreview();
}

function handleRecordClick(event) {
  if (event.target.matches(".record-check")) return;
  const row = event.target.closest("[data-record-id]");
  if (!row) return;
  state.selectedRecordId = row.dataset.recordId;
  showView("records");
  setStage("review");
  renderRecords();
  renderDetail();
  renderExportPreview();
}

function handleRecordSelection(event) {
  const checkbox = event.target.closest("[data-export-id]");
  if (!checkbox) return;
  if (checkbox.checked) {
    state.selectedExportIds.add(checkbox.dataset.exportId);
  } else {
    state.selectedExportIds.delete(checkbox.dataset.exportId);
  }
  updateExportLinks();
  updateRecordSelectionAction();
  renderExportPreview();
}

function toggleAllRecords() {
  if (!state.records.length) return;
  const selectedCount = state.records.filter((record) => state.selectedExportIds.has(record.id)).length;
  if (selectedCount === state.records.length) {
    state.selectedExportIds.clear();
  } else {
    state.selectedExportIds = new Set(state.records.map((record) => record.id));
  }
  renderRecords();
  updateExportLinks();
  renderExportPreview();
}

function updateRecordSelectionAction() {
  const count = state.records.filter((record) => state.selectedExportIds.has(record.id)).length;
  els.selectAllRecordsButton.disabled = state.records.length === 0;
  els.selectAllRecordsButton.textContent = count === state.records.length && state.records.length
    ? "Clear selected transactions"
    : "Select all transactions";
}

async function saveSelectedRecord() {
  const record = selectedRecord();
  if (!record) return;
  await updateSelectedRecord(record.status === "ready" && !record.needs_review ? "ready" : "needs_review");
}

async function updateSelectedRecord(status) {
  const record = selectedRecord();
  if (!record) return;

  setStatus(status === "ready" ? "Marking record ready..." : "Flagging record for review...");
  try {
    const result = await fetchJson(`/api/records/${encodeURIComponent(record.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        review_note: record.review_note || "",
        category: record.category || "",
        title: record.title || "",
        amount: record.amount,
        record_date: record.record_date || "",
        document_name: record.document_name || "",
        details_reference: record.details_reference || "",
        record_type: record.record_type
      })
    });

    state.records = state.records.map((item) => item.id === result.record.id ? result.record : item);
    renderStats({
      documents: state.documents.length,
      records: state.records.length,
      ready: state.records.filter((item) => item.status === "ready" && !item.needs_review).length,
      review: state.records.filter((item) => item.status !== "ready" || item.needs_review).length
    });
    renderRecords();
    renderDetail();
    renderExportPreview();
    setStatus(status === "ready" ? "Record is ready for handoff." : "Record is back in review.");
  } catch (error) {
    setStatus(error.message || "Could not update record.", "error");
  }
}

async function deleteSelectedRecord() {
  const record = selectedRecord();
  if (!record) return;

  setStatus("Deleting line...");
  try {
    await fetchJson(`/api/records/${encodeURIComponent(record.id)}`, {
      method: "DELETE"
    });
    state.records = state.records.filter((item) => item.id !== record.id);
    state.selectedExportIds.delete(record.id);
    state.selectedRecordId = state.records[0]?.id || "";
    renderStats({
      documents: state.documents.length,
      records: state.records.length,
      ready: state.records.filter((item) => item.status === "ready" && !item.needs_review).length,
      review: state.records.filter((item) => item.status !== "ready" || item.needs_review).length
    });
    renderRecords();
    renderDetail();
    updateExportLinks();
    updateRecordSelectionAction();
    setStatus("Line deleted.");
  } catch (error) {
    setStatus(error.message || "Could not delete line.", "error");
  }
}

function selectedRecord() {
  return state.records.find((record) => record.id === state.selectedRecordId);
}

function setStage(stage) {
  state.stage = stage;
  const target = stage === "read" || stage === "prepare"
      ? "#records"
      : "#intake";

  els.navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === target);
  });
}

function handleNavClick(event) {
  event.preventDefault();
  const target = event.currentTarget.getAttribute("href")?.replace("#", "");
  showView(target, `#${target}`);
}

function showView(viewId, activeHref) {
  const normalized = viewId || "intake";
  els.views.forEach((view) => view.classList.toggle("is-active", view.id === normalized));
  els.navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", activeHref ? href === activeHref : href === `#${normalized}`);
  });
}

function setStatus(message, type = "info") {
  els.statusLine.textContent = message;
  els.statusLine.dataset.type = type;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function fileKind(name, type) {
  const value = `${name || ""} ${type || ""}`.toLowerCase();
  if (value.includes("csv")) return "CSV";
  if (value.includes("json")) return "JSON";
  if (value.includes("image") || /\.(png|jpe?g|webp)$/i.test(name || "")) return "Image";
  if (value.includes("pdf")) return "PDF";
  if (value.includes("statement")) return "Statement";
  return "Document";
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(value) || 0);
}

function recordSheetSummary(record) {
  const amount = record.deposit || record.withdrawal || record.amount;
  const direction = record.deposit ? "Deposit" : record.withdrawal ? "Withdrawal" : "Amount";
  return [
    formatTransactionType(record.record_type),
    record.title || "Misc expense",
    amount ? `${direction} ${currency(amount)}` : "",
    record.record_date || ""
  ].filter(Boolean).join(" - ");
}

function recordTitle(record) {
  return `${formatTransactionType(record.record_type)} - ${record.title || "Misc expense"}`;
}

function formatCategory(type) {
  const normalized = String(type || "document").replace(/[_-]+/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatStatus(status) {
  return String(status || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTransactionType(type) {
  const normalized = String(type || "document");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function inferClientRecordType(category, fallback = "document") {
  const value = String(category || fallback || "").toLowerCase();
  if (value.includes("income") || value.includes("sales")) return "income";
  if (value.includes("asset") || value.includes("balance")) return "asset";
  if (value.includes("liability") || value.includes("loan")) return "liability";
  if (value.includes("equity") || value.includes("owner")) return "equity";
  if (value.includes("expense") || value.includes("fee") || value.includes("utilities") || value.includes("rent") || value.includes("supplies")) return "expense";
  return fallback || "document";
}

function questionableFields(record) {
  const fields = new Set();
  if (!record.record_date) fields.add("record_date");
  if (!record.amount) fields.add("amount");
  if (!record.document_name) fields.add("document_name");
  if (!record.title || /^(misc expense|transfer|unlabeled record|unknown payee)$/i.test(record.title)) fields.add("title");
  if (!record.category || /uncategorized|needs business purpose/i.test(record.category)) fields.add("category");
  if (!record.details_reference && record.record_type !== "income") fields.add("details_reference");
  return fields;
}

function statusBadge(record) {
  if (!record) return `<span class="detail-status">Waiting</span>`;
  const needsReview = record.needs_review || record.status === "needs_review";
  return `<span class="detail-status ${needsReview ? "review" : "ready"}">${needsReview ? "Needs Review" : "Ready"}</span>`;
}

function renderStorage() {
  const items = state.exports.map((item) => ({
    id: item.id,
    kind: "Downloaded file",
    name: item.name,
    meta: `${exportLabel(item.export_type)} - ${String(item.file_type || "export").toUpperCase()} - ${item.record_count || 0} records`
  }));
  if (!items.length) {
    els.storageList.innerHTML = "<p>No downloaded files stored yet.</p>";
    updateStorageActions();
    return;
  }
  els.storageList.innerHTML = items.map((item) => `
    <article class="storage-item" data-storage-id="${escapeHtml(item.id)}">
      <input class="storage-check" type="checkbox" aria-label="Select ${escapeHtml(item.name)}" data-storage-check="${escapeHtml(item.id)}" ${state.selectedStorageIds.has(item.id) ? "checked" : ""}>
      <div>
        <span>${escapeHtml(item.kind)}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.meta)}</small>
      </div>
      <a class="button secondary compact" href="/api/exports/${encodeURIComponent(item.id)}/download">Download</a>
    </article>
  `).join("");
  updateStorageActions();
}

function handleStorageSelection(event) {
  const checkbox = event.target.closest("[data-storage-check]");
  if (!checkbox) return;
  if (checkbox.checked) {
    state.selectedStorageIds.add(checkbox.dataset.storageCheck);
  } else {
    state.selectedStorageIds.delete(checkbox.dataset.storageCheck);
  }
  updateStorageActions();
}

function updateStorageActions() {
  const hasSelection = state.selectedStorageIds.size > 0;
  els.downloadStorageButton.disabled = !hasSelection;
  els.deleteStorageButton.disabled = !hasSelection;
}

function downloadSelectedStorage() {
  Array.from(state.selectedStorageIds).forEach((id, index) => {
    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = `/api/exports/${encodeURIComponent(id)}/download`;
      link.download = "";
      document.body.append(link);
      link.click();
      link.remove();
    }, index * 250);
  });
}

async function deleteSelectedStorage() {
  const ids = Array.from(state.selectedStorageIds);
  if (!ids.length) return;

  setStatus("Deleting stored files...");
  try {
    await Promise.all(ids.map((id) => fetchJson(`/api/exports/${encodeURIComponent(id)}`, { method: "DELETE" })));
    state.exports = state.exports.filter((item) => !state.selectedStorageIds.has(item.id));
    state.selectedStorageIds.clear();
    renderStorage();
    setStatus("Stored file selection deleted.");
  } catch (error) {
    setStatus(error.message || "Could not delete stored files.", "error");
  }
}

function updateExportLinks() {
  const set = state.reportType;
  const ids = Array.from(state.selectedExportIds);
  const query = new URLSearchParams({ set });
  if (ids.length) query.set("ids", ids.join(","));
  els.exportCsvButton.href = `/api/export.csv?${query.toString()}`;
  els.exportSheetButton.href = `/api/export.sheet?${query.toString()}`;
  els.exportDocButton.href = `/api/export.doc?${query.toString()}`;
  els.exportPdfButton.href = `/api/export.pdf?${query.toString()}`;
  els.exportCsvButton.textContent = "Download as CSV";
  els.exportSheetButton.textContent = "Download as Sheets";
  els.exportDocButton.textContent = "Download as DOC";
  els.exportPdfButton.textContent = "Download as PDF";
  els.reportType.value = set;
  els.reportTypeOptions.querySelectorAll("[data-report-type]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.reportType === set);
  });
  renderExportPreview();
}

function handleReportTypeChange() {
  state.reportType = els.reportType.value;
  updateExportLinks();
}

function handleReportOptionClick(event) {
  const button = event.target.closest("[data-report-type]");
  if (!button) return;
  state.reportType = button.dataset.reportType;
  updateExportLinks();
}

function renderExportPreview() {
  if (!els.exportPreview) return;
  const records = selectedExportRecords();
  els.previewTitle.textContent = exportLabel(state.reportType);
  els.previewCount.textContent = `${records.length} record${records.length === 1 ? "" : "s"}`;
  if (!records.length) {
    els.exportPreview.innerHTML = "<p>No selected transactions yet.</p>";
    return;
  }

  if (state.reportType === "balance-transactions" || state.reportType === "banking-reconciliation") {
    els.exportPreview.innerHTML = `
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Payee / Source</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${records.slice(0, 12).map((record) => `
          <tr>
            <td>${escapeHtml(record.record_date || "-")}</td>
            <td>${escapeHtml(formatTransactionType(record.record_type))}</td>
            <td>${escapeHtml(record.category || "-")}</td>
            <td>${escapeHtml(record.title || "Misc expense")}</td>
            <td>${escapeHtml(currency(record.amount || 0))}</td>
            <td>${escapeHtml(record.needs_review || record.status === "needs_review" ? "Review" : "Ready")}</td>
          </tr>
        `).join("")}</tbody>
      </table>
    `;
    return;
  }

  const income = records.filter((record) => record.record_type === "income").reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  const expense = records.filter((record) => record.record_type !== "income").reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
  els.exportPreview.innerHTML = `
    <article class="document-preview">
      <h3>${escapeHtml(exportLabel(state.reportType))}</h3>
      <dl>
        <div><dt>Selected records</dt><dd>${records.length}</dd></div>
        <div><dt>Income</dt><dd>${currency(income)}</dd></div>
        <div><dt>Expenses</dt><dd>${currency(expense)}</dd></div>
        <div><dt>Net</dt><dd>${currency(income - expense)}</dd></div>
      </dl>
      <p>${escapeHtml(records.filter((record) => record.needs_review || record.status === "needs_review").length)} record(s) still need review before final handoff.</p>
    </article>
  `;
}

function selectedExportRecords() {
  const ids = state.selectedExportIds;
  return ids.size ? state.records.filter((record) => ids.has(record.id)) : state.records;
}

function exportLabel(set) {
  const labels = {
    "balance-transactions": "Transaction list",
    "banking-reconciliation": "Bank reconciliation",
    "income-statement": "Income statement",
    "balance-sheet": "Balance sheet",
    "cash-flow": "Cash flow"
  };
  return labels[set] || "Export";
}

function renderCategoryOptions() {
  const categories = [
    "Sales income",
    "Interest income",
    "Uncategorized income",
    "Advertising and marketing",
    "Bank and merchant fees",
    "Insurance",
    "Legal and professional services",
    "Meals - needs business purpose review",
    "Office supplies",
    "Rent or lease",
    "Repairs and maintenance",
    "Software and subscriptions",
    "Supplies",
    "Telephone and internet",
    "Travel",
    "Utilities",
    "Vehicle expense",
    "Owner transfer",
    "Uncategorized business expense"
  ];
  els.categoryOptions.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
