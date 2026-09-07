import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function getPepper() {
  const p = String(process.env.NEXTAUTH_SECRET || '').trim();
  return p || 'no-pepper';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    const newPassword = String(body?.newPassword || '');

    if (!token || newPassword.length < 6) {
      return NextResponse.json({ error: '令牌或密码无效' }, { status: 400 });
    }

    await dbConnect();

    const tokenHash = sha256(`${token}.${getPepper()}`);

    const user: any = await User.findOne({
      passwordResetTokenHash: tokenHash,
      $or: [{ passwordResetUsedAt: { $exists: false } }, { passwordResetUsedAt: null }],
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('_id');

    if (!user) {
      return NextResponse.json({ error: '令牌无效或已过期' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          passwordResetUsedAt: new Date(),
        },
        $unset: {
          passwordResetTokenHash: '',
          passwordResetExpiresAt: '',
          passwordResetRequestedAt: '',
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: '重置密码失败' }, { status: 500 });
  }
}
