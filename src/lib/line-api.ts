// LINE Messaging API Client
// Reference: https://developers.line.biz/en/reference/messaging-api/

const LINE_API_BASE = 'https://api.line.me/v2/bot';

interface LineApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

function getHeaders(channelAccessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${channelAccessToken}`,
  };
}

// Reply message to a group/reply token
export async function replyMessage(
  channelAccessToken: string,
  replyToken: string,
  messages: Array<{ type: string; text: string }>
): Promise<LineApiResponse> {
  try {
    const res = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: 'POST',
      headers: getHeaders(channelAccessToken),
      body: JSON.stringify({ replyToken, messages }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { error: `LINE reply failed: ${err}` };
    }
    return { data: { success: true } };
  } catch (e) {
    return { error: `LINE reply error: ${e}` };
  }
}

// Push message to a group
export async function pushMessage(
  channelAccessToken: string,
  groupId: string,
  messages: Array<{ type: string; text: string }>
): Promise<LineApiResponse> {
  try {
    const res = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: getHeaders(channelAccessToken),
      body: JSON.stringify({ to: groupId, messages }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { error: `LINE push failed: ${err}` };
    }
    return { data: { success: true } };
  } catch (e) {
    return { error: `LINE push error: ${e}` };
  }
}

// Unsend (delete) a message
export async function unsendMessage(
  channelAccessToken: string,
  messageId: string
): Promise<LineApiResponse> {
  try {
    const res = await fetch(`${LINE_API_BASE}/message/${messageId}`, {
      method: 'DELETE',
      headers: getHeaders(channelAccessToken),
    });
    if (!res.ok) {
      const err = await res.text();
      return { error: `LINE unsend failed: ${err}` };
    }
    return { data: { success: true } };
  } catch (e) {
    return { error: `LINE unsend error: ${e}` };
  }
}

// Kick a member from a group
export async function kickMember(
  channelAccessToken: string,
  groupId: string,
  userId: string
): Promise<LineApiResponse> {
  try {
    const res = await fetch(
      `${LINE_API_BASE}/group/${groupId}/member/${userId}`,
      {
        method: 'DELETE',
        headers: getHeaders(channelAccessToken),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return { error: `LINE kick failed: ${err}` };
    }
    return { data: { success: true } };
  } catch (e) {
    return { error: `LINE kick error: ${e}` };
  }
}

// Get group member profile
export async function getMemberProfile(
  channelAccessToken: string,
  groupId: string,
  userId: string
): Promise<LineApiResponse<{ displayName: string; userId: string }>> {
  try {
    const res = await fetch(
      `${LINE_API_BASE}/group/${groupId}/member/${userId}`,
      {
        method: 'GET',
        headers: getHeaders(channelAccessToken),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return { error: `LINE get profile failed: ${err}` };
    }
    const data = await res.json();
    return { data: { displayName: data.displayName, userId: data.userId } };
  } catch (e) {
    return { error: `LINE get profile error: ${e}` };
  }
}

// Get group summary
export async function getGroupSummary(
  channelAccessToken: string,
  groupId: string
): Promise<LineApiResponse<{ groupId: string; groupName: string; pictureUrl: string }>> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      method: 'GET',
      headers: getHeaders(channelAccessToken),
    });
    if (!res.ok) {
      const err = await res.text();
      return { error: `LINE get group summary failed: ${err}` };
    }
    const data = await res.json();
    return { data };
  } catch (e) {
    return { error: `LINE get group summary error: ${e}` };
  }
}
