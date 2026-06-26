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
      .from('sensitive_words')
      .select('id, group_id, word, created_at')
      .eq('group_id', id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { word } = body as { word: string };
    if (!word) return NextResponse.json({ error: '缺少敏感词' }, { status: 400 });

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
      .from('sensitive_words')
      .insert({ group_id: id, word })
      .select('id, group_id, word, created_at')
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '创建失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
