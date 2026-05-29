import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATABASE_DIRECTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../data')

export const COMPANION_SERVICE_DATA_DIRECTORY = DATABASE_DIRECTORY
export const COMPANION_SERVICE_DATABASE_PATH = resolve(DATABASE_DIRECTORY, 'ai-hot.sqlite3')
export const COMPANION_SERVICE_BROWSER_DIRECTORY = resolve(
  tmpdir(),
  'ai-hot/browser/chrome-automation'
)
