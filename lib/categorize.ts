// 3-step auto-categorization (priority order):
// 1. Remarks suffix — remark ends with "keyword -" → mapped bucket. Always wins.
// 2. Sure-shot merchant — unambiguous merchant → mapped bucket.
// 3. Fallback — fallback bucket, mark as flagged.

export function categorize(opts: {
  remarks: string | null
  merchant: string | null
  keywords: { keyword: string; bucketId: string }[]
  sureShotMerchants: { merchantName: string; bucketId: string }[]
  fallbackBucketId: string
}): { bucketId: string; isFlagged: boolean } {
  const { remarks, merchant, keywords, sureShotMerchants, fallbackBucketId } = opts

  // Step 1: Remarks suffix — "keyword -" at end of remarks (e.g. "lunch core -")
  if (remarks) {
    const match = remarks.trim().match(/(\S+)\s*-\s*$/)
    if (match) {
      const tag = match[1].toLowerCase()
      const mapping = keywords.find(k => k.keyword.toLowerCase() === tag)
      if (mapping) {
        return { bucketId: mapping.bucketId, isFlagged: false }
      }
    }
  }

  // Step 2: Sure-shot merchant match (case-insensitive)
  if (merchant) {
    const merchantLower = merchant.toLowerCase().trim()
    const sureShot = sureShotMerchants.find(
      m => m.merchantName.toLowerCase().trim() === merchantLower
    )
    if (sureShot) {
      return { bucketId: sureShot.bucketId, isFlagged: false }
    }
  }

  // Step 3: Fallback — flag for user review
  return { bucketId: fallbackBucketId, isFlagged: true }
}
