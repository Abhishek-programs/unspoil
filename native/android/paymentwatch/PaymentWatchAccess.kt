package {{PACKAGE}}.paymentwatch

import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.app.NotificationManager
import android.os.PowerManager
import android.os.Process
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat

object PaymentWatchAccess {
  fun hasUsageAccess(context: Context): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= 29) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName,
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName,
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  fun usageAccessIntent(): Intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)

  fun batteryOptimizationIntent(): Intent =
    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)

  fun isBatteryUnrestricted(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return pm.isIgnoringBatteryOptimizations(context.packageName)
  }

  fun appBatterySettingsIntent(context: Context): Intent =
    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.fromParts("package", context.packageName, null)
    }

  /** Ordered fallbacks — OEMs often block the direct “allow” intent. */
  fun batteryUnrestrictedIntents(context: Context): List<Intent> {
    val pkg = context.packageName
    val intents = mutableListOf<Intent>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
      !isBatteryUnrestricted(context)
    ) {
      intents.add(
        Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:$pkg")
        },
      )
    }
    samsungBatteryIntent(context)?.let { intents.add(it) }
    intents.add(appBatterySettingsIntent(context))
    intents.add(batteryOptimizationIntent())
    return intents
  }

  private fun samsungBatteryIntent(context: Context): Intent? {
    val pkg = context.packageName
    val candidates =
      listOf(
        ComponentName(
          "com.samsung.android.lool",
          "com.samsung.android.sm.ui.battery.BatteryActivity",
        ),
        ComponentName(
          "com.samsung.android.sm",
          "com.samsung.android.sm.ui.battery.BatteryActivity",
        ),
      )
    val pm = context.packageManager
    for (component in candidates) {
      val intent =
        Intent().apply {
          this.component = component
          putExtra("package_name", pkg)
          putExtra("packageName", pkg)
        }
      if (intent.resolveActivity(pm) != null) return intent
    }
    return null
  }

  fun startSettingsActivity(context: Context, activity: android.app.Activity?, intent: Intent): Boolean {
    return try {
      if (activity != null) {
        val launch = Intent(intent)
        launch.flags = launch.flags and Intent.FLAG_ACTIVITY_NEW_TASK.inv()
        activity.startActivity(launch)
      } else {
        val launch = Intent(intent)
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(launch)
      }
      true
    } catch (_: Exception) {
      false
    }
  }

  fun canPostLogNotifications(context: Context, logChannelId: String): Boolean {
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
    if (Build.VERSION.SDK_INT >= 26) {
      val channel =
        context.getSystemService(NotificationManager::class.java)?.getNotificationChannel(logChannelId)
      if (channel != null && channel.importance == NotificationManager.IMPORTANCE_NONE) {
        return false
      }
    }
    return true
  }

  fun notificationSettingsIntent(context: Context): Intent {
    return if (Build.VERSION.SDK_INT >= 26) {
      Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      }
    } else {
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.fromParts("package", context.packageName, null)
      }
    }
  }
}
