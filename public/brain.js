// Agent Brain Visualization Logic

// Local escapeHtml to avoid dependency on app.js load order
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

let isBrainOpen = false;
let brainNodes = [];
let brainEdges = [];

function toggleBrainView() {
  const panel = document.getElementById('brainPanel');
  const btn = document.getElementById('toggleBrainBtn');

  if (!isBrainOpen) {
    panel.style.width = '50%'; // Split view
    btn.classList.add('active');
    isBrainOpen = true;
    updateBrainGraph();
  } else {
    panel.style.width = '0';
    btn.classList.remove('active');
    isBrainOpen = false;
  }
}

// Hook into message updates
// We'll poll or hook into the appendMessage function in app.js
// Since we can't easily modify app.js closure scope without extensive edits,
// we'll observe the DOM 'messages' container for changes.

document.addEventListener('DOMContentLoaded', () => {
  const messagesContainer = document.getElementById('messages');
  if (messagesContainer) {
    const observer = new MutationObserver(() => {
      if (isBrainOpen) {
        updateBrainGraph();
      }
    });
    observer.observe(messagesContainer, { childList: true, subtree: true });
  }
});

function updateBrainGraph() {
  const messages = document.querySelectorAll('#messages .message');
  brainNodes = [];
  brainEdges = [];

  let y = 50;
  let prevId = null;

  messages.forEach((msg, index) => {
    // Determine type based on class or content
    let type = 'unknown';
    let label = '...';
    let color = '#666';
    let icon = '❓';

    if (msg.classList.contains('user')) {
      type = 'user';
      label = msg.textContent.substring(0, 30) + '...';
      color = 'var(--bg-surface)';
      icon = '👤';
    } else if (msg.classList.contains('assistant')) {
      type = 'assistant';
      label = 'Response';
      color = 'var(--bg-card)';
      icon = '🤖';

      // Check for tool usage content inside
      if (
        msg.innerHTML.includes('✅') ||
        msg.innerHTML.includes('⚠️') ||
        msg.innerHTML.includes('❌')
      ) {
        type = 'tool-result';
        label = 'Tool Result';
        icon = '⚙️';
        color = 'var(--bg-surface)';
      }
    } else if (msg.classList.contains('system')) {
      type = 'system';
      label = 'System';
      color = 'var(--warning)';
      icon = '🖥️';
    }

    // Attempt to extract tool name if it's a tool-result
    const toolMatch = msg.innerText.match(/(?:✅|⚠️|❌)\s+([a-zA-Z0-9_]+)/);
    if (toolMatch) {
      label = toolMatch[1];
      type = 'tool-result';
    }

    const id = `node_${index}`;
    const x = 150; // Center

    brainNodes.push({
      id,
      type,
      label,
      icon,
      color,
      x,
      y,
      fullText: msg.innerText,
    });

    if (prevId) {
      brainEdges.push({ from: prevId, to: id });
    }

    prevId = id;
    y += 100; // Spacing
  });

  renderBrain();
}

function renderBrain() {
  const container = document.getElementById('brainNodesContainer');
  const svg = document.getElementById('brainConnections');

  container.innerHTML = '';
  svg.innerHTML = '';

  // Resize container to fit content
  const maxY = brainNodes.length > 0 ? brainNodes[brainNodes.length - 1].y + 100 : 500;

  // Render Nodes
  brainNodes.forEach(node => {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.transform = 'translate(-50%, -50%)'; // Center anchor
    el.style.width = '200px';
    el.style.background = node.color;
    el.style.border = '1px solid var(--border)';
    el.style.borderRadius = '8px';
    el.style.padding = '8px 12px';
    el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    el.style.fontSize = '0.8rem';
    el.style.zIndex = '10';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.style.transition = 'all 0.3s ease';

    el.innerHTML = `
      <span style="font-size: 1.2rem;">${node.icon}</span>
      <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        <div style="font-weight:600; font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">${node.type}</div>
        <div>${escapeHtml(node.label)}</div>
      </div>
    `;

    // Hover effect
    el.onmouseenter = () => {
      el.style.transform = 'translate(-50%, -50%) scale(1.05)';
      el.style.zIndex = '20';
      el.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    };
    el.onmouseleave = () => {
      el.style.transform = 'translate(-50%, -50%) scale(1)';
      el.style.zIndex = '10';
      el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    };

    container.appendChild(el);
  });

  // Render Edges
  brainEdges.forEach(edge => {
    const from = brainNodes.find(n => n.id === edge.from);
    const to = brainNodes.find(n => n.id === edge.to);

    if (from && to) {
      // Draw straight lines for simplicity in tree
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${from.x} ${from.y + 25} L ${to.x} ${to.y - 25}`; // +25/-25 offsets to touch box edges approx

      path.setAttribute('d', d);
      path.setAttribute('stroke', 'var(--text-muted)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('marker-end', 'url(#arrowhead)');

      svg.appendChild(path);
    }
  });

  // Add Arrowhead definition if missing
  if (!document.getElementById('arrowhead')) {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted)" />
        </marker>
      `;
    svg.appendChild(defs);
  }
}
