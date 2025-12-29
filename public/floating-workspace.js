// ==========================================
// FLOATING WORKSPACE - Draggable Panels System
// ==========================================

const floatingWorkspace = {
  // Active panels
  panels: [],
  
  // Drag state
  dragState: null,
  resizeState: null,
  
  // Z-index counter
  zIndex: 100,
  
  // Connection lines SVG
  connectionsSvg: null,
  
  // Zoom state
  zoom: 1,
  minZoom: 0.25,
  maxZoom: 2,
  panX: 0,
  panY: 0,
  
  // Pan state
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  spaceDown: false,
  
  // Snap to grid settings
  snapToGrid: true,
  gridSize: 20,
  snapDistance: 10, // Snap to panel edges when within this distance

  // Panel groups
  groups: {},

  // Command palette state
  commandPaletteOpen: false,

  // Current theme
  workspaceTheme: 'default',

  // Panel definitions with connection hints and data loaders
  panelDefs: {
    chat: { icon: '💬', title: 'Chat', width: 500, height: 600, connects: ['inspector', 'history'], loader: null },
    inspector: { icon: '🔧', title: 'Inspector', width: 450, height: 500, connects: ['workflows'], loader: 'loadInspectorServers' },
    workflows: { icon: '⛓️', title: 'Workflows', width: 700, height: 500, connects: ['scenarios'], loader: 'loadWorkflowsList' },
    scenarios: { icon: '🧪', title: 'Scenarios', width: 400, height: 450, connects: ['collections'], loader: 'refreshScenariosPanel' },
    collections: { icon: '📚', title: 'Collections', width: 400, height: 400, connects: [], loader: 'loadCollections' },
    history: { icon: '📜', title: 'History', width: 400, height: 500, connects: ['toolexplorer'], loader: 'refreshHistoryPanel' },
    toolexplorer: { icon: '📊', title: 'Analytics', width: 500, height: 450, connects: [], loader: 'loadToolExplorer' },
    monitors: { icon: '⏰', title: 'Monitors', width: 450, height: 400, connects: [], loader: 'loadMonitors' },
    generator: { icon: '⚙️', title: 'Generator', width: 450, height: 500, connects: ['mocks'], loader: null },
    mocks: { icon: '🎭', title: 'Mocks', width: 400, height: 400, connects: [], loader: 'loadMockServers' },
    scripts: { icon: '📝', title: 'Scripts', width: 450, height: 450, connects: [], loader: 'loadScripts' },
    docs: { icon: '📖', title: 'Documentation', width: 500, height: 500, connects: [], loader: null },
    contracts: { icon: '📋', title: 'Contracts', width: 450, height: 400, connects: [], loader: 'loadContracts' },
    performance: { icon: '⚡', title: 'Performance', width: 500, height: 450, connects: ['toolexplorer'], loader: 'loadPerformanceMetrics' },
    debugger: { icon: '🐛', title: 'Debugger', width: 600, height: 500, connects: ['workflows'], loader: 'updateDebuggerTimeline' },
    brain: { icon: '🧠', title: 'Brain View', width: 450, height: 500, connects: ['chat'], loader: 'updateBrainGraph' }
  },

  // Initialize workspace
  init() {
    this.createWorkspace();
    this.createConnectionsSvg();
    this.createQuickAccessBar();
    this.createZoomControls();
    this.createRadialMenu();
    this.setupEventListeners();
    this.loadLayout();
    
    // Enable workspace mode
    document.body.classList.add('workspace-mode');
    
    // Set initial pan to center the workspace
    this.panX = 3000;
    this.panY = 2000;
    this.applyTransform();
    
    // Add default panels if none saved
    if (this.panels.length === 0) {
      this.addPanel('chat', 3100, 2050);
      this.addPanel('inspector', 3650, 2050);
    }
    
    // Update connections
    this.updateConnections();
  },

  // Create workspace canvas with zoom container
  createWorkspace() {
    const canvas = document.createElement('div');
    canvas.className = 'workspace-canvas';
    canvas.id = 'workspaceCanvas';
    
    // Inner container that gets transformed for zoom/pan
    const inner = document.createElement('div');
    inner.className = 'workspace-inner';
    inner.id = 'workspaceInner';
    canvas.appendChild(inner);
    
    document.body.appendChild(canvas);
    this.canvas = inner;
    this.canvasOuter = canvas;
  },

  // Create zoom controls
  createZoomControls() {
    const controls = document.createElement('div');
    controls.className = 'zoom-controls';
    controls.id = 'zoomControls';
    controls.innerHTML = `
      <button class="zoom-btn" onclick="floatingWorkspace.zoomIn()" title="Zoom In">+</button>
      <span class="zoom-level" id="zoomLevel">100%</span>
      <button class="zoom-btn" onclick="floatingWorkspace.zoomOut()" title="Zoom Out">−</button>
      <button class="zoom-btn" onclick="floatingWorkspace.resetZoom()" title="Reset">⟲</button>
      <button class="zoom-btn" onclick="floatingWorkspace.fitAll()" title="Fit All Panels">⤢</button>
    `;
    document.body.appendChild(controls);
  },

  // Create radial menu for adding panels (replaces dropdown)
  createRadialMenu() {
    const menu = document.createElement('div');
    menu.className = 'radial-menu';
    menu.id = 'radialMenu';
    
    // Center button
    menu.innerHTML = `<div class="radial-center">✕</div>`;
    
    // Create items in a circle
    const items = Object.entries(this.panelDefs);
    const angleStep = 360 / items.length;
    
    items.forEach(([id, def], i) => {
      const angle = (i * angleStep - 90) * (Math.PI / 180);
      const radius = 120;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      const item = document.createElement('div');
      item.className = 'radial-item';
      item.setAttribute('data-panel', id);
      item.style.setProperty('--x', `${x}px`);
      item.style.setProperty('--y', `${y}px`);
      item.innerHTML = `<span class="radial-item-icon">${def.icon}</span>`;
      item.title = def.title;
      item.onclick = (e) => {
        e.stopPropagation();
        this.addPanelAtCursor(id);
        this.closeRadialMenu();
      };
      menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
  },

  // Show radial menu at position
  showRadialMenu(x, y) {
    const menu = document.getElementById('radialMenu');
    if (menu) {
      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      menu.classList.add('active');
    }
  },

  // Close radial menu
  closeRadialMenu() {
    document.getElementById('radialMenu')?.classList.remove('active');
  },

  // Add panel at cursor position
  addPanelAtCursor(type) {
    const menu = document.getElementById('radialMenu');
    if (menu) {
      const rect = this.canvasOuter.getBoundingClientRect();
      const x = (parseFloat(menu.style.left) - rect.left - this.panX) / this.zoom;
      const y = (parseFloat(menu.style.top) - rect.top - this.panY) / this.zoom;
      this.addPanel(type, x - 150, y - 100);
    }
  },

  // Zoom functions
  setZoom(level) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    this.applyTransform();
    document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
  },

  zoomIn() {
    this.setZoom(this.zoom + 0.1);
  },

  zoomOut() {
    this.setZoom(this.zoom - 0.1);
  },

  // Reset zoom and center on panels (Issue #7)
  resetZoom() {
    this.zoom = 1;
    
    // Center on panels instead of origin
    if (this.panels.length > 0 && this.canvasOuter) {
      const avgX = this.panels.reduce((sum, p) => sum + p.x + p.width/2, 0) / this.panels.length;
      const avgY = this.panels.reduce((sum, p) => sum + p.y + p.height/2, 0) / this.panels.length;
      const rect = this.canvasOuter.getBoundingClientRect();
      this.panX = rect.width/2 - avgX * this.zoom;
      this.panY = rect.height/2 - avgY * this.zoom;
    } else {
      this.panX = 0;
      this.panY = 0;
    }
    
    this.applyTransform();
    document.getElementById('zoomLevel').textContent = '100%';
  },

  // Fit all panels in view (Issue #11)
  fitAll() {
    if (this.panels.length === 0 || !this.canvasOuter) return;
    
    // Find bounding box of all panels
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.panels.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    });
    
    const bboxWidth = maxX - minX + 100;
    const bboxHeight = maxY - minY + 100;
    const rect = this.canvasOuter.getBoundingClientRect();
    
    // Calculate zoom to fit with some padding
    this.zoom = Math.min(rect.width / bboxWidth, rect.height / bboxHeight, 1.5);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
    
    // Center on bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.panX = rect.width / 2 - centerX * this.zoom;
    this.panY = rect.height / 2 - centerY * this.zoom;
    
    this.applyTransform();
    document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
  },

  applyTransform() {
    const inner = document.getElementById('workspaceInner');
    if (inner) {
      inner.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }
    this.updateConnections();
  },

  // Create SVG layer for connection lines
  createConnectionsSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'connections-svg');
    svg.setAttribute('id', 'connectionsSvg');
    svg.innerHTML = `
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:rgba(99, 102, 241, 0.8)" />
          <stop offset="50%" style="stop-color:rgba(139, 92, 246, 0.9)" />
          <stop offset="100%" style="stop-color:rgba(168, 85, 247, 0.8)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="rgba(139, 92, 246, 0.9)" />
        </marker>
        <marker id="arrowhead-active" markerWidth="12" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 12 4, 0 8" fill="rgba(168, 85, 247, 1)" />
        </marker>
      </defs>
    `;
    this.canvas.appendChild(svg);
    this.connectionsSvg = svg;
  },

  // Update connection lines between panels
  updateConnections() {
    if (!this.connectionsSvg) return;
    
    // Remove existing lines (keep defs)
    const existingLines = this.connectionsSvg.querySelectorAll('.connection-line');
    existingLines.forEach(line => line.remove());
    
    // Draw connections
    this.panels.forEach(panel => {
      const def = this.panelDefs[panel.type];
      if (!def.connects) return;
      
      def.connects.forEach(targetType => {
        const targetPanel = this.panels.find(p => p.type === targetType);
        if (targetPanel) {
          this.drawConnection(panel, targetPanel);
        }
      });
    });
  },

  // Draw a curved connection between two panels
  drawConnection(from, to) {
    const fromEl = document.getElementById(from.id);
    const toEl = document.getElementById(to.id);
    if (!fromEl || !toEl) return;

    // Use stored panel positions (zoom-independent)
    const x1 = from.x + from.width;
    const y1 = from.y + from.height / 2;
    const x2 = to.x;
    const y2 = to.y + to.height / 2;

    // Create curved path
    const midX = (x1 + x2) / 2;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

    path.setAttribute('d', d);
    path.setAttribute('class', 'connection-line');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'url(#connectionGradient)');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('filter', 'url(#glow)');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    path.setAttribute('opacity', '0.8');

    // Flowing animation with dashed line
    path.style.strokeDasharray = '12 6';
    path.style.animation = 'flowLine 2s linear infinite';

    // Add hover effect
    path.style.cursor = 'pointer';
    path.addEventListener('mouseenter', () => {
      path.setAttribute('stroke-width', '3.5');
      path.setAttribute('opacity', '1');
      path.setAttribute('marker-end', 'url(#arrowhead-active)');
    });
    path.addEventListener('mouseleave', () => {
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('opacity', '0.8');
      path.setAttribute('marker-end', 'url(#arrowhead)');
    });

    this.connectionsSvg.appendChild(path);
  },

  // Create quick access bar
  createQuickAccessBar() {
    const bar = document.createElement('div');
    bar.className = 'quick-access-bar';
    bar.id = 'quickAccessBar';

    // Add MCP Servers toggle button at the top
    const mcpBtn = document.createElement('button');
    mcpBtn.className = 'quick-access-btn';
    mcpBtn.setAttribute('data-tooltip', 'MCP Servers');
    mcpBtn.setAttribute('data-panel', 'mcp-servers');
    mcpBtn.innerHTML = '🔌';
    mcpBtn.onclick = () => this.toggleMCPSidebar();
    bar.appendChild(mcpBtn);

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = 'width: 24px; height: 1px; background: rgba(99, 102, 241, 0.3); margin: 4px 0;';
    bar.appendChild(divider);

    const mainPanels = ['chat', 'inspector', 'workflows', 'scenarios', 'collections', 'history', 'toolexplorer', 'performance', 'debugger', 'brain'];
    mainPanels.forEach(id => {
      const def = this.panelDefs[id];
      const btn = document.createElement('button');
      btn.className = 'quick-access-btn';
      btn.setAttribute('data-tooltip', def.title);
      btn.setAttribute('data-panel', id);
      btn.innerHTML = def.icon;
      btn.onclick = () => this.togglePanel(id);
      bar.appendChild(btn);
    });

    document.body.appendChild(bar);
  },

  // Toggle MCP Servers sidebar
  toggleMCPSidebar() {
    let overlay = document.getElementById('workspaceSidebarOverlay');
    const mcpBtn = document.querySelector('[data-panel="mcp-servers"]');
    
    // If overlay exists and is visible, hide it
    if (overlay && overlay.classList.contains('visible')) {
      overlay.classList.remove('visible');
      mcpBtn?.classList.remove('has-panel');
      return;
    }
    
    // Create or update the overlay
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'workspaceSidebarOverlay';
      overlay.className = 'workspace-sidebar-overlay';
      document.body.appendChild(overlay);
    }
    
    // Always refresh content from the original sidebar (to show newly added servers)
    const originalSidebar = document.getElementById('sidebar');
    if (originalSidebar) {
      overlay.innerHTML = originalSidebar.innerHTML;
    } else {
      overlay.innerHTML = `
        <div class="sidebar-header">
          <span class="sidebar-title">MCP Servers</span>
          <button class="add-server-btn" onclick="showAddServerModal()">+ Add</button>
        </div>
        <div class="sidebar-content" id="workspaceMcpServers">
          <div class="empty-state">No servers configured</div>
        </div>
      `;
    }
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; padding: 4px 8px; font-size: 0.8rem; z-index: 10;';
    closeBtn.innerHTML = '✕';
    closeBtn.onclick = () => this.toggleMCPSidebar();
    overlay.insertBefore(closeBtn, overlay.firstChild);
    
    // Show the overlay
    overlay.classList.add('visible');
    mcpBtn?.classList.add('has-panel');
  },

  // Create add panel button
  createAddButton() {
    const btn = document.createElement('button');
    btn.className = 'add-panel-btn';
    btn.id = 'addPanelBtn';
    btn.innerHTML = '➕ Add Panel';
    btn.onclick = () => this.togglePanelPicker();
    document.body.appendChild(btn);
    
    // Create panel picker
    const picker = document.createElement('div');
    picker.className = 'panel-picker';
    picker.id = 'panelPicker';
    
    picker.innerHTML = `<div class="panel-picker-title">Add Panel</div>`;
    
    Object.entries(this.panelDefs).forEach(([id, def]) => {
      const item = document.createElement('div');
      item.className = 'panel-picker-item';
      item.innerHTML = `
        <span class="panel-picker-item-icon">${def.icon}</span>
        <span class="panel-picker-item-label">${def.title}</span>
      `;
      item.onclick = () => {
        this.addPanel(id);
        this.closePanelPicker();
      };
      picker.appendChild(item);
    });
    
    document.body.appendChild(picker);
  },

  // Toggle panel picker
  togglePanelPicker() {
    document.getElementById('panelPicker')?.classList.toggle('active');
  },

  // Close panel picker
  closePanelPicker() {
    document.getElementById('panelPicker')?.classList.remove('active');
  },

  // Add a panel
  addPanel(type, x, y) {
    const def = this.panelDefs[type];
    if (!def) return;
    
    // Check if panel already exists
    const existing = this.panels.find(p => p.type === type);
    if (existing) {
      this.bringToFront(existing.id);
      return;
    }
    
    // Default position: viewport center (Issue #3)
    if (x === undefined || y === undefined) {
      if (this.canvasOuter) {
        const rect = this.canvasOuter.getBoundingClientRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        // Convert to canvas coordinates accounting for pan and zoom
        x = (viewportCenterX - this.panX) / this.zoom - def.width / 2;
        y = (viewportCenterY - this.panY) / this.zoom - def.height / 2;
        // Offset slightly to not stack perfectly
        x += (this.panels.length % 5) * 30;
        y += (this.panels.length % 5) * 30;
      } else {
        x = 100 + (this.panels.length * 50);
        y = 80 + (this.panels.length * 30);
      }
    }
    
    const id = `panel_${Date.now()}`;
    const panel = {
      id,
      type,
      x,
      y,
      width: def.width,
      height: def.height,
      minimized: false
    };
    
    this.panels.push(panel);
    this.renderPanel(panel);
    this.updateQuickAccess();
    this.saveLayout();
    
    return panel;
  },

  // Render a panel
  renderPanel(panel) {
    const def = this.panelDefs[panel.type];
    
    const el = document.createElement('div');
    el.className = 'floating-panel';
    el.id = panel.id;
    el.style.left = `${panel.x}px`;
    el.style.top = `${panel.y}px`;
    el.style.width = `${panel.width}px`;
    el.style.height = panel.minimized ? 'auto' : `${panel.height}px`;
    el.style.zIndex = this.zIndex++;
    
    if (panel.minimized) el.classList.add('minimized');
    
    el.innerHTML = `
      <div class="panel-header" data-panel-id="${panel.id}">
        <span class="panel-icon">${def.icon}</span>
        <span class="panel-title">${def.title}</span>
        <div class="panel-actions">
          <button class="panel-action-btn" onclick="floatingWorkspace.toggleMinimize('${panel.id}')" title="Minimize">
            ${panel.minimized ? '🔼' : '🔽'}
          </button>
          <button class="panel-action-btn close" onclick="floatingWorkspace.closePanel('${panel.id}')" title="Close">✕</button>
        </div>
      </div>
      <div class="panel-content" id="${panel.id}_content">
        <div style="color: var(--text-muted); text-align: center; padding: 40px;">
          Loading ${def.title}...
        </div>
      </div>
      <div class="resize-handle" data-panel-id="${panel.id}"></div>
    `;
    
    this.canvas.appendChild(el);
    
    // Load content
    this.loadPanelContent(panel);
    
    // Setup drag
    const header = el.querySelector('.panel-header');
    header.addEventListener('mousedown', (e) => this.startDrag(e, panel.id));
    
    // Setup resize
    const resizeHandle = el.querySelector('.resize-handle');
    resizeHandle.addEventListener('mousedown', (e) => this.startResize(e, panel.id));
    
    // Bring to front on click
    el.addEventListener('mousedown', () => this.bringToFront(panel.id));
  },

  // Load panel content
  loadPanelContent(panel) {
    const contentEl = document.getElementById(`${panel.id}_content`);
    if (!contentEl) return;

    // Get content from existing panel - MOVE instead of clone to preserve event listeners
    const sourcePanel = document.getElementById(`${panel.type}Panel`);
    if (sourcePanel) {
      // Store original parent so we can move it back when panel closes
      if (!sourcePanel.dataset.originalParent) {
        sourcePanel.dataset.originalParent = sourcePanel.parentElement.id;
        sourcePanel.dataset.originalDisplay = sourcePanel.style.display || '';
      }

      // Move the original panel (preserves all event listeners and IDs)
      sourcePanel.style.display = 'block';
      sourcePanel.classList.remove('content-panel');
      contentEl.innerHTML = '';
      contentEl.appendChild(sourcePanel);

      // Mark panel as being used in workspace
      panel.originalPanelId = `${panel.type}Panel`;
    } else {
      contentEl.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2rem; margin-bottom: 12px;">${this.panelDefs[panel.type].icon}</div>
          <div>${this.panelDefs[panel.type].title} Panel</div>
        </div>
      `;
    }

    // Call loader function if defined
    const def = this.panelDefs[panel.type];
    if (def && def.loader && typeof window[def.loader] === 'function') {
      // Defer to let DOM update
      setTimeout(() => {
        try {
          window[def.loader]();
        } catch (error) {
          console.error(`Failed to load ${panel.type} data:`, error);
        }
      }, 100);
    }
  },

  // Start dragging
  startDrag(e, panelId) {
    if (e.target.closest('.panel-action-btn')) return;
    
    const panel = this.panels.find(p => p.id === panelId);
    const el = document.getElementById(panelId);
    if (!panel || !el) return;
    
    this.dragState = {
      panelId,
      startX: e.clientX,
      startY: e.clientY,
      panelX: panel.x,
      panelY: panel.y
    };
    
    el.classList.add('dragging');
    document.addEventListener('mousemove', this.onDrag);
    document.addEventListener('mouseup', this.endDrag);
    e.preventDefault();
  },

  // On drag
  onDrag: function(e) {
    const ws = floatingWorkspace;
    if (!ws.dragState) return;
    
    const dx = e.clientX - ws.dragState.startX;
    const dy = e.clientY - ws.dragState.startY;
    
    const panel = ws.panels.find(p => p.id === ws.dragState.panelId);
    const el = document.getElementById(ws.dragState.panelId);
    if (!panel || !el) return;
    
    // Divide by zoom to make drag feel natural at all zoom levels (Issue #1)
    // Remove Math.max(0, ...) constraint for truly infinite canvas (Issue #5)
    let newX = ws.dragState.panelX + dx / ws.zoom;
    let newY = ws.dragState.panelY + dy / ws.zoom;
    
    // Snap to grid if enabled
    if (ws.snapToGrid) {
      newX = Math.round(newX / ws.gridSize) * ws.gridSize;
      newY = Math.round(newY / ws.gridSize) * ws.gridSize;
    }
    
    panel.x = newX;
    panel.y = newY;
    
    el.style.left = `${panel.x}px`;
    el.style.top = `${panel.y}px`;
    
    // Update connection lines
    ws.updateConnections();
  },

  // End drag
  endDrag: function() {
    const ws = floatingWorkspace;
    if (!ws.dragState) return;

    const panel = ws.panels.find(p => p.id === ws.dragState.panelId);
    const el = document.getElementById(ws.dragState.panelId);
    el?.classList.remove('dragging');

    // Apply panel snapping
    if (panel) {
      ws.snapToPanel(panel);
      el.style.left = `${panel.x}px`;
      el.style.top = `${panel.y}px`;
      ws.updateConnections();
    }

    ws.dragState = null;
    document.removeEventListener('mousemove', ws.onDrag);
    document.removeEventListener('mouseup', ws.endDrag);

    ws.updateMiniMap();
    ws.saveLayout();
  },

  // Start resizing
  startResize(e, panelId) {
    const panel = this.panels.find(p => p.id === panelId);
    const el = document.getElementById(panelId);
    if (!panel || !el) return;
    
    this.resizeState = {
      panelId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: panel.width,
      startHeight: panel.height
    };
    
    document.addEventListener('mousemove', this.onResize);
    document.addEventListener('mouseup', this.endResize);
    e.preventDefault();
    e.stopPropagation();
  },

  // On resize
  onResize: function(e) {
    const ws = floatingWorkspace;
    if (!ws.resizeState) return;
    
    const dx = e.clientX - ws.resizeState.startX;
    const dy = e.clientY - ws.resizeState.startY;
    
    const panel = ws.panels.find(p => p.id === ws.resizeState.panelId);
    const el = document.getElementById(ws.resizeState.panelId);
    if (!panel || !el) return;
    
    // Divide by zoom to make resize feel natural at all zoom levels (Issue #4)
    let newWidth = Math.max(320, ws.resizeState.startWidth + dx / ws.zoom);
    let newHeight = Math.max(200, ws.resizeState.startHeight + dy / ws.zoom);
    
    // Snap to grid if enabled
    if (ws.snapToGrid) {
      newWidth = Math.round(newWidth / ws.gridSize) * ws.gridSize;
      newHeight = Math.round(newHeight / ws.gridSize) * ws.gridSize;
    }
    
    panel.width = newWidth;
    panel.height = newHeight;
    
    el.style.width = `${panel.width}px`;
    el.style.height = `${panel.height}px`;
    
    // Update connection lines
    ws.updateConnections();
  },

  // End resize
  endResize: function() {
    const ws = floatingWorkspace;
    ws.resizeState = null;
    document.removeEventListener('mousemove', ws.onResize);
    document.removeEventListener('mouseup', ws.endResize);
    ws.saveLayout();
  },

  // Bring panel to front
  bringToFront(panelId) {
    const el = document.getElementById(panelId);
    if (el) {
      el.style.zIndex = this.zIndex++;
      document.querySelectorAll('.floating-panel').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
    }
  },

  // Toggle minimize
  toggleMinimize(panelId) {
    const panel = this.panels.find(p => p.id === panelId);
    const el = document.getElementById(panelId);
    if (!panel || !el) return;
    
    panel.minimized = !panel.minimized;
    el.classList.toggle('minimized', panel.minimized);
    
    const btn = el.querySelector('.panel-action-btn');
    if (btn) btn.innerHTML = panel.minimized ? '🔼' : '🔽';
    
    if (!panel.minimized) {
      el.style.height = `${panel.height}px`;
    }
    
    this.saveLayout();
  },

  // Close panel
  closePanel(panelId) {
    const panel = this.panels.find(p => p.id === panelId);

    // Move original panel back to its original location before closing
    if (panel && panel.originalPanelId) {
      const originalPanel = document.getElementById(panel.originalPanelId);
      if (originalPanel && originalPanel.dataset.originalParent) {
        const originalParent = document.getElementById(originalPanel.dataset.originalParent);
        if (originalParent) {
          originalPanel.classList.add('content-panel');
          originalPanel.style.display = originalPanel.dataset.originalDisplay || 'none';
          originalParent.appendChild(originalPanel);
          delete originalPanel.dataset.originalParent;
          delete originalPanel.dataset.originalDisplay;
        }
      }
    }

    const idx = this.panels.findIndex(p => p.id === panelId);
    if (idx >= 0) {
      this.panels.splice(idx, 1);
    }

    document.getElementById(panelId)?.remove();
    this.updateQuickAccess();
    this.saveLayout();
  },

  // Toggle panel
  togglePanel(type) {
    const existing = this.panels.find(p => p.type === type);
    if (existing) {
      this.bringToFront(existing.id);
    } else {
      this.addPanel(type);
    }
    this.closePanelPicker();
  },

  // Update quick access indicators
  updateQuickAccess() {
    document.querySelectorAll('.quick-access-btn').forEach(btn => {
      const type = btn.getAttribute('data-panel');
      const hasPanel = this.panels.some(p => p.type === type);
      btn.classList.toggle('has-panel', hasPanel);
    });
  },

  // Save layout to localStorage
  saveLayout() {
    try {
      const layout = this.panels.map(p => ({
        type: p.type,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        minimized: p.minimized
      }));
      localStorage.setItem('mcp_workspace_layout', JSON.stringify(layout));
    } catch (e) {
      console.warn('Failed to save layout:', e);
    }
  },

  // Load layout from localStorage
  loadLayout() {
    try {
      const saved = localStorage.getItem('mcp_workspace_layout');
      if (saved) {
        const layout = JSON.parse(saved);
        layout.forEach(p => {
          const panel = this.addPanel(p.type, p.x, p.y);
          if (panel) {
            panel.width = p.width;
            panel.height = p.height;
            panel.minimized = p.minimized;
            
            const el = document.getElementById(panel.id);
            if (el) {
              el.style.width = `${p.width}px`;
              el.style.height = p.minimized ? 'auto' : `${p.height}px`;
              if (p.minimized) el.classList.add('minimized');
            }
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load layout:', e);
    }
  },

  // Reset layout
  resetLayout() {
    this.panels.forEach(p => document.getElementById(p.id)?.remove());
    this.panels = [];
    localStorage.removeItem('mcp_workspace_layout');
    this.addPanel('chat', 100, 80);
    this.addPanel('inspector', 650, 80);
    this.updateQuickAccess();
  },

  // ==========================================
  // KEYBOARD SHORTCUTS
  // ==========================================
  showKeyboardShortcuts() {
    const modal = document.getElementById('shortcutsModal') || this.createShortcutsModal();
    modal.classList.add('active');
  },

  createShortcutsModal() {
    const modal = document.createElement('div');
    modal.id = 'shortcutsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px">
        <h2 style="margin-bottom: 20px">⌨️ Keyboard Shortcuts</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px">
          <div>
            <h3 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--accent)">Navigation</h3>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem">
              <div><kbd>Space + Drag</kbd> Pan canvas</div>
              <div><kbd>Ctrl + Scroll</kbd> Zoom in/out</div>
              <div><kbd>Ctrl + 0</kbd> Reset zoom</div>
              <div><kbd>Ctrl + K</kbd> Command palette</div>
              <div><kbd>Escape</kbd> Close menus</div>
            </div>
          </div>
          <div>
            <h3 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--accent)">Panels</h3>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem">
              <div><kbd>G</kbd> Toggle grid snap</div>
              <div><kbd>Right Click</kbd> Add panel menu</div>
              <div><kbd>Ctrl + S</kbd> Save layout</div>
              <div><kbd>Ctrl + L</kbd> Load preset</div>
              <div><kbd>Alt + M</kbd> Toggle mini-map</div>
            </div>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 24px">
          <button class="btn primary" onclick="document.getElementById('shortcutsModal').classList.remove('active')">Got it!</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  },

  // ==========================================
  // COMMAND PALETTE
  // ==========================================
  showCommandPalette() {
    if (this.commandPaletteOpen) return;
    this.commandPaletteOpen = true;

    const palette = document.getElementById('commandPalette') || this.createCommandPalette();
    palette.classList.add('active');
    setTimeout(() => document.getElementById('commandInput')?.focus(), 100);
  },

  createCommandPalette() {
    const palette = document.createElement('div');
    palette.id = 'commandPalette';
    palette.className = 'command-palette';
    palette.innerHTML = `
      <div class="command-palette-content">
        <input
          type="text"
          id="commandInput"
          placeholder="Search panels, actions..."
          style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-surface); color: var(--text-primary); font-size: 0.95rem"
        />
        <div id="commandResults" style="margin-top: 12px; max-height: 400px; overflow-y: auto"></div>
      </div>
    `;
    document.body.appendChild(palette);

    const input = palette.querySelector('#commandInput');
    input.addEventListener('input', (e) => this.filterCommands(e.target.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeCommandPalette();
      if (e.key === 'Enter') this.executeSelectedCommand();
    });

    palette.addEventListener('click', (e) => {
      if (e.target === palette) this.closeCommandPalette();
    });

    this.renderCommands();
    return palette;
  },

  filterCommands(query) {
    this.renderCommands(query.toLowerCase());
  },

  renderCommands(query = '') {
    const results = document.getElementById('commandResults');
    if (!results) return;

    const commands = [
      ...Object.entries(this.panelDefs).map(([id, def]) => ({
        type: 'panel',
        id,
        icon: def.icon,
        title: `Open ${def.title}`,
        action: () => { this.addPanel(id); this.closeCommandPalette(); }
      })),
      { type: 'action', icon: '💾', title: 'Save Layout', action: () => { this.saveLayout(); this.closeCommandPalette(); } },
      { type: 'action', icon: '📥', title: 'Load Preset', action: () => { this.showPresetsModal(); this.closeCommandPalette(); } },
      { type: 'action', icon: '📤', title: 'Export Workspace', action: () => { this.exportWorkspace(); this.closeCommandPalette(); } },
      { type: 'action', icon: '🗺️', title: 'Toggle Mini-map', action: () => { this.toggleMiniMap(); this.closeCommandPalette(); } },
      { type: 'action', icon: '🎨', title: 'Change Theme', action: () => { this.showThemeSelector(); this.closeCommandPalette(); } },
      { type: 'action', icon: '⌨️', title: 'Keyboard Shortcuts', action: () => { this.showKeyboardShortcuts(); this.closeCommandPalette(); } },
      { type: 'action', icon: '🔄', title: 'Reset Layout', action: () => { this.resetLayout(); this.closeCommandPalette(); } }
    ];

    const filtered = query
      ? commands.filter(c => c.title.toLowerCase().includes(query))
      : commands;

    results.innerHTML = filtered.map((cmd, i) => `
      <div class="command-item" data-index="${i}" onclick="floatingWorkspace.executeCommand(${i})" style="padding: 10px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 10px; transition: background 0.2s">
        <span style="font-size: 1.2rem">${cmd.icon}</span>
        <span style="flex: 1">${cmd.title}</span>
      </div>
    `).join('');

    this.commandsList = filtered;
  },

  executeCommand(index) {
    if (this.commandsList && this.commandsList[index]) {
      this.commandsList[index].action();
    }
  },

  executeSelectedCommand() {
    const selected = document.querySelector('.command-item.selected');
    if (selected) {
      const index = parseInt(selected.dataset.index);
      this.executeCommand(index);
    }
  },

  closeCommandPalette() {
    this.commandPaletteOpen = false;
    document.getElementById('commandPalette')?.classList.remove('active');
  },

  // ==========================================
  // PANEL PRESETS
  // ==========================================
  showPresetsModal() {
    const modal = document.getElementById('presetsModal') || this.createPresetsModal();
    this.renderPresets();
    modal.classList.add('active');
  },

  createPresetsModal() {
    const modal = document.createElement('div');
    modal.id = 'presetsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px">
        <h2 style="margin-bottom: 20px">📐 Layout Presets</h2>
        <div style="display: flex; gap: 12px; margin-bottom: 20px">
          <button class="btn primary" onclick="floatingWorkspace.saveCurrentPreset()">💾 Save Current Layout</button>
          <button class="btn" onclick="floatingWorkspace.importWorkspace()">📥 Import</button>
        </div>
        <div id="presetsList" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px"></div>
        <div class="modal-actions" style="margin-top: 24px">
          <button class="btn" onclick="document.getElementById('presetsModal').classList.remove('active')">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  },

  renderPresets() {
    const container = document.getElementById('presetsList');
    if (!container) return;

    const presets = this.getPresets();
    const builtInPresets = [
      { id: 'debug', name: '🐛 Debug Layout', panels: ['chat', 'debugger', 'workflows', 'inspector'] },
      { id: 'testing', name: '🧪 Testing Layout', panels: ['scenarios', 'collections', 'monitors', 'contracts'] },
      { id: 'development', name: '💻 Development Layout', panels: ['chat', 'inspector', 'workflows', 'scripts', 'mocks'] },
      { id: 'analytics', name: '📊 Analytics Layout', panels: ['toolexplorer', 'performance', 'monitors', 'history'] }
    ];

    const allPresets = [...builtInPresets, ...presets];

    container.innerHTML = allPresets.map(preset => `
      <div class="preset-card" style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; cursor: pointer" onclick="floatingWorkspace.loadPreset('${preset.id}')">
        <div style="font-weight: 600; margin-bottom: 8px">${preset.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-secondary)">${preset.panels ? preset.panels.length : 0} panels</div>
      </div>
    `).join('');
  },

  getPresets() {
    try {
      return JSON.parse(localStorage.getItem('mcp_workspace_presets') || '[]');
    } catch (e) {
      return [];
    }
  },

  saveCurrentPreset() {
    const name = prompt('Enter preset name:');
    if (!name) return;

    const presets = this.getPresets();
    presets.push({
      id: `custom_${Date.now()}`,
      name,
      layout: this.panels.map(p => ({
        type: p.type,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height
      })),
      panels: this.panels.map(p => p.type)
    });

    localStorage.setItem('mcp_workspace_presets', JSON.stringify(presets));
    this.renderPresets();
  },

  loadPreset(presetId) {
    const presets = this.getPresets();
    let preset = presets.find(p => p.id === presetId);

    // Built-in presets
    if (!preset) {
      const builtIn = {
        debug: { panels: ['chat', 'debugger', 'workflows', 'inspector'] },
        testing: { panels: ['scenarios', 'collections', 'monitors', 'contracts'] },
        development: { panels: ['chat', 'inspector', 'workflows', 'scripts', 'mocks'] },
        analytics: { panels: ['toolexplorer', 'performance', 'monitors', 'history'] }
      };
      preset = builtIn[presetId];
      if (preset) {
        // Auto-arrange panels
        this.panels.forEach(p => document.getElementById(p.id)?.remove());
        this.panels = [];
        preset.panels.forEach((type, i) => {
          this.addPanel(type, 100 + (i % 3) * 400, 80 + Math.floor(i / 3) * 300);
        });
      }
    } else if (preset.layout) {
      // Custom preset with saved positions
      this.panels.forEach(p => document.getElementById(p.id)?.remove());
      this.panels = [];
      preset.layout.forEach(p => {
        this.addPanel(p.type, p.x, p.y);
      });
    }

    document.getElementById('presetsModal')?.classList.remove('active');
    this.updateQuickAccess();
  },

  // ==========================================
  // MINI-MAP
  // ==========================================
  createMiniMap() {
    const minimap = document.createElement('div');
    minimap.id = 'miniMap';
    minimap.className = 'mini-map';
    minimap.innerHTML = `
      <canvas id="miniMapCanvas" width="200" height="150"></canvas>
    `;
    document.body.appendChild(minimap);

    const canvas = document.getElementById('miniMapCanvas');
    canvas.addEventListener('click', (e) => this.miniMapClick(e));

    this.miniMapCanvas = canvas;
    this.miniMapCtx = canvas.getContext('2d');
    this.updateMiniMap();

    return minimap;
  },

  toggleMiniMap() {
    let minimap = document.getElementById('miniMap');
    if (minimap) {
      minimap.remove();
      this.miniMapCanvas = null;
      this.miniMapCtx = null;
    } else {
      this.createMiniMap();
    }
  },

  updateMiniMap() {
    if (!this.miniMapCtx || !this.miniMapCanvas) return;

    const ctx = this.miniMapCtx;
    const canvas = this.miniMapCanvas;

    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this.panels.length === 0) return;

    // Find bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.panels.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    });

    const worldWidth = maxX - minX + 200;
    const worldHeight = maxY - minY + 200;
    const scale = Math.min(canvas.width / worldWidth, canvas.height / worldHeight);

    // Draw panels
    this.panels.forEach(p => {
      const x = (p.x - minX + 100) * scale;
      const y = (p.y - minY + 100) * scale;
      const w = p.width * scale;
      const h = p.height * scale;

      ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(99, 102, 241, 1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    });

    // Draw viewport
    if (this.canvasOuter) {
      const rect = this.canvasOuter.getBoundingClientRect();
      const vpX = (-this.panX / this.zoom - minX + 100) * scale;
      const vpY = (-this.panY / this.zoom - minY + 100) * scale;
      const vpW = (rect.width / this.zoom) * scale;
      const vpH = (rect.height / this.zoom) * scale;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(vpX, vpY, vpW, vpH);
    }
  },

  miniMapClick(e) {
    // TODO: Implement click-to-navigate on minimap
    console.log('Minimap navigation - TODO');
  },

  // ==========================================
  // WORKSPACE EXPORT/IMPORT
  // ==========================================
  exportWorkspace() {
    const data = {
      version: '1.0',
      panels: this.panels.map(p => ({
        type: p.type,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        minimized: p.minimized,
        group: p.group
      })),
      groups: this.groups,
      theme: this.workspaceTheme,
      zoom: this.zoom,
      pan: { x: this.panX, y: this.panY }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importWorkspace() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Clear current workspace
        this.panels.forEach(p => document.getElementById(p.id)?.remove());
        this.panels = [];

        // Load workspace
        data.panels.forEach(p => {
          this.addPanel(p.type, p.x, p.y);
        });

        if (data.groups) this.groups = data.groups;
        if (data.theme) this.applyTheme(data.theme);
        if (data.zoom) this.zoom = data.zoom;
        if (data.pan) {
          this.panX = data.pan.x;
          this.panY = data.pan.y;
        }

        this.applyTransform();
        this.updateQuickAccess();
        console.log('Workspace imported successfully');
      } catch (error) {
        console.error('Failed to import workspace:', error);
        alert('Failed to import workspace file');
      }
    };
    input.click();
  },

  // ==========================================
  // PANEL GROUPING
  // ==========================================
  createGroup(name, panelIds) {
    const groupId = `group_${Date.now()}`;
    this.groups[groupId] = {
      name,
      panels: panelIds,
      collapsed: false
    };

    panelIds.forEach(id => {
      const panel = this.panels.find(p => p.id === id);
      if (panel) panel.group = groupId;
    });

    return groupId;
  },

  // ==========================================
  // PANEL SNAPPING
  // ==========================================
  snapToPanel(panel) {
    if (!this.snapToGrid) return;

    this.panels.forEach(other => {
      if (other.id === panel.id) return;

      // Check for edge proximity
      const leftDist = Math.abs(panel.x - (other.x + other.width));
      const rightDist = Math.abs((panel.x + panel.width) - other.x);
      const topDist = Math.abs(panel.y - (other.y + other.height));
      const bottomDist = Math.abs((panel.y + panel.height) - other.y);

      if (leftDist < this.snapDistance && Math.abs(panel.y - other.y) < 50) {
        panel.x = other.x + other.width;
      }
      if (rightDist < this.snapDistance && Math.abs(panel.y - other.y) < 50) {
        panel.x = other.x - panel.width;
      }
      if (topDist < this.snapDistance && Math.abs(panel.x - other.x) < 50) {
        panel.y = other.y + other.height;
      }
      if (bottomDist < this.snapDistance && Math.abs(panel.x - other.x) < 50) {
        panel.y = other.y - panel.height;
      }
    });
  },

  // ==========================================
  // WORKSPACE THEMES
  // ==========================================
  showThemeSelector() {
    const modal = document.getElementById('themeModal') || this.createThemeModal();
    modal.classList.add('active');
  },

  createThemeModal() {
    const modal = document.createElement('div');
    modal.id = 'themeModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px">
        <h2 style="margin-bottom: 20px">🎨 Workspace Themes</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px">
          <button class="theme-option" onclick="floatingWorkspace.applyTheme('default')" style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; cursor: pointer">
            Default
          </button>
          <button class="theme-option" onclick="floatingWorkspace.applyTheme('ocean')" style="padding: 20px; background: linear-gradient(135deg, #00B4DB 0%, #0083B0 100%); border: none; border-radius: 8px; color: white; cursor: pointer">
            Ocean
          </button>
          <button class="theme-option" onclick="floatingWorkspace.applyTheme('sunset')" style="padding: 20px; background: linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 50%, #2BFF88 100%); border: none; border-radius: 8px; color: white; cursor: pointer">
            Sunset
          </button>
          <button class="theme-option" onclick="floatingWorkspace.applyTheme('forest')" style="padding: 20px; background: linear-gradient(135deg, #134E5E 0%, #71B280 100%); border: none; border-radius: 8px; color: white; cursor: pointer">
            Forest
          </button>
        </div>
        <div class="modal-actions" style="margin-top: 24px">
          <button class="btn" onclick="document.getElementById('themeModal').classList.remove('active')">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  },

  applyTheme(themeName) {
    this.workspaceTheme = themeName;
    const canvas = document.querySelector('.workspace-canvas');
    if (!canvas) return;

    const themes = {
      default: 'radial-gradient(ellipse at 20% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.06) 0%, transparent 50%), var(--bg-base)',
      ocean: 'radial-gradient(ellipse at 20% 30%, rgba(0, 180, 219, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(0, 131, 176, 0.08) 0%, transparent 50%), var(--bg-base)',
      sunset: 'radial-gradient(ellipse at 20% 30%, rgba(250, 139, 255, 0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(43, 210, 255, 0.08) 0%, transparent 50%), var(--bg-base)',
      forest: 'radial-gradient(ellipse at 20% 30%, rgba(19, 78, 94, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(113, 178, 128, 0.1) 0%, transparent 50%), var(--bg-base)'
    };

    canvas.style.background = themes[themeName] || themes.default;
    document.getElementById('themeModal')?.classList.remove('active');
  },

  // Setup event listeners
  setupEventListeners() {
    // Right-click on canvas to show radial menu
    this.canvasOuter?.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.floating-panel')) return;
      e.preventDefault();
      this.showRadialMenu(e.clientX, e.clientY);
    });
    
    // Close radial menu on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.radial-menu')) {
        this.closeRadialMenu();
      }
    });
    
    // Scroll wheel zoom
    this.canvasOuter?.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Zoom towards cursor position
        const rect = this.canvasOuter.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Convert mouse position to canvas coordinates before zoom
        const canvasX = (mouseX - this.panX) / this.zoom;
        const canvasY = (mouseY - this.panY) / this.zoom;
        
        // Apply zoom
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));
        
        // Adjust pan to keep cursor position fixed
        this.panX = mouseX - canvasX * newZoom;
        this.panY = mouseY - canvasY * newZoom;
        this.zoom = newZoom;
        
        this.applyTransform();
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
      } else {
        // Regular scroll for panning
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
        this.applyTransform();
      }
    }, { passive: false });
    
    // Middle mouse or Space+click for panning
    this.canvasOuter?.addEventListener('mousedown', (e) => {
      // Middle mouse button or space held
      if (e.button === 1 || this.spaceDown) {
        e.preventDefault();
        this.isPanning = true;
        // Save starting mouse position and current pan position
        this.panStartMouseX = e.clientX;
        this.panStartMouseY = e.clientY;
        this.panStartPanX = this.panX;
        this.panStartPanY = this.panY;
        this.canvasOuter.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        // Calculate delta from start position and add to starting pan
        const deltaX = e.clientX - this.panStartMouseX;
        const deltaY = e.clientY - this.panStartMouseY;
        this.panX = this.panStartPanX + deltaX;
        this.panY = this.panStartPanY + deltaY;
        this.applyTransform();
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        if (this.canvasOuter) {
          this.canvasOuter.style.cursor = this.spaceDown ? 'grab' : '';
        }
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Space for pan mode
      if (e.code === 'Space' && !e.repeat && e.target === document.body) {
        e.preventDefault();
        this.spaceDown = true;
        if (this.canvasOuter) this.canvasOuter.style.cursor = 'grab';
      }
      
      // Escape to close menus
      if (e.key === 'Escape') {
        this.closeRadialMenu();
        this.closeCommandPalette();
      }

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          this.zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          this.zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          this.resetZoom();
        }
        // Command palette
        else if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          this.showCommandPalette();
        }
        // Save layout
        else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          this.saveLayout();
          console.log('✅ Layout saved');
        }
        // Load preset
        else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          this.showPresetsModal();
        }
        // Keyboard shortcuts help
        else if (e.key === '/' || e.key === '?') {
          e.preventDefault();
          this.showKeyboardShortcuts();
        }
      }

      // Alt shortcuts
      if (e.altKey) {
        // Toggle mini-map
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          this.toggleMiniMap();
        }
      }

      // Toggle snap to grid with G key
      if (e.key === 'g' || e.key === 'G') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          this.snapToGrid = !this.snapToGrid;
          console.log(`Snap to grid: ${this.snapToGrid ? 'ON' : 'OFF'}`);
        }
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.spaceDown = false;
        if (this.canvasOuter && !this.isPanning) {
          this.canvasOuter.style.cursor = '';
        }
      }
    });
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => floatingWorkspace.init(), 200);
});

// Expose globally
window.floatingWorkspace = floatingWorkspace;
