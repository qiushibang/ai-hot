import { API_ROUTES, type PlatformStatus } from '@ai-hot/shared'
import { Router } from 'express'

type PlatformStatusRepository = {
  getAll: () => PlatformStatus[]
}

const createEmptyPlatformStatusRepository = (): PlatformStatusRepository => ({
  getAll: () => []
})

export const createStatusRouter = (
  platformStatusRepository: PlatformStatusRepository = createEmptyPlatformStatusRepository()
) => {
  const statusRouter = Router()

  statusRouter.get(API_ROUTES.status, (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        status: 'ok'
      },
      error: null
    })
  })

  statusRouter.get(API_ROUTES.platformStatuses, (_request, response) => {
    response.status(200).json({
      success: true,
      data: platformStatusRepository.getAll(),
      error: null
    })
  })

  return statusRouter
}

export type { PlatformStatusRepository }
