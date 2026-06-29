'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { RefreshCw, Bug, Copy, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface WebhookLog {
  id: string;
  event_type: string;
  group_id: string | null;
  user_id: string | null;
  raw_payload: Record<string, unknown>;
  status: string;
  detail: string | null;
  created_at: string;
}

export default function WebhookDebugPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/webhook/debug?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLogs(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="default">已接收</Badge>;
      case 'executed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />已执行</Badge>;
      case 'skipped':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />已跳过</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />错误</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      message: '消息',
      unsend: '撤回',
      join: '加入',
      leave: '离开',
      memberJoined: '成员加入',
      memberLeft: '成员离开',
      followed: '关注',
      unfollowed: '取消关注',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="w-6 h-6" />
            Webhook 调试日志
          </h1>
          <p className="text-muted-foreground mt-1">
            查看 LINE 推送的所有 Webhook 事件，用于排查群 ID 关联问题
          </p>
        </div>
        <Button onClick={fetchLogs} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <h3 className="font-semibold text-blue-900 mb-2">如何使用此页面</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>确保 LINE Bot 已加入目标群组</li>
            <li>在 LINE 群内发送一条消息，或让成员加入/退出</li>
            <li>查看下方日志，找到状态为「已跳过」的事件</li>
            <li>复制其中的 <code className="bg-blue-100 px-1 rounded">group_id</code>（真实的 LINE 群 ID）</li>
            <li>前往「群组管理」页面，编辑对应群组，将 LINE 群 ID 更新为复制的值</li>
            <li>确保环境变量 <code className="bg-blue-100 px-1 rounded">LINE_CHANNEL_ACCESS_TOKEN</code> 已配置</li>
          </ol>
        </CardContent>
      </Card>

      {logs.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无 Webhook 事件记录</p>
            <p className="text-sm mt-2">
              请确保已在 LINE Developers Console 中配置 Webhook URL，<br />
              并在 LINE 群内发送消息触发事件。
            </p>
            <p className="text-sm mt-2 font-mono bg-gray-100 inline-block px-3 py-1 rounded">
              Webhook URL: {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/line
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {logs.map((log) => (
          <Card key={log.id} className="overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">
                    {getEventTypeLabel(log.event_type)}
                  </Badge>
                  {getStatusBadge(log.status)}
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Group ID:</span>
                  {log.group_id ? (
                    <>
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                        {log.group_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyToClipboard(log.group_id!, log.id)}
                      >
                        {copiedId === log.id ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">User ID:</span>
                  {log.user_id ? (
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">
                      {log.user_id}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </div>
              {log.detail && (
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">详情: </span>
                  <span className={log.status === 'error' ? 'text-red-600' : 'text-amber-600'}>
                    {log.detail}
                  </span>
                </div>
              )}
              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  查看原始 Payload
                </summary>
                <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto max-h-40">
                  {JSON.stringify(log.raw_payload, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
