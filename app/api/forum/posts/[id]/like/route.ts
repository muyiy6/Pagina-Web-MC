import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import { requireAuth } from '@/lib/session';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const post = await ForumPost.findById(params.id).select('likesCount likedBy');
    if (!post) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    const liked = Array.isArray(post.likedBy) ? post.likedBy.includes(user.id) : false;
    return NextResponse.json({ likesCount: post.likesCount || 0, liked });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    console.error('Error fetching forum like status:', error);
    return NextResponse.json({ error: '获取点赞状态失败' }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const existing = await ForumPost.findById(params.id).select('likedBy');
    if (!existing) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    const alreadyLiked = Array.isArray(existing.likedBy) && existing.likedBy.includes(user.id);

    const update = alreadyLiked
      ? { $pull: { likedBy: user.id }, $inc: { likesCount: -1 } }
      : { $addToSet: { likedBy: user.id }, $inc: { likesCount: 1 } };

    const updated = await ForumPost.findByIdAndUpdate(params.id, update, { returnDocument: 'after' }).select(
      'likesCount likedBy'
    );

    if (!updated) {
      return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
    }

    const liked = Array.isArray(updated.likedBy) ? updated.likedBy.includes(user.id) : false;
    const likesCount = Math.max(0, updated.likesCount || 0);

    return NextResponse.json({ likesCount, liked });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    console.error('Error toggling forum like:', error);
    return NextResponse.json({ error: '更新点赞失败' }, { status: 500 });
  }
}
