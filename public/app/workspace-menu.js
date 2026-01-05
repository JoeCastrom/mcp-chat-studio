// Workspace header menu helpers
(() => {
  function notify(message, type = 'info') {
    if (typeof window.notifyUser === 'function') {
      window.notifyUser(message, type);
      return;
    }
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
      return;
    }
    if (typeof window.appendMessage === 'function') {
      window.appendMessage('system', message);
    }
  }

  function inWorkspaceMode() {
    return document.body.classList.contains('workspace-mode');
  }

  window.openWorkspaceTemplates = function openWorkspaceTemplates() {
    if (window.floatingWorkspace?.showTemplatesModal) {
      window.floatingWorkspace.showTemplatesModal();
      return;
    }
    notify('Workspace templates are available in Workspace mode.', 'info');
  };

  window.openWorkspaceSessions = function openWorkspaceSessions() {
    if (!inWorkspaceMode()) {
      notify('Switch to Workspace mode to manage sessions.', 'info');
      return;
    }
    if (window.floatingWorkspace?.showSessionsModal) {
      window.floatingWorkspace.showSessionsModal();
      return;
    }
    notify('Workspace sessions are available in Workspace mode.', 'info');
  };

  window.exportWorkspaceBundle = function exportWorkspaceBundle() {
    if (!inWorkspaceMode()) {
      notify('Switch to Workspace mode to export a bundle.', 'info');
      return;
    }
    if (window.floatingWorkspace?.exportWorkspace) {
      window.floatingWorkspace.exportWorkspace();
      return;
    }
    notify('Workspace export is available in Workspace mode.', 'info');
  };

  window.importWorkspaceBundle = function importWorkspaceBundle() {
    if (!inWorkspaceMode()) {
      notify('Switch to Workspace mode to import a bundle.', 'info');
      return;
    }
    if (window.floatingWorkspace?.importWorkspace) {
      window.floatingWorkspace.importWorkspace();
      return;
    }
    notify('Workspace import is available in Workspace mode.', 'info');
  };

  window.toggleWorkspaceMenu = function toggleWorkspaceMenu() {
    const popover = document.getElementById('workspaceMenuPopover');
    const toggle = document.getElementById('workspaceMenuToggle');
    if (!popover || !toggle) return;
    if (typeof window.closeProviderMenu === 'function') {
      window.closeProviderMenu();
    }
    const isOpen = popover.classList.contains('open');
    if (isOpen) {
      window.closeWorkspaceMenu?.();
    } else {
      popover.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  };

  window.closeWorkspaceMenu = function closeWorkspaceMenu() {
    const popover = document.getElementById('workspaceMenuPopover');
    const toggle = document.getElementById('workspaceMenuToggle');
    if (popover) popover.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  };

  window.maybeShowWorkspaceTemplateHint = function maybeShowWorkspaceTemplateHint() {
    if (localStorage.getItem('workspace_templates_hint') === 'shown') return;
    localStorage.setItem('workspace_templates_hint', 'shown');
    notify('Tip: open Workspace Templates (🗂️) to load a layout fast.', 'info');
  };
})();
