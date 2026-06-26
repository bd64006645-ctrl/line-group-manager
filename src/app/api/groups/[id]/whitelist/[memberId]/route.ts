import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db-types';
import { getAdminFromRequest } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id, memberId } = await params;
    const client = getDb();

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

    const { error } = await client
      .from('whitelist_members')
      .delete()
      .eq('id', memberId)
      .eq('group_id', id);

    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
