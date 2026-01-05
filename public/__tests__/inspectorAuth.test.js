import fs from 'fs';
import path from 'path';
import vm from 'vm';

const inspectorPath = path.join(process.cwd(), 'public', 'app', 'inspector.js');
const inspectorSource = fs.readFileSync(inspectorPath, 'utf8');

describe('Inspector auth overrides', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input type="checkbox" id="inspectorAuthEnabled" />
      <select id="inspectorAuthType"></select>
      <input id="inspectorAuthApiKey" />
      <input id="inspectorAuthApiKeyName" />
      <select id="inspectorAuthApiKeyIn"></select>
      <input id="inspectorAuthBearer" />
      <input id="inspectorAuthBasicUser" />
      <input id="inspectorAuthBasicPass" />
      <textarea id="inspectorAuthHeaders"></textarea>
      <textarea id="inspectorAuthQuery"></textarea>
      <div id="inspectorAuthStatus"></div>
    `;
    globalThis.showNotification = jest.fn();
    globalThis.applyTemplateVariables = (value) => value;
    vm.runInThisContext(inspectorSource);
  });

  test('returns null when auth overrides disabled', () => {
    const tool = { inputSchema: { properties: { __headers: { type: 'object' } } } };
    const result = globalThis.buildInspectorAuthOverrides(tool, {});
    expect(result).toBeNull();
  });

  test('builds headers and query for api key', () => {
    document.getElementById('inspectorAuthEnabled').checked = true;
    const type = document.getElementById('inspectorAuthType');
    type.innerHTML = '<option value="apikey">API Key</option>';
    type.value = 'apikey';
    const keyName = document.getElementById('inspectorAuthApiKeyName');
    keyName.value = 'X-API-Key';
    const key = document.getElementById('inspectorAuthApiKey');
    key.value = 'secret';
    const keyIn = document.getElementById('inspectorAuthApiKeyIn');
    keyIn.innerHTML = '<option value="header">Header</option><option value="query">Query</option>';
    keyIn.value = 'header';
    document.getElementById('inspectorAuthHeaders').value = '{"X-Trace":"123"}';
    document.getElementById('inspectorAuthQuery').value = '{"debug":"true"}';

    const tool = { inputSchema: { properties: { __headers: { type: 'object' }, __query: { type: 'object' } } } };
    const result = globalThis.buildInspectorAuthOverrides(tool, {});
    expect(result.__headers['X-API-Key']).toBe('secret');
    expect(result.__headers['X-Trace']).toBe('123');
    expect(result.__query.debug).toBe('true');
  });
});
