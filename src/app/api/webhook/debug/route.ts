import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-types';
import { verifyToken } from '@/lib/auth';

// GET /api/webhook/debug - View recent webhook logs (for debugging)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const client = getDb();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await client
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
