/**
 * Monitor Manager
 * Scheduled test execution (like Postman Monitors)
 */

import { getCollectionManager } from './CollectionManager.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MonitorManager {
  constructor() {
    this.monitorsFile = join(__dirname, '../../data/monitors.json');
    this.monitors = new Map();
    this.intervals = new Map();
    this.collectionManager = getCollectionManager();

    // Ensure data directory exists
    const dataDir = dirname(this.monitorsFile);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.loadMonitors();
  }

  /**
   * Load monitors from disk
   */
  loadMonitors() {
    try {
      if (existsSync(this.monitorsFile)) {
        const content = readFileSync(this.monitorsFile, 'utf8');
        const data = JSON.parse(content);

        for (const monitor of data) {
          this.monitors.set(monitor.id, monitor);

          // Start monitor if enabled
          if (monitor.enabled) {
            this.startMonitor(monitor.id);
          }
        }

        console.log(`[MonitorManager] Loaded ${this.monitors.size} monitors`);
      }
    } catch (error) {
      console.error('[MonitorManager] Failed to load monitors:', error.message);
    }
  }

  /**
   * Save monitors to disk
   */
  saveMonitors() {
    try {
      const data = Array.from(this.monitors.values());
      writeFileSync(this.monitorsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[MonitorManager] Failed to save monitors:', error.message);
    }
  }

  /**
   * Create a new monitor
   */
  createMonitor(data) {
    const {
      name,
      collectionId,
      schedule,
      environment = {},
      enabled = true,
      notifications = [],
    } = data;

    if (!name) {
      throw new Error('Monitor name is required');
    }

    if (!collectionId) {
      throw new Error('Collection ID is required');
    }

    if (!schedule) {
      throw new Error('Schedule is required');
    }

    const monitor = {
      id: this.generateId(),
      name,
      collectionId,
      schedule,
      environment,
      enabled,
      notifications,
      lastRun: null,
      lastStatus: null,
      runCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.monitors.set(monitor.id, monitor);
    this.saveMonitors();

    if (enabled) {
      this.startMonitor(monitor.id);
    }

    return monitor;
  }

  /**
   * Get all monitors
   */
  getAllMonitors() {
    return Array.from(this.monitors.values());
  }

  /**
   * Get a monitor by ID
   */
  getMonitor(id) {
    const monitor = this.monitors.get(id);

    if (!monitor) {
      throw new Error(`Monitor ${id} not found`);
    }

    return monitor;
  }

  /**
   * Update a monitor
   */
  updateMonitor(id, updates) {
    const monitor = this.getMonitor(id);

    const wasEnabled = monitor.enabled;
    const updated = {
      ...monitor,
      ...updates,
      id: monitor.id, // Preserve ID
      updatedAt: new Date().toISOString(),
    };

    this.monitors.set(id, updated);
    this.saveMonitors();

    // Handle enable/disable
    if (wasEnabled && !updated.enabled) {
      this.stopMonitor(id);
    } else if (!wasEnabled && updated.enabled) {
      this.startMonitor(id);
    } else if (updated.enabled && updates.schedule) {
      // Restart if schedule changed
      this.stopMonitor(id);
      this.startMonitor(id);
    }

    return updated;
  }

  /**
   * Delete a monitor
   */
  deleteMonitor(id) {
    this.getMonitor(id); // Validates monitor exists, throws if not found

    this.stopMonitor(id);
    this.monitors.delete(id);
    this.saveMonitors();

    console.log(`[MonitorManager] Deleted monitor ${id}`);

    return { success: true };
  }

  /**
   * Start a monitor
   */
  startMonitor(id) {
    const monitor = this.getMonitor(id);

    if (this.intervals.has(id)) {
      console.log(`[MonitorManager] Monitor ${id} already running`);
      return;
    }

    const intervalMs = this.parseSchedule(monitor.schedule);

    const interval = setInterval(async () => {
      await this.executeMonitor(id);
    }, intervalMs);

    this.intervals.set(id, interval);

    console.log(`[MonitorManager] Started monitor ${id} (${monitor.schedule})`);
  }

  /**
   * Stop a monitor
   */
  stopMonitor(id) {
    const interval = this.intervals.get(id);

    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
      console.log(`[MonitorManager] Stopped monitor ${id}`);
    }
  }

  /**
   * Execute a monitor (run the collection)
   */
  async executeMonitor(id) {
    const monitor = this.getMonitor(id);

    console.log(`[MonitorManager] Executing monitor ${id} (${monitor.name})`);

    try {
      const results = await this.collectionManager.runCollection(monitor.collectionId, {
        environment: monitor.environment,
        stopOnError: false,
      });

      // Update monitor stats
      monitor.lastRun = new Date().toISOString();
      monitor.lastStatus = results.failed > 0 ? 'failed' : 'passed';
      monitor.runCount++;
      monitor.updatedAt = new Date().toISOString();

      this.monitors.set(id, monitor);
      this.saveMonitors();

      // Send notifications if configured
      if (monitor.notifications && monitor.notifications.length > 0) {
        await this.sendNotifications(monitor, results);
      }

      console.log(`[MonitorManager] Monitor ${id} completed: ${monitor.lastStatus}`);

      return results;
    } catch (error) {
      console.error(`[MonitorManager] Monitor ${id} failed:`, error.message);

      monitor.lastRun = new Date().toISOString();
      monitor.lastStatus = 'error';
      monitor.runCount++;
      monitor.updatedAt = new Date().toISOString();

      this.monitors.set(id, monitor);
      this.saveMonitors();

      throw error;
    }
  }

  /**
   * Send notifications
   */
  async sendNotifications(monitor, results) {
    for (const notification of monitor.notifications) {
      try {
        if (notification.type === 'webhook') {
          await this.sendWebhookNotification(notification, monitor, results);
        } else if (notification.type === 'email') {
          // Email notification would go here
          console.log(`[MonitorManager] Email notification not implemented`);
        }
      } catch (error) {
        console.error(`[MonitorManager] Notification failed:`, error.message);
      }
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhookNotification(notification, monitor, results) {
    const payload = {
      monitor: {
        id: monitor.id,
        name: monitor.name,
      },
      results: {
        status: monitor.lastStatus,
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        duration: results.duration,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(notification.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      console.log(`[MonitorManager] Webhook notification sent to ${notification.url}`);
    } catch (error) {
      console.error(`[MonitorManager] Webhook failed:`, error.message);
    }
  }

  /**
   * Parse schedule string to interval in milliseconds
   */
  parseSchedule(schedule) {
    // Support simple formats:
    // "5m" = 5 minutes
    // "1h" = 1 hour
    // "30s" = 30 seconds
    // "*/5 * * * *" = cron (simplified to 5 minutes for now)

    if (schedule.includes('*')) {
      // Simplified cron parsing - extract minutes
      const parts = schedule.split(' ');
      const minutes = parts[0].replace('*/', '');
      return parseInt(minutes) * 60 * 1000;
    }

    const match = schedule.match(/^(\d+)([smh])$/);

    if (!match) {
      throw new Error(`Invalid schedule format: ${schedule}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get monitor statistics
   */
  getStatistics() {
    const monitors = this.getAllMonitors();

    const totalRuns = monitors.reduce((sum, mon) => sum + mon.runCount, 0);
    const activeMonitors = monitors.filter(m => m.enabled).length;
    const failedMonitors = monitors.filter(m => m.lastStatus === 'failed').length;

    return {
      totalMonitors: monitors.length,
      activeMonitors,
      totalRuns,
      failedMonitors,
      recentRuns: monitors
        .filter(m => m.lastRun)
        .sort((a, b) => new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime())
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          name: m.name,
          lastRun: m.lastRun,
          status: m.lastStatus,
        })),
    };
  }

  /**
   * Shutdown all monitors
   */
  shutdown() {
    console.log('[MonitorManager] Shutting down all monitors...');

    for (const id of this.intervals.keys()) {
      this.stopMonitor(id);
    }
  }
}

// Singleton
let instance = null;
export function getMonitorManager() {
  if (!instance) {
    instance = new MonitorManager();
  }
  return instance;
}

export default MonitorManager;
