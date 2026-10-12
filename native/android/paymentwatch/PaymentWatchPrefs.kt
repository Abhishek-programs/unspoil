package {{PACKAGE}}.paymentwatch

import android.content.Context

object PaymentWatchPrefs {
  private const val PREFS = "payment_watch"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_PACKAGES = "packages"
  private const val KEY_PENDING_TXN = "pending_txn_id"
  private const val KEY_PENDING_AMOUNT = "pending_amount"
  private const val KEY_PENDING_MERCHANT = "pending_merchant"
  private const val KEY_DONE_THIS_VISIT = "done_this_visit"
  private const val KEY_HOLD_CANCEL_UNTIL = "hold_cancel_until"

  const val DEFAULT_PACKAGES = "com.f1soft.esewa,com.esewa,com.f1soft.nabilmbank"

  fun isEnabled(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_ENABLED, enabled)
      .apply()
  }

  fun targetPackages(context: Context): Set<String> {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .getString(KEY_PACKAGES, DEFAULT_PACKAGES) ?: DEFAULT_PACKAGES
    return raw.split(",").map { it.trim() }.filter { it.isNotEmpty() }.toSet()
  }

  fun setTargetPackages(context: Context, packages: List<String>) {
    val joined = packages.map { it.trim() }.filter { it.isNotEmpty() }.joinToString(",")
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_PACKAGES, if (joined.isEmpty()) DEFAULT_PACKAGES else joined)
      .apply()
  }

  fun merchantLabel(packageName: String): String {
    return when (packageName) {
      "com.f1soft.esewa", "com.esewa" -> "eSewa"
      "com.f1soft.nabilmbank" -> "nBank"
      else -> packageName.substringAfterLast('.').replaceFirstChar { it.uppercase() }
    }
  }

  data class PendingTxn(val id: String, val amount: Double, val merchant: String)

  fun pendingTxn(context: Context): PendingTxn? {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val id = prefs.getString(KEY_PENDING_TXN, null) ?: return null
    return PendingTxn(
      id,
      java.lang.Double.longBitsToDouble(prefs.getLong(KEY_PENDING_AMOUNT, 0L)),
      prefs.getString(KEY_PENDING_MERCHANT, "") ?: "",
    )
  }

  fun setPendingTxn(context: Context, id: String?, amount: Double = 0.0, merchant: String = "") {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_PENDING_TXN, id)
      .putLong(KEY_PENDING_AMOUNT, java.lang.Double.doubleToRawLongBits(amount))
      .putString(KEY_PENDING_MERCHANT, merchant)
      .apply()
  }

  fun doneThisVisit(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_DONE_THIS_VISIT, false)

  fun setDoneThisVisit(context: Context, done: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_DONE_THIS_VISIT, done)
      .apply()
  }

  fun holdCancelUntil(context: Context, untilMs: Long) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putLong(KEY_HOLD_CANCEL_UNTIL, untilMs)
      .apply()
  }

  fun shouldHoldCancel(context: Context): Boolean =
    System.currentTimeMillis() <
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong(KEY_HOLD_CANCEL_UNTIL, 0L)
}
