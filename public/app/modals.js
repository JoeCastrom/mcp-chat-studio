// Modal helpers + HTML sanitizer (loaded before app.js)

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function sanitizeHtml(html) {
  const input = String(html || '');
  const allowedTags = ['BR', 'STRONG', 'EM', 'CODE', 'PRE', 'A', 'P', 'UL', 'OL', 'LI', 'SPAN'];
  const allowedAttrs = ['href', 'title', 'target', 'rel'];

  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(input, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttrs,
      FORBID_ATTR: ['style', 'on*']
    });
  }

  const template = document.createElement('template');
  template.innerHTML = input;
  const allowTagSet = new Set(allowedTags);
  const allowAttrSet = new Set(allowedAttrs);
  const allowedProtocols = new Set(['http:', 'https:', 'mailto:']);

  const isSafeUrl = (value) => {
    try {
      const parsed = new URL(value, window.location.origin);
      return allowedProtocols.has(parsed.protocol);
    } catch (error) {
      return false;
    }
  };

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  const toRemove = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!allowTagSet.has(node.tagName)) {
      toRemove.push(node);
      continue;
    }

    Array.from(node.attributes).forEach(attr => {
      if (!allowAttrSet.has(attr.name)) {
        node.removeAttribute(attr.name);
      }
    });

    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (!isSafeUrl(href)) {
        node.removeAttribute('href');
        node.removeAttribute('target');
        node.removeAttribute('rel');
      } else {
        node.setAttribute('href', href);
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }

  toRemove.forEach(node => {
    const textNode = document.createTextNode(node.textContent || '');
    node.replaceWith(textNode);
  });

  return template.innerHTML;
}

function formatModalMessage(message) {
  if (!message) return '';
  return escapeHtml(message).replace(/\n/g, '<br>');
}

function showAppModal(options = {}) {
  const {
    title = 'Confirm',
    message = '',
    bodyHtml = '',
    fields = [],
    confirmText = 'OK',
    cancelText = 'Cancel',
    showCancel = true,
    confirmVariant = 'primary',
    maxWidth = '520px'
  } = options;

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.dataset.appModal = 'true';

    const messageHtml = formatModalMessage(message);
    const fieldHtml = fields.map((field, index) => {
      const fieldId = field.id || `field_${index}`;
      const label = field.label ? `<label class="form-label" for="${fieldId}">${escapeHtml(field.label)}</label>` : '';
      const hint = field.hint ? `<div class="form-hint">${escapeHtml(field.hint)}</div>` : '';
      const requiredAttr = field.required ? 'required' : '';
      const placeholder = field.placeholder ? escapeHtml(field.placeholder) : '';
      const value = field.value ?? '';
      const inputStyle = field.monospace ? 'font-family: "JetBrains Mono", monospace;' : '';

      let inputHtml = '';
      if (field.type === 'textarea') {
        const rows = field.rows || 5;
        inputHtml = `<textarea class="form-input" id="${fieldId}" ${requiredAttr} placeholder="${placeholder}" rows="${rows}" style="${inputStyle}">${escapeHtml(String(value))}</textarea>`;
      } else if (field.type === 'select') {
        const optionsHtml = (field.options || []).map(opt => {
          const optValue = opt.value ?? opt;
          const optLabel = opt.label ?? optValue;
          const selected = optValue === value ? 'selected' : '';
          return `<option value="${escapeHtml(String(optValue))}" ${selected}>${escapeHtml(String(optLabel))}</option>`;
        }).join('');
        inputHtml = `<select class="form-select" id="${fieldId}" ${requiredAttr}>${optionsHtml}</select>`;
      } else {
        const type = field.type || 'text';
        inputHtml = `<input class="form-input" id="${fieldId}" type="${type}" ${requiredAttr} placeholder="${placeholder}" value="${escapeHtml(String(value))}" style="${inputStyle}" />`;
      }

      return `
        <div class="form-group" data-field-group="${fieldId}">
          ${label}
          ${inputHtml}
          <div class="form-error">Required</div>
          ${hint}
        </div>
      `;
    }).join('');

    const confirmClass = confirmVariant === 'danger' ? 'btn danger' : 'btn primary';
    overlay.innerHTML = `
      <div class="modal" style="max-width: ${maxWidth}">
        <div class="modal-header">
          <h2 class="modal-title">${escapeHtml(title)}</h2>
          <button class="modal-close" data-action="cancel" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        ${messageHtml ? `<div style="margin-bottom: 12px; font-size: 0.85rem; color: var(--text-secondary)">${messageHtml}</div>` : ''}
        ${bodyHtml ? `<div style="margin-bottom: 12px">${bodyHtml}</div>` : ''}
        ${fieldHtml ? `<div>${fieldHtml}</div>` : ''}
        <div class="modal-actions">
          ${showCancel ? `<button class="btn" data-action="cancel">${escapeHtml(cancelText)}</button>` : ''}
          <button class="${confirmClass}" data-action="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
      resolve(result);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cleanup({ confirmed: false, values: {} });
      }
    };

    const validateFields = () => {
      let valid = true;
      const values = {};
      fields.forEach((field, index) => {
        const fieldId = field.id || `field_${index}`;
        const input = overlay.querySelector(`#${fieldId}`);
        const group = overlay.querySelector(`[data-field-group="${fieldId}"]`);
        const errorEl = group?.querySelector('.form-error');
        let value = input?.value ?? '';
        if (field.type === 'number') {
          value = value === '' ? '' : Number(value);
        }

        const isEmpty = value === '' || value === null || value === undefined;
        if (field.required && isEmpty) {
          valid = false;
          if (errorEl) {
            errorEl.textContent = 'Required';
            errorEl.style.display = 'block';
          }
          if (group) group.classList.add('has-error');
        } else if (field.validate) {
          const error = field.validate(value);
          if (error) {
            valid = false;
            if (errorEl) {
              errorEl.textContent = error;
              errorEl.style.display = 'block';
            }
            if (group) group.classList.add('has-error');
          } else if (group) {
            group.classList.remove('has-error');
            if (errorEl) errorEl.style.display = 'none';
          }
        } else if (group) {
          group.classList.remove('has-error');
          if (errorEl) errorEl.style.display = 'none';
        }

        values[field.name || field.id || `field_${index}`] = value;
      });
      return { valid, values };
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup({ confirmed: false, values: {} });
      }
    });

    overlay.querySelectorAll('[data-action="cancel"]').forEach(btn => {
      btn.addEventListener('click', () => cleanup({ confirmed: false, values: {} }));
    });

    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const { valid, values } = validateFields();
        if (!valid) return;
        cleanup({ confirmed: true, values });
      });
    }

    document.addEventListener('keydown', onKeyDown);

    const firstInput = overlay.querySelector('input, textarea, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  });
}

async function appConfirm(message, options = {}) {
  const result = await showAppModal({
    title: options.title || 'Confirm',
    message,
    confirmText: options.confirmText || 'Confirm',
    cancelText: options.cancelText || 'Cancel',
    confirmVariant: options.confirmVariant || 'primary',
    showCancel: true
  });
  return result.confirmed;
}

async function appAlert(message, options = {}) {
  await showAppModal({
    title: options.title || 'Notice',
    message,
    bodyHtml: options.bodyHtml || '',
    confirmText: options.confirmText || 'OK',
    showCancel: false
  });
}

async function appPrompt(message, options = {}) {
  const result = await showAppModal({
    title: options.title || 'Input',
    message,
    confirmText: options.confirmText || 'Save',
    cancelText: options.cancelText || 'Cancel',
    fields: [
      {
        id: 'value',
        label: options.label || 'Value',
        type: options.multiline ? 'textarea' : (options.type || 'text'),
        value: options.defaultValue ?? '',
        placeholder: options.placeholder || '',
        required: options.required || false,
        rows: options.rows,
        monospace: options.monospace || false,
        hint: options.hint
      }
    ]
  });
  if (!result.confirmed) return null;
  return result.values.value;
}

async function appFormModal(options = {}) {
  return showAppModal(options);
}
