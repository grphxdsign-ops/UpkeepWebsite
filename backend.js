const state = {
  files: [],
  documents: [],
  records: [],
  exports: [],
  user: null,
  profile: null,
  selectedRecordId: "",
  customCategories: new Set(),
  selectedStorageIds: new Set(),
  reportType: "balance-transactions",
  stage: "intake"
};

const TAX_CATEGORY_OPTIONS = [
  "Advertising",
  "Car and truck expenses",
  "Commissions and fees",
  "Contract labor",
  "Depletion",
  "Depreciation",
  "Employee benefit programs",
  "Insurance",
  "Interest - mortgage",
  "Interest - other",
  "Legal and professional services",
  "Office expense",
  "Pension and profit-sharing plans",
  "Rent or lease - vehicles, machinery, equipment",
  "Rent or lease - other business property",
  "Repairs and maintenance",
  "Supplies",
  "Taxes and licenses",
  "Travel",
  "Deductible meals",
  "Utilities",
  "Wages",
  "Sales income",
  "Interest income",
  "Bank and merchant fees",
  "Software and subscriptions",
  "Telephone and internet",
  "Owner transfer",
  "Uncategorized income",
  "Uncategorized business expense"
];

const els = {
  logoutButton: document.querySelector("#logoutButton"),
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
  previewCount: document.querySelector("#previewCount"),
  profileFields: document.querySelector("#profileFields"),
  profileSummary: document.querySelector("#profileSummary"),
  workspaceGreeting: document.querySelector("#workspaceGreeting"),
  workspaceSubcopy: document.querySelector("#workspaceSubcopy"),
  workspaceLabel: document.querySelector("#workspaceLabel"),
  workspaceIcon: document.querySelector("#workspaceIcon"),
  workspaceAction: document.querySelector("#workspaceAction"),
  workspaceBusiness: document.querySelector("#workspaceBusiness"),
  sidebarInitial: document.querySelector("#sidebarInitial"),
  sidebarProfileName: document.querySelector("#sidebarProfileName"),
  sidebarProfileBusiness: document.querySelector("#sidebarProfileBusiness"),
  profileShortcut: document.querySelector("#profileShortcut"),
  themeChoices: Array.from(document.querySelectorAll("[data-theme-choice]"))
};

init();

function init() {
  initTheme();
  els.logoutButton?.addEventListener("click", logout);
  els.documentInput.addEventListener("change", handleFiles);
  document.addEventListener("click", handleViewShortcut);
  els.processButton.addEventListener("click", processSelectedFiles);
  els.clearButton.addEventListener("click", clearFiles);
  els.refreshButton?.addEventListener("click", loadWorkspace);
  els.selectAllRecordsButton?.addEventListener("click", toggleAllRecords);
  els.recordsList.addEventListener("click", handleRecordClick);
  els.detailFields.addEventListener("change", handleDetailFieldChange);
  els.detailFields.addEventListener("click", handleDetailAction);
  els.navLinks.forEach((link) => link.addEventListener("click", handleNavClick));
  window.addEventListener("hashchange", showInitialView);
  els.saveButton.addEventListener("click", saveSelectedRecord);
  els.approveButton.addEventListener("click", toggleSelectedReviewStatus);
  els.flagButton?.addEventListener("click", () => updateSelectedRecord("needs_review"));
  els.deleteRecordButton.addEventListener("click", deleteSelectedRecord);
  els.storageList.addEventListener("change", handleStorageSelection);
  els.downloadStorageButton.addEventListener("click", downloadSelectedStorage);
  els.deleteStorageButton.addEventListener("click", deleteSelectedStorage);
  els.reportType.addEventListener("change", handleReportTypeChange);
  els.reportTypeOptions.addEventListener("click", handleReportOptionClick);
  els.profileFields?.addEventListener("click", handleProfileAction);
  els.themeChoices.forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });
  [els.exportCsvButton, els.exportSheetButton, els.exportDocButton, els.exportPdfButton].forEach((link) => {
    link.addEventListener("click", () => {
      window.setTimeout(loadWorkspace, 900);
    });
  });
  renderCategoryOptions();
  loadWorkspace().then(showInitialView);
}

function initTheme() {
  let savedTheme = "dark";
  try {
    savedTheme = localStorage.getItem("upkeep-theme") || document.documentElement.dataset.theme || "dark";
  } catch (error) {
    savedTheme = document.documentElement.dataset.theme || "dark";
  }
  setTheme(savedTheme, false);
}

function setTheme(theme, shouldStore = true) {
  const normalized = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = normalized;
  els.themeChoices.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeChoice === normalized);
  });
  if (!shouldStore) return;
  try {
    localStorage.setItem("upkeep-theme", normalized);
  } catch (error) {
    // Theme still applies for this session when storage is unavailable.
  }
}

async function loadWorkspace() {
  setStage("intake");
  setStatus("Loading workspace...");
  try {
    const workspace = await fetchJson("/api/workspace");
    applyWorkspace(workspace);
    setStatus("");
  } catch (error) {
    setStatus(error.message || "Could not load workspace.", "error");
  }
}

async function logout() {
  try {
    await fetchJson("/api/auth/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}

function handleFiles(event) {
  state.files = Array.from(event.target.files || []);
  renderFiles();
}

function renderFiles() {
  const shownCount = state.files.length;
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
  els.fileList.innerHTML = `
    <article class="empty-state empty-state-inline">
      <span class="empty-kicker">Ready for the next source</span>
      <strong>Start with a receipt, invoice, statement, or image.</strong>
      <p>After scanning, records move into the review queue so this inbox stays clean.</p>
    </article>
  `;
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
  state.user = workspace.user || null;
  state.profile = workspace.profile || null;
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
  renderProfile();
  renderShellProfile();
  updateExportLinks();
  renderExportPreview();
}

function renderStats(stats) {
  els.documentTotal.textContent = stats.documents || 0;
  els.readyTotal.textContent = stats.ready || 0;
  els.reviewTotal.textContent = stats.review || 0;
  els.recordCount.textContent = `${stats.records || 0} record${stats.records === 1 ? "" : "s"}`;
  renderProfile();
}

function renderRecords() {
  if (!state.records.length) {
    els.recordsList.innerHTML = `
      <article class="empty-state">
        <span class="empty-kicker">Clean slate</span>
        <strong>No records prepared yet.</strong>
        <p>Add source documents and Upkeep will build categorized lines you can review, edit, and export.</p>
        <a class="button primary compact" href="#intake" data-view-link="intake">Open inbox</a>
      </article>
    `;
    updateRecordSelectionAction();
    return;
  }

  const rows = state.records.map((record) => {
    const needsReview = record.needs_review || record.status === "needs_review";
    const amount = record.deposit || record.withdrawal || record.amount;
    return `
      <article class="record-item ledger-row ${record.id === state.selectedRecordId ? "is-selected" : ""}" role="row" data-record-id="${escapeHtml(record.id)}">
        <button class="record-main ledger-main" type="button" role="cell">
          <strong>${escapeHtml(record.title || "Misc expense")}</strong>
          <span>${escapeHtml(record.document_name || "Source document")}</span>
        </button>
        <span class="ledger-date" role="cell">${escapeHtml(record.record_date || "No date")}</span>
        <span class="ledger-category" role="cell">${escapeHtml(record.category || formatCategory(record.record_type))}</span>
        <strong class="ledger-amount" role="cell">${escapeHtml(currency(amount || 0))}</strong>
        <span class="status-pill ${needsReview ? "review" : ""}" role="cell">${needsReview ? "Review" : "Ready"}</span>
      </article>
    `;
  }).join("");

  els.recordsList.innerHTML = `
    <div class="ledger-table" role="table" aria-label="Prepared records">
      <div class="ledger-head" role="row">
        <span>Payee / source</span>
        <span>Date</span>
        <span>Category</span>
        <span>Amount</span>
        <span>Status</span>
      </div>
      ${rows}
    </div>
  `;
  updateRecordSelectionAction();
}

function renderDetail() {
  const record = selectedRecord();
  const hasRecord = Boolean(record);
  const recordNeedsReview = hasRecord && (record.needs_review || record.status === "needs_review");

  els.detailTitle.textContent = record ? recordTitle(record) : "Select a record";
  els.saveButton.disabled = !hasRecord;
  els.approveButton.disabled = !hasRecord;
  if (els.flagButton) els.flagButton.disabled = !hasRecord;
  els.deleteRecordButton.disabled = !hasRecord;
  els.approveButton.textContent = recordNeedsReview ? "Ready" : "Review";
  els.approveButton.classList.toggle("ready-toggle", recordNeedsReview);
  els.approveButton.classList.toggle("review-toggle", !recordNeedsReview);

  if (!record) {
    els.detailFields.innerHTML = `
      <article class="empty-state empty-state-inline">
        <span class="empty-kicker">No line selected</span>
        <strong>Choose a record to edit the extracted details.</strong>
        <p>Each field can be corrected before it goes into an export.</p>
      </article>
    `;
    return;
  }

  const fields = detailFieldConfig(record);
  els.detailFields.innerHTML = `
    <div class="editor-statusbar">
      <span>${statusBadge(record)}</span>
      <strong>${escapeHtml(record.review_note || "Fields can be edited before export.")}</strong>
    </div>
    <div class="editor-grid">
      ${fields.map((field) => fieldInput(field)).join("")}
    </div>`;
}

function detailFieldConfig(record) {
  const questionable = questionableFields(record);
  return [
    { key: "category", label: "Category", value: record.category || formatCategory(record.record_type), type: "category", questionable: questionable.has("category") },
    { key: "title", label: "Payee / Source", value: record.title || "", questionable: questionable.has("title") },
    { key: "amount", label: "Amount", value: record.amount ?? "", type: "number", step: "0.01", questionable: questionable.has("amount") },
    { key: "record_date", label: "Date", value: record.record_date || "", questionable: questionable.has("record_date") },
    { key: "document_name", label: "Document", value: record.document_name || "", questionable: questionable.has("document_name") },
    { key: "details_reference", label: "Reference", value: record.details_reference || record.fields?.detailsReference || "", questionable: questionable.has("details_reference") },
    { key: "review_note", label: "Review note", value: record.review_note || "", questionable: record.needs_review || record.status === "needs_review" }
  ];
}

function fieldInput(field) {
  if (field.type === "category") return categoryInput(field);
  const type = field.type || "text";
  const list = field.list ? ` list="${field.list}"` : "";
  const step = field.step ? ` step="${field.step}"` : "";
  return `
    <label class="editor-field ${field.questionable ? "needs-field-review" : ""}">
      <span>${escapeHtml(field.label)}</span>
      <input class="detail-input" data-detail-field="${escapeHtml(field.key)}" type="${type}"${step}${list} value="${escapeHtml(field.value)}">
    </label>
  `;
}

function categoryInput(field) {
  const categories = categoryOptionsWithCurrent(field.value);
  return `
    <label class="editor-field category-editor ${field.questionable ? "needs-field-review" : ""}">
      <span>${escapeHtml(field.label)}</span>
      <select class="detail-input detail-select" data-detail-field="category">
        ${categories.map((category) => `<option value="${escapeHtml(category)}" ${category === field.value ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
      </select>
      <span class="category-create">
        <input class="detail-input category-custom-input" data-detail-field="categoryCustom" type="text" value="" placeholder="Create category">
        <button class="settings-row-action category-create-button" type="button" data-create-category>Use custom</button>
      </span>
    </label>
  `;
}

function handleDetailFieldChange(event) {
  const input = event.target.closest("[data-detail-field]");
  const record = selectedRecord();
  if (!input || !record) return;
  if (input.dataset.detailField === "categoryCustom") return;
  record[input.dataset.detailField] = input.value;
  if (input.dataset.detailField === "category") {
    record.record_type = inferClientRecordType(input.value, record.record_type);
  }
  renderRecords();
  updateExportLinks();
  renderExportPreview();
}

function handleDetailAction(event) {
  const createButton = event.target.closest("[data-create-category]");
  const record = selectedRecord();
  if (!createButton || !record) return;
  const customInput = els.detailFields.querySelector("[data-detail-field='categoryCustom']");
  const value = String(customInput?.value || "").trim();
  if (!value) {
    customInput?.focus();
    return;
  }
  state.customCategories.add(value);
  record.category = value;
  record.record_type = inferClientRecordType(value, record.record_type);
  renderCategoryOptions();
  renderRecords();
  renderDetail();
  updateExportLinks();
  renderExportPreview();
}

function handleRecordClick(event) {
  const row = event.target.closest("[data-record-id]");
  if (!row) return;
  state.selectedRecordId = row.dataset.recordId;
  showView("records");
  setStage("review");
  renderRecords();
  renderDetail();
  renderExportPreview();
}

function handleViewShortcut(event) {
  const shortcut = event.target.closest("[data-view-link]");
  if (!shortcut) return;
  const target = normalizeViewId(shortcut.dataset.viewLink);
  if (!target || !els.views.some((view) => view.id === target)) return;
  event.preventDefault();
  showView(target, `#${target}`);
  window.history.replaceState(null, "", `#${target}`);
}

function toggleAllRecords() {
  renderExportPreview();
}

function updateRecordSelectionAction() {
  if (!els.selectAllRecordsButton) return;
  els.selectAllRecordsButton.disabled = true;
  els.selectAllRecordsButton.textContent = "Ready records sync automatically";
}

async function saveSelectedRecord() {
  const record = selectedRecord();
  if (!record) return;
  await updateSelectedRecord(record.status === "ready" && !record.needs_review ? "ready" : "needs_review");
}

async function toggleSelectedReviewStatus() {
  const record = selectedRecord();
  if (!record) return;
  const needsReview = record.needs_review || record.status === "needs_review";
  await updateSelectedRecord(needsReview ? "ready" : "needs_review");
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
    setStatus(status === "ready" ? "Record marked ready." : "Record moved to review.");
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
      : stage === "intake"
        ? "#intake"
        : "";

  if (!target) return;

  els.navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === target);
  });
}

function handleNavClick(event) {
  event.preventDefault();
  const target = normalizeViewId(event.currentTarget.getAttribute("href")?.replace("#", ""));
  showView(target, `#${target}`);
  window.history.replaceState(null, "", `#${target}`);
}

function showView(viewId, activeHref) {
  const normalized = normalizeViewId(viewId) || "intake";
  const previous = currentViewId();
  els.views.forEach((view) => view.classList.toggle("is-active", view.id === normalized));
  els.navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("is-active", activeHref ? href === activeHref : href === `#${normalized}`);
  });
  els.profileShortcut?.classList.toggle("is-active", normalized === "profile");
  updateWorkspaceHeader(normalized);
  if (previous !== normalized) {
    resetWorkspaceScroll("smooth");
  }
}

function resetWorkspaceScroll(behavior = "auto") {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior });
  window.requestAnimationFrame(scrollToTop);
  window.setTimeout(scrollToTop, 90);
}

function showInitialView() {
  const rawTarget = window.location.hash.replace("#", "");
  const target = normalizeViewId(rawTarget);
  if (target && els.views.some((view) => view.id === target)) {
    showView(target, `#${target}`);
    resetWorkspaceScroll("auto");
    if (rawTarget && rawTarget !== target) {
      window.history.replaceState(null, "", `#${target}`);
    }
    return;
  }
  updateWorkspaceHeader(currentViewId());
}

function normalizeViewId(viewId = "") {
  const normalized = String(viewId || "").trim().toLowerCase();
  if (normalized === "settings" || normalized === "account") return "profile";
  return normalized;
}

function currentViewId() {
  return els.views.find((view) => view.classList.contains("is-active"))?.id || "intake";
}

function setStatus(message, type = "info") {
  const cleanMessage = message === "Ready." || message === "Ready for upload." ? "" : message;
  els.statusLine.textContent = cleanMessage;
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
    els.storageList.innerHTML = `
      <article class="empty-state">
        <span class="empty-kicker">Nothing stored</span>
        <strong>Your exports will land here.</strong>
        <p>Download a CSV, spreadsheet, document, or PDF from Review and it will stay available in this workspace.</p>
        <a class="button secondary compact" href="#review" data-view-link="review">Go to review</a>
      </article>
    `;
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

function renderProfile() {
  if (!els.profileFields || !els.profileSummary) return;

  const profile = state.profile || {};
  const user = state.user || {};
  const name = profile.name || "Not set";
  const business = profile.business || "Not set";

  els.profileFields.innerHTML = `
    ${editableAccountRow("name", "Name", name)}
    ${emailAccountRow(user.email || "Not set")}
    ${passwordAccountRow()}
    ${editableAccountRow("business", "Business", business)}
  `;

  els.profileSummary.innerHTML = `
    <article><span>Records</span><strong>${escapeHtml(state.records.length)}</strong></article>
    <article><span>Ready</span><strong>${escapeHtml(state.records.filter(isReadyRecord).length)}</strong></article>
    <article><span>Exports</span><strong>${escapeHtml(state.exports.length)}</strong></article>
    <article><span>Account</span><strong>${user.profileComplete ? "Profile complete" : "Needs setup"}</strong></article>
  `;
  renderShellProfile();
}

function editableAccountRow(field, label, value) {
  return `
    <article class="account-row editable-account-row" data-account-field="${escapeHtml(field)}">
      <div>
        <span>${escapeHtml(label)}</span>
        <input class="account-inline-input" type="text" value="${escapeHtml(value === "Not set" ? "" : value)}" placeholder="${escapeHtml(label)}">
      </div>
      <button class="settings-row-action" type="button" data-save-profile-field="${escapeHtml(field)}">Save</button>
      <small class="account-row-note" aria-live="polite"></small>
    </article>
  `;
}

function emailAccountRow(email) {
  return `
    <article class="account-row secure-account-row" data-secure-row="email">
      <div>
        <span>Email</span>
        <strong>${escapeHtml(email)}</strong>
        <small>Changing this starts a verification sequence to both the old and new email.</small>
        <div class="security-grid">
          <input class="account-inline-input" type="email" data-email-new placeholder="New email">
          <input class="account-inline-input" type="email" data-email-confirm placeholder="Confirm new email">
          <input class="account-inline-input" type="password" data-email-password placeholder="Current password">
        </div>
      </div>
      <button class="settings-row-action" type="button" data-request-email-change>Send verification</button>
      <small class="account-row-note" aria-live="polite"></small>
    </article>
  `;
}

function passwordAccountRow() {
  return `
    <article class="account-row secure-account-row" data-secure-row="password">
      <div>
        <span>Password</span>
        <strong data-password-display data-hidden-label="************" data-shown-label="Encrypted and never displayed">************</strong>
        <small>Upkeep never shows the saved password. Changes require current-password validation and email verification.</small>
        <div class="security-grid">
          <input class="account-inline-input" type="password" data-password-current placeholder="Current password">
          <input class="account-inline-input" type="password" data-password-new placeholder="New password">
          <input class="account-inline-input" type="password" data-password-confirm placeholder="Confirm new password">
        </div>
      </div>
      <span class="account-row-actions">
        <button class="settings-row-action" type="button" data-toggle-password>Reveal</button>
        <button class="settings-row-action" type="button" data-request-password-change>Send verification</button>
      </span>
      <small class="account-row-note" aria-live="polite"></small>
    </article>
  `;
}

async function handleProfileAction(event) {
  const togglePassword = event.target.closest("[data-toggle-password]");
  if (togglePassword) {
    const row = togglePassword.closest("[data-secure-row='password']");
    const display = row?.querySelector("[data-password-display]");
    const hidden = display?.dataset.hiddenLabel || "************";
    const shown = display?.dataset.shownLabel || "Encrypted and never displayed";
    const showing = display?.textContent === shown;
    if (display) display.textContent = showing ? hidden : shown;
    togglePassword.textContent = showing ? "Reveal" : "Hide";
    return;
  }

  const saveButton = event.target.closest("[data-save-profile-field]");
  if (saveButton) {
    const row = saveButton.closest("[data-account-field]");
    const field = saveButton.dataset.saveProfileField;
    const value = row?.querySelector(".account-inline-input")?.value || "";
    await saveProfileField(field, value, row);
    return;
  }

  const emailButton = event.target.closest("[data-request-email-change]");
  if (emailButton) {
    await requestEmailChange(emailButton.closest("[data-secure-row='email']"));
    return;
  }

  const passwordButton = event.target.closest("[data-request-password-change]");
  if (passwordButton) {
    await requestPasswordChange(passwordButton.closest("[data-secure-row='password']"));
  }
}

async function saveProfileField(field, value, row) {
  const cleanValue = String(value || "").trim();
  const note = row?.querySelector(".account-row-note");
  if (!cleanValue) {
    setInlineNote(note, "Add a value before saving.", "error");
    return;
  }

  setInlineNote(note, "Saving...");
  try {
    const payload = await fetchJson("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: cleanValue })
    });
    state.user = payload.user || state.user;
    state.profile = payload.profile || state.profile;
    renderProfile();
    renderShellProfile();
    setStatus(`${field === "business" ? "Business name" : "Name"} saved.`);
  } catch (error) {
    setInlineNote(note, error.message || "Could not save.", "error");
  }
}

async function requestEmailChange(row) {
  const note = row?.querySelector(".account-row-note");
  const newEmail = row?.querySelector("[data-email-new]")?.value || "";
  const confirmEmail = row?.querySelector("[data-email-confirm]")?.value || "";
  const currentPassword = row?.querySelector("[data-email-password]")?.value || "";
  setInlineNote(note, "Checking account...");
  try {
    const payload = await fetchJson("/api/account/email-change-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, confirmEmail, currentPassword })
    });
    setInlineNote(note, payload.message || "Verification emails queued.");
    setStatus("Email change verification started.");
  } catch (error) {
    setInlineNote(note, error.message || "Could not start verification.", "error");
  }
}

async function requestPasswordChange(row) {
  const note = row?.querySelector(".account-row-note");
  const currentPassword = row?.querySelector("[data-password-current]")?.value || "";
  const newPassword = row?.querySelector("[data-password-new]")?.value || "";
  const confirmPassword = row?.querySelector("[data-password-confirm]")?.value || "";
  setInlineNote(note, "Checking account...");
  try {
    const payload = await fetchJson("/api/account/password-change-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
    setInlineNote(note, payload.message || "Password verification email queued.");
    setStatus("Password change verification started.");
  } catch (error) {
    setInlineNote(note, error.message || "Could not start verification.", "error");
  }
}

function setInlineNote(note, message, type = "info") {
  if (!note) return;
  note.textContent = message;
  note.dataset.type = type;
}

function renderShellProfile() {
  const profile = state.profile || {};
  const user = state.user || {};
  const rawName = profile.name || user.email?.split("@")[0] || "Upkeep user";
  const firstName = rawName.split(/\s+/).filter(Boolean)[0] || "there";
  const business = profile.business || "Profile setup pending";
  const initial = rawName.trim().charAt(0).toUpperCase() || "U";

  updateWorkspaceHeader(currentViewId(), firstName);
  if (els.workspaceBusiness) els.workspaceBusiness.textContent = business;
  if (els.sidebarInitial) els.sidebarInitial.textContent = initial;
  if (els.sidebarProfileName) els.sidebarProfileName.textContent = rawName;
  if (els.sidebarProfileBusiness) els.sidebarProfileBusiness.textContent = business;
}

function updateWorkspaceHeader(viewId = "intake", firstName = "") {
  const readyCount = state.records.filter((record) => record.status === "ready" && !record.needs_review).length;
  const reviewCount = state.records.filter((record) => record.status !== "ready" || record.needs_review).length;
  const name = firstName || (state.profile?.name || state.user?.email?.split("@")[0] || "").split(/\s+/).filter(Boolean)[0] || "there";
  const headerCopy = {
    intake: {
      icon: "assets/iconsax/inbox.svg",
      title: "Paperwork starts here."
    },
    records: {
      icon: "assets/iconsax/records.svg",
      title: state.records.length ? `${name}, ${readyCount} ready and ${reviewCount} to review.` : "Review what Upkeep finds."
    },
    review: {
      icon: "assets/iconsax/review.svg",
      title: "Build clean documents."
    },
    storage: {
      icon: "assets/iconsax/storage.svg",
      title: "Downloaded files live here."
    },
    profile: {
      icon: "assets/iconsax/profile.svg",
      title: "Account settings."
    }
  };
  const copy = headerCopy[viewId] || headerCopy.intake;

  if (els.workspaceGreeting) els.workspaceGreeting.textContent = copy.title;
  if (els.workspaceIcon) {
    els.workspaceIcon.innerHTML = `<span class="iconsax-mask" style="--icon: url('${copy.icon}')"></span>`;
  }
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
  const query = new URLSearchParams({ set });
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
    els.exportPreview.innerHTML = `
      <article class="empty-state export-empty">
        <span class="empty-kicker">Nothing ready yet</span>
        <strong>Mark records as ready to build this document.</strong>
        <p>Only reviewed lines flow into this preview and the downloads below.</p>
        <a class="button secondary compact" href="#records" data-view-link="records">Choose records</a>
      </article>
    `;
    return;
  }

  if (state.reportType === "balance-transactions" || state.reportType === "banking-reconciliation") {
    els.exportPreview.innerHTML = `
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Payee / Source</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>${records.slice(0, 12).map((record) => `
          <tr>
            <td data-label="Date">${escapeHtml(record.record_date || "-")}</td>
            <td data-label="Type">${escapeHtml(formatTransactionType(record.record_type))}</td>
            <td data-label="Category">${escapeHtml(record.category || "-")}</td>
            <td data-label="Payee / Source">${escapeHtml(record.title || "Misc expense")}</td>
            <td data-label="Amount">${escapeHtml(currency(record.amount || 0))}</td>
            <td data-label="Status">${escapeHtml(record.needs_review || record.status === "needs_review" ? "Review" : "Ready")}</td>
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
      <p>Every line in this preview is marked ready.</p>
    </article>
  `;
}

function selectedExportRecords() {
  return state.records.filter(isReadyRecord);
}

function isReadyRecord(record) {
  return record?.status === "ready" && !record.needs_review;
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
  const categories = categoryOptionsWithCurrent();
  els.categoryOptions.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
}

function categoryOptionsWithCurrent(current = "") {
  const categories = new Set([...TAX_CATEGORY_OPTIONS, ...state.customCategories]);
  if (current) categories.add(current);
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
