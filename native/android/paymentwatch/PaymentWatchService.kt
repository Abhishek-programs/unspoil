package {{PACKAGE}}.paymentwatch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
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
  private var eventCursor = 0L
  private var lastUiKind: String? = null
  private var waitingForDelay = false

  private val showLogLater = Runnable {
    waitingForDelay = false
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
    startAsForeground(placeholderNotification())
    demoteFromForeground()
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    publishWatchUi()
    handler.post(poll)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    startAsForeground(placeholderNotification())
    demoteFromForeground()
    val prev = lastTarget
    refreshTarget()
    onTargetChanged(prev, lastTarget)
    publishWatchUi()
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(poll)
    handler.removeCallbacks(showLogLater)
    getSystemService(NotificationManager::class.java)?.cancel(LOG_NOTIF_ID)
    super.onDestroy()
  }

  private fun tick() {
    if (!PaymentWatchPrefs.isEnabled(this) || !PaymentWatchAccess.hasUsageAccess(this)) {
      stopSelf()
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
      PaymentWatchPrefs.setDoneThisVisit(this, false)
      return
    }
    if (prev != null) PaymentWatchPrefs.setDoneThisVisit(this, false)
    waitingForDelay = true
    handler.postDelayed(showLogLater, LOG_DELAY_MS)
  }

  private var foregroundPkg: String? = null

  private fun refreshTarget() {
    val fg = applyForegroundEvents()
    lastTarget = fg?.takeIf { it in PaymentWatchPrefs.targetPackages(this) }
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

  private fun publishWatchUi() {
    lastUiKind = uiKind()
    val nm = getSystemService(NotificationManager::class.java)
    val notification = desiredNotification()
    if (notification != null) {
      nm?.notify(LOG_NOTIF_ID, notification)
    } else if (!PaymentWatchPrefs.shouldHoldCancel(this)) {
      nm?.cancel(LOG_NOTIF_ID)
    }
  }

  private fun uiKind(): String {
    if (PaymentWatchPrefs.pendingTxn(this) != null) return "category"
    if (lastTarget == null || PaymentWatchPrefs.doneThisVisit(this) || waitingForDelay) return "none"
    return "log"
  }

  private fun desiredNotification(): Notification? {
    val pending = PaymentWatchPrefs.pendingTxn(this)
    if (pending != null) return categoryNotification(pending)
    if (lastTarget == null) return null
    if (PaymentWatchPrefs.doneThisVisit(this)) return null
    if (waitingForDelay) return null
    return logNotification(lastTarget!!)
  }

  private fun demoteFromForeground() {
    if (Build.VERSION.SDK_INT >= 24) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    getSystemService(NotificationManager::class.java)?.cancel(NOTIF_ID)
  }

  private fun startAsForeground(notification: Notification) {
    try {
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } else {
        startForeground(NOTIF_ID, notification)
      }
    } catch (_: Exception) {
      // Android 12+ forbids promoting a backgrounded service to FGS from a Handler.
    }
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
      .setContentTitle("SpendSense")
      .setContentText("Payment helper")
      .setOngoing(true)
      .setSilent(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .build()
  }

  private fun categoryNotification(pending: PaymentWatchPrefs.PendingTxn): Notification {
    val npr = pending.amount.toInt()
    val title = "NPR $npr · ${pending.merchant}"
    val chips = PaymentWatchDb.spendingBucketNames(this)
    val bucketInput = RemoteInput.Builder(KEY_BUCKET)
      .setLabel("Bucket")
      .setAllowFreeFormInput(true)
      .setChoices(chips)
      .apply {
        if (Build.VERSION.SDK_INT >= 29) {
          setEditChoicesBeforeSending(RemoteInput.EDIT_CHOICES_BEFORE_SENDING_DISABLED)
        }
      }
      .build()
    val assignIntent = Intent(this, PaymentWatchReceiver::class.java).apply {
      action = ACTION_ASSIGN
      putExtra(EXTRA_TXN_ID, pending.id)
    }
    val assignPending = PendingIntent.getBroadcast(
      this,
      pending.id.hashCode(),
      assignIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
    )
    val assign = NotificationCompat.Action.Builder(
      android.R.drawable.ic_menu_send,
      "Bucket",
      assignPending,
    ).addRemoteInput(bucketInput).build()

    return NotificationCompat.Builder(this, CHANNEL_LOG)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle(title)
      .setContentText("Tap a bucket")
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .addAction(assign)
      .build()
  }

  private fun logNotification(packageName: String): Notification {
    val label = PaymentWatchPrefs.merchantLabel(packageName)
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
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
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
    private const val LOG_DELAY_MS = 5000L

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
      context.stopService(Intent(context, PaymentWatchService::class.java))
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
