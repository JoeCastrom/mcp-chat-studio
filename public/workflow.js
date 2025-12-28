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

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  setupCanvasInteractions();
  loadWorkflowsList();
});

// ==========================================
// CANVAS INTERACTIONS
// ==========================================

function setupCanvasInteractions() {
  const canvas = document.getElementById('workflowCanvas');
  
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

function createNodeElement(node) {
  const el = document.createElement('div');
  el.className = 'workflow-node';
  el.dataset.id = node.id;
  el.style.position = 'absolute';
  el.style.width = '200px';
  el.style.background = 'var(--bg-card)';
  el.style.border = '1px solid var(--border)';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  el.style.zIndex = '10';
  
  // Header
  let headerColor = '#666';
  if (node.type === 'trigger') headerColor = 'var(--success)';
  if (node.type === 'tool') headerColor = 'var(--primary)';
  if (node.type === 'llm') headerColor = 'var(--warning)';
  if (node.type === 'javascript') headerColor = '#9c27b0';

  let contentHtml = '';
  
  if (node.type === 'trigger') {
    contentHtml = `<div style="padding: 8px; font-size: 0.8rem; color: var(--text-muted);">Starts execution with input data.</div>`;
  } else if (node.type === 'tool') {
    contentHtml = `
      <div style="padding: 8px; font-size: 0.75rem;">
        <select class="form-select" onchange="updateNodeData('${node.id}', 'server', this.value); populateToolSelect('${node.id}', this.value)" style="width:100%; margin-bottom: 4px;">
          <option value="">Select Server</option>
          ${getAvailableServers().map(s => `<option value="${s}" ${node.data.server === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select class="form-select node-tool-select" id="tool_select_${node.id}" onchange="updateNodeData('${node.id}', 'tool', this.value)" style="width:100%;">
          <option value="">Select Tool</option>
        </select>
      </div>
    `;
    // Populate tools if server selected
    if (node.data.server) {
      setTimeout(() => populateToolSelect(node.id, node.data.server, node.data.tool), 0);
    }
  } else if (node.type === 'llm') {
    contentHtml = `
      <div style="padding: 8px;">
        <textarea class="form-input" placeholder="Prompt... (use {{prevNode.output}})" 
          onchange="updateNodeData('${node.id}', 'prompt', this.value)"
          style="width: 100%; height: 60px; font-size: 0.75rem;">${node.data.prompt || ''}</textarea>
      </div>
    `;
  } else if (node.type === 'javascript') {
    contentHtml = `
      <div style="padding: 8px;">
        <textarea class="form-input" placeholder="return input.value + 1;" 
          onchange="updateNodeData('${node.id}', 'code', this.value)"
          style="width: 100%; height: 60px; font-family: monospace; font-size: 0.75rem;">${node.data.code || ''}</textarea>
      </div>
    `;
  }

  // Ports
  const portIn = node.type !== 'trigger' ? `<div class="port port-in" title="Input"></div>` : '';
  const portOut = `<div class="port port-out" title="Output"></div>`;

  el.innerHTML = `
    ${portIn}
    ${portOut}
    <div class="workflow-node-header" style="padding: 8px; background: ${headerColor}; color: white; border-radius: 8px 8px 0 0; cursor: move; display: flex; justify-content: space-between;">
      <span style="font-weight: 500; font-size: 0.8rem;">${node.type.toUpperCase()}</span>
      <button onclick="deleteNode('${node.id}')" style="background:none; border:none; color:white; cursor:pointer;">✕</button>
    </div>
    ${contentHtml}
  `;

  return el;
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
    // Assuming node width 200px (hardcoded in createNodeElement)
    const startX = fromNode.position.x + 200; 
    const startY = fromNode.position.y + 40; // Approx middle of header + content
    const endX = toNode.position.x;
    const endY = toNode.position.y + 40;
    
    drawCurve(svg, startX, startY, endX, endY);
  });
  
  // Render temp connection line
  if (workflowState.isConnecting && workflowState.connectStartNode) {
    const startNode = workflowState.nodes.find(n => n.id === workflowState.connectStartNode);
    let startX, startY;
    
    if (workflowState.connectStartPort === 'out') {
      startX = startNode.position.x + 200;
      startY = startNode.position.y + 40;
    } else {
      startX = startNode.position.x;
      startY = startNode.position.y + 40;
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
  
  // Bezier curve logic
  const dx = Math.abs(x2 - x1) * 0.5;
  const cp1x = x1 + dx;
  const cp2x = x2 - dx;
  
  const d = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
  
  path.setAttribute('d', d);
  path.setAttribute('stroke', isTemp ? 'var(--text-muted)' : 'var(--text-primary)');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('fill', 'none');
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
  
  const node = {
    id,
    type,
    position: { x, y },
    data: {}
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

function createNewWorkflow() {
  workflowState.currentId = null;
  workflowState.nodes = [{ id: 'start', type: 'trigger', position: { x: 50, y: 50 }, data: {} }];
  workflowState.edges = [];
  document.getElementById('workflowName').value = 'New Workflow';
  renderWorkflow();
}

// ==========================================
// API INTEGRATION
// ==========================================

async function loadWorkflowsList() {
  try {
    const res = await fetch('/api/workflows');
    const workflows = await res.json();
    
    const listEl = document.getElementById('workflowList');
    if (workflows.length === 0) {
      listEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.75rem; padding: 4px;">No workflows found</div>';
      return;
    }
    
    listEl.innerHTML = workflows.map(w => `
      <div onclick="loadWorkflow('${w.id}')" style="padding: 6px; cursor: pointer; border-radius: 4px; hover:bg-white/5: border-bottom: 1px solid var(--border);">
        <div style="font-weight: 500; font-size: 0.8rem;">${escapeHtml(w.name || 'Untitled')}</div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">${w.nodes.length} nodes</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load workflows:', error);
  }
}

async function loadWorkflow(id) {
  try {
    const res = await fetch(`/api/workflows/${id}`);
    const workflow = await res.json();
    
    workflowState.currentId = workflow.id;
    workflowState.nodes = workflow.nodes || [];
    workflowState.edges = workflow.edges || [];
    document.getElementById('workflowName').value = workflow.name || 'Untitled';
    
    renderWorkflow();
  } catch (error) {
    console.error('Failed to load workflow:', error);
  }
}

async function saveWorkflow() {
  const name = document.getElementById('workflowName').value;
  const workflow = {
    id: workflowState.currentId,
    name,
    nodes: workflowState.nodes,
    edges: workflowState.edges
  };
  
  try {
    const res = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    const result = await res.json();
    
    if (result.success) {
      workflowState.currentId = result.id;
      loadWorkflowsList();
      alert('Workflow saved!'); // Simple feedback
    }
  } catch (error) {
    alert('Failed to save: ' + error.message);
  }
}

async function runWorkflow() {
  if (!workflowState.currentId) {
    // Auto-save first
    await saveWorkflow();
  }
  
  const logsPanel = document.getElementById('workflowLogs');
  const logContent = document.getElementById('workflowLogContent');
  logsPanel.style.display = 'flex';
  logContent.innerHTML = '<div style="color: var(--text-muted);">Executing...</div>';
  
  try {
    const res = await fetch(`/api/workflows/${workflowState.currentId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { timestamp: Date.now() } }) // Default input
    });
    
    const result = await res.json();
    
    // Render logs
    logContent.innerHTML = '';
    
    if (result.logs) {
      result.logs.forEach(log => {
        const color = log.status === 'success' ? 'var(--success)' : 'var(--error)';
        const div = document.createElement('div');
        div.style.marginBottom = '8px';
        div.style.borderLeft = `2px solid ${color}`;
        div.style.paddingLeft = '8px';
        div.innerHTML = `
          <div style="font-weight: 500;">${log.nodeId} (${log.type})</div>
          <div style="color: var(--text-secondary); white-space: pre-wrap;">${escapeHtml(typeof log.output === 'object' ? JSON.stringify(log.output, null, 2) : log.output)}</div>
          ${log.error ? `<div style="color: var(--error);">${log.error}</div>` : ''}
        `;
        logContent.appendChild(div);
      });
    }
    
    if (result.status === 'error') {
      logContent.innerHTML += `<div style="color: var(--error); font-weight: bold; margin-top: 8px;">Execution Failed: ${result.error}</div>`;
    } else {
      logContent.innerHTML += `<div style="color: var(--success); font-weight: bold; margin-top: 8px;">Execution Completed</div>`;
    }
    
  } catch (error) {
    logContent.innerHTML = `<div style="color: var(--error);">Error: ${error.message}</div>`;
  }
}


// ==========================================
// HELPERS
// ==========================================

function getAvailableServers() {
  // Hacky: scrape from sidebar or fetch status
  // Better: fetch from API
  // For now, let's look at the inspector dropdown if populated
  const select = document.getElementById('inspectorServerSelect');
  if (select) {
    return Array.from(select.options).map(o => o.value).filter(v => v);
  }
  return [];
}

async function populateToolSelect(nodeId, serverName, selectedTool = null) {
  if (!serverName) return;
  
  try {
    // We can reuse the API for tools
    const res = await fetch('/api/mcp/tools');
    const data = await res.json();
    const tools = data.tools.filter(t => t.serverName === serverName);
    
    const select = document.getElementById(`tool_select_${nodeId}`);
    if (select) {
      select.innerHTML = '<option value="">Select Tool</option>' + 
        tools.map(t => `<option value="${t.name}" ${t.name === selectedTool ? 'selected' : ''}>${t.name}</option>`).join('');
    }
  } catch (e) {
    console.error('Failed to load tools for node', e);
  }
}

// Add styles dynamically for ports
const style = document.createElement('style');
style.textContent = `
  .port {
    width: 12px;
    height: 12px;
    background: var(--text-muted);
    border-radius: 50%;
    position: absolute;
    cursor: crosshair;
    border: 1px solid var(--bg-card);
  }
  .port:hover { background: var(--primary); }
  .port-in { top: 40px; left: -6px; }
  .port-out { top: 40px; right: -6px; }
  .workflow-node { transition: box-shadow 0.2s; }
  .workflow-node:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
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
