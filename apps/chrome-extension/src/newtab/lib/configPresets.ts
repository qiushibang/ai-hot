const STORAGE_KEY = 'ai-hot-config-presets'

type FeishuPreset = {
  id: string
  name: string
  feishuWebhookUrl: string | null
  feishuAppId: string | null
  feishuAppSecret: string | null
  feishuReceiveId: string | null
}

type WechatPreset = {
  id: string
  name: string
  wechatWebhookUrl: string | null
}

type PresetStore = {
  feishu: FeishuPreset[]
  wechat: WechatPreset[]
}

const loadStore = (): PresetStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (raw) return JSON.parse(raw) as PresetStore
  } catch {
    // ignore
  }

  return { feishu: [], wechat: [] }
}

const saveStore = (store: PresetStore) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore
  }
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const loadFeishuPresets = (): FeishuPreset[] => loadStore().feishu

export const saveFeishuPreset = (name: string, preset: Omit<FeishuPreset, 'id' | 'name'>) => {
  const store = loadStore()
  const existing = store.feishu.find((p) => p.name === name)

  if (existing) {
    Object.assign(existing, { ...preset, name })
  } else {
    store.feishu.push({ id: uid(), name, ...preset })
  }

  saveStore(store)

  return store.feishu
}

export const deleteFeishuPreset = (id: string) => {
  const store = loadStore()
  store.feishu = store.feishu.filter((p) => p.id !== id)
  saveStore(store)

  return store.feishu
}

export const loadWechatPresets = (): WechatPreset[] => loadStore().wechat

export const saveWechatPreset = (name: string, preset: Omit<WechatPreset, 'id' | 'name'>) => {
  const store = loadStore()
  const existing = store.wechat.find((p) => p.name === name)

  if (existing) {
    Object.assign(existing, { ...preset, name })
  } else {
    store.wechat.push({ id: uid(), name, ...preset })
  }

  saveStore(store)

  return store.wechat
}

export const deleteWechatPreset = (id: string) => {
  const store = loadStore()
  store.wechat = store.wechat.filter((p) => p.id !== id)
  saveStore(store)

  return store.wechat
}

export type { FeishuPreset, WechatPreset }