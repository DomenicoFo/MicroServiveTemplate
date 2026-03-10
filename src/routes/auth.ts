import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login } from '../controllers/authController';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' },
});

const router = Router();

router.post('/login', loginLimiter, login);

export default router;
