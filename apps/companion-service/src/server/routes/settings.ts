import { API_ROUTES, createDefaultSettings, settingsSchema, type Settings } from '@ai-hot/shared'
import { Router } from 'express'
import { ZodError } from 'zod'

/* eslint-disable no-unused-vars */
type SettingsRepository = {
  get: () => Settings | null
  save: (settings: Settings) => void
}
/* eslint-enable no-unused-vars */

const createDefaultSettingsRepository = (): SettingsRepository => {
  let settings = createDefaultSettings()

  return {
    get: () => settings,
    save: (nextSettings) => {
      settings = settingsSchema.parse(nextSettings)
    }
  }
}

export const createSettingsRouter = (
  settingsRepository: SettingsRepository = createDefaultSettingsRepository()
) => {
  const settingsRouter = Router()

  settingsRouter.get(API_ROUTES.settings, (_request, response) => {
    try {
      response.status(200).json({
        success: true,
        data: settingsRepository.get() ?? createDefaultSettings(),
        error: null
      })
    } catch {
      response.status(500).json({
        success: false,
        data: null,
        error: 'settings request failed'
      })
    }
  })

  settingsRouter.post(API_ROUTES.settings, (request, response) => {
    try {
      const settings = settingsSchema.parse(request.body)
      settingsRepository.save(settings)

      response.status(200).json({
        success: true,
        data: settings,
        error: null
      })
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json({
          success: false,
          data: null,
          error: 'settings payload is invalid'
        })
        return
      }

      response.status(500).json({
        success: false,
        data: null,
        error: 'settings request failed'
      })
    }
  })

  return settingsRouter
}

export type { SettingsRepository }
