import { NextResponse } from 'next/server';
import { getServerStatus } from '@/lib/minecraft';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host') || process.env.MINECRAFT_SERVER_IP || 'localhost';
    const port = parseInt(searchParams.get('port') || process.env.MINECRAFT_SERVER_PORT || '25565');
    
    const status = await getServerStatus(host, port);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Server status error:', error);
    return NextResponse.json(
      { error: '获取服务器状态失败' },
      { status: 500 }
    );
  }
}

// Disable caching for real-time status
export const revalidate = 0;
