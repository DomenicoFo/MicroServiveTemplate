import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { MicroserviceConfig, ApiConnector } from '../models/types';

const DEFAULT_CONFIG_PATH = path.resolve(
  process.env.CONFIG_FILE_PATH || './config/microservice.config.json'
);

const DEFAULT_CONFIG_TEMPLATE: MicroserviceConfig = {
  name: 'My Microservice',
  description: 'A configurable microservice template',
  version: '1.0.0',
  database: {
    host: 'localhost',
    port: 5432,
    name: 'microservice_db',
    user: 'dbuser',
    password: '',
    ssl: false,
  },
  apiConnectors: [],
  updatedAt: new Date().toISOString(),
};

export class ConfigService extends EventEmitter {
  private config: MicroserviceConfig;
  private configFilePath: string;
  private watcher: fs.FSWatcher | null = null;
  private reloadDebounceTimer: NodeJS.Timeout | null = null;

  constructor(configFilePath: string = DEFAULT_CONFIG_PATH) {
    super();
    this.configFilePath = configFilePath;
    this.config = { ...DEFAULT_CONFIG_TEMPLATE };
    this.initConfig();
    this.startWatcher();
  }

  /**
   * Initialises the config file – creates it from defaults if it doesn't exist.
   */
  private initConfig(): void {
    const dir = path.dirname(this.configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.configFilePath)) {
      this.config = this.mergeWithDefaults({ updatedAt: new Date().toISOString() });
      this.persistConfig();
    } else {
      this.loadConfig();
    }
  }

  /**
   * Loads and validates the config from disk.
   */
  private loadConfig(): void {
    try {
      const raw = fs.readFileSync(this.configFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as MicroserviceConfig;
      this.config = this.mergeWithDefaults(parsed);
    } catch (err) {
      console.error('[ConfigService] Failed to load config, using defaults:', err);
      this.config = this.mergeWithDefaults({});
    }
  }

  /**
   * Merges a partial config object with the default template so that missing
   * fields are always populated.
   */
  private mergeWithDefaults(partial: Partial<MicroserviceConfig>): MicroserviceConfig {
    return {
      ...DEFAULT_CONFIG_TEMPLATE,
      ...partial,
      database: {
        ...DEFAULT_CONFIG_TEMPLATE.database,
        ...(partial.database ?? {}),
      },
      // Always create a new array to prevent mutation of the shared default template
      apiConnectors: [...(partial.apiConnectors ?? [])],
    };
  }

  /**
   * Persists the in-memory config to disk.
   */
  private persistConfig(): void {
    fs.writeFileSync(this.configFilePath, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  /**
   * Starts a file-system watcher for hot-reload support.
   * Uses debouncing to avoid multiple reloads on rapid file saves.
   */
  private startWatcher(): void {
    if (!fs.existsSync(this.configFilePath)) {
      return;
    }

    this.watcher = fs.watch(this.configFilePath, () => {
      if (this.reloadDebounceTimer) {
        clearTimeout(this.reloadDebounceTimer);
      }
      this.reloadDebounceTimer = setTimeout(() => {
        console.log('[ConfigService] Config file changed – reloading…');
        this.loadConfig();
        this.emit('configReloaded', this.config);
      }, 300).unref();
    });

    this.watcher.on('error', (err) => {
      console.error('[ConfigService] File watcher error:', err);
    });
  }

  /**
   * Returns the current configuration.
   */
  getConfig(): MicroserviceConfig {
    return { ...this.config };
  }

  /**
   * Fully replaces the configuration and persists it.
   */
  updateConfig(updates: Partial<MicroserviceConfig>): MicroserviceConfig {
    this.config = this.mergeWithDefaults({
      ...this.config,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    this.persistConfig();
    this.emit('configUpdated', this.config);
    return { ...this.config };
  }

  /**
   * Adds or replaces an API connector by id.
   */
  upsertApiConnector(connector: ApiConnector): MicroserviceConfig {
    const existing = this.config.apiConnectors.findIndex((c) => c.id === connector.id);
    if (existing >= 0) {
      this.config.apiConnectors[existing] = connector;
    } else {
      this.config.apiConnectors.push(connector);
    }
    this.config.updatedAt = new Date().toISOString();
    this.persistConfig();
    this.emit('configUpdated', this.config);
    return { ...this.config };
  }

  /**
   * Removes an API connector by id.
   */
  removeApiConnector(connectorId: string): MicroserviceConfig {
    this.config.apiConnectors = this.config.apiConnectors.filter((c) => c.id !== connectorId);
    this.config.updatedAt = new Date().toISOString();
    this.persistConfig();
    this.emit('configUpdated', this.config);
    return { ...this.config };
  }

  /**
   * Stops the file-system watcher (useful for testing / graceful shutdown).
   */
  stopWatcher(): void {
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export const configService = new ConfigService();
