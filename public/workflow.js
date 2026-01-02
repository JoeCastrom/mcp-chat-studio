// Workflow Editor Logic

const workflowState = {
  currentId: null,
  nodes: [],
  edges: [],
  scale: 1,
  panning: { x: 0, y: 0 },
  isDragging: false,
  dragNodeId: null,
  dragOffset: { x: 0, y: 0 },
  isConnecting: false,
  connectStartNode: null,
  connectStartPort: null, // 'in' or 'out'
  tempMousePos: { x: 0, y: 0 }
};

const toolSchemaCache = {};

// Custom toast notification that matches app styling
function showToast(message, type = 'success') {
  // Remove any existing toasts
  const existingToasts = document.querySelectorAll('.workflow-toast');
  existingToasts.forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = 'workflow-toast';
  
  // Styling based on type
  const colors = {
    success: { bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))', icon: '✅', border: 'rgba(34, 197, 94, 0.5)' },
    error: { bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))', icon: '❌', border: 'rgba(239, 68, 68, 0.5)' },
    info: { bg: 'linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(109, 40, 217, 0.95))', icon: '💡', border: 'rgba(124, 58, 237, 0.5)' },
    warning: { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))', icon: '⚠️', border: 'rgba(245, 158, 11, 0.5)' }
  };
  
  const config = colors[type] || colors.info;
  
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${config.bg};
    color: white;
    border-radius: 12px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px ${config.border};
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: toastSlideIn 0.3s ease-out;
    backdrop-filter: blur(10px);
  `;
  
  // Add animation keyframes if not exists
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes toastSlideIn {
        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes toastSlideOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  toast.innerHTML = `<span style="font-size: 16px;">${config.icon}</span> ${message}`;
  document.body.appendChild(toast);
  
  // Auto-remove after 3 seconds with fade out
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  setupCanvasInteractions();
  loadWorkflowsList();
  updateAIBuilderModelBadge(); // Sync model badge with current LLM config
});

// Update AI Builder model badge
async function updateAIBuilderModelBadge() {
  const badge = document.getElementById('aiModelBadge');
  if (!badge) return;
  
  try {
    const res = await fetch('/api/llm/config');
    const config = await res.json();
    
    const providerEmojis = {
      ollama: '🦙',
      openai: '🤖',
      anthropic: '🎭',
      gemini: '💎',
      azure: '☁️',
      groq: '⚡',
      together: '🤝',
      openrouter: '🌐',
    };
    
    const emoji = providerEmojis[config.provider] || '🤖';
    badge.textContent = `${emoji} ${config.model}`;
  } catch (e) {
    badge.textContent = '🤖 Unknown';
  }
}

// ==========================================
// CANVAS INTERACTIONS
// ==========================================

function setupCanvasInteractions() {
  const canvas = document.getElementById('workflowCanvas');
  if (!canvas) return;
  
  // Dragging Nodes
  canvas.addEventListener('mousedown', e => {
    if (e.target.closest('.workflow-node-header')) {
      const nodeEl = e.target.closest('.workflow-node');
      startDragNode(e, nodeEl.dataset.id);
    } else if (e.target.classList.contains('port')) {
      startConnection(e);
    }
  });

  window.addEventListener('mousemove', e => {
    if (workflowState.isDragging) {
      dragNode(e);
    } else if (workflowState.isConnecting) {
      dragConnection(e);
    }
  });

  window.addEventListener('mouseup', e => {
    if (workflowState.isDragging) {
      stopDragNode();
    } else if (workflowState.isConnecting) {
      finishConnection(e);
    }
  });
}

function startDragNode(e, nodeId) {
  workflowState.isDragging = true;
  workflowState.dragNodeId = nodeId;
  
  const node = workflowState.nodes.find(n => n.id === nodeId);
  const canvas = document.getElementById('workflowCanvas');
  const rect = canvas.getBoundingClientRect();
  
  // Disable transitions during drag for smooth movement
  const nodeEl = document.querySelector(`.workflow-node[data-id="${nodeId}"]`);
  if (nodeEl) nodeEl.classList.add('dragging');
  
  workflowState.dragOffset = {
    x: e.clientX - rect.left - node.position.x,
    y: e.clientY - rect.top - node.position.y
  };
}

function dragNode(e) {
  const canvas = document.getElementById('workflowCanvas');
  const rect = canvas.getBoundingClientRect();
  
  const x = e.clientX - rect.left - workflowState.dragOffset.x;
  const y = e.clientY - rect.top - workflowState.dragOffset.y;
  
  const node = workflowState.nodes.find(n => n.id === workflowState.dragNodeId);
  if (node) {
    node.position = { x, y };
    renderNodePosition(node);
    renderEdges();
  }
}

function stopDragNode() {
  // Re-enable transitions after drag
  const nodeEl = document.querySelector(`.workflow-node[data-id="${workflowState.dragNodeId}"]`);
  if (nodeEl) nodeEl.classList.remove('dragging');
  
  workflowState.isDragging = false;
  workflowState.dragNodeId = null;
}

function startConnection(e) {
  const port = e.target;
  const nodeEl = port.closest('.workflow-node');
  const nodeId = nodeEl.dataset.id;
  const type = port.classList.contains('port-out') ? 'out' : 'in';
  
  workflowState.isConnecting = true;
  workflowState.connectStartNode = nodeId;
  workflowState.connectStartPort = type;
  
  // Prevent selecting text while dragging
  e.preventDefault();
}

function dragConnection(e) {
  const canvas = document.getElementById('workflowCanvas');
  const rect = canvas.getBoundingClientRect();
  workflowState.tempMousePos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  renderEdges(); // Will render the temp line
}

function finishConnection(e) {
  if (e.target.classList.contains('port')) {
    const endPort = e.target;
    const endNodeEl = endPort.closest('.workflow-node');
    const endNodeId = endNodeEl.dataset.id;
    const endType = endPort.classList.contains('port-out') ? 'out' : 'in';
    
    // Validate connection: must be Out -> In, different nodes
    if (workflowState.connectStartPort !== endType && workflowState.connectStartNode !== endNodeId) {
      const from = workflowState.connectStartPort === 'out' ? workflowState.connectStartNode : endNodeId;
      const to = workflowState.connectStartPort === 'out' ? endNodeId : workflowState.connectStartNode;
      
      // Check if duplicate
      if (!workflowState.edges.some(edge => edge.from === from && edge.to === to)) {
        workflowState.edges.push({ from, to });
      }
    }
  }
  
  workflowState.isConnecting = false;
  workflowState.connectStartNode = null;
  renderEdges();
}

// ==========================================
// RENDERING
// ==========================================

function renderWorkflow() {
  const canvas = document.getElementById('workflowCanvas');
  // Keep the SVG layer, remove nodes
  const svg = document.getElementById('workflowConnections');
  canvas.innerHTML = '';
  canvas.appendChild(svg);
  
  workflowState.nodes.forEach(node => {
    const el = createNodeElement(node);
    canvas.appendChild(el);
    renderNodePosition(node);
  });
  
  renderEdges();
}

function centerWorkflowView() {
  const canvas = document.getElementById('workflowCanvas');
  if (!canvas || workflowState.nodes.length === 0) return;

  const canvasRect = canvas.getBoundingClientRect();
  const nodeEls = canvas.querySelectorAll('.workflow-node');
  if (nodeEls.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodeEls.forEach(nodeEl => {
    const rect = nodeEl.getBoundingClientRect();
    const x = rect.left - canvasRect.left + canvas.scrollLeft;
    const y = rect.top - canvasRect.top + canvas.scrollTop;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + rect.width);
    maxY = Math.max(maxY, y + rect.height);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const targetLeft = Math.max(0, centerX - canvas.clientWidth / 2);
  const targetTop = Math.max(0, centerY - canvas.clientHeight / 2);

  canvas.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
}

// Async helper to populate server select
async function populateServerSelect(nodeId, selectedServer = null) {
  try {
    const res = await fetch('/api/mcp/status', { credentials: 'include' });
    const status = await res.json();
    const servers = status.servers || status;
    let serverNames = Object.keys(servers).filter(name => {
      const info = servers[name];
      return info?.connected || info?.userConnected;
    });

    if (serverNames.length === 0) {
      const toolsRes = await fetch('/api/mcp/tools', { credentials: 'include' });
      const toolsData = await toolsRes.json();
      const tools = toolsData.tools || [];
      serverNames = Array.from(new Set(
        tools
          .filter(tool => !tool.notConnected)
          .map(tool => tool.serverName)
          .filter(Boolean)
      ));
    }
    
    const select = document.getElementById(`server_select_${nodeId}`);
    if (select) {
      select.innerHTML = '<option value="">Select Server</option>' + 
        serverNames.map(s => `<option value="${s}" ${s === selectedServer ? 'selected' : ''}>${s}</option>`).join('');
    }
  } catch (e) {
    console.error('Failed to load servers', e);
  }
}

function createNodeElement(node) {
  const el = document.createElement('div');
  el.className = 'workflow-node';
  el.dataset.id = node.id;
  el.dataset.type = node.type; // For CSS styling by type
  
  // Icons per type
  const icons = {
    trigger: '▶️',
    tool: '🛠️',
    llm: '🤖',
    javascript: '📜',
    assert: '✓'
  };
  const icon = icons[node.type] || '📦';

  let contentHtml = '';
  
  if (node.type === 'trigger') {
    contentHtml = `<div class="workflow-node-content">
      <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4;">
        <div style="margin-bottom: 6px;">Starts execution.</div>
        <div style="background: rgba(0,0,0,0.15); padding: 6px 8px; border-radius: 4px; font-size: 0.7rem;">
          <strong>Tip:</strong> Access input via <code style="background:rgba(99,102,241,0.2); padding:1px 4px; border-radius:3px; color: var(--accent-primary);">{{input}}</code>
        </div>
      </div>
    </div>`;
  } else if (node.type === 'tool') {
    contentHtml = `
      <div class="workflow-node-content" style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <label>Server</label>
          <select class="form-select" id="server_select_${node.id}" onmousedown="event.stopPropagation()" onchange="updateNodeData('${node.id}', 'server', this.value); populateToolSelect('${node.id}', this.value)">
            <option value="">Loading...</option>
          </select>
        </div>
        <div>
          <label>Tool</label>
          <select class="form-select node-tool-select" id="tool_select_${node.id}" onmousedown="event.stopPropagation()" onfocus="refreshToolSelect('${node.id}')" onchange="handleToolSelection('${node.id}', this.value)">
            <option value="">Select Server First</option>
          </select>
        </div>
        <div>
          <label>Arguments (JSON)</label>
          <textarea class="form-input" placeholder='{"arg": "{{prev.output}}"}' 
            oninput="updateNodeData('${node.id}', 'args', this.value)"
            style="height: 60px;" id="args_input_${node.id}">${typeof node.data.args === 'object' ? JSON.stringify(node.data.args, null, 2) : (node.data.args || '')}</textarea>
        </div>
        <div id="tool_hint_${node.id}" class="tool-schema-hint">Select a tool to see required args.</div>
      </div>
    `;
    setTimeout(() => populateServerSelect(node.id, node.data.server), 0);
    if (node.data.server) {
      setTimeout(() => populateToolSelect(node.id, node.data.server, node.data.tool), 0);
    }
  } else if (node.type === 'llm') {
    contentHtml = `
      <div class="workflow-node-content" style="display: flex; flex-direction: column; gap: 8px;">
        <div>
           <select class="form-select" style="font-size: 0.7rem;" onchange="loadPromptTemplate('${node.id}', this.value)">
             <option value="">Load System Prompt...</option>
             ${getPromptOptions()}
           </select>
        </div>
        <textarea class="form-input" id="prompt_text_${node.id}" placeholder="System Prompt / Instructions..."
          oninput="updateNodeData('${node.id}', 'systemPrompt', this.value)"
          style="height: 50px;">${node.data.systemPrompt || ''}</textarea>
        <textarea class="form-input" placeholder="User Message... (use {{tool_id.output}})" 
          oninput="updateNodeData('${node.id}', 'prompt', this.value)"
          style="height: 80px;">${node.data.prompt || ''}</textarea>
      </div>
    `;
  } else if (node.type === 'javascript') {
    contentHtml = `
      <div class="workflow-node-content">
        <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px;">
          Available: <code>input</code>, <code>context.steps</code>
        </div>
        <textarea class="form-input" placeholder="// return input.value + 1;"
          oninput="updateNodeData('${node.id}', 'code', this.value)"
          style="height: 100px;">${node.data.code || ''}</textarea>
      </div>
    `;
  } else if (node.type === 'assert') {
    contentHtml = `
      <div class="workflow-node-content" style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <label style="font-size: 0.7rem;">Condition</label>
          <select class="form-select" onchange="updateNodeData('${node.id}', 'condition', this.value)" style="font-size: 0.75rem;">
            <option value="contains" ${node.data.condition === 'contains' ? 'selected' : ''}>Output contains</option>
            <option value="equals" ${node.data.condition === 'equals' ? 'selected' : ''}>Output equals</option>
            <option value="not_contains" ${node.data.condition === 'not_contains' ? 'selected' : ''}>Output does NOT contain</option>
            <option value="truthy" ${node.data.condition === 'truthy' ? 'selected' : ''}>Output is truthy</option>
            <option value="length_gt" ${node.data.condition === 'length_gt' ? 'selected' : ''}>Output length ></option>
          </select>
        </div>
        <div>
          <label style="font-size: 0.7rem;">Expected Value</label>
          <input class="form-input" type="text" placeholder="success" 
            value="${node.data.expected || ''}"
            oninput="updateNodeData('${node.id}', 'expected', this.value)">
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted); padding: 6px; background: rgba(0,0,0,0.1); border-radius: 4px;">
          Tests: <code>{{prev.output}}</code>
        </div>
      </div>
    `;
  }

  // Ports
  const portIn = node.type !== 'trigger' ? `<div class="port port-in" title="Input"></div>` : '';
  const portOut = `<div class="port port-out" title="Output"></div>`;

  el.innerHTML = `
    ${portIn}
    ${portOut}
    <div class="workflow-node-header">
      <span style="display: flex; align-items: center; gap: 6px;">${icon} ${node.type.toUpperCase()}</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.65rem; opacity: 0.7;">${node.id.split('_')[1] || ''}</span>
        <button class="workflow-node-delete" onclick="deleteNode('${node.id}')" title="Delete node">✕</button>
      </div>
    </div>
    ${contentHtml}
  `;

  return el;
}

// Helper to get prompt options from localStorage
function getPromptOptions() {
  try {
    const prompts = JSON.parse(localStorage.getItem('mcp_chat_studio_prompts') || '{}');
    const defaults = {
        'default': { name: 'Default Assistant' },
        'strict-coder': { name: 'Strict Coder' },
        'json-validator': { name: 'JSON Validator' }
    };
    const all = { ...defaults, ...prompts };
    return Object.entries(all).map(([k, v]) => `<option value="${k}">${escapeHtml(v.name)}</option>`).join('');
  } catch (e) { return ''; }
}

function loadPromptTemplate(nodeId, promptId) {
  if (!promptId) return;
  // We need to fetch the actual text. In app.js it's in sessionManager.
  // We'll quick-fetch from localStorage again or defaults.
  // Simplified logic:
  let promptText = "";
  if (promptId === 'default') promptText = 'You are a helpful AI assistant.';
  else if (promptId === 'strict-coder') promptText = 'You are a strict coding assistant.';
  else {
      try {
        const prompts = JSON.parse(localStorage.getItem('mcp_chat_studio_prompts') || '{}');
        if (prompts[promptId]) promptText = prompts[promptId].prompt;
      } catch(e) {}
  }
  
  if (promptText) {
      document.getElementById(`prompt_text_${nodeId}`).value = promptText;
      updateNodeData(nodeId, 'systemPrompt', promptText);
  }
}

function renderNodePosition(node) {
  const el = document.querySelector(`.workflow-node[data-id="${node.id}"]`);
  if (el) {
    el.style.left = `${node.position.x}px`;
    el.style.top = `${node.position.y}px`;
  }
}

function renderEdges() {
  const svg = document.getElementById('workflowConnections');
  svg.innerHTML = '';
  
  // Render existing edges
  workflowState.edges.forEach(edge => {
    const fromNode = workflowState.nodes.find(n => n.id === edge.from);
    const toNode = workflowState.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;
    
    // Calculate port positions
    // Out port is right-middle of fromNode
    // In port is left-middle of toNode
    // Assuming node width 240px (updated in createNodeElement)
    const startX = fromNode.position.x + 240; 
    const startY = fromNode.position.y + 45; // Approx middle of header + content
    const endX = toNode.position.x;
    const endY = toNode.position.y + 45;
    
    drawCurve(svg, startX, startY, endX, endY);
  });
  
  // Render temp connection line
  if (workflowState.isConnecting && workflowState.connectStartNode) {
    const startNode = workflowState.nodes.find(n => n.id === workflowState.connectStartNode);
    let startX, startY;
    
    if (workflowState.connectStartPort === 'out') {
      startX = startNode.position.x + 240;
      startY = startNode.position.y + 45;
    } else {
      startX = startNode.position.x;
      startY = startNode.position.y + 45;
    }
    
    // Draw directly to mouse pos
    // If dragging 'in' port, we are drawing TO the start node
    if (workflowState.connectStartPort === 'in') {
      drawCurve(svg, workflowState.tempMousePos.x, workflowState.tempMousePos.y, startX, startY, true);
    } else {
      drawCurve(svg, startX, startY, workflowState.tempMousePos.x, workflowState.tempMousePos.y, true);
    }
  }
}

function drawCurve(svg, x1, y1, x2, y2, isTemp = false) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  // Clean S-curve bezier - straighter for close nodes
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  // For horizontal connections, use minimal curve
  // For diagonal, add slight curve for visual clarity
  const curvature = Math.min(Math.abs(dx) * 0.3, 80);
  
  const cp1x = x1 + curvature;
  const cp1y = y1;
  const cp2x = x2 - curvature;
  const cp2y = y2;
  
  const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  
  path.setAttribute('d', d);
  path.setAttribute('stroke', isTemp ? 'var(--text-muted)' : 'var(--accent-primary)');
  path.setAttribute('stroke-width', isTemp ? '2' : '2');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  if (isTemp) path.setAttribute('stroke-dasharray', '5,5');
  
  svg.appendChild(path);
}

// ==========================================
// STATE MANAGEMENT
// ==========================================

function addNode(type) {
  const id = `${type}_${Date.now()}`;
  // Center roughly in current view (could use scroll position)
  const x = 50 + (workflowState.nodes.length * 20);
  const y = 50 + (workflowState.nodes.length * 20);
  const data = {};
  if (type === 'llm') {
    data.systemPrompt = 'Analyze the tool output and summarize the result.';
    data.prompt = 'Result: {{prev.output}}';
  } else if (type === 'javascript') {
    data.code = '// return input;';
  } else if (type === 'assert') {
    data.condition = 'contains';
  }

  const node = {
    id,
    type,
    position: { x, y },
    data
  };
  
  workflowState.nodes.push(node);
  renderWorkflow();
}

function deleteNode(id) {
  workflowState.nodes = workflowState.nodes.filter(n => n.id !== id);
  workflowState.edges = workflowState.edges.filter(e => e.from !== id && e.to !== id);
  renderWorkflow();
}

function updateNodeData(nodeId, key, value) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (node) {
    node.data[key] = value;
  }
}

function refreshToolSelect(nodeId) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  const serverSelect = document.getElementById(`server_select_${nodeId}`);
  const serverName = serverSelect?.value || node?.data?.server;
  if (serverName) {
    populateToolSelect(nodeId, serverName, node?.data?.tool || null);
  }
}

function createNewWorkflow() {
  workflowState.currentId = null;
  workflowState.nodes = [{ id: 'start', type: 'trigger', position: { x: 50, y: 50 }, data: {} }];
  workflowState.edges = [];
  document.getElementById('workflowName').value = 'New Workflow';
  renderWorkflow();
  centerWorkflowView();
}

function normalizeWorkflowState() {
  workflowState.nodes = (workflowState.nodes || []).map((node, index) => {
    const normalized = { ...node, data: node.data || {} };
    const rawX = normalized.position?.x;
    const rawY = normalized.position?.y;
    const x = Number(rawX);
    const y = Number(rawY);
    normalized.position = {
      x: Number.isFinite(x) ? x : 50 + (index * 300),
      y: Number.isFinite(y) ? y : 50
    };
    if (normalized.data && typeof normalized.data.args === 'object') {
      normalized.data.args = JSON.stringify(normalized.data.args, null, 2);
    }
    return normalized;
  });
  workflowState.edges = Array.isArray(workflowState.edges) ? workflowState.edges : [];
}

function normalizeWorkflowId() {
  if (workflowState.currentId === 'null' || workflowState.currentId === 'undefined') {
    workflowState.currentId = null;
  }
}

// ==========================================
// API INTEGRATION
// ==========================================

async function loadWorkflowsList() {
  try {
    if (typeof updateWorkflowModelBadge === 'function') {
      updateWorkflowModelBadge();
    }
    const res = await fetch('/api/workflows');
    const workflows = await res.json();
    
    const listEl = document.getElementById('workflowList');
    if (!listEl) return;
    if (workflows.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.75rem; padding: 4px;">No workflows found</div>';
      return;
    }
    
    listEl.innerHTML = workflows.map(w => `
      <div class="workflow-list-item" style="padding: 8px; cursor: pointer; border-radius: 6px; margin-bottom: 4px; background: var(--bg-surface); display: flex; justify-content: space-between; align-items: center;">
        <div onclick="loadWorkflow('${w.id}')" style="flex: 1;">
          <div style="font-weight: 500; font-size: 0.8rem;">${escapeHtml(w.name || 'Untitled')}</div>
          <div style="font-size: 0.65rem; color: var(--text-muted);">${w.nodes.length} nodes</div>
        </div>
        <button onclick="event.stopPropagation(); deleteWorkflow('${w.id}')" 
          style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; font-size: 0.8rem;"
          title="Delete workflow">🗑️</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load workflows:', error);
    const listEl = document.getElementById('workflowList');
    if (listEl) {
      listEl.innerHTML = '<div style="color: var(--error); font-size: 0.75rem; padding: 4px;">Failed to load workflows</div>';
    }
  }
}

async function deleteWorkflow(id) {
  const confirmed = await appConfirm('Delete this workflow?', {
    title: 'Delete Workflow',
    confirmText: 'Delete',
    confirmVariant: 'danger'
  });
  if (!confirmed) return;
  
  try {
    const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
    const result = await res.json();
    
    if (result.success) {
      // Clear current if we deleted the active one
      if (workflowState.currentId === id) {
        createNewWorkflow();
      }
      loadWorkflowsList();
    }
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    showToast('Failed to delete: ' + error.message, 'error');
  }
}

async function loadWorkflow(id) {
  try {
    const res = await fetch(`/api/workflows/${id}`);
    const workflow = await res.json();
    
    workflowState.currentId = workflow.id;
    normalizeWorkflowId();
    workflowState.nodes = workflow.nodes || [];
    workflowState.edges = workflow.edges || [];
    document.getElementById('workflowName').value = workflow.name || 'Untitled';
    
    normalizeWorkflowState();
    renderWorkflow();
    centerWorkflowView();
  } catch (error) {
    console.error('Failed to load workflow:', error);
  }
}

async function saveWorkflow() {
  const name = document.getElementById('workflowName').value;
  normalizeWorkflowId();
  normalizeWorkflowState();
  const workflow = {
    name,
    nodes: workflowState.nodes,
    edges: workflowState.edges
  };
  if (workflowState.currentId) {
    workflow.id = workflowState.currentId;
  }
  
  try {
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    const result = await res.json().catch(() => ({}));
    
    if (result.success) {
      workflowState.currentId = result.id;
      loadWorkflowsList();
      if (typeof loadDebuggerWorkflows === 'function') {
        loadDebuggerWorkflows();
      }
      showToast('Workflow saved!', 'success');
      return true;
    }
    const message = result.error || `Failed to save workflow (${res.status})`;
    showToast(message, 'error');
    return false;
  } catch (error) {
    showToast('Failed to save: ' + error.message, 'error');
    return false;
  }
}

async function runWorkflow() {
  normalizeWorkflowId();
  if (!workflowState.currentId) {
    // Auto-save first
    const saved = await saveWorkflow();
    if (!saved) return;
  }
  if (!workflowState.currentId) return;
  
  const logsPanel = document.getElementById('workflowLogs');
  const logContent = document.getElementById('workflowLogContent');
  logsPanel.style.display = 'flex';
  logContent.innerHTML = '<div style="color: var(--text-muted);">Executing...</div>';
  
  // Set all nodes to pending status
  clearNodeStatuses();
  workflowState.nodes.forEach(node => {
    setNodeStatus(node.id, 'pending');
  });
  
  // Fetch current LLM config from API to ensure we use what's in the header/settings
  let llmConfig = {};
  try {
    const configRes = await fetch('/api/llm/config', { credentials: 'include' });
    llmConfig = await configRes.json();
  } catch (e) {
    console.warn("Using default LLM config");
  }

  try {
    const res = await fetch(`/api/workflows/${workflowState.currentId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { timestamp: Date.now() },
        llmConfig: llmConfig 
      })
    });
    
    const result = await res.json();
    
    // Render logs and update node statuses
    logContent.innerHTML = '';
    
    if (result.logs) {
      result.logs.forEach((log, index) => {
        // Update node status based on log
        const status = log.status === 'success' ? 'success' : 'error';
        setNodeStatus(log.nodeId, status);
        
        // Check if this is an assertion result
        const isAssertion = log.output && log.output.assertion;
        const assertPassed = isAssertion ? log.output.passed : null;
        
        const color = log.status === 'success' ? 'var(--success)' : 'var(--error)';
        const icon = log.status === 'success' ? '✅' : '❌';
        const div = document.createElement('div');
        div.style.marginBottom = '8px';
        div.style.borderRadius = '0 6px 6px 0';
        div.style.padding = '8px 10px';
        
        // Special display for assertions
        if (isAssertion) {
          const assertIcon = assertPassed ? '✅ PASS' : '❌ FAIL';
          const assertColor = assertPassed ? 'var(--success)' : 'var(--error)';
          div.style.borderLeft = `3px solid ${assertColor}`;
          div.style.background = assertPassed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
          div.innerHTML = `
            <div style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 1rem;">${assertIcon}</span>
              <span>${log.nodeId}</span>
              <span style="font-size: 0.65rem; background: ${assertColor}; color: white; padding: 2px 6px; border-radius: 10px;">${log.output.condition}</span>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 4px;">${escapeHtml(log.output.message)}</div>
          `;
        } else {
          div.style.borderLeft = `3px solid ${color}`;
          div.style.background = log.status === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';
          div.innerHTML = `
            <div style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
              <span>${icon}</span>
              <span>${log.nodeId}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: normal;">(${log.type})</span>
            </div>
            <div style="color: var(--text-secondary); white-space: pre-wrap; font-size: 0.8rem; margin-top: 4px; max-height: 100px; overflow-y: auto;">${escapeHtml(typeof log.output === 'object' ? JSON.stringify(log.output, null, 2) : String(log.output).substring(0, 500))}</div>
            ${log.error ? `<div style="color: var(--error); margin-top: 4px;">⚠️ ${escapeHtml(log.error)}</div>` : ''}
          `;
        }
        logContent.appendChild(div);
      });
      
      // Add test summary for assertions
      const assertions = result.logs.filter(l => l.output && l.output.assertion);
      if (assertions.length > 0) {
        const passed = assertions.filter(a => a.output.passed).length;
        const total = assertions.length;
        const allPassed = passed === total;
        const summaryColor = allPassed ? 'var(--success)' : 'var(--error)';
        const summaryBg = allPassed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        logContent.innerHTML += `
          <div style="margin-top: 16px; padding: 12px; background: ${summaryBg}; border-radius: 8px; text-align: center;">
            <div style="font-size: 1.2rem; font-weight: bold; color: ${summaryColor};">
              ${allPassed ? '🎉' : '⚠️'} Test Results: ${passed}/${total} Passed
            </div>
          </div>
        `;
      }
    }
    
    if (result.status === 'error') {
      logContent.innerHTML += `<div style="color: var(--error); font-weight: bold; margin-top: 12px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">❌ Execution Failed: ${escapeHtml(result.error)}</div>`;
    } else {
      logContent.innerHTML += `<div style="color: var(--success); font-weight: bold; margin-top: 12px; padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 6px;">✅ Execution Completed</div>`;
    }
    
  } catch (error) {
    logContent.innerHTML = `<div style="color: var(--error); padding: 8px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">❌ Error: ${escapeHtml(error.message)}</div>`;
  }
}

// Helper functions for node execution status
function setNodeStatus(nodeId, status) {
  const nodeEl = document.querySelector(`.workflow-node[data-id="${nodeId}"]`);
  if (nodeEl) {
    // Remove all status classes
    nodeEl.classList.remove('status-pending', 'status-running', 'status-success', 'status-error');
    // Add new status
    if (status) {
      nodeEl.classList.add(`status-${status}`);
    }
  }
}

function clearNodeStatuses() {
  document.querySelectorAll('.workflow-node').forEach(node => {
    node.classList.remove('status-pending', 'status-running', 'status-success', 'status-error');
  });
}


// ==========================================
// HELPERS
// ==========================================

async function populateToolSelect(nodeId, serverName, selectedTool = null) {
  if (!serverName) return;
  
  try {
    // We can reuse the API for tools
    const res = await fetch('/api/mcp/tools');
    const data = await res.json();
    const tools = data.tools.filter(t => t.serverName === serverName);
    toolSchemaCache[serverName] = tools;
    
    const select = document.getElementById(`tool_select_${nodeId}`);
    if (select) {
      select.innerHTML = '<option value="">Select Tool</option>' + 
        tools.map(t => `<option value="${t.name}" ${t.name === selectedTool ? 'selected' : ''}>${t.name}</option>`).join('');
    }
    if (selectedTool) {
      updateToolSchemaHint(nodeId, selectedTool);
    }
  } catch (e) {
    console.error('Failed to load tools for node', e);
  }
}

function handleToolSelection(nodeId, toolName) {
  updateNodeData(nodeId, 'tool', toolName);
  updateToolSchemaHint(nodeId, toolName);
  const node = workflowState.nodes.find(n => n.id === nodeId);
  if (!node) return;
  const existingArgs = node.data?.args;
  if (existingArgs && String(existingArgs).trim().length > 0) return;
  if (!node.data?.server || !toolName) return;

  const tools = toolSchemaCache[node.data.server] || [];
  const tool = tools.find(t => t.name === toolName);
  const template = buildArgsTemplate(tool?.inputSchema);
  if (!template || Object.keys(template).length === 0) return;

  const json = JSON.stringify(template, null, 2);
  node.data.args = json;
  const textarea = document.getElementById(`args_input_${nodeId}`);
  if (textarea) textarea.value = json;
}

function updateToolSchemaHint(nodeId, toolName) {
  const node = workflowState.nodes.find(n => n.id === nodeId);
  const hintEl = document.getElementById(`tool_hint_${nodeId}`);
  if (!node || !hintEl) return;
  if (!toolName || !node.data?.server) {
    hintEl.textContent = 'Select a tool to see required args.';
    return;
  }
  const tools = toolSchemaCache[node.data.server] || [];
  const tool = tools.find(t => t.name === toolName);
  if (!tool?.inputSchema) {
    hintEl.textContent = 'No schema available for this tool.';
    return;
  }
  const schemaSummary = summarizeToolSchema(tool.inputSchema);
  hintEl.textContent = schemaSummary || 'No required args.';
}

function buildArgsTemplate(schema) {
  if (!schema || typeof schema !== 'object') return {};
  const properties = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  const keys = required.length > 0 ? required : Object.keys(properties);
  if (keys.length === 0) return {};
  const result = {};
  keys.forEach(key => {
    const prop = properties[key] || {};
    result[key] = defaultValueForSchema(prop);
  });
  return result;
}

function summarizeToolSchema(schema) {
  if (!schema || typeof schema !== 'object') return '';
  const properties = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  const propEntries = Object.entries(properties);
  if (propEntries.length === 0) {
    return required.length > 0 ? `required: ${required.join(', ')}` : '';
  }

  const fields = propEntries.map(([key, prop]) => {
    const type = prop?.type || (Array.isArray(prop?.enum) ? 'enum' : 'any');
    const enumHint = Array.isArray(prop?.enum)
      ? ` enum(${prop.enum.slice(0, 3).join('|')}${prop.enum.length > 3 ? '…' : ''})`
      : '';
    return `${key}:${type}${enumHint}`;
  });

  const trimmed = fields.slice(0, 8);
  const suffix = fields.length > trimmed.length ? '…' : '';
  const requiredLabel = required.length > 0 ? `required: ${required.join(', ')}` : 'required: none';
  return `${requiredLabel}; fields: ${trimmed.join(', ')}${suffix}`;
}

function defaultValueForSchema(prop) {
  if (prop.default !== undefined) return prop.default;
  switch (prop.type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

// Add enhanced styles for workflow nodes with glassmorphism and animations
const style = document.createElement('style');
style.textContent = `
  /* ==========================================
     WORKFLOW NODE STYLES (Enhanced)
     ========================================== */
  
  .workflow-node {
    min-width: 220px;
    max-width: 280px;
    background: rgba(30, 30, 42, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    position: absolute;
    z-index: 10;
  }

  .tool-schema-hint {
    font-size: 0.65rem;
    color: var(--text-muted);
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 6px 8px;
    border-radius: 6px;
    line-height: 1.4;
  }
  
  /* Disable all transitions during drag for smooth movement */
  .workflow-node.dragging {
    transition: none !important;
  }
  
  .workflow-node.dragging:hover {
    transform: none !important;
  }
  
  .workflow-node:hover {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(99, 102, 241, 0.15);
    transform: translateY(-2px);
  }
  
  .workflow-node-header {
    padding: 10px 14px;
    border-radius: 12px 12px 0 0;
    cursor: move;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 0.8rem;
    color: white;
    position: relative;
    overflow: hidden;
  }
  
  /* Subtle shimmer effect on header */
  .workflow-node-header::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    transition: left 0.5s;
  }
  
  .workflow-node:hover .workflow-node-header::after {
    left: 100%;
  }
  
  /* Port Styles (Enhanced) */
  .port {
    width: 14px;
    height: 14px;
    background: var(--text-muted, #64748b);
    border-radius: 50%;
    position: absolute;
    cursor: crosshair;
    border: 2px solid var(--bg-card, #1e1e2a);
    transition: all 0.2s ease;
    z-index: 20;
  }
  
  .port:hover {
    background: var(--accent-primary, #6366f1);
    transform: scale(1.3);
    box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
  }
  
  .port-in {
    top: 42px;
    left: -7px;
  }
  
  .port-out {
    top: 42px;
    right: -7px;
  }
  
  /* Execution Status Animations */
  .workflow-node.status-pending {
    opacity: 0.6;
  }
  
  .workflow-node.status-running {
    border-color: var(--accent-primary, #6366f1);
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4), 0 0 40px rgba(99, 102, 241, 0.2);
    animation: node-pulse 1.5s ease-in-out infinite;
  }
  
  .workflow-node.status-success {
    border-color: var(--success, #22c55e);
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
  }
  
  .workflow-node.status-error {
    border-color: var(--error, #ef4444);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
    animation: node-shake 0.5s ease;
  }
  
  @keyframes node-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    }
    50% {
      transform: scale(1.02);
      box-shadow: 0 0 30px rgba(99, 102, 241, 0.6), 0 0 50px rgba(99, 102, 241, 0.3);
    }
  }
  
  @keyframes node-shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  
  /* Node Type Header Colors */
  .workflow-node[data-type="trigger"] .workflow-node-header {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }
  
  .workflow-node[data-type="tool"] .workflow-node-header {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  }
  
  .workflow-node[data-type="llm"] .workflow-node-header {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }
  
  .workflow-node[data-type="javascript"] .workflow-node-header {
    background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
  }
  
  /* Node Content Area */
  .workflow-node-content {
    padding: 12px;
    background: transparent;
  }
  
  .workflow-node-content label {
    font-size: 0.7rem;
    color: var(--text-muted, #64748b);
    margin-bottom: 4px;
    display: block;
  }
  
  .workflow-node-content select,
  .workflow-node-content textarea,
  .workflow-node-content input {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: var(--text-primary, #f8fafc);
    font-size: 0.75rem;
    padding: 6px 8px;
    transition: all 0.2s ease;
  }
  
  .workflow-node-content select:focus,
  .workflow-node-content textarea:focus,
  .workflow-node-content input:focus {
    outline: none;
    border-color: var(--accent-primary, #6366f1);
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.3);
  }
  
  .workflow-node-content textarea {
    font-family: 'JetBrains Mono', monospace;
    resize: vertical;
  }
  
  /* Node Delete Button */
  .workflow-node-delete {
    width: 22px;
    height: 22px;
    background: rgba(0, 0, 0, 0.3);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    transition: all 0.2s ease;
  }
  
  .workflow-node-delete:hover {
    background: var(--error, #ef4444);
    transform: scale(1.1);
  }
  
  /* Workflow Canvas Enhancement */
  #workflowCanvas {
    background-color: var(--bg-surface, #1a1a24);
    background-image: 
      radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  
  /* SVG Connection Lines */
  #workflowConnections path {
    transition: stroke 0.2s ease;
  }
  
  #workflowConnections path:hover {
    stroke: var(--accent-primary, #6366f1) !important;
    stroke-width: 3 !important;
  }
  
  /* Light theme adjustments */
  [data-theme='light'] .workflow-node {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.12);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
  
  [data-theme='light'] .workflow-node-content select,
  [data-theme='light'] .workflow-node-content textarea,
  [data-theme='light'] .workflow-node-content input {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.15);
  }
`;
document.head.appendChild(style);

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// AI BUILDER
// ==========================================

async function toggleAIBuilder() {
  const sidebar = document.getElementById('aiBuilderSidebar');
  if (!sidebar) return;

  const isOpen = sidebar.style.transform === 'translateX(0%)';
  if (isOpen) {
    sidebar.style.transform = 'translateX(100%)';
    return;
  }

  const isWorkspace = document.body.classList.contains('workspace-mode');
  if (isWorkspace && typeof floatingWorkspace !== 'undefined') {
    const activePanel = document.querySelector('.floating-panel.active');
    const activeId = activePanel?.id;
    const activeMeta = floatingWorkspace.panels?.find(panel => panel.id === activeId);
    if (!activeMeta || activeMeta.type !== 'workflows') {
      if (typeof floatingWorkspace.focusPanelByType === 'function') {
        floatingWorkspace.focusPanelByType('workflows');
      }
    }
  } else {
    const workflowsPanel = document.getElementById('workflowsPanel');
    if (!workflowsPanel?.classList.contains('active') && typeof switchClassicPanel === 'function') {
      switchClassicPanel('workflowsPanel');
    }
  }
  
  sidebar.style.transform = 'translateX(0%)';
  document.getElementById('aiBuilderPrompt').focus();
  
  // Refresh the model badge when opening
  updateAIBuilderModelBadge();
}

async function generateWorkflow() {
  const prompt = document.getElementById('aiBuilderPrompt').value.trim();
  if (!prompt) return;
  
  const statusEl = document.getElementById('aiBuilderStatus');
  statusEl.textContent = '🤔 Analyzing your request and available tools...';
  
  try {
    // 1. Fetch available tools to give context to the LLM
    const toolsRes = await fetch('/api/mcp/tools', { credentials: 'include' });
    const toolsData = await toolsRes.json();
    
    // Format tools with clear server and tool separation
    const toolsByServer = {};
    toolsData.tools.forEach(t => {
      if (!toolsByServer[t.serverName]) toolsByServer[t.serverName] = [];
      toolsByServer[t.serverName].push({
        name: t.name,
        description: t.description || 'No description',
        inputSchema: t.inputSchema || null
      });
    });

    for (const [serverName, tools] of Object.entries(toolsByServer)) {
      toolSchemaCache[serverName] = tools;
    }

    let toolList = '';
    for (const [serverName, tools] of Object.entries(toolsByServer)) {
      toolList += `\nServer: "${serverName}"\n`;
      tools.forEach(t => {
        const schemaSummary = summarizeToolSchema(t.inputSchema);
        toolList += `  - Tool: "${t.name}" - ${t.description}\n`;
        if (schemaSummary) {
          toolList += `    args: ${schemaSummary}\n`;
        }
      });
    }
    
    // 2. Construct System Prompt
    const systemPrompt = `You are an expert MCP Workflow Architect. 
Build a workflow using the connected MCP tools.

AVAILABLE TOOLS (use these exact names):
${toolList}

WORKFLOW JSON SCHEMA:
{
  "nodes": [
    { "id": "trigger_start", "type": "trigger", "position": { "x": 50, "y": 100 }, "data": {} },
    { "id": "tool_1", "type": "tool", "position": { "x": 350, "y": 100 }, "data": { "server": "EXACT_SERVER_NAME", "tool": "EXACT_TOOL_NAME", "args": "{\\"param\\": \\"value\\"}" } },
    { "id": "llm_1", "type": "llm", "position": { "x": 650, "y": 100 }, "data": { "systemPrompt": "Analyze this output", "prompt": "Result: {{tool_1.output}}" } }
  ],
  "edges": [
    { "from": "trigger_start", "to": "tool_1" },
    { "from": "tool_1", "to": "llm_1" }
  ]
}

CRITICAL RULES:
1. "server" and "tool" in tool nodes MUST exactly match the names shown above
2. "args" must be a JSON STRING (escaped quotes), not an object
3. Return ONLY the JSON, no markdown, no explanation
4. Position nodes horizontally: x increases by ~300 for each node

NODE TYPES:
- trigger: Starting point (always include one)
- tool: Calls an MCP tool
- llm: AI analysis/assertions
- javascript: Custom code (use: context.steps.nodeId.output)
`;
    
    statusEl.textContent = '🤖 Generating workflow design...';
    
    // 3. Call LLM with useTools: false to prevent recursive execution
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        stream: false,
        useTools: false // CRITICAL: Don't let the LLM try to run tools during generation
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    if (!data.choices || !data.choices[0]) {
        throw new Error('Invalid response from LLM');
    }

    let content = data.choices[0].message.content;
    
    // Clean up markdown code blocks if present
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    // Try to extract JSON object from response (LLMs sometimes add prose around it)
    let jsonMatch = content.match(/\{[\s\S]*\}/); // Find first { to last }
    if (!jsonMatch) {
      throw new Error('No JSON object found in response. The LLM may not have followed the format.');
    }
    content = jsonMatch[0];
    
    try {
      const workflow = JSON.parse(content);
      
      // Normalize node data - ensure args is a string
      if (workflow.nodes) {
        workflow.nodes.forEach(node => {
          if (node.data && typeof node.data.args === 'object') {
            node.data.args = JSON.stringify(node.data.args, null, 2);
          }
        });
      }
      
      // Load into canvas
      workflowState.currentId = null; // New unsaved workflow
      workflowState.nodes = workflow.nodes || [];
      workflowState.edges = workflow.edges || [];
      
      // Simple auto-layout if positions are missing (fallback)
      if (workflowState.nodes.length > 0 && !workflowState.nodes[0].position) {
         workflowState.nodes.forEach((n, i) => {
             n.position = { x: 50 + (i * 300), y: 50 };
         });
      }
      normalizeWorkflowState();
      
      renderWorkflow();
      centerWorkflowView();
      statusEl.innerHTML = '<span style="color: var(--success)">✨ Done! Workflow generated.</span>';
      
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content was:', content);
      statusEl.innerHTML = `<span style="color: var(--error)">❌ Failed to parse: ${parseError.message}</span>`;
    }
    
  } catch (error) {
    statusEl.innerHTML = `<span style="color: var(--error)">❌ Error: ${error.message}</span>`;
  }
}

// ==========================================
// EXPORT TO CODE
// ==========================================

function showExportModal() {
  document.getElementById('exportCodeModal').classList.add('active');
  generateExportCode();
}

function hideExportModal() {
  document.getElementById('exportCodeModal').classList.remove('active');
}

async function generateExportCode() {
  const format = document.getElementById('exportFormat').value;
  const textarea = document.getElementById('exportCodePreview');
  textarea.value = "Generating...";
  
  if (!workflowState.currentId) {
    // Save first to get an ID (or just save state)
    // Actually for export we might need backend to process it.
    // Let's ensure it's saved.
    await saveWorkflow();
  }
  
  try {
    const res = await fetch(`/api/workflows/${workflowState.currentId}/export?format=${format}`);
    const code = await res.text();
    textarea.value = code;
  } catch(e) {
    textarea.value = `Error generating code: ${e.message}`;
  }
}

async function copyExportCode() {
  const textarea = document.getElementById('exportCodePreview');
  textarea.select();
  document.execCommand('copy');
  await appAlert('Code copied to clipboard!', { title: 'Copied' });
}

function downloadExportCode() {
  const format = document.getElementById('exportFormat').value;
  const code = document.getElementById('exportCodePreview').value;
  const ext = format === 'python' ? 'py' : 'js';
  const filename = `workflow_${workflowState.currentId || 'export'}.${ext}`;
  
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
