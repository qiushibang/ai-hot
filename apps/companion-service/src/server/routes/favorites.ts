import { API_ROUTES, createFavoriteRequestSchema, type Favorite } from '@ai-hot/shared'
import { Router } from 'express'
import { ZodError } from 'zod'

/* eslint-disable no-unused-vars */
type FavoritesRepository = {
  add: (itemId: string) => Favorite
  remove: (itemId: string) => boolean
  list: () => Favorite[]
}
/* eslint-enable no-unused-vars */

const createDefaultFavoritesRepository = (): FavoritesRepository => {
  let favorites: Favorite[] = []

  return {
    list: () => [...favorites],
    add: (itemId) => {
      const favorite = createFavoriteRequestSchema.parse({ itemId })

      if (favorites.some((f) => f.itemId === favorite.itemId)) {
        return favorite
      }

      favorites = [...favorites, favorite]

      return favorite
    },
    remove: (itemId) => {
      const exists = favorites.some((f) => f.itemId === itemId)

      favorites = favorites.filter((f) => f.itemId !== itemId)

      return exists
    }
  }
}

export const createFavoritesRouter = (
  favoritesRepository: FavoritesRepository = createDefaultFavoritesRepository()
) => {
  const favoritesRouter = Router()

  favoritesRouter.get(API_ROUTES.favorites, (_request, response) => {
    try {
      response.status(200).json({
        success: true,
        data: favoritesRepository.list(),
        error: null
      })
    } catch {
      response.status(500).json({
        success: false,
        data: null,
        error: 'favorites request failed'
      })
    }
  })

  favoritesRouter.post(API_ROUTES.favorites, (request, response) => {
    try {
      const favoriteRequest = createFavoriteRequestSchema.parse(request.body)
      const favorite = favoritesRepository.add(favoriteRequest.itemId)

      response.status(200).json({
        success: true,
        data: favorite,
        error: null
      })
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json({
          success: false,
          data: null,
          error: 'favorite itemId is required'
        })
        return
      }

      response.status(500).json({
        success: false,
        data: null,
        error: 'favorites request failed'
      })
    }
  })

  favoritesRouter.delete(API_ROUTES.favorites, (request, response) => {
    try {
      const { itemId } = createFavoriteRequestSchema.parse(request.body)
      const removed = favoritesRepository.remove(itemId)

      response.status(200).json({
        success: true,
        data: { removed },
        error: null
      })
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json({
          success: false,
          data: null,
          error: 'favorite itemId is required'
        })
        return
      }

      response.status(500).json({
        success: false,
        data: null,
        error: 'favorites request failed'
      })
    }
  })

  return favoritesRouter
}

export type { FavoritesRepository }
