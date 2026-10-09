/**
 * OKEng Standalone Embedded Widget Bundle
 * Zero-dependency, lightweight knowledge retrieval client for external host applications.
 *
 * Usage:
 * <script src="https://your-domain.com/widget.js" data-workspace="acme-cloud" data-position="bottom-right" async></script>
 *
 * Configuration:
 * window.OKEng.init({
 *   userId: "usr_102",
 *   role: "member", // "everyone" | "members" | "admins"
 *   currentUrl: window.location.pathname
 * });
 */
(function () {
  'use strict';

  if (window.__OKENG_WIDGET_LOADED__) return;
  window.__OKENG_WIDGET_LOADED__ = true;

  const currentScript = document.currentScript;
  const scriptWorkspace = currentScript?.getAttribute('data-workspace') || 'default';
  const scriptPosition = currentScript?.getAttribute('data-position') || 'bottom-right';

  // Internal State
  const state = {
    workspace: scriptWorkspace,
    position: scriptPosition,
    role: 'everyone',
    userId: 'anonymous',
    currentUrl: window.location.pathname,
    isOpen: false,
    isGenerating: false,
    messages: [
      {
        id: 'msg_welcome',
        role: 'assistant',
        content: 'Hello! I am your product knowledge assistant. How can I help you today?',
      },
    ],
  };

  // Create isolated container
  const container = document.createElement('div');
  container.id = 'okeng-widget-root';
  container.style.position = 'fixed';
  container.style.zIndex = '999999';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  container.style[state.position.includes('left') ? 'left' : 'right'] = '24px';
  container.style.bottom = '24px';
  document.body.appendChild(container);

  // Inject Styles
  const style = document.createElement('style');
  style.textContent = `
    .okeng-launcher {
      width: 48px;
      height: 48px;
      border-radius: 24px;
      background: #171717;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.15s ease, background 0.15s ease;
      border: 1px solid #2A2A2A;
    }
    .okeng-launcher:hover {
      transform: scale(1.05);
      background: #262626;
    }
    .okeng-launcher svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .okeng-drawer {
      display: none;
      width: 380px;
      height: 540px;
      max-height: 80vh;
      background: #FFFFFF;
      border: 1px solid #DEDDD8;
      border-radius: 6px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.18);
      flex-direction: column;
      overflow: hidden;
      margin-bottom: 12px;
      animation: okengSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes okengSlideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .okeng-header {
      background: #171717;
      color: #FFFFFF;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #2A2A2A;
    }
    .okeng-header-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .okeng-header-role {
      font-size: 10px;
      color: #A3A3A3;
      font-family: monospace;
      text-transform: uppercase;
    }
    .okeng-close-btn {
      background: transparent;
      border: none;
      color: #A3A3A3;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 4px;
    }
    .okeng-close-btn:hover { color: #FFFFFF; }
    .okeng-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #FAF9F6;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .okeng-msg {
      max-width: 88%;
      padding: 10px 12px;
      border-radius: 4px;
      font-size: 12.5px;
      line-height: 1.5;
      word-break: break-word;
    }
    .okeng-msg-user {
      align-self: flex-end;
      background: #171717;
      color: #FFFFFF;
    }
    .okeng-msg-assistant {
      align-self: flex-start;
      background: #FFFFFF;
      color: #171717;
      border: 1px solid #DEDDD8;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .okeng-sources {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #E5E5E0;
      font-size: 11px;
    }
    .okeng-source-tag {
      display: inline-block;
      margin-top: 4px;
      margin-right: 4px;
      padding: 2px 6px;
      background: #F4F4F0;
      border: 1px solid #DEDDD8;
      border-radius: 3px;
      color: #1D4ED8;
      font-family: monospace;
      font-size: 10px;
    }
    .okeng-cta-btn {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 10px;
      background: #1D4ED8;
      color: #FFFFFF;
      border-radius: 3px;
      text-decoration: none;
      font-size: 11px;
      font-weight: 500;
    }
    .okeng-input-bar {
      padding: 12px;
      background: #FFFFFF;
      border-top: 1px solid #DEDDD8;
      display: flex;
      gap: 8px;
    }
    .okeng-input {
      flex: 1;
      padding: 8px 10px;
      font-size: 12px;
      border: 1px solid #DEDDD8;
      border-radius: 4px;
      outline: none;
      background: #FAF9F6;
      color: #171717;
    }
    .okeng-input:focus {
      border-color: #1D4ED8;
      background: #FFFFFF;
    }
    .okeng-send-btn {
      padding: 0 12px;
      background: #171717;
      color: #FFFFFF;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }
    .okeng-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .okeng-cursor {
      display: inline-block;
      width: 6px;
      height: 14px;
      background: #171717;
      vertical-align: middle;
      margin-left: 2px;
      animation: okengBlink 0.8s infinite;
    }
    @keyframes okengBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Render Skeleton
  container.innerHTML = `
    <div class="okeng-drawer" id="okeng-drawer">
      <div class="okeng-header">
        <div>
          <div class="okeng-header-title">Product Knowledge</div>
          <div class="okeng-header-role" id="okeng-header-role">Role: ${state.role}</div>
        </div>
        <button class="okeng-close-btn" id="okeng-close-btn">&times;</button>
      </div>
      <div class="okeng-messages" id="okeng-messages"></div>
      <form class="okeng-input-bar" id="okeng-form">
        <input type="text" class="okeng-input" id="okeng-input" placeholder="Ask product question..." autocomplete="off" />
        <button type="submit" class="okeng-send-btn" id="okeng-send-btn">Ask</button>
      </form>
    </div>
    <div class="okeng-launcher" id="okeng-launcher" title="Ask Knowledge Assistant">
      <svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M6 6h10"></path><path d="M6 10h10"></path></svg>
    </div>
  `;

  const drawerEl = document.getElementById('okeng-drawer');
  const launcherEl = document.getElementById('okeng-launcher');
  const closeBtn = document.getElementById('okeng-close-btn');
  const messagesEl = document.getElementById('okeng-messages');
  const formEl = document.getElementById('okeng-form');
  const inputEl = document.getElementById('okeng-input');
  const sendBtn = document.getElementById('okeng-send-btn');
  const roleEl = document.getElementById('okeng-header-role');

  function toggleOpen(open) {
    state.isOpen = typeof open === 'boolean' ? open : !state.isOpen;
    drawerEl.style.display = state.isOpen ? 'flex' : 'none';
    launcherEl.style.display = state.isOpen ? 'none' : 'flex';
    if (state.isOpen) {
      renderMessages();
      inputEl.focus();
    }
  }

  launcherEl.addEventListener('click', () => toggleOpen(true));
  closeBtn.addEventListener('click', () => toggleOpen(false));

  function renderMessages() {
    messagesEl.innerHTML = '';
    state.messages.forEach((msg) => {
      const el = document.createElement('div');
      el.className = `okeng-msg ${msg.role === 'user' ? 'okeng-msg-user' : 'okeng-msg-assistant'}`;
      el.innerHTML = `<div>${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>`;

      if (msg.isStreaming) {
        el.innerHTML += `<span class="okeng-cursor"></span>`;
      }

      if (msg.sources && msg.sources.length > 0) {
        const srcEl = document.createElement('div');
        srcEl.className = 'okeng-sources';
        srcEl.innerHTML = `<div>Sources:</div>` +
          msg.sources.map((s) => `<span class="okeng-source-tag">✓ ${escapeHtml(s.filename)}</span>`).join('');
        el.appendChild(srcEl);
      }

      if (msg.cta) {
        const ctaEl = document.createElement('div');
        ctaEl.innerHTML = `<a href="${escapeHtml(msg.cta.url)}" target="_blank" class="okeng-cta-btn">${escapeHtml(msg.cta.label)} &rarr;</a>`;
        el.appendChild(ctaEl);
      }

      messagesEl.appendChild(el);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Handle Query Submission with SSE Streaming
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text || state.isGenerating) return;

    inputEl.value = '';
    state.isGenerating = true;
    sendBtn.disabled = true;

    state.messages.push({
      id: 'usr_' + Date.now(),
      role: 'user',
      content: text,
    });

    const assistantMsg = {
      id: 'ast_' + Date.now(),
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    state.messages.push(assistantMsg);
    renderMessages();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          role: state.role,
          currentUrl: state.currentUrl,
        }),
      });

      if (!response.ok || !response.body) throw new Error('Network error');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.replace(/^data:\s*/, ''));
              if (data.type === 'metadata') {
                assistantMsg.sources = data.sources;
                assistantMsg.cta = data.cta;
                renderMessages();
              } else if (data.type === 'chunk') {
                assistantMsg.content += data.text;
                renderMessages();
              } else if (data.type === 'done') {
                assistantMsg.isStreaming = false;
                state.isGenerating = false;
                sendBtn.disabled = false;
                renderMessages();
              }
            } catch (err) {
              console.warn(err);
            }
          }
        }
      }
    } catch (err) {
      assistantMsg.content = 'Sorry, unable to retrieve knowledge answer at this time.';
      assistantMsg.isStreaming = false;
      state.isGenerating = false;
      sendBtn.disabled = false;
      renderMessages();
    }
  });

  // Public SDK
  window.OKEng = {
    init: function (opts) {
      if (!opts) return;
      if (opts.role) {
        state.role = opts.role;
        roleEl.textContent = 'Role: ' + opts.role;
      }
      if (opts.userId) state.userId = opts.userId;
      if (opts.currentUrl) state.currentUrl = opts.currentUrl;
      if (opts.workspace) state.workspace = opts.workspace;
    },
    open: function () { toggleOpen(true); },
    close: function () { toggleOpen(false); },
  };
})();
