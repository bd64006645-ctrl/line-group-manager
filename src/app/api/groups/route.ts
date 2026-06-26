import { NextRequest, NextResponse } from 'next/server';
import { getDb, type LineGroup } from '@/lib/db-types';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getDb();
    let query = client
      .from('line_groups')
      .select('id, line_group_id, group_name, agent_id, is_active, member_count, created_at, updated_at, admins(display_name)')
      .order('created_at', { ascending: false });

    if (admin.role !== 'super_admin') {
      query = query.eq('agent_id', admin.id);
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
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const body = await request.json();
    const { line_group_id, group_name, line_channel_access_token, agent_id } = body as {
      line_group_id: string;
      group_name: string;
      line_channel_access_token?: string;
      agent_id?: string;
    };

    if (!line_group_id || !group_name) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    const targetAgentId = admin.role === 'super_admin' ? (agent_id || admin.id) : admin.id;

    const client = getDb();
    const { data, error } = await client
      .from('line_groups')
      .insert({
        line_group_id,
        group_name,
        agent_id: targetAgentId,
        line_channel_access_token: line_channel_access_token || null,
      })
      .select('id, line_group_id, group_name, agent_id, is_active, member_count, created_at')
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    // Auto-create default group settings
    const group = data as Pick<LineGroup, 'id'>;
    const { error: settingsError } = await client
      .from('group_settings')
      .insert({ group_id: group.id });

    if (settingsError) throw new Error(`创建默认设置失败: ${settingsError.message}`);

    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
