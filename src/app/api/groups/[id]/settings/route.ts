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

    // Check group permission
    const { data: group } = await client
      .from('line_groups')
      .select('agent_id')
      .eq('id', id)
      .maybeSingle();
    if (!group) return NextResponse.json({ error: '群组不存在' }, { status: 404 });
    const g = group as { agent_id: string };
    if (admin.role !== 'super_admin' && g.agent_id !== admin.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { data, error } = await client
      .from('group_settings')
      .select('*')
      .eq('group_id', id)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
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
    const client = getDb();

    // Check group permission
    const { data: group } = await client
      .from('line_groups')
      .select('agent_id')
      .eq('id', id)
      .maybeSingle();
    if (!group) return NextResponse.json({ error: '群组不存在' }, { status: 404 });
    const g = group as { agent_id: string };
    if (admin.role !== 'super_admin' && g.agent_id !== admin.id) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const allowedFields = [
      'notify_join_enabled', 'notify_leave_enabled', 'notify_rename_enabled',
      'notify_unsend_enabled', 'mute_enabled', 'mute_start_hour', 'mute_start_minute',
      'mute_end_hour', 'mute_end_minute', 'keyword_defense_enabled'
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Upsert: if settings don't exist yet, create them
    const { data: existing } = await client
      .from('group_settings')
      .select('id')
      .eq('group_id', id)
      .maybeSingle();

    let data, error;
    if (existing) {
      const result = await client
        .from('group_settings')
        .update(updateData)
        .eq('group_id', id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      const result = await client
        .from('group_settings')
        .insert({ group_id: id, ...updateData })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw new Error(`更新失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
