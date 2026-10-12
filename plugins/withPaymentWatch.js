const fs = require('fs')
const path = require('path')
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins')

const SRC_DIR = 'native/android/paymentwatch'

function withPaymentWatch(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = cfg.android?.package
      if (!pkg) throw new Error('android.package is required for PaymentWatch')
      const srcDir = path.join(cfg.modRequest.projectRoot, SRC_DIR)
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/java',
        pkg.replace(/\./g, '/'),
        'paymentwatch',
      )
      fs.mkdirSync(destDir, { recursive: true })
      for (const file of fs.readdirSync(srcDir)) {
        if (!file.endsWith('.kt')) continue
        const contents = fs
          .readFileSync(path.join(srcDir, file), 'utf8')
          .split('{{PACKAGE}}')
          .join(pkg)
        fs.writeFileSync(path.join(destDir, file), contents)
      }
      const resSrc = path.join(srcDir, 'res')
      if (fs.existsSync(resSrc)) {
        const copyDir = (from, to) => {
          fs.mkdirSync(to, { recursive: true })
          for (const name of fs.readdirSync(from)) {
            const s = path.join(from, name)
            const d = path.join(to, name)
            if (fs.statSync(s).isDirectory()) copyDir(s, d)
            else fs.copyFileSync(s, d)
          }
        }
        copyDir(resSrc, path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res'))
      }
      return cfg
    },
  ])

  config = withMainApplication(config, (cfg) => {
    const pkg = cfg.android?.package
    let src = cfg.modResults.contents
    const importLine = `import ${pkg}.paymentwatch.PaymentWatchPackage`
    if (!src.includes(importLine)) {
      if (src.includes('import com.facebook.react.PackageList')) {
        src = src.replace(
          'import com.facebook.react.PackageList',
          `${importLine}\nimport com.facebook.react.PackageList`,
        )
      } else {
        src = `${importLine}\n${src}`
      }
    }
    if (!src.includes('PaymentWatchPackage()')) {
      if (src.includes('PackageList(this).packages.apply {')) {
        src = src.replace(
          'PackageList(this).packages.apply {',
          'PackageList(this).packages.apply {\n            add(PaymentWatchPackage())',
        )
      } else if (src.includes('PackageList(this).packages')) {
        src = src.replace(
          'PackageList(this).packages',
          'PackageList(this).packages.apply { add(PaymentWatchPackage()) }',
        )
      }
    }
    cfg.modResults.contents = src
    return cfg
  })

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults
    AndroidConfig.Manifest.ensureToolsAvailable(manifest)

    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ])

    if (!manifest.manifest['uses-permission']) manifest.manifest['uses-permission'] = []
    const hasUsage = manifest.manifest['uses-permission'].some(
      (p) => p.$['android:name'] === 'android.permission.PACKAGE_USAGE_STATS',
    )
    if (!hasUsage) {
      manifest.manifest['uses-permission'].push({
        $: {
          'android:name': 'android.permission.PACKAGE_USAGE_STATS',
          'tools:ignore': 'ProtectedPermissions',
        },
      })
    }

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)
    if (!app.service) app.service = []
    if (!app.receiver) app.receiver = []

    if (!app.service.some((s) => s.$['android:name'] === '.paymentwatch.PaymentWatchService')) {
      app.service.push({
        $: {
          'android:name': '.paymentwatch.PaymentWatchService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse',
          'android:stopWithTask': 'false',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value':
                'Detects when eSewa or nBank is in the foreground so you can log an amount from a notification. Does not record the screen.',
            },
          },
        ],
      })
    }

    if (!app.receiver.some((r) => r.$['android:name'] === '.paymentwatch.PaymentWatchReceiver')) {
      app.receiver.push({
        $: {
          'android:name': '.paymentwatch.PaymentWatchReceiver',
          'android:exported': 'false',
        },
      })
    }

    if (!app.receiver.some((r) => r.$['android:name'] === '.paymentwatch.PaymentWatchBootReceiver')) {
      app.receiver.push({
        $: {
          'android:name': '.paymentwatch.PaymentWatchBootReceiver',
          'android:exported': 'true',
          'android:directBootAware': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.LOCKED_BOOT_COMPLETED' } },
            ],
          },
        ],
      })
    }

    return cfg
  })

  return config
}

module.exports = withPaymentWatch
