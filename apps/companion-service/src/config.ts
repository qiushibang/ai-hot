import { z } from 'zod'

export const DEFAULT_COMPANION_SERVICE_HOST = '127.0.0.1'
export const DEFAULT_COMPANION_SERVICE_PORT = 4317

const companionServiceConfigSchema = z.object({
  host: z.string().min(1).default(DEFAULT_COMPANION_SERVICE_HOST),
  port: z.coerce.number().int().min(1).max(65535).default(DEFAULT_COMPANION_SERVICE_PORT)
})

export type CompanionServiceConfig = z.infer<typeof companionServiceConfigSchema>

export const getCompanionServiceConfig = (
  environment: NodeJS.ProcessEnv = process.env
): CompanionServiceConfig => {
  const result = companionServiceConfigSchema.parse({
    host: environment.COMPANION_SERVICE_HOST ?? DEFAULT_COMPANION_SERVICE_HOST,
    port: environment.COMPANION_SERVICE_PORT ?? DEFAULT_COMPANION_SERVICE_PORT
  })

  return {
    host: result.host,
    port: result.port
  }
}
