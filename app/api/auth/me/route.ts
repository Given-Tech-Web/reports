import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/database';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const deviceRows = await db.query<any[]>(
      `SELECT device_id FROM user_devices WHERE user_id = ?`,
      [session.id]
    );
    
    const allowedDevices = deviceRows.map(row => row.device_id);

    return NextResponse.json({
      id: session.id,
      username: session.username,
      name: session.name,
      role: session.role || 'user',
      devices: allowedDevices,
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}