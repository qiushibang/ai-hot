import { z } from 'zod'

export const favoriteSchema = z.object({
  itemId: z.string().min(1)
})

export const favoritesSchema = z.array(favoriteSchema)
export const createFavoriteRequestSchema = favoriteSchema

export type Favorite = z.infer<typeof favoriteSchema>
