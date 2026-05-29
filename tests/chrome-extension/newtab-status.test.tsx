import type { TodayFeed } from '../../apps/chrome-extension/src/newtab/lib/fetchTodayFeed'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'

import { App } from '../../apps/chrome-extension/src/newtab/App'
import { fetchStatus } from '../../apps/chrome-extension/src/newtab/lib/fetchStatus'

const createEmptyFeed = (): TodayFeed => ({
  github: { items: [], message: '今日结果较少', state: 'no_results' },
  x: { items: [], message: '今日结果较少', state: 'no_results' },
  youtube: { items: [], message: '今日结果较少', state: 'no_results' },
  huggingface: { items: [], message: '今日结果较少', state: 'no_results' }
})

describe('new tab status app', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  test('shows loading first and then connected when localhost responds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: createEmptyFeed(), error: null })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], error: null })
      })

    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(screen.getByText('正在连接本地服务…')).toBeDefined()
    expect(await screen.findByText('已连接到本地服务')).toBeDefined()
  })

  test('shows connected preview state when preview mode is set in the URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: createEmptyFeed(), error: null })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [], error: null })
      })

    vi.stubGlobal('fetch', fetchMock)
    window.history.replaceState({}, '', '/?preview=connected')

    render(<App />)

    expect(await screen.findByText('已连接到本地服务')).toBeDefined()
    expect(screen.getByText('输入主题词，抓取今日 AI 热点，推送到飞书或微信。')).toBeDefined()
  })

  test('fetchStatus resolves to offline when localhost request times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_input, init) => {
        const signal = init?.signal

        return new Promise((_, reject) => {
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })
    )

    const statusPromise = fetchStatus()

    await vi.advanceTimersByTimeAsync(2001)

    await expect(statusPromise).resolves.toBe('offline')
  })

  test('shows offline when localhost request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    render(<App />)

    expect(await screen.findByText('服务离线')).toBeDefined()
    expect(screen.getByText('请启动 companion service at http://127.0.0.1:4317')).toBeDefined()
  })
})