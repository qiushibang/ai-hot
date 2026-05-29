import type { FeedItem } from '@ai-hot/shared'

type WechatMessagePayload = {
  msgtype: 'markdown'
  markdown: {
    content: string
  }
}

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text
  }

  return text.slice(0, maxLength) + '...'
}

export const createWechatMessageFormatter = ({
  maxContentLength = 4096,
  maxItems = 20
}: {
  maxContentLength?: number
  maxItems?: number
} = {}) => {
  return (items: FeedItem[], searchQuery: string): WechatMessagePayload => {
    const titleText = searchQuery.trim().length > 0 ? `AI Hot: ${searchQuery.trim()}` : 'AI Hot: 今日热点'
    const heading = `# ${titleText}\n\n`

    let content = heading
    let included = 0

    for (const item of items) {
      const summary = truncate(item.summary, 80)
      const line = `- [${item.title}](${item.url}) — ${summary} (热度:${item.popularityScore})\n`

      if (content.length + line.length > maxContentLength) {
        break
      }

      content += line
      included += 1

      if (included >= maxItems) {
        break
      }
    }

    const remaining = items.length - included

    if (remaining > 0) {
      content += `\n...还有 ${remaining} 条未展示`
    }

    if (included === 0) {
      content += '暂无匹配内容'
    }

    return {
      msgtype: 'markdown',
      markdown: {
        content
      }
    }
  }
}

export type { WechatMessagePayload }