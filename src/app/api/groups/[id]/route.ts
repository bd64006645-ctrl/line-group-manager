import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-types';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id } = await params;
    const client = getDb();
    const { data, error } = await client
      .from('line_groups')
      .select('id, line_group_id, group_name, agent_id, line_channel_access_token, is_active, member_count, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ error: '群组不存在' }, { status: 404 });

    const group = data as { agent_id: string };
    if (admin.role !== 'super_admin' && group.agent_id !== admin.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { group_name, line_channel_access_token, is_active } = body as {
      group_name?: string;
      line_channel_access_token?: string;
      is_active?: boolean;
    };

    const client = getDb();

    // Check permission
    const { data: existing } = await client
      .from('line_groups')
      .select('agent_id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return NextResponse.json({ error: '群组不存在' }, { status: 404 });
    const existingGroup = existing as { agent_id: string };
    if (admin.role !== 'super_admin' && existingGroup.agent_id !== admin.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (group_name) updateData.group_name = group_name;
    if (line_channel_access_token !== undefined) updateData.line_channel_access_token = line_channel_access_token;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await client
      .from('line_groups')
      .update(updateData)
      .eq('id', id)
      .select('id, line_group_id, group_name, agent_id, is_active, member_count, updated_at')
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
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { id } = await params;
    const client = getDb();
    const { error } = await client.from('line_groups').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
