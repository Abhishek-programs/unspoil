package {{PACKAGE}}.paymentwatch

import android.content.Context
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.random.Random
import org.json.JSONArray
import org.json.JSONObject

/**
 * The helper must never open spendsense.db. Android's SQLite and expo-sqlite's own copy do not see
 * each other's locks in one process, so closing the native connection deleted the live WAL and lost
 * app writes. Payments wait here instead and JS applies them (lib/payment-queue.ts).
 */
object PaymentWatchQueue {
  private const val TAG = "PaymentWatchQueue"
  private const val PREFS = "payment_watch_queue"
  private const val KEY_OPS = "ops"
  private const val KEY_SNAPSHOT = "snapshot"

  data class SpendingBucket(val id: String, val name: String, val icon: String)

  fun logExpense(
    context: Context,
    amount: Double,
    merchant: String,
    description: String?,
    accountId: String,
  ): String? {
    val id = newId()
    val saved = append(context) {
      JSONObject()
        .put("op", "log")
        .put("txnId", id)
        .put("amount", amount)
        .put("merchant", merchant)
        .put("description", description ?: JSONObject.NULL)
        .put("accountId", accountId)
        .put("createdAt", isoNow())
    }
    return if (saved) id else null
  }

  fun assignBucket(context: Context, txnId: String, bucket: SpendingBucket): Boolean =
    append(context) {
      JSONObject().put("op", "assign").put("txnId", txnId).put("bucketId", bucket.id)
    }

  fun findBucket(context: Context, raw: String): SpendingBucket? {
    val q = raw.trim()
    if (q.isEmpty()) return null
    val rows = spendingBuckets(context)
    return rows.firstOrNull { it.name.equals(q, ignoreCase = true) }
      ?: rows.filter { it.name.startsWith(q, ignoreCase = true) }.singleOrNull()
  }

  fun spendingBuckets(context: Context): List<SpendingBucket> {
    val rows = snapshot(context).optJSONArray("buckets") ?: return emptyList()
    return (0 until rows.length()).mapNotNull { i ->
      val row = rows.optJSONObject(i) ?: return@mapNotNull null
      val id = row.optString("id")
      val name = row.optString("name")
      if (id.isBlank() || name.isBlank()) null else SpendingBucket(id, name, row.optString("icon"))
    }
  }

  fun currencyCode(context: Context): String =
    snapshot(context).optString("currency").takeIf { it.length == 3 } ?: "NPR"

  fun setSnapshot(context: Context, json: String) {
    prefs(context).edit().putString(KEY_SNAPSHOT, json).apply()
  }

  @Synchronized
  fun opsJson(context: Context): String = readOps(context).toString()

  @Synchronized
  fun ack(context: Context, opIds: Set<String>): Boolean {
    val ops = readOps(context)
    val keep = JSONArray()
    for (i in 0 until ops.length()) {
      val op = ops.getJSONObject(i)
      if (op.optString("opId") !in opIds) keep.put(op)
    }
    return writeOps(context, keep)
  }

  @Synchronized
  private fun append(context: Context, build: () -> JSONObject): Boolean =
    try {
      writeOps(context, readOps(context).put(build().put("opId", newId())))
    } catch (e: Exception) {
      Log.e(TAG, "Failed to queue payment", e)
      false
    }

  private fun readOps(context: Context): JSONArray =
    JSONArray(prefs(context).getString(KEY_OPS, null) ?: "[]")

  // commit, not apply: "Logged" must mean it is on disk.
  private fun writeOps(context: Context, ops: JSONArray): Boolean =
    prefs(context).edit().putString(KEY_OPS, ops.toString()).commit()

  private fun snapshot(context: Context): JSONObject =
    try {
      JSONObject(prefs(context).getString(KEY_SNAPSHOT, null) ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun newId(): String =
    System.currentTimeMillis().toString(36) + Random.nextInt(0x100000).toString(36)

  private fun isoNow(): String {
    val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(Date())
  }

  fun accountIdForPackage(pkg: String): String {
    val p = pkg.lowercase(Locale.US)
    if (p.contains("esewa")) return "esewa"
    return "bank"
  }

  data class ParsedLog(val amount: Double, val label: String?)

  fun parseLogInput(raw: String): ParsedLog? {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return null
    val parts = trimmed.split(Regex("\\s+"), limit = 2)
    val amount = parseAmount(parts[0]) ?: return null
    val label = parts.getOrNull(1)?.trim()?.takeIf { it.isNotEmpty() }
    return ParsedLog(amount, label)
  }

  fun parseAmount(raw: String): Double? {
    val cleaned = raw
      .replace("NPR", "", ignoreCase = true)
      .replace("Rs.", "", ignoreCase = true)
      .replace("Rs", "", ignoreCase = true)
      .replace(",", "")
      .trim()
    val value = cleaned.toDoubleOrNull() ?: return null
    if (value <= 0) return null
    return value
  }
}
