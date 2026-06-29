'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Loader2, Save } from 'lucide-react';

interface GroupSettings {
  notify_join_enabled: boolean;
  notify_leave_enabled: boolean;
  notify_rename_enabled: boolean;
  notify_unsend_enabled: boolean;
  mute_enabled: boolean;
  mute_start_hour: number;
  mute_start_minute: number;
  mute_end_hour: number;
  mute_end_minute: number;
  keyword_defense_enabled: boolean;
}

interface SensitiveWord {
  id: string;
  word: string;
  created_at: string;
}

interface WhitelistMember {
  id: string;
  line_user_id: string;
  display_name: string | null;
  created_at: string;
}

export default function GroupDetailPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [settings, setSettings] = useState<GroupSettings>({
    notify_join_enabled: true,
    notify_leave_enabled: true,
    notify_rename_enabled: true,
    notify_unsend_enabled: true,
    mute_enabled: false,
    mute_start_hour: 20,
    mute_start_minute: 0,
    mute_end_hour: 8,
    mute_end_minute: 0,
    keyword_defense_enabled: false,
  });
  const [sensitiveWords, setSensitiveWords] = useState<SensitiveWord[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistMember[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newWhitelist, setNewWhitelist] = useState({ line_user_id: '', display_name: '' });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [group, setGroup] = useState<{ id: string; group_name: string; line_group_id: string }>({
    id: '',
    group_name: '',
    line_group_id: '',
  });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  const loadAll = useCallback(async () => {
    try {
      const [groupRes, settingsRes, wordsRes, whitelistRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/groups/${groupId}/settings`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/groups/${groupId}/sensitive-words`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/groups/${groupId}/whitelist`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const groupData = await groupRes.json();
      const settingsData = await settingsRes.json();
      const wordsData = await wordsRes.json();
      const whitelistData = await whitelistRes.json();

      if (groupData.success && groupData.data) {
        setGroup({
          id: groupData.data.id,
          group_name: groupData.data.group_name,
          line_group_id: groupData.data.line_group_id,
        });
      }
      if (settingsData.success && settingsData.data) setSettings(settingsData.data);
      if (wordsData.success) setSensitiveWords(wordsData.data || []);
      if (whitelistData.success) setWhitelist(whitelistData.data || []);
    } catch { /* empty */ }
    setLoadingData(false);
  }, [groupId, token]);

  useEffect(() => {
    if (user) loadAll();
  }, [user, loadAll]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (result.success) {
        setSaveMessage('设置已保存');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch { /* empty */ }
    setSaving(false);
  };

  const handleSaveGroup = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          group_name: group.group_name,
          line_group_id: group.line_group_id,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSaveMessage('基本信息已保存');
        setTimeout(() => setSaveMessage(''), 2000);
      }
    } catch { /* empty */ }
    setSaving(false);
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/sensitive-words`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ word: newWord.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSensitiveWords(prev => [data.data, ...prev]);
        setNewWord('');
      }
    } catch { /* empty */ }
  };

  const handleDeleteWord = async (wordId: string) => {
    try {
      await fetch(`/api/groups/${groupId}/sensitive-words/${wordId}`, { method: 'DELETE', headers });
      setSensitiveWords(prev => prev.filter(w => w.id !== wordId));
    } catch { /* empty */ }
  };

  const handleAddWhitelist = async () => {
    if (!newWhitelist.line_user_id.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/whitelist`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newWhitelist),
      });
      const data = await res.json();
      if (data.success) {
        setWhitelist(prev => [data.data, ...prev]);
        setNewWhitelist({ line_user_id: '', display_name: '' });
      }
    } catch { /* empty */ }
  };

  const handleDeleteWhitelist = async (memberId: string) => {
    try {
      await fetch(`/api/groups/${groupId}/whitelist/${memberId}`, { method: 'DELETE', headers });
      setWhitelist(prev => prev.filter(w => w.id !== memberId));
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/groups')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#2D3436]">群组配置</h1>
          <p className="text-sm text-[#636E72] mt-1">管理群组的通知、禁言和关键词设置</p>
        </div>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-[#06C755] border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
      {/* Group Basic Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>群组名称</Label>
              <Input
                value={group.group_name}
                onChange={(e) => setGroup({ ...group, group_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>
                LINE 群 ID
                <span className="text-xs text-muted-foreground ml-2">
                  (从 Webhook 调试页面获取真实群 ID)
                </span>
              </Label>
              <Input
                value={group.line_group_id}
                onChange={(e) => setGroup({ ...group, line_group_id: e.target.value })}
                placeholder="C1a2b3c4d5e6f7890abcdef..."
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveGroup} disabled={saving}>
              {saving ? '保存中...' : '保存基本信息'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="settings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="settings">通知与禁言</TabsTrigger>
            <TabsTrigger value="keywords">敏感词 ({sensitiveWords.length})</TabsTrigger>
            <TabsTrigger value="whitelist">白名单 ({whitelist.length})</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">通知设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'notify_join_enabled', label: '新人入群通知' },
                    { key: 'notify_leave_enabled', label: '成员退群通知' },
                    { key: 'notify_rename_enabled', label: '改名行为通知' },
                    { key: 'notify_unsend_enabled', label: '撤回讯息通知' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FA]">
                      <Label className="text-sm">{item.label}</Label>
                      <Switch
                        checked={settings[item.key as keyof GroupSettings] as boolean}
                        onCheckedChange={(checked) => setSettings({ ...settings, [item.key]: checked })}
                      />
                    </div>
                  ))}
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-base font-semibold mb-4">关键词防御</h3>
                  <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${settings.keyword_defense_enabled ? 'border-[#E17055] bg-[#E17055]/5' : 'bg-[#F8F9FA] border-transparent'}`}>
                    <div>
                      <Label className="text-sm font-medium">启用关键词防御</Label>
                      <p className="text-xs text-[#636E72] mt-1">开启后，检测到敏感词时自动撤回消息并踢出成员。需在下方「敏感词」标签页添加敏感词。</p>
                    </div>
                    <Switch
                      checked={settings.keyword_defense_enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, keyword_defense_enabled: checked })}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-base font-semibold mb-4">定时禁言</h3>
                  <div className={`flex items-center justify-between p-3 rounded-lg border-2 mb-4 ${settings.mute_enabled ? 'border-[#FDCB6E] bg-[#FDCB6E]/5' : 'bg-[#F8F9FA] border-transparent'}`}>
                    <div>
                      <Label className="text-sm font-medium">启用禁言</Label>
                      <p className="text-xs text-[#636E72] mt-1">禁言时段内非白名单成员发言将被自动撤回（仅撤回，不踢人）</p>
                    </div>
                    <Switch
                      checked={settings.mute_enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, mute_enabled: checked })}
                    />
                  </div>

                  {settings.mute_enabled && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">禁言开始 (时)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={settings.mute_start_hour}
                          onChange={(e) => setSettings({ ...settings, mute_start_hour: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">禁言开始 (分)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          value={settings.mute_start_minute}
                          onChange={(e) => setSettings({ ...settings, mute_start_minute: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">禁言结束 (时)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={settings.mute_end_hour}
                          onChange={(e) => setSettings({ ...settings, mute_end_hour: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">禁言结束 (分)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={59}
                          value={settings.mute_end_minute}
                          onChange={(e) => setSettings({ ...settings, mute_end_minute: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveSettings} className="bg-[#06C755] hover:bg-[#05b04c] text-white" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    保存设置
                  </Button>
                  {saveMessage && <span className="text-sm text-[#06C755] font-medium">{saveMessage}</span>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords Tab */}
          <TabsContent value="keywords">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">敏感词列表</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="输入敏感词..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                  />
                  <Button onClick={handleAddWord} className="bg-[#06C755] hover:bg-[#05b04c] text-white">
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>

                {sensitiveWords.length === 0 ? (
                  <p className="text-sm text-[#636E72] text-center py-8">暂无敏感词</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sensitiveWords.map((w) => (
                      <Badge key={w.id} variant="secondary" className="px-3 py-1.5 gap-2 bg-[#E17055]/10 text-[#E17055] hover:bg-[#E17055]/20">
                        {w.word}
                        <button onClick={() => handleDeleteWord(w.id)} className="hover:text-[#d63031]">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Whitelist Tab */}
          <TabsContent value="whitelist">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">禁言白名单</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="LINE 用户 ID"
                    value={newWhitelist.line_user_id}
                    onChange={(e) => setNewWhitelist({ ...newWhitelist, line_user_id: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="显示名称（可选）"
                    value={newWhitelist.display_name}
                    onChange={(e) => setNewWhitelist({ ...newWhitelist, display_name: e.target.value })}
                    className="flex-1"
                  />
                  <Button onClick={handleAddWhitelist} className="bg-[#06C755] hover:bg-[#05b04c] text-white">
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>

                {whitelist.length === 0 ? (
                  <p className="text-sm text-[#636E72] text-center py-8">暂无白名单成员</p>
                ) : (
                  <div className="space-y-2">
                    {whitelist.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F8F9FA]">
                        <div>
                          <p className="text-sm font-medium">{m.display_name || '未命名'}</p>
                          <p className="text-xs text-[#636E72] font-mono">{m.line_user_id}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#E17055] hover:text-[#E17055] hover:bg-[#E17055]/10"
                          onClick={() => handleDeleteWhitelist(m.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </>
      )}
    </div>
  );
}
