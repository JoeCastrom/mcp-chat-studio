// ==========================================
// ONBOARDING TOUR - First-run experience
// ==========================================

const onboardingTour = {
  STORAGE_KEY: 'mcp_chat_studio_onboarded',
  currentStep: 0,
  steps: [],
  overlay: null,
  spotlight: null,
  tooltip: null,

  // Check if user has completed onboarding
  hasCompletedTour() {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  },

  // Mark tour as complete
  completeTour() {
    localStorage.setItem(this.STORAGE_KEY, 'true');
    this.cleanup();
    showToast('🎉 Tour complete! You\'re ready to go.', 'success');
  },

  // Skip tour
  skipTour() {
    this.completeTour();
  },

  // Reset tour (for re-running)
  resetTour() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  // Define tour steps
  getSteps() {
    return [
      {
        element: null,
        title: '🚀 Welcome to MCP Chat Studio!',
        content: `
          <p>The <strong>Ultimate Testing Platform</strong> for MCP Servers.</p>
          <p style="margin-top: 12px; font-size: 0.85rem; color: var(--text-secondary)">
            Think of it as <strong>Postman for MCP</strong> — test, debug, and develop your Model Context Protocol servers with ease.
          </p>
          <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="tour-badge">🔧 8 LLM Providers</span>
            <span class="tour-badge">🧪 Test Scenarios</span>
            <span class="tour-badge">⛓️ Visual Workflows</span>
          </div>
        `,
        position: 'center'
      },
      {
        element: '#mcpServers',
        title: '🔌 Connect Your MCP Servers',
        content: `
          <p>Start by <strong>adding MCP servers</strong> here. Click "+ Add" to configure STDIO or SSE servers.</p>
          <p style="margin-top: 8px; font-size: 0.85rem;">Use templates for popular servers like GitHub, Filesystem, or Brave Search.</p>
        `,
        position: 'right'
      },
      {
        element: '#testAllBtn',
        title: '🧪 Test All Tools',
        content: `
          <p>Once connected, click here to <strong>smoke test all tools</strong> at once.</p>
          <p style="margin-top: 8px; font-size: 0.85rem;">This validates your server is working correctly before diving deeper.</p>
        `,
        position: 'right'
      },
      {
        element: '.tab-nav',
        title: '📑 Explore Feature Tabs',
        content: `
          <p>Your testing toolkit is organized into <strong>13 powerful tabs</strong>:</p>
          <ul style="margin: 12px 0; padding-left: 20px; font-size: 0.85rem; line-height: 1.8;">
            <li><strong>Chat</strong> — AI conversations with tool calling</li>
            <li><strong>Inspector</strong> — Low-level protocol debugging</li>
            <li><strong>Scenarios</strong> — Record & replay test sequences</li>
            <li><strong>Workflows</strong> — Visual automation builder</li>
            <li><strong>Collections</strong> — Organize tests like Postman</li>
            <li><strong>Analytics</strong> — Usage stats & health monitoring</li>
          </ul>
        `,
        position: 'bottom'
      },
      {
        element: '#workflowsTabBtn',
        title: '⛓️ Visual Workflow Builder',
        content: `
          <p>Create <strong>multi-step test sequences</strong> with drag-and-drop nodes.</p>
          <p style="margin-top: 8px; font-size: 0.85rem;">
            Pro tip: Use the <strong>✨ AI Builder</strong> to generate workflows from natural language!
          </p>
        `,
        position: 'bottom'
      },
      {
        element: '#modelBadge',
        title: '🧠 Multi-Provider LLM Support',
        content: `
          <p>Click here to switch between <strong>8 LLM providers</strong>:</p>
          <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; font-size: 0.8rem;">
            <span class="tour-badge">🦙 Ollama</span>
            <span class="tour-badge">🤖 OpenAI</span>
            <span class="tour-badge">🧠 Claude</span>
            <span class="tour-badge">♊ Gemini</span>
            <span class="tour-badge">🌐 OpenRouter</span>
          </div>
          <p style="margin-top: 8px; font-size: 0.85rem;">Works with local Ollama out of the box — no API keys needed!</p>
        `,
        position: 'bottom'
      },
      {
        element: null,
        title: '⌨️ Pro Tips',
        content: `
          <p><strong>Keyboard shortcuts</strong> for power users:</p>
          <div style="margin-top: 12px; display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 0.85rem;">
            <kbd>Ctrl+1-9</kbd><span>Switch tabs</span>
            <kbd>Ctrl+K</kbd><span>Search tools</span>
            <kbd>Ctrl+/</kbd><span>Show all shortcuts</span>
            <kbd>Escape</kbd><span>Cancel / Close</span>
          </div>
        `,
        position: 'center'
      },
      {
        element: null,
        title: '🎉 You\'re Ready!',
        content: `
          <p>You now have the power to <strong>test, debug, and automate</strong> your MCP servers like a pro.</p>
          <p style="margin-top: 12px; font-size: 0.85rem;">
            Need help? Click the <strong>?</strong> button anytime or visit the <strong>📖 Docs</strong> tab.
          </p>
          <p style="margin-top: 12px; font-style: italic; color: var(--text-secondary);">
            Happy testing! 🚀
          </p>
        `,
        position: 'center'
      }
    ];
  },

  // Start the tour
  start() {
    this.steps = this.getSteps();
    this.currentStep = 0;
    this.createOverlay();
    this.showStep(0);
  },

  // Create overlay elements
  createOverlay() {
    // Remove existing if any
    this.cleanup();

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    this.overlay.innerHTML = `
      <div class="tour-backdrop"></div>
      <div class="tour-spotlight"></div>
      <div class="tour-tooltip">
        <div class="tour-tooltip-header">
          <span class="tour-step-indicator"></span>
          <button class="tour-close" onclick="onboardingTour.skipTour()">✕</button>
        </div>
        <h3 class="tour-title"></h3>
        <div class="tour-content"></div>
        <div class="tour-actions">
          <button class="tour-btn tour-btn-skip" onclick="onboardingTour.skipTour()">Skip Tour</button>
          <div style="flex: 1"></div>
          <button class="tour-btn tour-btn-prev" onclick="onboardingTour.prevStep()">← Back</button>
          <button class="tour-btn tour-btn-next" onclick="onboardingTour.nextStep()">Next →</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.spotlight = this.overlay.querySelector('.tour-spotlight');
    this.tooltip = this.overlay.querySelector('.tour-tooltip');

    // Add escape key listener
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') this.skipTour();
    };
    document.addEventListener('keydown', this.escapeHandler);
  },

  // Show a specific step
  showStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    
    this.currentStep = index;
    const step = this.steps[index];

    // Update step indicator
    const indicator = this.tooltip.querySelector('.tour-step-indicator');
    indicator.textContent = `Step ${index + 1} of ${this.steps.length}`;

    // Update title and content
    this.tooltip.querySelector('.tour-title').textContent = step.title;
    this.tooltip.querySelector('.tour-content').innerHTML = step.content;

    // Update button visibility
    const prevBtn = this.tooltip.querySelector('.tour-btn-prev');
    const nextBtn = this.tooltip.querySelector('.tour-btn-next');
    const skipBtn = this.tooltip.querySelector('.tour-btn-skip');

    prevBtn.style.display = index === 0 ? 'none' : 'inline-flex';
    skipBtn.style.display = index === this.steps.length - 1 ? 'none' : 'inline-flex';
    
    if (index === this.steps.length - 1) {
      nextBtn.textContent = 'Get Started! 🚀';
      nextBtn.onclick = () => this.completeTour();
    } else {
      nextBtn.textContent = 'Next →';
      nextBtn.onclick = () => this.nextStep();
    }

    // Position spotlight and tooltip
    this.positionElements(step);
  },

  // Position spotlight and tooltip
  positionElements(step) {
    const backdrop = this.overlay.querySelector('.tour-backdrop');
    
    if (!step.element || step.position === 'center') {
      // Center position - no element highlight
      this.spotlight.style.display = 'none';
      backdrop.style.opacity = '1';
      
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.top = '50%';
      this.tooltip.style.left = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      this.tooltip.style.maxWidth = '500px';
      return;
    }

    const el = document.querySelector(step.element);
    if (!el) {
      // Element not found, center it
      this.spotlight.style.display = 'none';
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.top = '50%';
      this.tooltip.style.left = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    // Show spotlight
    const rect = el.getBoundingClientRect();
    const padding = 8;
    
    this.spotlight.style.display = 'block';
    this.spotlight.style.left = `${rect.left - padding}px`;
    this.spotlight.style.top = `${rect.top - padding}px`;
    this.spotlight.style.width = `${rect.width + padding * 2}px`;
    this.spotlight.style.height = `${rect.height + padding * 2}px`;
    
    backdrop.style.opacity = '1';

    // Position tooltip
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.transform = 'none';
    this.tooltip.style.maxWidth = '400px';

    const tooltipRect = this.tooltip.getBoundingClientRect();
    const gap = 16;

    switch (step.position) {
      case 'right':
        this.tooltip.style.left = `${rect.right + gap}px`;
        this.tooltip.style.top = `${rect.top}px`;
        break;
      case 'left':
        this.tooltip.style.left = `${rect.left - tooltipRect.width - gap}px`;
        this.tooltip.style.top = `${rect.top}px`;
        break;
      case 'bottom':
        this.tooltip.style.left = `${rect.left}px`;
        this.tooltip.style.top = `${rect.bottom + gap}px`;
        break;
      case 'top':
        this.tooltip.style.left = `${rect.left}px`;
        this.tooltip.style.top = `${rect.top - tooltipRect.height - gap}px`;
        break;
    }

    // Ensure tooltip stays in viewport
    this.clampToViewport();
  },

  // Keep tooltip in viewport
  clampToViewport() {
    const rect = this.tooltip.getBoundingClientRect();
    const padding = 16;

    if (rect.right > window.innerWidth - padding) {
      this.tooltip.style.left = `${window.innerWidth - rect.width - padding}px`;
    }
    if (rect.left < padding) {
      this.tooltip.style.left = `${padding}px`;
    }
    if (rect.bottom > window.innerHeight - padding) {
      this.tooltip.style.top = `${window.innerHeight - rect.height - padding}px`;
    }
    if (rect.top < padding) {
      this.tooltip.style.top = `${padding}px`;
    }
  },

  // Next step
  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    }
  },

  // Previous step
  prevStep() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  },

  // Cleanup
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
  }
};

// Function to start tour manually
function startTour() {
  onboardingTour.resetTour();
  onboardingTour.start();
}

// Check and start tour on first visit
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for the app to fully load
  setTimeout(() => {
    if (!onboardingTour.hasCompletedTour()) {
      onboardingTour.start();
    }
  }, 1000);
});
