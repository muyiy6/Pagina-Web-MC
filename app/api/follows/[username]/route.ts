import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/session';

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findUserIdByUsername(usernameParam: string) {
  const user = await User.findOne({
    username: { $regex: new RegExp(`^${escapeRegex(usernameParam)}$`, 'i') },
  })
    .select('_id username')
    .lean();
  return user ? { id: user._id.toString(), username: (user as any).username as string } : null;
}

export async function POST(_request: Request, { params }: { params: { username: string } }) {
  try {
    const currentUser = await requireAuth();
    const usernameParam = typeof params.username === 'string' ? params.username.trim() : '';
    if (!usernameParam) {
      return NextResponse.json({ error: '用户名无效' }, { status: 400 });
    }

    await dbConnect();
    const target = await findUserIdByUsername(usernameParam);
    if (!target) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (target.id === currentUser.id) {
      return NextResponse.json({ error: '不能关注自己' }, { status: 400 });
    }

    let createdNewFollow = false;
    try {
      await Follow.create({ followerId: currentUser.id, followingId: target.id });
      createdNewFollow = true;
    } catch (err: any) {
      // Duplicate key => already following
      if (err?.code !== 11000) throw err;
    }

    // Notificar al usuario seguido (solo si fue un follow nuevo)
    if (createdNewFollow) {
      try {
        const followerName = typeof (currentUser as any).name === 'string' ? ((currentUser as any).name as string) : 'Alguien';
        await Notification.create({
          userId: target.id,
          title: 'Nuevo seguidor',
          message: `${followerName} empezó a seguirte.`,
          href: `/perfil/${encodeURIComponent(followerName)}`,
          type: 'INFO',
        });
      } catch (err) {
        // No bloqueamos el follow si falla la notificación
        console.error('Error creating follow notification:', err);
      }
    }

    const followersCount = await Follow.countDocuments({ followingId: target.id });
    return NextResponse.json({ following: true, followersCount });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    console.error('Error following user:', error);
    return NextResponse.json({ error: '关注用户失败' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { username: string } }) {
  try {
    const currentUser = await requireAuth();
    const usernameParam = typeof params.username === 'string' ? params.username.trim() : '';
    if (!usernameParam) {
      return NextResponse.json({ error: '用户名无效' }, { status: 400 });
    }

    await dbConnect();
    const target = await findUserIdByUsername(usernameParam);
    if (!target) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    await Follow.deleteOne({ followerId: currentUser.id, followingId: target.id });

    const followersCount = await Follow.countDocuments({ followingId: target.id });
    return NextResponse.json({ following: false, followersCount });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    console.error('Error unfollowing user:', error);
    return NextResponse.json({ error: '取消关注用户失败' }, { status: 500 });
  }
}
