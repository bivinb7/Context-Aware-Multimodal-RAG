// Configure the existing FastAPI service in this single location for local development.
const API_BASE_URL = "http://127.0.0.1:8000";
const MATCH_COUNT = 5;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const state = {
  selectedFile: null,
  documentName: "",
  uploaded: false,
  chatOpen: false,
  isBusy: false,
  chatHistory: [],
};

const elements = {
  fileInput: document.querySelector("#pdf-file-input"),
  uploadZone: document.querySelector("[data-testid='upload-dropzone']"),
  browseButton: document.querySelector("[data-testid='browse-files-button']"),
  filePreview: document.querySelector("[data-testid='file-preview']"),
  fileName: document.querySelector("[data-testid='selected-file-name']"),
  fileSize: document.querySelector("[data-testid='selected-file-size']"),
  removeFile: document.querySelector("[data-testid='remove-file-button']"),
  uploadStatus: document.querySelector("[data-testid='upload-status-message']"),
  startChat: document.querySelector("[data-testid='start-chatting-button']"),
  welcomeView: document.querySelector("[data-testid='welcome-view']"),
  chatView: document.querySelector("[data-testid='chat-view']"),
  chatInput: document.querySelector("[data-testid='chat-input']"),
  sendButton: document.querySelector("[data-testid='send-button']"),
  chatForm: document.querySelector("[data-testid='chat-form']"),
  messageList: document.querySelector("[data-testid='message-list']"),
  emptyChat: document.querySelector("[data-testid='empty-chat-state']"),
  composerStatus: document.querySelector("[data-testid='composer-status']"),
  clearChat: document.querySelector("[data-testid='clear-chat-button']"),
  newChat: document.querySelector("[data-testid='new-chat-button']"),
  historyList: document.querySelector("[data-testid='chat-history-list']"),
  historyCount: document.querySelector("[data-testid='chat-history-count']"),
  documentList: document.querySelector("[data-testid='uploaded-documents-list']"),
  documentName: document.querySelector("[data-testid='chat-document-name']"),
  topbarStatus: document.querySelector("[data-testid='topbar-status']"),
  mobileMenu: document.querySelector("[data-testid='mobile-menu-button']"),
  sidebar: document.querySelector(".sidebar"),
  toastRegion: document.querySelector("[data-testid='toast-region']"),
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function showToast(message, type = "info") {
  elements.toastRegion.innerHTML = `<div class="toast ${type}" data-testid="toast-message">${escapeHtml(message)}</div>`;
  window.setTimeout(() => { elements.toastRegion.innerHTML = ""; }, 4200);
}

function setStatus(message, type = "") {
  elements.uploadStatus.textContent = message;
  elements.uploadStatus.className = `status-message${type ? ` ${type}` : ""}`;
}

function setComposerStatus(message, type = "") {
  elements.composerStatus.textContent = message;
  elements.composerStatus.className = `composer-status${type ? ` ${type}` : ""}`;
}

function isPdf(file) {
  return file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
}

function selectFile(file) {
  if (!file) return;
  if (!isPdf(file)) {
    setStatus("Please choose a PDF file. Other file types are not supported.", "error");
    showToast("Only PDF documents can be uploaded.", "error");
    return;
  }
  if (file.size === 0) {
    setStatus("This file is empty. Please choose a PDF with content.", "error");
    showToast("The selected PDF is empty.", "error");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    setStatus("This PDF is larger than 25 MB. Please choose a smaller document.", "error");
    showToast("PDFs must be 25 MB or smaller.", "error");
    return;
  }

  state.selectedFile = file;
  state.uploaded = false;
  elements.filePreview.classList.remove("hidden");
  elements.fileName.textContent = file.name;
  elements.fileSize.textContent = formatBytes(file.size);
  elements.startChat.disabled = true;
  setStatus("Ready to upload. Start processing when you are ready.");
  uploadFile(file);
}

async function uploadFile(file) {
  state.isBusy = true;
  elements.uploadZone.classList.add("hidden");
  setStatus("Processing your PDF and preparing its searchable context...", "loading");
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || "The document could not be uploaded.");

    state.uploaded = true;
    state.documentName = payload?.filename || payload?.document_name || file.name;
    elements.startChat.disabled = false;
    elements.chatInput.disabled = false;
    elements.sendButton.disabled = false;
    elements.documentName.textContent = state.documentName;
    renderDocumentList();
    setStatus("Document uploaded successfully. You can now start chatting.", "success");
    elements.topbarStatus.textContent = "Document ready for questions";
    showToast("Document uploaded successfully. You can now start chatting.", "success");
  } catch (error) {
    state.uploaded = false;
    const message = error instanceof TypeError
      ? "We could not reach the backend. Check that FastAPI is running and API_BASE_URL is correct."
      : error.message || "The document could not be uploaded. Please try again.";
    setStatus(message, "error");
    showToast(message, "error");
    elements.uploadZone.classList.remove("hidden");
  } finally {
    state.isBusy = false;
  }
}

function openChat() {
  if (!state.uploaded) return;
  state.chatOpen = true;
  elements.welcomeView.classList.add("hidden");
  elements.chatView.classList.remove("hidden");
  elements.chatInput.disabled = false;
  elements.sendButton.disabled = false;
  elements.clearChat.disabled = false;
  window.setTimeout(() => elements.chatInput.focus(), 80);
}

function resetChat(keepDocument = true) {
  state.chatHistory = [];
  elements.messageList.innerHTML = "";
  elements.messageList.appendChild(elements.emptyChat);
  elements.emptyChat.classList.remove("hidden");
  elements.composerStatus.textContent = "";
  elements.clearChat.disabled = true;
  if (!keepDocument) {
    state.selectedFile = null;
    state.documentName = "";
    state.uploaded = false;
    state.chatOpen = false;
    elements.fileInput.value = "";
    elements.filePreview.classList.add("hidden");
    elements.uploadZone.classList.remove("hidden");
    elements.startChat.disabled = true;
    elements.chatInput.disabled = true;
    elements.sendButton.disabled = true;
    elements.welcomeView.classList.remove("hidden");
    elements.chatView.classList.add("hidden");
    elements.documentName.textContent = "No document";
    renderDocumentList();
    setStatus("");
    elements.topbarStatus.textContent = "Ready for a document";
  }
  renderHistory();
}

function renderDocumentList() {
  if (!state.documentName) {
    elements.documentList.innerHTML = '<p class="sidebar-empty" data-testid="uploaded-documents-empty">No document selected.</p>';
    return;
  }
  elements.documentList.innerHTML = `<div class="document-item" data-testid="uploaded-document-item"><span class="document-item-icon" aria-hidden="true">◈</span><span class="document-item-copy"><strong data-testid="uploaded-document-name">${escapeHtml(state.documentName)}</strong><span data-testid="uploaded-document-status">Ready to chat</span></span></div>`;
}

function renderHistory() {
  elements.historyCount.textContent = String(state.chatHistory.length);
  if (!state.chatHistory.length) {
    elements.historyList.innerHTML = '<p class="sidebar-empty" data-testid="chat-history-empty">Your questions will appear here.</p>';
    return;
  }
  elements.historyList.innerHTML = state.chatHistory.map((item, index) => `<button class="history-item" type="button" data-history-index="${index}" data-testid="history-item-${index}"><span class="history-item-icon" aria-hidden="true">↳</span><span class="history-item-label">${escapeHtml(item.question)}</span></button>`).join("");
}

function formatAnswer(answer) {
  const safe = escapeHtml(answer || "I couldn't find an answer to that question in your document.");
  return safe.split(/\n\n+/).map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (/^###\s+/.test(trimmed)) return `<h3>${trimmed.replace(/^###\s+/, "")}</h3>`;
    if (/^[-*]\s+/.test(trimmed)) {
      const items = trimmed.split(/\n/).map((line) => `<li>${line.replace(/^[-*]\s+/, "")}</li>`).join("");
      return `<ul>${items}</ul>`;
    }
    if (/^```/.test(trimmed)) return `<pre>${trimmed.replace(/^```\w*\n?/, "").replace(/```$/, "")}</pre>`;
    const inline = trimmed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
    return `<p>${inline.replace(/\n/g, "<br>")}</p>`;
  }).join("") || `<p>${escapeHtml("I couldn't find an answer to that question in your document.")}</p>`;
}

function renderSources(sources) {
  if (!Array.isArray(sources) || !sources.length) return "";
  const cards = sources.map((source) => {
    const score = typeof source.similarity === "number" ? source.similarity.toFixed(3) : escapeHtml(source.similarity ?? "Unavailable");
    return `<article class="source-card" data-testid="source-card"><header><span data-testid="source-document-name">${escapeHtml(source.document_name || state.documentName || "Document")}</span><span class="source-score" data-testid="source-similarity">Similarity ${score}</span></header><p data-testid="source-chunk-text">${escapeHtml(source.chunk_text || "No retrieved text was returned.")}</p></article>`;
  }).join("");
  return `<details class="sources-details" data-testid="sources-details"><summary data-testid="view-sources-button">View Sources</summary><div class="sources-list">${cards}</div></details>`;
}

function addMessage(role, content, sources = []) {
  elements.emptyChat.classList.add("hidden");
  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  row.dataset.testid = `${role}-message`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.dataset.testid = `${role}-message-bubble`;
  bubble.innerHTML = role === "ai" ? `<div class="answer-content">${formatAnswer(content)}</div>` : escapeHtml(content).replace(/\n/g, "<br>");
  row.appendChild(bubble);
  if (role === "ai") {
    const sourceMarkup = renderSources(sources);
    if (sourceMarkup) row.insertAdjacentHTML("beforeend", sourceMarkup);
  }
  elements.messageList.appendChild(row);
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function addLoadingMessage() {
  elements.emptyChat.classList.add("hidden");
  const row = document.createElement("div");
  row.className = "message-row ai";
  row.dataset.testid = "ai-loading-message";
  row.innerHTML = '<div class="message-bubble"><div class="answer-content"><p>Generating your answer...</p></div></div>';
  elements.messageList.appendChild(row);
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
  return row;
}

async function sendQuestion(question) {
  if (!state.uploaded || state.isBusy || !question.trim()) return;
  const cleanQuestion = question.trim();
  state.isBusy = true;
  elements.chatInput.value = "";
  elements.chatInput.style.height = "auto";
  elements.sendButton.disabled = true;
  elements.chatInput.disabled = true;
  setComposerStatus("Generating your answer...");
  addMessage("user", cleanQuestion);
  const loading = addLoadingMessage();
  try {
    const url = new URL(`${API_BASE_URL}/chat`);
    url.search = new URLSearchParams({ question: cleanQuestion, match_count: String(MATCH_COUNT) }).toString();
    const response = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || "The answer could not be generated.");
    loading.remove();
    const answer = payload?.answer || "I couldn't find an answer to that question in your document.";
    addMessage("ai", answer, payload?.sources || []);
    state.chatHistory.push({ question: cleanQuestion, answer });
    renderHistory();
    setComposerStatus("");
    elements.clearChat.disabled = false;
  } catch (error) {
    loading.remove();
    const message = error instanceof TypeError ? "We could not reach the backend. Check your API connection." : error.message || "The answer could not be generated. Please try again.";
    addMessage("ai", message);
    setComposerStatus(message, "error");
    showToast(message, "error");
  } finally {
    state.isBusy = false;
    elements.sendButton.disabled = false;
    elements.chatInput.disabled = false;
    elements.chatInput.focus();
  }
}

elements.browseButton.addEventListener("click", (event) => { event.stopPropagation(); elements.fileInput.click(); });
elements.uploadZone.addEventListener("click", (event) => { if (event.target !== elements.browseButton) elements.fileInput.click(); });
elements.uploadZone.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); elements.fileInput.click(); } });
elements.fileInput.addEventListener("change", (event) => selectFile(event.target.files[0]));
["dragenter", "dragover"].forEach((eventName) => elements.uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.uploadZone.classList.add("is-dragging"); }));
["dragleave", "drop"].forEach((eventName) => elements.uploadZone.addEventListener(eventName, (event) => { event.preventDefault(); elements.uploadZone.classList.remove("is-dragging"); }));
elements.uploadZone.addEventListener("drop", (event) => selectFile(event.dataTransfer.files[0]));
elements.removeFile.addEventListener("click", () => resetChat(false));
elements.startChat.addEventListener("click", openChat);
elements.newChat.addEventListener("click", () => { if (state.uploaded) { openChat(); resetChat(true); } else { resetChat(false); } });
elements.clearChat.addEventListener("click", () => { resetChat(true); showToast("Chat cleared."); });
elements.chatForm.addEventListener("submit", (event) => { event.preventDefault(); sendQuestion(elements.chatInput.value); });
elements.chatInput.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); elements.chatForm.requestSubmit(); } });
elements.chatInput.addEventListener("input", () => { elements.chatInput.style.height = "auto"; elements.chatInput.style.height = `${Math.min(elements.chatInput.scrollHeight, 120)}px`; });
elements.historyList.addEventListener("click", (event) => { const item = event.target.closest("[data-history-index]"); if (!item) return; const history = state.chatHistory[Number(item.dataset.historyIndex)]; if (history) { openChat(); addMessage("user", history.question); addMessage("ai", history.answer); } });
elements.mobileMenu.addEventListener("click", () => { const open = elements.sidebar.classList.toggle("is-open"); elements.mobileMenu.setAttribute("aria-expanded", String(open)); });

renderHistory();
renderDocumentList();