import crypto from 'crypto';
import { SECURITY } from '@dfk-defense/shared/config';

export function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sessionCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: Math.floor(SECURITY.sessionTtlMs / 1000),
  };
}

export function adminCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure,
    maxAge: Math.floor(SECURITY.sessionTtlMs / 1000),
  };
}

export function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}
