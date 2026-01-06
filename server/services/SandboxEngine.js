import { createRequire } from 'module';
import { VM, NodeVM } from 'vm2';

const require = createRequire(import.meta.url);
let isolatedVm = null;
try {
  isolatedVm = require('isolated-vm');
} catch (error) {
  isolatedVm = null;
}

const defaultEngine = isolatedVm ? 'isolated-vm' : 'vm2';
const SANDBOX_ENGINE = (process.env.MCP_SANDBOX_ENGINE || defaultEngine).toLowerCase();
let warned = false;

function warnOnce(message) {
  if (warned) return;
  warned = true;
  console.warn(message);
}

function copySandboxValue(ivm, value) {
  try {
    return new ivm.ExternalCopy(value).copyInto();
  } catch (error) {
    try {
      return new ivm.ExternalCopy(JSON.parse(JSON.stringify(value))).copyInto();
    } catch (_nested) {
      return undefined;
    }
  }
}

function createIsolatedVM(options = {}) {
  const ivm = isolatedVm;
  const isolate = new ivm.Isolate({ memoryLimit: options.memoryLimit || 128 });
  const context = isolate.createContextSync();
  const jail = context.global;
  jail.setSync('global', jail.derefInto());

  const consoleProxy = {
    log: (...args) => console.log('[sandbox]', ...args),
    warn: (...args) => console.warn('[sandbox]', ...args),
    error: (...args) => console.error('[sandbox]', ...args),
  };
  jail.setSync('console', new ivm.ExternalCopy(consoleProxy).copyInto());

  const sandbox = options.sandbox || {};
  Object.entries(sandbox).forEach(([key, value]) => {
    const copied = copySandboxValue(ivm, value);
    if (copied !== undefined) {
      jail.setSync(key, copied);
    }
  });

  return {
    run(code) {
      const script = isolate.compileScriptSync(String(code));
      return script.runSync(context, { timeout: options.timeout || 1000 });
    },
    dispose() {
      isolate.dispose();
    },
  };
}

export function createSandboxVM(options = {}) {
  if (SANDBOX_ENGINE === 'isolated-vm') {
    if (isolatedVm) {
      return createIsolatedVM(options);
    }
    warnOnce('[Sandbox] isolated-vm not installed; falling back to vm2.');
  }
  return new VM(options);
}

export function createSandboxNodeVM(options = {}) {
  if (SANDBOX_ENGINE === 'isolated-vm' && isolatedVm) {
    warnOnce('[Sandbox] isolated-vm does not support NodeVM require; using vm2 NodeVM.');
  }
  return new NodeVM(options);
}

export function getSandboxEngine() {
  return SANDBOX_ENGINE;
}
