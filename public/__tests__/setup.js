/**
 * Jest setup for frontend tests with jsdom
 */

import { jest, beforeEach } from '@jest/globals';

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
