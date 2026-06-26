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
import { Shield, Plus, Trash2, Loader2, UserCheck, UserX } from 'lucide-react';

interface Admin {
  id: string;
  username: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', display_name: '', role: 'agent' });
  const [submitting, setSubmitting] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) loadAdmins();
  }, [user]);

  const loadAdmins = async () => {
    try {
      const res = await fetch('/api/admins', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setAdmins(data.data || []);
    } catch { /* empty */ }
    setLoadingData(false);
  };

  const handleAdd = async () => {
    if (!newAdmin.username || !newAdmin.password || !newAdmin.display_name) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admins', { method: 'POST', headers, body: JSON.stringify(newAdmin) });
      const data = await res.json();
      if (data.success) {
        setShowAdd(false);
        setNewAdmin({ username: '', password: '', display_name: '', role: 'agent' });
        loadAdmins();
      }
    } catch { /* empty */ }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (id === user?.id) return;
    if (!confirm('确定删除此管理员？')) return;
    try {
      await fetch(`/api/admins/${id}`, { method: 'DELETE', headers });
      loadAdmins();
    } catch { /* empty */ }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch(`/api/admins/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ is_active: !currentActive }),
      });
      loadAdmins();
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
          <h1 className="text-2xl font-bold text-[#2D3436]">代理管理</h1>
          <p className="text-sm text-[#636E72] mt-1">管理管理员和代理人账号</p>
        </div>
        {user?.role === 'super_admin' && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="bg-[#06C755] hover:bg-[#05b04c] text-white">
                <Plus className="w-4 h-4 mr-2" />
                添加代理
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加新代理/管理员</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    placeholder="登录用户名"
                    value={newAdmin.username}
                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <Input
                    type="password"
                    placeholder="登录密码"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>显示名称</Label>
                  <Input
                    placeholder="在系统中显示的名称"
                    value={newAdmin.display_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, display_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>角色</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  >
                    <option value="agent">代理</option>
                    <option value="super_admin">超级管理员</option>
                  </select>
                </div>
                <Button onClick={handleAdd} className="w-full bg-[#06C755] hover:bg-[#05b04c] text-white" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {submitting ? '创建中...' : '创建'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <Card key={admin.id} className="border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${admin.role === 'super_admin' ? 'bg-[#74B9FF]/10' : 'bg-[#06C755]/10'}`}>
                      <Shield className={`w-5 h-5 ${admin.role === 'super_admin' ? 'text-[#74B9FF]' : 'text-[#06C755]'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#2D3436]">{admin.display_name}</h3>
                      <p className="text-xs text-[#636E72]">@{admin.username}</p>
                    </div>
                  </div>
                  <Badge variant={admin.is_active ? 'default' : 'secondary'} className={admin.is_active ? 'bg-[#00B894]/10 text-[#00B894] hover:bg-[#00B894]/20' : 'bg-[#E17055]/10 text-[#E17055] hover:bg-[#E17055]/20'}>
                    {admin.is_active ? '活跃' : '停用'}
                  </Badge>
                </div>

                <div className="mb-4">
                  <Badge variant="outline" className={admin.role === 'super_admin' ? 'border-[#74B9FF] text-[#74B9FF]' : ''}>
                    {admin.role === 'super_admin' ? '超级管理员' : '代理'}
                  </Badge>
                </div>

                {user?.role === 'super_admin' && admin.id !== user.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleToggleActive(admin.id, admin.is_active)}
                    >
                      {admin.is_active ? <UserX className="w-3.5 h-3.5 mr-1.5" /> : <UserCheck className="w-3.5 h-3.5 mr-1.5" />}
                      {admin.is_active ? '停用' : '启用'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#E17055] hover:text-[#E17055] hover:bg-[#E17055]/10"
                      onClick={() => handleDelete(admin.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
