import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/database';
import { cookies } from 'next/headers';

// Validate JWT secret in production
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const secret = new TextEncoder().encode(
  jwtSecret || 'dev-only-secret-do-not-use-in-production'
);

export async function createToken(payload: any) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');

  if (!token) return null;

  return await verifyToken(token.value);
}

export async function checkDeviceAccess(userId: Number, deviceId: string): Promise<boolean> {
  const authCheck = await db.query<any[]>(
    `SELECT 1 FROM user_devices WHERE user_id = ? AND device_id = ?`,
    [userId, deviceId]
  );
  return authCheck.length > 0;
}