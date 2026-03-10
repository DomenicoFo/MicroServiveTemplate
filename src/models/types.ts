/**
 * Core type definitions for the microservice configuration system.
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface ApiConnector {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  swaggerFile?: string;
  enabled: boolean;
}

export interface MicroserviceConfig {
  name: string;
  description: string;
  version: string;
  database: DatabaseConfig;
  apiConnectors: ApiConnector[];
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}
