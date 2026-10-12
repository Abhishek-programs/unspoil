package {{PACKAGE}}.paymentwatch

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.app.RemoteInput

class PaymentWatchReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      PaymentWatchService.ACTION_LOG -> onLog(context, intent)
      PaymentWatchService.ACTION_ASSIGN -> onAssign(context, intent)
    }
  }

  private fun onLog(context: Context, intent: Intent) {
    val results = RemoteInput.getResultsFromIntent(intent) ?: return
    val raw = results.getCharSequence(PaymentWatchService.KEY_AMOUNT)?.toString().orEmpty()
    val parsed = PaymentWatchDb.parseLogInput(raw)
    if (parsed == null) {
      Toast.makeText(context, "Try 400 momo — amount then a name", Toast.LENGTH_SHORT).show()
      PaymentWatchService.start(context)
      return
    }
    val pkg = intent.getStringExtra(PaymentWatchService.EXTRA_PACKAGE).orEmpty()
    val appName = PaymentWatchPrefs.merchantLabel(pkg)
    val accountId = PaymentWatchDb.accountIdForPackage(pkg)
    val id = PaymentWatchDb.insertFlaggedExpense(context, parsed.amount, appName, parsed.label, accountId)
    if (id == null) {
      Toast.makeText(context, "Could not save. Open SpendSense once, then try again.", Toast.LENGTH_SHORT).show()
      PaymentWatchService.start(context)
      return
    }
    val chips = PaymentWatchDb.spendingBucketNames(context)
    if (chips.isNotEmpty()) {
      PaymentWatchPrefs.setPendingTxn(context, id, parsed.amount, parsed.label ?: "Payment")
    } else {
      PaymentWatchPrefs.setDoneThisVisit(context, true)
      PaymentWatchService.clearLogUi(context)
    }
    Toast.makeText(context, "Logged NPR ${parsed.amount.toInt()} — tap a bucket", Toast.LENGTH_SHORT).show()
    PaymentWatchService.start(context)
  }

  private fun onAssign(context: Context, intent: Intent) {
    val txnId = intent.getStringExtra(PaymentWatchService.EXTRA_TXN_ID).orEmpty()
    val hint = RemoteInput.getResultsFromIntent(intent)
      ?.getCharSequence(PaymentWatchService.KEY_BUCKET)
      ?.toString()
      .orEmpty()
    if (txnId.isEmpty() || hint.isBlank()) return
    val name = PaymentWatchDb.assignSpendingBucket(context, txnId, hint)
    if (name == null) {
      Toast.makeText(context, "Could not set bucket", Toast.LENGTH_SHORT).show()
      return
    }
    PaymentWatchPrefs.setPendingTxn(context, null)
    PaymentWatchPrefs.setDoneThisVisit(context, true)
    PaymentWatchService.clearLogUi(context)
    Toast.makeText(context, "Saved to $name", Toast.LENGTH_SHORT).show()
    PaymentWatchService.start(context)
  }
}

class PaymentWatchBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
      intent.action != Intent.ACTION_LOCKED_BOOT_COMPLETED
    ) {
      return
    }
    PaymentWatchService.start(context)
  }
}
