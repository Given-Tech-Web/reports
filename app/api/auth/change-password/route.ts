import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/database';
import { verifyToken } from '@/lib/auth';

// Helper function to verify the auth token from cookie
async function verifyAuth(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;

  try {
    await verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!await verifyAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, currentPassword, newPassword } = body;

    // Validate input
    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Username, current password, and new password are required' },
        { status: 400 }
      );
    }

    // Password validation
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Find the user
    const users = await db.query<any[]>(
      'SELECT id, username, password FROM users WHERE username = ?',
      [username]
    );

    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password in database
    await db.query(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
      username: username
    });

  } catch (error: any) {
    console.error('Error changing password:', error.message);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}

// GET: Check if user exists (for validation)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!await verifyAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Find user
    const users = await db.query<any[]>(
      'SELECT id, username, role, name, created_at FROM users WHERE username = ?',
      [username]
    );

    const user = users[0];

    if (!user) {
      return NextResponse.json(
        { exists: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exists: true,
      username: user.username,
      role: user.role || 'admin',
      name: user.name,
      createdAt: user.created_at
    });

  } catch (error: any) {
    console.error('Error checking user:', error.message);
    return NextResponse.json(
      { error: 'Failed to check user' },
      { status: 500 }
    );
  }
}
