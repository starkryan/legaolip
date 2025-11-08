import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

// Admin credentials (in production, use database)
const ADMIN_CREDENTIALS = [
  {
    email: 'admin@goip.com',
    password: '$2b$12$m4JEluDr0bo8rWG9nW1LWecAgAEzPaGs.ZowvmAiPsYbmQmBCdR9O', // hashed "admin123"
    name: 'Administrator',
    role: 'super_admin'
  },
  {
    email: 'superadmin@goip.com',
    password: '$2b$12$M8FzOO24y4z4OaBQ6cS3rOOt9bPaHy3jwC1Zy.3t.FsEMDCSqeyx.', // hashed "admin123"
    name: 'Super Administrator',
    role: 'super_admin'
  }
];

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'your-admin-jwt-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // Find admin by email
    const admin = ADMIN_CREDENTIALS.find(cred => cred.email === email.toLowerCase());

    if (!admin) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Create JWT token
    const token = await new SignJWT({
      sub: admin.email,
      name: admin.name,
      role: admin.role,
      type: 'admin'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Create session data
    const sessionData = {
      token,
      user: {
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    };

    // Log successful admin login
    console.log(`ADMIN LOGIN: ${admin.email} at ${new Date().toISOString()}`, {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      data: sessionData,
      message: 'Admin login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed'
  }, { status: 405 });
}