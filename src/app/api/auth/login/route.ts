import { NextRequest, NextResponse } from 'next/server';
import { getDb, type Admin } from '@/lib/db-types';
import { verifyPassword, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    const client = getDb();
    const { data, error } = await client
      .from('admins')
      .select('id, username, password_hash, display_name, role, is_active')
      .eq('username', username)
      .maybeSingle();

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const admin = data as Pick<Admin, 'id' | 'username' | 'password_hash' | 'display_name' | 'role' | 'is_active'>;
    if (!admin.is_active) {
      return NextResponse.json({ error: '账户已被禁用' }, { status: 403 });
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const token = await createToken({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      display_name: admin.display_name,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          display_name: admin.display_name,
          role: admin.role,
        },
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '登录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
