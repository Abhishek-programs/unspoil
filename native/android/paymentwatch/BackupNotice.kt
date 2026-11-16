package {{PACKAGE}}.paymentwatch

import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import {{PACKAGE}}.R

// Short-lived "Backing up…" notice with an indeterminate progress line while the
// nightly backup runs. expo-notifications cannot draw a progress bar.
object BackupNotice {
  private const val NOTICE_ID = 0x5B4C

  fun show(ctx: Context, channelId: String, title: String, text: String) {
    val manager = NotificationManagerCompat.from(ctx)
    if (!manager.areNotificationsEnabled()) return
    val notification = NotificationCompat.Builder(ctx, channelId)
      .setSmallIcon(R.drawable.ic_stat_spendsense)
      .setContentTitle(title)
      .setContentText(text)
      .setProgress(0, 0, true)
      .setOngoing(true)
      .setSilent(true)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      // Safety net: never left on screen if the JS side dies mid-backup.
      .setTimeoutAfter(15_000)
      .build()
    try {
      manager.notify(NOTICE_ID, notification)
    } catch (_: SecurityException) {
      // POST_NOTIFICATIONS revoked; the backup still runs.
    }
  }

  fun hide(ctx: Context) {
    NotificationManagerCompat.from(ctx).cancel(NOTICE_ID)
  }
}
