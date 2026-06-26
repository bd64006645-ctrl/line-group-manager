'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, Shield, AlertTriangle, ScrollText } from 'lucide-react';

interface DashboardStats {
  groups: number;
  admins: number;
  events: number;
  keywordBlocks: number;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ groups: 0, admins: 0, events: 0, keywordBlocks: 0 });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('line_admin_token')}` };

      const [groupsRes, adminsRes, eventsRes] = await Promise.all([
        fetch('/api/groups', { headers }),
        fetch('/api/admins', { headers }),
        fetch('/api/events?page_size=1000', { headers }),
      ]);

      const groupsData = await groupsRes.json();
      const adminsData = await adminsRes.json();
      const eventsData = await eventsRes.json();

      const events = eventsData.data || [];
      const keywordBlocks = events.filter((e: { event_type: string }) => e.event_type === 'keyword_block').length;

      setStats({
        groups: (groupsData.data || []).length,
        admins: (adminsData.data || []).length,
        events: eventsData.pagination?.total || 0,
        keywordBlocks,
      });
    } catch {
      // Silently handle
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full" />
      </div>
    );
  }

  const statCards = [
    { title: '管理群组', value: stats.groups, icon: MessageSquare, color: '#06C755', bg: '#06C755/10' },
    { title: '代理/管理员', value: stats.admins, icon: Shield, color: '#74B9FF', bg: '#74B9FF/10' },
    { title: '事件总数', value: stats.events, icon: ScrollText, color: '#FDCB6E', bg: '#FDCB6E/10' },
    { title: '关键词拦截', value: stats.keywordBlocks, icon: AlertTriangle, color: '#E17055', bg: '#E17055/10' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">总览</h1>
        <p className="text-sm text-[#636E72] mt-1">
          欢迎回来，{user?.display_name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#636E72]">{card.title}</p>
                  <p className="text-3xl font-bold text-[#2D3436] mt-1">{card.value}</p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${card.color}15` }}
                >
                  <card.icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-[#06C755]" />
              快速操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push('/groups')}
              className="w-full text-left px-4 py-3 rounded-lg bg-[#F8F9FA] hover:bg-[#06C755]/5 transition-colors text-sm"
            >
              管理群组配置
            </button>
            <button
              onClick={() => router.push('/admins')}
              className="w-full text-left px-4 py-3 rounded-lg bg-[#F8F9FA] hover:bg-[#06C755]/5 transition-colors text-sm"
            >
              管理代理账号
            </button>
            <button
              onClick={() => router.push('/events')}
              className="w-full text-left px-4 py-3 rounded-lg bg-[#F8F9FA] hover:bg-[#06C755]/5 transition-colors text-sm"
            >
              查看事件日志
            </button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#74B9FF]" />
              系统状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#636E72]">Webhook 状态</span>
              <span className="text-xs px-2 py-1 rounded-full bg-[#00B894]/10 text-[#00B894]">运行中</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#636E72]">当前角色</span>
              <span className="text-xs px-2 py-1 rounded-full bg-[#06C755]/10 text-[#06C755]">
                {user?.role === 'super_admin' ? '超级管理员' : '代理'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#636E72]">LINE Bot API</span>
              <span className="text-xs px-2 py-1 rounded-full bg-[#74B9FF]/10 text-[#74B9FF]">已配置</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
