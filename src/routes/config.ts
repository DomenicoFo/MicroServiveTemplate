import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getConfig,
  updateConfig,
  getConnectors,
  createConnector,
  updateConnector,
  deleteConnector,
  uploadSwagger,
  getSwagger,
} from '../controllers/configController';

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || './uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.yaml', '.yml', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only YAML and JSON swagger files are allowed'));
    }
  },
});

const configReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const configWriteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// Apply a global rate limiter before authentication to protect the auth check itself
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

// All config endpoints require authentication
router.use(globalLimiter, authenticate);

// Configuration
router.get('/', configReadLimiter, getConfig);
router.put('/', configWriteLimiter, requireAdmin, updateConfig);

// API Connectors
router.get('/connectors', configReadLimiter, getConnectors);
router.post('/connectors', configWriteLimiter, requireAdmin, createConnector);
router.put('/connectors/:id', configWriteLimiter, requireAdmin, updateConnector);
router.delete('/connectors/:id', configWriteLimiter, requireAdmin, deleteConnector);

// Swagger file management
router.post('/connectors/:id/swagger', configWriteLimiter, requireAdmin, upload.single('swagger'), uploadSwagger);
router.get('/connectors/:id/swagger', configReadLimiter, getSwagger);

export default router;
