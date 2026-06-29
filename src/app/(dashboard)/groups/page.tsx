'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, Plus, Settings, Trash2, Loader2 } from 'lucide-react';

interface Group {
  id: string;
  line_group_id: string;
  group_name: string;
  agent_id: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
  admins?: { display_name: string };
}

interface AdminOption {
  id: string;
  display_name: string;
}

export default function GroupsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newGroup, setNewGroup] = useState({ line_group_id: '', group_name: '', line_channel_access_token: '', agent_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      loadGroups();
      if (user.role === 'super_admin') loadAdmins();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setGroups(data.data || []);
    } catch { /* empty */ }
    setLoadingData(false);
  };

  const loadAdmins = async () => {
    try {
      const res = await fetch('/api/admins', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setAdmins(data.data || []);
    } catch { /* empty */ }
  };

  const handleAdd = async () => {
    if (!newGroup.line_group_id || !newGroup.group_name) return;
    setSubmitting(true);
    setAddError('');
    try {
      const body: Record<string, string> = {
        line_group_id: newGroup.line_group_id,
        group_name: newGroup.group_name,
      };
      if (newGroup.line_channel_access_token) body.line_channel_access_token = newGroup.line_channel_access_token;
      if (user?.role === 'super_admin' && newGroup.agent_id) body.agent_id = newGroup.agent_id;

      const res = await fetch('/api/groups', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setShowAdd(false);
        setNewGroup({ line_group_id: '', group_name: '', line_channel_access_token: '', agent_id: '' });
        loadGroups();
      } else {
        setAddError(data.error || '创建失败，请重试');
      }
    } catch {
      setAddError('网络请求失败，请重试');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此群组？相关配置将一并删除。')) return;
    try {
      await fetch(`/api/groups/${id}`, { method: 'DELETE', headers });
      loadGroups();
    } catch { /* empty */ }
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
          <h1 className="text-2xl font-bold text-[#2D3436]">群组管理</h1>
          <p className="text-sm text-[#636E72] mt-1">管理 LINE 群组及其配置</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-[#06C755] hover:bg-[#05b04c] text-white">
              <Plus className="w-4 h-4 mr-2" />
              添加群组
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加新群组</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>LINE Group ID</Label>
                <Input
                  placeholder="例如: C1234567890"
                  value={newGroup.line_group_id}
                  onChange={(e) => setNewGroup({ ...newGroup, line_group_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>群组名称</Label>
                <Input
                  placeholder="便于识别的名称"
                  value={newGroup.group_name}
                  onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Channel Access Token（可选）</Label>
                <Input
                  type="password"
                  placeholder="LINE Bot Channel Access Token"
                  value={newGroup.line_channel_access_token}
                  onChange={(e) => setNewGroup({ ...newGroup, line_channel_access_token: e.target.value })}
                />
              </div>
              {user?.role === 'super_admin' && admins.length > 0 && (
                <div className="space-y-2">
                  <Label>绑定代理</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newGroup.agent_id}
                    onChange={(e) => setNewGroup({ ...newGroup, agent_id: e.target.value })}
                  >
                    <option value="">选择代理</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>{a.display_name}</option>
                    ))}
                  </select>
                </div>
              )}
              {addError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                  {addError}
                </div>
              )}
              <Button onClick={handleAdd} className="w-full bg-[#06C755] hover:bg-[#05b04c] text-white" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {submitting ? '创建中...' : '创建群组'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-[#636E72]/30 mb-4" />
            <p className="text-[#636E72]">暂无群组</p>
            <p className="text-sm text-[#636E72]/60 mt-1">点击上方按钮添加第一个群组</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#06C755]/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-[#06C755]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#2D3436]">{group.group_name}</h3>
                      <p className="text-xs text-[#636E72] font-mono">{group.line_group_id}</p>
                    </div>
                  </div>
                  <Badge variant={group.is_active ? 'default' : 'secondary'} className={group.is_active ? 'bg-[#00B894]/10 text-[#00B894] hover:bg-[#00B894]/20' : ''}>
                    {group.is_active ? '活跃' : '停用'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm text-[#636E72] mb-4">
                  <div className="flex justify-between">
                    <span>绑定代理</span>
                    <span className="text-[#2D3436]">{(group.admins as { display_name: string } | undefined)?.display_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>成员数</span>
                    <span className="text-[#2D3436]">{group.member_count}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/groups/${group.id}`)}
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    配置
                  </Button>
                  {user?.role === 'super_admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#E17055] hover:text-[#E17055] hover:bg-[#E17055]/10"
                      onClick={() => handleDelete(group.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
