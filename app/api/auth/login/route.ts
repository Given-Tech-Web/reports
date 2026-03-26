import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createToken } from '@/lib/auth';
import { db } from '@/lib/database';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Create users table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Find user
    const users = await db.query<any[]>(
      'SELECT id, username, password, name, role FROM users WHERE username = ?',
      [username]
    );

    const user = users[0];

    if (!user) {
      // If no users exist at all, create default admin
      const allUsers = await db.query<any[]>('SELECT COUNT(*) as count FROM users');
      const userCount = allUsers[0].count;

      if (userCount === 0 && username === 'admin' && password === 'admin123') {
        // Create default admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.query(
          'INSERT INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, ?)',
          ['admin-001', 'admin', hashedPassword, '관리자', 'admin']
        );

        // Create token for new admin
        const token = await createToken({
          id: 'admin-001',
          username: 'admin',
          name: '관리자',
          role: 'admin',
        });

        const response = NextResponse.json({
          success: true,
          user: {
            id: 'admin-001',
            username: 'admin',
            name: '관리자',
            role: 'admin',
          },
          message: 'Default admin account created',
        });

        response.cookies.set('auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 86400, // 24 hours
          path: '/',
        });

        return response;
      }

      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create token (convert id to string if it's a number)
    const userId = String(user.id);
    const token = await createToken({
      id: userId,
      username: user.username,
      name: user.name || user.username,
      role: user.role || 'admin',
    });

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        username: user.username,
        name: user.name || user.username,
        role: user.role || 'admin',
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error.message);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
