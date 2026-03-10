import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { configService } from '../services/configService';
import { ApiConnector, MicroserviceConfig } from '../models/types';

/**
 * GET /config
 * Returns the current microservice configuration.
 * Accessible by any authenticated user.
 */
export function getConfig(req: Request, res: Response): void {
  res.json(configService.getConfig());
}

/**
 * PUT /config
 * Updates the top-level configuration fields (name, description, database, version).
 * Restricted to admin users.
 */
export function updateConfig(req: Request, res: Response): void {
  const body = req.body as Partial<MicroserviceConfig>;

  // Protect against accidentally overwriting connectors via this endpoint
  const { apiConnectors: _ignored, ...safeUpdates } = body;

  const updated = configService.updateConfig(safeUpdates);
  res.json(updated);
}

/**
 * GET /config/connectors
 * Returns all API connector definitions.
 */
export function getConnectors(req: Request, res: Response): void {
  res.json(configService.getConfig().apiConnectors);
}

/**
 * POST /config/connectors
 * Creates a new API connector.
 * Restricted to admin users.
 */
export function createConnector(req: Request, res: Response): void {
  const body = req.body as Partial<ApiConnector>;

  if (!body.name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const connector: ApiConnector = {
    id: uuidv4(),
    name: body.name,
    description: body.description ?? '',
    baseUrl: body.baseUrl ?? '',
    swaggerFile: body.swaggerFile,
    enabled: body.enabled !== undefined ? body.enabled : true,
  };

  const updated = configService.upsertApiConnector(connector);
  res.status(201).json(updated.apiConnectors.find((c) => c.id === connector.id));
}

/**
 * PUT /config/connectors/:id
 * Updates an existing API connector.
 * Restricted to admin users.
 */
export function updateConnector(req: Request, res: Response): void {
  const { id } = req.params;
  const existing = configService.getConfig().apiConnectors.find((c) => c.id === id);
  if (!existing) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  const body = req.body as Partial<ApiConnector>;
  const updated = configService.upsertApiConnector({ ...existing, ...body, id });
  res.json(updated.apiConnectors.find((c) => c.id === id));
}

/**
 * DELETE /config/connectors/:id
 * Removes an API connector.
 * Restricted to admin users.
 */
export function deleteConnector(req: Request, res: Response): void {
  const { id } = req.params;
  const existing = configService.getConfig().apiConnectors.find((c) => c.id === id);
  if (!existing) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  configService.removeApiConnector(id);
  res.status(204).send();
}

/**
 * POST /config/connectors/:id/swagger
 * Uploads a Swagger/OpenAPI specification file for an existing connector.
 * Restricted to admin users.
 * The uploaded file is stored in the uploads directory and the connector's
 * swaggerFile path is updated in the configuration.
 */
export function uploadSwagger(req: Request, res: Response): void {
  const { id } = req.params;
  const existing = configService.getConfig().apiConnectors.find((c) => c.id === id);
  if (!existing) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  // Remove old swagger file if it exists
  if (existing.swaggerFile && fs.existsSync(existing.swaggerFile)) {
    try {
      fs.unlinkSync(existing.swaggerFile);
    } catch {
      // Non-fatal – continue
    }
  }

  const swaggerFilePath = path.resolve(req.file.path);
  const updated = configService.upsertApiConnector({ ...existing, swaggerFile: swaggerFilePath });
  res.json(updated.apiConnectors.find((c) => c.id === id));
}

/**
 * GET /config/connectors/:id/swagger
 * Retrieves the Swagger/OpenAPI specification file for an existing connector.
 * Accessible by any authenticated user.
 */
export function getSwagger(req: Request, res: Response): void {
  const { id } = req.params;
  const existing = configService.getConfig().apiConnectors.find((c) => c.id === id);
  if (!existing) {
    res.status(404).json({ error: 'Connector not found' });
    return;
  }

  if (!existing.swaggerFile || !fs.existsSync(existing.swaggerFile)) {
    res.status(404).json({ error: 'No swagger file available for this connector' });
    return;
  }

  res.sendFile(existing.swaggerFile);
}
