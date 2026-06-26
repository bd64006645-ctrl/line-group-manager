import { NextRequest, NextResponse } from 'next/server';
import { getDb, type Admin } from '@/lib/db-types';
import { getAdminFromRequest, hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getDb();
    let query = client.from('admins').select('id, username, display_name, role, is_active, created_at, updated_at').order('created_at', { ascending: false });

    if (admin.role !== 'super_admin') {
      query = query.eq('id', admin.id);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin || admin.role !== 'super_admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, display_name, role } = body as {
      username: string;
      password: string;
      display_name: string;
      role: string;
    };

    if (!username || !password || !display_name) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const password_hash = await hashPassword(password);
    const client = getDb();
    const { data, error } = await client
      .from('admins')
      .insert({ username, password_hash, display_name, role: role || 'agent' })
      .select('id, username, display_name, role, is_active, created_at')
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
