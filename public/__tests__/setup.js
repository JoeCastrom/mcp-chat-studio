/**
 * Jest setup for frontend tests with jsdom
 */

import { jest, beforeEach } from '@jest/globals';
import { JSDOM } from 'jsdom';

// Setup jsdom window/document for tests that need DOM APIs
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.DOMPurify = null; // Let sanitizeHtml use fallback

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  _store: {},
};

// Implement storage behavior
localStorageMock.getItem.mockImplementation((key) => localStorageMock._store[key] || null);
localStorageMock.setItem.mockImplementation((key, value) => {
  localStorageMock._store[key] = String(value);
});
localStorageMock.removeItem.mockImplementation((key) => {
  delete localStorageMock._store[key];
});
localStorageMock.clear.mockImplementation(() => {
  localStorageMock._store = {};
});

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// requestAnimationFrame shim for jsdom
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}
if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Mock fetch
globalThis.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  localStorageMock._store = {};
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  globalThis.fetch.mockClear();
});
