import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: admin });
  } catch (e) {
    const message = e instanceof Error ? e.message : '获取用户信息失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
