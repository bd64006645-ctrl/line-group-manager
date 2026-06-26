import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db-types';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const eventType = searchParams.get('event_type');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    const client = getDb();
    let query = client
      .from('event_logs')
      .select('id, group_id, event_type, actor_line_user_id, actor_name, content, created_at, line_groups(group_name)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (admin.role !== 'super_admin') {
      // Get agent's group IDs
      const { data: groups } = await client
        .from('line_groups')
        .select('id')
        .eq('agent_id', admin.id);
      if (groups) {
        const groupIds = groups.map((g: { id: string }) => g.id);
        if (groupIds.length > 0) {
          query = query.in('group_id', groupIds);
        }
      }
    }

    if (groupId) query = query.eq('group_id', groupId);
    if (eventType) query = query.eq('event_type', eventType);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        page_size: pageSize,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
