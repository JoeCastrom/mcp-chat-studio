/**
 * MonitorManager Unit Tests
 */

import { jest } from '@jest/globals';

// Mock file system operations
const mockFileData = new Map();

jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn((path) => {
    if (mockFileData.has(path)) {
      return mockFileData.get(path);
    }
    throw new Error(`File not found: ${path}`);
  }),
  writeFileSync: jest.fn((path, data) => {
    mockFileData.set(path, data);
  }),
  existsSync: jest.fn((path) => {
    return mockFileData.has(path) || path.includes('data');
  }),
  mkdirSync: jest.fn()
}));

// Mock CollectionManager
const mockRunCollection = jest.fn();
jest.unstable_mockModule('../services/CollectionManager.js', () => ({
  getCollectionManager: jest.fn(() => ({
    runCollection: mockRunCollection.mockResolvedValue({
      total: 5,
      passed: 4,
      failed: 1,
      duration: 1000
    })
  }))
}));

// Import after mocking
const { MonitorManager, getMonitorManager } = await import('../services/MonitorManager.js');

describe('MonitorManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileData.clear();
    mockRunCollection.mockClear();
    
    // Create fresh instance for each test
    manager = new MonitorManager();
  });

  afterEach(() => {
    // Clean up intervals
    if (manager) {
      manager.shutdown();
    }
  });

  describe('CRUD Operations', () => {
    test('createMonitor should create monitor with required fields', () => {
      const monitor = manager.createMonitor({
        name: 'Test Monitor',
        collectionId: 'col_123',
        schedule: '5m'
      });

      expect(monitor.id).toBeDefined();
      expect(monitor.id).toMatch(/^mon_/);
      expect(monitor.name).toBe('Test Monitor');
      expect(monitor.collectionId).toBe('col_123');
      expect(monitor.schedule).toBe('5m');
      expect(monitor.enabled).toBe(true);
      expect(monitor.runCount).toBe(0);
      expect(monitor.lastRun).toBeNull();
    });

    test('createMonitor should throw error when name is missing', () => {
      expect(() => manager.createMonitor({
        collectionId: 'col_123',
        schedule: '5m'
      })).toThrow('Monitor name is required');
    });

    test('createMonitor should throw error when collectionId is missing', () => {
      expect(() => manager.createMonitor({
        name: 'Test',
        schedule: '5m'
      })).toThrow('Collection ID is required');
    });

    test('createMonitor should throw error when schedule is missing', () => {
      expect(() => manager.createMonitor({
        name: 'Test',
        collectionId: 'col_123'
      })).toThrow('Schedule is required');
    });

    test('getAllMonitors should return all monitors', () => {
      manager.createMonitor({ name: 'M1', collectionId: 'c1', schedule: '1m' });
      manager.createMonitor({ name: 'M2', collectionId: 'c2', schedule: '2m' });

      const monitors = manager.getAllMonitors();

      expect(monitors).toHaveLength(2);
    });

    test('getMonitor should return monitor by ID', () => {
      const created = manager.createMonitor({
        name: 'Test',
        collectionId: 'col_123',
        schedule: '5m'
      });

      const retrieved = manager.getMonitor(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe('Test');
    });

    test('getMonitor should throw error for non-existent ID', () => {
      expect(() => manager.getMonitor('nonexistent'))
        .toThrow('Monitor nonexistent not found');
    });

    test('updateMonitor should update monitor properties', () => {
      const created = manager.createMonitor({
        name: 'Original',
        collectionId: 'col_123',
        schedule: '5m'
      });

      const updated = manager.updateMonitor(created.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
      expect(updated.id).toBe(created.id);
    });

    test('deleteMonitor should remove monitor', () => {
      const created = manager.createMonitor({
        name: 'To Delete',
        collectionId: 'col_123',
        schedule: '5m'
      });

      const result = manager.deleteMonitor(created.id);

      expect(result.success).toBe(true);
      expect(() => manager.getMonitor(created.id)).toThrow();
    });
  });

  describe('Schedule Parsing', () => {
    test('parseSchedule should parse seconds', () => {
      const ms = manager.parseSchedule('30s');
      expect(ms).toBe(30 * 1000);
    });

    test('parseSchedule should parse minutes', () => {
      const ms = manager.parseSchedule('5m');
      expect(ms).toBe(5 * 60 * 1000);
    });

    test('parseSchedule should parse hours', () => {
      const ms = manager.parseSchedule('2h');
      expect(ms).toBe(2 * 60 * 60 * 1000);
    });

    test('parseSchedule should parse cron-like format', () => {
      const ms = manager.parseSchedule('*/10 * * * *');
      expect(ms).toBe(10 * 60 * 1000);
    });

    test('parseSchedule should throw for invalid format', () => {
      expect(() => manager.parseSchedule('invalid')).toThrow('Invalid schedule format');
    });
  });

  describe('Monitor Execution', () => {
    test('executeMonitor should run collection', async () => {
      const monitor = manager.createMonitor({
        name: 'Test',
        collectionId: 'col_123',
        schedule: '5m',
        enabled: false
      });

      const result = await manager.executeMonitor(monitor.id);

      expect(mockRunCollection).toHaveBeenCalledWith('col_123', expect.any(Object));
      expect(result.total).toBe(5);
    });

    test('executeMonitor should update monitor stats', async () => {
      const monitor = manager.createMonitor({
        name: 'Test',
        collectionId: 'col_123',
        schedule: '5m',
        enabled: false
      });

      await manager.executeMonitor(monitor.id);

      const updated = manager.getMonitor(monitor.id);
      expect(updated.runCount).toBe(1);
      expect(updated.lastRun).toBeDefined();
      expect(updated.lastStatus).toBe('failed'); // 1 failure in mock
    });

    test('executeMonitor should set passed status when no failures', async () => {
      mockRunCollection.mockResolvedValueOnce({
        total: 5,
        passed: 5,
        failed: 0,
        duration: 1000
      });

      const monitor = manager.createMonitor({
        name: 'Test',
        collectionId: 'col_123',
        schedule: '5m',
        enabled: false
      });

      await manager.executeMonitor(monitor.id);

      const updated = manager.getMonitor(monitor.id);
      expect(updated.lastStatus).toBe('passed');
    });
  });

  describe('Monitor Start/Stop', () => {
    test('startMonitor should create interval', () => {
      const monitor = manager.createMonitor({
        name: 'Test',
        collectionId: 'col_123',
        schedule: '5m',
        enabled: false
      });

      manager.startMonitor(monitor.id);

      expect(manager.intervals.has(monitor.id)).toBe(true);
    });

    test('stopMonitor should clear interval', () => {
      const monitor = manager.createMonitor({
        name: 'Test',
        collectionId: 'col_123',
        schedule: '5m',
        enabled: false
      });

      manager.startMonitor(monitor.id);
      manager.stopMonitor(monitor.id);

      expect(manager.intervals.has(monitor.id)).toBe(false);
    });

    test('shutdown should stop all monitors', () => {
      manager.createMonitor({ name: 'M1', collectionId: 'c1', schedule: '1m', enabled: true });
      manager.createMonitor({ name: 'M2', collectionId: 'c2', schedule: '2m', enabled: true });

      manager.shutdown();

      expect(manager.intervals.size).toBe(0);
    });
  });

  describe('Statistics', () => {
    test('getStatistics should return correct counts', () => {
      manager.createMonitor({ name: 'M1', collectionId: 'c1', schedule: '1m', enabled: true });
      manager.createMonitor({ name: 'M2', collectionId: 'c2', schedule: '2m', enabled: false });

      const stats = manager.getStatistics();

      expect(stats.totalMonitors).toBe(2);
      expect(stats.activeMonitors).toBe(1);
      expect(stats.totalRuns).toBe(0);
    });
  });

  describe('ID Generation', () => {
    test('generateId should create unique IDs', () => {
      const id1 = manager.generateId();
      const id2 = manager.generateId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^mon_/);
    });
  });
});
