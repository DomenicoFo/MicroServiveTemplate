import { Request, Response } from 'express';
import { userService } from '../services/userService';

/**
 * POST /auth/login
 * Body: { username: string, password: string }
 * Returns a JWT on successful authentication.
 */
export function login(req: Request, res: Response): void {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const token = userService.login(username, password);
  if (!token) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  res.json({ token });
}
