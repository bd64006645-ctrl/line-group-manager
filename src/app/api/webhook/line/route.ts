import { NextRequest, NextResponse } from 'next/server';
import { getDb, type GroupSettings, type SensitiveWord, type WhitelistMember } from '@/lib/db-types';
import { pushMessage, unsendMessage, kickMember } from '@/lib/line-api';

// LINE Webhook Event Types
interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source: {
    type: string;
    groupId?: string;
    userId?: string;
  };
  message?: {
    id: string;
    type: string;
    text?: string;
  };
  unsend?: {
    messageId: string;
  };
  join?: {
    members: Array<{ userId: string }>;
  };
  leave?: {
    members: Array<{ userId: string }>;
  };
  timestamp: string;
}

function isMuteTime(settings: GroupSettings): boolean {
  if (!settings.mute_enabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = settings.mute_start_hour * 60 + settings.mute_start_minute;
  const endMinutes = settings.mute_end_hour * 60 + settings.mute_end_minute;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Cross midnight (e.g., 20:00 - 08:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function containsSensitiveWord(text: string, words: SensitiveWord[]): SensitiveWord | null {
  const lowerText = text.toLowerCase();
  for (const w of words) {
    if (lowerText.includes(w.word.toLowerCase())) {
      return w;
    }
  }
  return null;
}

function isWhitelisted(userId: string, whitelist: WhitelistMember[]): boolean {
  return whitelist.some(w => w.line_user_id === userId);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const events: LineWebhookEvent[] = body.events || [];
    const client = getDb();

    const results: Array<{ event: string; status: string; detail?: string }> = [];

    for (const event of events) {
      if (event.source.type !== 'group' || !event.source.groupId) {
        results.push({ event: event.type, status: 'skipped', detail: 'Not a group event' });
        continue;
      }

      const lineGroupId = event.source.groupId;

      // Find the group in our database
      const { data: groupData } = await client
        .from('line_groups')
        .select('id, group_name, line_channel_access_token')
        .eq('line_group_id', lineGroupId)
        .eq('is_active', true)
        .maybeSingle();

      if (!groupData) {
        results.push({ event: event.type, status: 'skipped', detail: 'Group not registered' });
        continue;
      }

      const group = groupData as { id: string; group_name: string; line_channel_access_token: string | null };
      const channelToken = group.line_channel_access_token || process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

      if (!channelToken) {
        results.push({ event: event.type, status: 'error', detail: 'No channel access token' });
        continue;
      }

      // Get group settings
      const { data: settingsData } = await client
        .from('group_settings')
        .select('*')
        .eq('group_id', group.id)
        .maybeSingle();

      const settings = (settingsData || {
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
      }) as GroupSettings;

      // Handle different event types
      switch (event.type) {
        case 'message': {
          if (event.message && event.message.text) {
            const userId = event.source.userId || '';
            const messageId = event.message.id;

            // Cache the message for unsend recovery
            await client.from('message_cache').insert({
              group_id: group.id,
              line_message_id: messageId,
              sender_line_user_id: userId,
              content_type: event.message.type,
              content_text: event.message.text,
            });

            // Keyword defense check
            if (settings.keyword_defense_enabled) {
              const { data: words } = await client
                .from('sensitive_words')
                .select('id, word')
                .eq('group_id', group.id);

              const sensitiveWords = (words || []) as SensitiveWord[];
              const matched = containsSensitiveWord(event.message.text, sensitiveWords);

              if (matched) {
                // Unsend the message
                await unsendMessage(channelToken, messageId);
                // Kick the member
                if (userId) {
                  await kickMember(channelToken, lineGroupId, userId);
                }
                // Log the event
                await client.from('event_logs').insert({
                  group_id: group.id,
                  event_type: 'keyword_block',
                  actor_line_user_id: userId,
                  content: `敏感词「${matched.word}」触发，消息已撤回，成员已踢出`,
                });
                results.push({ event: 'keyword_block', status: 'executed', detail: `Word: ${matched.word}` });
                break;
              }
            }

            // Mute time check
            if (isMuteTime(settings)) {
              const { data: whitelistData } = await client
                .from('whitelist_members')
                .select('line_user_id')
                .eq('group_id', group.id);

              const whitelist = (whitelistData || []) as WhitelistMember[];
              if (!isWhitelisted(userId, whitelist)) {
                await unsendMessage(channelToken, messageId);
                await client.from('event_logs').insert({
                  group_id: group.id,
                  event_type: 'mute_block',
                  actor_line_user_id: userId,
                  content: '禁言时段发言，消息已撤回',
                });
                results.push({ event: 'mute_block', status: 'executed' });
                break;
              }
            }

            results.push({ event: 'message', status: 'cached' });
          }
          break;
        }

        case 'unsend': {
          if (event.unsend && settings.notify_unsend_enabled) {
            const { data: cachedMsg } = await client
              .from('message_cache')
              .select('sender_name, content_text, content_type')
              .eq('line_message_id', event.unsend.messageId)
              .eq('group_id', group.id)
              .maybeSingle();

            const msg = cachedMsg as { sender_name: string | null; content_text: string | null; content_type: string } | null;
            const originalContent = msg?.content_text || '[图片/非文本消息]';
            const senderName = msg?.sender_name || '未知成员';

            await pushMessage(channelToken, lineGroupId, [{
              type: 'text',
              text: `【${group.group_name}】 撤回讯息提示：${senderName} 撤回了讯息，内容为：${originalContent}`,
            }]);

            await client.from('event_logs').insert({
              group_id: group.id,
              event_type: 'unsend',
              actor_line_user_id: event.source.userId,
              actor_name: senderName,
              content: `撤回内容: ${originalContent}`,
            });

            results.push({ event: 'unsend', status: 'notified' });
          }
          break;
        }

        case 'join': {
          if (settings.notify_join_enabled && event.join) {
            for (const member of event.join.members) {
              await pushMessage(channelToken, lineGroupId, [{
                type: 'text',
                text: `【${group.group_name}】 欢迎新成员 ${member.userId} 加入！`,
              }]);

              await client.from('event_logs').insert({
                group_id: group.id,
                event_type: 'join',
                actor_line_user_id: member.userId,
                content: '新成员加入群组',
              });
            }
            results.push({ event: 'join', status: 'notified' });
          }
          break;
        }

        case 'leave': {
          if (settings.notify_leave_enabled && event.leave) {
            for (const member of event.leave.members) {
              await pushMessage(channelToken, lineGroupId, [{
                type: 'text',
                text: `【${group.group_name}】 成员 ${member.userId} 已退出群组。`,
              }]);

              await client.from('event_logs').insert({
                group_id: group.id,
                event_type: 'leave',
                actor_line_user_id: member.userId,
                content: '成员退出群组',
              });
            }
            results.push({ event: 'leave', status: 'notified' });
          }
          break;
        }

        case 'follow':
        case 'unfollow':
        case 'postback':
        default:
          results.push({ event: event.type, status: 'ignored' });
          break;
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Webhook 处理失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
