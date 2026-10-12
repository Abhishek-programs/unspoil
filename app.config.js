/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE
  const includeDevClient =
    profile !== 'production' && profile !== 'preview'

  config.plugins = (config.plugins ?? []).filter(
    p => p !== 'expo-dev-client' && (!Array.isArray(p) || p[0] !== 'expo-dev-client'),
  )
  if (includeDevClient) {
    config.plugins.push('expo-dev-client')
  }

  const projectId = process.env.EAS_PROJECT_ID?.trim()
  if (projectId) {
    config.extra = config.extra ?? {}
    config.extra.eas = { ...config.extra.eas, projectId }
    config.updates = {
      ...config.updates,
      url: `https://u.expo.dev/${projectId}`,
    }
  }

  return config
}
