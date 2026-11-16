package {{PACKAGE}}.paymentwatch

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import java.util.Calendar

// Nightly auto-backup: an alarm queues BackupJobService, which runs the JS
// backup headlessly. JS shows the progress notice and hides it when done.
object BackupAlarm {
  const val TASK_KEY = "UnSpoilAutoBackup"
  private const val PREFS = "unspoil_backup_alarm"
  private const val REQUEST_CODE = 0x5B4D

  fun schedule(ctx: Context, hour: Int, minute: Int) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putBoolean("enabled", true)
      .putInt("hour", hour)
      .putInt("minute", minute)
      .apply()
    setNext(ctx, hour, minute)
  }

  fun cancel(ctx: Context) {
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("enabled", false).apply()
    ctx.getSystemService(AlarmManager::class.java)?.cancel(pendingIntent(ctx))
  }

  /** Re-arm after the alarm fires, a reboot or an app update. */
  fun reschedule(ctx: Context) {
    val prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean("enabled", false)) return
    setNext(ctx, prefs.getInt("hour", 21), prefs.getInt("minute", 0))
  }

  private fun setNext(ctx: Context, hour: Int, minute: Int) {
    val at = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
      if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
    }
    // Inexact is fine for a backup and needs no exact-alarm permission.
    ctx.getSystemService(AlarmManager::class.java)
      ?.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at.timeInMillis, pendingIntent(ctx))
  }

  private fun pendingIntent(ctx: Context): PendingIntent =
    PendingIntent.getBroadcast(
      ctx,
      REQUEST_CODE,
      Intent(ctx, BackupAlarmReceiver::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}

class BackupAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    BackupAlarm.reschedule(context)
    // Background apps may not start a plain service, but they may run a job.
    val job = JobInfo.Builder(JOB_ID, ComponentName(context, BackupJobService::class.java))
      .apply { if (Build.VERSION.SDK_INT >= 31) setExpedited(true) else setOverrideDeadline(0) }
      .build()
    try {
      context.getSystemService(JobScheduler::class.java)?.schedule(job)
    } catch (_: Exception) {
      // Out of expedited quota; the app catches up the next time it opens.
    }
  }

  companion object {
    private const val JOB_ID = 0x5B4E
  }
}

/** Runs the JS backup task with no screen open, like HeadlessJsTaskService but as a job. */
class BackupJobService : JobService(), HeadlessJsTaskEventListener {
  private var params: JobParameters? = null
  private var taskId = -1
  private var tasks: HeadlessJsTaskContext? = null

  override fun onStartJob(params: JobParameters): Boolean {
    this.params = params
    val host = (application as ReactApplication).reactHost ?: return false
    val context = host.currentReactContext
    if (context != null) {
      startTask(context)
    } else {
      host.addReactInstanceEventListener(object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          host.removeReactInstanceEventListener(this)
          startTask(context)
        }
      })
      host.start()
    }
    return true
  }

  private fun startTask(context: ReactContext) {
    val tasks = HeadlessJsTaskContext.getInstance(context)
    this.tasks = tasks
    tasks.addTaskEventListener(this)
    UiThreadUtil.runOnUiThread {
      taskId = tasks.startTask(
        HeadlessJsTaskConfig(BackupAlarm.TASK_KEY, Arguments.createMap(), 60_000, true),
      )
    }
  }

  override fun onHeadlessJsTaskStart(taskId: Int) = Unit

  override fun onHeadlessJsTaskFinish(taskId: Int) {
    if (taskId != this.taskId) return
    tasks?.removeTaskEventListener(this)
    BackupNotice.hide(this)
    params?.let { jobFinished(it, false) }
  }

  override fun onStopJob(params: JobParameters): Boolean {
    tasks?.removeTaskEventListener(this)
    BackupNotice.hide(this)
    return false
  }
}
