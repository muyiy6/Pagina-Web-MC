import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import User from '@/models/User';
import { resolveMinecraftAccount, isValidMinecraftUsername } from '@/lib/minecraftAccount';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    await dbConnect();

    const user = await User.findById(currentUser.id)
      .select('_id minecraftUsername minecraftUuid minecraftLinkedAt')
      .lean();

    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    return NextResponse.json({
      minecraftUsername: String((user as any).minecraftUsername || ''),
      minecraftUuid: String((user as any).minecraftUuid || ''),
      minecraftLinkedAt: (user as any).minecraftLinkedAt || null,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    console.error('Error fetching minecraft link:', error);
    return NextResponse.json({ error: '加载绑定信息失败' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const unlink = Boolean((body as any)?.unlink);
    const usernameRaw = typeof (body as any)?.username === 'string' ? (body as any).username : '';
    const username = String(usernameRaw).trim();

    await dbConnect();

    if (unlink) {
      const updated = await User.findByIdAndUpdate(
        currentUser.id,
        { $set: { minecraftUsername: '', minecraftUuid: '', minecraftLinkedAt: null } },
        { returnDocument: 'after' }
      ).select('_id minecraftUsername minecraftUuid minecraftLinkedAt');

      return NextResponse.json({
        minecraftUsername: String((updated as any)?.minecraftUsername || ''),
        minecraftUuid: String((updated as any)?.minecraftUuid || ''),
        minecraftLinkedAt: (updated as any)?.minecraftLinkedAt || null,
      });
    }

    if (!isValidMinecraftUsername(username)) {
      return NextResponse.json({ error: 'Minecraft 用户名无效' }, { status: 400 });
    }

    const onlineMode = (process.env.MC_ONLINE_MODE || 'true').toLowerCase() !== 'false';
    const resolved = await resolveMinecraftAccount({ usernameRaw: username, onlineMode, timeoutMs: 5000 });
    if (!resolved) {
      return NextResponse.json({ error: '找不到该 Minecraft 用户' }, { status: 404 });
    }

    const existing = await User.findOne({
      _id: { $ne: currentUser.id },
      minecraftUuid: resolved.uuid,
    }).select('_id username');

    if (existing) {
      return NextResponse.json(
        { error: '该 Minecraft 用户已绑定其他账号' },
        { status: 409 }
      );
    }

    const updated = await User.findByIdAndUpdate(
      currentUser.id,
      {
        $set: {
          minecraftUsername: resolved.username,
          minecraftUuid: resolved.uuid,
          minecraftLinkedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    ).select('_id minecraftUsername minecraftUuid minecraftLinkedAt');

    if (!updated) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    return NextResponse.json({
      minecraftUsername: String((updated as any).minecraftUsername || ''),
      minecraftUuid: String((updated as any).minecraftUuid || ''),
      minecraftLinkedAt: (updated as any).minecraftLinkedAt || null,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    console.error('Error updating minecraft link:', error);
    return NextResponse.json({ error: '绑定 Minecraft 失败' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
