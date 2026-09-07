import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireOwner } from '@/lib/session';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  userId: z.string().min(1),
  adminSections: z.array(z.string()).default([]),
  adminSectionsConfigured: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireOwner();
    await dbConnect();

    const admins = await User.find({ role: 'ADMIN' })
      .select('username email role adminSections adminSectionsConfigured')
      .sort({ username: 1 })
      .lean();

    return NextResponse.json(
      admins.map((u: any) => ({
        _id: String(u._id),
        username: u.username,
        email: u.email,
        role: u.role,
        adminSections: Array.isArray(u.adminSections) ? u.adminSections : [],
        adminSectionsConfigured: Boolean(u.adminSectionsConfigured),
      }))
    );
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required') {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }
    return NextResponse.json({ error: '获取权限失败' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireOwner();
    const body = await request.json();
    const data = patchSchema.parse(body);
    await dbConnect();

    const configured = data.adminSectionsConfigured ?? true;

    const updated = await User.findByIdAndUpdate(
      data.userId,
      {
        $set: {
          adminSections: data.adminSections,
          adminSectionsConfigured: configured,
        },
      },
      { returnDocument: 'after' }
    )
      .select('username adminSections adminSectionsConfigured')
      .lean();

    if (!updated) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      user: {
        _id: String((updated as any)._id),
        username: (updated as any).username,
        adminSections: Array.isArray((updated as any).adminSections) ? (updated as any).adminSections : [],
        adminSectionsConfigured: Boolean((updated as any).adminSectionsConfigured),
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Owner access required') {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: '数据无效', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: '更新权限失败' }, { status: 500 });
  }
}
