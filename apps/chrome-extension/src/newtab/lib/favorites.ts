import {
  API_ROUTES,
  favoriteSchema,
  favoritesSchema,
  createFavoriteRequestSchema,
  type Favorite
} from '@ai-hot/shared'

const COMPANION_SERVICE_ORIGIN = 'http://127.0.0.1:4317'

type FavoritesPayload = {
  success: boolean
  data: Favorite[] | Favorite | null
  error: string | null
}

const readFavoritesPayload = async (response: Response): Promise<FavoritesPayload> => {
  return (await response.json()) as FavoritesPayload
}

export const fetchFavorites = async (
  fetchImplementation: typeof fetch = fetch
): Promise<Favorite[]> => {
  const response = await fetchImplementation(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.favorites}`)
  const payload = await readFavoritesPayload(response)

  if (!response.ok || !payload.success || !payload.data || !Array.isArray(payload.data)) {
    throw new Error(payload.error ?? 'favorites request failed')
  }

  return favoritesSchema.parse(payload.data)
}

export const createFavorite = async (
  itemId: string,
  fetchImplementation: typeof fetch = fetch
): Promise<Favorite> => {
  const favoriteRequest = createFavoriteRequestSchema.parse({ itemId })
  const response = await fetchImplementation(`${COMPANION_SERVICE_ORIGIN}${API_ROUTES.favorites}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(favoriteRequest)
  })
  const payload = await readFavoritesPayload(response)

  if (!response.ok || !payload.success || !payload.data || Array.isArray(payload.data)) {
    throw new Error(payload.error ?? 'favorites request failed')
  }

  return favoriteSchema.parse(payload.data)
}
