import type { FeedItem } from '@ai-hot/shared'

type CardElement =
  | { tag: 'div'; text: { tag: 'lark_md'; content: string } }
  | { tag: 'hr' }
  | { tag: 'note'; elements: Array<{ tag: 'plain_text'; content: string }> }

type FeishuCardPayload = {
  msg_type: 'interactive'
  card: {
    header: {
      title: {
        tag: 'plain_text'
        content: string
      }
      template: 'blue'
    }
    elements: CardElement[]
  }
}

const PLATFORM_LABELS: Record<string, string> = {
  github: 'GitHub',
  x: 'X',
  youtube: 'YouTube',
  huggingface: 'HuggingFace'
}

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text
  }

  return text.slice(0, maxLength) + '...'
}

export const createFeishuCardFormatter = ({ maxItems = 50 }: { maxItems?: number } = {}) => {
  return (items: FeedItem[], searchQuery: string): FeishuCardPayload => {
    const titleText = searchQuery.trim().length > 0 ? `AI Hot: ${searchQuery.trim()}` : 'AI Hot: 今日热点'
    const cappedItems = items.slice(0, maxItems)

    const grouped = new Map<string, FeedItem[]>()
    for (const item of cappedItems) {
      const list = grouped.get(item.platform)
      if (list) {
        list.push(item)
      } else {
        grouped.set(item.platform, [item])
      }
    }

    const elements: CardElement[] = []
    const platforms = [...grouped.keys()]

    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i]
      const platformItems = grouped.get(platform)!
      const label = PLATFORM_LABELS[platform] ?? platform

      elements.push({
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**${label}** (${platformItems.length} 条)`
        }
      })

      for (const item of platformItems) {
        elements.push({
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `[${item.title}](${item.url})\n${truncate(item.summary, 80)}`
          }
        })
      }

      if (i < platforms.length - 1) {
        elements.push({ tag: 'hr' })
      }
    }

    if (cappedItems.length > 0) {
      elements.push({ tag: 'hr' })
      elements.push({
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: `共 ${cappedItems.length} 条 | 主题: ${searchQuery.trim() || '热点'} | AI Hot`
          }
        ]
      })
    }

    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: titleText
          },
          template: 'blue'
        },
        elements
      }
    }
  }
}

export type { FeishuCardPayload }