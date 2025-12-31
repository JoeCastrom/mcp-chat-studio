// ==========================================
// FLOATING WORKSPACE - Draggable Panels System
// ==========================================

const floatingWorkspace = {
  // Active panels
  panels: [],

  // Panel id counter for uniqueness
  panelIdCounter: 0,
  
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

  // Workspace templates synced to disk
  workspaceTemplates: [],

  // Command palette state
  commandPaletteOpen: false,

  // Current theme
  workspaceTheme: 'default',

  // Minimap visibility
  minimapVisible: true,

  // Sidebar restore bookkeeping
  sidebarOriginalParent: null,
  sidebarOriginalNextSibling: null,
  sidebarOriginalDisplay: '',

  // Bound event handlers for cleanup
  handlers: null,

  // Panel definitions with connection hints and data loaders
  panelDefs: {
    chat: { icon: '💬', title: 'Chat', width: 500, height: 600, connects: ['inspector', 'history'], loader: null },
    inspector: { icon: '🔧', title: 'Inspector', width: 450, height: 500, connects: ['workflows'], loader: 'loadInspectorServers' },
    workflows: { icon: '⛓️', title: 'Workflows', width: 800, height: 600, connects: ['scenarios'], loader: 'loadWorkflowsList' },
    scenarios: { icon: '🧪', title: 'Scenarios', width: 400, height: 450, connects: ['collections'], loader: 'refreshScenariosPanel' },
    collections: { icon: '📚', title: 'Collections', width: 400, height: 400, connects: ['monitors'], loader: 'loadCollections' },
    history: { icon: '📜', title: 'History', width: 400, height: 500, connects: ['toolexplorer'], loader: 'refreshHistoryPanel' },
    toolexplorer: { icon: '📊', title: 'Tool Explorer', width: 500, height: 450, connects: ['performance'], loader: 'loadToolExplorer' },
    monitors: { icon: '⏰', title: 'Monitors', width: 450, height: 400, connects: ['scenarios'], loader: 'loadMonitors' },
    generator: { icon: '⚙️', title: 'Generator', width: 450, height: 500, connects: ['mocks'], loader: null },
    mocks: { icon: '🎭', title: 'Mocks', width: 400, height: 400, connects: ['inspector'], loader: 'loadMockServers' },
    scripts: { icon: '📝', title: 'Scripts', width: 450, height: 450, connects: ['scenarios'], loader: 'loadScripts' },
    docs: { icon: '📖', title: 'Documentation', width: 500, height: 500, connects: ['inspector'], loader: null },
    contracts: { icon: '📋', title: 'Contracts', width: 450, height: 400, connects: ['scenarios'], loader: 'loadContracts' },
    performance: { icon: '⚡', title: 'Performance', width: 500, height: 450, connects: ['toolexplorer', 'debugger'], loader: 'loadPerformanceMetrics' },
    debugger: { icon: '🐛', title: 'Debugger', width: 600, height: 500, connects: ['workflows'], loader: 'loadDebuggerWorkflows' },
    brain: { icon: '🧠', title: 'Brain View', width: 450, height: 500, connects: ['chat'], loader: 'initBrainView' }
  },

  // Generate unique panel ids across fast adds
  generatePanelId() {
    this.panelIdCounter += 1;
    return `panel_${Date.now()}_${this.panelIdCounter}`;
  },

  // Initialize workspace
  init() {
    console.log('🎨 Initializing floating workspace...');

    this.createWorkspace();
    this.createConnectionsSvg();
    this.createQuickAccessBar();
    this.createZoomControls();
    this.createMiniMap();
    this.createRadialMenu();
    this.setupEventListeners();
    this.loadLayout();

    // Set initial pan to center the workspace
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();

    // Add default panels if none saved
    if (this.panels.length === 0) {
      console.log('No saved layout, adding default panels');
      this.addPanel('chat', -250, -300);
      this.addPanel('inspector', 300, -250);
    } else {
      console.log(`Loaded ${this.panels.length} panels from saved layout`);
    }

    // Update connections
    this.updateConnections();
    this.updateMiniMap();

    console.log('✅ Workspace initialization complete');
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
      <button class="zoom-btn" onclick="floatingWorkspace.resetZoom()" title="Reset to Center">⟲</button>
      <button class="zoom-btn" onclick="floatingWorkspace.fitAll()" title="Fit All Panels">⤢</button>
    `;
    document.body.appendChild(controls);
  },

  // Create radial menu
  createRadialMenu() {
    const menu = document.createElement('div');
    menu.id = 'radialMenu';
    menu.className = 'radial-menu';

    menu.innerHTML = `
      <div class="radial-center">➕</div>
    `;

    // Add radial items for ALL panels in a circular layout
    const allPanels = Object.keys(this.panelDefs);
    const numPanels = allPanels.length;

    allPanels.forEach((type, index) => {
      const def = this.panelDefs[type];
      if (!def) return;

      // Create two concentric circles for better organization
      const isOuterCircle = index >= 8;
      const circleIndex = isOuterCircle ? index - 8 : index;
      const circleSize = isOuterCircle ? numPanels - 8 : Math.min(8, numPanels);

      const angle = (circleIndex / circleSize) * Math.PI * 2 - Math.PI / 2;
      const radius = isOuterCircle ? 160 : 100;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const item = document.createElement('div');
      item.className = 'radial-item';
      item.style.setProperty('--x', `${x}px`);
      item.style.setProperty('--y', `${y}px`);
      item.innerHTML = `<span class="radial-item-icon">${def.icon}</span>`;
      item.title = def.title;
      item.onclick = () => this.addPanelAtCursor(type);

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
      // Calculate world coordinates from viewport coordinates
      const x = (parseFloat(menu.style.left) - rect.left - rect.width/2 - this.panX) / this.zoom;
      const y = (parseFloat(menu.style.top) - rect.top - rect.height/2 - this.panY) / this.zoom;
      this.addPanel(type, x - 150, y - 100);
    }
  },

  // Zoom functions (Refined for mouse centering)
  setZoom(level, center) {
    const oldZoom = this.zoom;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    
    if (center && this.canvasOuter) {
      const rect = this.canvasOuter.getBoundingClientRect();
      
      // Mouse position relative to viewport center (0,0 in our transform logic)
      const mouseX = center.x - rect.left - rect.width / 2;
      const mouseY = center.y - rect.top - rect.height / 2;
      
      // Logic: newPan = mouse + (pan - mouse) * (newZoom / oldZoom)
      this.panX = mouseX + (this.panX - mouseX) * (this.zoom / oldZoom);
      this.panY = mouseY + (this.panY - mouseY) * (this.zoom / oldZoom);
    }
    
    this.applyTransform();
    document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
  },

  zoomIn() {
    this.setZoom(this.zoom * 1.2);
  },

  zoomOut() {
    this.setZoom(this.zoom / 1.2);
  },

  // Reset zoom and fit everything in view
  resetZoom() {
    this.fitAll();
  },

  // Fit all panels in view (Truly centered find-all)
  fitAll() {
    if (this.panels.length === 0 || !this.canvasOuter) {
       this.panX = 0;
       this.panY = 0;
       this.zoom = 1;
       this.applyTransform();
       return;
    }
    
    // Find bounding box of all panels
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.panels.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    });
    
    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    
    const padding = 150;
    const targetWidth = bboxWidth + padding * 2;
    const targetHeight = bboxHeight + padding * 2;
    
    const rect = this.canvasOuter.getBoundingClientRect();
    
    // Calculate zoom to fit
    const zoomX = rect.width / targetWidth;
    const zoomY = rect.height / targetHeight;
    let newZoom = Math.min(zoomX, zoomY, 1.2); 
    newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    
    this.zoom = newZoom;

    const centerWorldX = (minX + maxX) / 2;
    const centerWorldY = (minY + maxY) / 2;

    // Center logic: Position the center of the bounding box at the center of the viewport
    this.panX = (rect.width / 2) - (centerWorldX * this.zoom);
    this.panY = (rect.height / 2) - (centerWorldY * this.zoom);

    this.applyTransform();
    this.updateMiniMap();
    document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
  },

  // Create MiniMap element
  createMiniMap() {
    const minimap = document.createElement('div');
    minimap.className = 'workspace-minimap';
    minimap.id = 'workspaceMinimap';
    minimap.innerHTML = `
      <div class="minimap-container" id="minimapContainer">
        <div class="minimap-viewport" id="minimapViewport"></div>
      </div>
    `;
    
    // Clicking minimap to pan
    minimap.onclick = (e) => {
      const rect = minimap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      // Calculate world coordinates from map percentage
      // We assume the map shows a large area, e.g. -5000 to 5000
      const range = 10000;
      const targetWorldX = (x - 0.5) * range;
      const targetWorldY = (y - 0.5) * range;
      
      this.panX = -targetWorldX * this.zoom;
      this.panY = -targetWorldY * this.zoom;
      this.applyTransform();
    };
    
    document.body.appendChild(minimap);
    this.minimapVisible = true;
  },

  // Update MiniMap visuals
  updateMiniMap() {
    const minimap = document.getElementById('workspaceMinimap');
    if (!minimap || !this.canvasOuter) return;
    if (minimap.classList.contains('hidden')) return;
    
    const container = document.getElementById('minimapContainer');
    const viewportBox = document.getElementById('minimapViewport');
    const rect = this.canvasOuter.getBoundingClientRect();
    
    // Configuration for map world range
    const range = 10000; // Total world units visible in map
    const scale = minimap.offsetWidth / range;
    
    // Update viewport box
    // Viewport shows: panX/zoom to rect.width/zoom
    const viewWidth = rect.width / this.zoom;
    const viewHeight = rect.height / this.zoom;
    const viewX = -this.panX / this.zoom + range/2 - viewWidth/2;
    const viewY = -this.panY / this.zoom + range/2 - viewHeight/2;
    
    viewportBox.style.width = `${viewWidth * scale}px`;
    viewportBox.style.height = `${viewHeight * scale}px`;
    viewportBox.style.left = `${(range/2 - this.panX/this.zoom - viewWidth/2) * scale}px`;
    viewportBox.style.top = `${(range/2 - this.panY/this.zoom - viewHeight/2) * scale}px`;
    
    // Update panel dots
    // Remove old dots
    container.querySelectorAll('.minimap-panel-rect').forEach(d => d.remove());
    
    this.panels.forEach(p => {
      const dot = document.createElement('div');
      dot.className = 'minimap-panel-rect';
      dot.style.left = `${(p.x + range/2) * scale}px`;
      dot.style.top = `${(p.y + range/2) * scale}px`;
      dot.style.width = `${p.width * scale}px`;
      dot.style.height = `${p.height * scale}px`;
      container.appendChild(dot);
    });
  },

  // Toggle MiniMap visibility
  toggleMiniMap() {
    const minimap = document.getElementById('workspaceMinimap');
    if (!minimap) {
      this.createMiniMap();
      return;
    }

    this.minimapVisible = !this.minimapVisible;
    minimap.classList.toggle('hidden', !this.minimapVisible);
    if (this.minimapVisible) {
      this.updateMiniMap();
    }
  },

  applyTransform() {
    const inner = document.getElementById('workspaceInner');
    if (inner) {
      inner.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }
    
    // Update grid background for infinite effect
    const canvas = document.getElementById('workspaceCanvas');
    if (canvas) {
      const gridSize = 60 * this.zoom;
      const posX = this.panX;
      const posY = this.panY;
      
      canvas.style.backgroundSize = `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, 100% 100%, 100% 100%, 100% 100%`;
      canvas.style.backgroundPosition = `${posX}px ${posY}px, ${posX}px ${posY}px, 0 0, 0 0, 0 0`;
    }
    
    this.updateConnections();
    this.updateMiniMap();
  },

  // Create SVG layer for connection lines
  createConnectionsSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'connections-svg');
    svg.setAttribute('id', 'connectionsSvg');

    svg.innerHTML = `
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:rgba(106, 167, 255, 0.9)" />
          <stop offset="50%" style="stop-color:rgba(143, 107, 255, 1)" />
          <stop offset="100%" style="stop-color:rgba(180, 125, 255, 0.9)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    `;

    // Append SVG to workspace-inner so it gets transformed with panels
    this.canvas.appendChild(svg);
    this.connectionsSvg = svg;

    console.log('✅ SVG connections layer created');
  },

  // Update connection lines between panels
  updateConnections() {
    if (!this.connectionsSvg) {
      console.warn('⚠️ SVG connections layer not initialized');
      return;
    }

    // Remove existing lines (keep defs)
    const existingLines = this.connectionsSvg.querySelectorAll('.connection-line, .connection-endpoint');
    existingLines.forEach(line => line.remove());

    let connectionCount = 0;

    // Draw connections
    this.panels.forEach(panel => {
      const def = this.panelDefs[panel.type];
      if (!def.connects) return;

      def.connects.forEach(targetType => {
        const targetPanel = this.panels.find(p => p.type === targetType);
        if (targetPanel) {
          this.drawConnection(panel, targetPanel);
          connectionCount++;
        }
      });
    });

    console.log(`🔗 Drew ${connectionCount} connections between ${this.panels.length} panels`);
  },

  // Draw a curved connection between two panels
  drawConnection(from, to) {
    const fromEl = document.getElementById(from.id);
    const toEl = document.getElementById(to.id);

    if (!fromEl || !toEl) {
      console.warn(`Cannot draw connection: missing element (from: ${!!fromEl}, to: ${!!toEl})`);
      return;
    }

    // Use stored panel positions (zoom-independent)
    const x1 = from.x + from.width;
    const y1 = from.y + from.height / 2;
    const x2 = to.x;
    const y2 = to.y + to.height / 2;

    console.log(`Drawing connection from ${from.type}(${x1},${y1}) to ${to.type}(${x2},${y2})`);

    // Create curved path with more pronounced curve
    const dx = x2 - x1;
    const dy = y2 - y1;
    const curveStrength = Math.min(Math.abs(dx) * 0.5, 200);
    const controlX1 = x1 + curveStrength;
    const controlX2 = x2 - curveStrength;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`;

    path.setAttribute('d', d);
    path.setAttribute('class', 'connection-line');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'url(#connectionGradient)');
    path.setAttribute('stroke-width', '5');
    path.setAttribute('filter', 'url(#glow)');
    path.setAttribute('opacity', '0.9');
    path.setAttribute('stroke-linecap', 'round');

    path.style.pointerEvents = 'none';

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

    const templatesBtn = document.createElement('button');
    templatesBtn.className = 'quick-access-btn';
    templatesBtn.setAttribute('data-tooltip', 'Workspace Templates');
    templatesBtn.setAttribute('data-action', 'workspace-templates');
    templatesBtn.innerHTML = '🗂️';
    templatesBtn.onclick = () => this.showTemplatesModal();
    bar.appendChild(templatesBtn);

    const sessionsBtn = document.createElement('button');
    sessionsBtn.className = 'quick-access-btn';
    sessionsBtn.setAttribute('data-tooltip', 'Workspace Sessions');
    sessionsBtn.setAttribute('data-action', 'workspace-sessions');
    sessionsBtn.innerHTML = '💾';
    sessionsBtn.onclick = () => this.showSessionsModal();
    bar.appendChild(sessionsBtn);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'quick-access-btn';
    exportBtn.setAttribute('data-tooltip', 'Export Workspace');
    exportBtn.setAttribute('data-action', 'workspace-export');
    exportBtn.innerHTML = '📤';
    exportBtn.onclick = () => this.exportWorkspace();
    bar.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.className = 'quick-access-btn';
    importBtn.setAttribute('data-tooltip', 'Import Workspace');
    importBtn.setAttribute('data-action', 'workspace-import');
    importBtn.innerHTML = '📥';
    importBtn.onclick = () => this.importWorkspace();
    bar.appendChild(importBtn);

    const paletteBtn = document.createElement('button');
    paletteBtn.className = 'quick-access-btn';
    paletteBtn.setAttribute('data-tooltip', 'Command Palette (Ctrl+K / Ctrl+Shift+P)');
    paletteBtn.setAttribute('data-action', 'command-palette');
    paletteBtn.innerHTML = '⌘';
    paletteBtn.onclick = () => this.showCommandPalette();
    bar.appendChild(paletteBtn);

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
      btn.onclick = () => this.focusPanelByType(id);
      bar.appendChild(btn);
    });

    // Divider for active panels list
    const activeDivider = document.createElement('div');
    activeDivider.className = 'quick-access-divider';
    bar.appendChild(activeDivider);

    // Active panels list (non-main panels)
    const activeList = document.createElement('div');
    activeList.className = 'quick-access-active';
    activeList.id = 'quickAccessActive';
    bar.appendChild(activeList);

    document.body.appendChild(bar);
  },

  // Toggle MCP Servers sidebar
  toggleMCPSidebar() {
    let overlay = document.getElementById('workspaceSidebarOverlay');
    const mcpBtn = document.querySelector('[data-panel="mcp-servers"]');

    // If overlay exists and is visible, hide it
    if (overlay && overlay.classList.contains('visible')) {
      this.restoreSidebar();
      overlay.remove();
      mcpBtn?.classList.remove('has-panel');
      this.updateQuickAccess();
      return;
    }

    // Create overlay
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'workspaceSidebarOverlay';
      overlay.className = 'workspace-sidebar-overlay';
      document.body.appendChild(overlay);
    }

    // Move the actual sidebar into overlay so IDs and handlers stay intact
    const originalSidebar = document.getElementById('sidebar');
    if (originalSidebar) {
      if (!this.sidebarOriginalParent) {
        this.sidebarOriginalParent = originalSidebar.parentElement;
        this.sidebarOriginalNextSibling = originalSidebar.nextElementSibling;
        this.sidebarOriginalDisplay = originalSidebar.style.display || '';
      }
      overlay.appendChild(originalSidebar);
      originalSidebar.style.display = 'flex';
      originalSidebar.style.height = '100%';
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
    this.updateQuickAccess();
  },

  restoreSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const main = document.querySelector('.main');
    const chatContainer = document.querySelector('.chat-container');

    sidebar.style.display = this.sidebarOriginalDisplay || '';
    sidebar.style.height = '';
    sidebar.classList.remove('collapsed');

    if (this.sidebarOriginalParent && this.sidebarOriginalParent.isConnected) {
      if (this.sidebarOriginalNextSibling && this.sidebarOriginalNextSibling.parentElement === this.sidebarOriginalParent) {
        this.sidebarOriginalParent.insertBefore(sidebar, this.sidebarOriginalNextSibling);
      } else {
        this.sidebarOriginalParent.appendChild(sidebar);
      }
      return;
    }

    if (main && sidebar.parentElement !== main) {
      if (chatContainer && chatContainer.parentElement === main) {
        main.insertBefore(sidebar, chatContainer);
      } else {
        main.insertBefore(sidebar, main.firstChild);
      }
    }
  },

  // Auto-refresh MCP server status
  startMCPAutoRefresh() {
    // no-op; sidebar is now moved into overlay so updates are live
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
  addPanel(type, x, y, options = {}) {
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
    
    const id = this.generatePanelId();
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
    if (!options.skipConnections) this.updateConnections();
    if (!options.skipMiniMap) this.updateMiniMap();
    if (!options.skipSave) this.saveLayout();

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
    if (!contentEl) {
      console.warn(`❌ Content element not found for panel ${panel.id}`);
      return;
    }

    // Move the real panel DOM into the floating panel (no cloning)
    const sourcePanel = document.getElementById(`${panel.type}Panel`);

    if (!sourcePanel) {
      console.warn(`⚠️ Source panel not found: ${panel.type}Panel`);
      contentEl.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2rem; margin-bottom: 12px;">${this.panelDefs[panel.type]?.icon || '📦'}</div>
          <div>${this.panelDefs[panel.type]?.title || 'Unknown'} Panel</div>
          <div style="margin-top: 8px; font-size: 0.9em; opacity: 0.7;">Content not available</div>
        </div>
      `;
      return;
    }

    if (!panel.originalParent) {
      panel.originalParent = sourcePanel.parentElement;
      panel.originalNextSibling = sourcePanel.nextElementSibling;
      panel.originalDisplay = sourcePanel.style.display || '';
    }

    contentEl.innerHTML = '';
    contentEl.appendChild(sourcePanel);

    sourcePanel.classList.remove('content-panel', 'active');
    sourcePanel.classList.add('workspace-panel-content');
    sourcePanel.style.display = 'flex';
    sourcePanel.style.flexDirection = 'column';
    sourcePanel.style.height = '100%';
    sourcePanel.style.width = '100%';

    // Call loader function if defined
    const def = this.panelDefs[panel.type];
    if (def && def.loader && typeof window[def.loader] === 'function') {
      setTimeout(() => {
        try {
          window[def.loader]();
        } catch (error) {
          console.error(`❌ Failed to load ${panel.type} data:`, error);
        }
      }, 200);
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

    // Show snap guidelines when close to other panels
    ws.showSnapGuidelines(panel);

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

    // Clear snap guidelines
    ws.clearSnapGuidelines();

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
    // Update connections after resize
    ws.updateConnections();
    ws.saveLayout();
  },

  // Bring panel to front
  bringToFront(panelId) {
    const panel = this.panels.find(p => p.id === panelId);
    const el = document.getElementById(panelId);
    if (el) {
      el.style.zIndex = this.zIndex++;
      document.querySelectorAll('.floating-panel').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
    }

    if (panel && panel.type !== 'workflows' && typeof closeAIBuilderIfOpen === 'function') {
      closeAIBuilderIfOpen();
    }

    if (typeof setWorkflowsActive === 'function') {
      setWorkflowsActive(panel?.type === 'workflows');
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
  closePanel(panelId, options = {}) {
    const panel = this.panels.find(p => p.id === panelId);

    if (panel) {
      const sourcePanel = document.getElementById(`${panel.type}Panel`);
      if (sourcePanel && panel.originalParent) {
        // Restore panel back to its original container
        sourcePanel.classList.remove('workspace-panel-content');
        sourcePanel.classList.add('content-panel');
        sourcePanel.classList.remove('active');
        sourcePanel.style.display = panel.originalDisplay || '';

        if (panel.originalNextSibling && panel.originalNextSibling.parentElement === panel.originalParent) {
          panel.originalParent.insertBefore(sourcePanel, panel.originalNextSibling);
        } else {
          panel.originalParent.appendChild(sourcePanel);
        }
      }
    }

    const idx = this.panels.findIndex(p => p.id === panelId);
    if (idx >= 0) {
      this.panels.splice(idx, 1);
    }

    document.getElementById(panelId)?.remove();
    this.updateQuickAccess();

    if (panel?.type === 'workflows' && typeof closeAIBuilderIfOpen === 'function') {
      closeAIBuilderIfOpen();
    }
    if (panel?.type === 'workflows' && typeof setWorkflowsActive === 'function') {
      setWorkflowsActive(false);
    }

    if (!options.skipConnections) this.updateConnections();
    if (!options.skipMiniMap) this.updateMiniMap();
    if (!options.skipSave) this.saveLayout();
  },

  closeAllPanels(options = {}) {
    const ids = this.panels.map(p => p.id);
    ids.forEach(id => this.closePanel(id, { skipSave: true, skipConnections: true, skipMiniMap: true }));
    this.updateConnections();
    this.updateMiniMap();
    if (!options.skipSave) this.saveLayout();
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

  focusPanel(panelId) {
    const panel = this.panels.find(p => p.id === panelId);
    if (!panel || !this.canvasOuter) return;

    const centerX = panel.x + panel.width / 2;
    const centerY = panel.y + panel.height / 2;
    this.panX = -(centerX * this.zoom);
    this.panY = -(centerY * this.zoom);
    this.applyTransform();
    this.bringToFront(panel.id);
    if (panel.minimized) this.toggleMinimize(panel.id);
  },

  focusPanelByType(type) {
    const existing = this.panels.find(p => p.type === type);
    if (existing) {
      this.focusPanel(existing.id);
      return;
    }
    const panel = this.addPanel(type);
    if (panel) {
      this.focusPanel(panel.id);
    }
  },

  // Update quick access indicators
  updateQuickAccess() {
    const buttons = document.querySelectorAll('#quickAccessBar > .quick-access-btn');
    const existingPanels = new Set();

    buttons.forEach(btn => {
      const type = btn.getAttribute('data-panel');
      if (type) existingPanels.add(type);
      if (type === 'mcp-servers') {
        const overlayVisible = document.getElementById('workspaceSidebarOverlay')?.classList.contains('visible');
        btn.classList.toggle('has-panel', overlayVisible);
        return;
      }
      const hasPanel = this.panels.some(p => p.type === type);
      btn.classList.toggle('has-panel', hasPanel);
    });

    const activeList = document.getElementById('quickAccessActive');
    if (!activeList) return;
    activeList.innerHTML = '';

    const typeCounts = {};
    this.panels.forEach(panel => {
      typeCounts[panel.type] = (typeCounts[panel.type] || 0) + 1;
    });

    const typeIndex = {};
    this.panels.forEach(panel => {
      const def = this.panelDefs[panel.type];
      if (!def) return;
      const total = typeCounts[panel.type] || 1;
      const ordinal = (typeIndex[panel.type] || 0) + 1;
      typeIndex[panel.type] = ordinal;

      const needsListEntry = !existingPanels.has(panel.type) || total > 1;
      if (!needsListEntry) return;

      const btn = document.createElement('button');
      btn.className = 'quick-access-btn has-panel';
      const suffix = total > 1 ? ` #${ordinal}` : '';
      btn.setAttribute('data-tooltip', `Focus ${def.title}${suffix}`);
      btn.setAttribute('data-panel', panel.type);
      btn.innerHTML = def.icon;
      btn.onclick = () => {
        this.focusPanel(panel.id);
      };
      activeList.appendChild(btn);
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
          const panel = this.addPanel(p.type, p.x, p.y, {
            skipSave: true,
            skipConnections: true,
            skipMiniMap: true
          });
          if (panel) {
            panel.width = p.width;
            panel.height = p.height;
            panel.minimized = p.minimized;

            const el = document.getElementById(panel.id);
            if (el) {
              el.style.width = `${p.width}px`;
              el.style.height = p.minimized ? 'auto' : `${p.height}px`;
              if (p.minimized) {
                el.classList.add('minimized');
              }
              const btn = el.querySelector('.panel-action-btn');
              if (btn) btn.innerHTML = panel.minimized ? '🔼' : '🔽';
            }
          }
        });
        this.updateConnections();
        this.updateMiniMap();
        this.saveLayout();
      }
    } catch (e) {
      console.warn('Failed to load layout:', e);
    }
  },

  // Reset layout
  resetLayout() {
    this.closeAllPanels({ skipSave: true });
    localStorage.removeItem('mcp_workspace_layout');
    this.addPanel('chat', 100, 80);
    this.addPanel('inspector', 650, 80);
    this.updateQuickAccess();
    this.updateConnections();
    this.updateMiniMap();
    this.saveLayout();
  },

  // Cleanup method to remove all event listeners and elements
  cleanup() {
    if (this.handlers) {
      if (this.canvasOuter) {
        if (this.handlers.canvasContextMenu) {
          this.canvasOuter.removeEventListener('contextmenu', this.handlers.canvasContextMenu);
        }
        if (this.handlers.canvasWheel) {
          this.canvasOuter.removeEventListener('wheel', this.handlers.canvasWheel, { passive: false });
        }
        if (this.handlers.canvasMouseDown) {
          this.canvasOuter.removeEventListener('mousedown', this.handlers.canvasMouseDown);
        }
        if (this.handlers.canvasAuxClick) {
          this.canvasOuter.removeEventListener('auxclick', this.handlers.canvasAuxClick);
        }
      }

      if (this.handlers.documentClick) {
        document.removeEventListener('click', this.handlers.documentClick);
      }
      if (this.handlers.documentMouseMove) {
        document.removeEventListener('mousemove', this.handlers.documentMouseMove);
      }
      if (this.handlers.documentMouseUp) {
        document.removeEventListener('mouseup', this.handlers.documentMouseUp);
      }
      if (this.handlers.documentKeyDown) {
        document.removeEventListener('keydown', this.handlers.documentKeyDown, true);
      }
      if (this.handlers.documentKeyUp) {
        document.removeEventListener('keyup', this.handlers.documentKeyUp, true);
      }
    }

    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.endDrag);
    document.removeEventListener('mousemove', this.onResize);
    document.removeEventListener('mouseup', this.endResize);

    this.restoreSidebar();
    document.getElementById('workspaceSidebarOverlay')?.remove();

    // Clear intervals
    if (this.mcpRefreshInterval) {
      clearInterval(this.mcpRefreshInterval);
      this.mcpRefreshInterval = null;
    }

    // Reset state
    this.dragState = null;
    this.resizeState = null;
    this.isPanning = false;
    this.spaceDown = false;
    this.commandPaletteOpen = false;
    this.handlers = null;
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
              <div><kbd>Ctrl + K</kbd> / <kbd>Ctrl + Shift + P</kbd> Command palette</div>
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
      { type: 'action', icon: '💾', title: 'Workspace Sessions', action: () => { this.showSessionsModal(); this.closeCommandPalette(); } },
      { type: 'action', icon: '🗂️', title: 'Workspace Templates', action: () => { this.showTemplatesModal(); this.closeCommandPalette(); } },
      { type: 'action', icon: '📥', title: 'Load Preset', action: () => { this.showPresetsModal(); this.closeCommandPalette(); } },
      { type: 'action', icon: '📤', title: 'Export Workspace', action: () => { this.exportWorkspace(); this.closeCommandPalette(); } },
      { type: 'action', icon: '📥', title: 'Import Workspace', action: () => { this.importWorkspace(); this.closeCommandPalette(); } },
      { type: 'action', icon: '🗺️', title: 'Toggle Mini-map', action: () => { this.toggleMiniMap(); this.closeCommandPalette(); } },
      { type: 'action', icon: '⤢', title: 'Fit All Panels', action: () => { this.fitAll(); this.closeCommandPalette(); } },
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

  async saveCurrentPreset() {
    const name = await appPrompt('Enter preset name:', {
      title: 'Save Preset',
      label: 'Preset name',
      required: true
    });
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
        this.closeAllPanels({ skipSave: true });
        preset.panels.forEach((type, i) => {
          this.addPanel(type, 100 + (i % 3) * 400, 80 + Math.floor(i / 3) * 300, {
            skipSave: true,
            skipConnections: true,
            skipMiniMap: true
          });
        });
      }
    } else if (preset.layout) {
      // Custom preset with saved positions
      this.closeAllPanels({ skipSave: true });
      preset.layout.forEach(p => {
        this.addPanel(p.type, p.x, p.y, { skipSave: true, skipConnections: true, skipMiniMap: true });
      });
    }

    document.getElementById('presetsModal')?.classList.remove('active');
    this.updateQuickAccess();
    this.updateConnections();
    this.updateMiniMap();
    this.saveLayout();
  },

  // ==========================================
  // WORKSPACE EXPORT/IMPORT
  // ==========================================
  async buildWorkspaceBundle() {
    const ENV_PROFILES_KEY = 'mcp_chat_studio_env_profiles';
    const CURRENT_ENV_KEY = 'mcp_chat_studio_current_env';

    let collections = [];
    try {
      const listRes = await fetch('/api/collections', { credentials: 'include' });
      const listData = await listRes.json();
      const collectionIds = (listData.collections || []).map(c => c.id);
      collections = await Promise.all(
        collectionIds.map(async id => {
          const res = await fetch(`/api/collections/${id}`, { credentials: 'include' });
          if (!res.ok) return null;
          return res.json();
        })
      );
      collections = collections.filter(Boolean);
    } catch (error) {
      console.warn('Failed to export collections:', error);
    }

    return {
      version: '1.1',
      workspace: {
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
      },
      environment: {
        profiles: JSON.parse(localStorage.getItem(ENV_PROFILES_KEY) || '{}'),
        current: localStorage.getItem(CURRENT_ENV_KEY) || 'development'
      },
      collections
    };
  },

  async exportWorkspace() {
    const data = await this.buildWorkspaceBundle();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async applyWorkspaceBundle(data) {
    const ENV_PROFILES_KEY = 'mcp_chat_studio_env_profiles';
    const CURRENT_ENV_KEY = 'mcp_chat_studio_current_env';

    const workspace = data.workspace || data;

    // Clear current workspace
    this.closeAllPanels({ skipSave: true });

    // Load workspace
    (workspace.panels || []).forEach(p => {
      const panel = this.addPanel(p.type, p.x, p.y, {
        skipSave: true,
        skipConnections: true,
        skipMiniMap: true
      });
      if (panel) {
        panel.width = p.width;
        panel.height = p.height;
        panel.minimized = p.minimized;
        const el = document.getElementById(panel.id);
        if (el) {
          el.style.width = `${p.width}px`;
          el.style.height = p.minimized ? 'auto' : `${p.height}px`;
          if (p.minimized) {
            el.classList.add('minimized');
          }
          const btn = el.querySelector('.panel-action-btn');
          if (btn) btn.innerHTML = panel.minimized ? '🔼' : '🔽';
        }
      }
    });

    if (workspace.groups) this.groups = workspace.groups;
    if (workspace.theme) this.applyTheme(workspace.theme);
    if (workspace.zoom) this.zoom = workspace.zoom;
    if (workspace.pan) {
      this.panX = workspace.pan.x;
      this.panY = workspace.pan.y;
    }

    if (data.environment?.profiles) {
      localStorage.setItem(ENV_PROFILES_KEY, JSON.stringify(data.environment.profiles));
    }
    if (data.environment?.current) {
      localStorage.setItem(CURRENT_ENV_KEY, data.environment.current);
      const envSelect = document.getElementById('envProfile');
      if (envSelect) envSelect.value = data.environment.current;
    }

    if (Array.isArray(data.collections) && data.collections.length > 0) {
      for (const collection of data.collections) {
        try {
          await fetch('/api/collections/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(collection)
          });
        } catch (error) {
          console.warn('Failed to import collection:', error);
        }
      }
      if (typeof window.loadCollections === 'function') {
        window.loadCollections();
      }
    }

    this.applyTransform();
    this.updateQuickAccess();
    this.updateConnections();
    this.updateMiniMap();
    this.saveLayout();
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
        await this.applyWorkspaceBundle(data);
        console.log('Workspace imported successfully');
      } catch (error) {
        console.error('Failed to import workspace:', error);
        if (typeof appAlert === 'function') {
          await appAlert('Failed to import workspace file', { title: 'Import Failed' });
        } else if (typeof showNotification === 'function') {
          showNotification('Failed to import workspace file', 'error');
        }
      }
    };
    input.click();
  },

  // ==========================================
  // WORKSPACE TEMPLATES (DISK SYNC)
  // ==========================================
  async loadWorkspaceTemplates() {
    try {
      const res = await fetch('/api/workspaces', { credentials: 'include' });
      const data = await res.json();
      this.workspaceTemplates = data.templates || [];
      return this.workspaceTemplates;
    } catch (error) {
      console.warn('Failed to load workspace templates:', error);
      this.workspaceTemplates = [];
      return [];
    }
  },

  notifyWorkspace(message, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(message, type);
    } else if (typeof appAlert === 'function') {
      appAlert(message, { title: 'Workspace' });
    }
  },

  async saveWorkspaceTemplate() {
    const result = await appFormModal({
      title: 'Save Workspace Template',
      confirmText: 'Save',
      fields: [
        { id: 'name', label: 'Template name', required: true },
        { id: 'description', label: 'Description', placeholder: 'Optional' }
      ]
    });
    if (!result.confirmed) return;
    const name = (result.values.name || '').trim();
    if (!name) return;
    const description = result.values.description || '';

    try {
      const bundle = await this.buildWorkspaceBundle();
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description, bundle })
      });
      if (!res.ok) throw new Error(await res.text());
      await this.loadWorkspaceTemplates();
      this.renderWorkspaceTemplates();
      this.notifyWorkspace('Workspace template saved', 'success');
    } catch (error) {
      this.notifyWorkspace(`Failed to save template: ${error.message}`, 'error');
    }
  },

  async updateWorkspaceTemplate(templateId) {
    const template = this.workspaceTemplates.find(t => t.id === templateId);
    if (!template) return;
    const confirmed = await appConfirm(`Overwrite template "${template.name}" with current workspace?`, {
      title: 'Overwrite Template',
      confirmText: 'Overwrite',
      confirmVariant: 'danger'
    });
    if (!confirmed) return;

    try {
      const bundle = await this.buildWorkspaceBundle();
      const res = await fetch(`/api/workspaces/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: template.name,
          description: template.description || '',
          bundle
        })
      });
      if (!res.ok) throw new Error(await res.text());
      await this.loadWorkspaceTemplates();
      this.renderWorkspaceTemplates();
      this.notifyWorkspace('Workspace template updated', 'success');
    } catch (error) {
      this.notifyWorkspace(`Failed to update template: ${error.message}`, 'error');
    }
  },

  async deleteWorkspaceTemplate(templateId) {
    const confirmed = await appConfirm('Delete this workspace template?', {
      title: 'Delete Template',
      confirmText: 'Delete',
      confirmVariant: 'danger'
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/workspaces/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      await this.loadWorkspaceTemplates();
      this.renderWorkspaceTemplates();
      this.notifyWorkspace('Workspace template deleted', 'success');
    } catch (error) {
      this.notifyWorkspace(`Failed to delete template: ${error.message}`, 'error');
    }
  },

  async loadWorkspaceTemplate(templateId) {
    try {
      const res = await fetch(`/api/workspaces/${templateId}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const template = await res.json();
      if (!template?.bundle) throw new Error('Template missing workspace bundle');
      await this.applyWorkspaceBundle(template.bundle);
      this.notifyWorkspace(`Loaded template "${template.name}"`, 'success');
      document.getElementById('workspaceTemplatesModal')?.classList.remove('active');
    } catch (error) {
      this.notifyWorkspace(`Failed to load template: ${error.message}`, 'error');
    }
  },

  async showTemplatesModal() {
    await this.loadWorkspaceTemplates();

    let modal = document.getElementById('workspaceTemplatesModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'workspaceTemplatesModal';
      modal.className = 'modal-overlay active';
      modal.innerHTML = `
        <div class="modal" style="max-width: 700px; max-height: 80vh; overflow-y: auto">
          <div class="modal-header">
            <h2 class="modal-title">🗂️ Workspace Templates</h2>
            <button class="modal-close" onclick="document.getElementById('workspaceTemplatesModal').classList.remove('active')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center">
            <div style="font-size: 0.8rem; color: var(--text-muted)">Saved to <code>data/workspace-templates.json</code></div>
            <button class="btn primary" onclick="floatingWorkspace.saveWorkspaceTemplate()">💾 Save Current</button>
          </div>
          <div id="workspaceTemplatesList" style="padding: 16px; display: grid; gap: 12px"></div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.classList.add('active');
    }

    this.renderWorkspaceTemplates();
  },

  renderWorkspaceTemplates() {
    const list = document.getElementById('workspaceTemplatesList');
    if (!list) return;

    if (!this.workspaceTemplates.length) {
      list.innerHTML = `<div style="color: var(--text-muted); font-style: italic; text-align: center">No templates saved yet.</div>`;
      return;
    }

    list.innerHTML = this.workspaceTemplates.map(template => `
      <div style="padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-surface); display: flex; justify-content: space-between; align-items: center; gap: 16px">
        <div>
          <div style="font-weight: 600">${template.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted)">${template.description || 'No description'}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted)">Updated: ${new Date(template.updatedAt).toLocaleString()}</div>
        </div>
        <div style="display: flex; gap: 6px">
          <button class="btn" onclick="floatingWorkspace.loadWorkspaceTemplate('${template.id}')">Load</button>
          <button class="btn" onclick="floatingWorkspace.updateWorkspaceTemplate('${template.id}')">Update</button>
          <button class="btn" style="background: var(--error); color: white" onclick="floatingWorkspace.deleteWorkspaceTemplate('${template.id}')">Delete</button>
        </div>
      </div>
    `).join('');
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

  // Show snap guidelines when dragging near other panels
  showSnapGuidelines(panel) {
    if (!this.snapToGrid) return;

    // Clear existing guidelines
    this.clearSnapGuidelines();

    const snapThreshold = 15;
    const guidelines = [];

    this.panels.forEach(other => {
      if (other.id === panel.id) return;

      // Check for vertical alignment (left edges)
      if (Math.abs(panel.x - other.x) < snapThreshold) {
        guidelines.push({ type: 'vertical', pos: other.x });
      }
      // Check for vertical alignment (right edges)
      if (Math.abs((panel.x + panel.width) - (other.x + other.width)) < snapThreshold) {
        guidelines.push({ type: 'vertical', pos: other.x + other.width });
      }
      // Check for horizontal alignment (top edges)
      if (Math.abs(panel.y - other.y) < snapThreshold) {
        guidelines.push({ type: 'horizontal', pos: other.y });
      }
      // Check for horizontal alignment (bottom edges)
      if (Math.abs((panel.y + panel.height) - (other.y + other.height)) < snapThreshold) {
        guidelines.push({ type: 'horizontal', pos: other.y + other.height });
      }
    });

    // Draw guidelines
    guidelines.forEach(guide => {
      const line = document.createElement('div');
      line.className = 'snap-guideline';
      if (guide.type === 'vertical') {
        line.style.cssText = `
          position: absolute;
          left: ${guide.pos}px;
          top: -9999px;
          bottom: -9999px;
          width: 2px;
          background: var(--accent);
          opacity: 0.6;
          pointer-events: none;
          z-index: 999;
        `;
      } else {
        line.style.cssText = `
          position: absolute;
          top: ${guide.pos}px;
          left: -9999px;
          right: -9999px;
          height: 2px;
          background: var(--accent);
          opacity: 0.6;
          pointer-events: none;
          z-index: 999;
        `;
      }
      this.canvas.appendChild(line);
    });
  },

  clearSnapGuidelines() {
    const guidelines = this.canvas.querySelectorAll('.snap-guideline');
    guidelines.forEach(line => line.remove());
  },

  // Clone a panel
  clonePanel(panelId) {
    const panel = this.panels.find(p => p.id === panelId);
    if (!panel) return;

    // Create clone at offset position
    this.addPanel(panel.type, panel.x + 30, panel.y + 30);
    console.log(`✅ Cloned panel: ${panel.type}`);
  },

  // ==========================================
  // WORKSPACE SESSIONS
  // ==========================================
  saveWorkspaceSession(name) {
    const sessions = this.getWorkspaceSessions();
    const session = {
      id: `session_${Date.now()}`,
      name,
      timestamp: Date.now(),
      panels: this.panels.map(p => ({
        type: p.type,
        x: p.x,
        y: p.y,
        width: p.width,
        height: p.height,
        minimized: p.minimized
      })),
      zoom: this.zoom,
      pan: { x: this.panX, y: this.panY },
      theme: this.workspaceTheme
    };

    sessions.push(session);
    localStorage.setItem('mcp_workspace_sessions', JSON.stringify(sessions));
    console.log(`✅ Saved workspace session: ${name}`);
    return session;
  },

  getWorkspaceSessions() {
    try {
      return JSON.parse(localStorage.getItem('mcp_workspace_sessions') || '[]');
    } catch (e) {
      return [];
    }
  },

  loadWorkspaceSession(sessionId) {
    const sessions = this.getWorkspaceSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Clear current workspace
    this.closeAllPanels({ skipSave: true });

    // Load session
    session.panels.forEach(p => {
      const panel = this.addPanel(p.type, p.x, p.y, {
        skipSave: true,
        skipConnections: true,
        skipMiniMap: true
      });
      if (panel) {
        panel.width = p.width;
        panel.height = p.height;
        panel.minimized = !!p.minimized;
        const el = document.getElementById(panel.id);
        if (el) {
          el.style.width = `${p.width}px`;
          el.style.height = panel.minimized ? 'auto' : `${p.height}px`;
          if (panel.minimized) {
            el.classList.add('minimized');
          }
          const btn = el.querySelector('.panel-action-btn');
          if (btn) btn.innerHTML = panel.minimized ? '🔼' : '🔽';
        }
      }
    });

    if (session.zoom) this.zoom = session.zoom;
    if (session.pan) {
      this.panX = session.pan.x;
      this.panY = session.pan.y;
    }
    if (session.theme) this.applyTheme(session.theme);

    this.applyTransform();
    this.updateQuickAccess();
    this.updateConnections();
    this.updateMiniMap();
    this.saveLayout();
    console.log(`✅ Loaded workspace session: ${session.name}`);
  },

  deleteWorkspaceSession(sessionId) {
    let sessions = this.getWorkspaceSessions();
    sessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem('mcp_workspace_sessions', JSON.stringify(sessions));
    console.log(`🗑️ Deleted workspace session`);
  },

  showSessionsModal() {
    const modal = document.getElementById('sessionsModal') || this.createSessionsModal();
    this.renderSessions();
    modal.classList.add('active');
  },

  createSessionsModal() {
    const modal = document.createElement('div');
    modal.id = 'sessionsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px">
        <h2 style="margin-bottom: 20px">💾 Workspace Sessions</h2>
        <div style="display: flex; gap: 12px; margin-bottom: 20px">
          <button class="btn primary" onclick="floatingWorkspace.saveNewSession()">💾 Save Current</button>
        </div>
        <div id="sessionsList" style="display: flex; flex-direction: column; gap: 12px"></div>
        <div class="modal-actions" style="margin-top: 24px">
          <button class="btn" onclick="document.getElementById('sessionsModal').classList.remove('active')">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  },

  async saveNewSession() {
    const name = await appPrompt('Enter session name:', {
      title: 'Save Workspace Session',
      label: 'Session name',
      required: true
    });
    if (!name) return;
    this.saveWorkspaceSession(name);
    this.renderSessions();
  },

  renderSessions() {
    const container = document.getElementById('sessionsList');
    if (!container) return;

    const sessions = this.getWorkspaceSessions();

    if (sessions.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px">No saved sessions</div>';
      return;
    }

    container.innerHTML = sessions.map(session => `
      <div class="preset-card" style="padding: 16px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px">${session.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary)">${new Date(session.timestamp).toLocaleString()} • ${session.panels.length} panels</div>
        </div>
        <div style="display: flex; gap: 8px">
          <button class="btn primary" onclick="floatingWorkspace.loadWorkspaceSession('${session.id}'); document.getElementById('sessionsModal').classList.remove('active')" style="font-size: 0.8rem; padding: 4px 12px">Load</button>
          <button class="btn" onclick="floatingWorkspace.deleteWorkspaceSession('${session.id}'); floatingWorkspace.renderSessions()" style="font-size: 0.8rem; padding: 4px 12px">Delete</button>
        </div>
      </div>
    `).join('');
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
    if (!this.canvasOuter) {
      console.error('canvasOuter not initialized, cannot setup event listeners');
      return;
    }

    this.handlers = {};

    this.handlers.canvasContextMenu = (e) => {
      if (e.target.closest('.floating-panel')) return;
      e.preventDefault();
      this.showRadialMenu(e.clientX, e.clientY);
    };
    this.canvasOuter.addEventListener('contextmenu', this.handlers.canvasContextMenu);

    this.handlers.documentClick = (e) => {
      if (!e.target.closest('.radial-menu')) {
        this.closeRadialMenu();
      }
    };
    document.addEventListener('click', this.handlers.documentClick);

    this.handlers.canvasWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const rect = this.canvasOuter.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const canvasX = (mouseX - this.panX) / this.zoom;
        const canvasY = (mouseY - this.panY) / this.zoom;

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta));

        this.panX = mouseX - canvasX * newZoom;
        this.panY = mouseY - canvasY * newZoom;
        this.zoom = newZoom;

        this.applyTransform();
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
      } else {
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
        this.applyTransform();
      }
    };
    this.canvasOuter.addEventListener('wheel', this.handlers.canvasWheel, { passive: false });

    this.handlers.canvasMouseDown = (e) => {
      const clickedPanel = e.target.closest('.floating-panel');
      if (e.button === 1 || (e.button === 0 && this.spaceDown && !clickedPanel)) {
        e.preventDefault();
        this.isPanning = true;
        this.panStartMouseX = e.clientX;
        this.panStartMouseY = e.clientY;
        this.panStartPanX = this.panX;
        this.panStartPanY = this.panY;
        this.canvasOuter.style.cursor = 'grabbing';
      }
    };
    this.canvasOuter.addEventListener('mousedown', this.handlers.canvasMouseDown);

    this.handlers.canvasAuxClick = (e) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };
    this.canvasOuter.addEventListener('auxclick', this.handlers.canvasAuxClick);

    this.handlers.documentMouseMove = (e) => {
      if (this.isPanning) {
        const deltaX = e.clientX - this.panStartMouseX;
        const deltaY = e.clientY - this.panStartMouseY;
        this.panX = this.panStartPanX + deltaX;
        this.panY = this.panStartPanY + deltaY;
        this.applyTransform();
      }
    };
    document.addEventListener('mousemove', this.handlers.documentMouseMove);

    this.handlers.documentMouseUp = () => {
      if (this.isPanning) {
        this.isPanning = false;
        if (this.canvasOuter) {
          this.canvasOuter.style.cursor = this.spaceDown ? 'grab' : '';
        }
      }
    };
    document.addEventListener('mouseup', this.handlers.documentMouseUp);

    this.handlers.documentKeyDown = (e) => {
      if (!document.body.classList.contains('workspace-mode')) return;

      if (e.code === 'Space' && !e.repeat) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !e.target.isContentEditable) {
          e.preventDefault();
          this.spaceDown = true;
          if (this.canvasOuter) this.canvasOuter.style.cursor = 'grab';
        }
      }

      if (e.key === 'Escape') {
        this.closeRadialMenu();
        this.closeCommandPalette();
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          e.stopPropagation();
          this.zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          e.stopPropagation();
          this.zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          e.stopPropagation();
          this.resetZoom();
        } else if (e.shiftKey && (e.key === 'p' || e.key === 'P')) {
          e.preventDefault();
          e.stopPropagation();
          this.showCommandPalette();
        } else if (e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          e.stopPropagation();
          this.showCommandPalette();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          e.stopPropagation();
          this.saveLayout();
          console.log('✅ Layout saved');
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          e.stopPropagation();
          this.showPresetsModal();
        } else if (e.key === '/' || e.key === '?') {
          e.preventDefault();
          e.stopPropagation();
          this.showKeyboardShortcuts();
        }
      }

      if (e.altKey) {
        if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          e.stopPropagation();
          this.toggleMiniMap();
        }
      }

      if (e.key === 'g' || e.key === 'G') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          this.snapToGrid = !this.snapToGrid;
          console.log(`Snap to grid: ${this.snapToGrid ? 'ON' : 'OFF'}`);
        }
      }
    };
    document.addEventListener('keydown', this.handlers.documentKeyDown, true);

    this.handlers.documentKeyUp = (e) => {
      if (e.code === 'Space') {
        this.spaceDown = false;
        if (this.canvasOuter && !this.isPanning) {
          this.canvasOuter.style.cursor = '';
        }
      }
    };
    document.addEventListener('keyup', this.handlers.documentKeyUp, true);
  }
};

// Initialize when DOM is ready - with delay to ensure app.js runs first
window.addEventListener('load', () => {
  console.log('Window loaded, workspace mode:', document.body.classList.contains('workspace-mode'));

  // Only initialize if workspace mode is active
  if (document.body.classList.contains('workspace-mode')) {
    // Small delay to ensure all DOM is fully ready
    setTimeout(() => {
      if (!floatingWorkspace.initialized) {
        console.log('🚀 Starting floating workspace initialization...');
        try {
          floatingWorkspace.init();
          floatingWorkspace.initialized = true;
          console.log('✅ Workspace initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize workspace:', error);
          console.error(error.stack);
        }
      } else {
        console.log('⚠️ Workspace already initialized');
      }
    }, 100);
  } else {
    console.log('⚠️ Workspace mode not active, skipping initialization');
  }
});

// Expose globally
window.floatingWorkspace = floatingWorkspace;
