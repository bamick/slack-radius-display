function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Slack sends pre-escaped &amp; &lt; &gt; in message text — decode first
function decodeSlackEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function unicodeToEmoji(unicode: string): string {
  try {
    return unicode.split('-').map(cp => String.fromCodePoint(parseInt(cp, 16))).join('')
  } catch {
    return ''
  }
}

// ── Rich text block types ──────────────────────────────────────────────────

interface RichTextElement {
  type: string
  text?: string
  name?: string
  unicode?: string
  user_id?: string
  url?: string
}

interface RichTextSection {
  type: string
  elements?: RichTextElement[]
}

export interface SlackBlock {
  type: string
  elements?: RichTextSection[]
}

function renderElement(el: RichTextElement, userNames: Map<string, string>): string {
  switch (el.type) {
    case 'text':
      return escapeHtml(el.text ?? '')
    case 'emoji':
      return el.unicode ? unicodeToEmoji(el.unicode) : escapeHtml(`:${el.name}:`)
    case 'user': {
      const name = userNames.get(el.user_id ?? '') ?? el.user_id ?? 'member'
      return escapeHtml(`@${name}`)
    }
    case 'link': {
      const label = el.text && el.text !== el.url ? el.text : (el.url ?? '')
      return escapeHtml(label)
    }
    case 'channel':
      return escapeHtml(`#channel`)
    default:
      return ''
  }
}

// Parse Slack rich_text blocks into a safe HTML string.
// Text is HTML-escaped; emoji unicode is converted to real characters.
export function parseRichTextBlocks(
  blocks: SlackBlock[],
  userNames: Map<string, string>
): string {
  const parts: string[] = []

  for (const block of blocks) {
    if (block.type !== 'rich_text') continue
    for (const section of block.elements ?? []) {
      for (const el of section.elements ?? []) {
        parts.push(renderElement(el, userNames))
      }
    }
  }

  return parts.join('').trim()
}

// Fallback for messages without blocks
export function formatSlackText(
  rawText: string,
  userNames: Map<string, string>
): string {
  let text = decodeSlackEntities(rawText)

  // Replace <@USERID|displayname> or <@USERID>
  text = text.replace(/<@([A-Z0-9]+)(?:\|[^>]*)?>/g, (_, userId: string) => {
    const name = userNames.get(userId)
    return name ? `@${name}` : '@member'
  })

  // Replace <URL|link text> — keep the display text
  text = text.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, (_, _url: string, label: string) => label)

  // Replace bare <URL>
  text = text.replace(/<(https?:\/\/[^>]+)>/g, (_, url: string) => url)

  return escapeHtml(text)
}
