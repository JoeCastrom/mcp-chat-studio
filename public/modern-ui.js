// ==========================================
// MODERN UI LAYOUT - Icon Sidebar + Command Palette
// ==========================================

const modernUI = {
  // Current active view
  activeView: 'chat',
  
  // Secondary panel state
  secondaryOpen: false,
  secondaryView: null,
  
  // Command palette state
  commandPaletteOpen: false,
  selectedCommandIndex: 0,
  filteredCommands: [],
  
  // View configuration
  views: {
    chat: { icon: '💬', label: 'Chat', primary: true },
    inspector: { icon: '🔧', label: 'Inspector', primary: true },
    workflows: { icon: '⛓️', label: 'Workflows', primary: true },
    scenarios: { icon: '🧪', label: 'Testing', primary: true },
    collections: { icon: '📚', label: 'Collections', primary: true },
    // Secondary views (open in panel)
    history: { icon: '📜', label: 'History', primary: false },
    toolexplorer: { icon: '📊', label: 'Analytics', primary: false },
    monitors: { icon: '⏰', label: 'Monitors', primary: false },
    generator: { icon: '⚙️', label: 'Generator', primary: false },
    mocks: { icon: '🎭', label: 'Mocks', primary: false },
    scripts: { icon: '📝', label: 'Scripts', primary: false },
    docs: { icon: '📖', label: 'Documentation', primary: false },
    contracts: { icon: '📋', label: 'Contracts', primary: false }
  },

  // All commands for command palette
  commands: [
    // Navigation
    { id: 'chat', icon: '💬', title: 'Chat', desc: 'AI chat with tool calling', category: 'Navigate', shortcut: 'Ctrl+1' },
    { id: 'inspector', icon: '🔧', title: 'Inspector', desc: 'Debug MCP protocol', category: 'Navigate', shortcut: 'Ctrl+2' },
    { id: 'workflows', icon: '⛓️', title: 'Workflows', desc: 'Visual automation builder', category: 'Navigate', shortcut: 'Ctrl+3' },
    { id: 'scenarios', icon: '🧪', title: 'Scenarios', desc: 'Record and replay tests', category: 'Navigate', shortcut: 'Ctrl+4' },
    { id: 'collections', icon: '📚', title: 'Collections', desc: 'Organize test suites', category: 'Navigate', shortcut: 'Ctrl+5' },
    { id: 'history', icon: '📜', title: 'History', desc: 'Tool execution log', category: 'Navigate' },
    { id: 'toolexplorer', icon: '📊', title: 'Analytics', desc: 'Usage statistics & health', category: 'Navigate' },
    { id: 'monitors', icon: '⏰', title: 'Monitors', desc: 'Scheduled test runs', category: 'Navigate' },
    { id: 'generator', icon: '⚙️', title: 'Generator', desc: 'Create MCP server code', category: 'Navigate' },
    { id: 'mocks', icon: '🎭', title: 'Mocks', desc: 'Mock MCP servers', category: 'Navigate' },
    { id: 'scripts', icon: '📝', title: 'Scripts', desc: 'Pre/Post test scripts', category: 'Navigate' },
    { id: 'docs', icon: '📖', title: 'Documentation', desc: 'Auto-generated docs', category: 'Navigate' },
    { id: 'contracts', icon: '📋', title: 'Contracts', desc: 'Schema validation', category: 'Navigate' },
    // Actions
    { id: 'test-all', icon: '🚀', title: 'Test All Tools', desc: 'Smoke test connected servers', category: 'Actions', action: () => testAllTools?.() },
    { id: 'add-server', icon: '➕', title: 'Add MCP Server', desc: 'Configure new server', category: 'Actions', action: () => showAddServerModal?.() },
    { id: 'settings', icon: '⚙️', title: 'LLM Settings', desc: 'Configure AI provider', category: 'Actions', action: () => showSettingsModal?.() },
    { id: 'clear-chat', icon: '🗑️', title: 'Clear Chat', desc: 'Start fresh conversation', category: 'Actions', action: () => clearChat?.() },
    { id: 'export', icon: '📥', title: 'Export Chat', desc: 'Download conversation', category: 'Actions', action: () => exportChat?.() },
    { id: 'shortcuts', icon: '⌨️', title: 'Keyboard Shortcuts', desc: 'View all hotkeys', category: 'Actions', action: () => showShortcutsHelp?.() },
    { id: 'mcp-servers', icon: '🔌', title: 'Toggle MCP Sidebar', desc: 'Show/hide server list', category: 'Actions', action: () => modernUI.toggleMCPSidebar() }
  ],

  // Initialize modern UI
  init() {
    this.createIconSidebar();
    this.createCommandPalette();
    this.setupKeyboardShortcuts();
    this.applyModernLayout();
    
    // Show hint on first load
    if (!localStorage.getItem('mcp_modern_ui_hint_shown')) {
      this.showFloatingHint();
      localStorage.setItem('mcp_modern_ui_hint_shown', 'true');
    }
  },

  // Create icon sidebar
  createIconSidebar() {
    const sidebar = document.createElement('div');
    sidebar.className = 'icon-sidebar';
    sidebar.id = 'iconSidebar';
    
    const mainIcons = document.createElement('div');
    mainIcons.className = 'icon-sidebar-main';
    
    // Primary view icons
    const primaryViews = Object.entries(this.views).filter(([_, v]) => v.primary);
    primaryViews.forEach(([id, view]) => {
      const btn = document.createElement('button');
      btn.className = `sidebar-icon ${id === this.activeView ? 'active' : ''}`;
      btn.setAttribute('data-tooltip', view.label);
      btn.setAttribute('data-view', id);
      btn.innerHTML = view.icon;
      btn.onclick = () => this.switchView(id);
      mainIcons.appendChild(btn);
    });
    
    sidebar.appendChild(mainIcons);
    
    // Bottom section with more menu
    const bottomIcons = document.createElement('div');
    bottomIcons.className = 'icon-sidebar-bottom';
    
    // MCP Servers toggle
    const mcpBtn = document.createElement('button');
    mcpBtn.className = 'sidebar-icon';
    mcpBtn.setAttribute('data-tooltip', 'MCP Servers');
    mcpBtn.innerHTML = '🔌';
    mcpBtn.onclick = () => this.toggleMCPSidebar();
    bottomIcons.appendChild(mcpBtn);
    
    // More menu button
    const moreBtn = document.createElement('button');
    moreBtn.className = 'sidebar-icon';
    moreBtn.setAttribute('data-tooltip', 'More');
    moreBtn.innerHTML = '☰';
    moreBtn.onclick = (e) => this.toggleMoreMenu(e);
    bottomIcons.appendChild(moreBtn);
    
    sidebar.appendChild(bottomIcons);
    
    // Create more menu
    this.createMoreMenu();
    
    document.body.appendChild(sidebar);
  },

  // Create more menu dropdown
  createMoreMenu() {
    const menu = document.createElement('div');
    menu.className = 'more-menu';
    menu.id = 'moreMenu';
    
    const secondaryViews = Object.entries(this.views).filter(([_, v]) => !v.primary);
    secondaryViews.forEach(([id, view]) => {
      const item = document.createElement('div');
      item.className = 'more-menu-item';
      item.innerHTML = `
        <span class="more-menu-item-icon">${view.icon}</span>
        <span>${view.label}</span>
      `;
      item.onclick = () => {
        this.openSecondaryPanel(id);
        this.closeMoreMenu();
      };
      menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.more-menu') && !e.target.closest('[data-tooltip="More"]')) {
        this.closeMoreMenu();
      }
    });
  },

  // Create command palette
  createCommandPalette() {
    const overlay = document.createElement('div');
    overlay.className = 'command-palette-overlay';
    overlay.id = 'commandPalette';
    overlay.onclick = (e) => {
      if (e.target === overlay) this.closeCommandPalette();
    };
    
    overlay.innerHTML = `
      <div class="command-palette">
        <div class="command-input-wrapper">
          <span class="command-input-icon">⌘</span>
          <input 
            type="text" 
            class="command-input" 
            id="commandInput"
            placeholder="Type a command or search..."
            autocomplete="off"
          />
          <span class="command-shortcut-hint">ESC to close</span>
        </div>
        <div class="command-results" id="commandResults"></div>
        <div class="command-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Setup input handling
    const input = document.getElementById('commandInput');
    input.addEventListener('input', () => this.filterCommands(input.value));
    input.addEventListener('keydown', (e) => this.handleCommandKey(e));
  },

  // Apply modern layout class
  applyModernLayout() {
    document.body.classList.add('modern-layout');
    
    // Hide old tab navigation
    const tabNav = document.querySelector('.tab-nav');
    if (tabNav) tabNav.style.display = 'none';
    
    // Adjust main container
    const main = document.querySelector('.main');
    if (main) main.classList.add('main-with-sidebar');
  },

  // Switch primary view
  switchView(viewId) {
    this.activeView = viewId;
    
    // Update sidebar icons
    document.querySelectorAll('.sidebar-icon').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      }
    });
    
    // Use existing switchTab function
    if (typeof switchTab === 'function') {
      switchTab(viewId);
    }
    
    // Close secondary panel if opening primary
    if (this.views[viewId]?.primary) {
      this.closeSecondaryPanel();
    }
  },

  // Open secondary panel
  openSecondaryPanel(viewId) {
    this.secondaryView = viewId;
    this.secondaryOpen = true;
    
    // For now, use existing tab switching
    if (typeof switchTab === 'function') {
      switchTab(viewId);
    }
    
    this.closeMoreMenu();
  },

  // Close secondary panel
  closeSecondaryPanel() {
    this.secondaryOpen = false;
    this.secondaryView = null;
  },

  // Toggle MCP sidebar
  toggleMCPSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('visible');
      sidebar.classList.toggle('collapsed');
    }
  },

  // Toggle more menu
  toggleMoreMenu(e) {
    e?.stopPropagation();
    const menu = document.getElementById('moreMenu');
    menu?.classList.toggle('active');
  },

  // Close more menu
  closeMoreMenu() {
    document.getElementById('moreMenu')?.classList.remove('active');
  },

  // Open command palette
  openCommandPalette() {
    this.commandPaletteOpen = true;
    const overlay = document.getElementById('commandPalette');
    const input = document.getElementById('commandInput');
    
    overlay?.classList.add('active');
    input?.focus();
    input.value = '';
    this.filterCommands('');
  },

  // Close command palette
  closeCommandPalette() {
    this.commandPaletteOpen = false;
    document.getElementById('commandPalette')?.classList.remove('active');
  },

  // Filter commands
  filterCommands(query) {
    const q = query.toLowerCase().trim();
    
    if (!q) {
      this.filteredCommands = this.commands;
    } else {
      this.filteredCommands = this.commands.filter(cmd => 
        cmd.title.toLowerCase().includes(q) ||
        cmd.desc.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q)
      );
    }
    
    this.selectedCommandIndex = 0;
    this.renderCommands();
  },

  // Render commands
  renderCommands() {
    const container = document.getElementById('commandResults');
    if (!container) return;
    
    // Group by category
    const grouped = {};
    this.filteredCommands.forEach(cmd => {
      if (!grouped[cmd.category]) grouped[cmd.category] = [];
      grouped[cmd.category].push(cmd);
    });
    
    let html = '';
    let index = 0;
    
    for (const [category, commands] of Object.entries(grouped)) {
      html += `<div class="command-group">
        <div class="command-group-title">${category}</div>`;
      
      commands.forEach(cmd => {
        const selected = index === this.selectedCommandIndex ? 'selected' : '';
        html += `
          <div class="command-item ${selected}" data-index="${index}" data-id="${cmd.id}">
            <div class="command-item-icon">${cmd.icon}</div>
            <div class="command-item-content">
              <div class="command-item-title">${cmd.title}</div>
              <div class="command-item-desc">${cmd.desc}</div>
            </div>
            ${cmd.shortcut ? `<span class="command-item-shortcut">${cmd.shortcut}</span>` : ''}
          </div>
        `;
        index++;
      });
      
      html += '</div>';
    }
    
    container.innerHTML = html || '<div style="padding: 20px; text-align: center; color: var(--text-muted)">No results found</div>';
    
    // Add click handlers
    container.querySelectorAll('.command-item').forEach(item => {
      item.onclick = () => this.executeCommand(item.dataset.id);
      item.onmouseenter = () => {
        this.selectedCommandIndex = parseInt(item.dataset.index);
        this.updateSelection();
      };
    });
  },

  // Update selection highlight
  updateSelection() {
    document.querySelectorAll('.command-item').forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedCommandIndex);
    });
  },

  // Handle keyboard in command palette
  handleCommandKey(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedCommandIndex = Math.min(
          this.selectedCommandIndex + 1,
          this.filteredCommands.length - 1
        );
        this.updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedCommandIndex = Math.max(this.selectedCommandIndex - 1, 0);
        this.updateSelection();
        break;
      case 'Enter':
        e.preventDefault();
        const cmd = this.filteredCommands[this.selectedCommandIndex];
        if (cmd) this.executeCommand(cmd.id);
        break;
      case 'Escape':
        this.closeCommandPalette();
        break;
    }
  },

  // Execute command
  executeCommand(id) {
    const cmd = this.commands.find(c => c.id === id);
    if (!cmd) return;
    
    this.closeCommandPalette();
    
    if (cmd.action) {
      cmd.action();
    } else if (this.views[id]) {
      if (this.views[id].primary) {
        this.switchView(id);
      } else {
        this.openSecondaryPanel(id);
      }
    }
  },

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K - Command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (this.commandPaletteOpen) {
          this.closeCommandPalette();
        } else {
          this.openCommandPalette();
        }
      }
      
      // Escape - Close modals
      if (e.key === 'Escape') {
        if (this.commandPaletteOpen) {
          this.closeCommandPalette();
        }
      }
    });
  },

  // Show floating hint
  showFloatingHint() {
    const hint = document.createElement('div');
    hint.className = 'floating-hint';
    hint.innerHTML = `Press <kbd>Ctrl+K</kbd> for quick navigation`;
    document.body.appendChild(hint);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hint.style.opacity = '0';
      hint.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => hint.remove(), 300);
    }, 5000);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure other scripts load first
  setTimeout(() => modernUI.init(), 100);
});

// Expose globally
window.modernUI = modernUI;
