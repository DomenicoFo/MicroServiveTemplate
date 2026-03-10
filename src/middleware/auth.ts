import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { JwtPayload } from '../models/types';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Middleware that validates the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = userService.verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware that restricts access to users with the 'admin' role.
 * Must be used after `authenticate`.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin privileges required' });
    return;
  }
  next();
}
