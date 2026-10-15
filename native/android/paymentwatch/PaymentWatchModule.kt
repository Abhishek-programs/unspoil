package {{PACKAGE}}.paymentwatch

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import java.io.File
import java.io.FileOutputStream

class PaymentWatchModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = "PaymentWatch"

  private fun launchSettings(intent: Intent, promise: Promise) {
    val activity: Activity? = reactApplicationContext.currentActivity
    if (PaymentWatchAccess.startSettingsActivity(ctx, activity, intent)) {
      promise.resolve(true)
      return
    }
    promise.reject("settings_error", Exception("Could not open settings"))
  }

  @ReactMethod
  fun isEnabled(promise: Promise) {
    promise.resolve(PaymentWatchPrefs.isEnabled(ctx))
  }

  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    promise.resolve(PaymentWatchAccess.hasUsageAccess(ctx))
  }

  @ReactMethod
  fun hasNotificationPermission(promise: Promise) {
    promise.resolve(
      PaymentWatchAccess.canPostLogNotifications(ctx, PaymentWatchService.CHANNEL_LOG),
    )
  }

  @ReactMethod
  fun getLogDelayMs(promise: Promise) {
    promise.resolve(PaymentWatchPrefs.logDelayMs(ctx).toDouble())
  }

  @ReactMethod
  fun getKeepBackgroundNotification(promise: Promise) {
    promise.resolve(PaymentWatchPrefs.keepBackgroundNotification(ctx))
  }

  @ReactMethod
  fun setKeepBackgroundNotification(keep: Boolean, promise: Promise) {
    PaymentWatchPrefs.setKeepBackgroundNotification(ctx, keep)
    if (PaymentWatchPrefs.isEnabled(ctx)) PaymentWatchService.start(ctx)
    promise.resolve(true)
  }

  @ReactMethod
  fun setLogDelayMs(delayMs: Double, promise: Promise) {
    PaymentWatchPrefs.setLogDelayMs(ctx, delayMs.toLong())
    if (PaymentWatchPrefs.isEnabled(ctx)) PaymentWatchService.start(ctx)
    promise.resolve(true)
  }

  @ReactMethod
  fun setEnabled(enabled: Boolean, promise: Promise) {
    try {
      PaymentWatchPrefs.setEnabled(ctx, enabled)
      if (enabled) {
        if (!PaymentWatchAccess.hasUsageAccess(ctx)) {
          promise.resolve("needs_usage_access")
          return
        }
        if (!PaymentWatchAccess.canPostLogNotifications(ctx, PaymentWatchService.CHANNEL_LOG)) {
          promise.resolve("needs_notification_permission")
          return
        }
        PaymentWatchService.start(ctx)
      } else {
        PaymentWatchService.stop(ctx)
      }
      promise.resolve("ok")
    } catch (e: Exception) {
      promise.reject("watch_error", e)
    }
  }

  @ReactMethod
  fun openUsageAccessSettings(promise: Promise) {
    launchSettings(PaymentWatchAccess.usageAccessIntent(), promise)
  }

  @ReactMethod
  fun openBatterySettings(promise: Promise) {
    launchSettings(PaymentWatchAccess.batteryOptimizationIntent(), promise)
  }

  @ReactMethod
  fun hasBatteryUnrestricted(promise: Promise) {
    promise.resolve(PaymentWatchAccess.isBatteryUnrestricted(ctx))
  }

  @ReactMethod
  fun requestBatteryUnrestricted(promise: Promise) {
    val activity: Activity? = reactApplicationContext.currentActivity
    for (intent in PaymentWatchAccess.batteryUnrestrictedIntents(ctx)) {
      if (PaymentWatchAccess.startSettingsActivity(ctx, activity, intent)) {
        promise.resolve(true)
        return
      }
    }
    promise.reject("settings_error", Exception("Could not open battery settings"))
  }

  @ReactMethod
  fun openNotificationSettings(promise: Promise) {
    launchSettings(PaymentWatchAccess.notificationSettingsIntent(ctx), promise)
  }

  @ReactMethod
  fun setTargetPackages(packages: ReadableArray, promise: Promise) {
    val list = mutableListOf<String>()
    for (i in 0 until packages.size()) {
      packages.getString(i)?.let { list.add(it) }
    }
    PaymentWatchPrefs.setTargetPackages(ctx, list)
    if (PaymentWatchPrefs.isEnabled(ctx)) PaymentWatchService.start(ctx)
    promise.resolve(true)
  }

  @ReactMethod
  fun getTargetPackages(promise: Promise) {
    promise.resolve(Arguments.fromList(PaymentWatchPrefs.targetPackages(ctx).sorted()))
  }

  @ReactMethod
  fun getLaunchableApps(promise: Promise) {
    try {
      val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      @Suppress("DEPRECATION")
      val apps = ctx.packageManager.queryIntentActivities(launcherIntent, 0)
        .mapNotNull { info ->
          val packageName = info.activityInfo?.packageName ?: return@mapNotNull null
          if (packageName == ctx.packageName) return@mapNotNull null
          val label = info.loadLabel(ctx.packageManager)?.toString()?.trim().orEmpty()
          if (label.isEmpty()) return@mapNotNull null
          packageName to label
        }
        .distinctBy { it.first }
        .sortedBy { it.second.lowercase() }
      val result = Arguments.createArray()
      for ((packageName, label) in apps) {
        val row = Arguments.createMap()
        row.putString("packageName", packageName)
        row.putString("label", label)
        iconPath(packageName)?.let { row.putString("iconPath", it) }
        result.pushMap(row)
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("apps_error", e)
    }
  }

  private fun iconPath(packageName: String): String? {
    return try {
      val dir = File(ctx.cacheDir, "app-icons")
      dir.mkdirs()
      val file = File(dir, "$packageName.png")
      if (!file.exists() || file.length() == 0L) {
        val drawable = ctx.packageManager.getApplicationIcon(packageName)
        val size = 96
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, size, size)
        drawable.draw(canvas)
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        bitmap.recycle()
      }
      file.absolutePath
    } catch (_: Exception) {
      null
    }
  }

  @ReactMethod
  fun startIfEnabled(promise: Promise) {
    PaymentWatchService.start(ctx)
    promise.resolve(PaymentWatchPrefs.isEnabled(ctx) && PaymentWatchAccess.hasUsageAccess(ctx))
  }

  @ReactMethod
  fun getBackupState(promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("enabled", PaymentWatchPrefs.isEnabled(ctx))
    map.putDouble("logDelayMs", PaymentWatchPrefs.logDelayMs(ctx).toDouble())
    map.putArray("targetPackages", Arguments.fromList(PaymentWatchPrefs.targetPackages(ctx).sorted()))
    map.putBoolean("keepBackgroundNotification", PaymentWatchPrefs.keepBackgroundNotification(ctx))
    promise.resolve(map)
  }

  @ReactMethod
  fun restoreBackupState(
    enabled: Boolean,
    logDelayMs: Double,
    packages: ReadableArray,
    keepBackgroundNotification: Boolean,
    promise: Promise,
  ) {
    try {
      PaymentWatchPrefs.setLogDelayMs(ctx, logDelayMs.toLong())
      PaymentWatchPrefs.setKeepBackgroundNotification(ctx, keepBackgroundNotification)
      val list = mutableListOf<String>()
      for (i in 0 until packages.size()) {
        packages.getString(i)?.let { list.add(it) }
      }
      PaymentWatchPrefs.setTargetPackages(ctx, list)
      PaymentWatchPrefs.setEnabled(ctx, enabled)
      if (enabled && PaymentWatchAccess.hasUsageAccess(ctx)) {
        PaymentWatchService.start(ctx)
      } else {
        PaymentWatchService.stop(ctx)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("restore_error", e)
    }
  }
}
