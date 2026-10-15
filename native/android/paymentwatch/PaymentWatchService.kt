package {{PACKAGE}}.paymentwatch

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.os.SystemClock
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import {{PACKAGE}}.R

class PaymentWatchService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var lastTarget: String? = null
  /** Holds the payment app we entered; usage events can miss it during the log delay. */
  private var latchedTarget: String? = null
  private var eventCursor = 0L
  private var lastUiKind: String? = null
  private var waitingForDelay = false
  private var stopping = false
  private var foregroundKeepAlive = false
  private var foregroundComplianceMet = false

  private val showLogLater = Runnable {
    waitingForDelay = false
    if (lastTarget == null && latchedTarget != null) {
      lastTarget =
        latchedTarget?.takeIf { it in PaymentWatchPrefs.targetPackages(this@PaymentWatchService) }
    }
    publishWatchUi()
  }

  private val poll = object : Runnable {
    override fun run() {
      tick()
      handler.postDelayed(this, POLL_MS)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    eventCursor = 0L
    ensureChannels()
    syncForegroundMode()
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    publishWatchUi()
    handler.post(poll)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      shutdown()
      return START_NOT_STICKY
    }
    syncForegroundMode()
    if (!handler.hasCallbacks(poll)) handler.post(poll)
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    publishWatchUi()
    return START_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    super.onTaskRemoved(rootIntent)
    if (PaymentWatchPrefs.isEnabled(this) && PaymentWatchAccess.hasUsageAccess(this)) {
      scheduleRestart(1500L)
    }
  }

  override fun onDestroy() {
    handler.removeCallbacks(poll)
    handler.removeCallbacks(showLogLater)
    getSystemService(NotificationManager::class.java)?.cancel(LOG_NOTIF_ID)
    if (
      !stopping &&
        PaymentWatchPrefs.isEnabled(this) &&
        PaymentWatchAccess.hasUsageAccess(this)
    ) {
      scheduleRestart(3000L)
    }
    super.onDestroy()
  }

  private fun tick() {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      shutdown()
      return
    }
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    val kind = uiKind()
    if (kind != lastUiKind) publishWatchUi()
  }

  private fun onTargetChanged(prev: String?, current: String?) {
    if (prev == current) return
    handler.removeCallbacks(showLogLater)
    waitingForDelay = false
    if (current == null) {
      latchedTarget = null
      PaymentWatchPrefs.setDoneThisVisit(this, false)
      return
    }
    latchedTarget = current
    if (prev != null) PaymentWatchPrefs.setDoneThisVisit(this, false)
    waitingForDelay = true
    handler.postDelayed(showLogLater, PaymentWatchPrefs.logDelayMs(this))
  }

  private var foregroundPkg: String? = null

  private fun refreshTarget() {
    val fg = resolveForegroundPackage()
    lastTarget = fg?.takeIf { it in PaymentWatchPrefs.targetPackages(this) }
    if (lastTarget != null) latchedTarget = lastTarget
  }

  private fun effectiveTarget(): String? {
    if (lastTarget != null) return lastTarget
    return latchedTarget?.takeIf { it in PaymentWatchPrefs.targetPackages(this) }
  }

  private fun resolveForegroundPackage(): String? {
    applyForegroundEvents()
    return mostRecentForegroundPackage(30_000) ?: foregroundPkg
  }

  private fun applyForegroundEvents(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return foregroundPkg
    val end = System.currentTimeMillis()
    val start = if (eventCursor == 0L) end - 120_000 else eventCursor - 1_000
    val events = usm.queryEvents(start, end)
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (eventCursor != 0L && event.timeStamp < eventCursor) continue
      val isResume =
        event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
          event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
      if (isResume) foregroundPkg = event.packageName
    }
    eventCursor = end
    return foregroundPkg
  }

  private fun mostRecentForegroundPackage(windowMs: Long): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
    val end = System.currentTimeMillis()
    val events = usm.queryEvents(end - windowMs, end)
    val event = UsageEvents.Event()
    var bestPkg: String? = null
    var bestTime = 0L
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val isResume =
        event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
          event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
      if (!isResume) continue
      if (event.timeStamp >= bestTime) {
        bestTime = event.timeStamp
        bestPkg = event.packageName
      }
    }
    return bestPkg
  }

  private fun publishWatchUi() {
    lastUiKind = uiKind()
    val nm = getSystemService(NotificationManager::class.java)
    val notification = desiredNotification()
    if (notification != null) {
      if (!PaymentWatchAccess.canPostLogNotifications(this, CHANNEL_LOG)) return
      nm?.notify(LOG_NOTIF_ID, notification)
    } else if (!PaymentWatchPrefs.shouldHoldCancel(this)) {
      nm?.cancel(LOG_NOTIF_ID)
    }
  }

  private fun uiKind(): String {
    if (PaymentWatchPrefs.pendingTxn(this) != null) return "category"
    val target = effectiveTarget()
    if (target == null || PaymentWatchPrefs.doneThisVisit(this) || waitingForDelay) return "none"
    return "log"
  }

  private fun desiredNotification(): Notification? {
    val pending = PaymentWatchPrefs.pendingTxn(this)
    if (pending != null) return categoryNotification(pending)
    val target = effectiveTarget() ?: return null
    if (PaymentWatchPrefs.doneThisVisit(this)) return null
    if (waitingForDelay) return null
    return logNotification(target)
  }

  private fun syncForegroundMode() {
    val keep = PaymentWatchPrefs.keepBackgroundNotification(this)
    if (keep) {
      promoteToForeground()
      foregroundKeepAlive = true
      foregroundComplianceMet = true
      return
    }
    try {
      if (!foregroundComplianceMet) {
        val notification = placeholderNotification()
        if (Build.VERSION.SDK_INT >= 34) {
          startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
          startForeground(NOTIF_ID, notification)
        }
        foregroundComplianceMet = true
      }
      if (foregroundKeepAlive) {
        if (Build.VERSION.SDK_INT >= 24) {
          stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
          @Suppress("DEPRECATION")
          stopForeground(true)
        }
      }
      getSystemService(NotificationManager::class.java)?.cancel(NOTIF_ID)
      foregroundKeepAlive = false
    } catch (_: Exception) {
      shutdown()
    }
  }

  private fun promoteToForeground() {
    val notification = placeholderNotification()
    try {
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIF_ID, notification)
      }
    } catch (_: Exception) {
      shutdown()
    }
  }

  private fun shutdown() {
    stopping = true
    handler.removeCallbacks(poll)
    handler.removeCallbacks(showLogLater)
    if (Build.VERSION.SDK_INT >= 24) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    stopSelf()
  }

  private fun scheduleRestart(delayMs: Long) {
    val intent = Intent(this, PaymentWatchService::class.java)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val pending =
      if (Build.VERSION.SDK_INT >= 26) {
        PendingIntent.getForegroundService(this, RESTART_REQUEST_CODE, intent, flags)
      } else {
        @Suppress("DEPRECATION")
        PendingIntent.getService(this, RESTART_REQUEST_CODE, intent, flags)
      }
    val alarm = getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarm.set(
      AlarmManager.ELAPSED_REALTIME_WAKEUP,
      SystemClock.elapsedRealtime() + delayMs,
      pending,
    )
  }

  private fun ensureChannels() {
    if (Build.VERSION.SDK_INT < 26) return
    val nm = getSystemService(NotificationManager::class.java) ?: return
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_IDLE, "Payment helper", NotificationManager.IMPORTANCE_MIN).apply {
        setShowBadge(false)
        setSound(null, null)
        enableLights(false)
        enableVibration(false)
      },
    )
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_LOG, "Log a payment", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Type an amount while eSewa or nBank is open, then pick a bucket."
      },
    )
  }

  private fun placeholderNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_IDLE)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle("UnSpoil")
      .setContentText("Watching selected payment apps")
      .setOngoing(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  private fun categoryNotification(pending: PaymentWatchPrefs.PendingTxn): Notification {
    val npr = pending.amount.toInt()
    val title = "${PaymentWatchDb.currencyCode(this)} $npr · ${pending.merchant}"
    val pickIntent = Intent(this, PaymentWatchPickActivity::class.java).apply {
      putExtra(PaymentWatchPickActivity.EXTRA_TXN_ID, pending.id)
      putExtra(PaymentWatchPickActivity.EXTRA_AMOUNT, pending.amount)
      putExtra(PaymentWatchPickActivity.EXTRA_MERCHANT, pending.merchant)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pickPending = PendingIntent.getActivity(
      this,
      pending.id.hashCode(),
      pickIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    val open = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_agenda,
      "Pick bucket",
      pickPending,
    ).build()

    return NotificationCompat.Builder(this, CHANNEL_LOG)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle(title)
      .setContentText("Tap to choose any Living bucket")
      .setContentIntent(pickPending)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .addAction(open)
      .build()
  }

  private fun logNotification(packageName: String): Notification {
    val label = PaymentWatchPrefs.merchantLabel(this, packageName)
    val amountInput = RemoteInput.Builder(KEY_AMOUNT)
      .setLabel("400 momo")
      .build()
    val replyIntent = Intent(this, PaymentWatchReceiver::class.java).apply {
      action = ACTION_LOG
      putExtra(EXTRA_PACKAGE, packageName)
    }
    val replyPending = PendingIntent.getBroadcast(
      this,
      packageName.hashCode(),
      replyIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
    val action = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_save,
      "Log",
      replyPending,
    ).addRemoteInput(amountInput).build()

    return NotificationCompat.Builder(this, CHANNEL_LOG)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle("Log $label payment")
      .setContentText("Amount then a name, e.g. 200 momo")
      .setCategory(Notification.CATEGORY_REMINDER)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .addAction(action)
      .build()
  }

  companion object {
    const val NOTIF_ID = 7101
    const val LOG_NOTIF_ID = 7102
    const val CHANNEL_IDLE = "payment_watch_idle"
    const val CHANNEL_LOG = "payment_watch_log"
    const val ACTION_LOG = "{{PACKAGE}}.paymentwatch.LOG"
    const val ACTION_ASSIGN = "{{PACKAGE}}.paymentwatch.ASSIGN"
    const val KEY_AMOUNT = "payment_watch_amount"
    const val KEY_BUCKET = "payment_watch_bucket"
    const val EXTRA_PACKAGE = "payment_watch_package"
    const val EXTRA_TXN_ID = "payment_watch_txn_id"
    private const val POLL_MS = 1500L
    private const val RESTART_REQUEST_CODE = 7103

    fun start(context: Context) {
      if (!PaymentWatchPrefs.isEnabled(context) || !PaymentWatchAccess.hasUsageAccess(context)) return
      val intent = Intent(context, PaymentWatchService::class.java)
      if (Build.VERSION.SDK_INT >= 26) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(context, PaymentWatchService::class.java)
      val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      val pending =
        if (Build.VERSION.SDK_INT >= 26) {
          PendingIntent.getForegroundService(context, RESTART_REQUEST_CODE, intent, flags)
        } else {
          @Suppress("DEPRECATION")
          PendingIntent.getService(context, RESTART_REQUEST_CODE, intent, flags)
        }
      alarm.cancel(pending)
      context.stopService(intent)
    }

    fun clearLogUi(context: Context) {
      val nm = context.getSystemService(NotificationManager::class.java) ?: return
      PaymentWatchPrefs.holdCancelUntil(context, System.currentTimeMillis() + 2500)
      val done = NotificationCompat.Builder(context, CHANNEL_LOG)
        .setSmallIcon(R.drawable.ic_stat_spendsense)
        .setContentTitle("Saved")
        .setContentText("Bucket updated")
        .setRemoteInputHistory(arrayOf("Saved"))
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setOngoing(false)
        .setAutoCancel(true)
        .setTimeoutAfter(1500)
        .setPriority(NotificationCompat.PRIORITY_MIN)
        .build()
      nm.notify(LOG_NOTIF_ID, done)
    }
  }
}
