import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface Admin {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface LineGroup {
  id: string;
  line_group_id: string;
  group_name: string;
  agent_id: string;
  line_channel_access_token: string | null;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface GroupSettings {
  id: string;
  group_id: string;
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
  created_at: string;
  updated_at: string | null;
}

export interface SensitiveWord {
  id: string;
  group_id: string;
  word: string;
  created_at: string;
}

export interface WhitelistMember {
  id: string;
  group_id: string;
  line_user_id: string;
  display_name: string | null;
  created_at: string;
}

export interface MessageCache {
  id: string;
  group_id: string;
  line_message_id: string;
  sender_line_user_id: string;
  sender_name: string | null;
  content_type: string;
  content_text: string | null;
  created_at: string;
}

export interface MemberNameCache {
  id: string;
  group_id: string;
  line_user_id: string;
  display_name: string;
  created_at: string;
  updated_at: string | null;
}

export interface EventLog {
  id: string;
  group_id: string | null;
  event_type: string;
  actor_line_user_id: string | null;
  actor_name: string | null;
  content: string | null;
  created_at: string;
}

export function getDb() {
  return getSupabaseClient();
}
