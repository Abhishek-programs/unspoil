package {{PACKAGE}}.paymentwatch

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class PaymentWatchModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx) {

  override fun getName(): String = "PaymentWatch"

  @ReactMethod
  fun isEnabled(promise: Promise) {
    promise.resolve(PaymentWatchPrefs.isEnabled(ctx))
  }

  @ReactMethod
  fun hasUsageAccess(promise: Promise) {
    promise.resolve(PaymentWatchAccess.hasUsageAccess(ctx))
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
    try {
      ctx.startActivity(PaymentWatchAccess.usageAccessIntent())
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("settings_error", e)
    }
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
  fun startIfEnabled(promise: Promise) {
    PaymentWatchService.start(ctx)
    promise.resolve(PaymentWatchPrefs.isEnabled(ctx) && PaymentWatchAccess.hasUsageAccess(ctx))
  }
}
