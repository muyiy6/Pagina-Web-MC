import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import TicketReply from '@/models/TicketReply';
import Notification from '@/models/Notification';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const ticket = await Ticket.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: '工单不存在' }, { status: 404 });
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'STAFF' || user.role === 'OWNER';
    if (!isStaff && ticket.userId !== user.id) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    const replies = await TicketReply.find({ ticketId: params.id }).sort({ createdAt: 1 });

    return NextResponse.json({ ticket, replies });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    console.error('Error fetching ticket details:', error);
    return NextResponse.json({ error: '获取工单失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    await dbConnect();

    const ticket = await Ticket.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: '工单不存在' }, { status: 404 });
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'STAFF' || user.role === 'OWNER';
    const isOwner = ticket.userId === user.id;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }

    if (body?.action === 'close') {
      ticket.status = 'CLOSED';
      await ticket.save();

      if (isStaff && ticket.userId && ticket.userId !== user.id) {
        await Notification.create({
          userId: String(ticket.userId),
          title: 'Ticket cerrado',
          message: '工作人员已关闭你的工单。如仍需帮助，可新建工单。',
          href: '/soporte',
          type: 'WARNING',
        });
      }

      return NextResponse.json(ticket);
    }

    return NextResponse.json({ error: '操作无效' }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: '更新工单失败' }, { status: 500 });
  }
}
