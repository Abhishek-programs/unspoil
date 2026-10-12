// Auto-categorization (priority order):
// 1. Keyword word match — keyword appears in description, remarks, or merchant text.
// 2. Sure-shot merchant — exact merchant name → mapped bucket.
// 3. Fallback — fallback bucket, mark as flagged.

function buildCorpus(
  description: string | null,
  remarks: string | null,
  merchant: string | null,
): string {
  return [description, remarks, merchant]
    .filter(t => t && !t.startsWith('__'))
    .join(' ')
    .toLowerCase()
}

export function categorize(opts: {
  description?: string | null
  remarks: string | null
  merchant: string | null
  keywords: { keyword: string; bucketId: string }[]
  sureShotMerchants: { merchantName: string; bucketId: string }[]
  fallbackBucketId: string
}): { bucketId: string; isFlagged: boolean } {
  const { description = null, remarks, merchant, keywords, sureShotMerchants, fallbackBucketId } =
    opts

  const corpus = buildCorpus(description, remarks, merchant)

  if (corpus) {
    for (const mapping of keywords) {
      const kw = mapping.keyword.toLowerCase().trim()
      if (kw && corpus.includes(kw)) {
        return { bucketId: mapping.bucketId, isFlagged: false }
      }
    }
  }

  if (merchant) {
    const merchantLower = merchant.toLowerCase().trim()
    const sureShot = sureShotMerchants.find(
      m => m.merchantName.toLowerCase().trim() === merchantLower,
    )
    if (sureShot) {
      return { bucketId: sureShot.bucketId, isFlagged: false }
    }
  }

  return { bucketId: fallbackBucketId, isFlagged: true }
}
