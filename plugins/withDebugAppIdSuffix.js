const fs = require('fs')
const path = require('path')
const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins')

// Debug builds install as <package>.dev so a dev client can sit next to the
// Play Store / EAS release on the same phone (different signing keys).
const SUFFIX = '.dev'

function withDebugAppIdSuffix(config) {
  config = withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents
    if (!src.includes('applicationIdSuffix')) {
      src = src.replace(
        /(buildTypes\s*\{\s*debug\s*\{)/,
        `$1\n            applicationIdSuffix "${SUFFIX}"`,
      )
    }
    cfg.modResults.contents = src
    return cfg
  })

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/debug/res/values',
      )
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(
        path.join(dir, 'strings.xml'),
        `<resources>\n  <string name="app_name">${cfg.name} Dev</string>\n</resources>\n`,
      )
      return cfg
    },
  ])

  return config
}

module.exports = withDebugAppIdSuffix
