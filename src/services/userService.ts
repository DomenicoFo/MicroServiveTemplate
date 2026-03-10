import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, JwtPayload } from '../models/types';

const USERS_FILE_PATH = path.resolve('./config/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'changeme_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

export class UserService {
  private users: User[] = [];

  constructor() {
    this.loadUsers();
    this.ensureAdminUser();
  }

  private loadUsers(): void {
    const dir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(USERS_FILE_PATH)) {
      this.users = [];
      this.persistUsers();
    } else {
      try {
        const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
        this.users = JSON.parse(raw) as User[];
      } catch {
        this.users = [];
      }
    }
  }

  private persistUsers(): void {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(this.users, null, 2), 'utf-8');
  }

  /**
   * Creates a default admin user on first startup when no users exist.
   */
  private ensureAdminUser(): void {
    if (this.users.length === 0) {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = bcrypt.hashSync(adminPassword, SALT_ROUNDS);
      const admin: User = {
        id: uuidv4(),
        username: adminUsername,
        passwordHash,
        role: 'admin',
      };
      this.users.push(admin);
      this.persistUsers();
      console.log(`[UserService] Default admin user created – username: "${adminUsername}"`);
    }
  }

  /**
   * Validates credentials and returns a signed JWT on success.
   */
  login(username: string, password: string): string | null {
    const user = this.users.find((u) => u.username === username);
    if (!user) return null;
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) return null;

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  /**
   * Verifies a JWT and returns its decoded payload.
   */
  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }

  findById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }
}

export const userService = new UserService();
