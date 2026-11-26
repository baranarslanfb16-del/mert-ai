(function () {
  "use strict";

  var STORAGE_KEY = "mert-ai-conversations-v1";
  var loginScreen = document.getElementById("login-screen");
  var loginForm = document.getElementById("login-form");
  var loginError = document.getElementById("login-error");
  var appShell = document.getElementById("app-shell");
  var chatForm = document.getElementById("chat-form");
  var input = document.getElementById("message-input");
  var sendButton = document.getElementById("send-button");
  var welcome = document.getElementById("welcome");
  var chatArea = document.getElementById("chat-area");
  var messagesEl = document.getElementById("messages");
  var historyList = document.getElementById("history-list");
  var current = null;
  var conversations = loadConversations();
  var busy = false;

  function loadConversations() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (_) { return []; }
  }

  function saveConversations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 12)));
    } catch (_) { /* Sohbet kaydı başarısız olsa da sohbet çalışmaya devam eder. */ }
  }

  function makeConversation() {
    return { id: String(Date.now()) + Math.random().toString(16).slice(2), title: "Yeni sohbet", messages: [], apiHistory: [], updated: Date.now() };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function showApp() {
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    if (!current) current = makeConversation();
    render();
    input.focus();
  }

  async function checkLogin() {
    try {
      var response = await fetch("/api/login", { method: "GET", credentials: "same-origin" });
      var data = await response.json();
      if (data.enabled && !data.authenticated) {
        appShell.classList.add("hidden");
        loginScreen.classList.remove("hidden");
      } else {
        showApp();
      }
    } catch (_) {
      /* API henüz dağıtılmadıysa kullanıcıya sohbet ekranını göster; gönderim sırasında hata açıklanır. */
      showApp();
    }
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginError.textContent = "Kontrol ediliyor...";
    var password = document.getElementById("site-password").value;
    try {
      var response = await fetch("/api/login", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password })
      });
      var data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Şifre doğru değil.");
      document.getElementById("site-password").value = "";
      showApp();
    } catch (error) {
      loginError.textContent = error.message || "Giriş yapılamadı. Tekrar dene.";
    }
  });

  function createNewChat() {
    if (busy) return;
    current = makeConversation();
    render();
    input.focus();
  }

  document.getElementById("new-chat").addEventListener("click", createNewChat);
  document.getElementById("mobile-new-chat").addEventListener("click", createNewChat);

  function renderHistory() {
    historyList.innerHTML = "";
    conversations.slice().sort(function (a, b) { return b.updated - a.updated; }).forEach(function (conversation) {
      var button = document.createElement("button");
      button.className = "history-item" + (current && current.id === conversation.id ? " active" : "");
      button.textContent = conversation.title || "Yeni sohbet";
      button.title = button.textContent;
      button.addEventListener("click", function () {
        if (busy) return;
        current = conversation;
        render();
      });
      historyList.appendChild(button);
    });
  }

  function renderMessages() {
    messagesEl.innerHTML = "";
    (current.messages || []).forEach(function (message) {
      appendMessage(message.role, message.text, message.error);
    });
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function appendMessage(role, text, isError) {
    var row = document.createElement("div");
    row.className = "message-row " + (role === "user" ? "user" : "assistant") + (isError ? " error" : "");
    var avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "M" : "✦";
    var content = document.createElement("div");
    content.className = "message-content";
    var name = document.createElement("div");
    name.className = "message-name";
    name.textContent = role === "user" ? "Sen" : (isError ? "Uyarı" : "Mert AI");
    var bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    content.appendChild(name);
    content.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(content);
    messagesEl.appendChild(row);
    return row;
  }

  function render() {
    var hasMessages = current && current.messages && current.messages.length > 0;
    welcome.classList.toggle("hidden", !!hasMessages);
    chatArea.classList.toggle("hidden", !hasMessages);
    if (hasMessages) renderMessages(); else messagesEl.innerHTML = "";
    renderHistory();
  }

  function updateSendState() {
    sendButton.disabled = busy || !input.value.trim();
  }

  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 150) + "px";
    updateSendState();
  });
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sendButton.disabled) chatForm.requestSubmit();
    }
  });

  document.querySelectorAll(".suggestion-card").forEach(function (button) {
    button.addEventListener("click", function () {
      input.value = button.getAttribute("data-prompt") || "";
      updateSendState();
      chatForm.requestSubmit();
    });
  });

  function saveCurrent() {
    if (!current) return;
    current.updated = Date.now();
    var index = conversations.findIndex(function (item) { return item.id === current.id; });
    if (index >= 0) conversations[index] = current;
    else conversations.unshift(current);
    conversations.sort(function (a, b) { return b.updated - a.updated; });
    conversations = conversations.slice(0, 12);
    saveConversations();
    renderHistory();
  }

  async function sendMessage(text) {
    if (busy || !text.trim()) return;
    if (!current) current = makeConversation();
    var cleanText = text.trim();
    if (current.apiHistory.length > 42) {
      current = makeConversation();
      current.messages.push({ role: "assistant", text: "Bu sohbet çok uzadı; konuşma belleğini yeniledim. Önceki mesajlarını sol taraftaki sohbet geçmişinden görebilirsin." });
    }
    current.messages.push({ role: "user", text: cleanText });
    if (current.messages.filter(function (m) { return m.role === "user"; }).length === 1) {
      current.title = cleanText.length > 27 ? cleanText.slice(0, 27) + "…" : cleanText;
    }
    render();
    busy = true;
    input.value = "";
    input.style.height = "auto";
    updateSendState();
    var loadingRow = document.createElement("div");
    loadingRow.className = "message-row assistant";
    loadingRow.innerHTML = '<div class="message-avatar">✦</div><div class="message-content"><div class="message-name">Mert AI yazıyor</div><div class="message-bubble typing"><i></i><i></i><i></i></div></div>';
    messagesEl.appendChild(loadingRow);
    chatArea.classList.remove("hidden");
    welcome.classList.add("hidden");
    chatArea.scrollTop = chatArea.scrollHeight;

    var userStep = { type: "user_input", content: [{ type: "text", text: cleanText }] };
    var apiInput = (current.apiHistory || []).concat([userStep]);
    try {
      var response = await fetch("/api/chat", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: apiInput })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sunucu bir hata döndürdü.");
      var answer = data.text || "Bu yanıtta metin bulunamadı. Başka bir şekilde sormayı deneyebilirsin.";
      current.apiHistory = apiInput.concat(Array.isArray(data.steps) ? data.steps : []);
      current.messages.push({ role: "assistant", text: answer });
      loadingRow.remove();
      appendMessage("assistant", answer, false);
      saveCurrent();
    } catch (error) {
      loadingRow.remove();
      var errorText = error.message || "Bir hata oluştu. Biraz sonra tekrar dene.";
      current.messages.push({ role: "assistant", text: errorText, error: true });
      appendMessage("assistant", errorText, true);
      saveCurrent();
    } finally {
      busy = false;
      updateSendState();
      input.focus();
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(input.value);
  });

  checkLogin();
})();
