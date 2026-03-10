import fs from 'fs';
import path from 'path';
import { ConfigService } from '../src/services/configService';
import { ApiConnector } from '../src/models/types';

let testCounter = 0;

function getTestPaths(): { dir: string; configPath: string } {
  testCounter += 1;
  const dir = path.resolve(`./tmp-test-config-${testCounter}`);
  return { dir, configPath: path.join(dir, 'test.config.json') };
}

function cleanUpDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('ConfigService', () => {
  it('creates a default config file on first startup', () => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    try {
      expect(fs.existsSync(configPath)).toBe(true);
    } finally {
      service.stopWatcher();
      cleanUpDir(dir);
    }
  });

  it('returns a config with default values', () => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    try {
      const cfg = service.getConfig();
      expect(cfg.name).toBeDefined();
      expect(cfg.database).toBeDefined();
      expect(cfg.database.host).toBeDefined();
      expect(Array.isArray(cfg.apiConnectors)).toBe(true);
    } finally {
      service.stopWatcher();
      cleanUpDir(dir);
    }
  });

  it('updates the config and persists it', () => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    try {
      const updated = service.updateConfig({ name: 'Updated Service', description: 'Updated description' });
      expect(updated.name).toBe('Updated Service');
      expect(updated.description).toBe('Updated description');

      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(raw.name).toBe('Updated Service');
    } finally {
      service.stopWatcher();
      cleanUpDir(dir);
    }
  });

  it('updates the database config', () => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    try {
      const updated = service.updateConfig({
        database: { host: 'db.example.com', port: 5433, name: 'prod_db', user: 'admin', password: 'secret', ssl: true },
      });
      expect(updated.database.host).toBe('db.example.com');
      expect(updated.database.port).toBe(5433);
      expect(updated.database.ssl).toBe(true);
    } finally {
      service.stopWatcher();
      cleanUpDir(dir);
    }
  });

  it('adds an API connector', () => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    try {
      const connector: ApiConnector = {
        id: 'test-id-1',
        name: 'Payment API',
        description: 'Handles payments',
        baseUrl: 'https://api.payments.example.com',
        enabled: true,
      };
      const updated = service.upsertApiConnector(connector);
      expect(updated.apiConnectors).toHaveLength(1);
      expect(updated.apiConnectors[0].id).toBe('test-id-1');
    } finally {
      service.stopWatcher();
      cleanUpDir(dir);
    }
  });

  it('updates an existing API connector', () => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    try {
      const connector: ApiConnector = {
        id: 'test-id-2',
        name: 'Inventory API',
        description: 'Manages inventory',
        baseUrl: 'https://api.inventory.example.com',
        enabled: true,
      };
      service.upsertApiConnector(connector);
      const updated = service.upsertApiConnector({ ...connector, name: 'Inventory API v2' });
      expect(updated.apiConnectors).toHaveLength(1);
      expect(updated.apiConnectors[0].name).toBe('Inventory API v2');
    } finally {
      service.stopWatcher();
      cleanUpDir(dir);
    }
  });

  it('removes an API connector', () => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    try {
      const connector: ApiConnector = {
        id: 'test-id-3',
        name: 'Shipping API',
        description: 'Handles shipping',
        baseUrl: 'https://api.shipping.example.com',
        enabled: true,
      };
      service.upsertApiConnector(connector);
      const updated = service.removeApiConnector('test-id-3');
      expect(updated.apiConnectors).toHaveLength(0);
    } finally {
      service.stopWatcher();
      cleanUpDir(dir);
    }
  });

  it('emits configUpdated event when config changes', (done) => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    service.on('configUpdated', (cfg) => {
      expect(cfg.name).toBe('Event Test');
      service.stopWatcher();
      cleanUpDir(dir);
      done();
    });
    service.updateConfig({ name: 'Event Test' });
  });

  it('hot-reloads config when file changes externally', (done) => {
    const { dir, configPath } = getTestPaths();
    const service = new ConfigService(configPath);
    service.on('configReloaded', (cfg) => {
      expect(cfg.name).toBe('Hot Reloaded');
      service.stopWatcher();
      cleanUpDir(dir);
      done();
    });

    const newConfig = { ...service.getConfig(), name: 'Hot Reloaded' };
    setTimeout(() => {
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
    }, 100);
  }, 5000);

  it('loads an existing config file on startup', () => {
    const { dir, configPath } = getTestPaths();
    const service1 = new ConfigService(configPath);
    service1.updateConfig({ name: 'Pre-existing Config' });
    service1.stopWatcher();

    // Create a new service instance pointing to the same file
    const service2 = new ConfigService(configPath);
    try {
      const cfg = service2.getConfig();
      expect(cfg.name).toBe('Pre-existing Config');
    } finally {
      service2.stopWatcher();
      cleanUpDir(dir);
    }
  });
});

