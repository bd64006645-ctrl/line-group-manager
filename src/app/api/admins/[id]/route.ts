import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-types';
import { getAdminFromRequest, hashPassword } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id } = await params;
    if (admin.role !== 'super_admin' && admin.id !== id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const { display_name, password, role, is_active } = body as {
      display_name?: string;
      password?: string;
      role?: string;
      is_active?: boolean;
    };

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (display_name) updateData.display_name = display_name;
    if (password) updateData.password_hash = await hashPassword(password);
    if (role && admin.role === 'super_admin') updateData.role = role;
    if (is_active !== undefined && admin.role === 'super_admin') updateData.is_active = is_active;

    const client = getDb();
    const { data, error } = await client
      .from('admins')
      .update(updateData)
      .eq('id', id)
      .select('id, username, display_name, role, is_active, updated_at')
      .single();

    if (error) throw new Error(`更新失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin || admin.role !== 'super_admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const client = getDb();
    const { error } = await client.from('admins').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
