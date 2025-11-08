import { ConfigPlugin } from '@expo/config-plugins'
import fs from 'fs'
import path from 'path'

const withAppIconBase64: ConfigPlugin = (config) => {
  const iconPath = config.icon

  if (!iconPath) {
    console.warn(
      '[withAppIconBase64] No icon defined in the Expo config. Skipping base64 embedding.'
    )
    return config
  }

  const projectRoot = config._internal?.projectRoot
  const resolvedIconPath = path.resolve(projectRoot, iconPath)

  console.log('resolvedIconPath', resolvedIconPath)

  if (!fs.existsSync(resolvedIconPath)) {
    console.warn(`[withAppIconBase64] Could not find the icon file at "${resolvedIconPath}"`)
    return config
  }

  try {
    const base64 = fs.readFileSync(resolvedIconPath).toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    config.extra = {
      ...config.extra,
      appIconBase64: dataUrl,
    }
  } catch (error) {
    console.warn(`[withAppIconBase64] Failed to read icon file at "${resolvedIconPath}":`, error)
  }

  return config
}

export { withAppIconBase64 }
