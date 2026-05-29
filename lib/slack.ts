import { formatSlackText, parseRichTextBlocks, SlackBlock } from './formatSlackMessage'

export interface SlackMessage {
  id: string
  userName: string
  userImage: string | null
  text: string
  time: string
  timestamp: string
}

interface SlackHistoryMessage {
  type: string
  subtype?: string
  bot_id?: string
  user?: string
  text?: string
  ts: string
  thread_ts?: string
  blocks?: SlackBlock[]
}

// Module-level cache for user names within a single server process lifetime.
// Not guaranteed to persist across serverless invocations but reduces calls
// within a warm function instance.
const userNameCache = new Map<string, string>()

async function fetchUserName(userId: string, token: string): Promise<string> {
  if (userNameCache.has(userId)) {
    return userNameCache.get(userId)!
  }

  try {
    const res = await fetch(
      `https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }
    )
    const data = await res.json()
    if (data.ok && data.user) {
      const name: string =
        data.user.profile?.display_name ||
        data.user.profile?.real_name ||
        data.user.name ||
        userId
      userNameCache.set(userId, name)
      return name
    }
  } catch {
    // users:read scope may not be granted — fall through to ID fallback
  }

  userNameCache.set(userId, userId)
  return userId
}

function formatTime(ts: string): string {
  const ms = parseFloat(ts) * 1000
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function isDisplayableMessage(msg: SlackHistoryMessage): boolean {
  if (msg.subtype) return false
  if (msg.bot_id) return false
  if (!msg.text?.trim()) return false
  return true
}

export async function fetchSlackMessages(): Promise<SlackMessage[]> {
  const token = process.env.SLACK_BOT_TOKEN
  const channelId = process.env.SLACK_CHANNEL_ID
  const limitStr = process.env.SLACK_MESSAGE_LIMIT ?? '15'
  const limit = Math.min(Math.max(parseInt(limitStr, 10) || 15, 1), 50)

  if (!token) {
    console.error('[slack] SLACK_BOT_TOKEN is not set')
    throw new Error('SLACK_BOT_TOKEN is not configured')
  }
  if (!channelId) {
    console.error('[slack] SLACK_CHANNEL_ID is not set')
    throw new Error('SLACK_CHANNEL_ID is not configured')
  }

  const url = new URL('https://slack.com/api/conversations.history')
  url.searchParams.set('channel', channelId)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 30 },
  })

  const data = await res.json()

  if (!data.ok) {
    console.error('[slack] conversations.history error:', data.error)
    throw new Error('Slack API error')
  }

  const rawMessages: SlackHistoryMessage[] = data.messages ?? []
  const displayable = rawMessages.filter(isDisplayableMessage)

  // Collect unique user IDs and try to resolve names
  const userIds = Array.from(new Set(displayable.map((m) => m.user).filter(Boolean) as string[]))
  await Promise.all(userIds.map((id) => fetchUserName(id, token)))

  // Newest first
  const ordered = displayable

  return ordered.map((msg) => {
    const userId = msg.user ?? 'unknown'
    const userName = userNameCache.get(userId) ?? userId
    const richTextBlocks = msg.blocks?.filter(b => b.type === 'rich_text') ?? []
    const formattedText = richTextBlocks.length > 0
      ? parseRichTextBlocks(richTextBlocks, userNameCache)
      : formatSlackText(msg.text ?? '', userNameCache)

    return {
      id: msg.ts,
      userName,
      userImage: null,
      text: formattedText,
      time: formatTime(msg.ts),
      timestamp: msg.ts,
    }
  })
}
