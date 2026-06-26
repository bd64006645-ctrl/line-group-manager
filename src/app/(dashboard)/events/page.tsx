'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventLog {
  id: string;
  group_id: string | null;
  event_type: string;
  actor_line_user_id: string | null;
  actor_name: string | null;
  content: string | null;
  created_at: string;
  line_groups?: { group_name: string } | null;
}

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

const eventTypeMap: Record<string, { label: string; color: string }> = {
  join: { label: '入群', color: '#00B894' },
  leave: { label: '退群', color: '#E17055' },
  rename: { label: '改名', color: '#74B9FF' },
  unsend: { label: '撤回', color: '#FDCB6E' },
  keyword_block: { label: '关键词拦截', color: '#E17055' },
  mute_block: { label: '禁言拦截', color: '#FDCB6E' },
};

export default function EventsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) loadEvents(1);
  }, [user, filterType]);

  const loadEvents = async (page: number) => {
    setLoadingData(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: '20' });
      if (filterType !== 'all') params.set('event_type', filterType);

      const res = await fetch(`/api/events?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setEvents(data.data || []);
        setPagination(data.pagination);
      }
    } catch { /* empty */ }
    setLoadingData(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3436]">事件日志</h1>
          <p className="text-sm text-[#636E72] mt-1">查看所有群组事件记录</p>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="筛选类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="join">入群</SelectItem>
            <SelectItem value="leave">退群</SelectItem>
            <SelectItem value="rename">改名</SelectItem>
            <SelectItem value="unsend">撤回</SelectItem>
            <SelectItem value="keyword_block">关键词拦截</SelectItem>
            <SelectItem value="mute_block">禁言拦截</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full" />
        </div>
      ) : events.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ScrollText className="w-12 h-12 text-[#636E72]/30 mb-4" />
            <p className="text-[#636E72]">暂无事件记录</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[#F8F9FA]">
                    <th className="text-left px-4 py-3 font-medium text-[#636E72]">时间</th>
                    <th className="text-left px-4 py-3 font-medium text-[#636E72]">群组</th>
                    <th className="text-left px-4 py-3 font-medium text-[#636E72]">类型</th>
                    <th className="text-left px-4 py-3 font-medium text-[#636E72]">成员</th>
                    <th className="text-left px-4 py-3 font-medium text-[#636E72]">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const typeInfo = eventTypeMap[event.event_type] || { label: event.event_type, color: '#636E72' };
                    return (
                      <tr key={event.id} className="border-b last:border-0 hover:bg-[#F8F9FA]/50">
                        <td className="px-4 py-3 text-[#636E72] whitespace-nowrap">
                          {new Date(event.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          {(event.line_groups as { group_name: string } | null | undefined)?.group_name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className="text-xs"
                            style={{ backgroundColor: `${typeInfo.color}15`, color: typeInfo.color }}
                          >
                            {typeInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[#2D3436]">
                          {event.actor_name || event.actor_line_user_id || '-'}
                        </td>
                        <td className="px-4 py-3 text-[#636E72] max-w-xs truncate">
                          {event.content || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#636E72]">
                共 {pagination.total} 条记录，第 {pagination.page}/{pagination.total_pages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadEvents(pagination.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => loadEvents(pagination.page + 1)}
                >
                  下一页
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
