import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Product from '@/models/Product';
import AdminLog from '@/models/AdminLog';
import { productSchema } from '@/lib/validations';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();
    
    const products = await Product.find().sort({ order: 1, createdAt: -1 });
    
    return NextResponse.json(products);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: '获取商品失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    
    const validatedData = productSchema.parse(body);
    
    await dbConnect();
    
    const product = await Product.create(validatedData);
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'CREATE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: product._id.toString(),
      meta: {
        name: product.name,
        price: product.price,
        category: product.category,
        path: '/api/admin/products',
        method: 'POST',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: '数据无效', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '创建商品失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const { productId, updates } = await request.json();
    
    await dbConnect();
    
    const product = await Product.findByIdAndUpdate(productId, updates, { returnDocument: 'after' });
    
    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'UPDATE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: productId,
      details: JSON.stringify(updates),
      meta: {
        updates,
        path: '/api/admin/products',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json(product);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: '更新商品失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    
    if (!productId) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
    }
    
    await dbConnect();
    
    const product = await Product.findByIdAndDelete(productId);
    
    if (!product) {
      return NextResponse.json({ error: '商品不存在' }, { status: 404 });
    }
    
    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: 'DELETE_PRODUCT',
      targetType: 'PRODUCT',
      targetId: productId,
      meta: {
        name: product.name,
        path: '/api/admin/products',
        method: 'DELETE',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json({ message: 'Producto eliminado' });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: '未授权' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: '删除商品失败' },
      { status: 500 }
    );
  }
}
