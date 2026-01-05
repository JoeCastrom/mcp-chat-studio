// MCP SERVER GENERATOR
      // ==========================================

      let openApiSpec = null;
      let openApiOperations = [];
      let openApiSelected = new Set();
      let openApiSource = '';
      let openApiServers = [];
      let openApiSecuritySchemes = [];
      let openApiOnlyWebhooks = false;
      let generatorRunState = null;
      let generatorRunOs = 'unix';
      let generatorTestCwd = '';
      let generatorTestOs = 'unix';
      let generatorLastFolderName = localStorage.getItem('mcp_generator_last_folder') || '';
      let generatorPickedFolderName = '';

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          updateGeneratorAutoRunButtons();
        });
      } else {
        updateGeneratorAutoRunButtons();
      }

      function triggerOpenApiFile() {
        document.getElementById('openApiFileInput')?.click();
      }

      async function handleOpenApiFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        await parseOpenApiText(text, file.name || 'local file');
        event.target.value = '';
      }

      async function loadOpenApiFromUrl() {
        const input = document.getElementById('openApiUrlInput');
        const url = input?.value?.trim();
        if (!url) {
          appendMessage('error', 'Enter an OpenAPI URL');
          return;
        }
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const text = await response.text();
          await parseOpenApiText(text, url);
        } catch (error) {
          appendMessage('error', `Failed to load OpenAPI spec: ${error.message}`);
        }
      }

      async function loadOpenApiExample() {
        const sampleUrl = 'https://petstore3.swagger.io/api/v3/openapi.json';
        const input = document.getElementById('openApiUrlInput');
        if (input) input.value = sampleUrl;
        await loadOpenApiFromUrl();
      }

      async function parseOpenApiText(text, source) {
        const sanitized = text.replace(/^\uFEFF/, '').trim();
        if (!sanitized) {
          appendMessage('error', 'OpenAPI file is empty.');
          return;
        }
        try {
          const spec = JSON.parse(sanitized);
          applyOpenApiSpec(spec, source);
          return;
        } catch (error) {
          // Fall back to server-side YAML parsing
        }

        try {
          const response = await fetch('/api/openapi/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text: sanitized })
          });
          const data = await response.json();
          if (!response.ok || data?.error) {
            throw new Error(data?.error || response.statusText);
          }
          applyOpenApiSpec(data.spec, source);
        } catch (error) {
          const summary = document.getElementById('openApiSummary');
          if (summary) {
            summary.textContent = `Failed to parse ${source}: ${error.message}`;
          }
          appendMessage('error', `OpenAPI parse failed: ${error.message}`);
        }
      }

      function applyOpenApiSpec(spec, source) {
        if (!spec || (!spec.openapi && !spec.swagger)) {
          const summary = document.getElementById('openApiSummary');
          if (summary) {
            summary.textContent = `Invalid OpenAPI spec from ${source}`;
          }
          appendMessage('error', 'Not a valid OpenAPI/Swagger document.');
          return;
        }
        openApiSpec = spec;
        openApiSource = source || '';
        openApiOperations = buildOpenApiOperations(spec);
        openApiSelected = new Set();
        const hasPathOps = openApiOperations.some(op => op.source === 'path');
        const hasWebhookOps = openApiOperations.some(op => op.source === 'webhook');
        openApiOnlyWebhooks = hasWebhookOps && !hasPathOps;
        if (openApiOperations.length && openApiOperations.length <= 20) {
          openApiOperations.forEach(op => openApiSelected.add(op.id));
        }
        openApiServers = getOpenApiServers(spec);
        openApiSecuritySchemes = getOpenApiSecuritySchemes(spec);
        const baseUrlInput = document.getElementById('genServerBaseUrl');
        if (baseUrlInput && !baseUrlInput.value && openApiServers.length) {
          baseUrlInput.value = openApiServers[0];
          appendMessage('system', `✅ Base URL set to ${openApiServers[0]}`);
        }
        const modeSelect = document.getElementById('genMode');
        if (modeSelect && modeSelect.value === 'scaffold' && openApiOperations.length) {
          modeSelect.value = 'openapi';
          appendMessage('system', '⚡ OpenAPI loaded: switched to OpenAPI Proxy mode');
        }
        renderOpenApiFilters();
        renderOpenApiEndpoints();
        renderOpenApiServers();
        renderOpenApiSecuritySummary();
        renderOpenApiTagChips();
        updateOpenApiSummary();
      }

      function getOpenApiServers(spec) {
        const servers = Array.isArray(spec.servers) ? spec.servers : [];
        const urls = servers.map(server => server?.url).filter(Boolean);
        if (urls.length) return urls;
        if (spec.swagger && spec.host) {
          const schemes = Array.isArray(spec.schemes) && spec.schemes.length ? spec.schemes : ['https'];
          const basePath = spec.basePath || '';
          return schemes.map(scheme => `${scheme}://${spec.host}${basePath}`);
        }
        return [];
      }

      function getOpenApiSecuritySchemes(spec) {
        const schemes = spec.components?.securitySchemes || spec.securityDefinitions || {};
        return Object.entries(schemes).map(([name, scheme]) => ({
          name,
          type: scheme.type || 'custom',
          in: scheme.in || null,
          scheme: scheme.scheme || null,
          bearerFormat: scheme.bearerFormat || null,
          openIdConnectUrl: scheme.openIdConnectUrl || null,
          flows: scheme.flows ? Object.keys(scheme.flows) : []
        }));
      }

      function renderOpenApiServers() {
        const select = document.getElementById('openApiServerSelect');
        if (!select) return;
        select.innerHTML = '';
        if (!openApiServers.length) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'No servers detected';
          select.appendChild(opt);
          return;
        }
        openApiServers.forEach(url => {
          const opt = document.createElement('option');
          opt.value = url;
          opt.textContent = url;
          select.appendChild(opt);
        });
      }

      function applyOpenApiServer() {
        const select = document.getElementById('openApiServerSelect');
        const input = document.getElementById('genServerBaseUrl');
        if (!select || !input) return;
        if (!select.value) {
          appendMessage('error', 'No server URL detected in spec.');
          return;
        }
        input.value = select.value;
        appendMessage('system', `✅ Base URL set to ${select.value}`);
      }

      function renderOpenApiSecuritySummary() {
        const el = document.getElementById('openApiSecuritySummary');
        if (!el) return;
        if (!openApiSecuritySchemes.length) {
          el.textContent = 'No security schemes detected.';
          return;
        }
        const parts = openApiSecuritySchemes.map(scheme => {
          if (scheme.type === 'apiKey') {
            return `${scheme.name} (apiKey in ${scheme.in || 'header'})`;
          }
          if (scheme.type === 'http') {
            return `${scheme.name} (http ${scheme.scheme || 'auth'})`;
          }
          if (scheme.type === 'oauth2') {
            const flow = scheme.flows?.length ? ` ${scheme.flows.join('/')}` : '';
            return `${scheme.name} (oauth2${flow})`;
          }
          if (scheme.type === 'openIdConnect') {
            return `${scheme.name} (oidc)`;
          }
          return `${scheme.name} (${scheme.type})`;
        });
        el.textContent = `Security: ${parts.join(' • ')}`;
      }

      function renderOpenApiTagChips() {
        const wrap = document.getElementById('openApiTagChips');
        if (!wrap) return;
        if (!openApiOperations.length) {
          wrap.innerHTML = '';
          return;
        }
        const tagCounts = new Map();
        openApiOperations.forEach(op => {
          (op.tags || ['default']).forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });
        wrap.innerHTML = Array.from(tagCounts.entries()).map(([tag, count]) => {
          const totalForTag = openApiOperations.filter(op => (op.tags || ['default']).includes(tag));
          const selectedCount = totalForTag.filter(op => openApiSelected.has(op.id)).length;
          const active = selectedCount === totalForTag.length && totalForTag.length > 0 ? 'active' : '';
          return `
            <button class="generator-tag-chip ${active}" onclick="toggleOpenApiTagSelection('${tag}')">
              ${escapeHtml(tag)} (${count})
            </button>
          `;
        }).join('');
      }

      function toggleOpenApiTagSelection(tag) {
        const ops = openApiOperations.filter(op => (op.tags || ['default']).includes(tag));
        if (!ops.length) return;
        const allSelected = ops.every(op => openApiSelected.has(op.id));
        ops.forEach(op => {
          if (allSelected) {
            openApiSelected.delete(op.id);
          } else {
            openApiSelected.add(op.id);
          }
        });
        renderOpenApiEndpoints();
        renderOpenApiTagChips();
        updateOpenApiSummary();
      }

      function buildOpenApiOperations(spec) {
        const ops = [];
        const paths = spec.paths || {};
        const webhooks = spec.webhooks || {};
        const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
        const collectOps = (map, kind) => {
          Object.entries(map).forEach(([path, pathItem]) => {
            if (!pathItem || typeof pathItem !== 'object') return;
            const commonParams = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
            methods.forEach(method => {
              const operation = pathItem[method];
              if (!operation) return;
              const params = [
                ...commonParams,
                ...(Array.isArray(operation.parameters) ? operation.parameters : [])
              ];
              const tags = operation.tags?.length ? operation.tags : ['default'];
              const opId = operation.operationId || '';
              const summary = operation.summary || operation.description || '';
              const requestBody = operation.requestBody || null;
              const opPath = kind === 'webhook' ? `/webhooks/${path}` : path;
              ops.push({
                id: `${kind.toUpperCase()} ${method.toUpperCase()} ${opPath}`,
                method,
                path: opPath,
                tags,
                summary,
                operationId: opId,
                parameters: params,
                requestBody,
                security: operation.security,
                responses: operation.responses || {},
                source: kind
              });
            });
          });
        };
        collectOps(paths, 'path');
        collectOps(webhooks, 'webhook');
        return ops;
      }

      function getOpenApiContentSchema(content) {
        if (!content || typeof content !== 'object') return null;
        if (content['application/json']?.schema) return content['application/json'].schema;
        const first = Object.values(content).find(entry => entry?.schema);
        return first?.schema || null;
      }

      function getOpenApiRequestBodySchema(requestBody) {
        if (!requestBody || typeof requestBody !== 'object') return null;
        return getOpenApiContentSchema(requestBody.content);
      }

      function getOpenApiResponseSchema(responses) {
        if (!responses || typeof responses !== 'object') return null;
        const preferred = ['200', '201', '202', '204'];
        for (const code of preferred) {
          if (responses[code]) {
            const schema = getOpenApiContentSchema(responses[code].content);
            if (schema) return schema;
          }
        }
        const entry = Object.values(responses).find(resp => resp?.content);
        return entry ? getOpenApiContentSchema(entry.content) : null;
      }

      function resolveOpenApiAuthForOperation(spec, op) {
        const security = op.security !== undefined ? op.security : spec.security;
        if (!Array.isArray(security) || security.length === 0) return null;
        const schemes = spec.components?.securitySchemes || {};
        const found = [];
        const seen = new Set();
        let allowAnonymous = false;

        security.forEach(req => {
          if (!req || typeof req !== 'object') return;
          const entries = Object.entries(req);
          if (entries.length === 0) {
            allowAnonymous = true;
            return;
          }
          entries.forEach(([name, scopes]) => {
            if (seen.has(name)) return;
            seen.add(name);
            const scheme = schemes[name] || {};
            const meta = {
              name,
              type: scheme.type || 'custom',
              in: scheme.in || null,
              scheme: scheme.scheme || null,
              bearerFormat: scheme.bearerFormat || null,
              openIdConnectUrl: scheme.openIdConnectUrl || null,
              scopes: Array.isArray(scopes) ? scopes : [],
              description: scheme.description || ''
            };
            if (scheme.type === 'oauth2' && scheme.flows) {
              meta.flows = Object.keys(scheme.flows);
            }
            found.push(meta);
          });
        });

        if (!found.length && allowAnonymous) return null;
        return {
          required: !allowAnonymous,
          schemes: found
        };
      }

      function formatOpenApiAuthSummary(auth) {
        if (!auth) return '';
        if (!auth.schemes?.length) {
          return auth.required ? 'required' : 'optional';
        }
        const parts = auth.schemes.map(scheme => {
          if (scheme.type === 'apiKey') {
            return `apiKey(${scheme.in || 'header'}:${scheme.name})`;
          }
          if (scheme.type === 'http') {
            return `http(${scheme.scheme || 'auth'})`;
          }
          if (scheme.type === 'oauth2') {
            const flow = Array.isArray(scheme.flows) && scheme.flows.length ? `:${scheme.flows.join(',')}` : '';
            return `oauth2${flow}`;
          }
          if (scheme.type === 'openIdConnect') {
            return 'oidc';
          }
          return scheme.name;
        });
        const label = parts.join(', ');
        return auth.required ? label : `${label} (optional)`;
      }

      function renderOpenApiFilters() {
        const tagSelect = document.getElementById('openApiTagFilter');
        if (!tagSelect) return;
        const tags = new Set();
        openApiOperations.forEach(op => {
          op.tags?.forEach(tag => tags.add(tag));
        });
        const current = tagSelect.value || 'all';
        tagSelect.innerHTML = '<option value="all">All tags</option>';
        Array.from(tags).sort().forEach(tag => {
          const option = document.createElement('option');
          option.value = tag;
          option.textContent = tag;
          tagSelect.appendChild(option);
        });
        tagSelect.value = current;
      }

      function applyOpenApiFilters() {
        renderOpenApiEndpoints();
        renderOpenApiTagChips();
      }

      function getFilteredOpenApiOps() {
        const tagFilter = document.getElementById('openApiTagFilter')?.value || 'all';
        const methodFilter = document.getElementById('openApiMethodFilter')?.value || 'all';
        const search = document.getElementById('openApiSearchFilter')?.value?.trim().toLowerCase() || '';
        return openApiOperations.filter(op => {
          if (tagFilter !== 'all' && !op.tags?.includes(tagFilter)) return false;
          if (methodFilter !== 'all' && op.method !== methodFilter) return false;
          if (search) {
            const hay = `${op.method} ${op.path} ${op.operationId} ${op.summary}`.toLowerCase();
            if (!hay.includes(search)) return false;
          }
          return true;
        });
      }

      function renderOpenApiEndpoints() {
        const list = document.getElementById('openApiEndpointsList');
        if (!list) return;
        if (!openApiOperations.length) {
          list.innerHTML = '<div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 12px;">Load a spec to see endpoints.</div>';
          return;
        }
        const ops = getFilteredOpenApiOps();
        if (!ops.length) {
          list.innerHTML = '<div style="color: var(--text-muted); font-style: italic; text-align: center; padding: 12px;">No endpoints match your filters.</div>';
          return;
        }
        list.innerHTML = ops.map(op => {
          const checked = openApiSelected.has(op.id) ? 'checked' : '';
          const label = op.summary || op.operationId || 'No summary';
          const tags = op.tags?.length ? op.tags.join(', ') : 'untagged';
          const sourceTag = op.source === 'webhook' ? '<span style="font-size: 0.55rem; padding: 2px 6px; border-radius: 999px; background: rgba(14, 165, 233, 0.2); border: 1px solid rgba(14, 165, 233, 0.5); color: #7dd3fc;">Webhook</span>' : '';
          return `
            <label style="display: flex; gap: 8px; align-items: flex-start; font-size: 0.75rem; color: var(--text-primary); padding: 6px; border-radius: 6px; background: rgba(255,255,255,0.02);">
              <input type="checkbox" ${checked} onchange="toggleOpenApiSelection('${op.id}', this.checked)" />
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <span style="font-size: 0.62rem; padding: 2px 6px; border-radius: 6px; background: rgba(99,102,241,0.2); text-transform: uppercase; letter-spacing: 0.04em;">
                    ${op.method.toUpperCase()}
                  </span>
                  ${sourceTag}
                  <span style="font-family: 'JetBrains Mono', monospace;">${op.path}</span>
                </div>
                <span style="color: var(--text-secondary);">${escapeHtml(label)}</span>
                <span style="color: var(--text-muted); font-size: 0.65rem;">${escapeHtml(tags)}</span>
              </div>
            </label>
          `;
        }).join('');
      }

      function toggleOpenApiSelection(id, checked) {
        if (checked) {
          openApiSelected.add(id);
        } else {
          openApiSelected.delete(id);
        }
        updateOpenApiSummary();
      }

      function updateOpenApiSummary() {
        if (!openApiSpec) return;
        const summary = document.getElementById('openApiSummary');
        if (!summary) return;
        const title = openApiSpec.info?.title || 'OpenAPI Spec';
        const sourceText = openApiSource ? ` • ${openApiSource}` : '';
        const endpointNote = openApiOperations.length ? `${openApiOperations.length} endpoints` : 'No endpoints found';
        const selectionNote = openApiSelected.size
          ? `${openApiSelected.size} selected`
          : 'Select endpoints to import';
        const webhookNote = openApiOnlyWebhooks ? ' • Webhooks only' : '';
        summary.textContent = `${title} • ${endpointNote} • ${selectionNote}${webhookNote}${sourceText}`;
        updateGeneratorAutoRunButtons();
      }

      function selectAllOpenApi(selectAll) {
        if (!openApiOperations.length) return;
        if (selectAll) {
          getFilteredOpenApiOps().forEach(op => openApiSelected.add(op.id));
        } else {
          getFilteredOpenApiOps().forEach(op => openApiSelected.delete(op.id));
        }
        renderOpenApiEndpoints();
        renderOpenApiTagChips();
        updateOpenApiSummary();
      }

      function importOpenApiTools(replaceExisting) {
        if (!openApiOperations.length) {
          appendMessage('error', 'Load an OpenAPI spec first');
          return;
        }
        if (!openApiSelected.size) {
          appendMessage('error', 'Select at least one endpoint');
          return;
        }
        if (replaceExisting) {
          generatorTools = [];
        }
        const selectedOps = openApiOperations.filter(op => openApiSelected.has(op.id));
        selectedOps.forEach(op => {
          const toolName = buildOpenApiToolName(op);
          const uniqueName = ensureUniqueGeneratorToolName(toolName);
          const params = buildOpenApiToolParams(op);
          const auth = resolveOpenApiAuthForOperation(openApiSpec, op);
          const bodySchema = getOpenApiRequestBodySchema(op.requestBody);
          const outputSchema = getOpenApiResponseSchema(op.responses);
          const inputSchema = buildInputSchemaFromParams(params, bodySchema);
          generatorTools.push({
            id: `tool_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: uniqueName,
            description: op.summary || op.operationId || `${op.method.toUpperCase()} ${op.path}`,
            params,
            auth: auth || null,
            inputSchema,
            outputSchema,
            endpoint: {
              method: op.method,
              path: op.path,
              tags: op.tags || [],
              operationId: op.operationId || '',
              source: op.source || 'path'
            }
          });
        });
        renderGeneratorTools();
        renderOpenApiTagChips();
        appendMessage('system', `✅ Imported ${selectedOps.length} tools from OpenAPI`);
      }

      function buildOpenApiToolName(op) {
        const raw = op.operationId || `${op.method}_${op.path}`;
        const cleaned = raw
          .toString()
          .toLowerCase()
          .replace(/[{}]/g, '')
          .replace(/[^\w]+/g, '_')
          .replace(/^_+|_+$/g, '');
        return cleaned || `tool_${op.method}`;
      }

      function ensureUniqueGeneratorToolName(name) {
        const existing = new Set(generatorTools.map(t => t.name));
        if (!existing.has(name)) return name;
        let idx = 2;
        let candidate = `${name}_${idx}`;
        while (existing.has(candidate)) {
          idx += 1;
          candidate = `${name}_${idx}`;
        }
        return candidate;
      }

      function buildOpenApiToolParams(op) {
        const params = [];
        const seen = new Set();
        (op.parameters || []).forEach(param => {
          if (!param || !param.name) return;
          const key = `${param.in || 'query'}:${param.name}`;
          if (seen.has(key)) return;
          seen.add(key);
          const schema = param.schema || {};
          const type = schema.type === 'integer' ? 'number' : (schema.type || 'string');
          const required = param.in === 'path' ? true : !!param.required;
          params.push({
            name: param.name,
            type,
            required,
            location: param.in || 'query',
            description: param.description || '',
            schema
          });
        });
        if (op.requestBody) {
          params.push({
            name: 'body',
            type: 'object',
            required: !!op.requestBody.required
          });
        }
        return params;
      }

      function buildInputSchemaFromParams(params, bodySchema) {
        const schema = { type: 'object', properties: {} };
        const required = [];
        (params || []).forEach(param => {
          const propSchema = param.schema && typeof param.schema === 'object'
            ? { ...param.schema }
            : { type: param.type || 'string' };
          if (param.description) propSchema.description = param.description;
          schema.properties[param.name] = propSchema;
          if (param.required) required.push(param.name);
        });
        if (bodySchema && typeof bodySchema === 'object') {
          schema.properties.body = bodySchema;
        }
        if (required.length) schema.required = required;
        return schema;
      }

      function buildInputSchemaForTool(tool) {
        if (tool.inputSchema && typeof tool.inputSchema === 'object') {
          return tool.inputSchema;
        }
        return buildInputSchemaFromParams(tool.params || [], null);
      }

      function buildPythonArgsSignature(params) {
        if (!Array.isArray(params) || params.length === 0) return '';
        const required = params.filter(param => param.required);
        const optional = params.filter(param => !param.required);
        const ordered = [...required, ...optional];
        return ordered.map(param => {
          const type = param.type === 'number' ? 'float' : param.type === 'boolean' ? 'bool' : param.type === 'object' ? 'dict' : 'str';
          return `${param.name}: ${type}${param.required ? '' : ' = None'}`;
        }).join(', ');
      }

      function buildHttpAnnotations(method) {
        const m = (method || '').toLowerCase();
        const readOnly = ['get', 'head', 'options'].includes(m);
        const idempotent = ['get', 'head', 'options', 'put', 'delete'].includes(m);
        const destructive = ['post', 'put', 'patch', 'delete'].includes(m);
        return {
          readOnlyHint: readOnly,
          destructiveHint: readOnly ? false : destructive,
          idempotentHint: idempotent,
          openWorldHint: true
        };
      }

      let generatorTools = [];
      let generatedCode = '';

      // Add a new tool to the generator
      function addGeneratorTool() {
        const toolId = `tool_${Date.now()}`;
        generatorTools.push({
          id: toolId,
          name: '',
          description: '',
          params: []
        });
        renderGeneratorTools();
      }

      // Render the tools list
      function renderGeneratorTools() {
        const listEl = document.getElementById('generatorToolsList');
        
        if (generatorTools.length === 0) {
          listEl.innerHTML = `
            <div style="color: var(--text-muted); font-style: italic; padding: 12px; text-align: center;">
              No tools defined. Click "Add Tool" to start designing.
            </div>
          `;
          updateGeneratorAutoRunButtons();
          return;
        }

        listEl.innerHTML = generatorTools.map((tool, idx) => `
          <div style="background: var(--bg-card); padding: 10px; border-radius: 8px; border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="font-size: 0.8rem;">Tool ${idx + 1}</strong>
              <button class="btn" onclick="removeGeneratorTool('${tool.id}')" style="font-size: 0.6rem; padding: 2px 6px;">🗑️</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <input type="text" class="form-input" placeholder="Tool name (e.g., get_weather)" 
                value="${escapeHtml(tool.name)}" 
                onchange="updateGeneratorTool('${tool.id}', 'name', this.value)"
                style="font-size: 0.75rem; padding: 4px 8px;">
              <input type="text" class="form-input" placeholder="Description" 
                value="${escapeHtml(tool.description)}" 
                onchange="updateGeneratorTool('${tool.id}', 'description', this.value)"
                style="font-size: 0.75rem; padding: 4px 8px;">
              ${tool.endpoint ? `
                <div style="font-size: 0.65rem; color: var(--text-muted);">
                  🌐 ${tool.endpoint.source === 'webhook' ? 'Webhook' : 'Endpoint'}: ${escapeHtml(tool.endpoint.method?.toUpperCase() || 'GET')} ${escapeHtml(tool.endpoint.path || '')}
                </div>
              ` : ''}
              ${tool.auth ? `
                <div style="font-size: 0.65rem; color: var(--text-muted);">
                  🔐 Auth: ${escapeHtml(formatOpenApiAuthSummary(tool.auth))}
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.7rem; color: var(--text-muted);">Parameters: ${tool.params.length}</span>
                <button class="btn" onclick="addToolParam('${tool.id}')" style="font-size: 0.6rem; padding: 2px 6px;">➕ Param</button>
              </div>
              ${tool.params.map((param, pIdx) => `
                <div style="display: flex; gap: 4px; align-items: center; padding-left: 8px;">
                  <input type="text" class="form-input" placeholder="param_name" 
                    value="${escapeHtml(param.name)}"
                    onchange="updateToolParam('${tool.id}', ${pIdx}, 'name', this.value)"
                    style="flex: 1; font-size: 0.7rem; padding: 2px 6px;">
                  <select class="form-select" 
                    onchange="updateToolParam('${tool.id}', ${pIdx}, 'type', this.value)"
                    style="width: 80px; font-size: 0.7rem; padding: 2px 4px;">
                    <option value="string" ${param.type === 'string' ? 'selected' : ''}>string</option>
                    <option value="number" ${param.type === 'number' ? 'selected' : ''}>number</option>
                    <option value="boolean" ${param.type === 'boolean' ? 'selected' : ''}>boolean</option>
                    <option value="object" ${param.type === 'object' ? 'selected' : ''}>object</option>
                  </select>
                  <label style="font-size: 0.65rem; display: flex; align-items: center; gap: 2px;">
                    <input type="checkbox" ${param.required ? 'checked' : ''}
                      onchange="updateToolParam('${tool.id}', ${pIdx}, 'required', this.checked)">
                    Req
                  </label>
                  <button onclick="removeToolParam('${tool.id}', ${pIdx})" style="font-size: 0.6rem; padding: 1px 4px; background: none; border: none; cursor: pointer;">❌</button>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
        updateGeneratorAutoRunButtons();
      }

      // Update a tool property
      function updateGeneratorTool(toolId, prop, value) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool) tool[prop] = value;
      }

      // Remove a tool
      function removeGeneratorTool(toolId) {
        generatorTools = generatorTools.filter(t => t.id !== toolId);
        renderGeneratorTools();
      }

      // Add parameter to a tool
      function addToolParam(toolId) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool) {
          tool.params.push({ name: '', type: 'string', required: false });
          renderGeneratorTools();
        }
      }

      // Update a parameter
      function updateToolParam(toolId, paramIdx, prop, value) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool && tool.params[paramIdx]) {
          tool.params[paramIdx][prop] = value;
        }
      }

      // Remove a parameter
      function removeToolParam(toolId, paramIdx) {
        const tool = generatorTools.find(t => t.id === toolId);
        if (tool) {
          tool.params.splice(paramIdx, 1);
          renderGeneratorTools();
        }
      }

      // Generate MCP server code
      function generateMCPCode() {
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const serverDesc = document.getElementById('genServerDesc').value || 'A custom MCP server';
        const language = document.getElementById('genLanguage').value;
        const mode = document.getElementById('genMode')?.value || 'scaffold';

        if (generatorTools.length === 0) {
          appendMessage('error', 'Add at least one tool to generate code');
          return;
        }

        if (mode === 'openapi') {
          const openApiTools = generatorTools.filter(tool => tool.endpoint);
          if (!openApiTools.length) {
            appendMessage('error', 'OpenAPI Proxy mode needs imported endpoints.');
            return;
          }
          if (language === 'python') {
            generatedCode = generateOpenApiPythonMCP(serverName, serverDesc, openApiTools);
          } else {
            generatedCode = generateOpenApiNodeMCP(serverName, serverDesc, openApiTools);
          }
        } else if (language === 'python') {
          generatedCode = generatePythonMCP(serverName, serverDesc);
        } else {
          generatedCode = generateNodeMCP(serverName, serverDesc);
        }

        document.getElementById('generatorPreviewSection').style.display = 'block';
        document.getElementById('generatorCodePreview').textContent = generatedCode;
        appendMessage('system', `🚀 Generated ${language} MCP server code (${mode}) with ${generatorTools.length} tools`);
      }

      // Preview without saving
      function previewMCPCode() {
        generateMCPCode();
      }

      // Generate Python MCP server code
      function generatePythonMCP(serverName, serverDesc) {
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim();
        const toolDefs = generatorTools.map(tool => {
          const params = buildPythonArgsSignature(tool.params || []);
          const authNote = tool.auth ? `\n    Auth: ${formatOpenApiAuthSummary(tool.auth)}` : '';
          const endpointNote = tool.endpoint ? `\n    Endpoint: ${tool.endpoint.method?.toUpperCase() || 'GET'} ${tool.endpoint.path || ''}` : '';
          
          return `
@mcp.tool()
async def ${tool.name || 'unnamed_tool'}(${params}):
    """${tool.description || 'No description'}${endpointNote}${authNote}"""
    # TODO: Implement your logic here
    return {"result": "success", "message": "Tool executed"}
`;
        }).join('\n');

        return `#!/usr/bin/env python3
"""
${serverDesc}
Generated by MCP Chat Studio
"""

from mcp.server import Server
from mcp.server.stdio import stdio_server

# Create server instance
mcp = Server("${serverName}")
${baseUrl ? `\n# API base URL (from OpenAPI)\nAPI_BASE_URL = "${baseUrl}"\n` : ''}

${toolDefs}

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await mcp.run(read_stream, write_stream)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
`;
      }

      // Generate Node.js MCP server code
      function generateNodeMCP(serverName, serverDesc) {
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim();
        const toolDefs = generatorTools.map(tool => {
          const inputSchema = buildInputSchemaForTool(tool);
          const annotations = tool.endpoint?.method ? buildHttpAnnotations(tool.endpoint.method) : null;
          const metaObj = {};
          if (tool.auth) metaObj.auth = tool.auth;
          if (tool.endpoint) {
            metaObj.endpoint = {
              method: tool.endpoint.method,
              path: tool.endpoint.path,
              tags: tool.endpoint.tags || [],
              source: tool.endpoint.source || 'path'
            };
          }
          const configObj = {
            description: tool.description || 'No description',
            inputSchema
          };
          if (tool.outputSchema) configObj.outputSchema = tool.outputSchema;
          if (annotations) configObj.annotations = annotations;
          if (Object.keys(metaObj).length) configObj._meta = metaObj;
          const configStr = JSON.stringify(configObj, null, 4).replace(/\n/g, '\n    ');
          
          return `
  server.registerTool(
    "${tool.name || 'unnamed_tool'}",
    ${configStr},
    async (params) => {
      // TODO: Implement your logic here
      return { result: "success", message: "Tool executed" };
    }
  );
`;
        }).join('\n');

        return `#!/usr/bin/env node
/**
 * ${serverDesc}
 * Generated by MCP Chat Studio
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

${baseUrl ? `const API_BASE_URL = "${baseUrl}";\n` : ''}
const server = new Server(
  { name: "${serverName}", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

${toolDefs}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("${serverName} MCP server running on stdio");
}

main().catch(console.error);
`;
      }

      function generateOpenApiPythonMCP(serverName, serverDesc, tools) {
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';
        const toolDefs = tools.map(tool => ({
          name: tool.name,
          description: tool.description || '',
          method: tool.endpoint?.method || 'get',
          path: tool.endpoint?.path || '',
          params: tool.params || [],
          auth: tool.auth || null
        }));
        const toolMap = toolDefs.reduce((acc, tool) => {
          acc[tool.name] = tool;
          return acc;
        }, {});
        const toolsJson = JSON.stringify(toolMap, null, 2);
        const toolFns = toolDefs.map(tool => {
          const params = tool.params || [];
          const argsSignature = buildPythonArgsSignature(params);
          const authNote = tool.auth ? `\n    Auth: ${formatOpenApiAuthSummary(tool.auth)}` : '';
          const endpointNote = tool.path ? `\n    Endpoint: ${tool.method?.toUpperCase() || 'GET'} ${tool.path}` : '';
          return `
@mcp.tool()
async def ${tool.name}(${argsSignature}):
    """${tool.description || 'No description'}${endpointNote}${authNote}"""
    args = {${params.map(param => `'${param.name}': ${param.name}`).join(', ')}}
    return await call_tool("${tool.name}", args)
`;
        }).join('\n');

        return `#!/usr/bin/env python3
"""
${serverDesc}
Generated by MCP Chat Studio (OpenAPI Proxy)
"""

import os
import json
import urllib.parse
import urllib.request
from mcp.server import Server
from mcp.server.stdio import stdio_server

API_BASE_URL = os.getenv("API_BASE_URL", "${baseUrl}")
API_KEY = os.getenv("MCP_API_KEY", "")
API_KEY_NAME = os.getenv("MCP_API_KEY_NAME", "")
API_KEY_IN = os.getenv("MCP_API_KEY_IN", "header")
BEARER_TOKEN = os.getenv("MCP_BEARER_TOKEN", "")
BASIC_USER = os.getenv("MCP_BASIC_USER", "")
BASIC_PASS = os.getenv("MCP_BASIC_PASS", "")
OAUTH_TOKEN_URL = os.getenv("MCP_OAUTH_TOKEN_URL", "")
OAUTH_CLIENT_ID = os.getenv("MCP_OAUTH_CLIENT_ID", "")
OAUTH_CLIENT_SECRET = os.getenv("MCP_OAUTH_CLIENT_SECRET", "")
OAUTH_SCOPE = os.getenv("MCP_OAUTH_SCOPE", "")
OAUTH_AUDIENCE = os.getenv("MCP_OAUTH_AUDIENCE", "")

TOOLS = ${toolsJson}
_token_cache = {"value": "", "expires_at": 0}

mcp = Server("${serverName}")

def _get_oauth_token():
  import time
  if _token_cache["value"] and _token_cache["expires_at"] > time.time() + 30:
    return _token_cache["value"]
  if not OAUTH_TOKEN_URL or not OAUTH_CLIENT_ID:
    return ""
  data = {
    "grant_type": "client_credentials",
    "client_id": OAUTH_CLIENT_ID,
  }
  if OAUTH_CLIENT_SECRET:
    data["client_secret"] = OAUTH_CLIENT_SECRET
  if OAUTH_SCOPE:
    data["scope"] = OAUTH_SCOPE
  if OAUTH_AUDIENCE:
    data["audience"] = OAUTH_AUDIENCE
  req = urllib.request.Request(
    OAUTH_TOKEN_URL,
    data=urllib.parse.urlencode(data).encode("utf-8"),
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    method="POST"
  )
  with urllib.request.urlopen(req) as resp:
    payload = json.loads(resp.read().decode("utf-8"))
  _token_cache["value"] = payload.get("access_token", "")
  _token_cache["expires_at"] = time.time() + int(payload.get("expires_in", 3600))
  return _token_cache["value"]

def _apply_auth(headers, query, auth):
  if not auth or not auth.get("schemes"):
    return
  scheme = auth["schemes"][0]
  if scheme.get("type") == "apiKey":
    key_name = API_KEY_NAME or scheme.get("name")
    if scheme.get("in") == "query" or API_KEY_IN == "query":
      query[key_name] = API_KEY
    else:
      headers[key_name] = API_KEY
  elif scheme.get("type") == "http":
    if scheme.get("scheme") == "basic":
      import base64
      token = base64.b64encode(f"{BASIC_USER}:{BASIC_PASS}".encode("utf-8")).decode("utf-8")
      headers["Authorization"] = f"Basic {token}"
    else:
      token = BEARER_TOKEN or _get_oauth_token()
      if token:
        headers["Authorization"] = f"Bearer {token}"
  elif scheme.get("type") in ("oauth2", "openIdConnect"):
    token = _get_oauth_token()
    if token:
      headers["Authorization"] = f"Bearer {token}"

def _build_url(tool, args):
  path = tool["path"]
  query = {}
  for param in tool.get("params", []):
    value = args.get(param["name"]) if args else None
    if value is None:
      continue
    location = param.get("location", "query")
    if location == "path":
      path = path.replace("{" + param["name"] + "}", urllib.parse.quote(str(value)))
    elif location == "query":
      query[param["name"]] = str(value)
  url = f"{API_BASE_URL}{path}"
  if query:
    url += "?" + urllib.parse.urlencode(query)
  return url

async def call_tool(tool_name, args):
  tool_def = TOOLS.get(tool_name)
  if not tool_def:
    raise ValueError(f"Unknown tool: {tool_name}")
  if not API_BASE_URL:
    raise ValueError("API_BASE_URL is not set")
  headers = {"Content-Type": "application/json"}
  query = {}
  for param in tool_def.get("params", []):
    value = args.get(param["name"]) if args else None
    if value is None:
      continue
    location = param.get("location")
    if location == "header":
      headers[param["name"]] = str(value)
    elif location == "cookie":
      existing = headers.get("Cookie", "")
      cookie = f"{param['name']}={urllib.parse.quote(str(value))}"
      headers["Cookie"] = f"{existing}; {cookie}" if existing else cookie
  _apply_auth(headers, query, tool_def.get("auth"))
  url = _build_url(tool_def, args)
  if query:
    url += ("&" if "?" in url else "?") + urllib.parse.urlencode(query)
  body = args.get("body") if args else None
  data = json.dumps(body).encode("utf-8") if body is not None else None
  req = urllib.request.Request(url, data=data, headers=headers, method=tool_def["method"].upper())
  with urllib.request.urlopen(req) as resp:
    raw = resp.read().decode("utf-8")
  try:
    parsed = json.loads(raw)
  except Exception:
    parsed = {"raw": raw}
  return {"result": parsed}

${toolFns}

async def main():
  async with stdio_server() as (read_stream, write_stream):
    await mcp.run(read_stream, write_stream)

if __name__ == "__main__":
  import asyncio
  asyncio.run(main())
`;
      }

      function generateOpenApiNodeMCP(serverName, serverDesc, tools) {
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';
        const toolDefs = tools.map(tool => ({
          name: tool.name,
          description: tool.description || '',
          method: tool.endpoint?.method || 'get',
          path: tool.endpoint?.path || '',
          params: tool.params || [],
          auth: tool.auth || null,
          inputSchema: tool.inputSchema || null,
          outputSchema: tool.outputSchema || null
        }));
        const toolsJson = JSON.stringify(toolDefs, null, 2);

        return `#!/usr/bin/env node
/**
 * ${serverDesc}
 * Generated by MCP Chat Studio (OpenAPI Proxy)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const API_BASE_URL = process.env.API_BASE_URL || "${baseUrl}";
const OAUTH_TOKEN_URL = process.env.MCP_OAUTH_TOKEN_URL || "";
const OAUTH_CLIENT_ID = process.env.MCP_OAUTH_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.MCP_OAUTH_CLIENT_SECRET || "";
const OAUTH_SCOPE = process.env.MCP_OAUTH_SCOPE || "";
const OAUTH_AUDIENCE = process.env.MCP_OAUTH_AUDIENCE || "";
const API_KEY = process.env.MCP_API_KEY || "";
const API_KEY_NAME = process.env.MCP_API_KEY_NAME || "";
const API_KEY_IN = process.env.MCP_API_KEY_IN || "header";
const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || "";
const BASIC_USER = process.env.MCP_BASIC_USER || "";
const BASIC_PASS = process.env.MCP_BASIC_PASS || "";

const TOOLS = ${toolsJson};
let cachedToken = { value: "", expiresAt: 0 };

const server = new Server(
  { name: "${serverName}", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

function buildUrl(tool, args) {
  let path = tool.path;
  const query = new URLSearchParams();
  (tool.params || []).forEach(param => {
    const value = args?.[param.name];
    if (value === undefined || value === null) return;
    const location = param.location || 'query';
    if (location === 'path') {
      path = path.replace(\`{\${param.name}}\`, encodeURIComponent(String(value)));
    } else if (location === 'query') {
      query.append(param.name, String(value));
    }
  });
  const qs = query.toString();
  return \`\${API_BASE_URL}\${path}\${qs ? \`?\${qs}\` : ""}\`;
}

async function getOAuthToken() {
  if (cachedToken.value && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken.value;
  }
  if (!OAUTH_TOKEN_URL || !OAUTH_CLIENT_ID) return "";
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", OAUTH_CLIENT_ID);
  if (OAUTH_CLIENT_SECRET) body.set("client_secret", OAUTH_CLIENT_SECRET);
  if (OAUTH_SCOPE) body.set("scope", OAUTH_SCOPE);
  if (OAUTH_AUDIENCE) body.set("audience", OAUTH_AUDIENCE);

  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!resp.ok) throw new Error(\`OAuth token request failed: \${resp.status}\`);
  const data = await resp.json();
  cachedToken.value = data.access_token || "";
  cachedToken.expiresAt = Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600 * 1000);
  return cachedToken.value;
}

async function applyAuth(headers, query, auth) {
  if (!auth || !auth.schemes?.length) return;
  const scheme = auth.schemes[0];
  if (scheme.type === 'apiKey') {
    const key = API_KEY_NAME || scheme.name;
    if (API_KEY_IN === 'query' || scheme.in === 'query') {
      query.set(key, API_KEY);
    } else {
      headers.set(key, API_KEY);
    }
  } else if (scheme.type === 'http') {
    if (scheme.scheme === 'basic') {
      const token = Buffer.from(\`\${BASIC_USER}:\${BASIC_PASS}\`).toString('base64');
      headers.set('Authorization', \`Basic \${token}\`);
    } else {
      const token = BEARER_TOKEN || (await getOAuthToken());
      if (token) headers.set('Authorization', \`Bearer \${token}\`);
    }
  } else if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect') {
    const token = await getOAuthToken();
    if (token) headers.set('Authorization', \`Bearer \${token}\`);
  }
}

TOOLS.forEach(tool => {
  const paramsSchema = {};
  const required = [];
  (tool.params || []).forEach(param => {
    paramsSchema[param.name] = { type: param.type || 'string', description: \`\${param.name} parameter\` };
    if (param.required) required.push(param.name);
  });
  const fallbackSchema = { type: 'object', properties: paramsSchema };
  if (required.length) fallbackSchema.required = required;
  const inputSchema = tool.inputSchema || fallbackSchema;

  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema,
      annotations: {
        readOnlyHint: ['get', 'head', 'options'].includes(tool.method),
        destructiveHint: ['post', 'put', 'patch', 'delete'].includes(tool.method),
        idempotentHint: ['get', 'head', 'options', 'put', 'delete'].includes(tool.method),
        openWorldHint: true
      },
      ...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
      _meta: { endpoint: { method: tool.method, path: tool.path }, auth: tool.auth || null }
    },
    async (args) => {
      if (!API_BASE_URL) throw new Error("API_BASE_URL is not set");
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      const query = new URLSearchParams();
      (tool.params || []).forEach(param => {
        const value = args?.[param.name];
        if (value === undefined || value === null) return;
        if (param.location === 'header') {
          headers.set(param.name, String(value));
        } else if (param.location === 'cookie') {
          const current = headers.get('Cookie') || '';
          const cookie = \`\${param.name}=\${encodeURIComponent(String(value))}\`;
          headers.set('Cookie', current ? \`\${current}; \${cookie}\` : cookie);
        }
      });
      await applyAuth(headers, query, tool.auth);
      let url = buildUrl(tool, args);
      const queryString = query.toString();
      if (queryString) {
        url += url.includes('?') ? \`&\${queryString}\` : \`?\${queryString}\`;
      }
      const body = args?.body ? JSON.stringify(args.body) : undefined;
      const resp = await fetch(url, {
        method: tool.method.toUpperCase(),
        headers,
        body: body && !['get', 'head'].includes(tool.method) ? body : undefined
      });
      const text = await resp.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
      if (!resp.ok) {
        throw new Error(\`\${resp.status} \${resp.statusText}: \${text}\`);
      }
      return { result: parsed };
    }
  );
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("${serverName} MCP OpenAPI proxy running on stdio");
}

main().catch(console.error);
`;
      }

      // Copy generated code
      function copyGeneratedCode() {
        if (generatedCode) {
          navigator.clipboard.writeText(generatedCode);
          appendMessage('system', '📋 Code copied to clipboard');
        }
      }

      // Download generated code
      function downloadGeneratedCode() {
        if (!generatedCode) return;
        
        const language = document.getElementById('genLanguage').value;
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const ext = language === 'python' ? 'py' : 'ts';
        const filename = `${serverName}.${ext}`;
        
        const blob = new Blob([generatedCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        appendMessage('system', `📥 Downloaded ${filename}`);
      }

      function downloadGeneratorProject() {
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const serverDesc = document.getElementById('genServerDesc').value || 'A custom MCP server';
        const language = document.getElementById('genLanguage').value;
        const mode = document.getElementById('genMode')?.value || 'scaffold';

        if (generatorTools.length === 0) {
          appendMessage('error', 'Add at least one tool to generate a project');
          return;
        }

        let code = '';
        if (mode === 'openapi') {
          const openApiTools = generatorTools.filter(tool => tool.endpoint);
          if (!openApiTools.length) {
            appendMessage('error', 'OpenAPI Proxy mode needs imported endpoints.');
            return;
          }
          code = language === 'python'
            ? generateOpenApiPythonMCP(serverName, serverDesc, openApiTools)
            : generateOpenApiNodeMCP(serverName, serverDesc, openApiTools);
        } else {
          code = language === 'python'
            ? generatePythonMCP(serverName, serverDesc)
            : generateNodeMCP(serverName, serverDesc);
        }

        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';
        const files = buildGeneratorProjectFiles({
          serverName,
          serverDesc,
          language,
          mode,
          code,
          baseUrl
        });

        const bundle = {
          format: 'mcp-generator-project',
          createdAt: new Date().toISOString(),
          serverName,
          language,
          mode,
          files
        };

        const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${serverName}-${mode}-${language}-project.json`;
        a.click();
        URL.revokeObjectURL(url);
        appendMessage('system', '📦 Project bundle downloaded. Use the README inside to run it.');
      }

      function downloadGeneratorZip() {
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const serverDesc = document.getElementById('genServerDesc').value || 'A custom MCP server';
        const language = document.getElementById('genLanguage').value;
        const mode = document.getElementById('genMode')?.value || 'scaffold';

        if (generatorTools.length === 0) {
          appendMessage('error', 'Add at least one tool to generate a project');
          return;
        }

        let code = '';
        if (mode === 'openapi') {
          const openApiTools = generatorTools.filter(tool => tool.endpoint);
          if (!openApiTools.length) {
            appendMessage('error', 'OpenAPI Proxy mode needs imported endpoints.');
            return;
          }
          code = language === 'python'
            ? generateOpenApiPythonMCP(serverName, serverDesc, openApiTools)
            : generateOpenApiNodeMCP(serverName, serverDesc, openApiTools);
        } else {
          code = language === 'python'
            ? generatePythonMCP(serverName, serverDesc)
            : generateNodeMCP(serverName, serverDesc);
        }

        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';
        const files = buildGeneratorProjectFiles({
          serverName,
          serverDesc,
          language,
          mode,
          code,
          baseUrl
        });

        const zipBlob = buildZipFromFiles(files, serverName);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${serverName}-${mode}-${language}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        appendMessage('system', '📦 ZIP downloaded. Unzip and run the project locally.');
      }

      function showGeneratorRunModal() {
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const language = document.getElementById('genLanguage').value;
        const mode = document.getElementById('genMode')?.value || 'scaffold';
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';

        generatorRunState = { serverName, language, mode, baseUrl };
        generatorRunOs = 'unix';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'generatorRunModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 640px;">
            <div class="modal-header">
              <h2 class="modal-title">🚀 Run ${escapeHtml(serverName)} Locally</h2>
              <button class="modal-close" onclick="closeGeneratorRunModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); display: flex; flex-direction: column; gap: 12px;">
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                Mode: ${escapeHtml(mode)} • Language: ${escapeHtml(language)}
              </div>
              <div class="generator-os-tabs">
                <button class="generator-os-tab active" id="generatorRunOsUnix" onclick="switchGeneratorRunOs('unix')">macOS / Linux</button>
                <button class="generator-os-tab" id="generatorRunOsWindows" onclick="switchGeneratorRunOs('windows')">Windows</button>
              </div>
              <div>
                <div style="font-size: 0.75rem; margin-bottom: 6px;">Commands</div>
                <pre id="generatorRunCommands" style="background: var(--bg-card); padding: 10px; border-radius: 8px; font-size: 0.7rem; white-space: pre-wrap;"></pre>
              </div>
              <div>
                <div style="font-size: 0.75rem; margin-bottom: 6px;">Environment (.env)</div>
                <pre id="generatorRunEnv" style="background: var(--bg-card); padding: 10px; border-radius: 8px; font-size: 0.7rem; white-space: pre-wrap;"></pre>
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">
                Tip: In OpenAPI Proxy mode, set API_BASE_URL and auth vars before running.
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="closeGeneratorRunModal()">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        updateGeneratorRunModalContent();
      }

      function closeGeneratorRunModal() {
        const modal = document.getElementById('generatorRunModal');
        if (modal) modal.remove();
      }

      function switchGeneratorRunOs(os) {
        generatorRunOs = os;
        updateGeneratorRunModalContent();
      }

      function updateGeneratorRunModalContent() {
        if (!generatorRunState) return;
        const { language, baseUrl } = generatorRunState;
        const commandsEl = document.getElementById('generatorRunCommands');
        const envEl = document.getElementById('generatorRunEnv');
        const unixBtn = document.getElementById('generatorRunOsUnix');
        const winBtn = document.getElementById('generatorRunOsWindows');
        if (!commandsEl || !envEl) return;

        if (unixBtn && winBtn) {
          unixBtn.classList.toggle('active', generatorRunOs === 'unix');
          winBtn.classList.toggle('active', generatorRunOs === 'windows');
        }

        const commands = getGeneratorRunCommands(generatorRunOs, language);
        const envLines = getGeneratorEnvLines(baseUrl);
        commandsEl.textContent = commands;
        envEl.textContent = envLines;
      }

      function getGeneratorRunCommands(os, language) {
        if (language === 'python') {
          if (os === 'windows') {
            return [
              'python -m venv .venv',
              '.venv\\\\Scripts\\\\activate',
              'pip install -r requirements.txt',
              'python server.py'
            ].join('\\n');
          }
          return [
            'python3 -m venv .venv',
            'source .venv/bin/activate',
            'pip install -r requirements.txt',
            'python server.py'
          ].join('\\n');
        }
        return [
          'npm install',
          'node server.js'
        ].join('\\n');
      }

      function getGeneratorEnvLines(baseUrl) {
        return [
          baseUrl ? `API_BASE_URL=${baseUrl}` : 'API_BASE_URL=',
          'MCP_API_KEY=',
          'MCP_API_KEY_NAME=',
          'MCP_API_KEY_IN=header',
          'MCP_BEARER_TOKEN=',
          'MCP_BASIC_USER=',
          'MCP_BASIC_PASS=',
          'MCP_OAUTH_TOKEN_URL=',
          'MCP_OAUTH_CLIENT_ID=',
          'MCP_OAUTH_CLIENT_SECRET=',
          'MCP_OAUTH_SCOPE=',
          'MCP_OAUTH_AUDIENCE='
        ].join('\\n');
      }

      async function saveGeneratorToFolder() {
        if (typeof window.showDirectoryPicker !== 'function') {
          appendMessage('error', 'Folder save is not supported in this browser. Use Download ZIP instead.');
          return;
        }
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const serverDesc = document.getElementById('genServerDesc').value || 'A custom MCP server';
        const language = document.getElementById('genLanguage').value;
        const mode = document.getElementById('genMode')?.value || 'scaffold';
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';

        if (generatorTools.length === 0) {
          appendMessage('error', 'Add at least one tool to generate a project');
          return;
        }

        let code = '';
        if (mode === 'openapi') {
          const openApiTools = generatorTools.filter(tool => tool.endpoint);
          if (!openApiTools.length) {
            appendMessage('error', 'OpenAPI Proxy mode needs imported endpoints.');
            return;
          }
          code = language === 'python'
            ? generateOpenApiPythonMCP(serverName, serverDesc, openApiTools)
            : generateOpenApiNodeMCP(serverName, serverDesc, openApiTools);
        } else {
          code = language === 'python'
            ? generatePythonMCP(serverName, serverDesc)
            : generateNodeMCP(serverName, serverDesc);
        }

        const files = buildGeneratorProjectFiles({
          serverName,
          serverDesc,
          language,
          mode,
          code,
          baseUrl
        });

        try {
          const rootHandle = await window.showDirectoryPicker();
          const folderName = serverName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
          const projectHandle = await rootHandle.getDirectoryHandle(folderName || 'mcp-server', { create: true });
          for (const [name, content] of Object.entries(files)) {
            const fileHandle = await projectHandle.getFileHandle(name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
          }
          generatorLastFolderName = folderName || 'mcp-server';
          generatorPickedFolderName = generatorLastFolderName;
          localStorage.setItem('mcp_generator_last_folder', generatorLastFolderName);
          updateGeneratorProjectStatus();
          appendMessage('system', `✅ Saved project to folder "${folderName}"`);
        } catch (error) {
          appendMessage('error', `Failed to save folder: ${error.message}`);
        }
      }

      function showGeneratorTestModal() {
        const serverName = document.getElementById('genServerName').value || 'my-mcp-server';
        const language = document.getElementById('genLanguage').value;
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';
        const cmd = language === 'python' ? 'python' : 'node';
        const args = language === 'python' ? ['server.py'] : ['server.js'];
        generatorTestCwd = '';
        generatorTestOs = 'unix';
        const baseConfig = { serverName, cmd, args, baseUrl };

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'generatorTestModal';
        modal.style.display = 'flex';
        modal.innerHTML = `
          <div class="modal" style="max-width: 720px;">
            <div class="modal-header">
              <h2 class="modal-title">🧪 Test in Studio</h2>
              <button class="modal-close" onclick="closeGeneratorTestModal()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style="padding: var(--spacing-md); display: flex; flex-direction: column; gap: 12px;">
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                Follow these steps to run the server and connect it to Studio.
              </div>
              <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 10px;">
                <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 6px;">Project files</div>
                <div id="generatorProjectStatus" style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 8px;">
                  ${generatorLastFolderName ? `Last saved folder: <strong>${escapeHtml(generatorLastFolderName)}</strong>` : 'Not saved yet. Use Download ZIP or Save to Folder first.'}
                </div>
                <div class="generator-actions">
                  <button class="btn" onclick="downloadGeneratorZip()">Download ZIP</button>
                  <button class="btn" onclick="saveGeneratorToFolder()">Save to Folder</button>
                </div>
                <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 6px;">
                  Studio can’t see your filesystem path automatically. You’ll paste the folder path below.
                </div>
                <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                  Auto Run & Connect writes a temporary project folder in the Studio backend.
                </div>
              </div>
              <div class="generator-steps">
                <div class="generator-step">
                  <span class="generator-step-num">1</span>
                  <span>Save or download the project (ZIP or folder).</span>
                </div>
                <div class="generator-step">
                  <span class="generator-step-num">2</span>
                  <span>Run it locally using the commands below.</span>
                </div>
                <div class="generator-step">
                  <span class="generator-step-num">3</span>
                  <span>Set the project folder so Studio can find the server file.</span>
                </div>
                <div class="generator-step">
                  <span class="generator-step-num">4</span>
                  <span>Open Add Server and connect.</span>
                </div>
              </div>
              <div>
                <div class="generator-os-tabs">
                  <button class="generator-os-tab active" id="generatorTestOsUnix" onclick="switchGeneratorTestOs('unix')">macOS / Linux</button>
                  <button class="generator-os-tab" id="generatorTestOsWindows" onclick="switchGeneratorTestOs('windows')">Windows</button>
                </div>
                <div style="margin-top: 8px;">
                  <div style="font-size: 0.75rem; margin-bottom: 6px;">Commands</div>
                  <pre id="generatorTestCommands" style="background: var(--bg-card); padding: 10px; border-radius: 8px; font-size: 0.7rem; white-space: pre-wrap;"></pre>
                </div>
                <div style="margin-top: 8px;">
                  <div style="font-size: 0.75rem; margin-bottom: 6px;">Environment (.env)</div>
                  <pre id="generatorTestEnv" style="background: var(--bg-card); padding: 10px; border-radius: 8px; font-size: 0.7rem; white-space: pre-wrap;"></pre>
                </div>
              </div>
              <div>
                <div style="font-size: 0.75rem; margin-bottom: 6px;">Project Folder (contains server.py / server.js)</div>
                <div class="generator-row">
                  <input
                    type="text"
                    id="generatorTestCwdInput"
                    class="form-input"
                    placeholder="C:\\path\\to\\project or /path/to/project"
                    oninput="updateGeneratorTestCwd(this.value)"
                  />
                  <button class="btn" onclick="pickGeneratorProjectFolder()">Browse…</button>
                </div>
                <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;">
                  If you downloaded ZIP, unzip it and paste that folder path. If you saved to a folder, paste the folder you picked + /${escapeHtml(document.getElementById('genServerName').value || 'my-mcp-server')}.
                </div>
                <div id="generatorPickedFolderHint" style="font-size: 0.65rem; color: var(--text-muted); margin-top: 4px;"></div>
                <div id="generatorTestCwdWarning" class="generator-warning" style="display: none; margin-top: 6px;">
                  Add the project folder to enable connecting from Studio.
                </div>
              </div>
              <details class="generator-collapse">
                <summary>YAML (config.yaml)</summary>
                <pre id="generatorTestYaml" style="background: var(--bg-card); padding: 10px; border-radius: 8px; font-size: 0.7rem; white-space: pre-wrap;"></pre>
              </details>
              <details class="generator-collapse">
                <summary>JSON (Import YAML/JSON)</summary>
                <pre id="generatorTestJson" style="background: var(--bg-card); padding: 10px; border-radius: 8px; font-size: 0.7rem; white-space: pre-wrap;"></pre>
              </details>
            </div>
            <div class="modal-actions">
              <button class="btn" onclick="copyGeneratorTestBlock('generatorTestCommands', 'Commands')">Copy Commands</button>
              <button class="btn" onclick="copyGeneratorTestBlock('generatorTestEnv', 'Env')">Copy Env</button>
              <button class="btn" onclick="copyGeneratorTestConfig('yaml')">Copy YAML</button>
              <button class="btn" onclick="copyGeneratorTestConfig('json')">Copy JSON</button>
              <button class="btn" id="generatorTestOpenBtn" onclick="openAddServerFromGenerator()">Add to Studio</button>
              <button class="btn" id="generatorTestConnectBtn" onclick="addGeneratorServerToStudio({ connectAfter: true })">Add & Connect</button>
              <button class="btn success" data-gen-auto-run="1" onclick="runGeneratorAndConnect()">Run & Connect (Auto)</button>
              <button class="btn" onclick="closeGeneratorTestModal()">Close</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        updateGeneratorTestModalConfig(baseConfig);
        updateGeneratorProjectStatus();
        updateGeneratorAutoRunButtons();
      }

      function closeGeneratorTestModal() {
        const modal = document.getElementById('generatorTestModal');
        if (modal) modal.remove();
      }

      function updateGeneratorProjectStatus() {
        const statusEl = document.getElementById('generatorProjectStatus');
        if (!statusEl) return;
        if (generatorLastFolderName) {
          statusEl.innerHTML = `Last saved folder: <strong>${escapeHtml(generatorLastFolderName)}</strong>`;
        } else {
          statusEl.textContent = 'Not saved yet. Use Download ZIP or Save to Folder first.';
        }
      }

      async function pickGeneratorProjectFolder() {
        if (typeof window.showDirectoryPicker !== 'function') {
          appAlert('Your browser does not support folder picking. Paste the full path manually.', {
            title: 'Folder Picker Unavailable'
          });
          return;
        }
        try {
          const handle = await window.showDirectoryPicker();
          generatorPickedFolderName = handle?.name || '';
          updateGeneratorTestModalConfig();
          if (generatorPickedFolderName) {
            appAlert(`Selected folder: ${generatorPickedFolderName}\nPaste the full path above (browser hides it).`, {
              title: 'Folder Selected'
            });
          }
        } catch (error) {
          if (error?.name !== 'AbortError') {
            appendMessage('error', `Failed to pick folder: ${error.message}`);
          }
        }
      }

      function updateGeneratorTestCwd(value) {
        generatorTestCwd = value.trim();
        updateGeneratorTestModalConfig();
      }

      function switchGeneratorTestOs(os) {
        generatorTestOs = os;
        updateGeneratorTestModalConfig();
      }

      function updateGeneratorTestModalConfig(initial) {
        const serverName = initial?.serverName || document.getElementById('genServerName').value || 'my-mcp-server';
        const language = document.getElementById('genLanguage').value;
        const baseUrl = initial?.baseUrl || document.getElementById('genServerBaseUrl')?.value?.trim() || '';
        const cmd = initial?.cmd || (language === 'python' ? 'python' : 'node');
        const args = initial?.args || (language === 'python' ? ['server.py'] : ['server.js']);

        const yamlLines = [
          'mcpServers:',
          `  ${serverName}:`,
          '    type: stdio',
          `    command: ${cmd}`,
          ...(generatorTestCwd ? [`    cwd: ${generatorTestCwd}`] : ['    cwd: /path/to/generated/project']),
          '    args:',
          ...args.map(arg => `      - ${arg}`)
        ];
        if (baseUrl) {
          yamlLines.push('    env:', `      API_BASE_URL: "${baseUrl}"`);
        }
        const yaml = yamlLines.join('\\n');

        const json = {
          mcpServers: {
            [serverName]: {
              type: 'stdio',
              command: cmd,
              args,
              ...(generatorTestCwd ? { cwd: generatorTestCwd } : {}),
              ...(baseUrl ? { env: { API_BASE_URL: baseUrl } } : {})
            }
          }
        };

        const yamlEl = document.getElementById('generatorTestYaml');
        const jsonEl = document.getElementById('generatorTestJson');
        if (yamlEl) yamlEl.textContent = yaml;
        if (jsonEl) jsonEl.textContent = JSON.stringify(json, null, 2);

        const commandsEl = document.getElementById('generatorTestCommands');
        const envEl = document.getElementById('generatorTestEnv');
        if (commandsEl) commandsEl.textContent = getGeneratorRunCommands(generatorTestOs, language);
        if (envEl) envEl.textContent = getGeneratorEnvLines(baseUrl);
        const unixBtn = document.getElementById('generatorTestOsUnix');
        const winBtn = document.getElementById('generatorTestOsWindows');
        if (unixBtn && winBtn) {
          unixBtn.classList.toggle('active', generatorTestOs === 'unix');
          winBtn.classList.toggle('active', generatorTestOs === 'windows');
        }

        const warning = document.getElementById('generatorTestCwdWarning');
        const hasCwd = !!generatorTestCwd;
        if (warning) warning.style.display = hasCwd ? 'none' : 'block';
        const cwdInput = document.getElementById('generatorTestCwdInput');
        if (cwdInput && cwdInput.value !== generatorTestCwd) {
          cwdInput.value = generatorTestCwd;
        }
        const pickedHint = document.getElementById('generatorPickedFolderHint');
        if (pickedHint) {
          pickedHint.textContent = generatorPickedFolderName
            ? `Selected folder: ${generatorPickedFolderName}. Paste the full path above.`
            : '';
        }
        const connectBtn = document.getElementById('generatorTestConnectBtn');
        if (connectBtn) connectBtn.disabled = !hasCwd;
      }

      function copyGeneratorTestConfig(format) {
        const yamlEl = document.getElementById('generatorTestYaml');
        const jsonEl = document.getElementById('generatorTestJson');
        const text = format === 'json' ? jsonEl?.textContent : yamlEl?.textContent;
        if (!text) return;
        navigator.clipboard.writeText(text)
          .then(() => appendMessage('system', `📋 ${format.toUpperCase()} copied to clipboard`))
          .catch(() => appendMessage('error', 'Copy failed'));
      }

      function copyGeneratorTestBlock(id, label) {
        const el = document.getElementById(id);
        const text = el?.textContent;
        if (!text) return;
        navigator.clipboard.writeText(text)
          .then(() => appendMessage('system', `📋 ${label} copied to clipboard`))
          .catch(() => appendMessage('error', 'Copy failed'));
      }

      async function ensureGeneratorCwd() {
        if (generatorTestCwd) return generatorTestCwd;
        const cwd = await appPrompt('Enter the project folder for this server:', {
          title: 'Project Folder Required',
          label: 'Working directory',
          placeholder: 'C:\\path\\to\\project or /path/to/project',
          required: true
        });
        if (!cwd) return null;
        generatorTestCwd = cwd.trim();
        updateGeneratorTestModalConfig();
        return generatorTestCwd;
      }

      function buildGeneratorServerPayload(overrideName) {
        const name = overrideName || document.getElementById('genServerName').value.trim() || 'my-mcp-server';
        const description = document.getElementById('genServerDesc').value.trim() || `Generated MCP server: ${name}`;
        const language = document.getElementById('genLanguage').value;
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';
        const command = language === 'python' ? 'python' : 'node';
        const args = language === 'python' ? ['server.py'] : ['server.js'];
        const payload = {
          name,
          type: 'stdio',
          description,
          command,
          args
        };
        if (generatorTestCwd) payload.cwd = generatorTestCwd;
        if (baseUrl) payload.env = { API_BASE_URL: baseUrl };
        return payload;
      }

      async function addGeneratorServerToStudio({ connectAfter = false, overrideName = null } = {}) {
        const cwd = await ensureGeneratorCwd();
        if (!cwd) return false;
        const payload = buildGeneratorServerPayload(overrideName);

        try {
          notifyUser(`Saving server "${payload.name}"...`, 'info');
          const statusRes = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await statusRes.json();
          const servers = status.servers || status;
          const serverExists = payload.name in servers;
          const endpoint = serverExists ? `/api/mcp/update/${encodeURIComponent(payload.name)}` : '/api/mcp/add';
          const method = serverExists ? 'PUT' : 'POST';

          const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (data.error) {
            notifyUser(`Failed to ${serverExists ? 'update' : 'add'} server: ${data.error}`, 'error');
            return false;
          }
          notifyUser(`✅ ${serverExists ? 'Updated' : 'Added'} server: ${payload.name}`, 'success');
          loadMCPStatus();
          if (connectAfter) {
            notifyUser(`Connecting to ${payload.name}...`, 'info');
            await connectMCP(payload.name);
          }
          return true;
        } catch (error) {
          notifyUser(`Failed to save server: ${error.message}`, 'error');
          return false;
        }
      }

      async function openAddServerFromGenerator() {
        const cwd = await ensureGeneratorCwd();
        if (!cwd) return;
        const payload = buildGeneratorServerPayload();
        showAddServerModal();
        document.getElementById('serverName').value = payload.name;
        document.getElementById('serverType').value = 'stdio';
        toggleServerTypeFields();
        document.getElementById('serverCommand').value = payload.command;
        document.getElementById('serverArgs').value = payload.args.join('\n');
        const cwdEl = document.getElementById('serverCwd');
        if (cwdEl && generatorTestCwd) cwdEl.value = generatorTestCwd;
        clearEnvVars();
        if (payload.env?.API_BASE_URL) addEnvVarRow('API_BASE_URL', payload.env.API_BASE_URL);
        updateConfigPreview();
      }

      function buildZipFromFiles(files, folderName) {
        const encoder = new TextEncoder();
        const entries = Object.entries(files);
        let offset = 0;
        const fileRecords = [];
        const chunks = [];

        entries.forEach(([name, content]) => {
          const fileName = folderName ? `${folderName}/${name}` : name;
          const fileNameBytes = encoder.encode(fileName);
          const fileData = encoder.encode(content || '');
          const crc = crc32(fileData);
          const localHeader = new Uint8Array(30 + fileNameBytes.length);
          const view = new DataView(localHeader.buffer);
          view.setUint32(0, 0x04034b50, true);
          view.setUint16(4, 20, true);
          view.setUint16(6, 0, true);
          view.setUint16(8, 0, true);
          view.setUint16(10, 0, true);
          view.setUint16(12, 0, true);
          view.setUint32(14, crc, true);
          view.setUint32(18, fileData.length, true);
          view.setUint32(22, fileData.length, true);
          view.setUint16(26, fileNameBytes.length, true);
          view.setUint16(28, 0, true);
          localHeader.set(fileNameBytes, 30);

          chunks.push(localHeader, fileData);
          fileRecords.push({
            fileNameBytes,
            crc,
            size: fileData.length,
            offset
          });
          offset += localHeader.length + fileData.length;
        });

        const centralChunks = [];
        let centralSize = 0;
        fileRecords.forEach(record => {
          const header = new Uint8Array(46 + record.fileNameBytes.length);
          const view = new DataView(header.buffer);
          view.setUint32(0, 0x02014b50, true);
          view.setUint16(4, 20, true);
          view.setUint16(6, 20, true);
          view.setUint16(8, 0, true);
          view.setUint16(10, 0, true);
          view.setUint16(12, 0, true);
          view.setUint16(14, 0, true);
          view.setUint32(16, record.crc, true);
          view.setUint32(20, record.size, true);
          view.setUint32(24, record.size, true);
          view.setUint16(28, record.fileNameBytes.length, true);
          view.setUint16(30, 0, true);
          view.setUint16(32, 0, true);
          view.setUint16(34, 0, true);
          view.setUint16(36, 0, true);
          view.setUint32(38, 0, true);
          view.setUint32(42, record.offset, true);
          header.set(record.fileNameBytes, 46);
          centralChunks.push(header);
          centralSize += header.length;
        });

        const endRecord = new Uint8Array(22);
        const endView = new DataView(endRecord.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(4, 0, true);
        endView.setUint16(6, 0, true);
        endView.setUint16(8, fileRecords.length, true);
        endView.setUint16(10, fileRecords.length, true);
        endView.setUint32(12, centralSize, true);
        endView.setUint32(16, offset, true);
        endView.setUint16(20, 0, true);

        return new Blob([...chunks, ...centralChunks, endRecord], { type: 'application/zip' });
      }

      function crc32(buffer) {
        let crc = 0xffffffff;
        for (let i = 0; i < buffer.length; i++) {
          crc ^= buffer[i];
          for (let j = 0; j < 8; j++) {
            const mask = -(crc & 1);
            crc = (crc >>> 1) ^ (0xedb88320 & mask);
          }
        }
        return (crc ^ 0xffffffff) >>> 0;
      }

      function buildGeneratorProjectFiles({ serverName, serverDesc, language, mode, code, baseUrl }) {
        const safeName = serverName.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
        const readme = [
          `# ${serverName}`,
          '',
          `${serverDesc}`,
          '',
          `Generated by MCP Chat Studio (${mode}).`,
          '',
          '## Quick start',
          language === 'python' ?
            '```bash\npython -m venv .venv\nsource .venv/bin/activate  # or .venv\\Scripts\\activate\npip install -r requirements.txt\npython server.py\n```' :
            '```bash\nnpm install\nnode server.js\n```',
          '',
          '## Environment',
          baseUrl ? `- API_BASE_URL=${baseUrl}` : '- API_BASE_URL=',
          '- MCP_API_KEY=',
          '- MCP_API_KEY_NAME=',
          '- MCP_API_KEY_IN=header|query',
          '- MCP_BEARER_TOKEN=',
          '- MCP_BASIC_USER=',
          '- MCP_BASIC_PASS=',
          '- MCP_OAUTH_TOKEN_URL=',
          '- MCP_OAUTH_CLIENT_ID=',
          '- MCP_OAUTH_CLIENT_SECRET=',
          '- MCP_OAUTH_SCOPE=',
          '- MCP_OAUTH_AUDIENCE=',
          ''
        ].join('\n');

        const envExample = [
          baseUrl ? `API_BASE_URL=${baseUrl}` : 'API_BASE_URL=',
          'MCP_API_KEY=',
          'MCP_API_KEY_NAME=',
          'MCP_API_KEY_IN=header',
          'MCP_BEARER_TOKEN=',
          'MCP_BASIC_USER=',
          'MCP_BASIC_PASS=',
          'MCP_OAUTH_TOKEN_URL=',
          'MCP_OAUTH_CLIENT_ID=',
          'MCP_OAUTH_CLIENT_SECRET=',
          'MCP_OAUTH_SCOPE=',
          'MCP_OAUTH_AUDIENCE=',
          ''
        ].join('\n');

        if (language === 'python') {
          return {
            'server.py': code,
            'requirements.txt': 'mcp>=1.0.0\n',
            '.env.example': envExample,
            'README.md': readme
          };
        }

        const pkg = {
          name: safeName || 'mcp-openapi-proxy',
          version: '0.1.0',
          type: 'module',
          private: true,
          description: serverDesc,
          scripts: {
            start: 'node server.js'
          },
          dependencies: {
            '@modelcontextprotocol/sdk': '^1.25.1'
          }
        };

        return {
          'server.js': code,
          'package.json': JSON.stringify(pkg, null, 2),
          '.env.example': envExample,
          'README.md': readme
        };
      }

      // Clear generator
      async function clearGenerator() {
        const confirmed = await appConfirm('Clear all tools and settings?', {
          title: 'Clear Generator',
          confirmText: 'Clear',
          confirmVariant: 'danger'
        });
        if (!confirmed) return;
        generatorTools = [];
        generatedCode = '';
        document.getElementById('genServerName').value = '';
        document.getElementById('genServerDesc').value = '';
        const baseUrlInput = document.getElementById('genServerBaseUrl');
        if (baseUrlInput) baseUrlInput.value = '';
        document.getElementById('generatorPreviewSection').style.display = 'none';
        renderGeneratorTools();
        appendMessage('system', '🗑️ Generator cleared');
      }

      function updateGeneratorAutoRunButtons() {
        const hasTools = generatorTools.length > 0;
        const hasSelection = openApiSelected && openApiSelected.size > 0;
        const canRun = hasTools || hasSelection;
        document.querySelectorAll('[data-gen-auto-run]').forEach(btn => {
          btn.disabled = !canRun;
          btn.title = canRun
            ? 'Generate a temporary server and connect it automatically.'
            : 'Import endpoints or add tools before auto-run.';
        });
      }

      async function ensureGeneratorToolsForRun() {
        if (generatorTools.length > 0) return true;
        if (openApiSelected && openApiSelected.size > 0) {
          const confirmed = await appConfirm('No tools yet. Import the selected OpenAPI endpoints and continue?', {
            title: 'Run & Connect (Auto)',
            confirmText: 'Import & Continue'
          });
          if (!confirmed) return false;
          importOpenApiTools(true);
          return generatorTools.length > 0;
        }
        notifyUser('Add at least one tool or import OpenAPI endpoints first.', 'error');
        return false;
      }

      async function resolveAutoRunServerName(desiredName) {
        try {
          const statusRes = await fetch('/api/mcp/status', { credentials: 'include' });
          const status = await statusRes.json();
          const servers = status.servers || status;
          if (servers && desiredName in servers) {
            const suffix = Date.now().toString(36).slice(-4);
            return `${desiredName}-auto-${suffix}`;
          }
        } catch (error) {
          console.warn('[Generator] Failed to check existing servers:', error.message);
        }
        return desiredName;
      }

      async function runGeneratorAndConnect() {
        const desiredName = document.getElementById('genServerName').value || 'my-mcp-server';
        const serverName = await resolveAutoRunServerName(desiredName);
        const serverDesc = document.getElementById('genServerDesc').value || 'A custom MCP server';
        const language = document.getElementById('genLanguage').value;
        const mode = document.getElementById('genMode')?.value || 'scaffold';
        const baseUrl = document.getElementById('genServerBaseUrl')?.value?.trim() || '';

        const hasTools = await ensureGeneratorToolsForRun();
        if (!hasTools) return;

        if (serverName !== desiredName) {
          notifyUser(`Using temporary server name "${serverName}" to avoid overwriting "${desiredName}".`, 'info');
        }

        if (language === 'python') {
          const confirmed = await appConfirm('Auto-run uses your local Python and requires the mcp package installed. Continue?', {
            title: 'Run & Connect (Auto)',
            confirmText: 'Continue'
          });
          if (!confirmed) return;
        }

        if (mode === 'openapi' && !baseUrl) {
          const confirmed = await appConfirm('No API Base URL set. Auto-run will start but tool calls may fail until you set API_BASE_URL. Continue?', {
            title: 'Run & Connect (Auto)',
            confirmText: 'Continue'
          });
          if (!confirmed) return;
        }

        let code = '';
        if (mode === 'openapi') {
          const openApiTools = generatorTools.filter(tool => tool.endpoint);
          if (!openApiTools.length) {
            appendMessage('error', 'OpenAPI Proxy mode needs imported endpoints.');
            return;
          }
          code = language === 'python'
            ? generateOpenApiPythonMCP(serverName, serverDesc, openApiTools)
            : generateOpenApiNodeMCP(serverName, serverDesc, openApiTools);
        } else {
          code = language === 'python'
            ? generatePythonMCP(serverName, serverDesc)
            : generateNodeMCP(serverName, serverDesc);
        }

        const files = buildGeneratorProjectFiles({
          serverName,
          serverDesc,
          language,
          mode,
          code,
          baseUrl
        });

        try {
          notifyUser('Preparing temporary project folder...', 'info');
          const response = await fetch('/api/generator/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              serverName,
              language,
              mode,
              baseUrl,
              files
            })
          });
          let data = {};
          try {
            data = await response.json();
          } catch (parseError) {
            data = {};
          }
          if (!response.ok || data.error) {
            notifyUser(`Auto-run failed: ${data.error || response.statusText}`, 'error');
            showGeneratorTestModal();
            return;
          }
          generatorTestCwd = data.cwd;
          generatorPickedFolderName = data.cwd ? data.cwd.split(/[\\/]/).pop() : '';
          updateGeneratorTestModalConfig({ serverName, baseUrl });
          const connected = await addGeneratorServerToStudio({ connectAfter: true, overrideName: serverName });
          if (connected) {
            notifyUser(`🚀 Auto-run ready. ${serverName} is connecting now.`, 'success');
          }
        } catch (error) {
          notifyUser(`Auto-run failed: ${error.message}`, 'error');
        }
      }

      // ==========================================
