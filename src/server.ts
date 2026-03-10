import 'dotenv/config';
import app from './app';
import { configService } from './services/configService';

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = app.listen(PORT, () => {
  console.log(`[Server] Microservice running on port ${PORT}`);
  const cfg = configService.getConfig();
  console.log(`[Server] Name: ${cfg.name}`);
  console.log(`[Server] Description: ${cfg.description}`);
});

configService.on('configReloaded', (cfg) => {
  console.log(`[Server] Configuration hot-reloaded – Name: ${cfg.name}`);
});

configService.on('configUpdated', (cfg) => {
  console.log(`[Server] Configuration updated – Name: ${cfg.name}`);
});

process.on('SIGTERM', () => {
  console.log('[Server] Shutting down gracefully…');
  configService.stopWatcher();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[Server] Shutting down gracefully…');
  configService.stopWatcher();
  server.close(() => process.exit(0));
});

export default server;
