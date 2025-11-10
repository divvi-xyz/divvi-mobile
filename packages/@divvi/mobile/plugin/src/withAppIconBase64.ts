import { ConfigPlugin, createRunOncePlugin, WarningAggregator } from '@expo/config-plugins'
import fs from 'fs'
import path from 'path'

function addWarning(text: string) {
  const property = 'appIconBase64'
  WarningAggregator.addWarningAndroid(property, text)
  WarningAggregator.addWarningIOS(property, text)
}

const withAppIconBase64: ConfigPlugin = (config) => {
  const iconPath = config.icon

  if (!iconPath) {
    addWarning('No icon defined in the Expo config. Skipping base64 embedding.')
    return config
  }

  const projectRoot = config._internal?.projectRoot
  const resolvedIconPath = path.resolve(projectRoot, iconPath)

  if (!fs.existsSync(resolvedIconPath)) {
    addWarning(`Could not find the icon file at "${resolvedIconPath}"`)
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
    addWarning(`Failed to read icon file at "${resolvedIconPath}": ${error}`)
  }

  return config
}

export default createRunOncePlugin(withAppIconBase64, '@divvi/mobile/withAppIconBase64')
