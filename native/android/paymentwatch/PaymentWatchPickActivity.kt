package {{PACKAGE}}.paymentwatch

import android.app.Activity
import android.app.NotificationManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.util.TypedValue
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * Full list of Living (spending) buckets — RemoteInput chips are capped by OEMs (~3–4).
 */
class PaymentWatchPickActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val txnId = intent.getStringExtra(EXTRA_TXN_ID).orEmpty()
    val amount = intent.getDoubleExtra(EXTRA_AMOUNT, 0.0)
    val merchant = intent.getStringExtra(EXTRA_MERCHANT).orEmpty()

    if (txnId.isEmpty()) {
      finish()
      return
    }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.WHITE)
      setPadding(dp(20), dp(24), dp(20), dp(24))
    }

    root.addView(
      TextView(this).apply {
        text = if (amount > 0) "${PaymentWatchDb.currencyCode(this@PaymentWatchPickActivity)} ${amount.toInt()} · $merchant" else "Pick a Living bucket"
        setTextColor(Color.parseColor("#1A1C1E"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
        typeface = Typeface.DEFAULT_BOLD
        setPadding(0, 0, 0, dp(4))
      },
    )
    root.addView(
      TextView(this).apply {
        text = "All Living buckets (including ones you added)"
        setTextColor(Color.parseColor("#6B7280"))
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
        setPadding(0, 0, 0, dp(16))
      },
    )

    val buckets = PaymentWatchDb.spendingBuckets(this)
    if (buckets.isEmpty()) {
      root.addView(
        TextView(this).apply {
          text = "No Living buckets found. Open UnSpoil once, then try again."
          setTextColor(Color.parseColor("#DC2626"))
        },
      )
    } else {
      for (bucket in buckets) {
        val btn = TextView(this).apply {
          text = "${bucket.icon}  ${bucket.name}".trim()
          setTextColor(Color.parseColor("#1A1C1E"))
          setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
          setPadding(dp(16), dp(14), dp(16), dp(14))
          setBackgroundColor(Color.parseColor("#F7F8FA"))
          isClickable = true
          isFocusable = true
          setOnClickListener {
            val name = PaymentWatchDb.assignSpendingBucket(this@PaymentWatchPickActivity, txnId, bucket.name)
            if (name == null) {
              Toast.makeText(this@PaymentWatchPickActivity, "Could not set bucket", Toast.LENGTH_SHORT).show()
              return@setOnClickListener
            }
            PaymentWatchPrefs.setPendingTxn(this@PaymentWatchPickActivity, null)
            PaymentWatchPrefs.setDoneThisVisit(this@PaymentWatchPickActivity, true)
            getSystemService(NotificationManager::class.java)
              ?.cancel(PaymentWatchService.LOG_NOTIF_ID)
            Toast.makeText(this@PaymentWatchPickActivity, "Saved to $name", Toast.LENGTH_SHORT).show()
            PaymentWatchService.start(this@PaymentWatchPickActivity)
            finish()
          }
        }
        val lp = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { bottomMargin = dp(8) }
        root.addView(btn, lp)
      }
    }

    val scroll = ScrollView(this).apply {
      addView(root)
      setBackgroundColor(Color.WHITE)
    }
    setContentView(scroll)
  }

  private fun dp(v: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

  companion object {
    const val EXTRA_TXN_ID = "payment_watch_pick_txn_id"
    const val EXTRA_AMOUNT = "payment_watch_pick_amount"
    const val EXTRA_MERCHANT = "payment_watch_pick_merchant"
  }
}
