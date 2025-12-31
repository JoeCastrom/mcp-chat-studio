/**
 * Brain View - Timeline Trace
 * Renders a readable execution timeline with timestamps and tool badges.
 */

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

const brainState = {
  messages: [],
  context: {
    totalTokens: 0,
    systemTokens: 0,
    userTokens: 0,
    assistantTokens: 0,
    toolTokens: 0
  },
  timeline: [],
  messageTimestamps: new Map(),
  baseTime: null
};

function getTimelineContainers() {
  return Array.from(document.querySelectorAll('.brain-timeline'));
}

function initBrainView() {
  const timelines = getTimelineContainers();
  if (timelines.length === 0) return;

  const messagesContainer = document.getElementById('messages');
  if (messagesContainer && !messagesContainer.dataset.brainObserver) {
    const observer = new MutationObserver(() => {
      const messages = Array.from(document.querySelectorAll('#messages .message'));
      updateBrainGraph(messages);
    });
    observer.observe(messagesContainer, { childList: true, subtree: true });
    messagesContainer.dataset.brainObserver = 'true';
  }

  const messages = Array.from(document.querySelectorAll('#messages .message'));
  updateBrainGraph(messages);
}

function getToolHistoryMessages() {
  if (typeof window.getToolExecutionHistory !== 'function') return [];
  const history = window.getToolExecutionHistory() || [];
  return history.map(entry => ({
    role: 'tool',
    content: entry.response ? JSON.stringify(entry.response) : '',
    tool: entry.tool,
    server: entry.server,
    success: entry.success !== false,
    timestamp: entry.timestamp
  }));
}

function getMessagePreview(text, maxLength) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'No content';
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

function getMessageKey(role, content, index) {
  const seed = String(content || '').slice(0, 40);
  return `${role}:${index}:${seed}`;
}

function ensureBaseTime(count) {
  if (!brainState.baseTime) {
    const now = Date.now();
    brainState.baseTime = now - count * 1200;
  }
}

function updateBrainGraph(messageDomElements = []) {
  const domMessages = messageDomElements.map(msgEl => {
    let role = 'unknown';
    if (msgEl.classList.contains('user')) role = 'user';
    else if (msgEl.classList.contains('assistant')) role = 'assistant';
    else if (msgEl.classList.contains('system')) role = 'system';

    if (msgEl.innerHTML.includes('✅') || msgEl.innerHTML.includes('⚠️') || msgEl.innerHTML.includes('❌')) {
      role = 'tool';
    }

    return {
      role,
      content: msgEl.innerText || ''
    };
  });

  const toolMessages = getToolHistoryMessages();
  brainState.messages = domMessages.concat(toolMessages);

  // Calculate context breakdown
  brainState.context = {
    totalTokens: 0,
    systemTokens: 0,
    userTokens: 0,
    assistantTokens: 0,
    toolTokens: 0
  };

  brainState.messages.forEach(msg => {
    const tokens = estimateTokens(msg.content);
    brainState.context.totalTokens += tokens;

    if (msg.role === 'system') {
      brainState.context.systemTokens += tokens;
    } else if (msg.role === 'user') {
      brainState.context.userTokens += tokens;
    } else if (msg.role === 'assistant') {
      brainState.context.assistantTokens += tokens;
    } else if (msg.role === 'tool') {
      brainState.context.toolTokens += tokens;
    }
  });

  buildTimeline(domMessages, toolMessages);
  renderTimeline();
  renderContextStats();
}

function buildTimeline(domMessages, toolMessages) {
  ensureBaseTime(domMessages.length);
  const entries = [];

  domMessages.forEach((msg, index) => {
    const key = getMessageKey(msg.role, msg.content, index);
    let timestamp = brainState.messageTimestamps.get(key);
    if (!timestamp) {
      timestamp = brainState.baseTime + index * 1200;
      if (timestamp > Date.now()) timestamp = Date.now();
      brainState.messageTimestamps.set(key, timestamp);
    }
    entries.push({
      kind: 'message',
      role: msg.role || 'unknown',
      content: msg.content,
      timestamp
    });
  });

  toolMessages.forEach(msg => {
    const timestamp = msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now();
    entries.push({
      kind: 'tool',
      role: 'tool',
      content: msg.content,
      tool: msg.tool,
      server: msg.server,
      success: msg.success !== false,
      timestamp
    });
  });

  entries.sort((a, b) => a.timestamp - b.timestamp);
  brainState.timeline = entries;
}

function formatTime(timestamp) {
  if (!timestamp) return '--:--:--';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderTimeline() {
  const containers = getTimelineContainers();
  if (containers.length === 0) return;

  const iconMap = {
    system: '🖥️',
    user: '👤',
    assistant: '🤖',
    tool: '⚙️',
    unknown: '❓'
  };

  containers.forEach(container => {
    const list = container.querySelector('.brain-timeline-list');
    if (!list) return;

    if (brainState.timeline.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem;">No activity yet.</div>';
      return;
    }

    list.innerHTML = brainState.timeline.map((entry, index) => {
      const timeLabel = formatTime(entry.timestamp);
      const role = entry.role || 'unknown';
      const icon = iconMap[role] || '❓';
      const isTool = entry.kind === 'tool';
      const status = isTool ? (entry.success ? 'success' : 'error') : 'neutral';
      const title = isTool
        ? `${entry.server ? `${entry.server}.` : ''}${entry.tool || 'Tool'}`
        : getMessagePreview(entry.content, 52);
      const preview = isTool
        ? entry.success ? 'Tool call completed' : 'Tool call failed'
        : getMessagePreview(entry.content, 120);

      const badges = isTool
        ? `<span class="brain-badge tool">Tool</span><span class="brain-badge ${entry.success ? '' : 'error'}">${entry.success ? 'Success' : 'Error'}</span>`
        : `<span class="brain-badge ${role}">${role}</span>`;

      return `
        <div class="brain-timeline-item" data-role="${role}" data-status="${status}">
          <span class="brain-timeline-dot"></span>
          <div class="brain-timeline-card">
            <div class="brain-timeline-meta">
              <span>#${index + 1}</span>
              <span>${timeLabel}</span>
            </div>
            <div class="brain-timeline-title">
              <span>${icon}</span>
              <span>${escapeHtml(title)}</span>
            </div>
            <div class="brain-timeline-preview">${escapeHtml(preview)}</div>
            <div class="brain-timeline-badges">${badges}</div>
          </div>
        </div>
      `;
    }).join('');
  });
}

function renderContextStats() {
  const statsEls = [
    document.getElementById('contextStats'),
    document.getElementById('chatContextStats')
  ].filter(Boolean);
  if (statsEls.length === 0) return;

  const { totalTokens, systemTokens, userTokens, assistantTokens, toolTokens } = brainState.context;

  const html = `
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-secondary);">Total Tokens:</span>
        <span style="font-weight: 600; color: var(--accent);">${totalTokens.toLocaleString()}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #8b5cf6;">● System:</span>
        <span>${systemTokens.toLocaleString()} (${((systemTokens / totalTokens) * 100 || 0).toFixed(1)}%)</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #3b82f6;">● User:</span>
        <span>${userTokens.toLocaleString()} (${((userTokens / totalTokens) * 100 || 0).toFixed(1)}%)</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #10b981;">● Assistant:</span>
        <span>${assistantTokens.toLocaleString()} (${((assistantTokens / totalTokens) * 100 || 0).toFixed(1)}%)</span>
      </div>
      ${toolTokens > 0 ? `
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #f59e0b;">● Tools:</span>
        <span>${toolTokens.toLocaleString()} (${((toolTokens / totalTokens) * 100 || 0).toFixed(1)}%)</span>
      </div>
      ` : ''}
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-secondary);">Messages:</span>
          <span style="font-weight: 600;">${brainState.messages.length}</span>
        </div>
      </div>
    </div>
  `;

  statsEls.forEach(statsEl => {
    statsEl.innerHTML = html;
  });
}

function estimateTokens(content) {
  if (!content) return 0;
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  return Math.ceil(str.length / 4);
}

window.initBrainView = initBrainView;
window.updateBrainGraph = updateBrainGraph;
window.resetBrainTimeline = () => {
  brainState.messageTimestamps.clear();
  brainState.baseTime = null;
  brainState.timeline = [];
};
